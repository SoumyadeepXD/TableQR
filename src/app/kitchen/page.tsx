import React, { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { KitchenDisplayBoard } from '@/components/kitchen/KitchenDisplayBoard';
import type { KitchenTicket } from '@/components/kitchen/KitchenTicketCard';
import type { KitchenMenuItem } from '@/components/kitchen/StockManagerDrawer';
import { Loader2 } from 'lucide-react';

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function KitchenContent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let restaurantId = DEMO_RESTAURANT_ID;
  let restaurantName = 'Darjeeling Chai & Cafe';
  let staffName = 'Kitchen Station';

  if (user) {
    const { data: staff } = await supabase
      .from('restaurant_staff')
      .select('restaurant_id, name, role, restaurants(name)')
      .eq('user_id', user.id)
      .maybeSingle();

    if (staff) {
      restaurantId = staff.restaurant_id;
      staffName = staff.name;
      if (staff.restaurants && typeof staff.restaurants === 'object' && 'name' in staff.restaurants) {
        restaurantName = (staff.restaurants as { name: string }).name;
      }
    }
  }

  // 1. Fetch active tickets in new, cooking, ready stages
  const { data: ticketsData } = await supabase
    .from('orders')
    .select(`
      id,
      restaurant_id,
      order_number,
      status,
      customer_note,
      cancellation_reason,
      created_at,
      tables (
        table_number,
        section
      ),
      order_items (
        id,
        item_name,
        variant_name,
        quantity,
        cooking_request,
        status,
        cancellation_reason,
        order_item_addons (
          id,
          addon_name,
          price
        )
      )
    `)
    .eq('restaurant_id', restaurantId)
    .in('status', ['new', 'cooking', 'ready'])
    .order('created_at', { ascending: true });

  // 2. Fetch menu items for stock toggle drawer
  const { data: menuData } = await supabase
    .from('menu_items')
    .select('id, name, price, is_available, is_veg')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });

  // 3. Fetch pending service requests
  const { data: serviceReqData } = await supabase
    .from('service_requests')
    .select(`
      id,
      table_id,
      type,
      status,
      created_at,
      tables (
        table_number,
        section
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const tickets = (ticketsData || []) as unknown as KitchenTicket[];
  const menuItems = (menuData || []).map((m) => ({
    ...m,
    price: Number(m.price),
  })) as KitchenMenuItem[];

  const serviceRequests = (serviceReqData || []).map((r) => ({
    ...r,
    tables: r.tables || { table_number: 'T-?', section: 'Main' },
  })) as unknown as Array<{
    id: string;
    table_id: string;
    type: 'call_waiter' | 'request_bill';
    status: 'pending' | 'acknowledged' | 'resolved';
    created_at: string;
    tables: { table_number: string; section: string };
  }>;

  return (
    <KitchenDisplayBoard
      restaurantId={restaurantId}
      restaurantName={restaurantName}
      staffName={staffName}
      initialTickets={tickets}
      initialMenuItems={menuItems}
      initialServiceRequests={serviceRequests}
    />
  );
}

export default function KitchenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-rose-600 mr-2" />
          Loading Kitchen Display Board...
        </div>
      }
    >
      <KitchenContent />
    </Suspense>
  );
}
