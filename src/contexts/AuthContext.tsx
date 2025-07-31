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
    
    // Configurar listener de autenticação PRIMEIRO
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        console.log('AuthContext: Auth state changed', { 
          event, 
          userId: session?.user?.id, 
          hasSession: !!session,
          userEmail: session?.user?.email
        });
        
        // Atualizar estados da sessão imediatamente (síncrono)
        setSession(session);
        setUser(session?.user ?? null);
        
        // Buscar dados do usuário de forma SÍNCRONA (sem setTimeout)
        if (session?.user) {
          // Função assíncrona para buscar dados do usuário
          const fetchUserData = async () => {
            if (!mounted) return;
            
            try {
              console.log('AuthContext: Buscando dados do usuário:', session.user.id);
              
              // Buscar usuário usando user_id do auth.users
              console.log('AuthContext: Buscando usuário com auth.uid():', session.user.id);
              const userData = await usuariosService.obterUsuarioPorId(session.user.id);
              
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
          };
          
          // Executar imediatamente (sem delay)
          fetchUserData();
        } else {
          // Sem sessão - limpar tudo
          setUsuario(null);
          setPermissoes(null);
          setLoading(false);
        }
      }
    );

    // DEPOIS verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        console.log('AuthContext: Sessão inicial verificada:', { 
          hasSession: !!session, 
          userId: session?.user?.id 
        });
        
        if (!session) {
          setLoading(false);
        }
        // Se tem sessão, o onAuthStateChange já vai processar
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('🔐 AuthContext: Iniciando processo de login...');
    
    // Validação e sanitização
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

    const validationErrors = validateInput(email, password);
    if (validationErrors.length > 0) {
      return { error: { message: validationErrors[0] } };
    }
    
    const sanitizedEmail = sanitizeInput(email).toLowerCase();
    const sanitizedPassword = sanitizeInput(password);
    
    try {
      // Verificar rate limit
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
      console.warn('AuthContext: Rate limit check failed:', rateLimitError);
    }
    
    try {
      // Limpar qualquer sessão anterior
      console.log('🧹 AuthContext: Limpando sessão anterior...');
      await supabase.auth.signOut();
      
      // Fazer login
      console.log('🔑 AuthContext: Fazendo login...');
      const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizedEmail,
        password: sanitizedPassword
      });
      
      // Log da tentativa
      try {
        await supabase.rpc('log_login_attempt', {
          p_ip: '0.0.0.0',
          p_email: sanitizedEmail,
          p_success: !error
        });
      } catch (logError) {
        console.warn('AuthContext: Failed to log login attempt:', logError);
      }
      
      if (error) {
        console.error('❌ AuthContext: Erro no login:', error);
        return { error };
      }
      
      if (data.session) {
        console.log('✅ AuthContext: Login bem-sucedido');
        console.log('🔍 AuthContext: Verificando contexto de autenticação em 2s...');
        
        // Aguardar um pouco e verificar se o contexto está funcionando
        setTimeout(async () => {
          try {
            const { debugAuthenticationAdvanced, validateAndFixAuth } = await import('@/utils/authFix');
            const debugResult = await debugAuthenticationAdvanced();
            console.log('🔍 AuthContext: Debug avançado pós-login:', debugResult);
            
            if (!debugResult.session_valid) {
              console.warn('⚠️ AuthContext: Contexto inválido detectado, tentando correção...');
              const fixResult = await validateAndFixAuth();
              console.log('🛠️ AuthContext: Resultado da correção:', fixResult);
            } else {
              console.log('✅ AuthContext: Contexto de autenticação funcionando');
            }
          } catch (testError) {
            console.error('❌ AuthContext: Erro ao testar contexto:', testError);
          }
        }, 2000);
      }
      
      return { error };
    } catch (err: any) {
      console.error('❌ AuthContext: Erro inesperado no login:', err);
      
      try {
        await supabase.rpc('log_login_attempt', {
          p_ip: '0.0.0.0',
          p_email: sanitizedEmail,
          p_success: false
        });
      } catch (logError) {
        console.warn('AuthContext: Failed to log login attempt:', logError);
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