import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RoleProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: keyof import('@/types/usuario').PermissoesUsuario;
  fallbackComponent?: React.ComponentType;
}

export default function RoleProtectedRoute({ 
  children, 
  requiredPermission, 
  fallbackComponent: FallbackComponent 
}: RoleProtectedRouteProps) {
  const { permissoes } = useAuth();
  const navigate = useNavigate();

  const hasPermission = permissoes?.[requiredPermission] ?? false;

  if (!hasPermission) {
    if (FallbackComponent) {
      return <FallbackComponent />;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-destructive/10 w-16 h-16 rounded-full flex items-center justify-center">
              <ShieldX className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Acesso Negado
            </CardTitle>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página. Entre em contato com seu administrador se precisar deste acesso.
            </p>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}