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
      activities: {
        Row: {
          created_at: string
          description: string
          id: string
          metadata: Json | null
          type: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          type: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          type?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          company_name: string
          created_at: string
          description: string | null
          id: string
          industries: string[] | null
          positioning: string | null
          products_summary: string | null
          solved_pain_points: string[] | null
          target_systems: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_name: string
          created_at?: string
          description?: string | null
          id?: string
          industries?: string[] | null
          positioning?: string | null
          products_summary?: string | null
          solved_pain_points?: string[] | null
          target_systems?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_name?: string
          created_at?: string
          description?: string | null
          id?: string
          industries?: string[] | null
          positioning?: string | null
          products_summary?: string | null
          solved_pain_points?: string[] | null
          target_systems?: string[] | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_accounts: {
        Row: {
          access_token: string | null
          access_token_expires_at: string | null
          created_at: string
          display_name: string | null
          email_address: string
          gmail_history_id: string | null
          gmail_watch_expires_at: string | null
          id: string
          last_error: string | null
          last_synced_at: string | null
          ms_subscription_expires_at: string | null
          ms_subscription_id: string | null
          ms_tenant_id: string | null
          provider: Database["public"]["Enums"]["email_account_provider"]
          refresh_token: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          access_token?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          display_name?: string | null
          email_address: string
          gmail_history_id?: string | null
          gmail_watch_expires_at?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          ms_subscription_expires_at?: string | null
          ms_subscription_id?: string | null
          ms_tenant_id?: string | null
          provider: Database["public"]["Enums"]["email_account_provider"]
          refresh_token: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          access_token?: string | null
          access_token_expires_at?: string | null
          created_at?: string
          display_name?: string | null
          email_address?: string
          gmail_history_id?: string | null
          gmail_watch_expires_at?: string | null
          id?: string
          last_error?: string | null
          last_synced_at?: string | null
          ms_subscription_expires_at?: string | null
          ms_subscription_id?: string | null
          ms_tenant_id?: string | null
          provider?: Database["public"]["Enums"]["email_account_provider"]
          refresh_token?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      email_messages: {
        Row: {
          account_id: string
          analysis_confidence: number | null
          analyzed_at: string | null
          body_html: string | null
          body_text: string | null
          cc_emails: string[]
          created_at: string
          direction: Database["public"]["Enums"]["email_message_direction"]
          from_email: string
          from_name: string | null
          id: string
          in_reply_to: string | null
          is_read: boolean
          provider_message_id: string
          received_at: string | null
          reply_intent: string | null
          reply_summary: string | null
          reply_temperature:
            | Database["public"]["Enums"]["reply_temperature"]
            | null
          rfc822_message_id: string | null
          sent_at: string
          snippet: string | null
          subject: string | null
          suggested_next_step: string | null
          thread_id: string
          to_emails: string[]
          workspace_id: string
        }
        Insert: {
          account_id: string
          analysis_confidence?: number | null
          analyzed_at?: string | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: string[]
          created_at?: string
          direction: Database["public"]["Enums"]["email_message_direction"]
          from_email: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_read?: boolean
          provider_message_id: string
          received_at?: string | null
          reply_intent?: string | null
          reply_summary?: string | null
          reply_temperature?:
            | Database["public"]["Enums"]["reply_temperature"]
            | null
          rfc822_message_id?: string | null
          sent_at?: string
          snippet?: string | null
          subject?: string | null
          suggested_next_step?: string | null
          thread_id: string
          to_emails?: string[]
          workspace_id: string
        }
        Update: {
          account_id?: string
          analysis_confidence?: number | null
          analyzed_at?: string | null
          body_html?: string | null
          body_text?: string | null
          cc_emails?: string[]
          created_at?: string
          direction?: Database["public"]["Enums"]["email_message_direction"]
          from_email?: string
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          is_read?: boolean
          provider_message_id?: string
          received_at?: string | null
          reply_intent?: string | null
          reply_summary?: string | null
          reply_temperature?:
            | Database["public"]["Enums"]["reply_temperature"]
            | null
          rfc822_message_id?: string | null
          sent_at?: string
          snippet?: string | null
          subject?: string | null
          suggested_next_step?: string | null
          thread_id?: string
          to_emails?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_messages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "email_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sender_settings: {
        Row: {
          created_at: string
          from_email: string | null
          from_name: string | null
          id: string
          last_verification_sent_at: string | null
          mode: string
          reply_to: string | null
          updated_at: string
          verification_code: string | null
          verified: boolean
          workspace_id: string
        }
        Insert: {
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          last_verification_sent_at?: string | null
          mode?: string
          reply_to?: string | null
          updated_at?: string
          verification_code?: string | null
          verified?: boolean
          workspace_id: string
        }
        Update: {
          created_at?: string
          from_email?: string | null
          from_name?: string | null
          id?: string
          last_verification_sent_at?: string | null
          mode?: string
          reply_to?: string | null
          updated_at?: string
          verification_code?: string | null
          verified?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_sender_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_threads: {
        Row: {
          account_id: string
          created_at: string
          id: string
          last_message_at: string
          lead_id: string | null
          participants: string[]
          provider_thread_id: string
          subject: string | null
          unread_count: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          lead_id?: string | null
          participants?: string[]
          provider_thread_id: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          lead_id?: string | null
          participants?: string[]
          provider_thread_id?: string
          subject?: string | null
          unread_count?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_threads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_name: string
          contact_name: string | null
          country: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          industry: string | null
          last_reply_at: string | null
          last_reply_temperature:
            | Database["public"]["Enums"]["reply_temperature"]
            | null
          notes: string | null
          pain_points: string[] | null
          reply_count: number
          role: string | null
          score: number | null
          source: string | null
          status: Database["public"]["Enums"]["lead_status"]
          systems_in_use: string[] | null
          tools: string[] | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          company_name: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_reply_at?: string | null
          last_reply_temperature?:
            | Database["public"]["Enums"]["reply_temperature"]
            | null
          notes?: string | null
          pain_points?: string[] | null
          reply_count?: number
          role?: string | null
          score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          systems_in_use?: string[] | null
          tools?: string[] | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          company_name?: string
          contact_name?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          industry?: string | null
          last_reply_at?: string | null
          last_reply_temperature?:
            | Database["public"]["Enums"]["reply_temperature"]
            | null
          notes?: string | null
          pain_points?: string[] | null
          reply_count?: number
          role?: string | null
          score?: number | null
          source?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          systems_in_use?: string[] | null
          tools?: string[] | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      oauth_state: {
        Row: {
          created_at: string
          expires_at: string
          provider: string
          redirect_to: string | null
          state: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          provider: string
          redirect_to?: string | null
          state: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          provider?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          created_at: string
          id: string
          industry: string | null
          level: Database["public"]["Enums"]["opportunity_level"] | null
          problem: string | null
          rationale: string | null
          score: number | null
          title: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          industry?: string | null
          level?: Database["public"]["Enums"]["opportunity_level"] | null
          problem?: string | null
          rationale?: string | null
          score?: number | null
          title: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          industry?: string | null
          level?: Database["public"]["Enums"]["opportunity_level"] | null
          problem?: string | null
          rationale?: string | null
          score?: number | null
          title?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          email_signature: string | null
          full_name: string | null
          id: string
          inbox_prompt_dismissed_at: string | null
          preferred_mail_client: string | null
          sender_email: string | null
          sender_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          email_signature?: string | null
          full_name?: string | null
          id: string
          inbox_prompt_dismissed_at?: string | null
          preferred_mail_client?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          email_signature?: string | null
          full_name?: string | null
          id?: string
          inbox_prompt_dismissed_at?: string | null
          preferred_mail_client?: string | null
          sender_email?: string | null
          sender_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sequence_enrollments: {
        Row: {
          completed_at: string | null
          created_at: string
          enrolled_at: string
          id: string
          lead_id: string
          sequence_id: string
          status: Database["public"]["Enums"]["enrollment_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          lead_id: string
          sequence_id: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          enrolled_at?: string
          id?: string
          lead_id?: string
          sequence_id?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_step_status: {
        Row: {
          created_at: string
          due_at: string
          enrollment_id: string
          id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["step_status"]
          step_id: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          due_at: string
          enrollment_id: string
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["step_status"]
          step_id: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          due_at?: string
          enrollment_id?: string
          id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["step_status"]
          step_id?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_step_status_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_step_status_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          body_template: string
          created_at: string
          day_offset: number
          id: string
          sequence_id: string
          step_order: number
          subject_template: string
          workspace_id: string
        }
        Insert: {
          body_template?: string
          created_at?: string
          day_offset?: number
          id?: string
          sequence_id: string
          step_order: number
          subject_template?: string
          workspace_id: string
        }
        Update: {
          body_template?: string
          created_at?: string
          day_offset?: number
          id?: string
          sequence_id?: string
          step_order?: number
          subject_template?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          created_at: string
          id: string
          message: string
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          ai_emails_used: number
          created_at: string
          id: string
          period_start: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          ai_emails_used?: number
          created_at?: string
          id?: string
          period_start: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          ai_emails_used?: number
          created_at?: string
          id?: string
          period_start?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      user_api_keys: {
        Row: {
          api_key: string
          created_at: string
          id: string
          label: string | null
          provider: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          label?: string | null
          provider: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          label?: string | null
          provider?: string
          user_id?: string
        }
        Relationships: []
      }
      user_dashboard_prefs: {
        Row: {
          updated_at: string
          user_id: string
          visible_tiles: string[]
        }
        Insert: {
          updated_at?: string
          user_id: string
          visible_tiles?: string[]
        }
        Update: {
          updated_at?: string
          user_id?: string
          visible_tiles?: string[]
        }
        Relationships: []
      }
      user_oauth_apps: {
        Row: {
          client_id: string
          client_secret: string
          created_at: string
          created_by: string
          id: string
          label: string | null
          provider: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id: string
          client_secret: string
          created_at?: string
          created_by: string
          id?: string
          label?: string | null
          provider: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string
          client_secret?: string
          created_at?: string
          created_by?: string
          id?: string
          label?: string | null
          provider?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      waitlist_signups: {
        Row: {
          business_name: string
          created_at: string
          designation: string
          email: string
          full_name: string
          id: string
          mobile: string
          notes: string | null
          status: Database["public"]["Enums"]["waitlist_status"]
          updated_at: string
        }
        Insert: {
          business_name: string
          created_at?: string
          designation: string
          email: string
          full_name: string
          id?: string
          mobile: string
          notes?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
        }
        Update: {
          business_name?: string
          created_at?: string
          designation?: string
          email?: string
          full_name?: string
          id?: string
          mobile?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          updated_at?: string
        }
        Relationships: []
      }
      workspace_addons: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          quantity: number
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          quantity?: number
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: []
      }
      workspace_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
          workspace_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_lead_count: { Args: { _workspace_id: string }; Returns: number }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_current_ai_emails: {
        Args: { _workspace_id: string }
        Returns: number
      }
      get_user_tier: { Args: { _user_id: string }; Returns: string }
      get_workspace_owner_tier: {
        Args: { _workspace_id: string }
        Returns: string
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      increment_ai_emails: { Args: { _workspace_id: string }; Returns: number }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      is_workspace_owner: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      workspace_extra_credits: {
        Args: { _workspace_id: string }
        Returns: number
      }
      workspace_extra_seats: {
        Args: { _workspace_id: string }
        Returns: number
      }
    }
    Enums: {
      app_role: "owner" | "member"
      email_account_provider: "gmail" | "outlook"
      email_message_direction: "outbound" | "inbound"
      enrollment_status: "active" | "paused" | "completed" | "stopped"
      lead_status: "new" | "contacted" | "qualified" | "won" | "lost"
      opportunity_level: "high" | "medium" | "low"
      reply_temperature: "hot" | "warm" | "cold" | "neutral"
      step_status: "pending" | "sent" | "skipped"
      ticket_status: "open" | "in_progress" | "resolved"
      waitlist_status: "waiting" | "invited" | "converted" | "rejected"
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
      app_role: ["owner", "member"],
      email_account_provider: ["gmail", "outlook"],
      email_message_direction: ["outbound", "inbound"],
      enrollment_status: ["active", "paused", "completed", "stopped"],
      lead_status: ["new", "contacted", "qualified", "won", "lost"],
      opportunity_level: ["high", "medium", "low"],
      reply_temperature: ["hot", "warm", "cold", "neutral"],
      step_status: ["pending", "sent", "skipped"],
      ticket_status: ["open", "in_progress", "resolved"],
      waitlist_status: ["waiting", "invited", "converted", "rejected"],
    },
  },
} as const
