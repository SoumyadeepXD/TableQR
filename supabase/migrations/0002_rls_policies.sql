-- ============================================================================
-- TableQR: Multi-Restaurant QR Dine-in Ordering SaaS
-- Migration: 0002_rls_policies.sql
-- Description: Row Level Security (RLS) policies and helper functions
-- ============================================================================

-- Helper functions for RBAC and tenant resolution
CREATE OR REPLACE FUNCTION public.get_staff_restaurant_id()
RETURNS UUID AS $$
    SELECT restaurant_id 
    FROM public.restaurant_staff 
    WHERE user_id = auth.uid() 
      AND is_active = true 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_staff_role()
RETURNS TEXT AS $$
    SELECT role 
    FROM public.restaurant_staff 
    WHERE user_id = auth.uid() 
      AND is_active = true 
    LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Enable RLS on all 17 tables
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addon_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 1. RESTAURANTS POLICIES
-- ============================================================================
-- Public can view active restaurants (e.g. for customer customer app header, slug lookup)
CREATE POLICY "Public can view active restaurants"
    ON public.restaurants FOR SELECT
    USING (is_active = true);

-- Staff can view their own restaurant
CREATE POLICY "Staff can view their restaurant"
    ON public.restaurants FOR SELECT
    TO authenticated
    USING (id = public.get_staff_restaurant_id());

-- Owner and Manager can update their restaurant profile
CREATE POLICY "Owner/Manager can update restaurant"
    ON public.restaurants FOR UPDATE
    TO authenticated
    USING (id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

-- ============================================================================
-- 2. RESTAURANT STAFF POLICIES
-- ============================================================================
-- Staff can view other staff within the same restaurant
CREATE POLICY "Staff can view their restaurant staff"
    ON public.restaurant_staff FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

-- Only Owner can insert/update/delete staff
CREATE POLICY "Owner can manage staff"
    ON public.restaurant_staff FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() = 'owner')
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() = 'owner');

-- ============================================================================
-- 3. TABLES POLICIES
-- ============================================================================
-- Public can view active tables (for QR token validation)
CREATE POLICY "Public can view active tables by token"
    ON public.tables FOR SELECT
    USING (is_active = true);

-- Staff can view all tables in their restaurant
CREATE POLICY "Staff can view tables"
    ON public.tables FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

-- Owner/Manager can manage tables
CREATE POLICY "Owner/Manager can manage tables"
    ON public.tables FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

-- ============================================================================
-- 4. TABLE SESSIONS POLICIES
-- ============================================================================
-- Public can view active table session by token or session id
CREATE POLICY "Public can view sessions"
    ON public.table_sessions FOR SELECT
    USING (true);

-- Public can start a table session
CREATE POLICY "Public can insert session"
    ON public.table_sessions FOR INSERT
    WITH CHECK (true);

-- Staff can view and manage table sessions in their restaurant
CREATE POLICY "Staff can manage table sessions"
    ON public.table_sessions FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id())
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id());

-- ============================================================================
-- 5. MENU: CATEGORIES, ITEMS, VARIANTS, ADDONS
-- ============================================================================
-- Public can view active categories and items
CREATE POLICY "Public can view categories"
    ON public.categories FOR SELECT
    USING (is_active = true);

CREATE POLICY "Public can view menu items"
    ON public.menu_items FOR SELECT
    USING (true);

CREATE POLICY "Public can view variants"
    ON public.item_variants FOR SELECT
    USING (true);

CREATE POLICY "Public can view addon groups"
    ON public.addon_groups FOR SELECT
    USING (true);

CREATE POLICY "Public can view addon items"
    ON public.addon_items FOR SELECT
    USING (true);

-- Staff can view all menu data for their restaurant
CREATE POLICY "Staff view categories"
    ON public.categories FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Staff view menu items"
    ON public.menu_items FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Staff view variants"
    ON public.item_variants FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Staff view addon groups"
    ON public.addon_groups FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Staff view addon items"
    ON public.addon_items FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

