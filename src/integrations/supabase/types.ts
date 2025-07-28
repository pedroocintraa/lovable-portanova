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
      equipes: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
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
          equipe_id: string | null
          funcao: Database["public"]["Enums"]["funcao_usuario"]
          id: string
          nome: string
          supervisor_equipe_id: string | null
          telefone: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cpf: string
          created_at?: string | null
          data_cadastro?: string | null
          email: string
          equipe_id?: string | null
          funcao?: Database["public"]["Enums"]["funcao_usuario"]
          id?: string
          nome: string
          supervisor_equipe_id?: string | null
          telefone: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cpf?: string
          created_at?: string | null
          data_cadastro?: string | null
          email?: string
          equipe_id?: string | null
          funcao?: Database["public"]["Enums"]["funcao_usuario"]
          id?: string
          nome?: string
          supervisor_equipe_id?: string | null
          telefone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_equipe_id_fkey"
            columns: ["equipe_id"]
            isOneToOne: false
            referencedRelation: "equipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_supervisor_equipe_id_fkey"
            columns: ["supervisor_equipe_id"]
            isOneToOne: false
            referencedRelation: "usuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_venda: string | null
          dia_vencimento: number | null
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
          data_venda?: string | null
          dia_vencimento?: number | null
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
          data_venda?: string | null
          dia_vencimento?: number | null
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
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      get_equipe_usuario_atual: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_funcao_usuario: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["funcao_usuario"]
      }
      get_funcao_usuario_atual: {
        Args: Record<PropertyKey, never>
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
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_admin_or_supervisor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      migrar_usuario_para_auth: {
        Args: { p_usuario_id: string; p_email: string; p_senha?: string }
        Returns: undefined
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
    }
    Enums: {
      funcao_usuario:
        | "ADMINISTRADOR_GERAL"
        | "SUPERVISOR"
        | "VENDEDOR"
        | "SUPERVISOR_EQUIPE"
      status_venda: "gerada" | "em_andamento" | "aprovada" | "perdida"
      tipo_documento:
        | "documento_cliente_frente"
        | "documento_cliente_verso"
        | "comprovante_endereco"
        | "fachada_casa"
        | "selfie_cliente"
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
      funcao_usuario: [
        "ADMINISTRADOR_GERAL",
        "SUPERVISOR",
        "VENDEDOR",
        "SUPERVISOR_EQUIPE",
      ],
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
