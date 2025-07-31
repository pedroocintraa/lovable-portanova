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

export interface DocumentoAnexado {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  dataUpload: string;
  conteudo: string; // base64 para persistência
}

export interface DocumentosVenda {
  documentoClienteFrente?: DocumentoAnexado[];
  documentoClienteVerso?: DocumentoAnexado[];
  comprovanteEndereco?: DocumentoAnexado[];
  fachadaCasa?: DocumentoAnexado[];
  selfieCliente?: DocumentoAnexado[];
}

export interface Venda {
  id: string;
  cliente: Cliente;
  documentos?: DocumentosVenda;
  status: "pendente" | "em_andamento" | "auditada" | "gerada" | "aguardando_habilitacao" | "habilitada" | "perdida";
  dataVenda: string;
  dataGeracao: string; // Data de geração da venda
  observacoes?: string;
  vendedorId?: string; // ID do usuário que criou a venda
  vendedorNome?: string; // Nome do vendedor (para facilitar exibição)
  equipeNome?: string; // Nome da equipe do vendedor
  equipeId?: string; // ID da equipe do vendedor
  planoId?: string; // ID do plano selecionado
  diaVencimento?: number; // Dia do vencimento (1-25)
  dataInstalacao?: string; // Data da instalação (ISO string)
  motivoPerda?: string; // Motivo quando marcada como perdida
}

export interface VendaFormData extends Omit<Venda, "id" | "dataVenda" | "status"> {
  // Dados do formulário antes de ser processado
}