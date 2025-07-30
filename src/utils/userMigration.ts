import { supabase } from '@/integrations/supabase/client';

export interface MigrationResult {
  success: boolean;
  total: number;
  migrados: number;
  ja_existiam: number;
  erros: string[];
  message?: string;
  error?: string;
}

export const migrateAllUsers = async (): Promise<MigrationResult> => {
  try {
    console.log('Iniciando migração de usuários...');
    
    const { data, error } = await supabase.functions.invoke('migrate-all-users');
    
    if (error) {
      console.error('Erro na migração:', error);
      throw error;
    }
    
    console.log('Migração concluída:', data);
    return data;
    
  } catch (error: any) {
    console.error('Erro ao executar migração:', error);
    return {
      success: false,
      total: 0,
      migrados: 0,
      ja_existiam: 0,
      erros: [error.message],
      error: error.message
    };
  }
};

export const forceClearAuthSession = () => {
  try {
    // Limpar localStorage
    localStorage.removeItem('sb-leyeltbhwuxssawmhqcb-auth-token');
    
    // Limpar todos os itens relacionados ao Supabase
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Limpar sessionStorage
    sessionStorage.clear();
    
    console.log('✅ Sessões de autenticação limpas');
    
    // Forçar reload da página
    window.location.reload();
  } catch (error) {
    console.error('Erro ao limpar sessões:', error);
  }
};