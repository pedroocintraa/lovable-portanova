import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, needsPasswordSetup } = useAuth();
  const [localLoading, setLocalLoading] = React.useState(true);

  // Timeout de segurança local
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('ProtectedRoute: Timeout local ativado');
      setLocalLoading(false);
    }, 5000);

    if (!loading) {
      setLocalLoading(false);
    }

    return () => clearTimeout(timeout);
  }, [loading]);

  const isLoading = loading || localLoading;

  console.log('ProtectedRoute:', { isAuthenticated, loading, localLoading, isLoading });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (needsPasswordSetup) {
    console.log('ProtectedRoute: Redirecionando para reset-password (setup necessário)');
    return <Navigate to="/reset-password?type=invite" replace />;
  }

  if (!isAuthenticated) {
    console.log('ProtectedRoute: Redirecionando para login');
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}