/**
 * Tipos e interfaces para o sistema de vendas
 */

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  localidade: string;
  uf: string;
}

export interface Cliente {
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  endereco: Endereco;
}

export interface DocumentosVenda {
  documentoCliente?: File;
  fachadaCasa?: File;
}

export interface Venda {
  id: string;
  cliente: Cliente;
  documentos?: DocumentosVenda;
  status: "gerada" | "em_andamento" | "aprovada" | "perdida";
  dataVenda: string;
  observacoes?: string;
}

export interface VendaFormData extends Omit<Venda, "id" | "dataVenda" | "status"> {
  // Dados do formulário antes de ser processado
}