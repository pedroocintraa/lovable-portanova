import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Venda } from "@/types/venda";
import { 
  Search, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar,
  Filter,
  Eye,
  Edit
} from "lucide-react";
import DocumentViewer from "@/components/DocumentViewer/DocumentViewer";

/**
 * Página de acompanhamento de vendas
 * Lista todas as vendas com filtros e ações de status
 */
const AcompanhamentoVendas = () => {
  const navigate = useNavigate();
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<Venda["status"] | "todas">("todas");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar vendas ao montar o componente
  useEffect(() => {
    const carregarVendas = async () => {
      try {
        const { storageService } = await import("@/services/storageService");
        const vendasCarregadas = await storageService.obterVendas();
        setVendas(vendasCarregadas);
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

    carregarVendas();
  }, [toast]);

  /**
   * Filtra vendas baseado no texto e status
   */
  const vendasFiltradas = useMemo(() => {
    return vendas.filter(venda => {
      const matchTexto = filtroTexto === "" || 
        venda.cliente.nome.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        venda.cliente.endereco.bairro.toLowerCase().includes(filtroTexto.toLowerCase()) ||
        venda.cliente.endereco.localidade.toLowerCase().includes(filtroTexto.toLowerCase());

      const matchStatus = filtroStatus === "todas" || venda.status === filtroStatus;

      return matchTexto && matchStatus;
    });
  }, [vendas, filtroTexto, filtroStatus]);

  /**
   * Atualiza status de uma venda
   */
  const handleAtualizarStatus = async (id: string, novoStatus: Venda["status"]) => {
    try {
      const { storageService } = await import("@/services/storageService");
      await storageService.atualizarStatusVenda(id, novoStatus);
      
      // Atualizar estado local
      setVendas(vendas.map(venda => 
        venda.id === id ? { ...venda, status: novoStatus } : venda
      ));

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
      gerada: "Gerada",
      em_andamento: "Em Andamento",
      aprovada: "Aprovada",
      perdida: "Perdida"
    };
    return labels[status];
  };

  /**
   * Retorna variante do badge baseado no status
   */
  const getStatusVariant = (status: Venda["status"]) => {
    switch (status) {
      case "gerada": return "secondary";
      case "em_andamento": return "default";
      case "aprovada": return "default"; // Will use success color via custom CSS
      case "perdida": return "destructive";
      default: return "secondary";
    }
  };

  /**
   * Formata data para exibição
   */
  const formatarData = (dataISO: string) => {
    return new Date(dataISO).toLocaleDateString("pt-BR");
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
          <div className="flex flex-col md:flex-row gap-4">
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
            <div className="flex gap-2">
              <Button
                variant={filtroStatus === "todas" ? "default" : "outline"}
                onClick={() => setFiltroStatus("todas")}
                size="sm"
              >
                Todas
              </Button>
              <Button
                variant={filtroStatus === "gerada" ? "default" : "outline"}
                onClick={() => setFiltroStatus("gerada")}
                size="sm"
              >
                Geradas
              </Button>
              <Button
                variant={filtroStatus === "em_andamento" ? "default" : "outline"}
                onClick={() => setFiltroStatus("em_andamento")}
                size="sm"
              >
                Em Andamento
              </Button>
              <Button
                variant={filtroStatus === "aprovada" ? "default" : "outline"}
                onClick={() => setFiltroStatus("aprovada")}
                size="sm"
              >
                Aprovadas
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
                        className={venda.status === "aprovada" ? "bg-success text-success-foreground" : ""}
                      >
                        {getStatusLabel(venda.status)}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center space-x-1">
                        <Phone className="h-4 w-4" />
                        <span>{venda.cliente.telefone}</span>
                      </div>
                      {venda.cliente.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{venda.cliente.email}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatarData(venda.dataVenda)}</span>
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
                      onClick={() => navigate(`/venda/${venda.id}`)}
                      className="lg:min-w-[140px]"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                    
                    <div className="flex flex-wrap gap-2">
                      {venda.status === "gerada" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAtualizarStatus(venda.id, "em_andamento")}
                        >
                          Iniciar Processo
                        </Button>
                      )}
                      
                      {venda.status === "em_andamento" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-success text-success hover:bg-success hover:text-success-foreground"
                            onClick={() => handleAtualizarStatus(venda.id, "aprovada")}
                          >
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAtualizarStatus(venda.id, "perdida")}
                          >
                            Marcar como Perdida
                          </Button>
                        </>
                      )}

                      {(venda.status === "aprovada" || venda.status === "perdida") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAtualizarStatus(venda.id, "em_andamento")}
                        >
                          Reprocessar
                        </Button>
                      )}
                    </div>
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
                {filtroTexto || filtroStatus !== "todas" 
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