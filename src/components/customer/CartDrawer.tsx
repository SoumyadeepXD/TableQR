'use client';

import React, { useState } from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2, MessageSquare, AlertCircle } from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { soundManager } from '@/lib/audio';
import type { CartItem } from '@/lib/types/cart';
import { useTranslation } from '@/lib/i18n/context';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  customerNote: string;
  onUpdateCustomerNote: (note: string) => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  restaurantId: string;
  tableId: string;
  tableToken: string;
  tableNumber: string;
  tableSessionId?: string | null;
  onOrderSuccess: (order: unknown, newSessionId: string) => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  customerNote,
  onUpdateCustomerNote,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  restaurantId,
  tableId,
  tableToken,
  tableNumber,
  tableSessionId,
  onOrderSuccess,
}: CartDrawerProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);

  const handlePlaceOrder = async () => {
    if (items.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Generate unique idempotency key to prevent double taps
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      const payload = {
        restaurantId,
        tableId,
        tableToken,
        tableSessionId: tableSessionId || null,
        customerNote: customerNote.trim() || null,
        idempotencyKey,
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          variantId: i.variant?.id || null,
          name: i.name,
          variantName: i.variant?.name || null,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          taxRate: i.taxRate,
          cookingRequest: i.cookingRequest || null,
          addons: i.addons.map((a) => ({
            addonItemId: a.addonItemId,
            name: a.name,
            price: a.price,
          })),
        })),
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      // Play audio chime confirmation
      soundManager.playSuccessChime();

      // Clear local cart
      onClearCart();
      onClose();

      // Notify parent to open live orders tracking
      onOrderSuccess(data.order, data.tableSessionId);
    } catch (err: unknown) {
      console.error('Order error:', err);
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">{t('cartTitle')}</h2>
              <p className="text-xs text-slate-500">{t('tableNumber')} {tableNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-[1.2] mb-3 opacity-60" />
              <p className="text-sm font-medium text-slate-600">{t('cartEmpty')}</p>
              <p className="text-xs mt-1 text-slate-400">{t('cartEmptyDesc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div key={item.cartItemId} className="py-3.5 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-3 h-3 border flex items-center justify-center shrink-0 ${
                            item.isVeg ? 'border-emerald-600' : 'border-rose-600'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.isVeg ? 'bg-emerald-600' : 'bg-rose-600'
                            }`}
                          />
                        </span>
                        <h4 className="font-semibold text-slate-900 text-sm">{item.name}</h4>
                      </div>

                      {item.variant && (
                        <p className="text-xs text-amber-700 font-medium mt-0.5 ml-5">
                          {item.variant.name}
                        </p>
                      )}

                      {item.addons && item.addons.length > 0 && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          {item.addons.map((addon, idx) => (
                            <p key={idx} className="text-[11px] text-slate-500">
                              + {addon.name} ({addon.price === 0 ? 'Free' : formatINR(addon.price)})
                            </p>
                          ))}
                        </div>
                      )}

                      {item.cookingRequest && (
                        <p className="text-[11px] text-slate-500 italic mt-1 ml-5 bg-amber-50/80 px-2 py-0.5 rounded-md inline-block border border-amber-200/50">
                          Note: {item.cookingRequest}
                        </p>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">
                        {formatINR(item.lineTotal)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatINR(item.unitPrice + item.addons.reduce((s, a) => s + a.price, 0))} each
                      </div>
                    </div>
                  </div>

                  {/* Quantity & Delete Controls */}
                  <div className="flex items-center justify-between mt-3 ml-5">
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.cartItemId)}
                      className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>

                    <div className="flex items-center gap-2 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity - 1)}
                        className="w-5 h-5 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold text-xs min-w-4 text-center">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-5 h-5 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-600 transition cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Order-level Note */}
          {items.length > 0 && (
            <div className="pt-4 border-t border-slate-100">
              <label
                htmlFor="order-note"
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                {t('orderNoteLabel')}
              </label>
              <input
                id="order-note"
                type="text"
                maxLength={300}
                value={customerNote}
                onChange={(e) => onUpdateCustomerNote(e.target.value)}
                placeholder={t('orderNotePlaceholder')}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none transition"
              />
            </div>
          )}
        </div>

        {/* Footer with Subtotal & Place Order */}
        {items.length > 0 && (
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>{t('subtotal')} ({items.reduce((s, i) => s + i.quantity, 0)} {t('itemCount')})</span>
              <span className="font-semibold text-slate-900 text-sm">{formatINR(subtotal)}</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Taxes (GST) and final bill summary will be generated on your bill screen.
            </p>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePlaceOrder}
              className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('placingOrder')}</span>
                </>
              ) : (
                <>
                  <span>{t('placeOrder')} ({formatINR(subtotal)})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
