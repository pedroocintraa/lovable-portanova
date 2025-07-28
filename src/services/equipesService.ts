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
    try {
      // Primeiro, buscar todas as equipes
      const equipes = await this.obterEquipes();
      
      // Depois, buscar contagem de membros para cada equipe
      const equipesComMembros: EquipeComMembros[] = [];
      
      for (const equipe of equipes) {
        // Contar membros da equipe
        const { count: membros } = await supabase
          .from('usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('equipe_id', equipe.id)
          .eq('ativo', true);
        
        // Buscar supervisor da equipe
        const { data: supervisorData } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('supervisor_equipe_id', equipe.id)
          .eq('ativo', true)
          .maybeSingle();
        
        equipesComMembros.push({
          ...equipe,
          membros: membros || 0,
          supervisor: supervisorData?.nome
        });
      }
      
      return equipesComMembros;
    } catch (error) {
      console.error('Erro ao buscar equipes com membros:', error);
      // Fallback: retornar equipes sem informações de membros
      const equipes = await this.obterEquipes();
      return equipes.map(equipe => ({
        ...equipe,
        membros: 0,
        supervisor: undefined
      }));
    }
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
    // Verificar se há usuários ATIVOS na equipe
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('equipe_id', id)
      .eq('ativo', true);
    
    if (usuarios && usuarios.length > 0) {
      throw new Error('Não é possível excluir equipe com usuários ativos. Remova ou desative os usuários primeiro.');
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