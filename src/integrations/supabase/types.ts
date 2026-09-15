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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_runs: {
        Row: {
          case_id: string | null
          confidence: number | null
          created_at: string
          duration_ms: number
          error_code: string | null
          gateway_run_id: string | null
          id: string
          input_hash: string
          model: string
          output: Json
          policy_version: string
          prompt_version: string
          purpose: string
          review_record_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          confidence?: number | null
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          gateway_run_id?: string | null
          id?: string
          input_hash: string
          model: string
          output?: Json
          policy_version: string
          prompt_version: string
          purpose: string
          review_record_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          confidence?: number | null
          created_at?: string
          duration_ms?: number
          error_code?: string | null
          gateway_run_id?: string | null
          id?: string
          input_hash?: string
          model?: string
          output?: Json
          policy_version?: string
          prompt_version?: string
          purpose?: string
          review_record_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_runs_review_record_id_fkey"
            columns: ["review_record_id"]
            isOneToOne: false
            referencedRelation: "review_records"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_id: string
          author_name: string
          body: string
          cover_image_url: string
          created_at: string
          description: string
          id: string
          published: boolean
          published_at: string | null
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          author_name?: string
          body?: string
          cover_image_url?: string
          created_at?: string
          description?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          author_name?: string
          body?: string
          cover_image_url?: string
          created_at?: string
          description?: string
          id?: string
          published?: boolean
          published_at?: string | null
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      bulk_job_items: {
        Row: {
          attempt_count: number
          business_name: string | null
          canonical_source_url: string
          case_id: string | null
          completed_at: string | null
          created_at: string
          detail: string
          error_code: string | null
          id: string
          job_id: string
          lease_expires_at: string | null
          lease_token: string | null
          review_record_id: string | null
          source_kind: string
          source_url: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attempt_count?: number
          business_name?: string | null
          canonical_source_url: string
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          detail?: string
          error_code?: string | null
          id?: string
          job_id: string
          lease_expires_at?: string | null
          lease_token?: string | null
          review_record_id?: string | null
          source_kind?: string
          source_url: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attempt_count?: number
          business_name?: string | null
          canonical_source_url?: string
          case_id?: string | null
          completed_at?: string | null
          created_at?: string
          detail?: string
          error_code?: string | null
          id?: string
          job_id?: string
          lease_expires_at?: string | null
          lease_token?: string | null
          review_record_id?: string | null
          source_kind?: string
          source_url?: string
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_job_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "bulk_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bulk_job_items_review_record_id_fkey"
            columns: ["review_record_id"]
            isOneToOne: false
            referencedRelation: "review_records"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_jobs: {
        Row: {
          analyzing_count: number
          completed_at: string | null
          created_at: string
          discovering_count: number
          failed_count: number
          id: string
          identified_count: number
          needs_review_count: number
          pause_reason: string | null
          queued_count: number
          report_ready_count: number
          started_at: string | null
          status: string
          total_items: number
          updated_at: string
          user_id: string
        }
        Insert: {
          analyzing_count?: number
          completed_at?: string | null
          created_at?: string
          discovering_count?: number
          failed_count?: number
          id?: string
          identified_count?: number
          needs_review_count?: number
          pause_reason?: string | null
          queued_count?: number
          report_ready_count?: number
          started_at?: string | null
          status?: string
          total_items?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          analyzing_count?: number
          completed_at?: string | null
          created_at?: string
          discovering_count?: number
          failed_count?: number
          id?: string
          identified_count?: number
          needs_review_count?: number
          pause_reason?: string | null
          queued_count?: number
          report_ready_count?: number
          started_at?: string | null
          status?: string
          total_items?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      case_appeals: {
        Row: {
          case_id: string
          created_at: string
          external_reference: string | null
          id: string
          reason: string
          resolved_at: string | null
          round: number
          status: string
          submitted_at: string | null
          supporting_evidence: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          external_reference?: string | null
          id?: string
          reason: string
          resolved_at?: string | null
          round: number
          status?: string
          submitted_at?: string | null
          supporting_evidence?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          external_reference?: string | null
          id?: string
          reason?: string
          resolved_at?: string | null
          round?: number
          status?: string
          submitted_at?: string | null
          supporting_evidence?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_appeals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          case_id: string
          created_at: string
          event_type: string
          id: string
          message: string
          metadata: Json
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          event_type: string
          id?: string
          message?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          email_status: string
          handled_note: string
          id: string
          message: string
          name: string
          source_ip: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          email_status?: string
          handled_note?: string
          id?: string
          message: string
          name: string
          source_ip?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_status?: string
          handled_note?: string
          id?: string
          message?: string
          name?: string
          source_ip?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      google_business_connections: {
        Row: {
          access_token_ciphertext: string
          created_at: string
          google_account_email: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          refresh_token_ciphertext: string
          scopes: string[]
          status: string
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_ciphertext: string
          created_at?: string
          google_account_email?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          refresh_token_ciphertext: string
          scopes?: string[]
          status?: string
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_ciphertext?: string
          created_at?: string
          google_account_email?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          refresh_token_ciphertext?: string
          scopes?: string[]
          status?: string
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      google_oauth_states: {
        Row: {
          code_verifier_ciphertext: string
          created_at: string
          expires_at: string
          id: string
          redirect_origin: string
          state_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_verifier_ciphertext: string
          created_at?: string
          expires_at: string
          id?: string
          redirect_origin: string
          state_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_verifier_ciphertext?: string
          created_at?: string
          expires_at?: string
          id?: string
          redirect_origin?: string
          state_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string
          category: string
          created_at: string
          id: string
          maps_uri: string
          name: string
          place_id: string
          platform: string
          rating: number | null
          rating_count: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string
          category?: string
          created_at?: string
          id?: string
          maps_uri?: string
          name: string
          place_id: string
          platform?: string
          rating?: number | null
          rating_count?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          category?: string
          created_at?: string
          id?: string
          maps_uri?: string
          name?: string
          place_id?: string
          platform?: string
          rating?: number | null
          rating_count?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          preferences: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          preferences?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          preferences?: Json
          updated_at?: string
        }
        Relationships: []
      }
      report_drafts: {
        Row: {
          case_id: string
          counter_evidence: Json
          created_at: string
          evidence: Json
          external_reference: string | null
          id: string
          report_body: string
          report_reason: string
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          case_id: string
          counter_evidence?: Json
          created_at?: string
          evidence?: Json
          external_reference?: string | null
          id?: string
          report_body?: string
          report_reason?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          case_id?: string
          counter_evidence?: Json
          created_at?: string
          evidence?: Json
          external_reference?: string | null
          id?: string
          report_body?: string
          report_reason?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "report_drafts_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      review_cases: {
        Row: {
          analysis: Json
          analysis_version: number
          appeal_round: number
          appealed_at: string | null
          author_name: string
          canonical_source_url: string
          confidence: number
          created_at: string
          headline: string
          id: string
          location_id: string
          owner_reply: string | null
          owner_reply_at: string | null
          plain_summary: string
          platform: string
          public_slug: string | null
          public_status: boolean
          rejection_risk: string
          reported_at: string | null
          resolved_at: string | null
          review_external_id: string
          review_rating: number | null
          review_record_id: string | null
          review_relative_time: string
          review_text: string
          review_url: string
          severity: string
          source_url: string
          status: string
          status_note: string
          updated_at: string
          user_id: string
          verdict: string
          violation_category: string
        }
        Insert: {
          analysis?: Json
          analysis_version?: number
          appeal_round?: number
          appealed_at?: string | null
          author_name?: string
          canonical_source_url?: string
          confidence?: number
          created_at?: string
          headline?: string
          id?: string
          location_id: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          plain_summary?: string
          platform?: string
          public_slug?: string | null
          public_status?: boolean
          rejection_risk?: string
          reported_at?: string | null
          resolved_at?: string | null
          review_external_id: string
          review_rating?: number | null
          review_record_id?: string | null
          review_relative_time?: string
          review_text?: string
          review_url?: string
          severity?: string
          source_url?: string
          status?: string
          status_note?: string
          updated_at?: string
          user_id: string
          verdict: string
          violation_category?: string
        }
        Update: {
          analysis?: Json
          analysis_version?: number
          appeal_round?: number
          appealed_at?: string | null
          author_name?: string
          canonical_source_url?: string
          confidence?: number
          created_at?: string
          headline?: string
          id?: string
          location_id?: string
          owner_reply?: string | null
          owner_reply_at?: string | null
          plain_summary?: string
          platform?: string
          public_slug?: string | null
          public_status?: boolean
          rejection_risk?: string
          reported_at?: string | null
          resolved_at?: string | null
          review_external_id?: string
          review_rating?: number | null
          review_record_id?: string | null
          review_relative_time?: string
          review_text?: string
          review_url?: string
          severity?: string
          source_url?: string
          status?: string
          status_note?: string
          updated_at?: string
          user_id?: string
          verdict?: string
          violation_category?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_cases_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_cases_review_record_id_fkey"
            columns: ["review_record_id"]
            isOneToOne: false
            referencedRelation: "review_records"
            referencedColumns: ["id"]
          },
        ]
      }
      review_records: {
        Row: {
          author_name: string
          author_photo_url: string
          canonical_source_url: string
          content_fingerprint: string
          created_at: string
          external_id: string
          first_seen_at: string
          id: string
          identity_confidence: number
          identity_method: string
          identity_status: string
          last_seen_at: string
          location_id: string
          observed_absent_at: string | null
          platform: string
          published_at: string | null
          rating: number | null
          raw_source: Json
          relative_time: string
          requested_source_url: string
          review_text: string
          review_url: string
          updated_at: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          author_name?: string
          author_photo_url?: string
          canonical_source_url?: string
          content_fingerprint: string
          created_at?: string
          external_id: string
          first_seen_at?: string
          id?: string
          identity_confidence?: number
          identity_method?: string
          identity_status?: string
          last_seen_at?: string
          location_id: string
          observed_absent_at?: string | null
          platform?: string
          published_at?: string | null
          rating?: number | null
          raw_source?: Json
          relative_time?: string
          requested_source_url?: string
          review_text?: string
          review_url?: string
          updated_at?: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          author_name?: string
          author_photo_url?: string
          canonical_source_url?: string
          content_fingerprint?: string
          created_at?: string
          external_id?: string
          first_seen_at?: string
          id?: string
          identity_confidence?: number
          identity_method?: string
          identity_status?: string
          last_seen_at?: string
          location_id?: string
          observed_absent_at?: string | null
          platform?: string
          published_at?: string | null
          rating?: number | null
          raw_source?: Json
          relative_time?: string
          requested_source_url?: string
          review_text?: string
          review_url?: string
          updated_at?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_records_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      scan_exports: {
        Row: {
          case_id: string
          created_at: string
          file_name: string
          file_size: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          file_name: string
          file_size: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          file_name?: string
          file_size?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scan_exports_case_id_fk"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "review_cases"
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
          role?: Database["public"]["Enums"]["app_role"]
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
      claim_bulk_job_item: {
        Args: { _job_id: string; _lease_seconds?: number }
        Returns: {
          attempt_count: number
          business_name: string | null
          canonical_source_url: string
          case_id: string | null
          completed_at: string | null
          created_at: string
          detail: string
          error_code: string | null
          id: string
          job_id: string
          lease_expires_at: string | null
          lease_token: string | null
          review_record_id: string | null
          source_kind: string
          source_url: string
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "bulk_job_items"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      claim_google_oauth_state: {
        Args: { _state_hash: string }
        Returns: {
          code_verifier_ciphertext: string
          created_at: string
          expires_at: string
          id: string
          redirect_origin: string
          state_hash: string
          used_at: string | null
          user_id: string
        }[]
        SetofOptions: {
          from: "*"
          to: "google_oauth_states"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      ensure_my_profile: {
        Args: never
        Returns: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          preferences: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      refresh_bulk_job_counts: { Args: { _job_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["superadmin", "admin", "user"],
    },
  },
} as const
