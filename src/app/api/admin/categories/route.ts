import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(60),
  description: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const json = await request.json();
    const result = categorySchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const { name, description, sortOrder, isActive } = result.data;
    const supabase = await createClient();

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        restaurant_id: auth.data.restaurantId,
        name,
        description: description || null,
        sort_order: sortOrder,
        is_active: isActive,
      })
      .select('*')
      .single();

    if (error || !category) {
      throw new Error(`Failed to create category: ${error?.message}`);
    }

    return NextResponse.json({ success: true, category });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Category creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
