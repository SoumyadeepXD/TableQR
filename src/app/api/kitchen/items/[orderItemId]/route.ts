import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateOrderStatusSchema } from '@/lib/validations/order';

interface RouteParams {
  params: Promise<{
    orderItemId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { orderItemId } = await params;
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const updateData: {
      status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
      cancellation_reason?: string | null;
    } = {
      status,
    };

    if (status === 'cancelled') {
      updateData.cancellation_reason = cancellationReason || 'Cancelled by kitchen';
    }

    const { data: updatedItem, error } = await supabase
      .from('order_items')
      .update(updateData)
      .eq('id', orderItemId)
      .select('id, restaurant_id, order_id, item_name, status, cancellation_reason')
      .single();

    if (error || !updatedItem) {
      throw new Error(`Failed to update item: ${error?.message}`);
    }

    // Insert Audit Log if item cancelled
    if (status === 'cancelled') {
      await supabase.from('audit_logs').insert({
        restaurant_id: updatedItem.restaurant_id,
        user_id: user.id,
        action: 'item_cancellation',
        entity_type: 'order_item',
        entity_id: orderItemId,
        details: {
          item_name: updatedItem.item_name,
          order_id: updatedItem.order_id,
          reason: cancellationReason || 'Cancelled by kitchen',
        },
      });
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (err: unknown) {
    console.error('Kitchen item update error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
