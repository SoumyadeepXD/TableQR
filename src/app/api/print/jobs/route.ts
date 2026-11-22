import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const EXPECTED_AGENT_SECRET = process.env.PRINT_AGENT_SECRET || 'tableqr-agent-secret-demo';

interface KotItemAddon {
  addon_name: string;
  price?: number;
}

interface KotOrderItem {
  id: string;
  item_name: string;
  variant_name?: string | null;
  quantity: number;
  cooking_request?: string | null;
  order_item_addons?: KotItemAddon[];
}

// In-memory queue for ad-hoc manual print requests (reprints, bill requests)
interface QueuedJob {
  id: string;
  type: 'kot' | 'bill';
  restaurantId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  status: 'pending' | 'printed';
}

const adHocPrintQueue: QueuedJob[] = [];

/**
 * Validates agent secret or staff user session
 */
async function authenticatePrintRequest(req: NextRequest) {
  const secretHeader = req.headers.get('x-agent-secret') || req.nextUrl.searchParams.get('secret');
  const restaurantIdHeader = req.headers.get('x-restaurant-id') || req.nextUrl.searchParams.get('restaurantId');

  if (secretHeader && secretHeader === EXPECTED_AGENT_SECRET) {
    return {
      authenticated: true,
      restaurantId: restaurantIdHeader || DEMO_RESTAURANT_ID,
      role: 'agent',
    };
  }

  // Try standard staff session
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: staff } = await supabase
        .from('restaurant_staff')
        .select('restaurant_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (staff) {
        return {
          authenticated: true,
          restaurantId: staff.restaurant_id,
          role: staff.role,
        };
      }
    }
  } catch {
    // Session fallback ignored
  }

  return { authenticated: false, restaurantId: null, role: null };
}

