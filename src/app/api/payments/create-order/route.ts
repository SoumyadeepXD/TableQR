import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPaymentOrderForInvoice } from '@/lib/payments/gateway/service';
import { PaymentGatewayProvider } from '@/lib/payments/gateway/types';
import { createAdminClient } from '@/lib/supabase/admin';

const CreateOrderSchema = z
  .object({
    invoiceId: z.string().uuid().optional(),
    sessionToken: z.string().min(1).optional(),
    gateway: z.enum(['razorpay', 'cashfree', 'mock']).optional().default('razorpay'),
  })
  .refine((data) => data.invoiceId || data.sessionToken, {
    message: 'Must provide either invoiceId or sessionToken',
  });

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = CreateOrderSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid order parameters', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { gateway } = parsed.data;
    let targetInvoiceId = parsed.data.invoiceId;

    if (!targetInvoiceId && parsed.data.sessionToken) {
      const admin = createAdminClient();
      const { data: session } = await admin
        .from('table_sessions')
        .select('id')
        .eq('session_token', parsed.data.sessionToken)
        .maybeSingle();

      if (!session) {
        return NextResponse.json({ error: 'Invalid session token' }, { status: 404 });
      }

      const { data: existingInv } = await admin
        .from('invoices')
        .select('id')
        .eq('table_session_id', session.id)
        .maybeSingle();

      if (existingInv) {
        targetInvoiceId = existingInv.id;
      } else {
        return NextResponse.json(
          { error: 'No invoice found for this session yet' },
          { status: 404 }
        );
      }
    }

    if (!targetInvoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const orderResult = await createPaymentOrderForInvoice(
      targetInvoiceId,
      gateway as PaymentGatewayProvider
    );

    return NextResponse.json({
      success: true,
      order: orderResult,
      invoiceId: targetInvoiceId,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create payment order';
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }
}
