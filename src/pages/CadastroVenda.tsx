import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { buscarEnderecoPorCep, formatarCep, validarCep } from "@/services/viacep";
// Import removido - agora usando storageService
import { Venda, VendaFormData, DocumentoAnexado, DocumentosVenda } from "@/types/venda";
import { Loader2, User, MapPin } from "lucide-react";
import DocumentUpload from "@/components/DocumentUpload/DocumentUpload";

/**
 * Página de cadastro de nova venda
 * Formulário completo com integração ViaCEP e upload de documentos
 */
const CadastroVenda = () => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VendaFormData>();
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [documentos, setDocumentos] = useState<DocumentosVenda>({
    documentoClienteFrente: [],
    documentoClienteVerso: [],
    comprovanteEndereco: [],
    fachadaCasa: []
  });
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
   * Atualiza documentos por categoria
   */
  const handleDocumentosChange = (categoria: keyof DocumentosVenda, docs: DocumentoAnexado[]) => {
    setDocumentos(prev => ({ ...prev, [categoria]: docs }));
  };

  /**
   * Submete o formulário e salva a venda
   */
  const onSubmit = async (data: VendaFormData) => {
    try {
      const novaVenda: Venda = {
        id: `venda_${Date.now()}`,
        cliente: data.cliente,
        documentos: documentos,
        status: "gerada",
        dataVenda: new Date().toISOString(),
        observacoes: data.observacoes,
      };

      // Usar o novo serviço de armazenamento
      const { storageService } = await import("@/services/storageService");
      await storageService.salvarVenda(novaVenda);
      
      toast({
        title: "Venda cadastrada",
        description: "Venda cadastrada com sucesso!",
      });

      // Navegar para página de acompanhamento
      navigate("/acompanhamento");
    } catch (error) {
      console.error("Erro ao cadastrar venda:", error);
      toast({
        variant: "destructive",
        title: "Erro ao cadastrar",
        description: "Não foi possível cadastrar a venda. Tente novamente.",
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DocumentUpload
            titulo="Documento Cliente - Frente"
            documentos={documentos.documentoClienteFrente || []}
            onDocumentosChange={(docs) => handleDocumentosChange('documentoClienteFrente', docs)}
            acceptTypes="image/*,.pdf"
            maxFiles={2}
          />
          
          <DocumentUpload
            titulo="Documento Cliente - Verso"
            documentos={documentos.documentoClienteVerso || []}
            onDocumentosChange={(docs) => handleDocumentosChange('documentoClienteVerso', docs)}
            acceptTypes="image/*,.pdf"
            maxFiles={2}
          />
          
          <DocumentUpload
            titulo="Comprovante de Endereço"
            documentos={documentos.comprovanteEndereco || []}
            onDocumentosChange={(docs) => handleDocumentosChange('comprovanteEndereco', docs)}
            acceptTypes="image/*,.pdf"
            maxFiles={3}
          />
          
          <DocumentUpload
            titulo="Fachada da Casa"
            documentos={documentos.fachadaCasa || []}
            onDocumentosChange={(docs) => handleDocumentosChange('fachadaCasa', docs)}
            acceptTypes="image/*"
            maxFiles={3}
          />
        </div>

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