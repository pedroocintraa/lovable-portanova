import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Usuario, FuncaoUsuario, PermissoesUsuario } from "@/types/usuario";
import { usuariosService } from "@/services/usuariosService";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  usuario: Usuario | null;
  permissoes: PermissoesUsuario | null;
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<{ error: any }>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
  needsPasswordSetup: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<PermissoesUsuario | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Timeout de segurança para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.log('AuthContext: Timeout de segurança ativado - finalizando loading');
        setLoading(false);
      }
    }, 8000);
    
    // Configurar listener de autenticação integrado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('AuthContext: Auth state integrado changed', { event, userId: session?.user?.id });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Verificar se usuário precisa definir senha (primeiro acesso)
          const userMetadata = session.user.user_metadata || {};
          const isFirstAccess = userMetadata.senha_temporaria || userMetadata.needs_password_setup;
          
          if (isFirstAccess) {
            setNeedsPasswordSetup(true);
            setLoading(false);
            return;
          }
          
          // Usar setTimeout para diferir a chamada async e evitar loops
          setTimeout(async () => {
            if (!mounted) return;
            
            try {
              // Buscar usuário pelo ID do auth (nova integração)
              const userData = await usuariosService.obterUsuarioPorId(session.user.id);
              
              if (userData && mounted) {
                console.log('AuthContext: Usuário encontrado na integração:', userData.nome);
                setUsuario(userData);
                setPermissoes(usuariosService.obterPermissoes(userData.funcao));
                setNeedsPasswordSetup(false);
              } else if (mounted) {
                console.warn('AuthContext: Usuário auth existe mas não na tabela usuarios. Fazendo logout.');
                // Se o usuário existe no auth mas não na nossa tabela, fazer logout
                await supabase.auth.signOut();
                setUsuario(null);
                setPermissoes(null);
                setNeedsPasswordSetup(false);
              }
            } catch (error) {
              console.error('AuthContext: Erro ao carregar dados do usuário integrado:', error);
              if (mounted) {
                // Em caso de erro, fazer logout para manter consistência
                await supabase.auth.signOut();
                setUsuario(null);
                setPermissoes(null);
                setNeedsPasswordSetup(false);
              }
            } finally {
              if (mounted) {
                setLoading(false);
              }
            }
          }, 100);
        } else {
          setUsuario(null);
          setPermissoes(null);
          setNeedsPasswordSetup(false);
          setLoading(false);
        }
      }
    );

    // Verificar sessão existente
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        
        console.log('AuthContext: Verificando sessão inicial integrada', { userId: session?.user?.id });
        
        if (!session) {
          setSession(null);
          setUser(null);
          setUsuario(null);
          setPermissoes(null);
          setLoading(false);
        }
        // Se tem sessão, o onAuthStateChange vai lidar com isso
      } catch (error) {
        console.error('AuthContext: Erro ao verificar sessão inicial:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Simple input validation and sanitization
    const validateInput = (email: string, password: string): string[] => {
      const errors: string[] = [];
      if (!email.trim()) errors.push('Email é obrigatório');
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Email inválido');
      if (!password) errors.push('Senha é obrigatória');
      else if (password.length < 6) errors.push('Senha deve ter pelo menos 6 caracteres');
      return errors;
    };

    const sanitizeInput = (input: string): string => {
      return input.trim().replace(/[<>]/g, '').substring(0, 255);
    };

    // Input validation
    const validationErrors = validateInput(email, password);
    if (validationErrors.length > 0) {
      return { error: { message: validationErrors[0] } };
    }
    
    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = sanitizeInput(password);
    
    // Server-side rate limiting check
    try {
      const { data: isAllowed } = await supabase.rpc('check_rate_limit', {
        p_ip: '0.0.0.0',
        p_email: sanitizedEmail
      });
      
      if (!isAllowed) {
        await supabase.rpc('log_login_attempt', {
          p_ip: '0.0.0.0',
          p_email: sanitizedEmail,
          p_success: false
        });
        return { error: { message: 'Muitas tentativas de login. Tente novamente em 1 hora.' } };
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed:', rateLimitError);
    }
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword
      });
      
      // Log the attempt
      try {
        await supabase.rpc('log_login_attempt', {
          p_ip: '0.0.0.0',
          p_email: sanitizedEmail,
          p_success: !error
        });
      } catch (logError) {
        console.warn('Failed to log login attempt:', logError);
      }
      
      return { error };
    } catch (err: any) {
      try {
        await supabase.rpc('log_login_attempt', {
          p_ip: '0.0.0.0',
          p_email: sanitizedEmail,
          p_success: false
        });
      } catch (logError) {
        console.warn('Failed to log login attempt:', logError);
      }
      return { error: err };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setPermissoes(null);
    setUser(null);
    setSession(null);
  };

  const isAuthenticated = !!session?.user && !needsPasswordSetup;

  return (
    <AuthContext.Provider value={{
      usuario,
      permissoes,
      user,
      session,
      login,
      logout,
      isAuthenticated,
      loading,
      needsPasswordSetup
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
}