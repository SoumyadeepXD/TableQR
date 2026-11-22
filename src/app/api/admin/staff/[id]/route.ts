import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import type { Database } from '@/lib/types/database';
import { z } from 'zod';

type StaffUpdate = Database['public']['Tables']['restaurant_staff']['Update'];

const updateStaffSchema = z.object({
  role: z.enum(['owner', 'manager', 'cashier', 'kitchen']).optional(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await verifyStaffSession(['owner']);
    if (auth.error || !auth.data) {
      return NextResponse.json(
        { error: auth.error || 'Only owners can modify staff accounts' },
        { status: auth.status || 403 }
      );
    }

    const { id } = await params;
    const json = await request.json();
    const result = updateStaffSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const { role, isActive } = result.data;
    const supabase = await createClient();

    const updatePayload: StaffUpdate = {};
    if (role !== undefined) updatePayload.role = role;
    if (isActive !== undefined) updatePayload.is_active = isActive;

    const { data: updated, error } = await supabase
      .from('restaurant_staff')
      .update(updatePayload)
      .eq('id', id)
      .eq('restaurant_id', auth.data.restaurantId)
      .select('*')
      .single();

    if (error || !updated) {
      throw new Error(`Failed to update staff: ${error?.message}`);
    }

    return NextResponse.json({ success: true, staff: updated });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Staff update failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
