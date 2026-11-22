import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';

export async function GET() {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { restaurantId } = auth.data;
    const supabase = await createClient();

    // 1. Fetch Restaurant details
    const { data: restaurant, error: restError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (restError || !restaurant) {
      return NextResponse.json({ error: 'Restaurant record not found' }, { status: 404 });
    }

    // 2. Fetch Categories
    const { data: categories, error: catError } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });

    if (catError) {
      throw new Error(`Failed to load categories: ${catError.message}`);
    }

    // 3. Fetch Menu Items with Variants and Addon Groups
    const { data: menuItems, error: itemsError } = await supabase
      .from('menu_items')
      .select(`
        *,
        item_variants (
          id,
          name,
          price,
          is_available,
          sort_order
        ),
        addon_groups (
          id,
          name,
          min_selection,
          max_selection,
          is_required,
          addon_items (
            id,
            name,
            price,
            is_available,
            sort_order
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true });

    if (itemsError) {
      throw new Error(`Failed to load menu items: ${itemsError.message}`);
    }

    // 4. Fetch Tables
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true });

    if (tablesError) {
      throw new Error(`Failed to load tables: ${tablesError.message}`);
    }

    // 5. Fetch Offers
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (offersError) {
      throw new Error(`Failed to load offers: ${offersError.message}`);
    }

    // 6. Fetch Staff Accounts
    const { data: staffList, error: staffError } = await supabase
      .from('restaurant_staff')
      .select('id, user_id, name, role, is_active, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: true });

    if (staffError) {
      throw new Error(`Failed to load staff list: ${staffError.message}`);
    }

    return NextResponse.json({
      success: true,
      currentStaff: auth.data,
      restaurant,
      categories: categories || [],
      menuItems: menuItems || [],
      tables: tables || [],
      offers: offers || [],
      staffList: staffList || [],
    });
  } catch (error: unknown) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'digest' in error &&
      typeof (error as { digest: unknown }).digest === 'string' &&
      ((error as { digest: string }).digest.startsWith('NEXT_') ||
        (error as { digest: string }).digest === 'HANGING_PROMISE_REJECTION')
    ) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch admin data';
    console.error('Admin data fetch error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
