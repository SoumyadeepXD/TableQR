-- ============================================================================
-- TableQR: Multi-Restaurant QR Dine-in Ordering SaaS
-- Migration: 0001_initial_schema.sql
-- Description: Core schema, tables, relationships, constraints, and helper functions
-- ============================================================================

-- Enable pgcrypto for UUIDs if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. RESTAURANTS
CREATE TABLE IF NOT EXISTS public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    state TEXT DEFAULT 'Karnataka',
    pincode TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    brand_color TEXT NOT NULL DEFAULT '#ea580c',
    logo_url TEXT,
    banner_url TEXT,
    gstin TEXT,
    fssai_license TEXT,
    upi_id TEXT NOT NULL,
    upi_name TEXT NOT NULL,
    is_tax_inclusive BOOLEAN NOT NULL DEFAULT false,
    default_tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    is_service_charge_enabled BOOLEAN NOT NULL DEFAULT false,
    service_charge_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. RESTAURANT STAFF (Multi-tenant RBAC linked to auth.users)
CREATE TABLE IF NOT EXISTS public.restaurant_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'cashier', 'kitchen')),
    name TEXT NOT NULL,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(restaurant_id, user_id)
);

-- 3. TABLES
CREATE TABLE IF NOT EXISTS public.tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_number TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'Main Hall',
    capacity INTEGER NOT NULL DEFAULT 4,
    qr_token TEXT UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(restaurant_id, table_number)
);

-- 4. TABLE SESSIONS
CREATE TABLE IF NOT EXISTS public.table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    opened_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    closed_at TIMESTAMPTZ
);

-- 5. CATEGORIES
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. MENU ITEMS
CREATE TABLE IF NOT EXISTS public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_veg BOOLEAN NOT NULL DEFAULT true,
    is_available BOOLEAN NOT NULL DEFAULT true,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (tax_rate IN (0, 5, 12, 18, 28)),
    sort_order INTEGER NOT NULL DEFAULT 0,
    prep_time_minutes INTEGER NOT NULL DEFAULT 15,
    is_bestseller BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. ITEM VARIANTS (e.g. Size: Regular, Large / Portions: Half, Full)
CREATE TABLE IF NOT EXISTS public.item_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 8. ADDON GROUPS (e.g. "Choose Milk", "Add Toppings")
CREATE TABLE IF NOT EXISTS public.addon_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_selection INTEGER NOT NULL DEFAULT 0,
    max_selection INTEGER NOT NULL DEFAULT 1,
    is_required BOOLEAN NOT NULL DEFAULT false
);

-- 9. ADDON ITEMS
CREATE TABLE IF NOT EXISTS public.addon_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    addon_group_id UUID NOT NULL REFERENCES public.addon_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    is_available BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0
);

-- 10. ORDERS
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    order_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'cooking', 'ready', 'served', 'cancelled')),
    customer_note TEXT,
    idempotency_key TEXT,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. ORDER ITEMS
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
    variant_id UUID REFERENCES public.item_variants(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    variant_name TEXT,
    unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
    cooking_request TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'cooking', 'ready', 'served', 'cancelled')),
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 12. ORDER ITEM ADDONS
CREATE TABLE IF NOT EXISTS public.order_item_addons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    addon_item_id UUID REFERENCES public.addon_items(id) ON DELETE SET NULL,
    addon_name TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0)
);

-- 13. OFFERS AND COUPONS
CREATE TABLE IF NOT EXISTS public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    code TEXT,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    min_bill_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    max_discount_cap NUMERIC(10,2),
    start_date DATE,
    end_date DATE,
    happy_hour_start TIME,
    happy_hour_end TIME,
    days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
    applicable_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 14. INVOICES (Billing Engine records)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    financial_year TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    service_charge_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    round_off_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10,2) NOT NULL,
    applied_offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL,
    coupon_code TEXT,
    payment_method TEXT NOT NULL DEFAULT 'upi' CHECK (payment_method IN ('upi', 'cash', 'card', 'gateway_razorpay', 'gateway_cashfree')),
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
    paid_at TIMESTAMPTZ,
    marked_paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    gstin TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(restaurant_id, invoice_number)
);

