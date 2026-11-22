import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import { z } from 'zod';

const variantSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative(),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const addonItemSchema = z.object({
  name: z.string().min(1),
  price: z.number().nonnegative().default(0),
  isAvailable: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const addonGroupSchema = z.object({
  name: z.string().min(1),
  minSelection: z.number().int().nonnegative().default(0),
  maxSelection: z.number().int().positive().default(1),
  isRequired: z.boolean().default(false),
  items: z.array(addonItemSchema).default([]),
});

const menuItemSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(1, 'Item name is required').max(100),
  description: z.string().max(300).optional().nullable(),
  price: z.number().nonnegative('Price cannot be negative'),
  imageUrl: z.string().optional().nullable(),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  taxRate: z.number().default(5.00),
  sortOrder: z.number().int().default(0),
  prepTimeMinutes: z.number().int().positive().default(15),
  isBestseller: z.boolean().default(false),
  variants: z.array(variantSchema).optional(),
  addonGroups: z.array(addonGroupSchema).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }
    const restaurantId = auth.data.restaurantId;

    const json = await request.json();
    const result = menuItemSchema.safeParse(json);
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
      addonGroups,
    } = result.data;

    const supabase = await createClient();

    // 1. Insert Base Item
    const { data: item, error: itemError } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        description: description || null,
        price,
        image_url: imageUrl || null,
        is_veg: isVeg,
        is_available: isAvailable,
        tax_rate: taxRate,
        sort_order: sortOrder,
        prep_time_minutes: prepTimeMinutes,
        is_bestseller: isBestseller,
      })
      .select('*')
      .single();

    if (itemError || !item) {
      throw new Error(`Failed to create menu item: ${itemError?.message}`);
    }

    // 2. Insert Variants if present
    if (variants && variants.length > 0) {
      const variantInserts = variants.map((v) => ({
        restaurant_id: restaurantId,
        menu_item_id: item.id,
        name: v.name,
        price: v.price,
        is_available: v.isAvailable,
        sort_order: v.sortOrder,
      }));

      const { error: vError } = await supabase.from('item_variants').insert(variantInserts);
      if (vError) {
        console.error('Failed to create variants:', vError);
      }
    }

    // 3. Insert Addon Groups and Items if present
    if (addonGroups && addonGroups.length > 0) {
      for (const group of addonGroups) {
        const { data: createdGroup, error: gError } = await supabase
          .from('addon_groups')
          .insert({
            restaurant_id: restaurantId,
            menu_item_id: item.id,
            name: group.name,
            min_selection: group.minSelection,
            max_selection: group.maxSelection,
            is_required: group.isRequired,
          })
          .select('id')
          .single();

        if (gError) {
          console.error('Failed to create addon group:', gError);
        }

        if (createdGroup && group.items && group.items.length > 0) {
          const addonInserts = group.items.map((ai) => ({
            restaurant_id: restaurantId,
            addon_group_id: createdGroup.id,
            name: ai.name,
            price: ai.price,
            is_available: ai.isAvailable,
            sort_order: ai.sortOrder,
          }));
          await supabase.from('addon_items').insert(addonInserts);
        }
      }
    }

    return NextResponse.json({ success: true, menuItem: item });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Item creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
