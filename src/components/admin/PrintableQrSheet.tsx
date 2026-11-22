'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { Printer, Sparkles, X, Check, Copy } from 'lucide-react';

export interface TableQrCardData {
  id: string;
  table_number: string;
  section: string;
  qr_token: string;
  capacity: number;
}

interface PrintableQrSheetProps {
  restaurant: {
    name: string;
    slug: string;
    tagline?: string | null;
    brand_color: string;
  };
  tables: TableQrCardData[];
  onClose: () => void;
}

export function PrintableQrSheet({ restaurant, tables, onClose }: PrintableQrSheetProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [origin] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return window.location.origin;
    }
    return '';
  });

  useEffect(() => {
    const host = origin || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!host) return;

    let isMounted = true;
    async function generateAllQrs() {
      const map: Record<string, string> = {};
      for (const t of tables) {
        const url = `${host}/r/${restaurant.slug}/t/${t.qr_token}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            errorCorrectionLevel: 'H', // High error correction for cafe spills & scuffs
            color: {
              dark: '#0f172a', // Deep slate
              light: '#ffffff',
            },
          });
          map[t.id] = dataUrl;
        } catch (e) {
          console.error(`Failed to generate QR for table ${t.table_number}:`, e);
        }
      }
      if (isMounted) {
        setQrMap(map);
      }
    }

    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [tables, origin, restaurant.slug]);

  const handleCopyLink = (token: string, tableNumber: string) => {
    const url = `${origin}/r/${restaurant.slug}/t/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(tableNumber);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex flex-col p-4 md:p-6 overflow-hidden">
      {/* Top Modal Navigation (Hidden in Print) */}
      <div className="print:hidden max-w-6xl w-full mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl mb-4">
        <div>
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Printable Table QR Sheet</span>
          </h2>
          <p className="text-xs text-slate-400">
            A4 layout with cut guides • {tables.length} tables • High error-correction QRs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print QR Cards (PDF)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Preview Area */}
      <div className="flex-1 overflow-y-auto max-w-6xl w-full mx-auto print:max-w-none print:w-full print:m-0 print:p-0">
        {/* Printable Grid Container */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 print:grid-cols-2 print:gap-4 print:p-2 bg-white rounded-3xl p-6 text-slate-900 shadow-xl print:shadow-none print:rounded-none">
          {tables.map((table) => {
            const qrData = qrMap[table.id];

            return (
              <div
                key={table.id}
                className="border-2 border-dashed border-slate-300 rounded-3xl p-6 flex flex-col items-center justify-between text-center relative bg-white page-break-inside-avoid print:h-[135mm] print:border-slate-400"
              >
                {/* Card Header */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black tracking-widest text-indigo-700 uppercase block">
                    TableQR Dine-In
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {restaurant.name}
                  </h3>
                  {restaurant.tagline && (
                    <p className="text-[11px] text-slate-500">{restaurant.tagline}</p>
                  )}
                </div>

                {/* Table Number Pill */}
                <div className="my-2">
                  <div
                    className="inline-block px-5 py-1.5 rounded-2xl text-white font-black text-lg tracking-wide shadow-xs"
                    style={{ backgroundColor: restaurant.brand_color || '#ea580c' }}
                  >
                    TABLE {table.table_number}
                  </div>
                  <span className="text-[11px] text-slate-400 block mt-1 font-semibold">
                    {table.section || 'Dining Room'} • Seats {table.capacity}
                  </span>
                </div>

                {/* QR Code Container */}
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-xs my-1">
                  {qrData ? (
                    <Image
                      src={qrData}
                      alt={`QR code for table ${table.table_number}`}
                      width={170}
                      height={170}
                      className="rounded-xl"
                    />
                  ) : (
                    <div className="w-[170px] h-[170px] bg-slate-100 rounded-xl flex items-center justify-center text-xs text-slate-400">
                      Generating...
                    </div>
                  )}
                </div>

                {/* Scan Instructions */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800">
                    Scan with any Camera or UPI App
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Browse menu, place orders & pay bill from your phone
                  </p>
                  <p className="text-[9px] text-slate-400">
                    No app download or login required
                  </p>
                </div>

                {/* Quick copy link in preview mode */}
                <div className="print:hidden pt-3 border-t border-slate-100 w-full flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleCopyLink(table.qr_token, table.table_number)}
                    className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedLink === table.table_number ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">Copied URL!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