-- Owner/Manager can modify menu
CREATE POLICY "Owner/Manager manage categories"
    ON public.categories FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager manage menu items"
    ON public.menu_items FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager manage variants"
    ON public.item_variants FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager manage addon groups"
    ON public.addon_groups FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager manage addon items"
    ON public.addon_items FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

-- Kitchen can toggle item & variant availability
CREATE POLICY "Kitchen toggle item availability"
    ON public.menu_items FOR UPDATE
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() = 'kitchen')
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() = 'kitchen');

CREATE POLICY "Kitchen toggle variant availability"
    ON public.item_variants FOR UPDATE
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() = 'kitchen')
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() = 'kitchen');

-- ============================================================================
-- 6. ORDERS & ORDER ITEMS POLICIES
-- ============================================================================
-- Public can view orders belonging to active sessions
CREATE POLICY "Public can view orders"
    ON public.orders FOR SELECT
    USING (true);

-- Public can place orders
CREATE POLICY "Public can insert orders"
    ON public.orders FOR INSERT
    WITH CHECK (true);

-- Staff can view all orders in their restaurant
CREATE POLICY "Staff can view orders"
    ON public.orders FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

-- Staff can update orders (e.g. status transition, cancellation)
CREATE POLICY "Staff can update orders"
    ON public.orders FOR UPDATE
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id())
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id());

-- ORDER ITEMS
CREATE POLICY "Public view order items"
    ON public.order_items FOR SELECT
    USING (true);

CREATE POLICY "Public insert order items"
    ON public.order_items FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff view order items"
    ON public.order_items FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Staff update order items"
    ON public.order_items FOR UPDATE
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id())
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id());

-- ORDER ITEM ADDONS
CREATE POLICY "Public view order item addons"
    ON public.order_item_addons FOR SELECT
    USING (true);

CREATE POLICY "Public insert order item addons"
    ON public.order_item_addons FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Staff view order item addons"
    ON public.order_item_addons FOR SELECT
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.order_items oi 
        WHERE oi.id = order_item_id AND oi.restaurant_id = public.get_staff_restaurant_id()
    ));

-- ============================================================================
-- 7. OFFERS POLICIES
-- ============================================================================
CREATE POLICY "Public view active offers"
    ON public.offers FOR SELECT
    USING (is_active = true);

CREATE POLICY "Staff view offers"
    ON public.offers FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Owner/Manager manage offers"
    ON public.offers FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

-- ============================================================================
-- 8. INVOICES & SEQUENCES POLICIES
-- ============================================================================
CREATE POLICY "Public view invoice for session"
    ON public.invoices FOR SELECT
    USING (true);

CREATE POLICY "Staff view invoices"
    ON public.invoices FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Cashier/Manager/Owner manage invoices"
    ON public.invoices FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager', 'cashier'))
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager', 'cashier'));

CREATE POLICY "Staff access invoice sequences"
    ON public.invoice_sequences FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id())
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id());

-- ============================================================================
-- 9. SERVICE REQUESTS POLICIES
-- ============================================================================
CREATE POLICY "Public insert service requests"
    ON public.service_requests FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Public view service requests"
    ON public.service_requests FOR SELECT
    USING (true);

CREATE POLICY "Staff manage service requests"
    ON public.service_requests FOR ALL
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id())
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id());

-- ============================================================================
-- 10. AUDIT LOGS POLICIES
-- ============================================================================
CREATE POLICY "Staff insert audit logs"
    ON public.audit_logs FOR INSERT
    TO authenticated
    WITH CHECK (restaurant_id = public.get_staff_restaurant_id());

CREATE POLICY "Owner/Manager view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (restaurant_id = public.get_staff_restaurant_id() AND public.get_staff_role() IN ('owner', 'manager'));

-- ============================================================================
-- ENABLE REALTIME ON RELEVANT TABLES
-- ============================================================================
DO $$
BEGIN
    -- Check if supabase_realtime publication exists and add tables
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_requests;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.menu_items;
        ALTER PUBLICATION supabase_realtime ADD TABLE public.table_sessions;
    END IF;
END $$;
