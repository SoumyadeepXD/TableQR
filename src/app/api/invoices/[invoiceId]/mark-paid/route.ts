import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const markPaidSchema = z.object({
  paymentMethod: z.enum(['cash', 'upi', 'card']),
  amountReceived: z.number().nonnegative().optional(),
  notes: z.string().max(200).optional(),
});

interface RouteParams {
  params: Promise<{
    invoiceId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { invoiceId } = await params;
    const json = await request.json();
    const result = markPaidSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payment details', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { paymentMethod, amountReceived, notes } = result.data;
    const supabase = await createClient();

    // 1. Verify staff authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify staff role
    const { data: staffMember, error: staffError } = await supabase
      .from('restaurant_staff')
      .select('restaurant_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 403 });
    }

    if (!['owner', 'manager', 'cashier'].includes(staffMember.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to mark invoices as paid' },
        { status: 403 }
      );
    }

    // 3. Fetch invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('restaurant_id', staffMember.restaurant_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const paidAt = new Date().toISOString();
    const totalAmount = Number(invoice.total_amount);
    let changeDue = 0;

    if (paymentMethod === 'cash' && amountReceived !== undefined) {
      changeDue = Math.max(0, Number((amountReceived - totalAmount).toFixed(2)));
    }

    // 4. Mark invoice as paid
    const { data: updatedInvoice, error: updateInvoiceError } = await supabase
      .from('invoices')
      .update({
        payment_status: 'paid',
        payment_method: paymentMethod,
        paid_at: paidAt,
        marked_paid_by: user.id,
      })
      .eq('id', invoiceId)
      .select('*')
      .single();

    if (updateInvoiceError || !updatedInvoice) {
      throw new Error(`Failed to update invoice: ${updateInvoiceError?.message}`);
    }

    // 5. Complete table session
    await supabase
      .from('table_sessions')
      .update({
        status: 'completed',
        closed_at: paidAt,
      })
      .eq('id', invoice.table_session_id);

    // 6. Resolve all pending service requests for this session
    await supabase
      .from('service_requests')
      .update({ status: 'resolved' })
      .eq('table_session_id', invoice.table_session_id)
      .eq('status', 'pending');

    // 7. Insert audit log
    await supabase
      .from('audit_logs')
      .insert({
        restaurant_id: staffMember.restaurant_id,
        user_id: user.id,
        action: 'invoice_marked_paid',
        entity_type: 'invoice',
        entity_id: invoice.id,
        details: {
          invoice_number: invoice.invoice_number,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          amount_received: amountReceived || null,
          change_due: changeDue,
          table_session_id: invoice.table_session_id,
          notes: notes || null,
          staff_role: staffMember.role,
        },
      });

    return NextResponse.json({
      success: true,
      invoice: updatedInvoice,
      changeDue,
      message: `Invoice #${invoice.invoice_number} marked paid via ${paymentMethod.toUpperCase()}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to settle invoice';
    console.error('Error marking invoice paid:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
