import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Usuario, FuncaoUsuario, UsuarioFormData } from "@/types/usuario";
import { Equipe } from "@/types/equipe";
import { usuariosService } from "@/services/usuariosService";
import { equipesService } from "@/services/equipesService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { sanitizeFormData, isInputSafe } from "@/utils/inputSanitizer";

interface UserFormProps {
  usuario?: Usuario;
  onSubmit: (data: UsuarioFormData) => void;
  onCancel: () => void;
}

export function UserForm({ usuario, onSubmit, onCancel }: UserFormProps) {
  const { usuario: usuarioLogado } = useAuth();
  const [equipes, setEquipes] = useState<Equipe[]>([]);
  const [formData, setFormData] = useState<UsuarioFormData>({
    nome: usuario?.nome || "",
    telefone: usuario?.telefone || "",
    email: usuario?.email || "",
    cpf: usuario?.cpf || "",
    funcao: usuario?.funcao || FuncaoUsuario.VENDEDOR,
    equipeId: usuario?.equipeId || "",
    supervisorEquipeId: usuario?.supervisorEquipeId || ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidatingCpf, setIsValidatingCpf] = useState(false);
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);

  useEffect(() => {
    carregarEquipes();
  }, []);

  const carregarEquipes = async () => {
    try {
      const equipesData = await equipesService.obterEquipes();
      setEquipes(equipesData);
    } catch (error) {
      console.error('Erro ao carregar equipes:', error);
    }
  };

  const getFuncoesPermitidas = (): FuncaoUsuario[] => {
    if (!usuarioLogado) return [];

    switch (usuarioLogado.funcao) {
      case FuncaoUsuario.ADMINISTRADOR_GERAL:
        return [FuncaoUsuario.ADMINISTRADOR_GERAL, FuncaoUsuario.SUPERVISOR, FuncaoUsuario.SUPERVISOR_EQUIPE, FuncaoUsuario.VENDEDOR];
      case FuncaoUsuario.SUPERVISOR:
        return [FuncaoUsuario.SUPERVISOR_EQUIPE, FuncaoUsuario.VENDEDOR];
      case FuncaoUsuario.SUPERVISOR_EQUIPE:
        return [FuncaoUsuario.VENDEDOR];
      default:
        return [];
    }
  };

  const validateForm = async () => {
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
    } else {
      const emailUnico = await usuariosService.validarEmailUnico(formData.email, usuario?.id);
      if (!emailUnico) {
        newErrors.email = "Este email já está em uso";
      }
    }

    if (!formData.cpf.trim()) {
      newErrors.cpf = "CPF é obrigatório";
    } else {
      const cpfUnico = await usuariosService.validarCpfUnico(formData.cpf, usuario?.id);
      if (!cpfUnico) {
        newErrors.cpf = "Este CPF já está em uso";
      }
    }

    if (formData.funcao === FuncaoUsuario.SUPERVISOR_EQUIPE || formData.funcao === FuncaoUsuario.VENDEDOR) {
      if (!formData.equipeId) {
        newErrors.equipeId = "Equipe é obrigatória para esta função";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate input safety before processing
      for (const [field, value] of Object.entries(formData)) {
        if (typeof value === 'string') {
          const safety = isInputSafe(value);
          if (!safety.safe) {
            setErrors(prev => ({ ...prev, [field]: safety.reason || 'Entrada contém caracteres inválidos' }));
            toast.error(`Erro no campo ${field}: ${safety.reason}`);
            return;
          }
        }
      }
      
      if (await validateForm()) {
        // Sanitize form data before submission
        const sanitizedData = sanitizeFormData(formData);
        
        const userData: UsuarioFormData = {
          nome: sanitizedData.nome.toUpperCase(), // Garantir que o nome seja em maiúsculas
          telefone: usuariosService.formatarTelefone(sanitizedData.telefone),
          email: sanitizedData.email.toLowerCase(), // Garantir email em minúsculas
          cpf: usuariosService.formatarCpf(sanitizedData.cpf),
          funcao: sanitizedData.funcao,
          equipeId: sanitizedData.equipeId || undefined,
          supervisorEquipeId: sanitizedData.supervisorEquipeId || undefined
        };
        
        onSubmit(userData);
      }
    } catch (error: any) {
      console.error('Erro ao salvar usuário:', error);
      
      // Tratar erros específicos de CPF/Email duplicado
      if (error.message?.includes('cpf_key')) {
        setErrors(prev => ({ ...prev, cpf: "Este CPF já está em uso" }));
        toast.error("Erro: CPF já cadastrado no sistema");
      } else if (error.message?.includes('email_key')) {
        setErrors(prev => ({ ...prev, email: "Este email já está em uso" }));
        toast.error("Erro: Email já cadastrado no sistema");
      } else {
        toast.error("Erro ao salvar usuário. Tente novamente.");
      }
    }
  };

  // Debounce para validação em tempo real
  const validateCpfUnique = useCallback(
    async (cpf: string) => {
      if (!cpf.trim() || cpf === usuario?.cpf) return;
      
      setIsValidatingCpf(true);
      try {
        const isUnique = await usuariosService.validarCpfUnico(cpf, usuario?.id);
        if (!isUnique) {
          setErrors(prev => ({ ...prev, cpf: "Este CPF já está em uso" }));
        } else {
          setErrors(prev => ({ ...prev, cpf: "" }));
        }
      } catch (error) {
        console.error('Erro ao validar CPF:', error);
      } finally {
        setIsValidatingCpf(false);
      }
    },
    [usuario?.id, usuario?.cpf]
  );

  const validateEmailUnique = useCallback(
    async (email: string) => {
      if (!email.trim() || email === usuario?.email || !/\S+@\S+\.\S+/.test(email)) return;
      
      setIsValidatingEmail(true);
      try {
        const isUnique = await usuariosService.validarEmailUnico(email, usuario?.id);
        if (!isUnique) {
          setErrors(prev => ({ ...prev, email: "Este email já está em uso" }));
        } else {
          setErrors(prev => ({ ...prev, email: "" }));
        }
      } catch (error) {
        console.error('Erro ao validar email:', error);
      } finally {
        setIsValidatingEmail(false);
      }
    },
    [usuario?.id, usuario?.email]
  );

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }

    // Validação em tempo real para CPF e Email
    if (field === 'cpf' && value.length >= 11) {
      setTimeout(() => validateCpfUnique(value), 500);
    }
    if (field === 'email' && value.includes('@')) {
      setTimeout(() => validateEmailUnique(value), 500);
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

  const funcoesPermitidas = getFuncoesPermitidas();
  const precisaEquipe = formData.funcao === FuncaoUsuario.SUPERVISOR_EQUIPE || formData.funcao === FuncaoUsuario.VENDEDOR;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{usuario ? "Editar Usuário" : "Novo Usuário"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome*</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                placeholder="Nome completo"
              />
              {errors.nome && <p className="text-sm text-destructive">{errors.nome}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone*</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => handleInputChange("telefone", e.target.value)}
                placeholder="(11) 99999-9999"
              />
              {errors.telefone && <p className="text-sm text-destructive">{errors.telefone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email*</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="usuario@email.com"
                  className={isValidatingEmail ? "pr-8" : ""}
                />
                {isValidatingEmail && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf">CPF*</Label>
              <div className="relative">
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange("cpf", e.target.value)}
                  placeholder="000.000.000-00"
                  className={isValidatingCpf ? "pr-8" : ""}
                />
                {isValidatingCpf && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="funcao">Função*</Label>
              <Select value={formData.funcao} onValueChange={(value) => handleInputChange("funcao", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  {funcoesPermitidas.map((funcao) => (
                    <SelectItem key={funcao} value={funcao}>
                      {obterNomeFuncao(funcao)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {precisaEquipe && (
              <div className="space-y-2">
                <Label htmlFor="equipe">Equipe*</Label>
                <Select value={formData.equipeId} onValueChange={(value) => handleInputChange("equipeId", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a equipe" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipes.map((equipe) => (
                      <SelectItem key={equipe.id} value={equipe.id}>
                        {equipe.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.equipeId && <p className="text-sm text-destructive">{errors.equipeId}</p>}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit">
              {usuario ? "Atualizar" : "Criar"} Usuário
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}