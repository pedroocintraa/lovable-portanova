import { supabase } from '@/integrations/supabase/client';

export const setupAdminUser = async () => {
  try {
    console.log('Executando Edge Function create-admin...');
    
    const { data, error } = await supabase.functions.invoke('create-admin');
    
    if (error) {
      console.error('Erro ao executar Edge Function:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Edge Function executada com sucesso:', data);
    return { success: true, data };
    
  } catch (error) {
    console.error('Erro na função setupAdminUser:', error);
    return { success: false, error: 'Erro interno' };
  }
};

// Executar automaticamente
setupAdminUser().then(result => {
  if (result.success) {
    console.log('✅ Usuário administrador configurado com sucesso!');
    console.log('📧 Email: pedroocintraa20@gmail.com');
    console.log('🔑 Senha: Trocar@123');
  } else {
    console.error('❌ Erro ao configurar usuário administrador:', result.error);
  }
});