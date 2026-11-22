'use client';

import React from 'react';
import Link from 'next/link';
import { X, Clock, CheckCircle2, ChefHat, AlertCircle, Sparkles, Plus, Bell, QrCode } from 'lucide-react';
import { formatINR, formatISTDateTime } from '@/lib/formatters';
import { useTranslation } from '@/lib/i18n/context';

export interface PlacedOrderItem {
  id: string;
  item_name: string;
  variant_name: string | null;
  unit_price: number;
  quantity: number;
  cooking_request: string | null;
  status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
  order_item_addons: Array<{
    id: string;
    addon_name: string;
    price: number;
  }>;
}

export interface PlacedOrder {
  id: string;
  order_number: number;
  status: 'new' | 'cooking' | 'ready' | 'served' | 'cancelled';
  customer_note: string | null;
  created_at: string;
  order_items: PlacedOrderItem[];
}

interface LiveOrdersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  orders: PlacedOrder[];
  tableNumber: string;
  onOrderMore: () => void;
  onRequestBill: () => void;
  billUrl?: string;
}

export function LiveOrdersDrawer({
  isOpen,
  onClose,
  orders,
  tableNumber,
  onOrderMore,
  onRequestBill,
  billUrl,
}: LiveOrdersDrawerProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const getStatusBadge = (status: PlacedOrder['status']) => {
    switch (status) {
      case 'new':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            {t('orderStatusNew')}
          </span>
        );
      case 'cooking':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
            <ChefHat className="w-3.5 h-3.5 text-orange-600 animate-bounce" />
            {t('orderStatusCooking')}
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            {t('orderStatusReady')}
          </span>
        );
      case 'served':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
            {t('orderStatusServed')}
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="font-bold text-slate-900 text-base">{t('ordersTitle')}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{t('tableNumber')} {tableNumber} • Real-time tracking</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Orders List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <Clock className="w-12 h-12 mx-auto stroke-[1.2] mb-3 opacity-60" />
              <p className="text-sm font-medium text-slate-600">{t('noActiveOrders')}</p>
              <p className="text-xs mt-1 text-slate-400">{t('noActiveOrdersDesc')}</p>
            </div>
          ) : (
            orders.map((order, index) => (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
              >
                {/* Round Title & Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      Order #{order.order_number}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      ({t('orderRound')} {orders.length - index})
                    </span>
                  </div>
                  {getStatusBadge(order.status)}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  <span>Placed at {formatISTDateTime(order.created_at, { timeOnly: true })}</span>
                </div>

                {/* Items in this round */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-start justify-between text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">
                          {item.quantity}x {item.item_name}
                          {item.variant_name && (
                            <span className="text-slate-500 font-normal"> ({item.variant_name})</span>
                          )}
                        </div>
                        {item.order_item_addons && item.order_item_addons.length > 0 && (
                          <div className="text-[11px] text-slate-400 pl-2">
                            {item.order_item_addons.map((a) => `+ ${a.addon_name}`).join(', ')}
                          </div>
                        )}
                        {item.cooking_request && (
                          <div className="text-[11px] text-amber-700 italic pl-2">
                            Note: {item.cooking_request}
                          </div>
                        )}
                      </div>
                      <span className="font-medium text-slate-700">
                        {formatINR(Number(item.unit_price) * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {order.customer_note && (
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                    Order note: {order.customer_note}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 space-y-2">
          {billUrl && (
            <Link
              href={billUrl}
              className="w-full py-3 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold text-xs shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>{t('viewBill')}</span>
            </Link>
          )}

          <button
            type="button"
            onClick={onOrderMore}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Order Another Round of Items</span>
          </button>

          <button
            type="button"
            onClick={onRequestBill}
            className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-2xl font-semibold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Bell className="w-3.5 h-3.5 text-amber-600" />
            <span>{t('requestBill')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
