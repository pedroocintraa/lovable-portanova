import { supabase } from "@/integrations/supabase/client";
import type { Plano, DataVencimento, PlanoFormData, DataVencimentoFormData } from "@/types/configuracao";

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

  // Datas de Vencimento
  async obterDatasVencimento(): Promise<DataVencimento[]> {
    const { data, error } = await supabase
      .from('datas_vencimento')
      .select('*')
      .order('dias');
    
    if (error) throw error;
    return data || [];
  }

  async obterDatasVencimentoAtivas(): Promise<DataVencimento[]> {
    const { data, error } = await supabase
      .from('datas_vencimento')
      .select('*')
      .eq('ativo', true)
      .order('dias');
    
    if (error) throw error;
    return data || [];
  }

  async criarDataVencimento(dataVencimento: DataVencimentoFormData): Promise<DataVencimento> {
    const { data, error } = await supabase
      .from('datas_vencimento')
      .insert(dataVencimento)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async atualizarDataVencimento(id: string, dataVencimento: Partial<DataVencimentoFormData>): Promise<DataVencimento> {
    const { data, error } = await supabase
      .from('datas_vencimento')
      .update(dataVencimento)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async excluirDataVencimento(id: string): Promise<void> {
    const { error } = await supabase
      .from('datas_vencimento')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) throw error;
  }
}

export const configuracaoService = new ConfiguracaoService();