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
      // Validar unicidade antes de inserir
      const emailExiste = await this.validarEmailUnico(usuario.email);
      if (!emailExiste) {
        throw new Error('Este email já está sendo utilizado por outro usuário.');
      }

      const cpfExiste = await this.validarCpfUnico(usuario.cpf);
      if (!cpfExiste) {
        throw new Error('Este CPF já está sendo utilizado por outro usuário.');
      }

      console.log('Iniciando criação de usuário com Supabase Auth');

      // Etapa 1: Criar usuário no Supabase Auth
      const senhaTemporaria = this.gerarSenhaTemporaria();
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: usuario.email.toLowerCase(),
        password: senhaTemporaria,
        email_confirm: true,
        user_metadata: {
          nome: usuario.nome.toUpperCase(),
          funcao: usuario.funcao
        }
      });

      if (authError) {
        console.error('Erro ao criar usuário no Auth:', authError);
        if (authError.message.includes('email address is already in use')) {
          throw new Error('Este email já está sendo utilizado por outro usuário.');
        }
        throw new Error(`Erro ao criar usuário: ${authError.message}`);
      }

      console.log('Usuário criado no Auth:', authUser.user?.id);

      // Etapa 2: Inserir dados complementares na tabela usuarios
      const usuarioFormatado = {
        id: authUser.user!.id, // Usar o mesmo ID do auth.users
        nome: usuario.nome.toUpperCase(),
        telefone: usuario.telefone,
        email: usuario.email.toLowerCase(),
        cpf: usuario.cpf,
        funcao: usuario.funcao,
        equipe_id: usuario.equipeId || null,
        supervisor_equipe_id: usuario.supervisorEquipeId || null
      };

      console.log('Salvando dados complementares do usuário:', usuarioFormatado);

      const { data, error } = await supabase
        .from('usuarios')
        .insert([usuarioFormatado])
        .select()
        .single();

      if (error) {
        console.error('Erro ao salvar dados complementares:', error);
        
        // Se falhar ao salvar na tabela usuarios, limpar o usuário do auth
        try {
          await supabase.auth.admin.deleteUser(authUser.user!.id);
          console.log('Usuário removido do auth devido ao erro');
        } catch (cleanupError) {
          console.error('Erro ao limpar usuário do auth:', cleanupError);
        }
        
        // Tratar erros específicos
        if (error.code === '23505') {
          if (error.message.includes('usuarios_email_key')) {
            throw new Error('Este email já está sendo utilizado por outro usuário.');
          }
          if (error.message.includes('usuarios_cpf_key')) {
            throw new Error('Este CPF já está sendo utilizado por outro usuário.');
          }
          throw new Error('Já existe um usuário com estes dados.');
        }
        
        throw new Error(`Erro ao salvar dados do usuário: ${error.message}`);
      }

      console.log('Usuário criado com sucesso! ID:', data.id, 'Email será enviado automaticamente');
      return this.converterParaUsuario(data);
    } catch (error) {
      console.error('Erro no serviço de usuários:', error);
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

  async validarEmailUnico(email: string, usuarioId?: string): Promise<boolean> {
    let query = supabase
      .from('usuarios')
      .select('id')
      .eq('email', email.toLowerCase())
      .eq('ativo', true);

    if (usuarioId) {
      query = query.neq('id', usuarioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao validar email:', error);
      return false;
    }

    return data.length === 0;
  }

  async validarCpfUnico(cpf: string, usuarioId?: string): Promise<boolean> {
    let query = supabase
      .from('usuarios')
      .select('id')
      .eq('cpf', cpf)
      .eq('ativo', true);

    if (usuarioId) {
      query = query.neq('id', usuarioId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao validar CPF:', error);
      return false;
    }

    return data.length === 0;
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