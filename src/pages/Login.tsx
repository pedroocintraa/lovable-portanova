import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { createAdminUser } from '@/utils/createAdmin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingAdmin, setCreatingAdmin] = useState(false);
  
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleCreateAdmin = async () => {
    setCreatingAdmin(true);
    setError('');
    
    try {
      const result = await createAdminUser();
      if (result.success) {
        setError('');
        alert('Admin criado com sucesso! Agora você pode fazer login com: pedroocintraa20@gmail.com / Trocar@123');
      } else {
        setError(result.error || 'Erro ao criar admin');
      }
    } catch (err: any) {
      console.error('Create admin error:', err);
      setError('Erro ao criar admin. Tente novamente.');
    } finally {
      setCreatingAdmin(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await login(email, password);
      
      if (error) {
        // Provide more specific error messages
        if (error.message?.includes('tentativas')) {
          setError(error.message);
        } else if (error.message?.includes('caracteres não permitidos')) {
          setError('Dados inválidos detectados');
        } else if (error.message?.includes('Email inválido')) {
          setError('Formato de email inválido');
        } else {
          setError('Email ou senha incorretos');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Mostrar loading enquanto verifica autenticação
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
                required
                disabled={loading}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          
          <div className="mt-4 pt-4 border-t">
            <Button 
              onClick={handleCreateAdmin}
              variant="outline" 
              className="w-full" 
              disabled={creatingAdmin}
            >
              {creatingAdmin ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando Admin...
                </>
              ) : (
                'Criar Usuário Admin'
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Clique aqui para criar o usuário administrador no sistema de autenticação
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}