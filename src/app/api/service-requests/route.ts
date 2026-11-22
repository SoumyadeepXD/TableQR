import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { serviceRequestSchema } from '@/lib/validations/order';

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const result = serviceRequestSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid service request data', details: result.error.flatten() },
        { status: 400 }
      );
    }

    const { restaurantId, tableId, tableToken, type } = result.data;
    let { tableSessionId } = result.data;

    const supabase = await createClient();

    // 1. Verify table
    const { data: table, error: tableError } = await supabase
      .from('tables')
      .select('id, table_number')
      .eq('id', tableId)
      .eq('restaurant_id', restaurantId)
      .eq('qr_token', tableToken)
      .single();

    if (tableError || !table) {
      return NextResponse.json(
        { error: 'Table verification failed' },
        { status: 403 }
      );
    }

    // 2. Resolve active session if not provided
    if (!tableSessionId) {
      const { data: session } = await supabase
        .from('table_sessions')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('table_id', tableId)
        .eq('status', 'active')
        .order('opened_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (session) {
        tableSessionId = session.id;
      } else {
        const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const { data: newSession } = await supabase
          .from('table_sessions')
          .insert({
            restaurant_id: restaurantId,
            table_id: tableId,
            session_token: sessionToken,
            status: 'active',
          })
          .select('id')
          .single();
        tableSessionId = newSession?.id || null;
      }
    }

    if (!tableSessionId) {
      return NextResponse.json(
        { error: 'Could not associate table session' },
        { status: 400 }
      );
    }

    // 3. Prevent spamming identical pending requests within 30 seconds
    const thirtySecsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const { data: recentRequest } = await supabase
      .from('service_requests')
      .select('id, created_at')
      .eq('restaurant_id', restaurantId)
      .eq('table_id', tableId)
      .eq('type', type)
      .eq('status', 'pending')
      .gte('created_at', thirtySecsAgo)
      .maybeSingle();

    if (recentRequest) {
      return NextResponse.json({
        success: true,
        alreadyRequested: true,
        message: 'Your request is already received by staff.',
      });
    }

    // 4. Insert request
    const { data: newReq, error: insertError } = await supabase
      .from('service_requests')
      .insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_session_id: tableSessionId,
        type,
        status: 'pending',
      })
      .select('id, type, status, created_at')
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      request: newReq,
      message: type === 'call_waiter' ? 'Staff notified to attend your table!' : 'Bill request sent to cashier!',
    });
  } catch (err: unknown) {
    console.error('Service request error:', err);
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    let query = supabase
      .from('service_requests')
      .select(`
        id,
        restaurant_id,
        table_id,
        type,
        status,
        created_at,
        tables (
          table_number,
          section
        )
      `)
      .order('created_at', { ascending: false });

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data: requests, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, requests });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const json = await request.json();
    const { requestId, status } = json;

    if (!requestId || !status) {
      return NextResponse.json(
        { error: 'Missing requestId or status' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('service_requests')
      .update({ status })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, request: data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
