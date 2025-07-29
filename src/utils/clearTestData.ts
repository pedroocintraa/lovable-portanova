/**
 * Utilitário para limpar dados de teste do sistema
 * Execute esta função no console para limpar completamente o storage local
 */

import { storageService } from "@/services/storageService";

/**
 * Limpa todos os dados de teste do localStorage e IndexedDB
 * Use quando precisar limpar o sistema para demonstrações ou testes
 */
export const limparDadosTeste = async (): Promise<void> => {
  try {
    console.log('🧹 Iniciando limpeza de dados de teste...');
    
    // Confirmar com o usuário
    const confirmacao = confirm(
      'Tem certeza que deseja limpar TODOS os dados de teste?\n\n' +
      'Esta ação irá remover:\n' +
      '• Todas as vendas salvas\n' +
      '• Todos os documentos anexados\n' +
      '• Histórico de alterações\n\n' +
      'Esta ação não pode ser desfeita!'
    );
    
    if (!confirmacao) {
      console.log('❌ Limpeza cancelada pelo usuário');
      return;
    }
    
    // Executar limpeza
    await storageService.limparStorageCompleto();
    
    console.log('✅ Limpeza concluída com sucesso!');
    console.log('🔄 Recarregue a página para ver o sistema limpo');
    
    // Recarregar página automaticamente após 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    alert('Erro ao limpar dados de teste. Verifique o console para detalhes.');
  }
};

// Função para uso direto no console do navegador
(window as any).limparDadosTeste = limparDadosTeste;

console.log('🔧 Utilitário de limpeza carregado!');
console.log('📝 Para limpar todos os dados de teste, execute: limparDadosTeste()');