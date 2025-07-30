import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, usuario } = useAuth();
  const [localLoading, setLocalLoading] = React.useState(true);

  // Timeout de segurança mais curto
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('ProtectedRoute: Timeout local ativado');
      setLocalLoading(false);
    }, 3000); // Reduzido para 3 segundos

    if (!loading) {
      setLocalLoading(false);
    }

    return () => clearTimeout(timeout);
  }, [loading]);

  const isLoading = loading || localLoading;

  console.log('ProtectedRoute:', { 
    isAuthenticated, 
    loading, 
    localLoading, 
    isLoading,
    hasUsuario: !!usuario
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Redirecionando para login - usuário não autenticado');
    return <Navigate to="/login" replace />;
  }

  // Verificação adicional se o usuário está carregado
  if (!usuario) {
    console.log('ProtectedRoute: Dados do usuário não carregados, redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}