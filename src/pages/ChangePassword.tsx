import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Página para alterar senha do usuário logado
 */
const ChangePassword = () => {
  const { user } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleChangePassword = async (e: React.FormEvent) => {
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

    if (senhaAtual === novaSenha) {
      toast({
        variant: "destructive",
        title: "Senhas iguais",
        description: "A nova senha deve ser diferente da atual.",
      });
      return;
    }

    setLoading(true);

    try {
      // Primeiro, verificar se a senha atual está correta
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: senhaAtual,
      });

      if (signInError) {
        toast({
          variant: "destructive",
          title: "Senha atual incorreta",
          description: "A senha atual digitada está incorreta.",
        });
        return;
      }

      // Atualizar a senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso!",
      });

      // Limpar os campos
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");

    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: error.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Alterar Senha</h1>
        <p className="text-muted-foreground">
          Altere sua senha de acesso ao sistema
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Lock className="h-5 w-5 text-primary" />
            <CardTitle>Alterar Senha</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha-atual">Senha Atual</Label>
              <div className="relative">
                <Input
                  id="senha-atual"
                  type={mostrarSenhaAtual ? "text" : "password"}
                  value={senhaAtual}
                  onChange={(e) => setSenhaAtual(e.target.value)}
                  placeholder="Digite sua senha atual"
                  required
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
                  aria-label={mostrarSenhaAtual ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarSenhaAtual ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nova-senha">Nova Senha</Label>
              <div className="relative">
                <Input
                  id="nova-senha"
                  type={mostrarNovaSenha ? "text" : "password"}
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
                  onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
                  aria-label={mostrarNovaSenha ? "Ocultar senha" : "Mostrar senha"}
                >
                  {mostrarNovaSenha ? (
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
              {loading ? "Alterando..." : "Alterar Senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;