/**
 * GET /api/print/jobs
 * Polls unprinted KOTs and queued bills for the restaurant
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticatePrintRequest(req);
    if (!auth.authenticated || !auth.restaurantId) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid agent secret or staff session' },
        { status: 401 }
      );
    }

    const restaurantId = auth.restaurantId;
    const sinceParam = req.nextUrl.searchParams.get('since');
    const includePrinted = req.nextUrl.searchParams.get('includePrinted') === 'true';

    // Default window: last 20 minutes if not specified
    const defaultSince = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const sinceTimestamp = sinceParam || defaultSince;

    const admin = createAdminClient();

    // 1. Fetch restaurant profile
    const { data: restaurant } = await admin
      .from('restaurants')
      .select('name, tagline, address, city, phone, gstin, fssai_license, upi_id')
      .eq('id', restaurantId)
      .single();

    const restaurantName = restaurant?.name || 'TableQR Restaurant';

    // 2. Fetch printed order audit records to prevent duplicate auto-prints
    const { data: printedAudits } = await admin
      .from('audit_logs')
      .select('entity_id')
      .eq('restaurant_id', restaurantId)
      .eq('action', 'kot_printed_by_agent');

    const printedOrderIds = new Set((printedAudits || []).map((a) => a.entity_id));

    // 3. Fetch orders created since timestamp
    const { data: orders, error: ordersError } = await admin
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        customer_note,
        created_at,
        tables (table_number, section),
        order_items (
          id,
          item_name,
          variant_name,
          quantity,
          cooking_request,
          status,
          order_item_addons (id, addon_name, price)
        )
      `)
      .eq('restaurant_id', restaurantId)
      .neq('status', 'cancelled')
      .gte('created_at', sinceTimestamp)
      .order('created_at', { ascending: true });

    if (ordersError) {
      return NextResponse.json({ error: ordersError.message }, { status: 500 });
    }

    // Filter to unprinted orders unless includePrinted is true
    const unprintedOrders = (orders || []).filter((o) => {
      if (includePrinted) return true;
      return !printedOrderIds.has(o.id);
    });

    const kotJobs = unprintedOrders.map((order) => {
      const activeItems = (order.order_items || [])
        .filter((it: { status: string }) => it.status !== 'cancelled')
        .map((it: KotOrderItem) => ({
          id: it.id,
          itemName: it.item_name,
          variantName: it.variant_name,
          quantity: it.quantity,
          cookingRequest: it.cooking_request,
          addons: (it.order_item_addons || []).map((a) => a.addon_name),
        }));

      const tableData = Array.isArray(order.tables) ? order.tables[0] : order.tables;

      return {
        id: `kot-${order.id}`,
        type: 'kot' as const,
        orderId: order.id,
        restaurantName,
        tableNumber: tableData?.table_number || 'T-?',
        section: tableData?.section || 'Main Hall',
        orderNumber: order.order_number,
        createdAt: order.created_at,
        customerNote: order.customer_note,
        isReprint: false,
        items: activeItems,
      };
    });

    // 4. Also collect any queued ad-hoc jobs
    const pendingAdHoc = adHocPrintQueue
      .filter((q) => q.restaurantId === restaurantId && q.status === 'pending')
      .map((q) => ({
        id: q.id,
        ...q.payload,
      }));

    return NextResponse.json({
      restaurantId,
      serverTime: new Date().toISOString(),
      jobsCount: kotJobs.length + pendingAdHoc.length,
      jobs: [...kotJobs, ...pendingAdHoc],
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * POST /api/print/jobs
 * Enqueue an ad-hoc reprint or bill print for the print agent
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticatePrintRequest(req);
    if (!auth.authenticated || !auth.restaurantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, orderId, invoiceId } = body;

    const admin = createAdminClient();
    const restaurantId = auth.restaurantId;

    if (type === 'kot' && orderId) {
      // Fetch order details for reprint
      const { data: order, error } = await admin
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          customer_note,
          created_at,
          tables (table_number, section),
          order_items (
            id,
            item_name,
            variant_name,
            quantity,
            cooking_request,
            status,
            order_item_addons (id, addon_name, price)
          )
        `)
        .eq('id', orderId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error || !order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const tableData = Array.isArray(order.tables) ? order.tables[0] : order.tables;
      const { data: restaurant } = await admin
        .from('restaurants')
        .select('name')
        .eq('id', restaurantId)
        .single();

      const activeItems = (order.order_items || [])
        .filter((it: { status: string }) => it.status !== 'cancelled')
        .map((it: KotOrderItem) => ({
          id: it.id,
          itemName: it.item_name,
          variantName: it.variant_name,
          quantity: it.quantity,
          cookingRequest: it.cooking_request,
          addons: (it.order_item_addons || []).map((a) => a.addon_name),
        }));

      const jobId = `reprint-${order.id}-${Date.now()}`;
      adHocPrintQueue.push({
        id: jobId,
        type: 'kot',
        restaurantId,
        createdAt: new Date().toISOString(),
        status: 'pending',
        payload: {
          type: 'kot',
          orderId: order.id,
          restaurantName: restaurant?.name || 'TableQR Restaurant',
          tableNumber: tableData?.table_number || 'T-?',
          section: tableData?.section || 'Main Hall',
          orderNumber: order.order_number,
          createdAt: order.created_at,
          customerNote: order.customer_note,
          isReprint: true,
          items: activeItems,
        },
      });

      return NextResponse.json({ success: true, jobId, message: 'KOT reprint enqueued' });
    }

    if (type === 'bill' && invoiceId) {
      const { data: invoice, error } = await admin
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (error || !invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const { data: restaurant } = await admin
        .from('restaurants')
        .select('name, tagline, address, city, phone, gstin, fssai_license, upi_id')
        .eq('id', restaurantId)
        .single();

      const jobId = `bill-${invoice.id}-${Date.now()}`;
      adHocPrintQueue.push({
        id: jobId,
        type: 'bill',
        restaurantId,
        createdAt: new Date().toISOString(),
        status: 'pending',
        payload: {
          type: 'bill',
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          restaurant: {
            name: restaurant?.name || 'TableQR Restaurant',
            tagline: restaurant?.tagline,
            address: restaurant?.address,
            city: restaurant?.city,
            phone: restaurant?.phone,
            gstin: restaurant?.gstin,
            fssai: restaurant?.fssai_license,
            upiId: restaurant?.upi_id,
          },
          subtotal: Number(invoice.subtotal),
          discountAmount: Number(invoice.discount_amount),
          serviceChargeAmount: Number(invoice.service_charge_amount),
          cgstAmount: Number(invoice.cgst_amount),
          sgstAmount: Number(invoice.sgst_amount),
          roundOffAmount: Number(invoice.round_off_amount),
          totalAmount: Number(invoice.total_amount),
          paymentStatus: invoice.payment_status,
          paymentMethod: invoice.payment_method,
          createdAt: invoice.created_at,
        },
      });

      return NextResponse.json({ success: true, jobId, message: 'Bill print enqueued' });
    }

    return NextResponse.json({ error: 'Invalid print job parameters' }, { status: 400 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
