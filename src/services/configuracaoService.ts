import { supabase } from "@/integrations/supabase/client";
import type { Plano, PlanoFormData } from "@/types/configuracao";

export class ConfiguracaoService {
  // Planos
  async obterPlanos(): Promise<Plano[]> {
    const { data, error } = await supabase
      .from('planos')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    return data || [];
  }

  async obterPlanosAtivos(): Promise<Plano[]> {
    const { data, error } = await supabase
      .from('planos')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    
    if (error) throw error;
    return data || [];
  }

  async criarPlano(plano: PlanoFormData): Promise<Plano> {
    const { data, error } = await supabase
      .from('planos')
      .insert(plano)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async atualizarPlano(id: string, plano: Partial<PlanoFormData>): Promise<Plano> {
    const { data, error } = await supabase
      .from('planos')
      .update(plano)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async excluirPlano(id: string): Promise<void> {
    const { error } = await supabase
      .from('planos')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const configuracaoService = new ConfiguracaoService();