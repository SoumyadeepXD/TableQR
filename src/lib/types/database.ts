export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen';
export type OrderStatus = 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
export type PaymentMethod = 'upi' | 'cash' | 'card' | 'gateway_razorpay' | 'gateway_cashfree';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type ServiceRequestType = 'call_waiter' | 'request_bill';
export type ServiceRequestStatus = 'pending' | 'acknowledged' | 'resolved';

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          tagline: string | null;
          description: string | null;
          phone: string | null;
          email: string | null;
          address: string | null;
          city: string;
          state: string;
          pincode: string | null;
          currency: string;
          timezone: string;
          brand_color: string;
          logo_url: string | null;
          banner_url: string | null;
          gstin: string | null;
          fssai_license: string | null;
          upi_id: string;
          upi_name: string;
          is_tax_inclusive: boolean;
          default_tax_rate: number;
          is_service_charge_enabled: boolean;
          service_charge_rate: number;
          is_active: boolean;
          gateway_provider: 'none' | 'razorpay' | 'cashfree';
          gateway_key_id: string | null;
          gateway_key_secret: string | null;
          gateway_webhook_secret: string | null;
          is_gateway_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          phone?: string | null;
          email?: string | null;
          address?: string | null;
          city?: string;
          state?: string;
          pincode?: string | null;
          currency?: string;
          timezone?: string;
          brand_color?: string;
          logo_url?: string | null;
          banner_url?: string | null;
          gstin?: string | null;
          fssai_license?: string | null;
          upi_id: string;
          upi_name: string;
          is_tax_inclusive?: boolean;
          default_tax_rate?: number;
          is_service_charge_enabled?: boolean;
          service_charge_rate?: number;
          is_active?: boolean;
          gateway_provider?: 'none' | 'razorpay' | 'cashfree';
          gateway_key_id?: string | null;
          gateway_key_secret?: string | null;
          gateway_webhook_secret?: string | null;
          is_gateway_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['restaurants']['Insert']>;
        Relationships: [];
      };
      restaurant_staff: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role: StaffRole;
          name: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id: string;
          role: StaffRole;
          name: string;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['restaurant_staff']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "restaurant_staff_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      tables: {
        Row: {
          id: string;
          restaurant_id: string;
          table_number: string;
          section: string;
          capacity: number;
          qr_token: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_number: string;
          section?: string;
          capacity?: number;
          qr_token: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tables']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "tables_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      table_sessions: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          session_token: string;
          status: 'active' | 'completed' | 'cancelled';
          opened_at: string;
          closed_at: string | null;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          session_token: string;
          status?: 'active' | 'completed' | 'cancelled';
          opened_at?: string;
          closed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['table_sessions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "table_sessions_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "table_sessions_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      categories: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          description: string | null;
          sort_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          name: string;
          description?: string | null;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "categories_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      menu_items: {
        Row: {
          id: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description: string | null;
          price: number;
          image_url: string | null;
          is_veg: boolean;
          is_available: boolean;
          tax_rate: number;
          sort_order: number;
          prep_time_minutes: number;
          is_bestseller: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          price: number;
          image_url?: string | null;
          is_veg?: boolean;
          is_available?: boolean;
          tax_rate?: number;
          sort_order?: number;
          prep_time_minutes?: number;
          is_bestseller?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "menu_items_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      item_variants: {
        Row: {
          id: string;
          restaurant_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          is_available: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          menu_item_id: string;
          name: string;
          price: number;
          is_available?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['item_variants']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "item_variants_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          }
        ];
      };
      addon_groups: {
        Row: {
          id: string;
          restaurant_id: string;
          menu_item_id: string;
          name: string;
          min_selection: number;
          max_selection: number;
          is_required: boolean;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          menu_item_id: string;
          name: string;
          min_selection?: number;
          max_selection?: number;
          is_required?: boolean;
        };
        Update: Partial<Database['public']['Tables']['addon_groups']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "addon_groups_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          }
        ];
      };
      addon_items: {
        Row: {
          id: string;
          restaurant_id: string;
          addon_group_id: string;
          name: string;
          price: number;
          is_available: boolean;
          sort_order: number;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          addon_group_id: string;
          name: string;
          price?: number;
          is_available?: boolean;
          sort_order?: number;
        };
        Update: Partial<Database['public']['Tables']['addon_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "addon_items_addon_group_id_fkey";
            columns: ["addon_group_id"];
            isOneToOne: false;
            referencedRelation: "addon_groups";
            referencedColumns: ["id"];
          }
        ];
      };
      orders: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          table_session_id: string;
          order_number: number;
          status: OrderStatus;
          customer_note: string | null;
          idempotency_key: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          table_session_id: string;
          order_number: number;
          status?: OrderStatus;
          customer_note?: string | null;
          idempotency_key?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "orders_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_table_session_id_fkey";
            columns: ["table_session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          restaurant_id: string;
          order_id: string;
          menu_item_id: string;
          variant_id: string | null;
          item_name: string;
          variant_name: string | null;
          unit_price: number;
          quantity: number;
          tax_rate: number;
          cooking_request: string | null;
          status: OrderStatus;
          cancellation_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          order_id: string;
          menu_item_id: string;
          variant_id?: string | null;
          item_name: string;
          variant_name?: string | null;
          unit_price: number;
          quantity: number;
          tax_rate?: number;
          cooking_request?: string | null;
          status?: OrderStatus;
          cancellation_reason?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['order_items']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_menu_item_id_fkey";
            columns: ["menu_item_id"];
            isOneToOne: false;
            referencedRelation: "menu_items";
            referencedColumns: ["id"];
          }
        ];
      };
      order_item_addons: {
        Row: {
          id: string;
          order_item_id: string;
          addon_item_id: string | null;
          addon_name: string;
          price: number;
        };
        Insert: {
          id?: string;
          order_item_id: string;
          addon_item_id?: string | null;
          addon_name: string;
          price?: number;
        };
        Update: Partial<Database['public']['Tables']['order_item_addons']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          }
        ];
      };
      offers: {
        Row: {
          id: string;
          restaurant_id: string;
          code: string | null;
          title: string;
          description: string | null;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          min_bill_amount: number;
          max_discount_cap: number | null;
          start_date: string | null;
          end_date: string | null;
          happy_hour_start: string | null;
          happy_hour_end: string | null;
          days_of_week: number[] | null;
          applicable_category_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          code?: string | null;
          title: string;
          description?: string | null;
          discount_type: 'percentage' | 'flat';
          discount_value: number;
          min_bill_amount?: number;
          max_discount_cap?: number | null;
          start_date?: string | null;
          end_date?: string | null;
          happy_hour_start?: string | null;
          happy_hour_end?: string | null;
          days_of_week?: number[] | null;
          applicable_category_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['offers']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "offers_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          }
        ];
      };
      invoices: {
        Row: {
          id: string;
          restaurant_id: string;
          table_session_id: string;
          invoice_number: string;
          financial_year: string;
          subtotal: number;
          discount_amount: number;
          service_charge_amount: number;
          cgst_amount: number;
          sgst_amount: number;
          round_off_amount: number;
          total_amount: number;
          applied_offer_id: string | null;
          coupon_code: string | null;
          payment_method: PaymentMethod;
          payment_status: PaymentStatus;
          paid_at: string | null;
          marked_paid_by: string | null;
          gstin: string | null;
          gateway_order_id: string | null;
          gateway_payment_id: string | null;
          gateway_signature: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_session_id: string;
          invoice_number: string;
          financial_year: string;
          subtotal: number;
          discount_amount?: number;
          service_charge_amount?: number;
          cgst_amount?: number;
          sgst_amount?: number;
          round_off_amount?: number;
          total_amount: number;
          applied_offer_id?: string | null;
          coupon_code?: string | null;
          payment_method?: PaymentMethod;
          payment_status?: PaymentStatus;
          paid_at?: string | null;
          marked_paid_by?: string | null;
          gstin?: string | null;
          gateway_order_id?: string | null;
          gateway_payment_id?: string | null;
          gateway_signature?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invoices']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "invoices_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_table_session_id_fkey";
            columns: ["table_session_id"];
            isOneToOne: false;
            referencedRelation: "table_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "invoices_applied_offer_id_fkey";
            columns: ["applied_offer_id"];
            isOneToOne: false;
            referencedRelation: "offers";
            referencedColumns: ["id"];
          }
        ];
      };
      invoice_sequences: {
        Row: {
          id: string;
          restaurant_id: string;
          financial_year: string;
          last_sequence_number: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          financial_year: string;
          last_sequence_number?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['invoice_sequences']['Insert']>;
        Relationships: [];
      };
      service_requests: {
        Row: {
          id: string;
          restaurant_id: string;
          table_id: string;
          table_session_id: string;
          type: ServiceRequestType;
          status: ServiceRequestStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          table_id: string;
          table_session_id: string;
          type: ServiceRequestType;
          status?: ServiceRequestStatus;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['service_requests']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "service_requests_table_id_fkey";
            columns: ["table_id"];
            isOneToOne: false;
            referencedRelation: "tables";
            referencedColumns: ["id"];
          }
        ];
      };
      audit_logs: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['audit_logs']['Insert']>;
        Relationships: [];
      };
      payment_transactions: {
        Row: {
          id: string;
          restaurant_id: string;
          invoice_id: string;
          gateway: 'razorpay' | 'cashfree' | 'mock';
          gateway_order_id: string;
          gateway_payment_id: string | null;
          amount: number;
          currency: string;
          status: 'created' | 'captured' | 'failed' | 'refunded';
          idempotency_key: string | null;
          webhook_payload: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          restaurant_id: string;
          invoice_id: string;
          gateway: 'razorpay' | 'cashfree' | 'mock';
          gateway_order_id: string;
          gateway_payment_id?: string | null;
          amount: number;
          currency?: string;
          status?: 'created' | 'captured' | 'failed' | 'refunded';
          idempotency_key?: string | null;
          webhook_payload?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['payment_transactions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: "payment_transactions_restaurant_id_fkey";
            columns: ["restaurant_id"];
            isOneToOne: false;
            referencedRelation: "restaurants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_transactions_invoice_id_fkey";
            columns: ["invoice_id"];
            isOneToOne: false;
            referencedRelation: "invoices";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_current_indian_fy: {
        Args: { ts?: string };
        Returns: string;
      };
      generate_next_invoice_number: {
        Args: { p_restaurant_id: string };
        Returns: string;
      };
      get_next_daily_order_number: {
        Args: { p_restaurant_id: string };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
