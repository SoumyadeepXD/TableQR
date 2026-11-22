import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBill, BillingItemInput, BillingSettingsInput } from '@/lib/billing/engine';

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Verify staff authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get staff member's restaurant
    const { data: staffMember, error: staffError } = await supabase
      .from('restaurant_staff')
      .select('restaurant_id, role, restaurants (*)')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (staffError || !staffMember || !staffMember.restaurants) {
      return NextResponse.json({ error: 'Staff profile or restaurant not found' }, { status: 403 });
    }

    const restaurant = staffMember.restaurants;
    const restaurantId = staffMember.restaurant_id;

    // 3. Fetch all tables for this restaurant
    const { data: tables, error: tablesError } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number', { ascending: true });

    if (tablesError) {
      throw new Error(`Failed to load tables: ${tablesError.message}`);
    }

    // 4. Fetch active table sessions
    const { data: activeSessions } = await supabase
      .from('table_sessions')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'active');

    const sessionIds = (activeSessions || []).map((s) => s.id);

    interface CashierTableOrderItem {
      id: string;
      menu_item_id: string;
      item_name: string;
      variant_name: string | null;
      unit_price: number;
      quantity: number;
      tax_rate: number;
      status: string;
      cooking_request: string | null;
      order_item_addons: Array<{
        id: string;
        addon_name: string;
        price: number;
      }>;
    }

    interface CashierTableOrder {
      id: string;
      table_session_id: string;
      order_number: number;
      status: string;
      customer_note: string | null;
      created_at: string;
      order_items: CashierTableOrderItem[];
    }

    interface CashierTableInvoice {
      id: string;
      table_session_id: string;
      invoice_number: string;
      financial_year: string;
      subtotal: number;
      discount_amount: number;
      service_charge_amount: number;
      cgst_amount: number;
      sgst_amount: number;
      round_off_amount: number;
      total_amount: number;
      payment_method: string;
      payment_status: string;
      paid_at: string | null;
    }

    // 5. Fetch orders for active sessions
    const ordersBySession: Record<string, CashierTableOrder[]> = {};
    if (sessionIds.length > 0) {
      const { data: orders } = await supabase
        .from('orders')
        .select(`
          id,
          table_session_id,
          order_number,
          status,
          customer_note,
          created_at,
          order_items (
            id,
            menu_item_id,
            item_name,
            variant_name,
            unit_price,
            quantity,
            tax_rate,
            status,
            cooking_request,
            order_item_addons (
              id,
              addon_name,
              price
            )
          )
        `)
        .in('table_session_id', sessionIds)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: true });

      (orders || []).forEach((order) => {
        const orderTyped = order as unknown as CashierTableOrder;
        if (!ordersBySession[orderTyped.table_session_id]) {
          ordersBySession[orderTyped.table_session_id] = [];
        }
        ordersBySession[orderTyped.table_session_id].push(orderTyped);
      });
    }

    // 6. Fetch pending service requests
    const { data: serviceRequests } = await supabase
      .from('service_requests')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    // 7. Fetch invoices for active sessions
    const invoicesBySession: Record<string, CashierTableInvoice> = {};
    if (sessionIds.length > 0) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('*')
        .in('table_session_id', sessionIds);

      (invoices || []).forEach((inv) => {
        const invTyped = inv as unknown as CashierTableInvoice;
        invoicesBySession[invTyped.table_session_id] = invTyped;
      });
    }

    // 8. Fetch active offers for quick application by cashier
    const { data: activeOffers } = await supabase
      .from('offers')
      .select('id, code, title, discount_type, discount_value, min_bill_amount, max_discount_cap')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);

    // 9. Build comprehensive table overview
    const settings: BillingSettingsInput = {
      isTaxInclusive: Boolean(restaurant.is_tax_inclusive),
      defaultTaxRate: Number(restaurant.default_tax_rate || 5),
      isServiceChargeEnabled: Boolean(restaurant.is_service_charge_enabled),
      serviceChargeRate: Number(restaurant.service_charge_rate || 0),
    };

    const tablesOverview = (tables || []).map((t) => {
      const activeSession = (activeSessions || []).find((s) => s.table_id === t.id);
      const orders = activeSession ? ordersBySession[activeSession.id] || [] : [];
      const pendingReqs = (serviceRequests || []).filter((r) => r.table_id === t.id);
      const existingInvoice = activeSession ? invoicesBySession[activeSession.id] || null : null;

      // Calculate current bill for active session
      const billingItems: BillingItemInput[] = [];
      let totalItemsCount = 0;

      orders.forEach((o) => {
        (o.order_items || []).forEach((item: CashierTableOrderItem) => {
          if (item.status === 'cancelled') return;
          totalItemsCount += item.quantity;

          const addons = (item.order_item_addons || []).map((a) => ({
            name: a.addon_name,
            price: Number(a.price),
          }));

          billingItems.push({
            menuItemId: item.menu_item_id,
            name: item.item_name,
            unitPrice: Number(item.unit_price),
            quantity: item.quantity,
            taxRate: Number(item.tax_rate ?? restaurant.default_tax_rate ?? 5),
            addons,
          });
        });
      });

      const bill = calculateBill({ items: billingItems, settings });

      return {
        table: t,
        hasActiveSession: !!activeSession,
        session: activeSession || null,
        ordersCount: orders.length,
        itemsCount: totalItemsCount,
        orders,
        bill,
        invoice: existingInvoice,
        pendingRequests: pendingReqs,
        hasBillRequested: pendingReqs.some((r) => r.type === 'request_bill'),
        hasWaiterCalled: pendingReqs.some((r) => r.type === 'call_waiter'),
      };
    });

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        upiId: restaurant.upi_id,
        gstin: restaurant.gstin,
        currency: restaurant.currency || 'INR',
        isTaxInclusive: restaurant.is_tax_inclusive,
        isServiceChargeEnabled: restaurant.is_service_charge_enabled,
        serviceChargeRate: restaurant.service_charge_rate,
      },
      staff: {
        role: staffMember.role,
      },
      tables: tablesOverview,
      activeOffers: activeOffers || [],
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
    const message = error instanceof Error ? error.message : 'Failed to fetch cashier data';
    console.error('Error fetching cashier tables:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
