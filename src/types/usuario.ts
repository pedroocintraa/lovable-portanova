/**
 * Tipos e interfaces para o sistema de usuários
 */

export enum FuncaoUsuario {
  ADMINISTRADOR_GERAL = "ADMINISTRADOR_GERAL",
  SUPERVISOR = "SUPERVISOR",
  SUPERVISOR_EQUIPE = "SUPERVISOR_EQUIPE",
  VENDEDOR = "VENDEDOR"
}

export interface Usuario {
  id: string;
  nome: string; // Sempre em caixa alta
  telefone: string;
  email: string;
  cpf: string;
  funcao: FuncaoUsuario;
  dataCadastro: string;
  ativo: boolean;
  equipeId?: string;
  supervisorEquipeId?: string;
  nomeEquipe?: string;
}

export interface UsuarioFormData extends Omit<Usuario, "id" | "dataCadastro" | "ativo"> {
  // Dados do formulário antes de ser processado
}

export interface PermissoesUsuario {
  podeAcessarDashboard: boolean;
  podeAcessarTodasVendas: boolean;
  podeAcessarApenasPropriaVendas: boolean;
  podeGerenciarUsuarios: boolean;
  podeEditarVendas: boolean;
  podeGerenciarEquipes: boolean;
  podeCriarSupervisorEquipe: boolean;
  podeCriarVendedor: boolean;
}