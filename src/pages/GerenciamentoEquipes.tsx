import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Pencil, Trash2, Plus, Search, Users, UserPlus, Shield, Info } from "lucide-react";
import { Equipe, EquipeFormData, EquipeComMembros } from "@/types/equipe";
import { Usuario, FuncaoUsuario } from "@/types/usuario";
import { equipesService } from "@/services/equipesService";
import { usuariosService } from "@/services/usuariosService";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface EquipeFormProps {
  equipe?: Equipe;
  onSubmit: (data: EquipeFormData) => void;
  onCancel: () => void;
}

function EquipeForm({ equipe, onSubmit, onCancel }: EquipeFormProps) {
  const [formData, setFormData] = useState<EquipeFormData>({
    nome: equipe?.nome || "",
    descricao: equipe?.descricao || "",
  });
  const [errors, setErrors] = useState<Partial<EquipeFormData>>({});

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Partial<EquipeFormData> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    } else if (formData.nome.length < 2) {
      newErrors.nome = "Nome deve ter pelo menos 2 caracteres";
    } else {
      const isUnique = await equipesService.validarNomeUnico(formData.nome, equipe?.id);
      if (!isUnique) {
        newErrors.nome = "Já existe uma equipe com este nome";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await validateForm();
    if (isValid) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof EquipeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{equipe ? "Editar Equipe" : "Nova Equipe"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome da Equipe</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => handleInputChange("nome", e.target.value)}
              className={errors.nome ? "border-destructive" : ""}
            />
            {errors.nome && (
              <p className="text-sm text-destructive mt-1">{errors.nome}</p>
            )}
          </div>

          <div>
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange("descricao", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit">
              {equipe ? "Atualizar" : "Criar"} Equipe
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function GerenciamentoEquipes() {
  const { toast } = useToast();
  const { permissoes } = useAuth();
  const [equipes, setEquipes] = useState<EquipeComMembros[]>([]);
  const [filteredEquipes, setFilteredEquipes] = useState<EquipeComMembros[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [equipeEditando, setEquipeEditando] = useState<Equipe | undefined>();
  const [equipeParaExcluir, setEquipeParaExcluir] = useState<Equipe | null>(null);
  const [equipeSelecionada, setEquipeSelecionada] = useState<string>("");
  const [membrosEquipe, setMembrosEquipe] = useState<Usuario[]>([]);
  const [supervisoresDisponiveis, setSupervisoresDisponiveis] = useState<Usuario[]>([]);
  const [supervisorSelecionado, setSupervisorSelecionado] = useState<string>("");

  useEffect(() => {
    carregarEquipes();
    carregarSupervisoresDisponiveis();
  }, []);

  useEffect(() => {
    filtrarEquipes();
  }, [equipes, searchTerm]);

  useEffect(() => {
    if (equipeSelecionada) {
      carregarMembrosEquipe(equipeSelecionada);
    }
  }, [equipeSelecionada]);

  const carregarEquipes = async () => {
    try {
      const equipesData = await equipesService.obterEquipesComMembros();
      setEquipes(equipesData);
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
      // Fallback: tentar carregar apenas as equipes básicas
      try {
        const equipesBasicas = await equipesService.obterEquipes();
        const equipesComMembrosVazio = equipesBasicas.map(e => ({
          ...e,
          membros: 0,
          supervisor: undefined
        }));
        setEquipes(equipesComMembrosVazio);
        toast({
          title: "Aviso",
          description: "Informações de membros não disponíveis",
          variant: "default",
        });
      } catch (fallbackError) {
        toast({
          title: "Erro",
          description: "Erro ao carregar equipes",
          variant: "destructive",
        });
      }
    }
  };

  const carregarMembrosEquipe = async (equipeId: string) => {
    try {
      const membros = await usuariosService.obterUsuariosPorEquipe(equipeId);
      setMembrosEquipe(membros);
    } catch (error) {
      console.error('Erro ao carregar membros da equipe:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar membros da equipe",
        variant: "destructive",
      });
    }
  };

  const carregarSupervisoresDisponiveis = async () => {
    try {
      const usuarios = await usuariosService.obterUsuarios();
      const supervisores = usuarios.filter(u => u.funcao === FuncaoUsuario.SUPERVISOR_EQUIPE);
      setSupervisoresDisponiveis(supervisores);
    } catch (error) {
      console.error('Erro ao carregar supervisores:', error);
    }
  };

  const filtrarEquipes = () => {
    let filtered = equipes;

    if (searchTerm) {
      filtered = filtered.filter(equipe =>
        equipe.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (equipe.descricao && equipe.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredEquipes(filtered);
  };

  const handleSalvarEquipe = async (data: EquipeFormData) => {
    try {
      if (equipeEditando) {
        await equipesService.atualizarEquipe(equipeEditando.id, data);
        toast({
          title: "Sucesso",
          description: "Equipe atualizada com sucesso!",
        });
      } else {
        await equipesService.salvarEquipe(data);
        toast({
          title: "Sucesso",
          description: "Equipe criada com sucesso!",
        });
      }
      
      await carregarEquipes();
      setShowForm(false);
      setEquipeEditando(undefined);
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar equipe",
        variant: "destructive",
      });
    }
  };

  const handleExcluirEquipe = async (equipe: Equipe) => {
    try {
      await equipesService.excluirEquipe(equipe.id);
      toast({
        title: "Sucesso",
        description: "Equipe excluída com sucesso!",
      });
      await carregarEquipes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir equipe",
        variant: "destructive",
      });
    }
    setEquipeParaExcluir(null);
  };

  const handleEditarEquipe = (equipe: Equipe) => {
    setEquipeEditando(equipe);
    setShowForm(true);
  };

  const handleNovaEquipe = () => {
    setEquipeEditando(undefined);
    setShowForm(true);
  };

  const handleAtribuirSupervisor = async () => {
    if (!equipeSelecionada || !supervisorSelecionado) return;

    try {
      await usuariosService.atribuirSupervisorEquipe(equipeSelecionada, supervisorSelecionado);
      toast({
        title: "Sucesso",
        description: "Supervisor atribuído com sucesso!",
      });
      await carregarEquipes();
      await carregarMembrosEquipe(equipeSelecionada);
      setSupervisorSelecionado("");
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atribuir supervisor",
        variant: "destructive",
      });
    }
  };

  const obterNomeFuncao = (funcao: FuncaoUsuario): string => {
    switch (funcao) {
      case FuncaoUsuario.ADMINISTRADOR_GERAL:
        return "Administrador Geral";
      case FuncaoUsuario.SUPERVISOR:
        return "Supervisor";
      case FuncaoUsuario.SUPERVISOR_EQUIPE:
        return "Supervisor de Equipe";
      case FuncaoUsuario.VENDEDOR:
        return "Vendedor";
      default:
        return funcao;
    }
  };

  const obterCorFuncao = (funcao: FuncaoUsuario) => {
    switch (funcao) {
      case FuncaoUsuario.ADMINISTRADOR_GERAL:
        return "destructive";
      case FuncaoUsuario.SUPERVISOR:
        return "default";
      case FuncaoUsuario.SUPERVISOR_EQUIPE:
        return "secondary";
      case FuncaoUsuario.VENDEDOR:
        return "outline";
      default:
        return "outline";
    }
  };

  if (showForm) {
    return (
      <EquipeForm
        equipe={equipeEditando}
        onSubmit={handleSalvarEquipe}
        onCancel={() => {
          setShowForm(false);
          setEquipeEditando(undefined);
        }}
      />
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciamento de Equipes</h1>
        {permissoes?.podeGerenciarEquipes ? (
          <Button onClick={handleNovaEquipe}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Equipe
          </Button>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="text-sm">Visualização apenas</span>
          </div>
        )}
      </div>

      <Tabs defaultValue="equipes" className="space-y-6">
        <TabsList>
          <TabsTrigger value="equipes">Equipes</TabsTrigger>
          {permissoes?.podeGerenciarEquipes && (
            <TabsTrigger value="membros">Gerenciar Membros</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="equipes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Equipes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Input
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {filteredEquipes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma equipe encontrada.
                </p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredEquipes.map((equipe) => (
                    <Card key={equipe.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold text-lg">{equipe.nome}</h3>
                            <Badge variant="outline">
                              <Users className="h-3 w-3 mr-1" />
                              {equipe.membros}
                            </Badge>
                          </div>
                          
                          {equipe.descricao && (
                            <p className="text-sm text-muted-foreground">{equipe.descricao}</p>
                          )}
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p><strong>Membros:</strong> {equipe.membros}</p>
                            {equipe.supervisor && (
                              <p><strong>Supervisor:</strong> {equipe.supervisor}</p>
                            )}
                            <p><strong>Criada em:</strong> {new Date(equipe.created_at).toLocaleDateString()}</p>
                          </div>
                          
                           {permissoes?.podeGerenciarEquipes && (
                             <div className="flex gap-2 pt-2">
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleEditarEquipe(equipe)}
                               >
                                 <Pencil className="h-4 w-4 mr-1" />
                                 Editar
                               </Button>
                               <Button
                                 variant="destructive"
                                 size="sm"
                                 onClick={() => setEquipeParaExcluir(equipe)}
                               >
                                 <Trash2 className="h-4 w-4 mr-1" />
                                 Excluir
                               </Button>
                             </div>
                           )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {permissoes?.podeGerenciarEquipes && (
          <TabsContent value="membros" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Selecionar Equipe
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={equipeSelecionada} onValueChange={setEquipeSelecionada}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.map((equipe) => (
                      <SelectItem key={equipe.id} value={equipe.id}>
                        {equipe.nome} ({equipe.membros} membros)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {equipeSelecionada && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Atribuir Supervisor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={supervisorSelecionado} onValueChange={setSupervisorSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um supervisor de equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {supervisoresDisponiveis
                        .filter(s => s.equipeId === equipeSelecionada)
                        .map((supervisor) => (
                        <SelectItem key={supervisor.id} value={supervisor.id}>
                          {supervisor.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleAtribuirSupervisor}
                    disabled={!supervisorSelecionado}
                    className="w-full"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Atribuir Supervisor
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {equipeSelecionada && membrosEquipe.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  Membros da Equipe: {equipes.find(e => e.id === equipeSelecionada)?.nome}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {membrosEquipe.map((membro) => (
                    <Card key={membro.id} className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">{membro.nome}</h4>
                          <Badge variant={obterCorFuncao(membro.funcao) as any}>
                            {obterNomeFuncao(membro.funcao)}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Email:</strong> {membro.email}</p>
                          <p><strong>Telefone:</strong> {membro.telefone}</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          </TabsContent>
        )}
      </Tabs>

      <AlertDialog open={!!equipeParaExcluir} onOpenChange={() => setEquipeParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a equipe "{equipeParaExcluir?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => equipeParaExcluir && handleExcluirEquipe(equipeParaExcluir)}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GerenciamentoEquipes;