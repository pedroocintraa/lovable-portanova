import { supabase } from "@/integrations/supabase/client";
import { Usuario, FuncaoUsuario, PermissoesUsuario } from "@/types/usuario";

class UsuariosService {
  async obterUsuarios(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
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
      .select('*')
      .eq('id', id)
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
    const usuarioFormatado = {
      ...(usuario.nome && { nome: usuario.nome.toUpperCase() }),
      ...(usuario.telefone && { telefone: usuario.telefone }),
      ...(usuario.email && { email: usuario.email.toLowerCase() }),
      ...(usuario.cpf && { cpf: usuario.cpf }),
      ...(usuario.funcao && { funcao: usuario.funcao }),
      equipe_id: usuario.equipeId || null,
      supervisor_equipe_id: usuario.supervisorEquipeId || null
    };

    const { data, error } = await supabase
      .from('usuarios')
      .update(usuarioFormatado)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      throw new Error('Erro ao atualizar usuário: ' + error.message);
    }

    return this.converterParaUsuario(data);
  }

  async obterUsuariosInativos(): Promise<Usuario[]> {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('ativo', false)
      .order('nome');

    if (error) {
      console.error('Erro ao obter usuários inativos:', error);
      throw new Error('Erro ao carregar usuários inativos');
    }

    return (data || []).map(this.converterParaUsuario);
  }

  async desativarUsuario(id: string): Promise<boolean> {
    // Verificar se não é o último admin
    const usuarios = await this.obterUsuarios();
    const usuario = usuarios.find(u => u.id === id);
    
    if (usuario?.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL) {
      const admins = usuarios.filter(u => u.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL);
      if (admins.length <= 1) {
        throw new Error("Não é possível desativar o último administrador geral do sistema");
      }
    }

    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ ativo: false })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao desativar usuário:', updateError);
      throw new Error('Erro ao desativar usuário');
    }

    // Desativar também no Supabase Auth
    try {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: 'none',
        user_metadata: { banned: true }
      });

      if (authError) {
        console.warn('Aviso: Erro ao desativar usuário no Auth (usuário já desativado na tabela):', authError);
      }
    } catch (error) {
      console.warn('Aviso: Não foi possível desativar usuário no Auth:', error);
    }

    return true;
  }

  async reativarUsuario(id: string): Promise<boolean> {
    const { error: updateError } = await supabase
      .from('usuarios')
      .update({ ativo: true })
      .eq('id', id);

    if (updateError) {
      console.error('Erro ao reativar usuário:', updateError);
      throw new Error('Erro ao reativar usuário');
    }

    // Reativar também no Supabase Auth
    try {
      const { error: authError } = await supabase.auth.admin.updateUserById(id, {
        user_metadata: { banned: false }
      });

      if (authError) {
        console.warn('Aviso: Erro ao reativar usuário no Auth (usuário já reativado na tabela):', authError);
      }
    } catch (error) {
      console.warn('Aviso: Não foi possível reativar usuário no Auth:', error);
    }

    return true;
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

      // Verificar se existe no auth.users
      let existeNoAuth = false;
      try {
        const { data: authUser, error: getUserError } = await supabase.auth.admin.getUserById(id);
        existeNoAuth = !getUserError && !!authUser.user;
      } catch (error) {
        existeNoAuth = false;
      }

      const existeNaCRM = !!usuarioCRM;
      const consistente = existeNoAuth === existeNaCRM;

      return { consistente, existeNoAuth, existeNaCRM };
    } catch (error) {
      console.error('Erro ao verificar consistência:', error);
      return { consistente: false, existeNoAuth: false, existeNaCRM: false };
    }
  }

  async excluirUsuarioPermanentemente(id: string): Promise<boolean> {
    try {
      const usuario = await this.obterUsuarioPorId(id);
      if (!usuario) {
        throw new Error("Usuário não encontrado");
      }

      // 1. Verificar se é o último administrador geral
      if (usuario.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL) {
        const { data: admins } = await supabase
          .from('usuarios')
          .select('id')
          .eq('funcao', FuncaoUsuario.ADMINISTRADOR_GERAL)
          .eq('ativo', true);

        if (admins && admins.length <= 1) {
          throw new Error('Não é possível excluir o último administrador geral do sistema');
        }
      }

      // 2. Verificar se o usuário existe no Auth
      const consistencia = await this.verificarConsistenciaUsuario(id);
      
      // 3. Excluir do auth.users apenas se existir
      if (consistencia.existeNoAuth) {
        const { error: authError } = await supabase.auth.admin.deleteUser(id);
        if (authError) {
          console.error('Erro ao excluir do Supabase Auth:', authError);
          throw new Error('Erro ao excluir usuário do sistema de autenticação');
        }
        console.log(`Usuário ${usuario.nome} excluído do Supabase Auth`);
      } else {
        console.log(`Usuário ${usuario.nome} não existe no Supabase Auth (usuário órfão)`);
      }

      // 4. Excluir da tabela usuarios
      const { error: dbError } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('Erro ao excluir da tabela usuarios:', dbError);
        throw new Error('Erro ao excluir usuário do banco de dados');
      }

      console.log(`Usuário ${usuario.nome} excluído permanentemente com sucesso`);
      return true;
    } catch (error) {
      console.error('Erro ao excluir usuário permanentemente:', error);
      throw error;
    }
  }

  async sincronizarUsuarios(): Promise<{ removidos: number; erros: string[] }> {
    try {
      const { data: usuariosCRM } = await supabase
        .from('usuarios')
        .select('id, email, nome');

      if (!usuariosCRM) return { removidos: 0, erros: [] };

      let removidos = 0;
      const erros: string[] = [];

      for (const usuario of usuariosCRM) {
        try {
          const { data: authUser, error } = await supabase.auth.admin.getUserById(usuario.id);
          
          if (error || !authUser.user) {
            // Usuário não existe no Supabase Auth, remover do CRM
            const { error: deleteError } = await supabase
              .from('usuarios')
              .delete()
              .eq('id', usuario.id);

            if (deleteError) {
              erros.push(`Erro ao remover ${usuario.nome} (${usuario.email}): ${deleteError.message}`);
            } else {
              removidos++;
              console.log(`Usuário ${usuario.nome} removido por inconsistência`);
            }
          }
        } catch (error: any) {
          erros.push(`Erro ao verificar ${usuario.nome}: ${error.message}`);
        }
      }

      return { removidos, erros };
    } catch (error: any) {
      console.error('Erro na sincronização:', error);
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
      supervisorEquipeId: data.supervisor_equipe_id
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