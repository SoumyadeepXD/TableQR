import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';
const EXPECTED_AGENT_SECRET = process.env.PRINT_AGENT_SECRET || 'tableqr-agent-secret-demo';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const secretHeader = req.headers.get('x-agent-secret') || req.nextUrl.searchParams.get('secret');
    const restaurantIdHeader = req.headers.get('x-restaurant-id') || req.nextUrl.searchParams.get('restaurantId');

    if (!secretHeader || secretHeader !== EXPECTED_AGENT_SECRET) {
      return NextResponse.json({ error: 'Unauthorized: Invalid agent secret' }, { status: 401 });
    }

    const restaurantId = restaurantIdHeader || DEMO_RESTAURANT_ID;
    const body = await req.json().catch(() => ({}));
    const { printerType, success = true, errorMessage } = body;

    // Check if this was a KOT job with an orderId
    let orderId: string | null = null;
    if (id.startsWith('kot-')) {
      orderId = id.replace('kot-', '');
    } else if (id.startsWith('reprint-')) {
      const parts = id.split('-');
      orderId = parts[1] || null;
    }

    const admin = createAdminClient();

    if (orderId && success) {
      // Record in audit_logs so it won't be re-fetched by auto-print polling
      await admin.from('audit_logs').insert({
        restaurant_id: restaurantId,
        user_id: null,
        action: 'kot_printed_by_agent',
        entity_type: 'orders',
        entity_id: orderId,
        details: {
          jobId: id,
          printerType: printerType || 'unknown',
          printedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      jobId: id,
      acknowledgedAt: new Date().toISOString(),
      status: success ? 'printed' : 'failed',
      errorMessage: errorMessage || null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
