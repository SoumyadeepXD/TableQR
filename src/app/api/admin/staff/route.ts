import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyStaffSession } from '@/lib/auth/staff';
import { z } from 'zod';

const createStaffSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
  email: z.string().email('Valid email required'),
  role: z.enum(['owner', 'manager', 'cashier', 'kitchen']),
  password: z.string().min(6).default('TableQR@2026'),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner']);
    if (auth.error || !auth.data) {
      return NextResponse.json(
        { error: auth.error || 'Only owners can manage staff accounts' },
        { status: auth.status || 403 }
      );
    }

    const json = await request.json();
    const result = createStaffSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json({ error: 'Invalid input', details: result.error.flatten() }, { status: 400 });
    }

    const { name, email, role, password } = result.data;
    const adminSupabase = createAdminClient();

    // 1. Create or fetch auth user
    let userId: string;
    const { data: existingUser } = await adminSupabase.auth.admin.listUsers();
    const foundUser = (existingUser?.users || []).find((u) => u.email?.toLowerCase() === email.toLowerCase());

    if (foundUser) {
      userId = foundUser.id;
    } else {
      const { data: newUser, error: createAuthError } = await adminSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, role },
      });

      if (createAuthError || !newUser?.user) {
        throw new Error(`Failed to create user account: ${createAuthError?.message}`);
      }
      userId = newUser.user.id;
    }

    // 2. Insert into restaurant_staff
    const { data: staffRecord, error: staffError } = await adminSupabase
      .from('restaurant_staff')
      .upsert(
        {
          restaurant_id: auth.data.restaurantId,
          user_id: userId,
          name,
          role,
          is_active: true,
        },
        { onConflict: 'restaurant_id,user_id' }
      )
      .select('*')
      .single();

    if (staffError || !staffRecord) {
      throw new Error(`Failed to create staff record: ${staffError?.message}`);
    }

    return NextResponse.json({ success: true, staff: staffRecord });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Staff creation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
