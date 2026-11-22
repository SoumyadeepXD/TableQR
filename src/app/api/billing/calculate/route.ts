import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBill, BillingItemInput, BillingSettingsInput, BillingOfferInput } from '@/lib/billing/engine';
import { buildUpiUri, generateUpiQrDataUrl } from '@/lib/payments/upi';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('sessionToken');
    const sessionId = searchParams.get('sessionId');
    const couponCode = searchParams.get('couponCode')?.trim();

    if (!sessionToken && !sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionToken or sessionId' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Fetch table session with table and restaurant info
    let sessionQuery = supabase
      .from('table_sessions')
      .select(`
        id,
        session_token,
        status,
        opened_at,
        table_id,
        restaurant_id,
        tables!inner (
          id,
          table_number,
          section
        ),
        restaurants!inner (
          id,
          name,
          slug,
          upi_id,
          gstin,
          is_tax_inclusive,
          is_service_charge_enabled,
          service_charge_rate,
          default_tax_rate,
          currency
        )
      `);

    if (sessionToken) {
      sessionQuery = sessionQuery.eq('session_token', sessionToken);
    } else if (sessionId) {
      sessionQuery = sessionQuery.eq('id', sessionId);
    }

    const { data: session, error: sessionError } = await sessionQuery.maybeSingle();

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Table session not found' },
        { status: 404 }
      );
    }

    const restaurant = session.restaurants;
    const table = session.tables;

    // 2. Fetch all orders for this session that are NOT cancelled
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        customer_note,
        created_at,
        order_items (
          id,
          menu_item_id,
          variant_id,
          item_name,
          variant_name,
          unit_price,
          quantity,
          tax_rate,
          cooking_request,
          status,
          menu_items (
            category_id
          ),
          order_item_addons (
            id,
            addon_name,
            price
          )
        )
      `)
      .eq('table_session_id', session.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (ordersError) {
      throw new Error(`Failed to load orders: ${ordersError.message}`);
    }

    // 3. Collect all active items
    const billingItems: BillingItemInput[] = [];
    interface ItemSummaryLine {
      id: string;
      orderNumber: number;
      name: string;
      variantName?: string | null;
      unitPrice: number;
      quantity: number;
      addons: { name: string; price: number }[];
      lineTotal: number;
      taxRate: number;
      cookingRequest?: string | null;
    }

    const itemsSummary: ItemSummaryLine[] = [];

    (orders || []).forEach((order) => {
      (order.order_items || []).forEach((item) => {
        if (item.status === 'cancelled') return;

        const addonsList = (item.order_item_addons || []).map((a) => ({
          name: a.addon_name,
          price: Number(a.price),
        }));

        const addonsTotal = addonsList.reduce((sum, a) => sum + a.price, 0);
        const lineTotal = (Number(item.unit_price) + addonsTotal) * item.quantity;

        billingItems.push({
          menuItemId: item.menu_item_id,
          name: item.item_name,
          categoryId: item.menu_items?.category_id || null,
          unitPrice: Number(item.unit_price),
          quantity: item.quantity,
          taxRate: Number(item.tax_rate ?? restaurant.default_tax_rate ?? 5),
          addons: addonsList,
        });

        itemsSummary.push({
          id: item.id,
          orderNumber: order.order_number,
          name: item.item_name,
          variantName: item.variant_name,
          unitPrice: Number(item.unit_price),
          quantity: item.quantity,
          addons: addonsList,
          lineTotal: Number(lineTotal.toFixed(2)),
          taxRate: Number(item.tax_rate ?? restaurant.default_tax_rate ?? 5),
          cookingRequest: item.cooking_request,
        });
      });
    });

    // 4. Check for active offer if couponCode provided
    let offerInput: BillingOfferInput | null = null;
    if (couponCode) {
      const { data: offerData } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .ilike('code', couponCode)
        .eq('is_active', true)
        .maybeSingle();

      if (offerData) {
        offerInput = {
          id: offerData.id,
          code: offerData.code,
          title: offerData.title,
          discountType: offerData.discount_type as 'percentage' | 'flat',
          discountValue: Number(offerData.discount_value),
          minBillAmount: Number(offerData.min_bill_amount || 0),
          maxDiscountCap: offerData.max_discount_cap ? Number(offerData.max_discount_cap) : null,
          applicableCategoryId: offerData.applicable_category_id,
          happyHourStart: offerData.happy_hour_start,
          happyHourEnd: offerData.happy_hour_end,
          daysOfWeek: offerData.days_of_week,
        };
      } else {
        // Offer code doesn't exist
        offerInput = {
          code: couponCode,
          title: 'Invalid Coupon',
          discountType: 'percentage',
          discountValue: 0,
        };
      }
    }

    // 5. Run pure billing calculation
    const settings: BillingSettingsInput = {
      isTaxInclusive: Boolean(restaurant.is_tax_inclusive),
      defaultTaxRate: Number(restaurant.default_tax_rate || 5),
      isServiceChargeEnabled: Boolean(restaurant.is_service_charge_enabled),
      serviceChargeRate: Number(restaurant.service_charge_rate || 0),
    };

    const bill = calculateBill({
      items: billingItems,
      settings,
      offer: offerInput,
    });

    // 6. Check if an invoice already exists for this table session
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('table_session_id', session.id)
      .maybeSingle();

    // 7. Generate UPI payment link & QR code
    const upiUri = buildUpiUri({
      vpa: restaurant.upi_id || 'cafe.darjeeling@okaxis',
      payeeName: restaurant.name,
      amount: bill.totalAmount,
      transactionNote: `Table ${table.table_number} Bill ${existingInvoice?.invoice_number ? '#' + existingInvoice.invoice_number : ''}`.trim(),
      transactionRef: existingInvoice?.invoice_number || session.session_token.slice(0, 16),
    });

    let qrDataUrl = '';
    if (bill.totalAmount > 0) {
      try {
        qrDataUrl = await generateUpiQrDataUrl(upiUri, { width: 300 });
      } catch (e) {
        console.error('Failed to generate QR data URL:', e);
      }
    }

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        token: session.session_token,
        status: session.status,
        openedAt: session.opened_at,
      },
      table: {
        id: table.id,
        tableNumber: table.table_number,
        section: table.section,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        upiId: restaurant.upi_id,
        gstin: restaurant.gstin,
        currency: restaurant.currency || 'INR',
        isTaxInclusive: restaurant.is_tax_inclusive,
      },
      bill,
      itemsSummary,
      upiUri,
      qrDataUrl,
      existingInvoice: existingInvoice || null,
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
    const message = error instanceof Error ? error.message : 'Failed to calculate bill';
    console.error('Error calculating bill:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
