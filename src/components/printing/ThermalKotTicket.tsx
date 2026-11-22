'use client';

import React from 'react';
import { Printer, X } from 'lucide-react';
import { formatISTDateTime } from '@/lib/formatters';

export interface KotPrintItem {
  id: string;
  item_name: string;
  variant_name?: string | null;
  quantity: number;
  cooking_request?: string | null;
  order_item_addons?: Array<{
    id?: string;
    addon_name: string;
    price?: number;
  }>;
}

export interface KotPrintData {
  orderNumber: number;
  tableNumber: string;
  section: string;
  createdAt: string;
  customerNote?: string | null;
  items: KotPrintItem[];
  isReprint?: boolean;
}

interface ThermalKotModalProps {
  restaurantName: string;
  ticket: KotPrintData;
  onClose: () => void;
}

export function ThermalKotModal({ restaurantName, ticket, onClose }: ThermalKotModalProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-rose-500" />
            <h3 className="text-sm font-black text-white">80mm Thermal KOT Preview</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Preview */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/50 flex justify-center">
          {/* Exact 80mm (72mm printable) Thermal Slip */}
          <div
            id="thermal-kot-receipt"
            className="thermal-80mm-receipt w-[72mm] bg-white text-black p-4 font-mono text-[11px] leading-tight shadow-md select-all"
          >
            {/* Header */}
            <div className="text-center space-y-0.5 border-b-2 border-dashed border-black pb-2">
              <div className="text-[12px] font-black uppercase tracking-wider">{restaurantName}</div>
              <div className="text-[14px] font-black uppercase tracking-widest my-1">
                *** KITCHEN ORDER ***
              </div>
              {ticket.isReprint && (
                <div className="inline-block bg-black text-white px-2 py-0.5 text-[10px] font-black uppercase">
                  *** REPRINT ***
                </div>
              )}
            </div>

            {/* Table & Order Metadata */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-bold">TABLE:</span>
                <span className="text-[16px] font-black uppercase tracking-wide">
                  {ticket.tableNumber}
                </span>
              </div>
              <div className="flex justify-between text-[11px]">
                <span className="font-semibold">ORDER NO:</span>
                <span className="font-black">#{ticket.orderNumber}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>SECTION:</span>
                <span className="font-semibold uppercase">{ticket.section || 'MAIN HALL'}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>DATE/TIME:</span>
                <span>{formatISTDateTime(ticket.createdAt)}</span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span>SERVER:</span>
                <span className="font-semibold uppercase">QR DINE-IN</span>
              </div>
            </div>

            {/* Items Column Header */}
            <div className="py-1 text-[10px] font-black border-b border-black flex justify-between uppercase">
              <span>QTY & ITEM DESCRIPTION</span>
            </div>

            {/* Item Lines */}
            <div className="divide-y divide-dashed divide-slate-300 py-1">
              {ticket.items.map((it) => (
                <div key={it.id} className="py-1.5 space-y-0.5">
                  <div className="flex items-start gap-1.5 text-[12px]">
                    <span className="font-black shrink-0">[ {it.quantity} ]</span>
                    <span className="font-black uppercase tracking-tight">{it.item_name}</span>
                  </div>

                  {/* Variant */}
                  {it.variant_name && (
                    <div className="pl-6 text-[10px] font-semibold text-slate-800">
                      • Portion: {it.variant_name}
                    </div>
                  )}

                  {/* Add-ons */}
                  {it.order_item_addons && it.order_item_addons.length > 0 && (
                    <div className="pl-6 text-[10px] space-y-0.5">
                      {it.order_item_addons.map((add, idx) => (
                        <div key={idx}>+ {add.addon_name}</div>
                      ))}
                    </div>
                  )}

                  {/* Cooking Request / Chef Note */}
                  {it.cooking_request && (
                    <div className="pl-4 pt-0.5">
                      <div className="border border-black bg-slate-100 px-1.5 py-0.5 text-[10px] font-black uppercase inline-block">
                        &gt;&gt;&gt; {it.cooking_request} &lt;&lt;&lt;
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Order Note */}
            {ticket.customerNote && (
              <div className="my-2 p-1.5 border-2 border-black text-[10px] font-black uppercase">
                ORDER NOTE: {ticket.customerNote}
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 border-t-2 border-dashed border-black text-center text-[9px] space-y-0.5">
              <div>*** END OF TICKET ***</div>
              <div>TableQR Live Kitchen Dispatch</div>
              <div className="text-[8px] tracking-widest pt-1">- - - - - - CUT HERE - - - - - -</div>
            </div>
          </div>
        </div>

        {/* Modal Actions (Hidden in Print) */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 print:hidden">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print 80mm KOT</span>
          </button>
        </div>
      </div>
    </div>
  );
}
