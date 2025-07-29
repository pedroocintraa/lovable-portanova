import { useMemo, useState, useEffect } from "react";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabaseService } from "@/services/supabaseService";
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  XCircle,
  MapPin,
  Building,
  Award,
  Target
} from "lucide-react";

/**
 * Dashboard com visões específicas por função:
 * - ADMINISTRADOR_GERAL & SUPERVISOR: Acesso total
 * - SUPERVISOR_EQUIPE: Apenas dados da sua equipe
 * - VENDEDOR: Apenas suas vendas pessoais
 */
const DashboardByRole = () => {
  const [estatisticas, setEstatisticas] = useState<any>(null);
  const { usuario } = useAuth();

  useEffect(() => {
    const carregarEstatisticas = async () => {
      try {
        // O RLS no Supabase já aplica as regras de acesso automaticamente
        const stats = await supabaseService.obterEstatisticasVendas();
        setEstatisticas(stats);
        console.log('📊 Estatísticas carregadas (filtradas por RLS):', stats);
      } catch (error) {
        console.error("Erro ao carregar estatísticas:", error);
      }
    };

    if (usuario) {
      carregarEstatisticas();
    }
  }, [usuario]);

  // Calcular rankings apenas para funções que têm acesso aos dados
  const temAcessoCompleto = usuario?.funcao === "ADMINISTRADOR_GERAL" || usuario?.funcao === "SUPERVISOR";
  const temAcessoEquipe = usuario?.funcao === "SUPERVISOR_EQUIPE";
  const isVendedor = usuario?.funcao === "VENDEDOR";

  // Top rankings (apenas para quem tem acesso)
  const topBairros = estatisticas && (temAcessoCompleto || temAcessoEquipe) 
    ? Object.entries(estatisticas.vendasPorBairro)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5) 
    : [];

  const topCidades = estatisticas && (temAcessoCompleto || temAcessoEquipe)
    ? Object.entries(estatisticas.vendasPorCidade)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5) 
    : [];

  const topVendedores = estatisticas && temAcessoCompleto 
    ? Object.entries(estatisticas.vendasPorVendedor)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 5) 
    : [];

  const topEquipes = estatisticas && temAcessoCompleto 
    ? Object.entries(estatisticas.vendasPorEquipe || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 3) 
    : [];

  if (!estatisticas || !usuario) return <div>Carregando dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Header dinâmico por função */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">
          {isVendedor && "Suas vendas e métricas pessoais"}
          {temAcessoEquipe && "Vendas e métricas da sua equipe"}
          {temAcessoCompleto && "Visão geral completa das vendas e métricas"}
        </p>
      </div>

      {/* Métricas Principais - visíveis para todos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title={isVendedor ? "Minhas Vendas" : temAcessoEquipe ? "Vendas da Equipe" : "Total de Vendas"}
          value={estatisticas.totalVendas}
          icon={TrendingUp}
          change={`${estatisticas.vendasGeradas} geradas`}
          changeType="positive"
        />
        
        <MetricCard
          title="Vendas Geradas"
          value={estatisticas.vendasGeradas}
          icon={Users}
          change="Aguardando processamento"
          changeType="neutral"
        />
        
        <MetricCard
          title="Vendas Aprovadas"
          value={estatisticas.vendasHabilitadas}
          icon={CheckCircle}
          change={`${estatisticas.taxaConversao.toFixed(1)}% de conversão`}
          changeType="positive"
        />
        
        <MetricCard
          title="Vendas Perdidas"
          value={estatisticas.vendasPerdidas}
          icon={XCircle}
          change="Analisar motivos"
          changeType="negative"
        />
      </div>

      {/* Análises para Administradores e Supervisores */}
      {temAcessoCompleto && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Vendedores */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Award className="h-5 w-5 text-primary" />
                <span>Top Vendedores</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topVendedores.length > 0 ? (
                  topVendedores.map(([vendedor, quantidade], index) => (
                    <div key={vendedor} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/10 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium text-foreground">{vendedor}</span>
                      </div>
                       <span className="text-sm font-semibold text-primary">
                         {quantidade as number} vendas
                       </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma venda registrada ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Equipes */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-success" />
                <span>Top Equipes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topEquipes.length > 0 ? (
                  topEquipes.map(([equipe, quantidade], index) => (
                    <div key={equipe} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-success/10 text-success rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium text-foreground">{equipe}</span>
                      </div>
                       <span className="text-sm font-semibold text-success">
                         {quantidade as number} vendas
                       </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma equipe com vendas ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Análises por Localização - para Admins, Supervisores e Supervisores de Equipe */}
      {(temAcessoCompleto || temAcessoEquipe) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Bairros */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-primary" />
                <span>Top Bairros {temAcessoEquipe ? "(da sua equipe)" : ""}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topBairros.length > 0 ? (
                  topBairros.map(([bairro, quantidade], index) => (
                    <div key={bairro} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-warning/10 text-warning rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium text-foreground">{bairro}</span>
                      </div>
                       <span className="text-sm font-semibold text-warning">
                         {quantidade as number} vendas
                       </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma venda registrada ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Cidades */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building className="h-5 w-5 text-secondary" />
                <span>Top Cidades {temAcessoEquipe ? "(da sua equipe)" : ""}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCidades.length > 0 ? (
                  topCidades.map(([cidade, quantidade], index) => (
                    <div key={cidade} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-secondary/10 text-secondary rounded-full w-6 h-6 flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <span className="font-medium text-foreground">{cidade}</span>
                      </div>
                       <span className="text-sm font-semibold text-secondary">
                         {quantidade as number} vendas
                       </span>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhuma venda registrada ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Status das Vendas - visível para todos */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>
            Distribuição por Status 
            {isVendedor && " (suas vendas)"}
            {temAcessoEquipe && " (da sua equipe)"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-muted-foreground">
                {estatisticas.vendasPendentes}
              </div>
              <div className="text-sm text-muted-foreground">Pendentes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {estatisticas.vendasEmAndamento}
              </div>
              <div className="text-sm text-muted-foreground">Em Andamento</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-secondary">
                {estatisticas.vendasAuditadas}
              </div>
              <div className="text-sm text-muted-foreground">Auditadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning">
                {estatisticas.vendasGeradas}
              </div>
              <div className="text-sm text-muted-foreground">Geradas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {estatisticas.vendasAguardandoHabilitacao}
              </div>
              <div className="text-sm text-muted-foreground">Aguard. Hab.</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {estatisticas.vendasHabilitadas}
              </div>
              <div className="text-sm text-muted-foreground">Habilitadas</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {estatisticas.vendasPerdidas}
              </div>
              <div className="text-sm text-muted-foreground">Perdidas</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardByRole;