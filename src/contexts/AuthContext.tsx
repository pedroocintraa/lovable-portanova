import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Usuario, FuncaoUsuario, PermissoesUsuario } from "@/types/usuario";
import { usuariosService } from "@/services/usuariosService";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  usuario: Usuario | null;
  permissoes: PermissoesUsuario | null;
  login: (usuario: Usuario) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [permissoes, setPermissoes] = useState<PermissoesUsuario | null>(null);

  useEffect(() => {
    // Auto-login temporário como administrador de teste
    const autoLogin = async () => {
      try {
        // Simular login do usuário admin@teste.com
        await supabase.auth.signInWithPassword({
          email: 'admin@teste.com',
          password: 'admin123'
        });
        
        const usuarios = await usuariosService.obterUsuarios();
        const admin = usuarios.find(u => u.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL);
        if (admin) {
          setUsuario(admin);
          setPermissoes(usuariosService.obterPermissoes(admin.funcao));
        }
      } catch (error) {
        // Se não conseguir fazer login, criar usuário temporário para desenvolvimento
        const adminTemp: Usuario = {
          id: '00000000-0000-0000-0000-000000000001',
          nome: 'ADMIN TESTE',
          telefone: '11999999999',
          email: 'admin@teste.com',
          cpf: '11111111111',
          funcao: FuncaoUsuario.ADMINISTRADOR_GERAL,
          dataCadastro: new Date().toISOString(),
          ativo: true
        };
        setUsuario(adminTemp);
        setPermissoes(usuariosService.obterPermissoes(adminTemp.funcao));
      }
    };

    autoLogin();
  }, []);

  const login = (usuario: Usuario) => {
    setUsuario(usuario);
    setPermissoes(usuariosService.obterPermissoes(usuario.funcao));
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUsuario(null);
    setPermissoes(null);
  };

  const isAuthenticated = !!usuario;

  return (
    <AuthContext.Provider value={{
      usuario,
      permissoes,
      login,
      logout,
      isAuthenticated
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