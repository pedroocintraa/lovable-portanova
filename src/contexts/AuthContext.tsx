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
              } else if (mounted) {
                console.warn('AuthContext: Usuário auth existe mas não na tabela usuarios. Fazendo logout.');
                // Se o usuário existe no auth mas não na nossa tabela, fazer logout
                await supabase.auth.signOut();
                setUsuario(null);
                setPermissoes(null);
              }
            } catch (error) {
              console.error('AuthContext: Erro ao carregar dados do usuário integrado:', error);
              if (mounted) {
                // Em caso de erro, fazer logout para manter consistência
                await supabase.auth.signOut();
                setUsuario(null);
                setPermissoes(null);
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setPermissoes(null);
    setUser(null);
    setSession(null);
  };

  const isAuthenticated = !!session?.user;

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