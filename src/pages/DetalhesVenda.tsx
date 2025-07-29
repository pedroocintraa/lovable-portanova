import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Eye, FileText, User, MapPin, Calendar, Phone, Mail, CreditCard, AlertTriangle } from "lucide-react";
import { Venda, DocumentoAnexado } from "@/types/venda";
import { storageService } from "@/services/storageService";
import DocumentViewer from "@/components/DocumentViewer/DocumentViewer";
import { StatusManager } from "@/components/StatusManager/StatusManager";
import { useToast } from "@/hooks/use-toast";

const DetalhesVenda = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) {
      navigate("/acompanhamento");
      return;
    }

    const carregarVenda = async () => {
      try {
        const vendaCompleta = await storageService.obterVendaCompleta(id);
        if (vendaCompleta) {
          setVenda(vendaCompleta);
        } else {
          toast({
            title: "Erro",
            description: "Venda não encontrada",
            variant: "destructive",
          });
          navigate("/acompanhamento");
        }
      } catch (error) {
        console.error("Erro ao carregar venda:", error);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados da venda",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    carregarVenda();
  }, [id, navigate]);

  const getStatusLabel = (status: Venda["status"]) => {
    const labels = {
      pendente: "Pendente",
      em_andamento: "Em Andamento",
      auditada: "Auditada",
      gerada: "Gerada",
      aguardando_habilitacao: "Aguardando Habilitação",
      habilitada: "Habilitada",
      perdida: "Perdida"
    };
    return labels[status];
  };

  const getStatusVariant = (status: Venda["status"]) => {
    const variants = {
      pendente: "outline",
      em_andamento: "default",
      auditada: "secondary",
      gerada: "default",
      aguardando_habilitacao: "default",
      habilitada: "default",
      perdida: "destructive"
    } as const;
    return variants[status];
  };

  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleString("pt-BR");
  };

  // Função para atualizar status da venda
  const handleStatusChange = async (
    novoStatus: Venda["status"],
    extraData?: { dataInstalacao?: string; motivoPerda?: string }
  ) => {
    if (!venda) return;
    
    try {
      await storageService.atualizarStatusVenda(venda.id, novoStatus, extraData);
      const vendaAtualizada = await storageService.obterVendaCompleta(venda.id);
      if (vendaAtualizada) {
        setVenda(vendaAtualizada);
        toast({
          title: "Status atualizado",
          description: `Venda marcada como ${getStatusLabel(novoStatus).toLowerCase()}.`,
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o status da venda.",
        variant: "destructive",
      });
    }
  };

  const baixarTodosDocumentos = async () => {
    if (!venda?.documentos) {
      toast({
        title: "Erro",
        description: "Nenhum documento disponível para download",
        variant: "destructive",
      });
      return;
    }

    try {
      // Importar JSZip dinamicamente
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      let temDocumentos = false;

      // Adicionar documentos de cada categoria ao ZIP
      Object.entries(venda.documentos).forEach(([categoria, docs]) => {
        if (docs && docs.length > 0) {
          const pasta = zip.folder(categoria);
          docs.forEach((doc: DocumentoAnexado) => {
            // Converter base64 para blob
            const byteCharacters = atob(doc.conteudo.split(',')[1]);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            pasta?.file(doc.nome, byteArray);
            temDocumentos = true;
          });
        }
      });

      if (!temDocumentos) {
        toast({
          title: "Erro",
          description: "Nenhum documento encontrado para download",
          variant: "destructive",
        });
        return;
      }

      // Gerar e baixar o ZIP
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `documentos_venda_${venda.cliente.nome.replace(/\s+/g, '_')}_${id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Sucesso",
        description: "Download de todos os documentos iniciado!",
      });
    } catch (error) {
      console.error("Erro ao baixar documentos:", error);
      toast({
        title: "Erro",
        description: "Erro ao gerar arquivo ZIP",
        variant: "destructive",
      });
    }
  };

  const exportarDadosVenda = () => {
    if (!venda) return;

    const dadosExport = {
      id: venda.id,
      cliente: venda.cliente,
      status: venda.status,
      dataVenda: venda.dataVenda,
      observacoes: venda.observacoes,
      totalDocumentos: venda.documentos ? Object.values(venda.documentos).flat().length : 0
    };

    const blob = new Blob([JSON.stringify(dadosExport, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `venda_${venda.cliente.nome.replace(/\s+/g, '_')}_${id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Sucesso",
      description: "Dados da venda exportados!",
    });
  };

  const contarDocumentos = () => {
    if (!venda?.documentos) return 0;
    return Object.values(venda.documentos).reduce((total, docs) => {
      return total + (docs?.length || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/acompanhamento")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center">Carregando dados da venda...</div>
      </div>
    );
  }

  if (!venda) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/acompanhamento")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center">Venda não encontrada</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/acompanhamento")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Detalhes da Venda</h1>
            <p className="text-muted-foreground">
              Venda #{id?.slice(-8)} • {formatarData(venda.dataVenda)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={getStatusVariant(venda.status)}>
            {getStatusLabel(venda.status)}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados do Cliente */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                  <p className="font-medium">{venda.cliente.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p className="font-medium">{venda.cliente.cpf}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                  <p className="font-medium">{new Date(venda.cliente.dataNascimento).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email</label>
                  <p className="font-medium">{venda.cliente.email}</p>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <label className="text-sm font-medium text-muted-foreground flex items-center gap-2 mb-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </label>
                <p className="font-medium">{venda.cliente.telefone}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP</label>
                  <p className="font-medium">{venda.cliente.endereco.cep}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Logradouro</label>
                  <p className="font-medium">{venda.cliente.endereco.logradouro}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número</label>
                  <p className="font-medium">{venda.cliente.endereco.numero}</p>
                </div>
                {venda.cliente.endereco.complemento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Complemento</label>
                    <p className="font-medium">{venda.cliente.endereco.complemento}</p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                  <p className="font-medium">{venda.cliente.endereco.bairro}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                  <p className="font-medium">{venda.cliente.endereco.localidade}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">UF</label>
                  <p className="font-medium">{venda.cliente.endereco.uf}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {venda.observacoes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{venda.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Documentos e Ações */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos Anexados
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-4">
                <div className="text-2xl font-bold">{contarDocumentos()}</div>
                <div className="text-sm text-muted-foreground">documentos anexados</div>
              </div>
              
              <div className="space-y-2">
                {venda.documentos && (
                  <DocumentViewer 
                    documentos={venda.documentos}
                    trigger={
                      <Button variant="outline" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar Documentos
                      </Button>
                    }
                  />
                )}
                
                <Button 
                  onClick={baixarTodosDocumentos}
                  className="w-full"
                  disabled={contarDocumentos() === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Todos os Documentos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Ações do Backoffice</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusManager
                venda={venda}
                onStatusChange={handleStatusChange}
                showLostOption={true}
              />
              
              <div className="flex flex-col gap-2 pt-4 border-t">
                <Button 
                  onClick={exportarDadosVenda}
                  variant="outline" 
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Dados da Venda
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Informações da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <label className="text-sm font-medium text-muted-foreground">ID da Venda</label>
                <p className="font-medium text-xs break-all">{venda.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data de Cadastro</label>
                <p className="font-medium">{formatarData(venda.dataVenda)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status Atual</label>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(venda.status)}>
                    {getStatusLabel(venda.status)}
                  </Badge>
                </div>
              </div>
              
              {/* Data de Instalação */}
              {venda.dataInstalacao && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Data de Instalação</label>
                    <p className="font-medium">{new Date(venda.dataInstalacao).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              )}
              
              {/* Motivo da Perda */}
              {venda.motivoPerda && (
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Motivo da Perda</label>
                    <p className="text-sm text-muted-foreground mt-1">{venda.motivoPerda}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DetalhesVenda;