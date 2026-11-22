import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import { z } from 'zod';
import crypto from 'crypto';

const createTableSchema = z.object({
  tableNumber: z.string().min(1, 'Table number is required').max(20),
  section: z.string().max(50).default('Main Dining'),
  capacity: z.number().int().positive().default(4),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const json = await request.json();
    const result = createTableSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const { tableNumber, section, capacity, isActive } = result.data;
    const supabase = await createClient();

    // Check if table number already exists for this restaurant
    const { data: existing } = await supabase
      .from('tables')
      .select('id')
      .eq('restaurant_id', auth.data.restaurantId)
      .eq('table_number', tableNumber)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `Table "${tableNumber}" already exists in this restaurant` },
        { status: 400 }
      );
    }

    // Generate unguessable QR token
    const qrToken = `tbl_${crypto.randomBytes(12).toString('hex')}`;

    const { data: table, error } = await supabase
      .from('tables')
      .insert({
        restaurant_id: auth.data.restaurantId,
        table_number: tableNumber,
        section,
        capacity,
        qr_token: qrToken,
        is_active: isActive,
      })
      .select('*')
      .single();

    if (error || !table) {
      throw new Error(`Failed to create table: ${error?.message}`);
    }

    return NextResponse.json({ success: true, table });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Table creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
