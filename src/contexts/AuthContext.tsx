import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Usuario, FuncaoUsuario, PermissoesUsuario } from "@/types/usuario";
import { userService } from "@/services/userService";

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
    // Verificar se há usuário logado ao inicializar
    const usuarioAtual = userService.obterUsuarioAtual();
    if (usuarioAtual) {
      setUsuario(usuarioAtual);
      setPermissoes(userService.obterPermissoes(usuarioAtual.funcao));
    } else {
      // Auto-login como administrador para testes
      const usuarios = userService.obterUsuarios();
      const admin = usuarios.find(u => u.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL);
      if (admin) {
        login(admin);
      }
    }
  }, []);

  const login = (usuario: Usuario) => {
    setUsuario(usuario);
    setPermissoes(userService.obterPermissoes(usuario.funcao));
    userService.definirUsuarioAtual(usuario);
  };

  const logout = () => {
    setUsuario(null);
    setPermissoes(null);
    userService.logout();
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