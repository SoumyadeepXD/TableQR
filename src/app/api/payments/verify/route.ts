import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getPaymentGateway, settleInvoiceFromGateway } from '@/lib/payments/gateway/service';
import { PaymentGatewayProvider } from '@/lib/payments/gateway/types';
import { createAdminClient } from '@/lib/supabase/admin';

const VerifyPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  gateway: z.enum(['razorpay', 'cashfree', 'mock']).default('razorpay'),
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = VerifyPaymentSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid verification parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { invoiceId, gateway, orderId, paymentId, signature } = parsed.data;

    const admin = createAdminClient();

    // 1. Fetch invoice to verify total amount and restaurant keys
    const { data: invoice, error: invError } = await admin
      .from('invoices')
      .select(`
        id,
        invoice_number,
        total_amount,
        payment_status,
        restaurant_id,
        restaurants (
          gateway_provider,
          gateway_key_secret,
          gateway_key_id
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // 2. Cryptographic signature check
    const restaurantData = Array.isArray(invoice.restaurants)
      ? invoice.restaurants[0]
      : invoice.restaurants;

    const gatewayAdapter = getPaymentGateway(gateway as PaymentGatewayProvider, {
      keySecret: restaurantData?.gateway_key_secret,
      keyId: restaurantData?.gateway_key_id,
    });

    const isSignatureValid = gatewayAdapter.verifyPayment(orderId, paymentId, signature);

    if (!isSignatureValid) {
      return NextResponse.json(
        { error: 'Cryptographic signature verification failed! Possible payment tampering.' },
        { status: 400 }
      );
    }

    // 3. Idempotently settle invoice
    const settlementResult = await settleInvoiceFromGateway({
      invoiceId: invoice.id,
      gatewayOrderId: orderId,
      gatewayPaymentId: paymentId,
      amount: Number(invoice.total_amount),
      gateway: gateway as PaymentGatewayProvider,
      signature,
    });

    return NextResponse.json({
      success: true,
      result: settlementResult,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Payment verification failed';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
