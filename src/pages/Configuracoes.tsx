import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { configuracaoService } from "@/services/configuracaoService";
import type { Plano, PlanoFormData } from "@/types/configuracao";
import { useAuth } from "@/contexts/AuthContext";

const Configuracoes = () => {
  const { usuario } = useAuth();
  const { toast } = useToast();
  
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [isLoadingPlanos, setIsLoadingPlanos] = useState(true);
  
  // Estados para modais
  const [modalPlanoAberto, setModalPlanoAberto] = useState(false);
  const [planoEditando, setPlanoEditando] = useState<Plano | null>(null);
  const [formModificado, setFormModificado] = useState(false);

  // Verificar se é administrador
  if (usuario?.funcao !== "ADMINISTRADOR_GERAL") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Acesso Negado</CardTitle>
            <CardDescription>
              Apenas administradores gerais podem acessar as configurações.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  useEffect(() => {
    carregarPlanos();
  }, []);

  const carregarPlanos = async () => {
    try {
      const data = await configuracaoService.obterPlanos();
      setPlanos(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao carregar planos",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPlanos(false);
    }
  };

  const handleFecharModal = () => {
    if (formModificado) {
      const confirmar = confirm("Há alterações não salvas. Deseja realmente fechar?");
      if (!confirmar) return;
    }
    
    setModalPlanoAberto(false);
    setPlanoEditando(null);
    setFormModificado(false);
  };

  const handleAbrirModal = (plano?: Plano) => {
    setPlanoEditando(plano || null);
    setFormModificado(false);
    setModalPlanoAberto(true);
  };


  const handleSalvarPlano = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const planoData: PlanoFormData = {
      nome: formData.get("nome") as string,
      descricao: formData.get("descricao") as string,
      valor: formData.get("valor") ? parseFloat(formData.get("valor") as string) : undefined,
      ativo: formData.get("ativo") === "on",
    };

    try {
      if (planoEditando) {
        await configuracaoService.atualizarPlano(planoEditando.id, planoData);
        toast({ title: "Plano atualizado com sucesso!" });
      } else {
        await configuracaoService.criarPlano(planoData);
        toast({ title: "Plano criado com sucesso!" });
      }
      
      setModalPlanoAberto(false);
      setPlanoEditando(null);
      setFormModificado(false);
      carregarPlanos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao salvar plano",
        variant: "destructive",
      });
    }
  };


  const handleExcluirPlano = async (id: string) => {
    try {
      await configuracaoService.excluirPlano(id);
      toast({ title: "Plano desativado com sucesso!" });
      carregarPlanos();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao desativar plano",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie os planos disponíveis do sistema
        </p>
      </div>

      {/* Seção de Planos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Planos</CardTitle>
            <CardDescription>Gerencie os planos disponíveis para os clientes</CardDescription>
          </div>
          
          <Dialog open={modalPlanoAberto} onOpenChange={() => {}}>
            <DialogTrigger asChild>
              <Button onClick={() => handleAbrirModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent onInteractOutside={(e) => e.preventDefault()}>
              <DialogHeader>
                <DialogTitle>{planoEditando ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                <DialogDescription>
                  {planoEditando ? "Edite as informações do plano" : "Crie um novo plano para os clientes"}
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSalvarPlano} className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input 
                    id="nome" 
                    name="nome" 
                    defaultValue={planoEditando?.nome || ""}
                    onChange={() => setFormModificado(true)}
                    required 
                  />
                </div>
                
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea 
                    id="descricao" 
                    name="descricao" 
                    defaultValue={planoEditando?.descricao || ""}
                    onChange={() => setFormModificado(true)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="valor">Valor (R$)</Label>
                  <Input 
                    id="valor" 
                    name="valor" 
                    type="number" 
                    step="0.01"
                    defaultValue={planoEditando?.valor || ""}
                    onChange={() => setFormModificado(true)}
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="ativo" 
                    name="ativo" 
                    defaultChecked={planoEditando?.ativo ?? true}
                    onCheckedChange={() => setFormModificado(true)}
                  />
                  <Label htmlFor="ativo">Ativo</Label>
                </div>
                
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={handleFecharModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {planoEditando ? "Atualizar" : "Criar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {isLoadingPlanos ? (
            <p>Carregando planos...</p>
          ) : (
            <div className="space-y-4">
              {planos.map((plano) => (
                <div key={plano.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{plano.nome}</h4>
                    {plano.descricao && <p className="text-sm text-muted-foreground">{plano.descricao}</p>}
                    {plano.valor && <p className="text-sm">R$ {plano.valor.toFixed(2)}</p>}
                    <p className="text-xs text-muted-foreground">
                      Status: {plano.ativo ? "Ativo" : "Inativo"}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAbrirModal(plano)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluirPlano(plano.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Configuracoes;