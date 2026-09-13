export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      ai_runs: {
        Row: {
          case_id: string | null;
          confidence: number | null;
          created_at: string;
          duration_ms: number;
          error_code: string | null;
          id: string;
          input_hash: string;
          job_id: string | null;
          model: string;
          output: Json;
          policy_version: string;
          prompt_version: string;
          provider: string;
          review_record_id: string | null;
          stage: string;
          status: string;
          workspace_id: string;
        };
        Insert: {
          case_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          duration_ms?: number;
          error_code?: string | null;
          id?: string;
          input_hash: string;
          job_id?: string | null;
          model: string;
          output?: Json;
          policy_version: string;
          prompt_version: string;
          provider: string;
          review_record_id?: string | null;
          stage: string;
          status?: string;
          workspace_id: string;
        };
        Update: {
          case_id?: string | null;
          confidence?: number | null;
          created_at?: string;
          duration_ms?: number;
          error_code?: string | null;
          id?: string;
          input_hash?: string;
          job_id?: string | null;
          model?: string;
          output?: Json;
          policy_version?: string;
          prompt_version?: string;
          provider?: string;
          review_record_id?: string | null;
          stage?: string;
          status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ai_runs_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "review_cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_runs_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "review_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_runs_review_record_id_fkey";
            columns: ["review_record_id"];
            isOneToOne: false;
            referencedRelation: "review_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ai_runs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          metadata: Json;
          workspace_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          metadata?: Json;
          workspace_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          metadata?: Json;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      bulk_job_items: {
        Row: {
          bulk_job_id: string;
          canonical_url: string;
          created_at: string;
          id: string;
          position: number;
          review_job_id: string | null;
          source_url: string;
          workspace_id: string;
        };
        Insert: {
          bulk_job_id: string;
          canonical_url: string;
          created_at?: string;
          id?: string;
          position: number;
          review_job_id?: string | null;
          source_url: string;
          workspace_id: string;
        };
        Update: {
          bulk_job_id?: string;
          canonical_url?: string;
          created_at?: string;
          id?: string;
          position?: number;
          review_job_id?: string | null;
          source_url?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bulk_job_items_bulk_job_id_fkey";
            columns: ["bulk_job_id"];
            isOneToOne: false;
            referencedRelation: "bulk_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulk_job_items_review_job_id_fkey";
            columns: ["review_job_id"];
            isOneToOne: false;
            referencedRelation: "review_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bulk_job_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      bulk_jobs: {
        Row: {
          cancelled_at: string | null;
          created_at: string;
          created_by: string;
          id: string;
          status: string;
          total_items: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          cancelled_at?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          status?: string;
          total_items?: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          cancelled_at?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          status?: string;
          total_items?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bulk_jobs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      business_members: {
        Row: {
          business_id: string;
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "business_members_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      businesses: {
        Row: {
          created_at: string;
          id: string;
          industry: string | null;
          name: string;
          owner_id: string;
          updated_at: string;
          website: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          industry?: string | null;
          name: string;
          owner_id: string;
          updated_at?: string;
          website?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          industry?: string | null;
          name?: string;
          owner_id?: string;
          updated_at?: string;
          website?: string | null;
        };
        Relationships: [];
      };
      case_attachments: {
        Row: {
          business_id: string;
          caption: string | null;
          case_id: string;
          content_type: string | null;
          created_at: string;
          file_name: string;
          file_path: string;
          id: string;
          size_bytes: number | null;
          uploaded_by: string;
        };
        Insert: {
          business_id: string;
          caption?: string | null;
          case_id: string;
          content_type?: string | null;
          created_at?: string;
          file_name: string;
          file_path: string;
          id?: string;
          size_bytes?: number | null;
          uploaded_by: string;
        };
        Update: {
          business_id?: string;
          caption?: string | null;
          case_id?: string;
          content_type?: string | null;
          created_at?: string;
          file_name?: string;
          file_path?: string;
          id?: string;
          size_bytes?: number | null;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "case_attachments_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_attachments_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "removal_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      case_events: {
        Row: {
          actor_id: string | null;
          business_id: string;
          case_id: string;
          created_at: string;
          event_type: string;
          id: string;
          message: string | null;
          metadata: Json;
        };
        Insert: {
          actor_id?: string | null;
          business_id: string;
          case_id: string;
          created_at?: string;
          event_type: string;
          id?: string;
          message?: string | null;
          metadata?: Json;
        };
        Update: {
          actor_id?: string | null;
          business_id?: string;
          case_id?: string;
          created_at?: string;
          event_type?: string;
          id?: string;
          message?: string | null;
          metadata?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "case_events_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "case_events_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "removal_cases";
            referencedColumns: ["id"];
          },
        ];
      };
      evidence_items: {
        Row: {
          case_id: string;
          content: string;
          created_at: string;
          excerpt_end: number | null;
          excerpt_start: number | null;
          id: string;
          kind: string;
          policy_category: string;
          position: number;
          review_record_id: string;
          source: string;
          source_url: string;
          verified: boolean;
          workspace_id: string;
        };
        Insert: {
          case_id: string;
          content: string;
          created_at?: string;
          excerpt_end?: number | null;
          excerpt_start?: number | null;
          id?: string;
          kind: string;
          policy_category?: string;
          position?: number;
          review_record_id: string;
          source: string;
          source_url?: string;
          verified?: boolean;
          workspace_id: string;
        };
        Update: {
          case_id?: string;
          content?: string;
          created_at?: string;
          excerpt_end?: number | null;
          excerpt_start?: number | null;
          id?: string;
          kind?: string;
          policy_category?: string;
          position?: number;
          review_record_id?: string;
          source?: string;
          source_url?: string;
          verified?: boolean;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "evidence_items_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "review_cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_items_review_record_id_fkey";
            columns: ["review_record_id"];
            isOneToOne: false;
            referencedRelation: "review_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "evidence_items_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      google_business_connections: {
        Row: {
          access_token_ciphertext: string;
          connected_by: string;
          created_at: string;
          google_account_email: string | null;
          id: string;
          last_error: string | null;
          last_synced_at: string | null;
          refresh_token_ciphertext: string;
          scopes: string[];
          status: string;
          token_expires_at: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          access_token_ciphertext: string;
          connected_by: string;
          created_at?: string;
          google_account_email?: string | null;
          id?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          refresh_token_ciphertext: string;
          scopes?: string[];
          status?: string;
          token_expires_at: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          access_token_ciphertext?: string;
          connected_by?: string;
          created_at?: string;
          google_account_email?: string | null;
          id?: string;
          last_error?: string | null;
          last_synced_at?: string | null;
          refresh_token_ciphertext?: string;
          scopes?: string[];
          status?: string;
          token_expires_at?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_business_connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      google_connections: {
        Row: {
          access_token: string | null;
          business_id: string;
          connected_by: string;
          created_at: string;
          google_account_name: string | null;
          google_email: string | null;
          id: string;
          last_sync_at: string | null;
          last_sync_error: string | null;
          refresh_token: string | null;
          scope: string | null;
          token_expires_at: string | null;
          updated_at: string;
        };
        Insert: {
          access_token?: string | null;
          business_id: string;
          connected_by: string;
          created_at?: string;
          google_account_name?: string | null;
          google_email?: string | null;
          id?: string;
          last_sync_at?: string | null;
          last_sync_error?: string | null;
          refresh_token?: string | null;
          scope?: string | null;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Update: {
          access_token?: string | null;
          business_id?: string;
          connected_by?: string;
          created_at?: string;
          google_account_name?: string | null;
          google_email?: string | null;
          id?: string;
          last_sync_at?: string | null;
          last_sync_error?: string | null;
          refresh_token?: string | null;
          scope?: string | null;
          token_expires_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_connections_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: true;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      google_oauth_states: {
        Row: {
          code_verifier_ciphertext: string;
          created_at: string;
          expires_at: string;
          id: string;
          redirect_origin: string;
          state_hash: string;
          used_at: string | null;
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          code_verifier_ciphertext: string;
          created_at?: string;
          expires_at: string;
          id?: string;
          redirect_origin: string;
          state_hash: string;
          used_at?: string | null;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          code_verifier_ciphertext?: string;
          created_at?: string;
          expires_at?: string;
          id?: string;
          redirect_origin?: string;
          state_hash?: string;
          used_at?: string | null;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "google_oauth_states_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          address: string | null;
          business_id: string;
          city: string | null;
          country: string | null;
          created_at: string;
          google_last_sync_at: string | null;
          google_place_id: string | null;
          google_resource_name: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          business_id: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          google_last_sync_at?: string | null;
          google_place_id?: string | null;
          google_resource_name?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          business_id?: string;
          city?: string | null;
          country?: string | null;
          created_at?: string;
          google_last_sync_at?: string | null;
          google_place_id?: string | null;
          google_resource_name?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "locations_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          business_id: string | null;
          created_at: string;
          id: string;
          is_read: boolean;
          link: string | null;
          title: string;
          type: string;
          user_id: string;
          workspace_id: string | null;
        };
        Insert: {
          body?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          title: string;
          type: string;
          user_id: string;
          workspace_id?: string | null;
        };
        Update: {
          body?: string | null;
          business_id?: string | null;
          created_at?: string;
          id?: string;
          is_read?: boolean;
          link?: string | null;
          title?: string;
          type?: string;
          user_id?: string;
          workspace_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notifications_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_categories: {
        Row: {
          active: boolean;
          description: string;
          examples: Json;
          id: string;
          key: string;
          label: string;
          policy_version_id: string;
          reportable: boolean;
        };
        Insert: {
          active?: boolean;
          description: string;
          examples?: Json;
          id?: string;
          key: string;
          label: string;
          policy_version_id: string;
          reportable?: boolean;
        };
        Update: {
          active?: boolean;
          description?: string;
          examples?: Json;
          id?: string;
          key?: string;
          label?: string;
          policy_version_id?: string;
          reportable?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "policy_categories_policy_version_id_fkey";
            columns: ["policy_version_id"];
            isOneToOne: false;
            referencedRelation: "policy_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      policy_versions: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          last_verified_at: string | null;
          official_source: string;
          platform: string;
          title: string;
          version: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_verified_at?: string | null;
          official_source: string;
          platform: string;
          title: string;
          version: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          last_verified_at?: string | null;
          official_source?: string;
          platform?: string;
          title?: string;
          version?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          deleted_at: string | null;
          display_name: string;
          email: string | null;
          full_name: string | null;
          id: string;
          preferences: Json;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          preferences?: Json;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          display_name?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          preferences?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      removal_cases: {
        Row: {
          appeal_reason: string | null;
          appeal_round: number;
          appealed_at: string | null;
          assigned_to: string | null;
          business_id: string;
          case_number: number;
          created_at: string;
          created_by: string;
          evidence: Json;
          google_reference_id: string | null;
          google_removed_at: string | null;
          id: string;
          last_appeal_at: string | null;
          location_id: string | null;
          notes: string | null;
          outcome: Database["public"]["Enums"]["removal_outcome"];
          outcome_checked_at: string | null;
          reported_at: string | null;
          resolved_at: string | null;
          review_id: string;
          status: Database["public"]["Enums"]["case_status"];
          updated_at: string;
          violation_category: Database["public"]["Enums"]["violation_category"];
        };
        Insert: {
          appeal_reason?: string | null;
          appeal_round?: number;
          appealed_at?: string | null;
          assigned_to?: string | null;
          business_id: string;
          case_number?: number;
          created_at?: string;
          created_by: string;
          evidence?: Json;
          google_reference_id?: string | null;
          google_removed_at?: string | null;
          id?: string;
          last_appeal_at?: string | null;
          location_id?: string | null;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["removal_outcome"];
          outcome_checked_at?: string | null;
          reported_at?: string | null;
          resolved_at?: string | null;
          review_id: string;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          violation_category?: Database["public"]["Enums"]["violation_category"];
        };
        Update: {
          appeal_reason?: string | null;
          appeal_round?: number;
          appealed_at?: string | null;
          assigned_to?: string | null;
          business_id?: string;
          case_number?: number;
          created_at?: string;
          created_by?: string;
          evidence?: Json;
          google_reference_id?: string | null;
          google_removed_at?: string | null;
          id?: string;
          last_appeal_at?: string | null;
          location_id?: string | null;
          notes?: string | null;
          outcome?: Database["public"]["Enums"]["removal_outcome"];
          outcome_checked_at?: string | null;
          reported_at?: string | null;
          resolved_at?: string | null;
          review_id?: string;
          status?: Database["public"]["Enums"]["case_status"];
          updated_at?: string;
          violation_category?: Database["public"]["Enums"]["violation_category"];
        };
        Relationships: [
          {
            foreignKeyName: "removal_cases_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "removal_cases_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "removal_cases_review_id_fkey";
            columns: ["review_id"];
            isOneToOne: true;
            referencedRelation: "reviews";
            referencedColumns: ["id"];
          },
        ];
      };
      report_appeals: {
        Row: {
          created_at: string;
          created_by: string;
          external_reference: string | null;
          id: string;
          reason: string;
          report_id: string;
          resolved_at: string | null;
          round: number;
          status: string;
          submitted_at: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          external_reference?: string | null;
          id?: string;
          reason: string;
          report_id: string;
          resolved_at?: string | null;
          round: number;
          status?: string;
          submitted_at?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          external_reference?: string | null;
          id?: string;
          reason?: string;
          report_id?: string;
          resolved_at?: string | null;
          round?: number;
          status?: string;
          submitted_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_appeals_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_appeals_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      report_events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          from_status: string | null;
          id: string;
          metadata: Json;
          note: string;
          report_id: string;
          to_status: string;
          workspace_id: string;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          metadata?: Json;
          note?: string;
          report_id: string;
          to_status: string;
          workspace_id: string;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          from_status?: string | null;
          id?: string;
          metadata?: Json;
          note?: string;
          report_id?: string;
          to_status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "report_events_report_id_fkey";
            columns: ["report_id"];
            isOneToOne: false;
            referencedRelation: "reports";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "report_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      reports: {
        Row: {
          case_id: string;
          created_at: string;
          created_by: string;
          decided_at: string | null;
          external_reference: string | null;
          id: string;
          outcome_note: string;
          outcome_source: string | null;
          report_body: string;
          report_reason: string;
          route: string;
          status: string;
          submitted_at: string | null;
          updated_at: string;
          updated_by: string | null;
          version: number;
          workspace_id: string;
        };
        Insert: {
          case_id: string;
          created_at?: string;
          created_by: string;
          decided_at?: string | null;
          external_reference?: string | null;
          id?: string;
          outcome_note?: string;
          outcome_source?: string | null;
          report_body?: string;
          report_reason?: string;
          route?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          workspace_id: string;
        };
        Update: {
          case_id?: string;
          created_at?: string;
          created_by?: string;
          decided_at?: string | null;
          external_reference?: string | null;
          id?: string;
          outcome_note?: string;
          outcome_source?: string | null;
          report_body?: string;
          report_reason?: string;
          route?: string;
          status?: string;
          submitted_at?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          version?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_case_id_fkey";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "review_cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reports_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      review_cases: {
        Row: {
          analysis: Json;
          confidence: number;
          created_at: string;
          created_by: string;
          decision: string;
          dismissed_at: string | null;
          headline: string;
          id: string;
          job_id: string | null;
          location_id: string;
          model_agreement: string;
          plain_summary: string;
          policy_version_id: string | null;
          rejection_risk: string;
          review_record_id: string;
          severity: string;
          updated_at: string;
          verdict: string;
          violation_category: string;
          workspace_id: string;
        };
        Insert: {
          analysis?: Json;
          confidence?: number;
          created_at?: string;
          created_by: string;
          decision: string;
          dismissed_at?: string | null;
          headline?: string;
          id?: string;
          job_id?: string | null;
          location_id: string;
          model_agreement?: string;
          plain_summary?: string;
          policy_version_id?: string | null;
          rejection_risk?: string;
          review_record_id: string;
          severity?: string;
          updated_at?: string;
          verdict: string;
          violation_category?: string;
          workspace_id: string;
        };
        Update: {
          analysis?: Json;
          confidence?: number;
          created_at?: string;
          created_by?: string;
          decision?: string;
          dismissed_at?: string | null;
          headline?: string;
          id?: string;
          job_id?: string | null;
          location_id?: string;
          model_agreement?: string;
          plain_summary?: string;
          policy_version_id?: string | null;
          rejection_risk?: string;
          review_record_id?: string;
          severity?: string;
          updated_at?: string;
          verdict?: string;
          violation_category?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_cases_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "review_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_cases_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "review_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_cases_policy_version_id_fkey";
            columns: ["policy_version_id"];
            isOneToOne: false;
            referencedRelation: "policy_versions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_cases_review_record_id_fkey";
            columns: ["review_record_id"];
            isOneToOne: false;
            referencedRelation: "review_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_cases_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      review_job_events: {
        Row: {
          created_at: string;
          detail: string;
          error_code: string | null;
          from_status: string | null;
          id: string;
          job_id: string;
          to_status: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          detail?: string;
          error_code?: string | null;
          from_status?: string | null;
          id?: string;
          job_id: string;
          to_status: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          detail?: string;
          error_code?: string | null;
          from_status?: string | null;
          id?: string;
          job_id?: string;
          to_status?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_job_events_job_id_fkey";
            columns: ["job_id"];
            isOneToOne: false;
            referencedRelation: "review_jobs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_job_events_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      review_jobs: {
        Row: {
          attempt_count: number;
          business: Json | null;
          candidates: Json;
          canonical_url: string;
          case_id: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          detail: string;
          error_code: string | null;
          id: string;
          idempotency_key: string;
          lease_expires_at: string | null;
          limitation: string | null;
          location_id: string | null;
          max_attempts: number;
          next_attempt_at: string;
          platform: string | null;
          review_record_id: string | null;
          source_url: string;
          started_at: string | null;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          attempt_count?: number;
          business?: Json | null;
          candidates?: Json;
          canonical_url: string;
          case_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by: string;
          detail?: string;
          error_code?: string | null;
          id?: string;
          idempotency_key: string;
          lease_expires_at?: string | null;
          limitation?: string | null;
          location_id?: string | null;
          max_attempts?: number;
          next_attempt_at?: string;
          platform?: string | null;
          review_record_id?: string | null;
          source_url: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          attempt_count?: number;
          business?: Json | null;
          candidates?: Json;
          canonical_url?: string;
          case_id?: string | null;
          completed_at?: string | null;
          created_at?: string;
          created_by?: string;
          detail?: string;
          error_code?: string | null;
          id?: string;
          idempotency_key?: string;
          lease_expires_at?: string | null;
          limitation?: string | null;
          location_id?: string | null;
          max_attempts?: number;
          next_attempt_at?: string;
          platform?: string | null;
          review_record_id?: string | null;
          source_url?: string;
          started_at?: string | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_jobs_case_fk";
            columns: ["case_id"];
            isOneToOne: false;
            referencedRelation: "review_cases";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_jobs_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "review_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_jobs_review_record_id_fkey";
            columns: ["review_record_id"];
            isOneToOne: false;
            referencedRelation: "review_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_jobs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      review_locations: {
        Row: {
          address: string;
          business_profile_location: string | null;
          category: string;
          created_at: string;
          id: string;
          maps_uri: string;
          name: string;
          place_id: string;
          platform: string;
          rating: number | null;
          rating_count: number | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          address?: string;
          business_profile_location?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          maps_uri?: string;
          name: string;
          place_id: string;
          platform?: string;
          rating?: number | null;
          rating_count?: number | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          address?: string;
          business_profile_location?: string | null;
          category?: string;
          created_at?: string;
          id?: string;
          maps_uri?: string;
          name?: string;
          place_id?: string;
          platform?: string;
          rating?: number | null;
          rating_count?: number | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_locations_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      review_records: {
        Row: {
          author_name: string;
          author_photo_url: string;
          canonical_source_url: string;
          content_fingerprint: string;
          created_at: string;
          external_id: string;
          first_seen_at: string;
          id: string;
          identity_confidence: number;
          identity_method: string;
          identity_status: string;
          last_seen_at: string;
          location_id: string;
          observed_absent_at: string | null;
          platform: string;
          published_at: string | null;
          rating: number | null;
          raw_source: Json;
          review_text: string;
          review_url: string;
          source: string;
          updated_at: string;
          verified_at: string | null;
          workspace_id: string;
        };
        Insert: {
          author_name?: string;
          author_photo_url?: string;
          canonical_source_url?: string;
          content_fingerprint: string;
          created_at?: string;
          external_id: string;
          first_seen_at?: string;
          id?: string;
          identity_confidence: number;
          identity_method: string;
          identity_status: string;
          last_seen_at?: string;
          location_id: string;
          observed_absent_at?: string | null;
          platform?: string;
          published_at?: string | null;
          rating?: number | null;
          raw_source?: Json;
          review_text?: string;
          review_url?: string;
          source: string;
          updated_at?: string;
          verified_at?: string | null;
          workspace_id: string;
        };
        Update: {
          author_name?: string;
          author_photo_url?: string;
          canonical_source_url?: string;
          content_fingerprint?: string;
          created_at?: string;
          external_id?: string;
          first_seen_at?: string;
          id?: string;
          identity_confidence?: number;
          identity_method?: string;
          identity_status?: string;
          last_seen_at?: string;
          location_id?: string;
          observed_absent_at?: string | null;
          platform?: string;
          published_at?: string | null;
          rating?: number | null;
          raw_source?: Json;
          review_text?: string;
          review_url?: string;
          source?: string;
          updated_at?: string;
          verified_at?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_records_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "review_locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_records_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      reviews: {
        Row: {
          ai_confidence: number | null;
          ai_evidence: Json;
          ai_explanation: string | null;
          business_id: string;
          created_at: string;
          google_last_seen_at: string | null;
          google_review_name: string | null;
          id: string;
          is_legitimate_negative: boolean;
          is_live_on_google: boolean;
          location_id: string | null;
          priority: Database["public"]["Enums"]["review_priority"];
          rating: number;
          recommended_action: string | null;
          removed_from_google_at: string | null;
          review_date: string;
          review_text: string;
          reviewer_name: string;
          reviewer_profile_url: string | null;
          scan_status: Database["public"]["Enums"]["scan_status"];
          scanned_at: string | null;
          source_review_id: string | null;
          updated_at: string;
          violation_category: Database["public"]["Enums"]["violation_category"] | null;
        };
        Insert: {
          ai_confidence?: number | null;
          ai_evidence?: Json;
          ai_explanation?: string | null;
          business_id: string;
          created_at?: string;
          google_last_seen_at?: string | null;
          google_review_name?: string | null;
          id?: string;
          is_legitimate_negative?: boolean;
          is_live_on_google?: boolean;
          location_id?: string | null;
          priority?: Database["public"]["Enums"]["review_priority"];
          rating?: number;
          recommended_action?: string | null;
          removed_from_google_at?: string | null;
          review_date?: string;
          review_text?: string;
          reviewer_name?: string;
          reviewer_profile_url?: string | null;
          scan_status?: Database["public"]["Enums"]["scan_status"];
          scanned_at?: string | null;
          source_review_id?: string | null;
          updated_at?: string;
          violation_category?: Database["public"]["Enums"]["violation_category"] | null;
        };
        Update: {
          ai_confidence?: number | null;
          ai_evidence?: Json;
          ai_explanation?: string | null;
          business_id?: string;
          created_at?: string;
          google_last_seen_at?: string | null;
          google_review_name?: string | null;
          id?: string;
          is_legitimate_negative?: boolean;
          is_live_on_google?: boolean;
          location_id?: string | null;
          priority?: Database["public"]["Enums"]["review_priority"];
          rating?: number;
          recommended_action?: string | null;
          removed_from_google_at?: string | null;
          review_date?: string;
          review_text?: string;
          reviewer_name?: string;
          reviewer_profile_url?: string | null;
          scan_status?: Database["public"]["Enums"]["scan_status"];
          scanned_at?: string | null;
          source_review_id?: string | null;
          updated_at?: string;
          violation_category?: Database["public"]["Enums"]["violation_category"] | null;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      scan_jobs: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string;
          error_message: string | null;
          flagged_reviews: number;
          id: string;
          lease_expires_at: string | null;
          processed_reviews: number;
          status: Database["public"]["Enums"]["job_status"];
          total_reviews: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          created_by: string;
          error_message?: string | null;
          flagged_reviews?: number;
          id?: string;
          lease_expires_at?: string | null;
          processed_reviews?: number;
          status?: Database["public"]["Enums"]["job_status"];
          total_reviews?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string;
          error_message?: string | null;
          flagged_reviews?: number;
          id?: string;
          lease_expires_at?: string | null;
          processed_reviews?: number;
          status?: Database["public"]["Enums"]["job_status"];
          total_reviews?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scan_jobs_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      url_batch_items: {
        Row: {
          attempts: number;
          batch_id: string;
          business_id: string;
          created_at: string;
          error_message: string | null;
          id: string;
          location_id: string | null;
          normalized_url: string | null;
          place_address: string | null;
          place_id: string | null;
          place_name: string | null;
          position: number;
          processed_at: string | null;
          reviews_fetched: number;
          status: string;
          submitted_url: string;
        };
        Insert: {
          attempts?: number;
          batch_id: string;
          business_id: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          location_id?: string | null;
          normalized_url?: string | null;
          place_address?: string | null;
          place_id?: string | null;
          place_name?: string | null;
          position?: number;
          processed_at?: string | null;
          reviews_fetched?: number;
          status?: string;
          submitted_url: string;
        };
        Update: {
          attempts?: number;
          batch_id?: string;
          business_id?: string;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          location_id?: string | null;
          normalized_url?: string | null;
          place_address?: string | null;
          place_id?: string | null;
          place_name?: string | null;
          position?: number;
          processed_at?: string | null;
          reviews_fetched?: number;
          status?: string;
          submitted_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "url_batch_items_batch_id_fkey";
            columns: ["batch_id"];
            isOneToOne: false;
            referencedRelation: "url_batches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "url_batch_items_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "url_batch_items_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      url_batches: {
        Row: {
          business_id: string;
          created_at: string;
          created_by: string;
          duplicates_skipped: number;
          error_message: string | null;
          failed_urls: number;
          id: string;
          lease_expires_at: string | null;
          processed_urls: number;
          reviews_imported: number;
          status: Database["public"]["Enums"]["job_status"];
          succeeded_urls: number;
          total_urls: number;
          updated_at: string;
        };
        Insert: {
          business_id: string;
          created_at?: string;
          created_by: string;
          duplicates_skipped?: number;
          error_message?: string | null;
          failed_urls?: number;
          id?: string;
          lease_expires_at?: string | null;
          processed_urls?: number;
          reviews_imported?: number;
          status?: Database["public"]["Enums"]["job_status"];
          succeeded_urls?: number;
          total_urls?: number;
          updated_at?: string;
        };
        Update: {
          business_id?: string;
          created_at?: string;
          created_by?: string;
          duplicates_skipped?: number;
          error_message?: string | null;
          failed_urls?: number;
          id?: string;
          lease_expires_at?: string | null;
          processed_urls?: number;
          reviews_imported?: number;
          status?: Database["public"]["Enums"]["job_status"];
          succeeded_urls?: number;
          total_urls?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "url_batches_business_id_fkey";
            columns: ["business_id"];
            isOneToOne: false;
            referencedRelation: "businesses";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          created_by: string;
          deleted_at: string | null;
          id: string;
          name: string;
          settings: Json;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          deleted_at?: string | null;
          id?: string;
          name: string;
          settings?: Json;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          settings?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_system_overview: {
        Args: never;
        Returns: Json;
      };
      business_report: {
        Args: {
          _business_id: string;
          _since?: string;
        };
        Returns: Json;
      };
      claim_google_oauth_state: {
        Args: {
          _state_hash: string;
        };
        Returns: Database["public"]["Tables"]["google_oauth_states"]["Row"][];
        SetofOptions: {
          from: "*";
          to: "google_oauth_states";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      claim_review_jobs: {
        Args: {
          _limit?: number;
          _lease_seconds?: number;
        };
        Returns: Database["public"]["Tables"]["review_jobs"]["Row"][];
        SetofOptions: {
          from: "*";
          to: "review_jobs";
          isOneToOne: false;
          isSetofReturn: true;
        };
      };
      ensure_my_profile: {
        Args: never;
        Returns: Database["public"]["Tables"]["profiles"]["Row"];
        SetofOptions: {
          from: "*";
          to: "profiles";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      ensure_my_workspace: {
        Args: never;
        Returns: string;
      };
      has_business_access: {
        Args: {
          _business_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _user_id: string;
          _role: Database["public"]["Enums"]["app_role"];
        };
        Returns: boolean;
      };
      has_workspace_role: {
        Args: {
          _workspace_id: string;
          _minimum: string;
        };
        Returns: boolean;
      };
      is_superadmin: {
        Args: {
          _user_id?: string;
        };
        Returns: boolean;
      };
      is_workspace_member: {
        Args: {
          _workspace_id: string;
        };
        Returns: boolean;
      };
      refresh_url_batch_counters: {
        Args: {
          _batch_id: string;
        };
        Returns: Json;
      };
      report_transition_allowed: {
        Args: {
          _from: string;
          _to: string;
        };
        Returns: boolean;
      };
      review_job_transition_allowed: {
        Args: {
          _from: string;
          _to: string;
        };
        Returns: boolean;
      };
      workspace_role_rank: {
        Args: {
          _role: string;
        };
        Returns: number;
      };
    };
    Enums: {
      app_role: "admin" | "manager" | "analyst" | "superadmin" | "user";
      case_status:
        "new" | "reviewing" | "evidence_ready" | "reported" | "appeal" | "resolved" | "rejected";
      job_status: "running" | "paused" | "completed" | "failed";
      removal_outcome: "pending" | "removed_by_google" | "still_live" | "no_result";
      review_priority: "high" | "medium" | "review_required" | "normal";
      scan_status: "unscanned" | "queued" | "scanning" | "scanned" | "failed";
      violation_category:
        | "spam"
        | "fake_content"
        | "off_topic"
        | "conflict_of_interest"
        | "harassment"
        | "abuse"
        | "threats"
        | "extortion"
        | "personal_information"
        | "promotional"
        | "other"
        | "none";
      workspace_role: "owner" | "admin" | "member" | "viewer";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"];
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T];

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "manager", "analyst", "superadmin", "user"],
      case_status: [
        "new",
        "reviewing",
        "evidence_ready",
        "reported",
        "appeal",
        "resolved",
        "rejected",
      ],
      job_status: ["running", "paused", "completed", "failed"],
      removal_outcome: ["pending", "removed_by_google", "still_live", "no_result"],
      review_priority: ["high", "medium", "review_required", "normal"],
      scan_status: ["unscanned", "queued", "scanning", "scanned", "failed"],
      violation_category: [
        "spam",
        "fake_content",
        "off_topic",
        "conflict_of_interest",
        "harassment",
        "abuse",
        "threats",
        "extortion",
        "personal_information",
        "promotional",
        "other",
        "none",
      ],
      workspace_role: ["owner", "admin", "member", "viewer"],
    },
  },
} as const;
