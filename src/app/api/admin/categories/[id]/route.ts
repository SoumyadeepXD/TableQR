import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import type { Database } from '@/lib/types/database';
import { z } from 'zod';

type CategoryUpdate = Database['public']['Tables']['categories']['Update'];

const updateCategorySchema = z.object({
  name: z.string().min(1).max(60).optional(),
  description: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const json = await request.json();
    const result = updateCategorySchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const { name, description, sortOrder, isActive } = result.data;
    const supabase = await createClient();

    const updatePayload: CategoryUpdate = {};
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (sortOrder !== undefined) updatePayload.sort_order = sortOrder;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const { data: updated, error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update category: ${error?.message}`);
    }

    return NextResponse.json({ success: true, category: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Category update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'Category deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Category deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
