import { Venda } from "@/types/venda";

/**
 * Utilitários para persistência de dados no localStorage
 * Gerencia vendas localmente até implementação do backend
 */

const VENDAS_KEY = "crm_vendas";

/**
 * Salva uma nova venda no localStorage
 */
export const salvarVenda = (venda: Venda): void => {
  try {
    const vendas = obterVendas();
    vendas.push(venda);
    localStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
  } catch (error) {
    console.error("Erro ao salvar venda:", error);
    throw new Error("Falha ao salvar venda");
  }
};

/**
 * Obtém todas as vendas do localStorage
 */
export const obterVendas = (): Venda[] => {
  try {
    const vendas = localStorage.getItem(VENDAS_KEY);
    return vendas ? JSON.parse(vendas) : [];
  } catch (error) {
    console.error("Erro ao carregar vendas:", error);
    return [];
  }
};

/**
 * Atualiza o status de uma venda
 */
export const atualizarStatusVenda = (id: string, novoStatus: Venda["status"]): void => {
  try {
    const vendas = obterVendas();
    const vendaIndex = vendas.findIndex(v => v.id === id);
    
    if (vendaIndex !== -1) {
      vendas[vendaIndex].status = novoStatus;
      localStorage.setItem(VENDAS_KEY, JSON.stringify(vendas));
    }
  } catch (error) {
    console.error("Erro ao atualizar status da venda:", error);
    throw new Error("Falha ao atualizar status");
  }
};

/**
 * Gera estatísticas das vendas para o dashboard
 */
export const obterEstatisticasVendas = () => {
  const vendas = obterVendas();
  
  const totalVendas = vendas.length;
  const vendasGeradas = vendas.filter(v => v.status === "gerada").length;
  const vendasEmAndamento = vendas.filter(v => v.status === "em_andamento").length;
  const vendasAprovadas = vendas.filter(v => v.status === "aprovada").length;
  const vendasPerdidas = vendas.filter(v => v.status === "perdida").length;

  // Vendas por bairro
  const vendasPorBairro = vendas.reduce((acc, venda) => {
    const bairro = venda.cliente.endereco.bairro;
    acc[bairro] = (acc[bairro] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Vendas por cidade
  const vendasPorCidade = vendas.reduce((acc, venda) => {
    const cidade = venda.cliente.endereco.localidade;
    acc[cidade] = (acc[cidade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalVendas,
    vendasGeradas,
    vendasEmAndamento,
    vendasAprovadas,
    vendasPerdidas,
    vendasPorBairro,
    vendasPorCidade,
    taxaConversao: totalVendas > 0 ? (vendasAprovadas / totalVendas) * 100 : 0
  };
};