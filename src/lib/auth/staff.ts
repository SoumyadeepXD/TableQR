import { createClient } from '@/lib/supabase/server';

export type StaffRole = 'owner' | 'manager' | 'cashier' | 'kitchen';

export interface VerifiedStaff {
  userId: string;
  staffId: string;
  restaurantId: string;
  name: string;
  role: StaffRole;
}

/**
 * Validates staff authentication and role permissions for server routes
 */
export async function verifyStaffSession(
  allowedRoles: StaffRole[] = ['owner', 'manager']
): Promise<{ error?: string; status?: number; data?: VerifiedStaff }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { error: 'Unauthorized: Please log in', status: 401 };
    }

    const { data: staff, error: staffError } = await supabase
      .from('restaurant_staff')
      .select('id, restaurant_id, name, role, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffError || !staff) {
      return { error: 'Forbidden: No active staff profile found', status: 403 };
    }

    if (!allowedRoles.includes(staff.role as StaffRole)) {
      return {
        error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions (Current: ${staff.role})`,
        status: 403,
      };
    }

    return {
      data: {
        userId: user.id,
        staffId: staff.id,
        restaurantId: staff.restaurant_id,
        name: staff.name,
        role: staff.role as StaffRole,
      },
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Authentication verification failed';
    return { error: msg, status: 500 };
  }
}
