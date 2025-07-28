import { Usuario, FuncaoUsuario, PermissoesUsuario } from "@/types/usuario";

class UserService {
  private readonly STORAGE_KEY = "crm_usuarios";
  private readonly CURRENT_USER_KEY = "crm_usuario_atual";

  constructor() {
    this.inicializarAdministradorPadrao();
  }

  private inicializarAdministradorPadrao() {
    const usuarios = this.obterUsuarios();
    const adminExiste = usuarios.some(u => u.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL);
    
    if (!adminExiste) {
      const adminPadrao: Usuario = {
        id: "admin-001",
        nome: "ADMINISTRADOR GERAL",
        telefone: "(11) 99999-9999",
        email: "admin@sistema.com",
        cpf: "000.000.000-00",
        funcao: FuncaoUsuario.ADMINISTRADOR_GERAL,
        dataCadastro: new Date().toISOString(),
        ativo: true
      };
      
      this.salvarUsuario(adminPadrao);
    }
  }

  salvarUsuario(usuario: Usuario): void {
    const usuarios = this.obterUsuarios();
    const index = usuarios.findIndex(u => u.id === usuario.id);
    
    // Garantir que o nome seja sempre em caixa alta
    usuario.nome = usuario.nome.toUpperCase();
    
    if (index >= 0) {
      usuarios[index] = usuario;
    } else {
      usuarios.push(usuario);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usuarios));
  }

  obterUsuarios(): Usuario[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  obterUsuarioPorId(id: string): Usuario | null {
    const usuarios = this.obterUsuarios();
    return usuarios.find(u => u.id === id) || null;
  }

  excluirUsuario(id: string): boolean {
    const usuarios = this.obterUsuarios();
    const usuario = usuarios.find(u => u.id === id);
    
    // Não permitir excluir o último administrador geral
    if (usuario?.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL) {
      const admins = usuarios.filter(u => u.funcao === FuncaoUsuario.ADMINISTRADOR_GERAL && u.ativo);
      if (admins.length <= 1) {
        throw new Error("Não é possível excluir o último administrador geral");
      }
    }
    
    const novosUsuarios = usuarios.filter(u => u.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(novosUsuarios));
    return true;
  }

  validarEmailUnico(email: string, usuarioId?: string): boolean {
    const usuarios = this.obterUsuarios();
    return !usuarios.some(u => u.email.toLowerCase() === email.toLowerCase() && u.id !== usuarioId);
  }

  validarCpfUnico(cpf: string, usuarioId?: string): boolean {
    const usuarios = this.obterUsuarios();
    return !usuarios.some(u => u.cpf === cpf && u.id !== usuarioId);
  }

  gerarId(): string {
    return `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Controle de sessão (simulado)
  definirUsuarioAtual(usuario: Usuario): void {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(usuario));
  }

  obterUsuarioAtual(): Usuario | null {
    const data = localStorage.getItem(this.CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  }

  logout(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  // Sistema de permissões
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

export const userService = new UserService();