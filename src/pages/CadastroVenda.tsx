import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { buscarEnderecoPorCep, formatarCep, validarCep } from "@/services/viacep";
import { salvarVenda } from "@/utils/localStorage";
import { Venda, VendaFormData } from "@/types/venda";
import { Loader2, Upload, User, MapPin } from "lucide-react";

/**
 * Página de cadastro de nova venda
 * Formulário completo com integração ViaCEP e upload de documentos
 */
const CadastroVenda = () => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VendaFormData>();
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [documentos, setDocumentos] = useState<{ documentoCliente?: File; fachadaCasa?: File }>({});
  const navigate = useNavigate();
  const { toast } = useToast();

  const cepValue = watch("cliente.endereco.cep");

  /**
   * Busca endereço automaticamente quando CEP é preenchido
   */
  const handleCepChange = async (cep: string) => {
    const cepFormatado = formatarCep(cep);
    setValue("cliente.endereco.cep", cepFormatado);

    if (validarCep(cep)) {
      setIsLoadingCep(true);
      try {
        const endereco = await buscarEnderecoPorCep(cep);
        if (endereco) {
          setValue("cliente.endereco.logradouro", endereco.logradouro);
          setValue("cliente.endereco.bairro", endereco.bairro);
          setValue("cliente.endereco.localidade", endereco.localidade);
          setValue("cliente.endereco.uf", endereco.uf);
          
          toast({
            title: "Endereço encontrado!",
            description: "Dados preenchidos automaticamente",
          });
        } else {
          toast({
            title: "CEP não encontrado",
            description: "Verifique o CEP informado",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Erro ao buscar CEP",
          description: "Verifique sua conexão e tente novamente",
          variant: "destructive",
        });
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  /**
   * Processa upload de arquivos
   */
  const handleFileUpload = (tipo: "documentoCliente" | "fachadaCasa", file: File) => {
    setDocumentos(prev => ({ ...prev, [tipo]: file }));
    toast({
      title: "Arquivo carregado",
      description: `${file.name} foi adicionado com sucesso`,
    });
  };

  /**
   * Submete o formulário e salva a venda
   */
  const onSubmit = (data: VendaFormData) => {
    try {
      const novaVenda: Venda = {
        id: `venda-${Date.now()}`,
        cliente: data.cliente,
        documentos,
        status: "gerada",
        dataVenda: new Date().toISOString(),
        observacoes: data.observacoes,
      };

      salvarVenda(novaVenda);

      toast({
        title: "Venda cadastrada com sucesso!",
        description: "A venda foi registrada e está disponível no acompanhamento",
      });

      navigate("/acompanhamento");
    } catch (error) {
      toast({
        title: "Erro ao cadastrar venda",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nova Venda</h1>
        <p className="text-muted-foreground">
          Cadastre uma nova venda porta a porta
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Dados do Cliente */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5 text-primary" />
              <span>Dados do Cliente</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  {...register("cliente.nome", { required: "Nome é obrigatório" })}
                  placeholder="Digite o nome completo"
                />
                {errors.cliente?.nome && (
                  <span className="text-sm text-destructive">{errors.cliente.nome.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  {...register("cliente.telefone", { required: "Telefone é obrigatório" })}
                  placeholder="(00) 00000-0000"
                />
                {errors.cliente?.telefone && (
                  <span className="text-sm text-destructive">{errors.cliente.telefone.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("cliente.email")}
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  {...register("cliente.cpf", { required: "CPF é obrigatório" })}
                  placeholder="000.000.000-00"
                />
                {errors.cliente?.cpf && (
                  <span className="text-sm text-destructive">{errors.cliente.cpf.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  {...register("cliente.dataNascimento")}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Endereço</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    {...register("cliente.endereco.cep", { required: "CEP é obrigatório" })}
                    placeholder="00000-000"
                    onChange={(e) => handleCepChange(e.target.value)}
                  />
                  {isLoadingCep && (
                    <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-primary" />
                  )}
                </div>
                {errors.cliente?.endereco?.cep && (
                  <span className="text-sm text-destructive">{errors.cliente.endereco.cep.message}</span>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="logradouro">Endereço *</Label>
                <Input
                  id="logradouro"
                  {...register("cliente.endereco.logradouro", { required: "Endereço é obrigatório" })}
                  placeholder="Rua, Avenida, etc."
                />
                {errors.cliente?.endereco?.logradouro && (
                  <span className="text-sm text-destructive">{errors.cliente.endereco.logradouro.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="numero">Número *</Label>
                <Input
                  id="numero"
                  {...register("cliente.endereco.numero", { required: "Número é obrigatório" })}
                  placeholder="123"
                />
                {errors.cliente?.endereco?.numero && (
                  <span className="text-sm text-destructive">{errors.cliente.endereco.numero.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="complemento">Complemento</Label>
                <Input
                  id="complemento"
                  {...register("cliente.endereco.complemento")}
                  placeholder="Apto, Bloco, etc."
                />
              </div>

              <div>
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  {...register("cliente.endereco.bairro", { required: "Bairro é obrigatório" })}
                  placeholder="Nome do bairro"
                />
                {errors.cliente?.endereco?.bairro && (
                  <span className="text-sm text-destructive">{errors.cliente.endereco.bairro.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="localidade">Cidade *</Label>
                <Input
                  id="localidade"
                  {...register("cliente.endereco.localidade", { required: "Cidade é obrigatória" })}
                  placeholder="Nome da cidade"
                />
                {errors.cliente?.endereco?.localidade && (
                  <span className="text-sm text-destructive">{errors.cliente.endereco.localidade.message}</span>
                )}
              </div>

              <div>
                <Label htmlFor="uf">Estado *</Label>
                <Input
                  id="uf"
                  {...register("cliente.endereco.uf", { required: "Estado é obrigatório" })}
                  placeholder="SP"
                  maxLength={2}
                />
                {errors.cliente?.endereco?.uf && (
                  <span className="text-sm text-destructive">{errors.cliente.endereco.uf.message}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Upload de Documentos */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5 text-primary" />
              <span>Documentos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="documentoCliente">Documento do Cliente</Label>
                <Input
                  id="documentoCliente"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload("documentoCliente", file);
                  }}
                />
                {documentos.documentoCliente && (
                  <p className="text-sm text-success mt-1">
                    ✓ {documentos.documentoCliente.name}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="fachadaCasa">Foto da Fachada</Label>
                <Input
                  id="fachadaCasa"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload("fachadaCasa", file);
                  }}
                />
                {documentos.fachadaCasa && (
                  <p className="text-sm text-success mt-1">
                    ✓ {documentos.fachadaCasa.name}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <div className="flex justify-end space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            Cancelar
          </Button>
          <Button 
            type="submit"
            className="bg-gradient-primary hover:shadow-primary"
          >
            Cadastrar Venda
          </Button>
        </div>
      </form>
    </div>
  );
};

export default CadastroVenda;