'use client';

import React, { useState } from 'react';
import { X, Search, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { formatINR } from '@/lib/formatters';

export interface KitchenMenuItem {
  id: string;
  name: string;
  price: number;
  is_available: boolean;
  is_veg: boolean;
  category_name?: string;
}

interface StockManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: KitchenMenuItem[];
  onToggleStock: (itemId: string, newAvailable: boolean) => Promise<void>;
}

export function StockManagerDrawer({
  isOpen,
  onClose,
  items,
  onToggleStock,
}: StockManagerDrawerProps) {
  const [search, setSearch] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggle = async (item: KitchenMenuItem) => {
    setLoadingId(item.id);
    try {
      await onToggleStock(item.id, !item.is_available);
    } finally {
      setLoadingId(null);
    }
  };

  const outOfStockCount = items.filter((i) => !i.is_available).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-slate-900 border-l border-slate-800 text-white w-full max-w-md h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-base text-white">Menu Availability (86 List)</h2>
              {outOfStockCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {outOfStockCount} Sold Out
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Toggle items out of stock. Customer menus update instantly in real time.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter items by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-white placeholder-slate-500 outline-none focus:border-amber-500 transition"
            />
          </div>
        </div>

        {/* Items List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {filteredItems.map((item) => {
            const isLoading = loadingId === item.id;
            return (
              <div
                key={item.id}
                className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                  item.is_available
                    ? 'bg-slate-800/80 border-slate-700/80'
                    : 'bg-rose-950/20 border-rose-900/50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className={`w-3 h-3 border flex items-center justify-center shrink-0 ${
                      item.is_veg ? 'border-emerald-500' : 'border-rose-500'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </span>
                  <div>
                    <span className="font-semibold text-xs text-white block">{item.name}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatINR(item.price)}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleToggle(item)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                    item.is_available
                      ? 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
                      : 'bg-rose-600 text-white hover:bg-rose-700 shadow-xs'
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : item.is_available ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In Stock</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Sold Out</span>
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
