'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ChefHat,
  Volume2,
  VolumeX,
  RefreshCw,
  SlidersHorizontal,
  Bell,
  CheckCircle2,
  Search,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { soundManager } from '@/lib/audio';
import { KitchenTicketCard, KitchenTicket } from './KitchenTicketCard';
import { StockManagerDrawer, KitchenMenuItem } from './StockManagerDrawer';
import { CancelReasonModal } from './CancelReasonModal';

interface ServiceReq {
  id: string;
  table_id: string;
  type: 'call_waiter' | 'request_bill';
  status: 'pending' | 'acknowledged' | 'resolved';
  created_at: string;
  tables: {
    table_number: string;
    section: string;
  };
}

interface KitchenDisplayBoardProps {
  restaurantId: string;
  restaurantName: string;
  staffName: string;
  initialTickets: KitchenTicket[];
  initialMenuItems: KitchenMenuItem[];
  initialServiceRequests: ServiceReq[];
}

export function KitchenDisplayBoard({
  restaurantId,
  restaurantName,
  staffName,
  initialTickets,
  initialMenuItems,
  initialServiceRequests,
}: KitchenDisplayBoardProps) {
  const [tickets, setTickets] = useState<KitchenTicket[]>(initialTickets);
  const [menuItems, setMenuItems] = useState<KitchenMenuItem[]>(initialMenuItems);
  const [serviceRequests, setServiceRequests] = useState<ServiceReq[]>(initialServiceRequests);

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isStockDrawerOpen, setIsStockDrawerOpen] = useState(false);
  const [selectedColumnFilter, setSelectedColumnFilter] = useState<'all' | 'new' | 'cooking' | 'ready'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  // Cancel Modal State
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    type: 'order' | 'item';
    id: string;
    title: string;
  }>({
    isOpen: false,
    type: 'order',
    id: '',
    title: '',
  });

  const supabase = createClient();

  // 1. Fetch live tickets
  const fetchTickets = useCallback(async () => {
    try {
      const { data, error } = await supabase
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

      if (data && !error) {
        setTickets(data as unknown as KitchenTicket[]);
      }
    } catch (e) {
      console.warn('Failed to refresh kitchen tickets:', e);
    }
  }, [supabase, restaurantId]);

  // 2. Fetch service requests
  const fetchServiceRequests = useCallback(async () => {
    try {
      const { data } = await supabase
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

      if (data) {
        setServiceRequests(data as unknown as ServiceReq[]);
      }
    } catch (e) {
      console.warn('Failed to refresh service requests:', e);
    }
  }, [supabase, restaurantId]);

  // 3. Setup Supabase Realtime for orders and service requests
  useEffect(() => {
    const channel = supabase
      .channel(`kitchen_board_${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          fetchTickets();
          if (payload.eventType === 'INSERT' && soundEnabled) {
            soundManager.playKitchenAlert();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          fetchServiceRequests();
          if (payload.eventType === 'INSERT' && soundEnabled) {
            soundManager.playSuccessChime();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; is_available: boolean };
          setMenuItems((prev) =>
            prev.map((item) =>
              item.id === updated.id
                ? { ...item, is_available: updated.is_available }
                : item
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurantId, soundEnabled, fetchTickets, fetchServiceRequests]);

  // 4. Update order status
  const handleUpdateStatus = async (orderId: string, status: 'cooking' | 'ready' | 'served') => {
    // Optimistic UI update
    setTickets((prev) =>
      prev
        .map((t) => (t.id === orderId ? { ...t, status } : t))
        .filter((t) => (status === 'served' ? t.id !== orderId : true))
    );

    try {
      const res = await fetch(`/api/kitchen/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        fetchTickets();
      }
    } catch {
      fetchTickets();
    }
  };

  // 5. Cancel order or item with reason
  const handleConfirmCancel = async (reason: string) => {
    if (cancelModal.type === 'order') {
      try {
        await fetch(`/api/kitchen/orders/${cancelModal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', cancellationReason: reason }),
        });
        fetchTickets();
      } catch (err) {
        console.error('Cancel order error:', err);
      }
    } else {
      try {
        await fetch(`/api/kitchen/items/${cancelModal.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'cancelled', cancellationReason: reason }),
        });
        fetchTickets();
      } catch (err) {
        console.error('Cancel item error:', err);
      }
    }
  };

  // 6. Toggle Stock (86 item)
  const handleToggleStock = async (itemId: string, newAvailable: boolean) => {
    // Optimistic update
    setMenuItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, is_available: newAvailable } : i))
    );

    await fetch(`/api/kitchen/menu-items/${itemId}/toggle-stock`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAvailable: newAvailable }),
    });
  };

  // 7. Acknowledge Service Request
  const handleAcknowledgeRequest = async (requestId: string) => {
    setServiceRequests((prev) => prev.filter((r) => r.id !== requestId));
    await fetch('/api/service-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId, status: 'acknowledged' }),
    });
  };

  // Filter tickets into columns
  const filteredTickets = useMemo(() => {
    if (!searchFilter.trim()) return tickets;
    const q = searchFilter.toLowerCase();
    return tickets.filter(
      (t) =>
        t.tables?.table_number.toLowerCase().includes(q) ||
        String(t.order_number).includes(q) ||
        t.order_items.some((i) => i.item_name.toLowerCase().includes(q))
    );
  }, [tickets, searchFilter]);

  const newTickets = filteredTickets.filter((t) => t.status === 'new');
  const cookingTickets = filteredTickets.filter((t) => t.status === 'cooking');
  const readyTickets = filteredTickets.filter((t) => t.status === 'ready');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header Bar */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white shadow-md">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                Live Kitchen Display (KOT)
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase tracking-wider">
                Live Station
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {restaurantName} • {staffName}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-750'
                : 'bg-slate-800 border-slate-700 text-slate-500'
            }`}
            title={soundEnabled ? 'Sound alert enabled' : 'Sound alert muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Alerts ON' : 'Muted'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              fetchTickets();
              fetchServiceRequests();
            }}
            className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750 transition cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* 86 List / Stock Manager Button */}
          <button
            type="button"
            onClick={() => setIsStockDrawerOpen(true)}
            className="py-2.5 px-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition cursor-pointer active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span>Stock / 86 List</span>
          </button>
        </div>
      </header>

      {/* Service Request Banner (Waiter / Bill Calls) */}
      {serviceRequests.length > 0 && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center shrink-0 font-bold">
              <Bell className="w-4 h-4 animate-bounce" />
            </div>
            <div className="flex items-center gap-3 text-xs">
              {serviceRequests.map((req) => (
                <div
                  key={req.id}
                  className="px-3 py-1 bg-slate-900 border border-amber-500/40 rounded-xl flex items-center gap-2"
                >
                  <span className="font-bold text-amber-300">
                    {req.tables?.table_number || 'Table'}
                  </span>
                  <span className="text-slate-300">
                    {req.type === 'call_waiter' ? 'called waiter' : 'requested bill'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAcknowledgeRequest(req.id)}
                    className="ml-1 text-[10px] px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Column Filters on Mobile / Tablet */}
      <div className="px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        {/* Column Stage Tabs */}
        <div className="flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedColumnFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedColumnFilter === 'all'
                ? 'bg-white text-slate-950'
                : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
            }`}
          >
            All Columns ({tickets.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedColumnFilter('new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedColumnFilter === 'new'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-900 text-amber-400 hover:bg-slate-800'
            }`}
          >
            New ({newTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedColumnFilter('cooking')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedColumnFilter === 'cooking'
                ? 'bg-orange-500 text-white'
                : 'bg-slate-900 text-orange-400 hover:bg-slate-800'
            }`}
          >
            Cooking ({cookingTickets.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedColumnFilter('ready')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              selectedColumnFilter === 'ready'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-900 text-emerald-400 hover:bg-slate-800'
            }`}
          >
            Ready ({readyTickets.length})
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search table or item..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full text-xs bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
          />
        </div>
      </div>

      {/* Main Kanban Board */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-w-full lg:min-w-[1000px]">
          {/* Column 1: NEW ORDERS */}
          {(selectedColumnFilter === 'all' || selectedColumnFilter === 'new') && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-amber-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                  <h2 className="font-extrabold text-sm tracking-wider uppercase text-amber-400">
                    New Tickets
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300">
                  {newTickets.length}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                {newTickets.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs">
                    No new orders right now
                  </div>
                ) : (
                  newTickets.map((ticket) => (
                    <KitchenTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onUpdateStatus={handleUpdateStatus}
                      onRequestCancel={(id, num) =>
                        setCancelModal({
                          isOpen: true,
                          type: 'order',
                          id,
                          title: `Cancel Order #${num}?`,
                        })
                      }
                      onRequestCancelItem={(id, name) =>
                        setCancelModal({
                          isOpen: true,
                          type: 'item',
                          id,
                          title: `Cancel Item: "${name}"?`,
                        })
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Column 2: COOKING NOW */}
          {(selectedColumnFilter === 'all' || selectedColumnFilter === 'cooking') && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-orange-500">
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4 text-orange-400" />
                  <h2 className="font-extrabold text-sm tracking-wider uppercase text-orange-400">
                    Cooking Now
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-300">
                  {cookingTickets.length}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                {cookingTickets.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs">
                    No tickets currently in cooking
                  </div>
                ) : (
                  cookingTickets.map((ticket) => (
                    <KitchenTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onUpdateStatus={handleUpdateStatus}
                      onRequestCancel={(id, num) =>
                        setCancelModal({
                          isOpen: true,
                          type: 'order',
                          id,
                          title: `Cancel Order #${num}?`,
                        })
                      }
                      onRequestCancelItem={(id, name) =>
                        setCancelModal({
                          isOpen: true,
                          type: 'item',
                          id,
                          title: `Cancel Item: "${name}"?`,
                        })
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Column 3: READY TO SERVE */}
          {(selectedColumnFilter === 'all' || selectedColumnFilter === 'ready') && (
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-2 border-b-2 border-emerald-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <h2 className="font-extrabold text-sm tracking-wider uppercase text-emerald-400">
                    Ready to Serve
                  </h2>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300">
                  {readyTickets.length}
                </span>
              </div>

              <div className="space-y-4 flex-1">
                {readyTickets.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-600 text-xs">
                    No orders waiting to be served
                  </div>
                ) : (
                  readyTickets.map((ticket) => (
                    <KitchenTicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onUpdateStatus={handleUpdateStatus}
                      onRequestCancel={(id, num) =>
                        setCancelModal({
                          isOpen: true,
                          type: 'order',
                          id,
                          title: `Cancel Order #${num}?`,
                        })
                      }
                      onRequestCancelItem={(id, name) =>
                        setCancelModal({
                          isOpen: true,
                          type: 'item',
                          id,
                          title: `Cancel Item: "${name}"?`,
                        })
                      }
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Stock Manager Drawer (86 List) */}
      <StockManagerDrawer
        isOpen={isStockDrawerOpen}
        onClose={() => setIsStockDrawerOpen(false)}
        items={menuItems}
        onToggleStock={handleToggleStock}
      />

      {/* Cancel Reason Modal */}
      <CancelReasonModal
        isOpen={cancelModal.isOpen}
        onClose={() => setCancelModal((m) => ({ ...m, isOpen: false }))}
        title={cancelModal.title}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
