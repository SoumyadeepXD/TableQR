import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateBill, BillingItemInput, BillingSettingsInput, BillingOfferInput } from '@/lib/billing/engine';
import { getIndianFinancialYear } from '@/lib/formatters';
import { buildUpiUri, generateUpiQrDataUrl } from '@/lib/payments/upi';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const { sessionToken, sessionId, couponCode } = json;

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

    // 2. Fetch all orders and items
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        order_items (
          id,
          menu_item_id,
          variant_id,
          item_name,
          variant_name,
          unit_price,
          quantity,
          tax_rate,
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
      .neq('status', 'cancelled');

    if (ordersError) {
      throw new Error(`Failed to load orders: ${ordersError.message}`);
    }

    const billingItems: BillingItemInput[] = [];

    (orders || []).forEach((order) => {
      (order.order_items || []).forEach((item) => {
        if (item.status === 'cancelled') return;

        const addonsList = (item.order_item_addons || []).map((a) => ({
          name: a.addon_name,
          price: Number(a.price),
        }));

        billingItems.push({
          menuItemId: item.menu_item_id,
          name: item.item_name,
          categoryId: item.menu_items?.category_id || null,
          unitPrice: Number(item.unit_price),
          quantity: item.quantity,
          taxRate: Number(item.tax_rate ?? restaurant.default_tax_rate ?? 5),
          addons: addonsList,
        });
      });
    });

    if (billingItems.length === 0) {
      return NextResponse.json(
        { error: 'Cannot generate invoice for empty or completely cancelled orders' },
        { status: 400 }
      );
    }

    // 3. Lookup offer if couponCode provided
    let offerInput: BillingOfferInput | null = null;
    let appliedOfferId: string | null = null;

    if (couponCode) {
      const { data: offerData } = await supabase
        .from('offers')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .ilike('code', couponCode.trim())
        .eq('is_active', true)
        .maybeSingle();

      if (offerData) {
        appliedOfferId = offerData.id;
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
      }
    }

    // 4. Calculate bill
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

    // 5. Check if an existing invoice already exists for this table session
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('table_session_id', session.id)
      .maybeSingle();

    let invoice = existingInvoice;
    const fy = getIndianFinancialYear();

    if (invoice) {
      // If invoice is already paid, do not overwrite totals
      if (invoice.payment_status === 'paid') {
        return NextResponse.json({
          success: true,
          invoice,
          alreadyPaid: true,
        });
      }

      // Update existing unpaid invoice with latest items and recomputed bill
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          subtotal: bill.itemsSubtotal,
          discount_amount: bill.discountAmount,
          service_charge_amount: bill.serviceChargeAmount,
          cgst_amount: bill.cgstAmount,
          sgst_amount: bill.sgstAmount,
          round_off_amount: bill.roundOffAmount,
          total_amount: bill.totalAmount,
          applied_offer_id: appliedOfferId,
          coupon_code: couponCode || null,
        })
        .eq('id', invoice.id)
        .select('*')
        .single();

      if (updateError) {
        throw new Error(`Failed to update invoice: ${updateError.message}`);
      }
      invoice = updatedInvoice;
    } else {
      // Generate next sequential invoice number: TQR/2026-27/0001
      let invoiceNumber = '';

      // Try RPC first
      const { data: rpcNumber } = await supabase.rpc('generate_next_invoice_number', {
        p_restaurant_id: restaurant.id,
      });

      if (rpcNumber && typeof rpcNumber === 'string') {
        invoiceNumber = rpcNumber;
      } else {
        // Fallback sequence counter via direct table operation
        const { data: seqRow } = await supabase
          .from('invoice_sequences')
          .select('last_sequence_number')
          .eq('restaurant_id', restaurant.id)
          .eq('financial_year', fy)
          .maybeSingle();

        const nextSeq = (seqRow?.last_sequence_number || 0) + 1;
        await supabase
          .from('invoice_sequences')
          .upsert({
            restaurant_id: restaurant.id,
            financial_year: fy,
            last_sequence_number: nextSeq,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'restaurant_id,financial_year' });

        invoiceNumber = `TQR/${fy}/${String(nextSeq).padStart(4, '0')}`;
      }

      // Insert new invoice record
      const { data: newInvoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          restaurant_id: restaurant.id,
          table_session_id: session.id,
          invoice_number: invoiceNumber,
          financial_year: fy,
          subtotal: bill.itemsSubtotal,
          discount_amount: bill.discountAmount,
          service_charge_amount: bill.serviceChargeAmount,
          cgst_amount: bill.cgstAmount,
          sgst_amount: bill.sgstAmount,
          round_off_amount: bill.roundOffAmount,
          total_amount: bill.totalAmount,
          applied_offer_id: appliedOfferId,
          coupon_code: couponCode || null,
          payment_method: 'upi',
          payment_status: 'unpaid',
          gstin: restaurant.gstin,
        })
        .select('*')
        .single();

      if (insertError || !newInvoice) {
        throw new Error(`Failed to create invoice: ${insertError?.message}`);
      }
      invoice = newInvoice;
    }

    // 6. Generate UPI deep link & QR
    const upiUri = buildUpiUri({
      vpa: restaurant.upi_id || 'cafe.darjeeling@okaxis',
      payeeName: restaurant.name,
      amount: invoice.total_amount,
      transactionNote: `Table ${table.table_number} Bill #${invoice.invoice_number}`,
      transactionRef: invoice.invoice_number,
    });

    const qrDataUrl = await generateUpiQrDataUrl(upiUri, { width: 300 });

    return NextResponse.json({
      success: true,
      invoice,
      bill,
      upiUri,
      qrDataUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate invoice';
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
