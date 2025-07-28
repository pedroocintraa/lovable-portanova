/**
 * Tipos para configurações do sistema
 */

export interface Plano {
  id: string;
  nome: string;
  descricao?: string;
  valor?: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DataVencimento {
  id: string;
  dias: number;
  descricao: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlanoFormData extends Omit<Plano, "id" | "created_at" | "updated_at"> {}

export interface DataVencimentoFormData extends Omit<DataVencimento, "id" | "created_at" | "updated_at"> {}