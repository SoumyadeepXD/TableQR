import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import type { Database } from '@/lib/types/database';
import { z } from 'zod';

type OfferUpdate = Database['public']['Tables']['offers']['Update'];

const updateOfferSchema = z.object({
  code: z.string().min(2).max(20).transform((c) => c.toUpperCase()).optional(),
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(250).optional().nullable(),
  discountType: z.enum(['percentage', 'flat']).optional(),
  discountValue: z.number().positive().optional(),
  minBillAmount: z.number().nonnegative().optional(),
  maxDiscountCap: z.number().positive().optional().nullable(),
  happyHourStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  happyHourEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  applicableCategoryId: z.string().optional().nullable(),
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
    const result = updateOfferSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const {
      code,
      title,
      description,
      discountType,
      discountValue,
      minBillAmount,
      maxDiscountCap,
      happyHourStart,
      happyHourEnd,
      daysOfWeek,
      applicableCategoryId,
      isActive,
    } = result.data;

    const supabase = await createClient();

    const updatePayload: OfferUpdate = {};
    if (code !== undefined) updatePayload.code = code;
    if (title !== undefined) updatePayload.title = title;
    if (description !== undefined) updatePayload.description = description;
    if (discountType !== undefined) updatePayload.discount_type = discountType;
    if (discountValue !== undefined) updatePayload.discount_value = discountValue;
    if (minBillAmount !== undefined) updatePayload.min_bill_amount = minBillAmount;
    if (maxDiscountCap !== undefined) updatePayload.max_discount_cap = maxDiscountCap;
    if (happyHourStart !== undefined) updatePayload.happy_hour_start = happyHourStart;
    if (happyHourEnd !== undefined) updatePayload.happy_hour_end = happyHourEnd;
    if (daysOfWeek !== undefined) updatePayload.days_of_week = daysOfWeek;
    if (applicableCategoryId !== undefined) updatePayload.applicable_category_id = applicableCategoryId;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const { data: updated, error } = await supabase
      .from('offers')
      .update(updatePayload)
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update offer: ${error?.message}`);
    }

    return NextResponse.json({ success: true, offer: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Offer update failed';
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
      .from('offers')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId);

    if (error) {
      throw new Error(`Failed to delete offer: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'Offer deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Offer deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
