import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { toggleStockSchema } from '@/lib/validations/order';

interface RouteParams {
  params: Promise<{
    menuItemId: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { menuItemId } = await params;
    const json = await request.json();
    const result = toggleStockSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { isAvailable } = result.data;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: updatedItem, error } = await supabase
      .from('menu_items')
      .update({
        is_available: isAvailable,
        updated_at: new Date().toISOString(),
      })
      .eq('id', menuItemId)
      .select('id, name, is_available')
      .single();

    if (error || !updatedItem) {
      throw new Error(`Failed to update item availability: ${error?.message}`);
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (err: unknown) {
    console.error('Menu item stock toggle error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
