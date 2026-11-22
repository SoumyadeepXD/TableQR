import { NextRequest, NextResponse } from 'next/server';
import { CashfreeGateway } from '@/lib/payments/gateway/cashfree';
import { settleInvoiceFromGateway } from '@/lib/payments/gateway/service';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-webhook-signature header' },
        { status: 400 }
      );
    }

    const gateway = new CashfreeGateway();
    const eventResult = gateway.parseWebhook(rawBody, signature, timestamp);

    if (!eventResult.isValid) {
      console.warn('[Cashfree Webhook Warning] Invalid signature:', eventResult.errorMessage);
      return NextResponse.json(
        { error: eventResult.errorMessage || 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    console.log(`[Cashfree Webhook] Received Event: ${eventResult.eventType} for Order: ${eventResult.gatewayOrderId}`);

    if (eventResult.status === 'captured') {
      const admin = createAdminClient();
      let targetInvoiceId = eventResult.invoiceId;

      if (!targetInvoiceId && eventResult.gatewayOrderId) {
        const { data: tx } = await admin
          .from('payment_transactions')
          .select('invoice_id')
          .eq('gateway_order_id', eventResult.gatewayOrderId)
          .maybeSingle();

        if (tx) targetInvoiceId = tx.invoice_id;
      }

      if (targetInvoiceId) {
        const settlement = await settleInvoiceFromGateway({
          invoiceId: targetInvoiceId,
          gatewayOrderId: eventResult.gatewayOrderId,
          gatewayPaymentId: eventResult.gatewayPaymentId || `cf_pay_${Date.now()}`,
          amount: eventResult.amount,
          gateway: 'cashfree',
          webhookPayload: eventResult.rawPayload,
        });

        console.log(`[Cashfree Webhook] Invoice ${targetInvoiceId} settled:`, settlement.message);
      } else {
        console.warn(`[Cashfree Webhook] Could not match Order ${eventResult.gatewayOrderId} to an Invoice`);
      }
    }

    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Cashfree webhook handling failed';
    console.error('[Cashfree Webhook Error]', errorMsg);
    return NextResponse.json({ status: 'error', message: errorMsg }, { status: 200 });
  }
}
