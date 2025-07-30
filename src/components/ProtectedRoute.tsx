import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, usuario, session } = useAuth();

  console.log('ProtectedRoute:', { 
    isAuthenticated, 
    loading, 
    hasUsuario: !!usuario,
    hasSession: !!session
  });

  // Loading state - só mostra se realmente está carregando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!isAuthenticated) {
    console.log('ProtectedRoute: Redirecionando para login - usuário não autenticado');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}