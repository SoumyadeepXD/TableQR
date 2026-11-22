import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { placeOrderSchema } from '@/lib/validations/order';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const result = placeOrderSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid order data', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const {
      restaurantId,
      tableId,
      tableToken,
      customerNote,
      idempotencyKey,
      items,
    } = result.data;

    let { tableSessionId } = result.data;

    const supabase = await createClient();

    // 1. Verify table and restaurant association
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('id, restaurant_id, qr_token, is_active')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .eq('qr_token', tableToken)
      .eq('is_active', true)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table could not be verified or is inactive' },
        { status: 403 }
      );
    }

    // 2. Idempotency Check: prevent duplicate orders on double taps
    if (idempotencyKey) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('id, order_number, status, created_at')
        .eq('restaurant_id', restaurantId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          message: 'Order already placed (idempotent replay)',
          order: existingOrder,
        });
      }
    }

    // 3. Ensure an active table session exists
    if (!tableSessionId) {
      // Check if an active session already exists for this table
      const { data: activeSession } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .eq('status', 'active')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeSession) {
        tableSessionId = activeSession.id;
      } else {
        // Create a new active session
        const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const { data: newSession, error: sessionError } = await supabase
          .from('table_sessions')
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            session_token: sessionToken,
            status: 'active',
          })
          .select('id')
          .single();

        if (sessionError || !newSession) {
          throw new Error('Failed to initialize table session');
        }
        tableSessionId = newSession.id;
      }
    }

    // 4. Validate menu items and recompute verified prices from the database
    // Never trust client prices!
    const menuItemIds = items.map((i) => i.menuItemId);
    const { data: dbMenuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, name, price, tax_rate, is_available')
      .in('id', menuItemIds)
      .eq('restaurant_id', restaurantId);

    if (menuError || !dbMenuItems) {
      return NextResponse.json(
        { error: 'Failed to verify menu items' },
        { status: 500 }
      );
    }

    const menuMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // Check for sold-out items
    for (const item of items) {
      const dbItem = menuMap.get(item.menuItemId);
      if (!dbItem) {
        return NextResponse.json(
          { error: `Menu item "${item.name}" not found or discontinued` },
          { status: 400 }
        );
      }
      if (!dbItem.is_available) {
        return NextResponse.json(
          { error: `Item "${dbItem.name}" is currently sold out` },
          { status: 400 }
        );
      }
    }

    // 5. Generate daily order number
    const { data: dailyNumData, error: orderNumError } = await supabase.rpc(
      'get_next_daily_order_number',
      { p_restaurant_id: restaurantId }
    );

    const orderNumber = (!orderNumError && dailyNumData) ? dailyNumData : Math.floor(100 + Math.random() * 900);

    // 6. Insert Order
    const { data: newOrder, error: orderInsertError } = await supabase
      .from('orders')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_session_id: tableSessionId,
        order_number: orderNumber,
        status: 'new',
        customer_note: customerNote || null,
        idempotency_key: idempotencyKey,
      })
      .select('id, order_number, status, created_at')
      .single();

    if (orderInsertError || !newOrder) {
      throw new Error(`Failed to create order: ${orderInsertError?.message}`);
    }

    // 7. Insert Order Items and Addons
    for (const item of items) {
      const dbItem = menuMap.get(item.menuItemId)!;
      // If variant exists, get variant price, otherwise base price
      let verifiedUnitPrice = dbItem.price;

      if (item.variantId) {
        const { data: dbVariant } = await supabase
          .from('item_variants')
          .select('id, name, price, is_available')
          .eq('id', item.variantId)
          .eq('menu_item_id', item.menuItemId)
          .single();

        if (dbVariant) {
          verifiedUnitPrice = dbVariant.price;
        }
      }

      const { data: insertedItem, error: itemError } = await supabase
        .from('order_items')
        .insert({
          restaurant_id: restaurantId,
          order_id: newOrder.id,
          menu_item_id: item.menuItemId,
          variant_id: item.variantId || null,
          item_name: item.name,
          variant_name: item.variantName || null,
          unit_price: verifiedUnitPrice,
          quantity: item.quantity,
          tax_rate: dbItem.tax_rate,
          cooking_request: item.cookingRequest || null,
          status: 'new',
        })
        .select('id')
        .single();

      if (itemError || !insertedItem) {
        console.error('Error inserting order item:', itemError);
        continue;
      }

      // Insert Addons if any
      if (item.addons && item.addons.length > 0) {
        const addonsToInsert = item.addons.map((a) => ({
          order_item_id: insertedItem.id,
          addon_item_id: a.addonItemId || null,
          addon_name: a.name,
          price: a.price,
        }));

        await supabase.from('order_item_addons').insert(addonsToInsert);
      }
    }

    return NextResponse.json({
      success: true,
      tableSessionId,
      order: newOrder,
    });
  } catch (err: unknown) {
    console.error('Order placement failed:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tableSessionId = searchParams.get('tableSessionId');

    if (!tableSessionId) {
      return NextResponse.json(
        { error: 'Missing tableSessionId query parameter' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

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
          item_name,
          variant_name,
          unit_price,
          quantity,
          cooking_request,
          status,
          order_item_addons (
            id,
            addon_name,
            price
          )
        )
      `)
      .eq('table_session_id', tableSessionId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    return NextResponse.json({ success: true, orders });
  } catch (err: unknown) {
    console.error('Fetch orders failed:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
