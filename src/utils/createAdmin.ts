import { supabase } from '@/integrations/supabase/client';

export const createAdminUser = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('create-admin');
    
    if (error) {
      console.error('Erro ao criar admin:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro na função createAdminUser:', error);
    return { success: false, error: 'Erro interno' };
  }
};