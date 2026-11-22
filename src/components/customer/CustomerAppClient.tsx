'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Utensils,
  Search,
  Bell,
  Receipt,
  ShoppingBag,
  Plus,
  Clock,
  Sparkles,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { createClient } from '@/lib/supabase/client';
import { soundManager } from '@/lib/audio';
import { ItemCustomizerModal, MenuItemWithDetails } from './ItemCustomizerModal';
import { CartDrawer } from './CartDrawer';
import { LiveOrdersDrawer, PlacedOrder } from './LiveOrdersDrawer';
import type { CartItem } from '@/lib/types/cart';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { PwaInstallPrompt } from '@/components/common/PwaInstallPrompt';

interface CategoryWithItems {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  items: MenuItemWithDetails[];
}

interface RestaurantData {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  address: string | null;
  city: string;
  currency: string;
  brand_color: string;
  is_tax_inclusive: boolean;
  upi_id: string;
  upi_name: string;
}

interface TableData {
  id: string;
  table_number: string;
  section: string;
  capacity: number;
  qr_token: string;
}

interface CustomerAppClientProps {
  restaurant: RestaurantData;
  table: TableData;
  categories: CategoryWithItems[];
  initialSessionId?: string | null;
}

export function CustomerAppClient({
  restaurant,
  table,
  categories: initialCategories,
  initialSessionId,
}: CustomerAppClientProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CategoryWithItems[]>(initialCategories);
  const [searchQuery, setSearchQuery] = useState('');
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>(
    initialCategories[0]?.id || ''
  );

  const cartStorageKey = `tqr_cart_${table.qr_token}`;

  // Cart State (Persisted in localStorage via lazy initializers)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`tqr_cart_${table.qr_token}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items)) return parsed.items;
      }
    } catch {}
    return [];
  });

  const [customerNote, setCustomerNote] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const saved = localStorage.getItem(`tqr_cart_${table.qr_token}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.note === 'string') return parsed.note;
      }
    } catch {}
    return '';
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);
  const [selectedItemForCustomizer, setSelectedItemForCustomizer] =
    useState<MenuItemWithDetails | null>(null);

  // Table Session & Orders State
  const [tableSessionId, setTableSessionId] = useState<string | null>(
    initialSessionId || null
  );
  const [placedOrders, setPlacedOrders] = useState<PlacedOrder[]>([]);
  const [isOrdersDrawerOpen, setIsOrdersDrawerOpen] = useState(false);

  // Service Request Feedback (Call Waiter / Request Bill)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCallingWaiter, setIsCallingWaiter] = useState(false);
  const [waiterCooldown, setWaiterCooldown] = useState(0);

  const supabase = createClient();

  // Save cart to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(
        cartStorageKey,
        JSON.stringify({ items: cartItems, note: customerNote })
      );
    } catch (e) {
      console.warn('Failed to save cart to storage:', e);
    }
  }, [cartItems, customerNote, cartStorageKey]);

  // Fetch existing session orders
  const fetchSessionOrders = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/orders?tableSessionId=${sessionId}`);
      const data = await res.json();
      if (res.ok && data.orders) {
        setPlacedOrders(data.orders);
      }
    } catch (err) {
      console.warn('Failed to fetch session orders:', err);
    }
  }, []);

  useEffect(() => {
    if (!tableSessionId) return;
    let isMounted = true;
    fetch(`/api/orders?tableSessionId=${tableSessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.orders) {
          setPlacedOrders(data.orders);
        }
      })
      .catch((err) => console.warn('Failed to fetch session orders:', err));

    return () => {
      isMounted = false;
    };
  }, [tableSessionId]);

  // 3. Supabase Realtime subscriptions:
  // - Menu items availability updates (when kitchen marks item out-of-stock)
  // - Orders updates (when kitchen changes status)
  useEffect(() => {
    const channel = supabase
      .channel(`customer_realtime_${table.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'menu_items',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; is_available: boolean };
          setCategories((prevCats) =>
            prevCats.map((cat) => ({
              ...cat,
              items: cat.items.map((item) =>
                item.id === updated.id
                  ? { ...item, is_available: updated.is_available }
                  : item
              ),
            }))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          if (tableSessionId) {
            fetchSessionOrders(tableSessionId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurant.id, table.id, tableSessionId, fetchSessionOrders]);

  // 4. Cart Action Handlers
  const handleAddToCart = (configuredItem: CartItem) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.cartItemId === configuredItem.cartItemId);
      if (existingIndex > -1) {
        const copy = [...prev];
        copy[existingIndex].quantity += configuredItem.quantity;
        copy[existingIndex].lineTotal =
          (copy[existingIndex].unitPrice +
            copy[existingIndex].addons.reduce((s, a) => s + a.price, 0)) *
          copy[existingIndex].quantity;
        return copy;
      }
      return [...prev, configuredItem];
    });

    setToastMessage(`Added "${configuredItem.name}" to cart`);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleUpdateQuantity = (cartItemId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartItemId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => {
        if (item.cartItemId === cartItemId) {
          const unitTotal =
            item.unitPrice + item.addons.reduce((sum, a) => sum + a.price, 0);
          return {
            ...item,
            quantity: newQty,
            lineTotal: unitTotal * newQty,
          };
        }
        return item;
      })
    );
  };

  const handleRemoveItem = (cartItemId: string) => {
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    setCustomerNote('');
    localStorage.removeItem(cartStorageKey);
  };

  const handleOpenCustomizer = (item: MenuItemWithDetails) => {
    if (!item.is_available) return;
    setSelectedItemForCustomizer(item);
    setIsCustomizerOpen(true);
  };

  // 5. Service Request Handlers ("Call Waiter", "Request Bill")
  const handleServiceRequest = async (type: 'call_waiter' | 'request_bill') => {
    if (type === 'call_waiter' && waiterCooldown > 0) return;

    setIsCallingWaiter(true);
    try {
      const res = await fetch('/api/service-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          tableId: table.id,
          tableToken: table.qr_token,
          tableSessionId,
          type,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        soundManager.playSuccessChime();
        setToastMessage(data.message || 'Staff notified');
        setTimeout(() => setToastMessage(null), 3500);

        if (type === 'call_waiter') {
          setWaiterCooldown(30);
          const interval = setInterval(() => {
            setWaiterCooldown((cd) => {
              if (cd <= 1) {
                clearInterval(interval);
                return 0;
              }
              return cd - 1;
            });
          }, 1000);
        }
      }
    } catch (e) {
      console.warn('Service request error:', e);
    } finally {
      setIsCallingWaiter(false);
    }
  };

  // Filter Categories and Items
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const matchingItems = cat.items.filter((item) => {
          if (isVegOnly && !item.is_veg) return false;
          if (!searchQuery.trim()) return true;
          const q = searchQuery.toLowerCase();
          return (
            item.name.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
          );
        });

        return {
          ...cat,
          items: matchingItems,
        };
      })
      .filter((cat) => cat.items.length > 0);
  }, [categories, isVegOnly, searchQuery]);

  const totalCartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900/95 text-white text-xs font-semibold rounded-2xl shadow-xl backdrop-blur-md border border-slate-700/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 max-w-sm w-full mx-4 justify-center">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Brand Header */}
      <header
        className="text-white p-5 pb-6 shadow-md transition-colors"
        style={{ backgroundColor: restaurant.brand_color || '#d97706' }}
      >
        <div className="max-w-xl mx-auto">
          {/* Top Row: Name & Table */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-white/20 backdrop-blur-xs rounded-xl shadow-xs">
                <Utensils className="w-5 h-5 text-white" />
              </span>
              <div>
                <h1 className="font-extrabold text-base tracking-tight leading-tight">
                  {restaurant.name}
                </h1>
                <p className="text-[11px] text-white/80">{restaurant.address || restaurant.city}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <LanguageSelector variant="pill" className="mr-1" />
              <span className="px-3 py-1 bg-white/25 backdrop-blur-md rounded-full text-xs font-bold tracking-wide uppercase shadow-xs">
                {t('tableNumber')} {table.table_number}
              </span>
            </div>
          </div>

          {/* Action Buttons: Call Waiter & Request Bill */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              disabled={isCallingWaiter || waiterCooldown > 0}
              onClick={() => handleServiceRequest('call_waiter')}
              className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 disabled:opacity-60 backdrop-blur-xs border border-white/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>
                {waiterCooldown > 0 ? `Called (${waiterCooldown}s)` : t('callWaiter')}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleServiceRequest('request_bill')}
              className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/20 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>{t('requestBill')}</span>
            </button>

            {placedOrders.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setIsOrdersDrawerOpen(true)}
                  className="py-2 px-3 bg-white text-slate-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Orders ({placedOrders.length})</span>
                </button>

                <Link
                  href={`/r/${restaurant.slug}/t/${table.qr_token}/bill`}
                  className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer active:scale-95"
                >
                  <Receipt className="w-3.5 h-3.5" />
                  <span>{t('viewBill').split(' ')[0]}</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sticky Search & Filter Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-xl mx-auto px-4 py-3 space-y-2.5">
          {/* Search Input & Veg Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs bg-slate-100 hover:bg-slate-100/80 focus:bg-white border border-transparent focus:border-amber-500 rounded-xl pl-9 pr-3 py-2 outline-none transition"
              />
            </div>

            {/* Indian Veg Only Toggle */}
            <button
              type="button"
              onClick={() => setIsVegOnly((v) => !v)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                isVegOnly
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="w-3 h-3 border border-emerald-600 flex items-center justify-center shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              </span>
              <span>{t('vegOnly')}</span>
            </button>
          </div>

          {/* Horizontal Category Nav */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategory(cat.id);
                    const el = document.getElementById(`cat-${cat.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Menu Catalog */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-8">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Search className="w-10 h-10 mx-auto stroke-[1.2] mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-700">No items found</p>
            <p className="text-xs text-slate-400 mt-1">Try clearing your search or veg filters</p>
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <section key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-32 space-y-3">
              <div className="border-b border-slate-200/80 pb-2">
                <h2 className="text-base font-extrabold text-slate-900">{cat.name}</h2>
                {cat.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{cat.description}</p>
                )}
              </div>

              <div className="space-y-3">
                {cat.items.map((item) => {
                  const hasOptions =
                    (item.item_variants && item.item_variants.length > 0) ||
                    (item.addon_groups && item.addon_groups.length > 0);

                  const cartItemCount = cartItems
                    .filter((ci) => ci.menuItemId === item.id)
                    .reduce((sum, ci) => sum + ci.quantity, 0);

                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-2xl p-4 border border-slate-200/80 shadow-2xs flex gap-3 transition-opacity ${
                        !item.is_available ? 'opacity-60 bg-slate-50/80' : ''
                      }`}
                    >
                      {/* Left: Info */}
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {/* Veg / Non-Veg Icon */}
                            <span
                              className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                                item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                                }`}
                              />
                            </span>

                            {item.is_bestseller && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-100 text-amber-800 uppercase tracking-wide">
                                Bestseller
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-slate-900 text-sm mt-1.5 leading-snug">
                            {item.name}
                          </h3>

                          <div className="font-extrabold text-slate-900 text-sm mt-1">
                            {formatINR(Number(item.price))}
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}
                        </div>

                        {/* Sold Out / Customization Hints */}
                        <div className="mt-3 flex items-center gap-2">
                          {!item.is_available ? (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-100 text-red-700">
                              Sold Out
                            </span>
                          ) : hasOptions ? (
                            <span className="text-[11px] text-amber-700 font-medium">
                              Customizable options
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Right: Add Button */}
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <button
                          type="button"
                          disabled={!item.is_available}
                          onClick={() => handleOpenCustomizer(item)}
                          className={`min-w-20 py-2 px-3 rounded-xl font-bold text-xs shadow-xs transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            !item.is_available
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : cartItemCount > 0
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>
                            {cartItemCount > 0 ? `Added (${cartItemCount})` : 'ADD'}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-4 left-0 right-0 z-40 px-4">
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="w-full py-3.5 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl shadow-xl shadow-amber-600/30 flex items-center justify-between transition cursor-pointer active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-bold text-xs">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <div className="font-extrabold text-sm">{formatINR(totalCartPrice)}</div>
                  <div className="text-[11px] text-amber-100">Plus applicable taxes</div>
                </div>
              </div>

              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <span>View Cart</span>
                <ShoppingBag className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Modals & Drawers */}
      <ItemCustomizerModal
        item={selectedItemForCustomizer}
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        customerNote={customerNote}
        onUpdateCustomerNote={setCustomerNote}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        restaurantId={restaurant.id}
        tableId={table.id}
        tableToken={table.qr_token}
        tableNumber={table.table_number}
        tableSessionId={tableSessionId}
        onOrderSuccess={(order, newSessionId) => {
          setTableSessionId(newSessionId);
          fetchSessionOrders(newSessionId);
          setIsOrdersDrawerOpen(true);
        }}
      />

      <LiveOrdersDrawer
        isOpen={isOrdersDrawerOpen}
        onClose={() => setIsOrdersDrawerOpen(false)}
        orders={placedOrders}
        tableNumber={table.table_number}
        onOrderMore={() => setIsOrdersDrawerOpen(false)}
        onRequestBill={() => {
          setIsOrdersDrawerOpen(false);
          handleServiceRequest('request_bill');
        }}
        billUrl={`/r/${restaurant.slug}/t/${table.qr_token}/bill`}
      />

      <PwaInstallPrompt />
    </div>
  );
}
