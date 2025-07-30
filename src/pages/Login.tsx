import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle } from 'lucide-react';
import { MigrationPanel } from '@/components/MigrationPanel';
import { AuthDebugPanel } from '@/components/AuthDebugPanel';
// import saTelecomLogo from '@/assets/sa-telecom-logo.png';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const {
    login,
    isAuthenticated,
    loading: authLoading
  } = useAuth();
  const navigate = useNavigate();

  // Redirecionar se já estiver autenticado
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/');
    }
  }, [isAuthenticated, authLoading, navigate]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const {
        error
      } = await login(email, password);
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
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  return <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Painel de Migração */}
        {showMigrationPanel && (
          <MigrationPanel />
        )}
        
        {/* Painel de Debug de Autenticação */}
        {showDebugPanel && (
          <AuthDebugPanel />
        )}
        
        <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img src="/lovable-uploads/c25efcbd-b42b-48b3-9e82-db0628ef0cbc.png" alt="SA TELECOM" className="h-40 object-contain" />
          </div>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Faça login para acessar o sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Botões de Debug e Migração */}
            {!showMigrationPanel && !showDebugPanel && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>Problemas com login? Ferramentas de diagnóstico:</span>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowDebugPanel(true)}
                    >
                      Debug Auth
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setShowMigrationPanel(true)}
                    >
                      Migração
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {error && <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required disabled={loading} />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Sua senha" required disabled={loading} />
            </div>
            
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </> : 'Entrar'}
            </Button>
          </form>
        </CardContent>
        </Card>
      </div>
    </div>;
}