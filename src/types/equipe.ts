/**
 * Tipos e interfaces para o sistema de equipes
 */

export interface Equipe {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EquipeFormData extends Omit<Equipe, "id" | "created_at" | "updated_at" | "ativo"> {
  // Dados do formulário antes de ser processado
}

export interface EquipeComMembros extends Equipe {
  membros: number;
  supervisor?: string;
}