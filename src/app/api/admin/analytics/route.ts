import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyStaffSession } from '@/lib/auth/staff';
import {
  computeSummaryMetrics,
  computeDailyTrends,
  computeHourlyDistribution,
  computeItemPerformance,
  computePaymentMethodSplit,
  computeOfferUsage,
  computeSectionPerformance,
  getISTDateParts,
  RawInvoice,
  RawOrder,
  RawOrderItem,
  RawTableSession,
  RawMenuItem,
} from '@/lib/analytics/engine';

/**
 * Returns IST start-of-day and end-of-day UTC ISO strings for Supabase querying
 */
function getISTQueryBounds(startDateStr: string, endDateStr: string): {
  startUtcIso: string;
  endUtcIso: string;
} {
  // IST is UTC+05:30.
  // 00:00:00 IST on YYYY-MM-DD corresponds to YYYY-MM-(DD-1) 18:30:00 UTC
  // 23:59:59.999 IST corresponds to YYYY-MM-DD 18:29:59.999 UTC
  const [sy, sm, sd] = startDateStr.split('-').map(Number);
  const startLocal = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0) - 330 * 60000);

  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const endLocal = new Date(Date.UTC(ey, em - 1, ed, 23, 59, 59, 999) - 330 * 60000);

  return {
    startUtcIso: startLocal.toISOString(),
    endUtcIso: endLocal.toISOString(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyStaffSession(['owner', 'manager']);
    if (auth.error || !auth.data) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 });
    }

    const { restaurantId } = auth.data;
    const { searchParams } = new URL(request.url);

    const preset = searchParams.get('preset') || '7d';
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    // Calculate Today's date in IST
    const nowParts = getISTDateParts(new Date().toISOString());
    const todayStr = nowParts.dateKey;

    let startDateStr = todayStr;
    let endDateStr = todayStr;

    if (preset === 'today') {
      startDateStr = todayStr;
      endDateStr = todayStr;
    } else if (preset === 'yesterday') {
      const d = new Date(nowParts.year, nowParts.month - 1, nowParts.day - 1);
      const yStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      startDateStr = yStr;
      endDateStr = yStr;
    } else if (preset === '7d') {
      const d = new Date(nowParts.year, nowParts.month - 1, nowParts.day - 6);
      startDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      endDateStr = todayStr;
    } else if (preset === 'this_month') {
      startDateStr = `${nowParts.year}-${String(nowParts.month).padStart(2, '0')}-01`;
      endDateStr = todayStr;
    } else if (preset === '30d') {
      const d = new Date(nowParts.year, nowParts.month - 1, nowParts.day - 29);
      startDateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      endDateStr = todayStr;
    } else if (preset === 'custom' && fromParam && toParam) {
      startDateStr = fromParam;
      endDateStr = toParam;
    }

    const { startUtcIso, endUtcIso } = getISTQueryBounds(startDateStr, endDateStr);
    const supabase = await createClient();

    // 1. Fetch Invoices within range
    const { data: invoicesData, error: invError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        financial_year,
        subtotal,
        discount_amount,
        service_charge_amount,
        cgst_amount,
        sgst_amount,
        round_off_amount,
        total_amount,
        applied_offer_id,
        coupon_code,
        payment_method,
        payment_status,
        paid_at,
        created_at,
        table_session_id,
        table_sessions (
          tables (
            table_number,
            section
          )
        )
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startUtcIso)
      .lte('created_at', endUtcIso)
      .order('created_at', { ascending: false });

    if (invError) throw new Error(`Failed to load invoices: ${invError.message}`);

    // Map table info onto invoice
    const invoices: RawInvoice[] = (invoicesData || []).map((inv) => {
      const session = inv.table_sessions as { tables?: { table_number: string; section: string } } | null;
      return {
        id: inv.id,
        invoice_number: inv.invoice_number,
        financial_year: inv.financial_year,
        subtotal: Number(inv.subtotal),
        discount_amount: Number(inv.discount_amount),
        service_charge_amount: Number(inv.service_charge_amount),
        cgst_amount: Number(inv.cgst_amount),
        sgst_amount: Number(inv.sgst_amount),
        round_off_amount: Number(inv.round_off_amount),
        total_amount: Number(inv.total_amount),
        applied_offer_id: inv.applied_offer_id,
        coupon_code: inv.coupon_code,
        payment_method: inv.payment_method,
        payment_status: inv.payment_status,
        paid_at: inv.paid_at,
        created_at: inv.created_at,
        table_session_id: inv.table_session_id,
        tables: session?.tables || null,
      };
    });

    // 2. Fetch Orders within range
    const { data: ordersData, error: ordError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        created_at,
        updated_at,
        table_id,
        table_session_id,
        tables (
          table_number,
          section
        )
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startUtcIso)
      .lte('created_at', endUtcIso)
      .order('created_at', { ascending: true });

    if (ordError) throw new Error(`Failed to load orders: ${ordError.message}`);

    const orders: RawOrder[] = (ordersData || []).map((o) => ({
      id: o.id,
      order_number: o.order_number,
      status: o.status,
      created_at: o.created_at,
      updated_at: o.updated_at,
      table_id: o.table_id,
      table_session_id: o.table_session_id,
      tables: o.tables || null,
    }));

    // 3. Fetch Order Items within range
    const { data: orderItemsData, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        order_id,
        menu_item_id,
        item_name,
        variant_name,
        unit_price,
        quantity,
        tax_rate,
        status,
        created_at
      `)
      .eq('restaurant_id', restaurantId)
      .gte('created_at', startUtcIso)
      .lte('created_at', endUtcIso);

    if (itemsError) throw new Error(`Failed to load order items: ${itemsError.message}`);

    const orderItems: RawOrderItem[] = (orderItemsData || []).map((oi) => ({
      id: oi.id,
      order_id: oi.order_id,
      menu_item_id: oi.menu_item_id,
      item_name: oi.item_name,
      variant_name: oi.variant_name,
      unit_price: Number(oi.unit_price),
      quantity: Number(oi.quantity),
      tax_rate: Number(oi.tax_rate),
      status: oi.status,
      created_at: oi.created_at,
    }));

    // 4. Fetch Table Sessions
    const { data: sessionsData, error: sesError } = await supabase
      .from('table_sessions')
      .select(`
        id,
        table_id,
        status,
        opened_at,
        closed_at,
        tables (
          table_number,
          section
        )
      `)
      .eq('restaurant_id', restaurantId)
      .gte('opened_at', startUtcIso)
      .lte('opened_at', endUtcIso);

    if (sesError) throw new Error(`Failed to load sessions: ${sesError.message}`);

    const sessions: RawTableSession[] = (sessionsData || []).map((s) => ({
      id: s.id,
      table_id: s.table_id,
      status: s.status,
      opened_at: s.opened_at,
      closed_at: s.closed_at,
      tables: s.tables || null,
    }));

    // 5. Fetch Menu Items (Catalog)
    const { data: catalogData, error: catError } = await supabase
      .from('menu_items')
      .select(`
        id,
        category_id,
        name,
        price,
        is_veg,
        categories (
          name
        )
      `)
      .eq('restaurant_id', restaurantId);

    if (catError) throw new Error(`Failed to load catalog: ${catError.message}`);

    const menuItems: RawMenuItem[] = (catalogData || []).map((m) => ({
      id: m.id,
      category_id: m.category_id,
      name: m.name,
      price: Number(m.price),
      is_veg: m.is_veg,
      categories: m.categories || null,
    }));

    // 6. Fetch Tables (for section summary)
    const { data: tablesData, error: tblError } = await supabase
      .from('tables')
      .select('id, table_number, section')
      .eq('restaurant_id', restaurantId);

    if (tblError) throw new Error(`Failed to load tables: ${tblError.message}`);

    // Compute analytical dimensions
    const summary = computeSummaryMetrics(invoices, orders, sessions);
    const dailyTrends = computeDailyTrends(invoices, orders, startDateStr, endDateStr);
    const hourlyDistribution = computeHourlyDistribution(invoices, orders);
    const { bestSellers, worstSellers } = computeItemPerformance(orderItems, menuItems);
    const paymentMethodSplit = computePaymentMethodSplit(invoices);
    const offerUsage = computeOfferUsage(invoices);
    const sectionPerformance = computeSectionPerformance(tablesData || [], sessions, invoices);

    const recentInvoices = invoices.slice(0, 10).map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      tableNumber: inv.tables?.table_number || 'Takeaway',
      section: inv.tables?.section || 'Main',
      totalAmount: inv.total_amount,
      paymentMethod: inv.payment_method,
      paidAt: inv.paid_at || inv.created_at,
    }));

    return NextResponse.json({
      success: true,
      range: {
        startDate: startDateStr,
        endDate: endDateStr,
        preset,
      },
      summary,
      dailyTrends,
      hourlyDistribution,
      bestSellers,
      worstSellers,
      paymentMethodSplit,
      offerUsage,
      sectionPerformance,
      recentInvoices,
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
    const message = error instanceof Error ? error.message : 'Analytics aggregation failed';
    console.error('Analytics aggregation error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
