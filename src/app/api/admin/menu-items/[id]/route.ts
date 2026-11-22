import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import type { Database } from '@/lib/types/database';
import { z } from 'zod';

type MenuItemUpdate = Database['public']['Tables']['menu_items']['Update'];

const updateMenuItemSchema = z.object({
  categoryId: z.string().optional(),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).optional().nullable(),
  price: z.number().nonnegative().optional(),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
  taxRate: z.number().optional(),
  sortOrder: z.number().int().optional(),
  prepTimeMinutes: z.number().int().positive().optional(),
  isBestseller: z.boolean().optional(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1),
        price: z.number().nonnegative(),
        isAvailable: z.boolean().default(true),
        sortOrder: z.number().int().default(0),
      })
    )
    .optional(),
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
    const restaurantId = auth.data.restaurantId;

    const { id } = await params;
    const json = await request.json();
    const result = updateMenuItemSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const {
      categoryId,
      name,
      description,
      price,
      imageUrl,
      isVeg,
      isAvailable,
      taxRate,
      sortOrder,
      prepTimeMinutes,
      isBestseller,
      variants,
    } = result.data;

    const supabase = await createClient();

    const updatePayload: MenuItemUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (categoryId !== undefined) updatePayload.category_id = categoryId;
    if (name !== undefined) updatePayload.name = name;
    if (description !== undefined) updatePayload.description = description;
    if (price !== undefined) updatePayload.price = price;
    if (imageUrl !== undefined) updatePayload.image_url = imageUrl;
    if (isVeg !== undefined) updatePayload.is_veg = isVeg;
    if (isAvailable !== undefined) updatePayload.is_available = isAvailable;
    if (taxRate !== undefined) updatePayload.tax_rate = taxRate;
    if (sortOrder !== undefined) updatePayload.sort_order = sortOrder;
    if (prepTimeMinutes !== undefined) updatePayload.prep_time_minutes = prepTimeMinutes;
    if (isBestseller !== undefined) updatePayload.is_bestseller = isBestseller;

    const { data: updatedItem, error } = await supabase
      .from('menu_items')
      .update(updatePayload)
      .eq('id', id)
      .eq('restaurant_id', restaurantId)
      .select('*')
      .single();

    if (error || !updatedItem) {
      throw new Error(`Failed to update menu item: ${error?.message}`);
    }

    // Update variants if provided
    if (variants !== undefined) {
      // Delete old variants and reinsert
      await supabase.from('item_variants').delete().eq('menu_item_id', id);

      if (variants.length > 0) {
        const variantInserts = variants.map((v) => ({
          restaurant_id: restaurantId,
          menu_item_id: id,
          name: v.name,
          price: v.price,
          is_available: v.isAvailable,
          sort_order: v.sortOrder,
        }));
        await supabase.from('item_variants').insert(variantInserts);
      }
    }

    return NextResponse.json({ success: true, menuItem: updatedItem });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Item update failed';
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
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId);

    if (error) {
      throw new Error(`Failed to delete menu item: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'Menu item deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Item deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
