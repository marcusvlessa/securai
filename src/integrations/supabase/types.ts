export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      ai_model_preferences: {
        Row: {
          auto_select: boolean
          content_type: string
          created_at: string
          id: string
          preferred_model: string
          priority_setting: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_select?: boolean
          content_type: string
          created_at?: string
          id?: string
          preferred_model: string
          priority_setting?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_select?: boolean
          content_type?: string
          created_at?: string
          id?: string
          preferred_model?: string
          priority_setting?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analysis_results: {
        Row: {
          analysis_type: string
          case_id: string
          confidence_score: number | null
          created_at: string
          error_message: string | null
          file_id: string | null
          id: string
          input_data: Json | null
          model_used: string
          processing_time: number | null
          result_data: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_type: string
          case_id: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          file_id?: string | null
          id?: string
          input_data?: Json | null
          model_used: string
          processing_time?: number | null
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_type?: string
          case_id?: string
          confidence_score?: number | null
          created_at?: string
          error_message?: string | null
          file_id?: string | null
          id?: string
          input_data?: Json | null
          model_used?: string
          processing_time?: number | null
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analysis_results_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          case_type: string
          created_at: string
          description: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_type?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_type?: string
          created_at?: string
          description?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      financial_metrics_cache: {
        Row: {
          avg_transaction_amount: number | null
          balance: number
          case_id: string
          created_at: string
          id: string
          last_calculated_at: string
          method_distribution: Json | null
          metrics_data: Json | null
          period_end: string
          period_start: string
          temporal_data: Json | null
          top_counterparties: Json | null
          total_credits: number
          total_debits: number
          transaction_count: number
          updated_at: string
        }
        Insert: {
          avg_transaction_amount?: number | null
          balance?: number
          case_id: string
          created_at?: string
          id?: string
          last_calculated_at?: string
          method_distribution?: Json | null
          metrics_data?: Json | null
          period_end: string
          period_start: string
          temporal_data?: Json | null
          top_counterparties?: Json | null
          total_credits?: number
          total_debits?: number
          transaction_count?: number
          updated_at?: string
        }
        Update: {
          avg_transaction_amount?: number | null
          balance?: number
          case_id?: string
          created_at?: string
          id?: string
          last_calculated_at?: string
          method_distribution?: Json | null
          metrics_data?: Json | null
          period_end?: string
          period_start?: string
          temporal_data?: Json | null
          top_counterparties?: Json | null
          total_credits?: number
          total_debits?: number
          transaction_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_metrics_cache_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_red_flags: {
        Row: {
          case_id: string
          created_at: string | null
          description: string
          evidence_count: number | null
          explanation: string | null
          id: string
          parameters: Json | null
          rule_id: string
          score: number | null
          severity: string
          transaction_ids: string[] | null
          type: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          description: string
          evidence_count?: number | null
          explanation?: string | null
          id?: string
          parameters?: Json | null
          rule_id: string
          score?: number | null
          severity: string
          transaction_ids?: string[] | null
          type: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          description?: string
          evidence_count?: number | null
          explanation?: string | null
          id?: string
          parameters?: Json | null
          rule_id?: string
          score?: number | null
          severity?: string
          transaction_ids?: string[] | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_red_flags_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          account: string | null
          agency: string | null
          amount: number
          bank: string | null
          case_id: string
          channel: string | null
          counterparty: string | null
          counterparty_document: string | null
          country: string | null
          created_at: string | null
          currency: string | null
          date: string
          description: string | null
          evidence_id: string | null
          holder_document: string | null
          id: string
          method: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account?: string | null
          agency?: string | null
          amount: number
          bank?: string | null
          case_id: string
          channel?: string | null
          counterparty?: string | null
          counterparty_document?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date: string
          description?: string | null
          evidence_id?: string | null
          holder_document?: string | null
          id?: string
          method?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account?: string | null
          agency?: string | null
          amount?: number
          bank?: string | null
          case_id?: string
          channel?: string | null
          counterparty?: string | null
          counterparty_document?: string | null
          country?: string | null
          created_at?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          evidence_id?: string | null
          holder_document?: string | null
          id?: string
          method?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      link_analysis_sessions: {
        Row: {
          analysis_summary: string | null
          case_id: string
          column_mapping: Json
          created_at: string
          file_id: string | null
          file_type: string
          graph_data: Json | null
          id: string
          links_count: number | null
          nodes_count: number | null
          session_name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_summary?: string | null
          case_id: string
          column_mapping?: Json
          created_at?: string
          file_id?: string | null
          file_type: string
          graph_data?: Json | null
          id?: string
          links_count?: number | null
          nodes_count?: number | null
          session_name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_summary?: string | null
          case_id?: string
          column_mapping?: Json
          created_at?: string
          file_id?: string | null
          file_type?: string
          graph_data?: Json | null
          id?: string
          links_count?: number | null
          nodes_count?: number | null
          session_name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_analysis_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_analysis_sessions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "uploaded_files"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          type: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          analysis_status: string
          case_id: string
          created_at: string
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id: string
          metadata: Json | null
          mime_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          analysis_status?: string
          case_id: string
          created_at?: string
          file_path: string
          file_size: number
          file_type: string
          filename: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          analysis_status?: string
          case_id?: string
          created_at?: string
          file_path?: string
          file_size?: number
          file_type?: string
          filename?: string
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          avatar_url: string | null
          badge_number: string | null
          created_at: string
          department: string | null
          email: string
          id: string
          last_login: string | null
          name: string | null
          organization_id: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          verification_documents: string[] | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          badge_number?: string | null
          created_at?: string
          department?: string | null
          email: string
          id?: string
          last_login?: string | null
          name?: string | null
          organization_id?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          verification_documents?: string[] | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          avatar_url?: string | null
          badge_number?: string | null
          created_at?: string
          department?: string | null
          email?: string
          id?: string
          last_login?: string | null
          name?: string | null
          organization_id?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          verification_documents?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_user_profiles: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          created_at: string
          id: string
          name: string
          organization_id: string
          status: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      initialize_first_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      log_security_event: {
        Args: { p_event_data?: Json; p_event_type: string; p_user_id?: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "investigator" | "analyst" | "delegado"
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
      app_role: ["admin", "investigator", "analyst", "delegado"],
    },
  },
} as const