-- 15. INVOICE SEQUENCES (Atomic sequential counters per restaurant per Indian FY)
CREATE TABLE IF NOT EXISTS public.invoice_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    financial_year TEXT NOT NULL,
    last_sequence_number INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(restaurant_id, financial_year)
);

-- 16. SERVICE REQUESTS ("Call Waiter", "Request Bill")
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    table_id UUID NOT NULL REFERENCES public.tables(id) ON DELETE CASCADE,
    table_session_id UUID NOT NULL REFERENCES public.table_sessions(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('call_waiter', 'request_bill')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 17. AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_restaurants_slug ON public.restaurants(slug);
CREATE INDEX IF NOT EXISTS idx_tables_qr_token ON public.tables(qr_token);
CREATE INDEX IF NOT EXISTS idx_tables_restaurant ON public.tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON public.table_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_table_sessions_active ON public.table_sessions(restaurant_id, table_id, status);
CREATE INDEX IF NOT EXISTS idx_categories_restaurant ON public.categories(restaurant_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_cat ON public.menu_items(restaurant_id, category_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_table_session ON public.orders(table_session_id);
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON public.orders(restaurant_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON public.service_requests(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_restaurant_staff_user ON public.restaurant_staff(user_id);

-- ============================================================================
-- HELPER FUNCTIONS & ATOMIC SEQUENCING
-- ============================================================================

-- Function to get Indian Financial Year string (e.g. 2026-27)
CREATE OR REPLACE FUNCTION public.get_current_indian_fy(ts TIMESTAMPTZ DEFAULT now())
RETURNS TEXT AS $$
DECLARE
    ist_time TIMESTAMP;
    v_year INT;
    v_month INT;
BEGIN
    ist_time := timezone('Asia/Kolkata', ts);
    v_year := EXTRACT(YEAR FROM ist_time)::INT;
    v_month := EXTRACT(MONTH FROM ist_time)::INT;

    IF v_month >= 4 THEN
        RETURN v_year || '-' || SUBSTRING((v_year + 1)::TEXT FROM 3 FOR 2);
    ELSE
        RETURN (v_year - 1) || '-' || SUBSTRING(v_year::TEXT FROM 3 FOR 2);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to atomically generate the next invoice number for an Indian FY
CREATE OR REPLACE FUNCTION public.generate_next_invoice_number(p_restaurant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_fy TEXT;
    v_seq INT;
    v_formatted TEXT;
BEGIN
    v_fy := public.get_current_indian_fy(now());

    -- Upsert and lock sequence row
    INSERT INTO public.invoice_sequences (restaurant_id, financial_year, last_sequence_number, updated_at)
    VALUES (p_restaurant_id, v_fy, 1, now())
    ON CONFLICT (restaurant_id, financial_year)
    DO UPDATE SET 
        last_sequence_number = public.invoice_sequences.last_sequence_number + 1,
        updated_at = now()
    RETURNING last_sequence_number INTO v_seq;

    -- Format: TQR/2026-27/0001
    v_formatted := 'TQR/' || v_fy || '/' || LPAD(v_seq::TEXT, 4, '0');
    RETURN v_formatted;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically get daily order number for a restaurant
CREATE OR REPLACE FUNCTION public.get_next_daily_order_number(p_restaurant_id UUID)
RETURNS INT AS $$
DECLARE
    v_today_start TIMESTAMPTZ;
    v_count INT;
BEGIN
    v_today_start := date_trunc('day', timezone('Asia/Kolkata', now()));
    SELECT COALESCE(MAX(order_number), 100) + 1 INTO v_count
    FROM public.orders
    WHERE restaurant_id = p_restaurant_id
      AND created_at >= v_today_start;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
