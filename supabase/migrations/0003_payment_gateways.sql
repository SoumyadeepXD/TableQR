-- ==============================================================================
-- TableQR Migration 0003: Payment Gateways (Razorpay & Cashfree) & Idempotency
-- ==============================================================================

-- 1. Add Gateway Configurations to Restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS gateway_provider TEXT NOT NULL DEFAULT 'none' CHECK (gateway_provider IN ('none', 'razorpay', 'cashfree')),
ADD COLUMN IF NOT EXISTS gateway_key_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_key_secret TEXT,
ADD COLUMN IF NOT EXISTS gateway_webhook_secret TEXT,
ADD COLUMN IF NOT EXISTS is_gateway_enabled BOOLEAN NOT NULL DEFAULT false;

-- 2. Add Gateway Tracking to Invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS gateway_order_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT,
ADD COLUMN IF NOT EXISTS gateway_signature TEXT;

-- 3. Payment Transactions Table (for idempotency, webhooks & audit)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    gateway TEXT NOT NULL CHECK (gateway IN ('razorpay', 'cashfree', 'mock')),
    gateway_order_id TEXT NOT NULL,
    gateway_payment_id TEXT,
    amount NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'captured', 'failed', 'refunded')),
    idempotency_key TEXT UNIQUE,
    webhook_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS on payment_transactions
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Staff Policy: Can read transactions for their restaurant
CREATE POLICY "Staff can view payment transactions for their restaurant"
    ON public.payment_transactions
    FOR SELECT
    USING (
        restaurant_id = public.get_staff_restaurant_id()
    );

-- Indexes for lightning fast lookups & webhook deduplication
CREATE INDEX IF NOT EXISTS idx_payment_transactions_restaurant_id ON public.payment_transactions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_invoice_id ON public.payment_transactions(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway_order_id ON public.payment_transactions(gateway_order_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_idempotency_key ON public.payment_transactions(idempotency_key);
