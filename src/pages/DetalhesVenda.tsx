import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabaseService } from "@/services/supabaseService";
import { Venda } from "@/types/venda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DocumentViewer from "@/components/DocumentViewer/DocumentViewer";
import { StatusManager } from "@/components/StatusManager/StatusManager";
import { StatusSelector } from "@/components/StatusSelector/StatusSelector";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar, 
  Eye, 
  Download, 
  Edit3,
  Save,
  X,
  AlertTriangle
} from "lucide-react";
import { maskCPF, maskPhone, unmaskCPF, unmaskPhone, formatarDataBrasil, formatarDataNascimento } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DetalhesVenda = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venda, setVenda] = useState<Venda | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  
  // Estados para edição
  const [editandoCliente, setEditandoCliente] = useState(false);
  const [editandoEndereco, setEditandoEndereco] = useState(false);
  const [dadosEditados, setDadosEditados] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!id) {
      navigate("/acompanhamento");
      return;
    }

    const carregarVenda = async () => {
      try {
        const vendaCompleta = await supabaseService.obterVendaCompleta(id);
        if (vendaCompleta) {
          setVenda(vendaCompleta);
          console.log('✅ Venda carregada do Supabase:', vendaCompleta);
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
    return formatarDataBrasil(dataISO);
  };

  // Funções para edição
  const iniciarEdicaoCliente = () => {
    setDadosEditados({
      nome: venda?.cliente.nome || '',
      cpf: maskCPF(venda?.cliente.cpf || ''),
      telefone: maskPhone(venda?.cliente.telefone || ''),
      email: venda?.cliente.email || '',
      dataNascimento: venda?.cliente.dataNascimento || ''
    });
    setEditandoCliente(true);
  };

  const iniciarEdicaoEndereco = () => {
    setDadosEditados({
      cep: venda?.cliente.endereco.cep || '',
      logradouro: venda?.cliente.endereco.logradouro || '',
      numero: venda?.cliente.endereco.numero || '',
      complemento: venda?.cliente.endereco.complemento || '',
      bairro: venda?.cliente.endereco.bairro || '',
      localidade: venda?.cliente.endereco.localidade || '',
      uf: venda?.cliente.endereco.uf || ''
    });
    setEditandoEndereco(true);
  };

  const cancelarEdicao = () => {
    setEditandoCliente(false);
    setEditandoEndereco(false);
    setDadosEditados(null);
  };

  const salvarAlteracoes = async () => {
    if (!venda || !dadosEditados) return;

    setSalvando(true);
    try {
      // Atualizar dados do cliente
      if (editandoCliente) {
        await supabaseService.atualizarDadosCliente(venda.id, {
          nome: dadosEditados.nome.toUpperCase(),
          cpf: unmaskCPF(dadosEditados.cpf),
          telefone: unmaskPhone(dadosEditados.telefone),
          email: dadosEditados.email,
          dataNascimento: dadosEditados.dataNascimento
        });
      }

      // Atualizar dados do endereço
      if (editandoEndereco) {
        await supabaseService.atualizarEnderecoCliente(venda.id, {
          cep: dadosEditados.cep,
          logradouro: dadosEditados.logradouro.toUpperCase(),
          numero: dadosEditados.numero,
          complemento: dadosEditados.complemento?.toUpperCase() || '',
          bairro: dadosEditados.bairro.toUpperCase(),
          localidade: dadosEditados.localidade.toUpperCase(),
          uf: dadosEditados.uf.toUpperCase()
        });
      }

      // Recarregar venda atualizada
      const vendaAtualizada = await supabaseService.obterVendaCompleta(venda.id);
      if (vendaAtualizada) {
        setVenda(vendaAtualizada);
      }

      cancelarEdicao();
      toast({
        title: "Sucesso",
        description: "Dados atualizados com sucesso!",
      });
    } catch (error) {
      console.error("Erro ao salvar alterações:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // Função para atualizar status da venda
  const handleStatusChange = async (
    novoStatus: Venda["status"],
    extraData?: { dataInstalacao?: string; motivoPerda?: string }
  ) => {
    console.log('🔍 handleStatusChange chamado:', { novoStatus, extraData, vendaId: venda?.id });
    
    if (!venda) return;
    
    try {
      console.log('🔍 Chamando atualizarStatusVenda...');
      await supabaseService.atualizarStatusVenda(venda.id, novoStatus, extraData);
      
      console.log('🔍 Recarregando venda...');
      const vendaAtualizada = await supabaseService.obterVendaCompleta(venda.id);
      if (vendaAtualizada) {
        setVenda(vendaAtualizada);
        toast({
          title: "Status atualizado",
          description: `Venda marcada como ${getStatusLabel(novoStatus).toLowerCase()}.`,
        });
      }
    } catch (error) {
      console.error("❌ Erro ao atualizar status:", error);
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
          docs.forEach((doc: any) => { // Assuming DocumentoAnexado type is not directly imported here, using 'any' for now
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
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dados do Cliente
                </div>
                {!editandoCliente ? (
                  <Button variant="outline" size="sm" onClick={iniciarEdicaoCliente}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelarEdicao} disabled={salvando}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarAlteracoes} disabled={salvando}>
                      <Save className="h-4 w-4 mr-2" />
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editandoCliente ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                      <p className="font-medium">{venda.cliente.nome}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">CPF</label>
                      <p className="font-medium">{maskCPF(venda.cliente.cpf)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                      <p className="font-medium">{formatarDataNascimento(venda.cliente.dataNascimento)}</p>
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
                    <p className="font-medium">{maskPhone(venda.cliente.telefone)}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="nome">Nome Completo</Label>
                      <Input
                        id="nome"
                        value={dadosEditados?.nome || ''}
                        onChange={(e) => setDadosEditados({...dadosEditados, nome: e.target.value})}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={dadosEditados?.cpf || ''}
                        onChange={(e) => setDadosEditados({...dadosEditados, cpf: maskCPF(e.target.value)})}
                        placeholder="000.000.000-00"
                        maxLength={14}
                      />
                    </div>
                    <div>
                      <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                      <Input
                        id="dataNascimento"
                        type="date"
                        value={dadosEditados?.dataNascimento || ''}
                        onChange={(e) => setDadosEditados({...dadosEditados, dataNascimento: e.target.value})}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={dadosEditados?.email || ''}
                        onChange={(e) => setDadosEditados({...dadosEditados, email: e.target.value})}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={dadosEditados?.telefone || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, telefone: maskPhone(e.target.value)})}
                      placeholder="(00) 0 0000-0000"
                      maxLength={15}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Endereço
                </div>
                {!editandoEndereco ? (
                  <Button variant="outline" size="sm" onClick={iniciarEdicaoEndereco}>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={cancelarEdicao} disabled={salvando}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={salvarAlteracoes} disabled={salvando}>
                      <Save className="h-4 w-4 mr-2" />
                      {salvando ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!editandoEndereco ? (
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={dadosEditados?.cep || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, cep: e.target.value})}
                      placeholder="00000-000"
                      maxLength={9}
                    />
                  </div>
                  <div>
                    <Label htmlFor="logradouro">Logradouro</Label>
                    <Input
                      id="logradouro"
                      value={dadosEditados?.logradouro || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, logradouro: e.target.value})}
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={dadosEditados?.numero || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, numero: e.target.value})}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={dadosEditados?.complemento || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, complemento: e.target.value})}
                      placeholder="Apto, Casa, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={dadosEditados?.bairro || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, bairro: e.target.value})}
                      placeholder="Nome do bairro"
                    />
                  </div>
                  <div>
                    <Label htmlFor="localidade">Cidade</Label>
                    <Input
                      id="localidade"
                      value={dadosEditados?.localidade || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, localidade: e.target.value})}
                      placeholder="Nome da cidade"
                    />
                  </div>
                  <div>
                    <Label htmlFor="uf">UF</Label>
                    <Input
                      id="uf"
                      value={dadosEditados?.uf || ''}
                      onChange={(e) => setDadosEditados({...dadosEditados, uf: e.target.value})}
                      placeholder="SP"
                      maxLength={2}
                    />
                  </div>
                </div>
              )}
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
                    <p className="font-medium">{formatarData(venda.dataInstalacao)}</p>
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