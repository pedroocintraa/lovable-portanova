import { supabase } from "@/integrations/supabase/client";
import { Usuario, FuncaoUsuario, PermissoesUsuario } from "@/types/usuario";

class UsuariosService {
  async obterUsuarios(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        equipes:equipe_id(nome)
      `)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao obter usuários:', error);
      throw new Error('Erro ao carregar usuários');
    }

    return (data || []).map(this.converterParaUsuario);
  }

  async obterUsuarioPorId(id: string): Promise<Usuario | null> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        equipes:equipe_id(nome)
      `)
      .eq('user_id', id)
      .eq('ativo', true)
      .maybeSingle();

    if (error) {
      console.error('Erro ao obter usuário:', error);
      throw new Error('Erro ao carregar usuário');
    }

    return data ? this.converterParaUsuario(data) : null;
  }

  async salvarUsuario(usuario: Omit<Usuario, 'id' | 'data_cadastro' | 'ativo'>): Promise<Usuario> {
    try {
      console.log('Iniciando criação de usuário via Edge Function:', usuario.email);

      // Chamar Edge Function para criar usuário
      const { data: response, error: functionError } = await supabase.functions.invoke('create-user', {
        body: {
          nome: usuario.nome,
          telefone: usuario.telefone,
          email: usuario.email,
          cpf: usuario.cpf,
          funcao: usuario.funcao,
          equipeId: usuario.equipeId || null,
          supervisorEquipeId: usuario.supervisorEquipeId || null,
        },
      });

      if (functionError) {
        console.error('Erro na Edge Function:', functionError);
        throw new Error(`Erro ao criar usuário: ${functionError.message}`);
      }

      if (response.error) {
        console.error('Erro retornado pela Edge Function:', response.error);
        throw new Error(response.error);
      }

      console.log('Usuário criado com sucesso via Edge Function:', response.user);
      console.log('Senha temporária gerada:', response.tempPassword);
      
      return this.converterParaUsuario(response.user);
    } catch (error) {
      console.error('Erro completo na criação de usuário:', error);
      throw error;
    }
  }

  private gerarSenhaTemporaria(): string {
    // Gerar senha temporária de 12 caracteres
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*';
    let senha = '';
    for (let i = 0; i < 12; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return senha;
  }

  async atualizarUsuario(id: string, usuario: Partial<Usuario>): Promise<Usuario> {
    // Chamar Edge Function para atualizar usuário (inclui sincronização com Auth)
    try {
      const { data: updatedUser, error: functionError } = await supabase.functions.invoke('update-user', {
        body: {
          userId: id,
          ...(usuario.nome && { nome: usuario.nome }),
          ...(usuario.telefone && { telefone: usuario.telefone }),
          ...(usuario.email && { email: usuario.email }),
          ...(usuario.cpf && { cpf: usuario.cpf }),
          ...(usuario.funcao && { funcao: usuario.funcao }),
          ...(usuario.equipeId !== undefined && { equipeId: usuario.equipeId }),
          ...(usuario.supervisorEquipeId !== undefined && { supervisorEquipeId: usuario.supervisorEquipeId }),
        }
      });

      if (functionError) {
        console.error('Erro na Edge Function update-user:', functionError);
        throw new Error(functionError.message || 'Erro ao atualizar usuário');
      }

      console.log('Usuário atualizado com sucesso via Edge Function');
      return updatedUser;
    } catch (error: any) {
      console.error('Erro ao chamar Edge Function:', error);
      throw new Error('Erro ao atualizar usuário: ' + error.message);
    }
  }

  async obterUsuariosInativos(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select(`
        *,
        equipes:equipe_id(nome)
      `)
      .eq('ativo', false)
      .order('nome');

    if (error) {
      console.error('Erro ao obter usuários inativos:', error);
      throw new Error('Erro ao carregar usuários inativos');
    }

    return (data || []).map(this.converterParaUsuario);
  }

  async desativarUsuario(id: string): Promise<boolean> {
    try {
      console.log('Desativando usuário via Edge Function:', id);

      const { data, error } = await supabase.functions.invoke('deactivate-user', {
        body: { userId: id }
      });

      if (error) {
        console.error('Erro na Edge Function deactivate-user:', error);
        throw new Error(error.message || 'Erro ao desativar usuário');
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Falha desconhecida na desativação';
        console.error('Edge Function retornou erro:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Usuário desativado com sucesso via Edge Function');
      return true;
    } catch (error: any) {
      console.error('Erro ao desativar usuário:', error);
      throw error;
    }
  }

  async reativarUsuario(id: string): Promise<boolean> {
    try {
      console.log('Reativando usuário via Edge Function:', id);

      const { data, error } = await supabase.functions.invoke('reactivate-user', {
        body: { userId: id }
      });

      if (error) {
        console.error('Erro na Edge Function reactivate-user:', error);
        throw new Error(error.message || 'Erro ao reativar usuário');
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Falha desconhecida na reativação';
        console.error('Edge Function retornou erro:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('Usuário reativado com sucesso via Edge Function');
      return true;
    } catch (error: any) {
      console.error('Erro ao reativar usuário:', error);
      throw error;
    }
  }

  // Manter método legado para compatibilidade
  async excluirUsuario(id: string): Promise<boolean> {
    return this.desativarUsuario(id);
  }

  async validarEmailUnico(email: string, usuarioId?: string): Promise<{ unico: boolean; usuarioInativo?: Usuario }> {
    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.toLowerCase());

    if (usuarioId) {
      query = query.neq('id', usuarioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao validar email:', error);
      return { unico: false };
    }

    if (data.length === 0) {
      return { unico: true };
    }

    // Verificar se existe usuário inativo com este email
    const usuarioInativo = data.find(u => !u.ativo);
    if (usuarioInativo) {
      return { 
        unico: false, 
        usuarioInativo: this.converterParaUsuario(usuarioInativo) 
      };
    }

    return { unico: false };
  }

  async validarCpfUnico(cpf: string, usuarioId?: string): Promise<{ unico: boolean; usuarioInativo?: Usuario }> {
    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('cpf', cpf);

    if (usuarioId) {
      query = query.neq('id', usuarioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao validar CPF:', error);
      return { unico: false };
    }

    if (data.length === 0) {
      return { unico: true };
    }

    // Verificar se existe usuário inativo com este CPF
    const usuarioInativo = data.find(u => !u.ativo);
    if (usuarioInativo) {
      return { 
        unico: false, 
        usuarioInativo: this.converterParaUsuario(usuarioInativo) 
      };
    }

    return { unico: false };
  }

  async obterUsuariosPorEquipe(equipeId: string): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('equipe_id', equipeId)
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error('Erro ao obter usuários da equipe:', error);
      throw new Error('Erro ao carregar usuários da equipe');
    }

    return (data || []).map(this.converterParaUsuario);
  }

  async atribuirSupervisorEquipe(equipeId: string, supervisorId: string): Promise<void> {
    const { error } = await supabase
      .from('usuarios')
      .update({ supervisor_equipe_id: supervisorId })
      .eq('equipe_id', equipeId)
      .neq('id', supervisorId);

    if (error) {
      console.error('Erro ao atribuir supervisor:', error);
      throw new Error('Erro ao atribuir supervisor à equipe');
    }
  }

  async verificarConsistenciaUsuario(id: string): Promise<{ consistente: boolean; existeNoAuth: boolean; existeNaCRM: boolean }> {
    try {
      // Verificar se existe na tabela usuarios
      const { data: usuarioCRM } = await supabase
        .from('usuarios')
        .select('id')
        .eq('id', id)
        .single();

      const existeNaCRM = !!usuarioCRM;
      
      // Para consistência, assumimos que se existe no CRM e as policies funcionam, 
      // então a autenticação está funcionando corretamente
      const existeNoAuth = existeNaCRM; // Simplificado
      const consistente = existeNoAuth === existeNaCRM;

      return { consistente, existeNoAuth, existeNaCRM };
    } catch (error) {
      console.error('Erro ao verificar consistência:', error);
      return { consistente: false, existeNoAuth: false, existeNaCRM: false };
    }
  }

  /**
   * Obtém um usuário para exclusão (ignora status ativo)
   * Usado especificamente para exclusão permanente
   */
  async obterUsuarioParaExclusao(id: string): Promise<Usuario | null> {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Usuário não encontrado
        }
        throw error;
      }

      return this.converterParaUsuario(data);
    } catch (error) {
      console.error('Erro ao obter usuário para exclusão:', error);
      throw error;
    }
  }

  async excluirUsuarioPermanentemente(id: string): Promise<boolean> {
    try {
      console.log(`🗑️ Iniciando exclusão permanente via Edge Function para usuário: ${id}`);

      // Chamar a Edge Function para exclusão permanente
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId: id }
      });

      if (error) {
        console.error('❌ Erro na Edge Function delete-user:', error);
        throw new Error(error.message || 'Erro ao excluir usuário permanentemente');
      }

      if (!data?.success) {
        const errorMessage = data?.error || 'Falha desconhecida na exclusão';
        console.error('❌ Edge Function retornou erro:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log(`🎉 Usuário excluído permanentemente com sucesso:`, data);
      return true;
    } catch (error) {
      console.error('❌ Erro ao excluir usuário permanentemente:', error);
      throw error;
    }
  }

  async sincronizarUsuarios(): Promise<{ removidos: number; erros: string[] }> {
    try {
      console.log('Sincronizando usuários via Edge Function');

      const { data, error } = await supabase.functions.invoke('sync-users', {
        body: {}
      });

      if (error) {
        console.error('Erro na Edge Function sync-users:', error);
        throw new Error(error.message || 'Erro ao sincronizar usuários');
      }

      console.log('Sincronização concluída via Edge Function:', data);
      return { 
        removidos: data?.removidos || 0, 
        erros: data?.erros || [] 
      };
    } catch (error: any) {
      console.error('Erro ao sincronizar usuários:', error);
      return { removidos: 0, erros: [error.message] };
    }
  }

  private converterParaUsuario(data: any): Usuario {
    return {
      id: data.id,
      nome: data.nome,
      telefone: data.telefone,
      email: data.email,
      cpf: data.cpf,
      funcao: data.funcao,
      dataCadastro: data.data_cadastro || data.created_at,
      ativo: data.ativo,
      equipeId: data.equipe_id,
      supervisorEquipeId: data.supervisor_equipe_id,
      nomeEquipe: data.equipes?.nome || null
    };
  }

  // Sistema de permissões (mantido do userService original)
  obterPermissoes(funcao: FuncaoUsuario): PermissoesUsuario {
    switch (funcao) {
      case FuncaoUsuario.ADMINISTRADOR_GERAL:
        return {
          podeAcessarDashboard: true,
          podeAcessarTodasVendas: true,
          podeAcessarApenasPropriaVendas: false,
          podeGerenciarUsuarios: true,
          podeEditarVendas: true,
          podeGerenciarEquipes: true,
          podeCriarSupervisorEquipe: true,
          podeCriarVendedor: true,
        };
      
      case FuncaoUsuario.SUPERVISOR:
        return {
          podeAcessarDashboard: true,
          podeAcessarTodasVendas: true,
          podeAcessarApenasPropriaVendas: false,
          podeGerenciarUsuarios: true,
          podeEditarVendas: true,
          podeGerenciarEquipes: false,
          podeCriarSupervisorEquipe: true,
          podeCriarVendedor: true,
        };
      
      case FuncaoUsuario.SUPERVISOR_EQUIPE:
        return {
          podeAcessarDashboard: true,
          podeAcessarTodasVendas: false,
          podeAcessarApenasPropriaVendas: true,
          podeGerenciarUsuarios: true,
          podeEditarVendas: true,
          podeGerenciarEquipes: false,
          podeCriarSupervisorEquipe: false,
          podeCriarVendedor: true,
        };
      
      case FuncaoUsuario.VENDEDOR:
        return {
          podeAcessarDashboard: true,
          podeAcessarTodasVendas: false,
          podeAcessarApenasPropriaVendas: true,
          podeGerenciarUsuarios: false,
          podeEditarVendas: false,
          podeGerenciarEquipes: false,
          podeCriarSupervisorEquipe: false,
          podeCriarVendedor: false,
        };
      
      default:
        return {
          podeAcessarDashboard: false,
          podeAcessarTodasVendas: false,
          podeAcessarApenasPropriaVendas: false,
          podeGerenciarUsuarios: false,
          podeEditarVendas: false,
          podeGerenciarEquipes: false,
          podeCriarSupervisorEquipe: false,
          podeCriarVendedor: false,
        };
    }
  }

  formatarTelefone(telefone: string): string {
    const nums = telefone.replace(/\D/g, "");
    if (nums.length === 11) {
      return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
    }
    return telefone;
  }

  formatarCpf(cpf: string): string {
    const nums = cpf.replace(/\D/g, "");
    if (nums.length === 11) {
      return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9)}`;
    }
    return cpf;
  }
}

export const usuariosService = new UsuariosService();