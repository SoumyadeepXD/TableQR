import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import type { Database } from '@/lib/types/database';
import { z } from 'zod';
import crypto from 'crypto';

type TableUpdate = Database['public']['Tables']['tables']['Update'];

const updateTableSchema = z.object({
  tableNumber: z.string().min(1).max(20).optional(),
  section: z.string().max(50).optional(),
  capacity: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  regenerateToken: z.boolean().optional(),
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
    const result = updateTableSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const { tableNumber, section, capacity, isActive, regenerateToken } = result.data;
    const supabase = await createClient();

    const updatePayload: TableUpdate = {};
    if (tableNumber !== undefined) updatePayload.table_number = tableNumber;
    if (section !== undefined) updatePayload.section = section;
    if (capacity !== undefined) updatePayload.capacity = capacity;
    if (isActive !== undefined) updatePayload.is_active = isActive;
    if (regenerateToken) {
      updatePayload.qr_token = `tbl_${crypto.randomBytes(12).toString('hex')}`;
    }

    const { data: updated, error } = await supabase
      .from('tables')
      .update(updatePayload)
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update table: ${error?.message}`);
    }

    return NextResponse.json({ success: true, table: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Table update failed';
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
      .from('tables')
      .delete()
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId);

    if (error) {
      throw new Error(`Failed to delete table: ${error.message}`);
    }

    return NextResponse.json({ success: true, message: 'Table deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Table deletion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
