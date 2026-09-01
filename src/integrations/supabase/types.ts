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
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_announcements: {
        Row: {
          active: boolean
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          kind: string
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      alert_logs: {
        Row: {
          channel: string
          created_at: string
          details: Json
          id: string
          kind: string
          recipient_name: string | null
          recipient_phone: string | null
          status: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          channel?: string
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Update: {
          channel?: string
          created_at?: string
          details?: Json
          id?: string
          kind?: string
          recipient_name?: string | null
          recipient_phone?: string | null
          status?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_at: string | null
          payment_channel: string
          payment_method: string
          plan: Database["public"]["Enums"]["sub_plan"]
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          screenshot_path: string
          sender_phone: string
          status: Database["public"]["Enums"]["pay_request_status"]
          transaction_reference: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_channel?: string
          payment_method: string
          plan: Database["public"]["Enums"]["sub_plan"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path: string
          sender_phone: string
          status?: Database["public"]["Enums"]["pay_request_status"]
          transaction_reference?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_channel?: string
          payment_method?: string
          plan?: Database["public"]["Enums"]["sub_plan"]
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          screenshot_path?: string
          sender_phone?: string
          status?: Database["public"]["Enums"]["pay_request_status"]
          transaction_reference?: string | null
          user_id?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          brand_name: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          id: boolean
          logo_url: string | null
          maintenance_message: string | null
          maintenance_mode: boolean
          notifications: Json
          plans: Json
          privacy: string | null
          saspay: Json
          terms: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          brand_name?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: boolean
          logo_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          notifications?: Json
          plans?: Json
          privacy?: string | null
          saspay?: Json
          terms?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          brand_name?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          id?: boolean
          logo_url?: string | null
          maintenance_message?: string | null
          maintenance_mode?: boolean
          notifications?: Json
          plans?: Json
          privacy?: string | null
          saspay?: Json
          terms?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          suspended: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          suspended?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          suspended?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          due_day: number
          id: string
          name: string
          rent_amount: number
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          due_day?: number
          id?: string
          name: string
          rent_amount?: number
          user_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          due_day?: number
          id?: string
          name?: string
          rent_amount?: number
          user_id?: string
        }
        Relationships: []
      }
      rent_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string | null
          note: string | null
          paid_at: string
          reference: string
          rent_record_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string
          reference?: string
          rent_record_id: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string | null
          note?: string | null
          paid_at?: string
          reference?: string
          rent_record_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_rent_record_id_fkey"
            columns: ["rent_record_id"]
            isOneToOne: false
            referencedRelation: "rent_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_rent_record_id_fkey"
            columns: ["rent_record_id"]
            isOneToOne: false
            referencedRelation: "rent_status_view"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_records: {
        Row: {
          amount_due: number
          created_at: string
          due_date: string
          id: string
          period: string
          property_id: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          amount_due: number
          created_at?: string
          due_date: string
          id?: string
          period: string
          property_id?: string | null
          tenant_id: string
          user_id?: string
        }
        Update: {
          amount_due?: number
          created_at?: string
          due_date?: string
          id?: string
          period?: string
          property_id?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          ends_at: string | null
          plan: Database["public"]["Enums"]["sub_plan"]
          started_at: string | null
          status: Database["public"]["Enums"]["sub_status"]
          trial_ends_at: string
          trial_started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ends_at?: string | null
          plan?: Database["public"]["Enums"]["sub_plan"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ends_at?: string | null
          plan?: Database["public"]["Enums"]["sub_plan"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["sub_status"]
          trial_ends_at?: string
          trial_started_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          active: boolean
          created_at: string
          due_day: number
          full_name: string
          id: string
          move_in_date: string | null
          phone: string
          property_id: string | null
          rent_amount: number
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          due_day?: number
          full_name: string
          id?: string
          move_in_date?: string | null
          phone: string
          property_id?: string | null
          rent_amount?: number
          user_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          due_day?: number
          full_name?: string
          id?: string
          move_in_date?: string | null
          phone?: string
          property_id?: string | null
          rent_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenants_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      rent_status_view: {
        Row: {
          amount_due: number | null
          balance: number | null
          due_date: string | null
          id: string | null
          paid_amount: number | null
          period: string | null
          property_id: string | null
          property_name: string | null
          status: string | null
          tenant_id: string | null
          tenant_name: string | null
          tenant_phone: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rent_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_alerts: { Args: { p_limit?: number }; Returns: Json }
      admin_analytics: { Args: { p_days?: number }; Returns: Json }
      admin_charts: { Args: { p_months?: number }; Returns: Json }
      admin_dashboard: { Args: never; Returns: Json }
      admin_delete_property: { Args: { p_id: string }; Returns: undefined }
      admin_delete_user: { Args: { p_user_id: string }; Returns: undefined }
      admin_level: { Args: { _user_id: string }; Returns: string }
      admin_list_admins: {
        Args: never
        Returns: {
          created_at: string
          email: string
          full_name: string
          level: string
          suspended: boolean
          user_id: string
        }[]
      }
      admin_logs: {
        Args: { p_limit?: number }
        Returns: {
          action: string
          admin_email: string
          created_at: string
          details: Json
          id: string
          user_email: string
          user_id: string
        }[]
      }
      admin_properties: {
        Args: { p_search?: string }
        Returns: {
          address: string
          created_at: string
          due_day: number
          id: string
          name: string
          next_due: string
          occupied: boolean
          owner_email: string
          owner_id: string
          owner_name: string
          rent_amount: number
          tenant_name: string
          tenant_phone: string
        }[]
      }
      admin_send_announcement: {
        Args: {
          p_audience?: string
          p_body: string
          p_kind?: string
          p_title: string
        }
        Returns: string
      }
      admin_set_level: {
        Args: { p_email: string; p_level: string }
        Returns: undefined
      }
      admin_set_subscription: {
        Args: { p_months?: number; p_plan: string; p_user_id: string }
        Returns: undefined
      }
      admin_set_suspended: {
        Args: { p_suspended: boolean; p_user_id: string }
        Returns: undefined
      }
      admin_stats: { Args: never; Returns: Json }
      admin_subscriptions: {
        Args: never
        Returns: {
          email: string
          ends_at: string
          full_name: string
          plan: Database["public"]["Enums"]["sub_plan"]
          started_at: string
          status: Database["public"]["Enums"]["sub_status"]
          trial_ends_at: string
          updated_at: string
          user_id: string
        }[]
      }
      admin_subscriptions_full: {
        Args: never
        Returns: {
          days_left: number
          email: string
          ends_at: string
          full_name: string
          plan: string
          price: number
          properties: number
          started_at: string
          status: string
          trial_ends_at: string
          user_id: string
        }[]
      }
      admin_toggle_announcement: {
        Args: { p_active: boolean; p_id: string }
        Returns: undefined
      }
      admin_update_property: {
        Args: {
          p_address: string
          p_due_day: number
          p_id: string
          p_name: string
          p_rent: number
        }
        Returns: undefined
      }
      admin_update_settings: { Args: { p_patch: Json }; Returns: undefined }
      admin_users: {
        Args: { p_search?: string }
        Returns: {
          created_at: string
          email: string
          ends_at: string
          full_name: string
          id: string
          phone: string
          plan: Database["public"]["Enums"]["sub_plan"]
          properties: number
          role: Database["public"]["Enums"]["app_role"]
          started_at: string
          status: Database["public"]["Enums"]["sub_status"]
          suspended: boolean
          trial_ends_at: string
        }[]
      }
      effective_status: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["sub_status"]
      }
      generate_rent_records: { Args: { p_period: string }; Returns: number }
      has_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      my_account: { Args: never; Returns: Json }
      plan_limit: { Args: { _user_id: string }; Returns: number }
      review_payment_request: {
        Args: { p_approve: boolean; p_reason?: string; p_request_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "admin" | "moderator" | "super_admin"
      pay_request_status: "pending" | "approved" | "rejected"
      sub_plan: "free" | "starter" | "pro" | "business"
      sub_status: "trial" | "active" | "expired" | "suspended"
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
      app_role: ["user", "admin", "moderator", "super_admin"],
      pay_request_status: ["pending", "approved", "rejected"],
      sub_plan: ["free", "starter", "pro", "business"],
      sub_status: ["trial", "active", "expired", "suspended"],
    },
  },
} as const
