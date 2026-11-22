import { NextRequest, NextResponse } from 'next/server';
import { RazorpayGateway } from '@/lib/payments/gateway/razorpay';
import { settleInvoiceFromGateway } from '@/lib/payments/gateway/service';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature') || '';

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing x-razorpay-signature header' },
        { status: 400 }
      );
    }

    const gateway = new RazorpayGateway();
    const eventResult = gateway.parseWebhook(rawBody, signature);

    if (!eventResult.isValid) {
      console.warn('[Razorpay Webhook Warning] Invalid signature:', eventResult.errorMessage);
      return NextResponse.json(
        { error: eventResult.errorMessage || 'Invalid webhook signature' },
        { status: 400 }
      );
    }

    console.log(`[Razorpay Webhook] Received Event: ${eventResult.eventType} for Order: ${eventResult.gatewayOrderId}`);

    // Process only payment success events
    if (eventResult.status === 'captured') {
      const admin = createAdminClient();
      let targetInvoiceId = eventResult.invoiceId;

      // Fallback: lookup invoiceId from payment_transactions if not in webhook notes
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
          gatewayPaymentId: eventResult.gatewayPaymentId || `pay_${Date.now()}`,
          amount: eventResult.amount,
          gateway: 'razorpay',
          webhookPayload: eventResult.rawPayload,
        });

        console.log(`[Razorpay Webhook] Invoice ${targetInvoiceId} settled:`, settlement.message);
      } else {
        console.warn(`[Razorpay Webhook] Could not match Order ${eventResult.gatewayOrderId} to an Invoice`);
      }
    }

    // Always acknowledge 200 OK to Razorpay servers
    return NextResponse.json({ status: 'ok', received: true });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Webhook handling failed';
    console.error('[Razorpay Webhook Error]', errorMsg);
    // Return 200 with error notice to prevent endless webhook retries while logging error
    return NextResponse.json({ status: 'error', message: errorMsg }, { status: 200 });
  }
}
