import { supabase } from "@/integrations/supabase/client";
import { Equipe, EquipeFormData, EquipeComMembros } from "@/types/equipe";

class EquipesService {
  
  async obterEquipes(): Promise<Equipe[]> {
    const { data, error } = await supabase
      .from('equipes')
      .select('*')
      .eq('ativo', true)
      .order('nome');
    
    if (error) {
      console.error('Erro ao buscar equipes:', error);
      throw new Error('Erro ao carregar equipes');
    }
    
    return data || [];
  }

  async obterEquipesComMembros(): Promise<EquipeComMembros[]> {
    const { data: equipes, error: equipesError } = await supabase
      .from('equipes')
      .select(`
        *,
        usuarios!usuarios_equipe_id_fkey(count),
        supervisor:usuarios!usuarios_supervisor_equipe_id_fkey(nome)
      `)
      .eq('ativo', true)
      .order('nome');
    
    if (equipesError) {
      console.error('Erro ao buscar equipes com membros:', equipesError);
      throw new Error('Erro ao carregar equipes');
    }
    
    return (equipes || []).map(equipe => ({
      ...equipe,
      membros: equipe.usuarios?.length || 0,
      supervisor: equipe.supervisor?.[0]?.nome
    }));
  }

  async obterEquipePorId(id: string): Promise<Equipe | null> {
    const { data, error } = await supabase
      .from('equipes')
      .select('*')
      .eq('id', id)
      .eq('ativo', true)
      .maybeSingle();
    
    if (error) {
      console.error('Erro ao buscar equipe:', error);
      throw new Error('Erro ao carregar equipe');
    }
    
    return data;
  }

  async salvarEquipe(equipe: EquipeFormData): Promise<void> {
    const { error } = await supabase
      .from('equipes')
      .insert({
        nome: equipe.nome.toUpperCase(),
        descricao: equipe.descricao
      });
    
    if (error) {
      console.error('Erro ao salvar equipe:', error);
      throw new Error('Erro ao salvar equipe');
    }
  }

  async atualizarEquipe(id: string, equipe: EquipeFormData): Promise<void> {
    const { error } = await supabase
      .from('equipes')
      .update({
        nome: equipe.nome.toUpperCase(),
        descricao: equipe.descricao
      })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao atualizar equipe:', error);
      throw new Error('Erro ao atualizar equipe');
    }
  }

  async excluirEquipe(id: string): Promise<boolean> {
    // Verificar se há usuários na equipe
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('equipe_id', id);
    
    if (usuarios && usuarios.length > 0) {
      throw new Error('Não é possível excluir equipe com usuários ativos');
    }

    const { error } = await supabase
      .from('equipes')
      .update({ ativo: false })
      .eq('id', id);
    
    if (error) {
      console.error('Erro ao excluir equipe:', error);
      throw new Error('Erro ao excluir equipe');
    }
    
    return true;
  }

  async atribuirSupervisor(equipeId: string, supervisorId: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ supervisor_equipe_id: supervisorId })
      .eq('equipe_id', equipeId);
    
    if (error) {
      console.error('Erro ao atribuir supervisor:', error);
      throw new Error('Erro ao atribuir supervisor');
    }
  }

  validarNomeUnico(nome: string, equipeId?: string): Promise<boolean> {
    // Esta validação será feita no cliente por simplicidade
    // Em um ambiente de produção, seria melhor fazer no servidor
    return this.obterEquipes().then(equipes => {
      const nomeUpper = nome.toUpperCase();
      return !equipes.some(e => e.nome === nomeUpper && e.id !== equipeId);
    });
  }
}

export const equipesService = new EquipesService();