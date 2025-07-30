import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Usuario, PermissoesUsuario, FuncaoUsuario } from "@/types/usuario";
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

  useEffect(() => {
    let mounted = true;
    
    // Timeout de segurança reduzido para evitar loading infinito
    const safetyTimeout = setTimeout(() => {
      if (mounted) {
        console.log('AuthContext: Timeout de segurança ativado - finalizando loading');
        setLoading(false);
      }
    }, 5000); // Reduzido para 5 segundos
    
    // Configurar listener de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('AuthContext: Auth state changed', { 
          event, 
          userId: session?.user?.id, 
          hasSession: !!session,
          userEmail: session?.user?.email
        });
        
        // Atualizar estados imediatamente
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            console.log('AuthContext: Buscando dados do usuário:', session.user.id);
            
            // Primeiro tentar por ID
            let userData = await usuariosService.obterUsuarioPorId(session.user.id);
            
            // Se não encontrar por ID, tentar por email
            if (!userData && session.user.email) {
              console.log('AuthContext: Usuário não encontrado por ID, tentando por email');
              const { data: usuarioByEmail } = await supabase
                .from('usuarios')
                .select('*')
                .eq('email', session.user.email)
                .eq('ativo', true)
                .single();
              
              if (usuarioByEmail) {
                // Transformar dados do Supabase para o formato Usuario
                userData = {
                  id: usuarioByEmail.id,
                  nome: usuarioByEmail.nome,
                  telefone: usuarioByEmail.telefone,
                  email: usuarioByEmail.email,
                  cpf: usuarioByEmail.cpf,
                  funcao: usuarioByEmail.funcao as FuncaoUsuario,
                  dataCadastro: usuarioByEmail.data_cadastro || usuarioByEmail.created_at,
                  ativo: usuarioByEmail.ativo,
                  equipeId: usuarioByEmail.equipe_id,
                  supervisorEquipeId: usuarioByEmail.supervisor_equipe_id,
                  nomeEquipe: undefined // Será buscado se necessário
                };
              }
            }
            
            if (userData && mounted) {
              console.log('AuthContext: Usuário encontrado:', userData.nome);
              setUsuario(userData);
              setPermissoes(usuariosService.obterPermissoes(userData.funcao));
            } else if (mounted) {
              console.warn('AuthContext: Usuário auth existe mas não na tabela usuarios.');
              setUsuario(null);
              setPermissoes(null);
            }
          } catch (error) {
            console.error('AuthContext: Erro ao carregar dados do usuário:', error);
            if (mounted) {
              setUsuario(null);
              setPermissoes(null);
            }
          } finally {
            if (mounted) {
              setLoading(false);
            }
          }
        } else {
          setUsuario(null);
          setPermissoes(null);
          setLoading(false);
        }
      }
    );

    // Verificar sessão existente
    const initializeAuth = async () => {
      try {
        console.log('AuthContext: Verificando sessão inicial');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: Erro ao verificar sessão:', error);
          if (mounted) {
            setLoading(false);
          }
          return;
        }
        
        if (!mounted) return;
        
        console.log('AuthContext: Sessão inicial:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          userEmail: session?.user?.email 
        });
        
        if (!session) {
          setSession(null);
          setUser(null);
          setUsuario(null);
          setPermissoes(null);
          setLoading(false);
        }
        // Se tem sessão, o onAuthStateChange já vai lidar com ela
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

  const isAuthenticated = !!session?.user && !!usuario;
  
  console.log('AuthContext isAuthenticated:', { 
    hasSession: !!session, 
    hasUser: !!session?.user, 
    hasUsuario: !!usuario, 
    isAuthenticated 
  });

  return (
    <AuthContext.Provider value={{
      usuario,
      permissoes,
      user,
      session,
      login,
      logout,
      isAuthenticated,
      loading
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