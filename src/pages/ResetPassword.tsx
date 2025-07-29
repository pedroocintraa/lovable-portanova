import { useState } from "react";
import { useSearchParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Página para redefinir senha do usuário
 */
const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Parse URL parameters to check for access token and type
  const accessToken = searchParams.get('access_token');
  const refreshToken = searchParams.get('refresh_token');
  const type = searchParams.get('type');

  // Se já estiver autenticado mas não for um convite/recovery, redirecionar para dashboard
  if (isAuthenticated && !['recovery', 'invite'].includes(type || '')) {
    return <Navigate to="/" replace />;
  }

  // Para convites, verificar tokens no hash (formato padrão do Supabase)
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const hashAccessToken = hashParams.get('access_token');
  const hashRefreshToken = hashParams.get('refresh_token');
  
  // Determinar quais tokens usar
  const finalAccessToken = accessToken || hashAccessToken;
  const finalRefreshToken = refreshToken || hashRefreshToken;
  
  if (!finalAccessToken || !['recovery', 'invite'].includes(type || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground">
              Link Inválido
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground mb-4">
              Este link de redefinição de senha é inválido ou expirou.
            </p>
            <Button 
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      toast({
        variant: "destructive",
        title: "Senhas não coincidem",
        description: "As senhas digitadas não são iguais.",
      });
      return;
    }

    if (novaSenha.length < 6) {
      toast({
        variant: "destructive",
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
      });
      return;
    }

    setLoading(true);

    try {
      // Usar os tokens consolidados
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: finalAccessToken!,
        refresh_token: finalRefreshToken || '',
      });

      if (sessionError) {
        throw sessionError;
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Senha atualizada",
        description: "Sua senha foi alterada com sucesso!",
      });

      // Redirecionar para login após 2 segundos
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao redefinir senha:', error);
      toast({
        variant: "destructive",
        title: "Erro ao redefinir senha",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-foreground">
            {type === 'invite' ? 'Bem-vindo!' : 'Redefinir Senha'}
          </CardTitle>
          <p className="text-muted-foreground">
            {type === 'invite' ? 'Defina sua senha para acessar o sistema' : 'Digite sua nova senha abaixo'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="nova-senha"
                  type={mostrarSenha ? "text" : "password"}
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Digite sua nova senha"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenha ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar-senha">Confirmar Nova Senha</Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme sua nova senha"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Atualizando..." : "Atualizar Senha"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={() => window.location.href = '/login'}
              className="text-sm text-muted-foreground"
            >
              Voltar ao Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;