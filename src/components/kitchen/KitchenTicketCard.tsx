'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  Printer,
  XCircle,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { formatISTDateTime } from '@/lib/formatters';
import { ThermalKotModal } from '@/components/printing/ThermalKotTicket';

export interface KitchenTicketItem {
  id: string;
  item_name: string;
  variant_name: string | null;
  quantity: number;
  cooking_request: string | null;
  status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
  cancellation_reason?: string | null;
  order_item_addons?: Array<{
    id: string;
    addon_name: string;
    price: number;
  }>;
}

export interface KitchenTicket {
  id: string;
  restaurant_id: string;
  order_number: number;
  status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
  customer_note: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  tables: {
    table_number: string;
    section: string;
  };
  order_items: KitchenTicketItem[];
}

interface KitchenTicketCardProps {
  ticket: KitchenTicket;
  onUpdateStatus: (orderId: string, status: 'cooking' | 'ready' | 'served') => void;
  onRequestCancel: (orderId: string, orderNumber: number) => void;
  onRequestCancelItem: (itemId: string, itemName: string) => void;
}

export function KitchenTicketCard({
  ticket,
  onUpdateStatus,
  onRequestCancel,
  onRequestCancelItem,
}: KitchenTicketCardProps) {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // Update elapsed minutes every 15 seconds
  useEffect(() => {
    const updateElapsed = () => {
      const placed = new Date(ticket.created_at).getTime();
      const now = Date.now();
      const diffMins = Math.floor((now - placed) / (1000 * 60));
      setElapsedMinutes(Math.max(0, diffMins));
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 15000);
    return () => clearInterval(interval);
  }, [ticket.created_at]);

  // Color coding based on elapsed prep time
  let timerBadgeColor = 'bg-slate-700 text-slate-300 border-slate-600';
  if (ticket.status !== 'served' && ticket.status !== 'cancelled') {
    if (elapsedMinutes >= 15) {
      timerBadgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
    } else if (elapsedMinutes >= 10) {
      timerBadgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    } else {
      timerBadgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    }
  }

  const [showPrintModal, setShowPrintModal] = useState(false);

  const handlePrintKOT = () => {
    setShowPrintModal(true);
  };

  const activeItems = ticket.order_items.filter((i) => i.status !== 'cancelled');
  const cancelledItems = ticket.order_items.filter((i) => i.status === 'cancelled');

  return (
    <div
      className={`bg-slate-800 rounded-2xl border transition-all shadow-md flex flex-col justify-between overflow-hidden ${
        ticket.status === 'new'
          ? 'border-amber-500/60 shadow-amber-950/20'
          : ticket.status === 'cooking'
          ? 'border-orange-500/60 shadow-orange-950/20'
          : 'border-emerald-500/60 shadow-emerald-950/20'
      }`}
    >
      {/* Ticket Header */}
      <div className="p-4 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-10 h-10 rounded-xl bg-amber-600 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
            {ticket.tables?.table_number || 'T-?'}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">
                #{ticket.order_number}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {ticket.tables?.section}
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              {formatISTDateTime(ticket.created_at, { timeOnly: true })}
            </span>
          </div>
        </div>

        {/* Elapsed Timer & Actions */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border flex items-center gap-1.5 ${timerBadgeColor}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{elapsedMinutes}m ago</span>
          </span>

          <button
            type="button"
            title="Print KOT"
            onClick={handlePrintKOT}
            className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-650 text-slate-300 hover:text-white transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ticket Items List */}
      <div className="p-4 flex-1 space-y-3">
        <div className="space-y-2.5 divide-y divide-slate-700/50">
          {activeItems.map((item) => (
            <div key={item.id} className="pt-2.5 first:pt-0 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 flex-1">
                <span className="w-6 h-6 rounded-lg bg-slate-700 text-amber-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {item.quantity}x
                </span>
                <div>
                  <div className="text-sm font-bold text-white">
                    {item.item_name}
                    {item.variant_name && (
                      <span className="text-amber-400 font-normal text-xs ml-1.5">
                        ({item.variant_name})
                      </span>
                    )}
                  </div>

                  {/* Add-ons */}
                  {item.order_item_addons && item.order_item_addons.length > 0 && (
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.order_item_addons.map((a) => `+ ${a.addon_name}`).join(', ')}
                    </div>
                  )}

                  {/* Cooking Request Highlighted */}
                  {item.cooking_request && (
                    <div className="mt-1 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>{item.cooking_request}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Item cancel button */}
              <button
                type="button"
                title="Cancel Item"
                onClick={() => onRequestCancelItem(item.id, item.item_name)}
                className="text-slate-500 hover:text-rose-400 p-1 transition cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Cancelled items if any */}
          {cancelledItems.map((item) => (
            <div key={item.id} className="pt-2 first:pt-0 text-xs text-slate-500 line-through flex items-center justify-between">
              <span>
                {item.quantity}x {item.item_name} (Cancelled: {item.cancellation_reason || 'N/A'})
              </span>
            </div>
          ))}
        </div>

        {/* Customer Order-level Note */}
        {ticket.customer_note && (
          <div className="mt-3 p-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-xs text-amber-200/90 font-medium flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">Table Note:</span> {ticket.customer_note}
            </div>
          </div>
        )}
      </div>

      {/* Ticket Footer Actions */}
      <div className="p-3 bg-slate-850 border-t border-slate-700/80 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onRequestCancel(ticket.id, ticket.order_number)}
          className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 border border-slate-700 text-xs font-semibold transition cursor-pointer"
        >
          Cancel
        </button>

        {ticket.status === 'new' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(ticket.id, 'cooking')}
            className="flex-1 py-2.5 px-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <ChefHat className="w-4 h-4" />
            <span>Start Cooking</span>
          </button>
        )}

        {ticket.status === 'cooking' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(ticket.id, 'ready')}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Ready</span>
          </button>
        )}

        {ticket.status === 'ready' && (
          <button
            type="button"
            onClick={() => onUpdateStatus(ticket.id, 'served')}
            className="flex-1 py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-650 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Serve Order</span>
          </button>
        )}
      </div>

      {showPrintModal && (
        <ThermalKotModal
          restaurantName="TableQR Kitchen"
          ticket={{
            orderNumber: ticket.order_number,
            tableNumber: ticket.tables?.table_number || 'T-?',
            section: ticket.tables?.section || 'Main Hall',
            createdAt: ticket.created_at,
            customerNote: ticket.customer_note,
            isReprint: ticket.status !== 'new',
            items: activeItems.map((item) => ({
              id: item.id,
              item_name: item.item_name,
              variant_name: item.variant_name,
              quantity: item.quantity,
              cooking_request: item.cooking_request,
              order_item_addons: item.order_item_addons?.map((addon) => ({
                id: addon.id,
                addon_name: addon.addon_name,
                price: addon.price,
              })),
            })),
          }}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
