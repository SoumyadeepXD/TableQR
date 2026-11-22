import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import { z } from 'zod';

const createOfferSchema = z.object({
  code: z.string().min(2).max(20).transform((c) => c.toUpperCase()),
  title: z.string().min(1).max(100),
  description: z.string().max(250).optional().nullable(),
  discountType: z.enum(['percentage', 'flat']),
  discountValue: z.number().positive(),
  minBillAmount: z.number().nonnegative().default(0),
  maxDiscountCap: z.number().positive().optional().nullable(),
  happyHourStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  happyHourEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().nullable(),
  daysOfWeek: z.array(z.number().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6]),
  applicableCategoryId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const json = await request.json();
    const result = createOfferSchema.safeParse(json);
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

    const { data: offer, error } = await supabase
      .from('offers')
      .insert({
        restaurant_id: auth.data.restaurantId,
        code,
        title,
        description: description || null,
        discount_type: discountType,
        discount_value: discountValue,
        min_bill_amount: minBillAmount,
        max_discount_cap: maxDiscountCap || null,
        happy_hour_start: happyHourStart || null,
        happy_hour_end: happyHourEnd || null,
        days_of_week: daysOfWeek,
        applicable_category_id: applicableCategoryId || null,
        is_active: isActive,
      })
      .select('*')
      .single();

    if (error || !offer) {
      throw new Error(`Failed to create offer: ${error?.message}`);
    }

    return NextResponse.json({ success: true, offer });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Offer creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
