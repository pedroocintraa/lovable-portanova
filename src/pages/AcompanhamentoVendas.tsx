import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Venda } from "@/types/venda";
import { format, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn, maskCPF, maskPhone, formatarDataBrasil } from "@/lib/utils";
import { 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  CalendarIcon,
  Filter,
  Eye,
  User,
  Users
} from "lucide-react";
import { StatusManager } from "@/components/StatusManager/StatusManager";
import { supabaseService } from "@/services/supabaseService";

/**
 * Página de acompanhamento de vendas
 * Lista todas as vendas com filtros e ações de status
 */
const AcompanhamentoVendas = () => {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Venda["status"] | "todas">("todas");
  const [filtroVendedor, setFiltroVendedor] = useState<string>("todos");
  const [filtroEquipe, setFiltroEquipe] = useState<string>("todas");
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar vendas ao montar o componente
  useEffect(() => {
    const carregarVendas = async () => {
      try {
        // Carregar vendas do Supabase (RLS aplica automaticamente as regras de acesso)
        const vendasCarregadas = await supabaseService.obterVendas();
        setVendas(vendasCarregadas);
        console.log(`📊 ${vendasCarregadas.length} vendas carregadas do Supabase`);
      } catch (error) {
        console.error("Erro ao carregar vendas:", error);
        toast({
          variant: "destructive",
          title: "Erro ao carregar vendas",
          description: "Não foi possível carregar as vendas.",
        });
      } finally {
        setLoading(false);
      }
    };

    if (usuario) {
      carregarVendas();
    }
  }, [toast, usuario]);

  /**
   * Filtra vendas baseado no texto, status, vendedor, equipe e período de datas
   */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      const matchTexto = filtroTexto === "" || 
        venda.cliente.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        venda.cliente.endereco.bairro.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        venda.cliente.endereco.localidade.toLowerCase().includes(filtroTexto.toLowerCase());

      const matchStatus = filtroStatus === "todas" || venda.status === filtroStatus;
      
      const matchVendedor = filtroVendedor === "todos" || 
        (venda.vendedorNome && venda.vendedorNome.toLowerCase().includes(filtroVendedor.toLowerCase()));
      
      const matchEquipe = filtroEquipe === "todas" || 
        (venda.equipeNome && venda.equipeNome.toLowerCase().includes(filtroEquipe.toLowerCase()));

      // Filtro por período de datas (usando dataGeracao ou dataVenda como fallback)
      let matchData = true;
      if (dataInicio || dataFim) {
        const dataVenda = parseISO(venda.dataGeracao || venda.dataVenda);
        
        if (dataInicio && dataFim) {
          matchData = isWithinInterval(dataVenda, { start: dataInicio, end: dataFim });
        } else if (dataInicio) {
          matchData = dataVenda >= dataInicio;
        } else if (dataFim) {
          matchData = dataVenda <= dataFim;
        }
      }

      return matchTexto && matchStatus && matchVendedor && matchEquipe && matchData;
    });
  }, [vendas, filtroTexto, filtroStatus, filtroVendedor, filtroEquipe, dataInicio, dataFim]);

  // Listas únicas para filtros
  const vendedoresUnicos = useMemo(() => {
    const vendedores = [...new Set(vendas.map(v => v.vendedorNome).filter(Boolean))];
    return vendedores.sort();
  }, [vendas]);

  const equipesUnicas = useMemo(() => {
    const equipes = [...new Set(vendas.map(v => v.equipeNome).filter(Boolean))];
    return equipes.sort();
  }, [vendas]);

  /**
   * Atualiza status de uma venda
   */
  const handleAtualizarStatus = async (
    id: string, 
    novoStatus: Venda["status"],
    extraData?: { dataInstalacao?: string; motivoPerda?: string }
  ) => {
    try {
      await supabaseService.atualizarStatusVenda(id, novoStatus, extraData);
      
      // Recarregar vendas para refletir mudanças
      const vendasAtualizadas = await supabaseService.obterVendas();
      setVendas(vendasAtualizadas);

      toast({
        title: "Status atualizado",
        description: `Status da venda alterado para ${getStatusLabel(novoStatus)}`,
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar status",
        description: "Não foi possível atualizar o status da venda.",
      });
    }
  };

  /**
   * Retorna label do status
   */
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

  /**
   * Retorna variante do badge baseado no status
   */
  const getStatusVariant = (status: Venda["status"]) => {
    switch (status) {
      case "pendente": return "outline";
      case "em_andamento": return "default";
      case "auditada": return "secondary";
      case "gerada": return "default";
      case "aguardando_habilitacao": return "default";
      case "habilitada": return "default"; 
      case "perdida": return "destructive";
      default: return "secondary";
    }
  };

  /**
   * Formata data para exibição
   */
  const formatarData = (dataISO: string) => {
    return formatarDataBrasil(dataISO);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
        <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
          <p className="text-muted-foreground">Carregando vendas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
        <p className="text-muted-foreground">
          Gerencie e acompanhe o status das suas vendas
        </p>
      </div>

      {/* Filtros */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <span>Filtros</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Busca por texto */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, bairro ou cidade..."
                  value={filtroTexto}
                  onChange={(e) => setFiltroTexto(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filtros por selects */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Vendedor</label>
                <Select value={filtroVendedor} onValueChange={setFiltroVendedor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os vendedores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os vendedores</SelectItem>
                    {vendedoresUnicos.map((vendedor) => (
                      <SelectItem key={vendedor} value={vendedor}>
                        {vendedor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Equipe</label>
                <Select value={filtroEquipe} onValueChange={setFiltroEquipe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as equipes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas as equipes</SelectItem>
                    {equipesUnicas.map((equipe) => (
                      <SelectItem key={equipe} value={equipe}>
                        {equipe}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Status</label>
                <Select value={filtroStatus} onValueChange={(value: any) => setFiltroStatus(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todos os status</SelectItem>
                    <SelectItem value="pendente">Pendentes</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="auditada">Auditadas</SelectItem>
                    <SelectItem value="gerada">Geradas</SelectItem>
                    <SelectItem value="aguardando_habilitacao">Aguardando Habilitação</SelectItem>
                    <SelectItem value="habilitada">Habilitadas</SelectItem>
                    <SelectItem value="perdida">Perdidas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataInicio ? format(dataInicio, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataInicio}
                      onSelect={setDataInicio}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-foreground mb-2 block">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dataFim && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dataFim ? format(dataFim, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dataFim}
                      onSelect={setDataFim}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Botões para limpar filtros de data */}
            {(dataInicio || dataFim) && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDataInicio(undefined);
                    setDataFim(undefined);
                  }}
                >
                  Limpar Datas
                </Button>
              </div>
            )}
            
            {/* Filtros rápidos por botões */}
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filtroStatus === "todas" ? "default" : "outline"}
                onClick={() => setFiltroStatus("todas")}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filtroStatus === "pendente" ? "default" : "outline"}
                onClick={() => setFiltroStatus("pendente")}
                size="sm"
              >
                Pendentes
              </Button>
              <Button
                variant={filtroStatus === "em_andamento" ? "default" : "outline"}
                onClick={() => setFiltroStatus("em_andamento")}
                size="sm"
              >
                Em Andamento
              </Button>
              <Button
                variant={filtroStatus === "auditada" ? "default" : "outline"}
                onClick={() => setFiltroStatus("auditada")}
                size="sm"
              >
                Auditadas
              </Button>
              <Button
                variant={filtroStatus === "gerada" ? "default" : "outline"}
                onClick={() => setFiltroStatus("gerada")}
                size="sm"
              >
                Geradas
              </Button>
              <Button
                variant={filtroStatus === "aguardando_habilitacao" ? "default" : "outline"}
                onClick={() => setFiltroStatus("aguardando_habilitacao")}
                size="sm"
              >
                Aguardando Habilitação
              </Button>
              <Button
                variant={filtroStatus === "habilitada" ? "default" : "outline"}
                onClick={() => setFiltroStatus("habilitada")}
                size="sm"
              >
                Habilitadas
              </Button>
              <Button
                variant={filtroStatus === "perdida" ? "default" : "outline"}
                onClick={() => setFiltroStatus("perdida")}
                size="sm"
              >
                Perdidas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Vendas */}
      <div className="space-y-4">
        {vendasFiltradas.length > 0 ? (
          vendasFiltradas.map((venda) => (
            <Card key={venda.id} className="bg-gradient-card shadow-card hover:shadow-card-hover transition-all">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
                  {/* Informações do Cliente */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        {venda.cliente.nome}
                      </h3>
                       <Badge 
                        variant={getStatusVariant(venda.status)}
                        className={venda.status === "habilitada" ? "bg-success text-success-foreground" : ""}
                      >
                        {getStatusLabel(venda.status)}
                      </Badge>
                    </div>
                    
                    {/* Vendedor e Equipe */}
                    {(venda.vendedorNome || venda.equipeNome) && (
                      <div className="flex flex-wrap gap-3 mb-2">
                        {venda.vendedorNome && (
                          <div className="flex items-center space-x-1">
                            <User className="h-4 w-4 text-primary" />
                            <span className="text-sm font-medium text-primary">
                              {venda.vendedorNome}
                            </span>
                          </div>
                        )}
                        {venda.equipeNome && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {venda.equipeNome}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{maskPhone(venda.cliente.telefone)}</span>
                      </div>
                      {venda.cliente.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{venda.cliente.email}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>Geração: {formatarData(venda.dataGeracao || venda.dataVenda)}</span>
                      </div>
                      <div className="flex items-center space-x-1 md:col-span-2">
                        <MapPin className="h-4 w-4" />
                        <span>
                          {venda.cliente.endereco.logradouro}, {venda.cliente.endereco.numero} - {venda.cliente.endereco.bairro}, {venda.cliente.endereco.localidade}/{venda.cliente.endereco.uf}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-col lg:flex-row gap-2 lg:items-center">
                    {/* Botão Ver Detalhes - Principal */}
                    <Button
                      variant="outline"
                      onClick={() => navigate(`/venda/${venda.id}`)}
                      className="lg:min-w-[140px]"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    
                     <StatusManager
                      venda={venda}
                      onStatusChange={(newStatus, extraData) => 
                        handleAtualizarStatus(venda.id, newStatus, extraData)
                      }
                      showLostOption={false}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="p-12 text-center">
              <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma venda encontrada
              </h3>
              <p className="text-muted-foreground">
              {filtroTexto || filtroStatus !== "todas" || filtroVendedor !== "todos" || filtroEquipe !== "todas" || dataInicio || dataFim
                ? "Tente ajustar os filtros ou cadastrar uma nova venda"
                : "Comece cadastrando sua primeira venda"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AcompanhamentoVendas;