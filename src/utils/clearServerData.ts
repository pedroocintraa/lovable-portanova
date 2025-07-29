/**
 * Utilitário para limpar dados do servidor (Supabase)
 * Execute esta função no console para limpar completamente os dados do sistema
 */

import { supabase } from "@/integrations/supabase/client";

/**
 * Limpa todos os dados do sistema (vendas, clientes, documentos)
 * Use apenas para demonstrações ou desenvolvimento
 */
export const limparDadosServidor = async (): Promise<void> => {
  try {
    console.log('🧹 Iniciando limpeza de dados do servidor...');
    
    // Verificar se é admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ Você precisa estar logado como administrador');
      return;
    }

    const confirmacao = confirm(
      '⚠️ ATENÇÃO: Esta ação irá DELETAR PERMANENTEMENTE todos os dados do sistema!\n\n' +
      '- Todas as vendas\n' +
      '- Todos os clientes\n' +
      '- Todos os documentos\n' +
      '- Todos os endereços\n\n' +
      'Esta ação não pode ser desfeita!'
    );
    
    if (!confirmacao) {
      console.log('❌ Limpeza cancelada pelo usuário');
      return;
    }
    
    // Executar limpeza em ordem (devido às foreign keys)
    console.log('🗑️ Removendo documentos de vendas...');
    await supabase.from('documentos_venda').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('🗑️ Removendo histórico de vendas...');
    await supabase.from('historico_vendas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('🗑️ Removendo vendas...');
    await supabase.from('vendas').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('🗑️ Removendo clientes...');
    await supabase.from('clientes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('🗑️ Removendo endereços...');
    await supabase.from('enderecos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    // Limpar storage bucket
    console.log('🗑️ Removendo arquivos do storage...');
    const { data: files } = await supabase.storage.from('documentos-vendas').list();
    if (files && files.length > 0) {
      const filePaths = files.map(file => file.name);
      await supabase.storage.from('documentos-vendas').remove(filePaths);
    }
    
    console.log('✅ Limpeza concluída com sucesso!');
    console.log('🔄 Recarregue a página para ver o sistema limpo');
    
    // Recarregar página automaticamente após 2 segundos
    setTimeout(() => {
      window.location.reload();
    }, 2000);
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
    alert('Erro durante a limpeza. Verifique o console para detalhes.');
  }
};

// Disponibilizar no window para uso no console
if (typeof window !== 'undefined') {
  (window as any).limparDadosServidor = limparDadosServidor;
}