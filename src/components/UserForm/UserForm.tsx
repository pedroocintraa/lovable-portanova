import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Usuario, FuncaoUsuario } from "@/types/usuario";
import { userService } from "@/services/userService";
import { useToast } from "@/hooks/use-toast";

interface UserFormProps {
  usuario?: Usuario;
  onSubmit: (usuario: Usuario) => void;
  onCancel: () => void;
}

export function UserForm({ usuario, onSubmit, onCancel }: UserFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome: usuario?.nome || "",
    telefone: usuario?.telefone || "",
    email: usuario?.email || "",
    cpf: usuario?.cpf || "",
    funcao: usuario?.funcao || FuncaoUsuario.VENDEDOR
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome é obrigatório";
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email é obrigatório";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Email inválido";
    } else if (!userService.validarEmailUnico(formData.email, usuario?.id)) {
      newErrors.email = "Este email já está em uso";
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (!userService.validarCpfUnico(formData.cpf, usuario?.id)) {
      newErrors.cpf = "Este CPF já está em uso";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Erro de validação",
        description: "Por favor, corrija os erros no formulário",
        variant: "destructive"
      });
      return;
    }

    const novoUsuario: Usuario = {
      id: usuario?.id || userService.gerarId(),
      nome: formData.nome.toUpperCase(),
      telefone: userService.formatarTelefone(formData.telefone),
      email: formData.email.toLowerCase(),
      cpf: userService.formatarCpf(formData.cpf),
      funcao: formData.funcao,
      dataCadastro: usuario?.dataCadastro || new Date().toISOString(),
      ativo: usuario?.ativo ?? true
    };

    onSubmit(novoUsuario);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>
          {usuario ? "Editar Usuário" : "Cadastrar Novo Usuário"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Digite o nome completo"
                className={errors.nome ? "border-destructive" : ""}
              />
              {errors.nome && (
                <p className="text-sm text-destructive mt-1">{errors.nome}</p>
              )}
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
                className={errors.telefone ? "border-destructive" : ""}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive mt-1">{errors.telefone}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="usuario@exemplo.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email}</p>
              )}
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => handleInputChange("cpf", e.target.value)}
                placeholder="000.000.000-00"
                className={errors.cpf ? "border-destructive" : ""}
              />
              {errors.cpf && (
                <p className="text-sm text-destructive mt-1">{errors.cpf}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="funcao">Função *</Label>
              <Select 
                value={formData.funcao} 
                onValueChange={(value) => handleInputChange("funcao", value as FuncaoUsuario)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={FuncaoUsuario.VENDEDOR}>Vendedor</SelectItem>
                  <SelectItem value={FuncaoUsuario.SUPERVISOR}>Supervisor</SelectItem>
                  <SelectItem value={FuncaoUsuario.ADMINISTRADOR_GERAL}>Administrador Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="submit" className="flex-1">
              {usuario ? "Atualizar" : "Cadastrar"} Usuário
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}