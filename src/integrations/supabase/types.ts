export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      clientes: {
        Row: {
          cpf: string
          created_at: string | null
          data_nascimento: string | null
          email: string | null
          endereco_id: string | null
          id: string
          nome: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco_id?: string | null
          id?: string
          nome: string
          telefone: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          data_nascimento?: string | null
          email?: string | null
          endereco_id?: string | null
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_endereco_id_fkey"
            columns: ["endereco_id"]
            isOneToOne: false
            referencedRelation: "enderecos"
            referencedColumns: ["id"]
          },
        ]
      }
      datas_vencimento: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string
          dias: number
          id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao: string
          dias: number
          id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string
          dias?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      documentos_venda: {
        Row: {
          data_upload: string | null
          id: string
          nome_arquivo: string
          storage_path: string
          tamanho: number
          tipo: Database["public"]["Enums"]["tipo_documento"]
          tipo_mime: string
          venda_id: string
        }
        Insert: {
          data_upload?: string | null
          id?: string
          nome_arquivo: string
          storage_path: string
          tamanho: number
          tipo: Database["public"]["Enums"]["tipo_documento"]
          tipo_mime: string
          venda_id: string
        }
        Update: {
          data_upload?: string | null
          id?: string
          nome_arquivo?: string
          storage_path?: string
          tamanho?: number
          tipo?: Database["public"]["Enums"]["tipo_documento"]
          tipo_mime?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_venda_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      enderecos: {
        Row: {
          bairro: string
          cep: string
          complemento: string | null
          created_at: string | null
          id: string
          localidade: string
          logradouro: string
          numero: string
          uf: string
        }
        Insert: {
          bairro: string
          cep: string
          complemento?: string | null
          created_at?: string | null
          id?: string
          localidade: string
          logradouro: string
          numero: string
          uf: string
        }
        Update: {
          bairro?: string
          cep?: string
          complemento?: string | null
          created_at?: string | null
          id?: string
          localidade?: string
          logradouro?: string
          numero?: string
          uf?: string
        }
        Relationships: []
      }
      historico_vendas: {
        Row: {
          data_alteracao: string | null
          id: string
          observacao: string | null
          status_anterior: Database["public"]["Enums"]["status_venda"] | null
          status_novo: Database["public"]["Enums"]["status_venda"]
          usuario_id: string
          venda_id: string
        }
        Insert: {
          data_alteracao?: string | null
          id?: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["status_venda"] | null
          status_novo: Database["public"]["Enums"]["status_venda"]
          usuario_id: string
          venda_id: string
        }
        Update: {
          data_alteracao?: string | null
          id?: string
          observacao?: string | null
          status_anterior?: Database["public"]["Enums"]["status_venda"] | null
          status_novo?: Database["public"]["Enums"]["status_venda"]
          usuario_id?: string
          venda_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_vendas_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historico_vendas_venda_id_fkey"
            columns: ["venda_id"]
            isOneToOne: false
            referencedRelation: "vendas"
            referencedColumns: ["id"]
          },
        ]
      }
      planos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          ativo: boolean | null
          cpf: string
          created_at: string | null
          data_cadastro: string | null
          email: string
          funcao: Database["public"]["Enums"]["funcao_usuario"]
          id: string
          nome: string
          telefone: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          created_at?: string | null
          data_cadastro?: string | null
          email: string
          funcao?: Database["public"]["Enums"]["funcao_usuario"]
          id?: string
          nome: string
          telefone: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          created_at?: string | null
          data_cadastro?: string | null
          email?: string
          funcao?: Database["public"]["Enums"]["funcao_usuario"]
          id?: string
          nome?: string
          telefone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      vendas: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_vencimento: string | null
          data_venda: string | null
          id: string
          observacoes: string | null
          plano_id: string | null
          status: Database["public"]["Enums"]["status_venda"] | null
          updated_at: string | null
          vendedor_id: string
          vendedor_nome: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_vencimento?: string | null
          data_venda?: string | null
          id?: string
          observacoes?: string | null
          plano_id?: string | null
          status?: Database["public"]["Enums"]["status_venda"] | null
          updated_at?: string | null
          vendedor_id: string
          vendedor_nome: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_vencimento?: string | null
          data_venda?: string | null
          id?: string
          observacoes?: string | null
          plano_id?: string | null
          status?: Database["public"]["Enums"]["status_venda"] | null
          updated_at?: string | null
          vendedor_id?: string
          vendedor_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendas_vendedor_id_fkey"
            columns: ["vendedor_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_funcao_usuario: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["funcao_usuario"]
      }
      get_user_company: {
        Args: { user_id?: string }
        Returns: string
      }
      get_usuario_atual: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_admin_or_supervisor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      funcao_usuario: "ADMINISTRADOR_GERAL" | "SUPERVISOR" | "VENDEDOR"
      status_venda: "gerada" | "em_andamento" | "aprovada" | "perdida"
      tipo_documento:
        | "documento_cliente_frente"
        | "documento_cliente_verso"
        | "comprovante_endereco"
        | "fachada_casa"
        | "selfie_cliente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      funcao_usuario: ["ADMINISTRADOR_GERAL", "SUPERVISOR", "VENDEDOR"],
      status_venda: ["gerada", "em_andamento", "aprovada", "perdida"],
      tipo_documento: [
        "documento_cliente_frente",
        "documento_cliente_verso",
        "comprovante_endereco",
        "fachada_casa",
        "selfie_cliente",
      ],
    },
  },
} as const
