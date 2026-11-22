/**
 * TableQR Phase 4 Analytics Demo Data Generator
 * Seeds realistic historical orders, sessions, and paid invoices across the last 14 days
 * for the demo cafe (Darjeeling Chai & Cafe).
 */

import './load-env';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(`❌ Missing Supabase Environment Variables (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)`);
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function seedAnalytics() {
  console.log('🚀 Seeding Realistic Analytics & Historical Sales Data for TableQR...');

  // 1. Fetch tables, menu items, and categories
  const { data: tables } = await supabase
    .from('tables')
    .select('id, table_number, section')
    .eq('restaurant_id', DEMO_RESTAURANT_ID);

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('id, name, price, tax_rate, is_veg')
    .eq('restaurant_id', DEMO_RESTAURANT_ID);

  if (!tables || tables.length === 0 || !menuItems || menuItems.length === 0) {
    console.error('❌ Missing base tables or menu items. Please run the base seed script first.');
    return;
  }

  // Check existing orders count
  const { count: existingOrdersCount } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', DEMO_RESTAURANT_ID);

  if ((existingOrdersCount || 0) > 40) {
    console.log(`ℹ️ Restaurant already has ${existingOrdersCount} orders. Skipping bulk generation.`);
    return;
  }

  console.log(`📌 Generating 14-day cafe dining history across ${tables.length} tables...`);

  const now = new Date();
  let generatedInvoices = 0;
  let generatedOrders = 0;
  let invoiceSeq = 100;

  // Meal rush hour patterns (in IST hours: 9=Breakfast, 13=Lunch, 17=Tea, 20=Dinner)
  const rushHoursIST = [9, 10, 12, 13, 14, 16, 17, 18, 19, 20, 21];

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    // 3 to 6 table sessions per day
    const sessionsToday = 4 + Math.floor(Math.random() * 4);

    for (let s = 0; s < sessionsToday; s++) {
      const table = tables[Math.floor(Math.random() * tables.length)];
      const hourIST = rushHoursIST[Math.floor(Math.random() * rushHoursIST.length)];
      const minuteIST = Math.floor(Math.random() * 60);

      // Construct IST date
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() - daysAgo);

      // Convert IST to UTC (subtract 5.5 hours)
      const sessionOpenedUtc = new Date(
        Date.UTC(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hourIST, minuteIST, 0) -
          330 * 60000
      );

      // Duration: 35 to 65 minutes
      const durationMinutes = 35 + Math.floor(Math.random() * 30);
      const sessionClosedUtc = new Date(sessionOpenedUtc.getTime() + durationMinutes * 60000);

      // 1. Create table_session
      const sessionToken = `ses_demo_${daysAgo}_${s}_${Date.now()}`;
      const { data: session, error: sesError } = await supabase
        .from('table_sessions')
        .insert({
          restaurant_id: DEMO_RESTAURANT_ID,
          table_id: table.id,
          session_token: sessionToken,
          status: 'completed',
          opened_at: sessionOpenedUtc.toISOString(),
          closed_at: sessionClosedUtc.toISOString(),
        })
        .select('id')
        .single();

      if (sesError || !session) continue;

      // 2. Create order(s) for this session
      const orderCountForSession = 1 + (Math.random() > 0.7 ? 1 : 0);
      let sessionSubtotal = 0;

      for (let o = 0; o < orderCountForSession; o++) {
        const orderCreatedUtc = new Date(sessionOpenedUtc.getTime() + (o * 15 + 3) * 60000);
        const prepMinutes = 10 + Math.floor(Math.random() * 12);
        const orderUpdatedUtc = new Date(orderCreatedUtc.getTime() + prepMinutes * 60000);

        const { data: order, error: ordError } = await supabase
          .from('orders')
          .insert({
            restaurant_id: DEMO_RESTAURANT_ID,
            table_id: table.id,
            table_session_id: session.id,
            order_number: 100 + generatedOrders,
            status: 'served',
            created_at: orderCreatedUtc.toISOString(),
            updated_at: orderUpdatedUtc.toISOString(),
          })
          .select('id')
          .single();

        if (ordError || !order) continue;
        generatedOrders++;

        // Add 2 to 4 items per order
        const itemCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < itemCount; i++) {
          const item = menuItems[Math.floor(Math.random() * menuItems.length)];
          const qty = Math.random() > 0.7 ? 2 : 1;
          const unitPrice = Number(item.price);
          const taxRate = Number(item.tax_rate || 5);

          await supabase.from('order_items').insert({
            restaurant_id: DEMO_RESTAURANT_ID,
            order_id: order.id,
            menu_item_id: item.id,
            item_name: item.name,
            unit_price: unitPrice,
            quantity: qty,
            tax_rate: taxRate,
            status: 'served',
            created_at: orderCreatedUtc.toISOString(),
          });

          sessionSubtotal += unitPrice * qty;
        }
      }

      // 3. Compute discount (1 in 4 orders used WELCOME10 or HAPPY15)
      let discountAmount = 0;
      let couponCode: string | null = null;
      if (Math.random() > 0.65) {
        couponCode = Math.random() > 0.5 ? 'WELCOME10' : 'HAPPY15';
        discountAmount = Math.min(Math.round(sessionSubtotal * 0.1), 100);
      }

      const taxableBase = Math.max(sessionSubtotal - discountAmount, 0);
      const cgst = Math.round((taxableBase * 0.025) * 100) / 100;
      const sgst = cgst;
      const unroundedTotal = taxableBase + cgst + sgst;
      const roundedTotal = Math.round(unroundedTotal);
      const roundOff = Math.round((roundedTotal - unroundedTotal) * 100) / 100;

      // Payment method distribution: 60% UPI, 30% Cash, 10% Card
      const pRand = Math.random();
      const paymentMethod = pRand < 0.6 ? 'upi' : pRand < 0.9 ? 'cash' : 'card';

      invoiceSeq++;
      const invoiceNumber = `TQR/2026-27/${String(invoiceSeq).padStart(4, '0')}`;

      await supabase.from('invoices').insert({
        restaurant_id: DEMO_RESTAURANT_ID,
        table_session_id: session.id,
        invoice_number: invoiceNumber,
        financial_year: '2026-27',
        subtotal: sessionSubtotal,
        discount_amount: discountAmount,
        service_charge_amount: 0,
        cgst_amount: cgst,
        sgst_amount: sgst,
        round_off_amount: roundOff,
        total_amount: roundedTotal,
        coupon_code: couponCode,
        payment_method: paymentMethod,
        payment_status: 'paid',
        paid_at: sessionClosedUtc.toISOString(),
        created_at: sessionClosedUtc.toISOString(),
        gstin: '29AABCU9603R1ZM',
      });

      generatedInvoices++;
    }
  }

  console.log(`✨ Successfully generated ${generatedInvoices} settled invoices and ${generatedOrders} orders!`);
  console.log('📊 Analytics Dashboard is now populated with realistic 14-day trends.');
}

seedAnalytics().catch((e) => {
  console.error('❌ Failed to seed analytics:', e);
});
