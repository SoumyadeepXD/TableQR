/**
 * TableQR Payment Gateway Service
 * 
 * Coordinates Razorpay & Cashfree operations, enforces strict idempotency,
 * prevents double payments, and records audit logs and transactions.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { RazorpayGateway } from './razorpay';
import { CashfreeGateway } from './cashfree';
import {
  CreateGatewayOrderParams,
  GatewayOrderResult,
  PaymentGatewayProvider,
  RestaurantGatewayConfig,
  WebhookEventResult,
} from './types';

/**
 * Returns the appropriate gateway instance for a restaurant
 */
export function getPaymentGateway(
  provider: PaymentGatewayProvider = 'razorpay',
  config?: Partial<RestaurantGatewayConfig>
) {
  if (provider === 'cashfree') {
    return new CashfreeGateway(config);
  }
  return new RazorpayGateway(config);
}

/**
 * Creates an order for an unpaid invoice
 */
export async function createPaymentOrderForInvoice(
  invoiceId: string,
  preferredGateway: PaymentGatewayProvider = 'razorpay'
): Promise<GatewayOrderResult> {
  const admin = createAdminClient();

  // 1. Fetch invoice and table details
  const { data: invoice, error: invError } = await admin
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total_amount,
      payment_status,
      restaurant_id,
      table_session_id,
      table_sessions (
        id,
        table_id,
        tables (
          table_number
        )
      ),
      restaurants (
        id,
        name,
        gateway_provider,
        gateway_key_id,
        gateway_key_secret,
        gateway_webhook_secret,
        is_gateway_enabled,
        upi_id
      )
    `)
    .eq('id', invoiceId)
    .single();

  if (invError || !invoice) {
    throw new Error(`Invoice not found: ${invError?.message || invoiceId}`);
  }

  if (invoice.payment_status === 'paid') {
    throw new Error('This invoice has already been paid and settled.');
  }

  const restaurantData = Array.isArray(invoice.restaurants)
    ? invoice.restaurants[0]
    : invoice.restaurants;

  const sessionData = Array.isArray(invoice.table_sessions)
    ? invoice.table_sessions[0]
    : invoice.table_sessions;

  const tableData = sessionData?.tables
    ? Array.isArray(sessionData.tables)
      ? sessionData.tables[0]
      : sessionData.tables
    : null;

  const tableNumber = tableData?.table_number || 'T-?';

  // Determine gateway provider
  const chosenProvider: PaymentGatewayProvider =
    (restaurantData?.gateway_provider as PaymentGatewayProvider) || preferredGateway || 'razorpay';

  const gateway = getPaymentGateway(chosenProvider, {
    provider: chosenProvider,
    keyId: restaurantData?.gateway_key_id,
    keySecret: restaurantData?.gateway_key_secret,
    webhookSecret: restaurantData?.gateway_webhook_secret,
    isEnabled: restaurantData?.is_gateway_enabled ?? false,
    upiId: restaurantData?.upi_id,
  });

  const orderParams: CreateGatewayOrderParams = {
    amount: Number(invoice.total_amount),
    currency: 'INR',
    invoiceNumber: invoice.invoice_number,
    invoiceId: invoice.id,
    restaurantId: invoice.restaurant_id,
    restaurantName: restaurantData?.name || 'TableQR Cafe',
    tableNumber,
  };

  const orderResult = await gateway.createOrder(orderParams);

  // 2. Record in payment_transactions table for idempotency
  await admin.from('payment_transactions').insert({
    restaurant_id: invoice.restaurant_id,
    invoice_id: invoice.id,
    gateway: chosenProvider,
    gateway_order_id: orderResult.gatewayOrderId,
    amount: orderResult.amount,
    currency: 'INR',
    status: 'created',
    idempotency_key: `order_${invoice.id}_${orderResult.gatewayOrderId}`,
  });

  // 3. Update invoice with gateway order id
  await admin
    .from('invoices')
    .update({
      gateway_order_id: orderResult.gatewayOrderId,
    })
    .eq('id', invoice.id);

  return orderResult;
}

export interface SettleInvoiceParams {
  invoiceId: string;
  gatewayOrderId: string;
  gatewayPaymentId: string;
  amount: number;
  gateway: PaymentGatewayProvider;
  webhookPayload?: Record<string, unknown>;
  signature?: string;
}

export interface SettleInvoiceResult {
  success: boolean;
  alreadyPaid: boolean;
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAt: string;
  message?: string;
}

/**
 * Idempotently settles an invoice upon successful gateway payment
 * Prevents double payments and logs audit trail.
 */
export async function settleInvoiceFromGateway(
  params: SettleInvoiceParams
): Promise<SettleInvoiceResult> {
  const admin = createAdminClient();

  // 1. Fetch existing invoice
  const { data: invoice, error: invError } = await admin
    .from('invoices')
    .select('*')
    .eq('id', params.invoiceId)
    .single();

  if (invError || !invoice) {
    throw new Error(`Invoice not found for settlement: ${params.invoiceId}`);
  }

  // Idempotency: If already paid, return early with current invoice
  if (invoice.payment_status === 'paid') {
    return {
      success: true,
      alreadyPaid: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      totalAmount: Number(invoice.total_amount),
      paidAt: invoice.paid_at || new Date().toISOString(),
      message: 'Invoice was already settled previously. No duplicate action performed.',
    };
  }

  // 2. Amount verification check (Allow ₹1.00 tolerance for symmetric round-off differences)
  const expectedAmount = Number(invoice.total_amount);
  const diff = Math.abs(expectedAmount - params.amount);
  if (diff > 1.0) {
    throw new Error(
      `Payment amount mismatch! Expected ₹${expectedAmount}, received ₹${params.amount}. Settlement rejected.`
    );
  }

  const nowIso = new Date().toISOString();
  const paymentMethodStr =
    params.gateway === 'cashfree' ? 'gateway_cashfree' : 'gateway_razorpay';

  // 3. Atomically update invoice to paid
  const { error: updateError } = await admin
    .from('invoices')
    .update({
      payment_status: 'paid',
      payment_method: paymentMethodStr as 'gateway_razorpay' | 'gateway_cashfree',
      paid_at: nowIso,
      gateway_payment_id: params.gatewayPaymentId,
      gateway_order_id: params.gatewayOrderId,
      gateway_signature: params.signature || null,
    })
    .eq('id', invoice.id)
    .eq('payment_status', 'unpaid'); // Optimistic concurrency check

  if (updateError) {
    throw new Error(`Failed to update invoice payment status: ${updateError.message}`);
  }

  // 4. Update or insert payment_transactions record
  await admin
    .from('payment_transactions')
    .update({
      status: 'captured',
      gateway_payment_id: params.gatewayPaymentId,
      webhook_payload: (params.webhookPayload || {}) as any,
      updated_at: nowIso,
    })
    .eq('gateway_order_id', params.gatewayOrderId);

  // 5. Record audit log
  await admin.from('audit_logs').insert({
    restaurant_id: invoice.restaurant_id,
    user_id: null,
    action: 'gateway_payment_captured',
    entity_type: 'invoices',
    entity_id: invoice.id,
    details: {
      gateway: params.gateway,
      gatewayOrderId: params.gatewayOrderId,
      gatewayPaymentId: params.gatewayPaymentId,
      amount: params.amount,
      invoiceNumber: invoice.invoice_number,
      settledAt: nowIso,
    },
  });

  // 6. Resolve any pending 'request_bill' service requests for this session
  if (invoice.table_session_id) {
    await admin
      .from('service_requests')
      .update({ status: 'resolved' })
      .eq('table_session_id', invoice.table_session_id)
      .eq('type', 'request_bill');
  }

  return {
    success: true,
    alreadyPaid: false,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoice_number,
    totalAmount: expectedAmount,
    paidAt: nowIso,
    message: `Payment of ₹${expectedAmount} confirmed via ${params.gateway.toUpperCase()}`,
  };
}
