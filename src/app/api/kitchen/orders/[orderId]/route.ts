import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateOrderStatusSchema } from '@/lib/validations/order';

interface RouteParams {
  params: Promise<{
    orderId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderId } = await params;
    const json = await request.json();
    const result = updateOrderStatusSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid status update', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { status, cancellationReason } = result.data;
    const supabase = await createClient();

    // Verify staff authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData: {
      status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
      cancellation_reason?: string | null;
      updated_at: string;
    } = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'cancelled') {
      updateData.cancellation_reason = cancellationReason || 'Cancelled by kitchen staff';
    }

    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('id, restaurant_id, order_number, status, cancellation_reason')
      .single();

    if (error || !updatedOrder) {
      throw new Error(`Failed to update order status: ${error?.message}`);
    }

    // Also update order_items status to match if order was cancelled or served
    if (status === 'cancelled' || status === 'served') {
      await supabase
        .from('order_items')
        .update({ status })
        .eq('order_id', orderId);
    }

    // Insert Audit Log if cancelled
    if (status === 'cancelled') {
      await supabase.from('audit_logs').insert({
        restaurant_id: updatedOrder.restaurant_id,
        user_id: user.id,
        action: 'order_cancellation',
        entity_type: 'order',
        entity_id: orderId,
        details: {
          order_number: updatedOrder.order_number,
          reason: cancellationReason || 'Cancelled by kitchen staff',
        },
      });
    }

    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (err: unknown) {
    console.error('Kitchen order update error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
