import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Users, UserCheck } from "lucide-react";
import { equipesService } from "@/services/equipesService";
import { Equipe, EquipeFormData, EquipeComMembros } from "@/types/equipe";
import { useToast } from "@/hooks/use-toast";

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

export default function GerenciamentoEquipes() {
  const [equipes, setEquipes] = useState<EquipeComMembros[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [equipeEditando, setEquipeEditando] = useState<Equipe | undefined>();
  const [equipeParaExcluir, setEquipeParaExcluir] = useState<EquipeComMembros | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    carregarEquipes();
  }, []);

  const carregarEquipes = async () => {
    try {
      const data = await equipesService.obterEquipesComMembros();
      setEquipes(data);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao carregar equipes",
        variant: "destructive",
      });
    }
  };

  const equipesFiltradas = equipes.filter(equipe =>
    equipe.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (equipe.descricao && equipe.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSalvarEquipe = async (data: EquipeFormData) => {
    try {
      if (equipeEditando) {
        await equipesService.atualizarEquipe(equipeEditando.id, data);
        toast({
          title: "Sucesso",
          description: "Equipe atualizada com sucesso",
        });
      } else {
        await equipesService.salvarEquipe(data);
        toast({
          title: "Sucesso",
          description: "Equipe criada com sucesso",
        });
      }
      setShowForm(false);
      setEquipeEditando(undefined);
      carregarEquipes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExcluirEquipe = async () => {
    if (!equipeParaExcluir) return;

    try {
      await equipesService.excluirEquipe(equipeParaExcluir.id);
      toast({
        title: "Sucesso",
        description: "Equipe excluída com sucesso",
      });
      setEquipeParaExcluir(null);
      carregarEquipes();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditarEquipe = (equipe: EquipeComMembros) => {
    setEquipeEditando(equipe);
    setShowForm(true);
  };

  const handleNovaEquipe = () => {
    setEquipeEditando(undefined);
    setShowForm(true);
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gerenciamento de Equipes</h1>
        <Button onClick={handleNovaEquipe}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Equipe
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Equipes</CardTitle>
            <div className="w-80">
              <Input
                placeholder="Buscar equipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {equipesFiltradas.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {searchTerm ? "Nenhuma equipe encontrada" : "Nenhuma equipe cadastrada"}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {equipesFiltradas.map((equipe) => (
                <Card key={equipe.id} className="h-fit">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{equipe.nome}</CardTitle>
                        {equipe.descricao && (
                          <p className="text-sm text-muted-foreground">
                            {equipe.descricao}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {equipe.membros} {equipe.membros === 1 ? "membro" : "membros"}
                        </span>
                      </div>

                      {equipe.supervisor && (
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{equipe.supervisor}</span>
                          <Badge variant="secondary">Supervisor</Badge>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditarEquipe(equipe)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEquipeParaExcluir(equipe)}
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Excluir
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a equipe "{equipe.nome}"?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setEquipeParaExcluir(null)}>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction onClick={handleExcluirEquipe}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}