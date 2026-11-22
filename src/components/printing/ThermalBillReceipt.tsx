'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Printer, X, Download } from 'lucide-react';
import { formatINR, formatISTDateTime } from '@/lib/formatters';
import { buildUpiUri, generateUpiQrDataUrl } from '@/lib/payments/upi';

export interface BillPrintItem {
  id: string;
  itemName: string;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  addons?: Array<{ name: string; price: number }>;
  lineTotal: number;
}

export interface BillPrintData {
  restaurant: {
    name: string;
    tagline?: string | null;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    gstin?: string | null;
    fssai?: string | null;
    upiId?: string | null;
  };
  invoiceNumber?: string | null;
  tableNumber: string;
  section?: string | null;
  serverName?: string | null;
  createdAt: string;
  items: BillPrintItem[];
  subtotal: number;
  discountAmount?: number;
  discountCode?: string | null;
  serviceChargeAmount?: number;
  serviceChargeRate?: number;
  cgstAmount: number;
  sgstAmount: number;
  taxSlabs?: Array<{
    slab: number;
    taxableAmount: number;
    cgst: number;
    sgst: number;
    totalTax: number;
  }>;
  roundOffAmount: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'pending';
  paymentMethod?: string | null;
  paidAt?: string | null;
  upiQrDataUrl?: string | null;
}

interface ThermalBillModalProps {
  bill: BillPrintData;
  onClose: () => void;
}

export function ThermalBillModal({ bill, onClose }: ThermalBillModalProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(bill.upiQrDataUrl || null);

  useEffect(() => {
    // Generate UPI QR dynamically if not provided and bill is unpaid with a valid UPI ID
    if (!qrCodeDataUrl && bill.restaurant.upiId && bill.totalAmount > 0) {
      const upiUri = buildUpiUri({
        vpa: bill.restaurant.upiId,
        payeeName: bill.restaurant.name,
        amount: bill.totalAmount,
        transactionNote: `Table ${bill.tableNumber} - ${bill.invoiceNumber || 'Dine-in'}`,
      });

      generateUpiQrDataUrl(upiUri)
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error('Failed to generate UPI QR for print:', err));
    }
  }, [bill, qrCodeDataUrl]);

  const handlePrint = () => {
    window.print();
  };

  const isPaid = bill.paymentStatus === 'paid';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Hidden in Print) */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-black text-white">80mm Thermal Bill &amp; Tax Invoice</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Thermal Slip Preview */}
        <div className="p-4 overflow-y-auto flex-1 bg-slate-950/60 flex justify-center">
          {/* Exact 80mm (72mm printable) Thermal Slip */}
          <div
            id="thermal-bill-receipt"
            className="thermal-80mm-receipt w-[72mm] bg-white text-black p-3.5 font-mono text-[11px] leading-tight shadow-md select-all"
          >
            {/* Header */}
            <div className="text-center space-y-0.5 border-b-2 border-dashed border-black pb-2">
              <div className="text-[13px] font-black uppercase tracking-wider">
                {bill.restaurant.name}
              </div>
              {bill.restaurant.tagline && (
                <div className="text-[9px] text-slate-700 italic">
                  {bill.restaurant.tagline}
                </div>
              )}
              {bill.restaurant.address && (
                <div className="text-[9px]">
                  {bill.restaurant.address}
                  {bill.restaurant.city ? `, ${bill.restaurant.city}` : ''}
                </div>
              )}
              {bill.restaurant.phone && (
                <div className="text-[9px]">Ph: {bill.restaurant.phone}</div>
              )}
              {bill.restaurant.gstin && (
                <div className="text-[10px] font-bold">GSTIN: {bill.restaurant.gstin}</div>
              )}
              {bill.restaurant.fssai && (
                <div className="text-[9px]">FSSAI Lic No: {bill.restaurant.fssai}</div>
              )}

              <div className="text-[12px] font-black uppercase tracking-widest pt-1 border-t border-dotted border-black mt-1">
                *** TAX INVOICE ***
              </div>
            </div>

            {/* Invoice & Table Metadata */}
            <div className="py-2 border-b-2 border-dashed border-black space-y-0.5 text-[10px]">
              <div className="flex justify-between items-baseline">
                <span className="font-bold">INVOICE NO:</span>
                <span className="font-black text-[11px] uppercase">
                  {bill.invoiceNumber || 'PROVISIONAL'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>DATE / TIME:</span>
                <span>{formatISTDateTime(bill.createdAt)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-0.5">
                <span className="font-bold">TABLE:</span>
                <span className="font-black text-[13px]">{bill.tableNumber}</span>
              </div>
              {bill.section && (
                <div className="flex justify-between">
                  <span>SECTION:</span>
                  <span className="font-semibold uppercase">{bill.section}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>CHANNEL / SERVER:</span>
                <span className="font-semibold">{bill.serverName || 'QR Dine-In'}</span>
              </div>
            </div>

            {/* Items Column Header */}
            <div className="py-1 text-[10px] font-black border-b border-black flex justify-between uppercase">
              <span className="flex-1">QTY &amp; ITEM</span>
              <span className="w-16 text-right">TOTAL</span>
            </div>

            {/* Itemized Lines */}
            <div className="divide-y divide-dotted divide-slate-300 py-1">
              {bill.items.map((it) => (
                <div key={it.id} className="py-1 space-y-0.5">
                  <div className="flex justify-between items-start text-[11px]">
                    <div className="flex-1 pr-1">
                      <span className="font-black">{it.quantity}x </span>
                      <span className="font-bold uppercase">{it.itemName}</span>
                      {it.variantName && (
                        <span className="text-[9px] block text-slate-700 pl-4 font-normal">
                          • {it.variantName}
                        </span>
                      )}
                      {it.addons && it.addons.length > 0 && (
                        <div className="pl-4 text-[9px] text-slate-700">
                          {it.addons.map((add, aIdx) => (
                            <div key={aIdx}>
                              + {add.name} ({formatINR(add.price)})
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="font-bold text-right shrink-0">
                      {formatINR(it.lineTotal)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Calculations Breakdown */}
            <div className="py-2 border-t-2 border-dashed border-black space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span>Items Subtotal:</span>
                <span className="font-semibold">{formatINR(bill.subtotal)}</span>
              </div>

              {(bill.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-slate-900 font-bold">
                  <span>
                    Offer Discount {bill.discountCode ? `(${bill.discountCode})` : ''}:
                  </span>
                  <span>-{formatINR(bill.discountAmount || 0)}</span>
                </div>
              )}

              {(bill.serviceChargeAmount || 0) > 0 && (
                <div className="flex justify-between">
                  <span>Service Charge ({bill.serviceChargeRate || 5}%):</span>
                  <span>{formatINR(bill.serviceChargeAmount || 0)}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span>CGST:</span>
                <span>{formatINR(bill.cgstAmount)}</span>
              </div>

              <div className="flex justify-between">
                <span>SGST:</span>
                <span>{formatINR(bill.sgstAmount)}</span>
              </div>

              {bill.roundOffAmount !== 0 && (
                <div className="flex justify-between text-[9px] text-slate-700">
                  <span>Round-off:</span>
                  <span>
                    {bill.roundOffAmount > 0
                      ? `+${bill.roundOffAmount.toFixed(2)}`
                      : bill.roundOffAmount.toFixed(2)}
                  </span>
                </div>
              )}

              {/* Grand Total */}
              <div className="flex justify-between items-baseline pt-1 border-t-2 border-black text-[14px] font-black">
                <span>NET PAYABLE:</span>
                <span>{formatINR(bill.totalAmount)}</span>
              </div>
            </div>

            {/* Slab-wise Tax Summary (if multiple or GST compliant) */}
            {bill.taxSlabs && bill.taxSlabs.length > 0 && (
              <div className="py-1.5 border-t border-dotted border-black text-[8px] space-y-0.5">
                <div className="font-bold uppercase tracking-tight text-[9px]">
                  Tax Slab Summary:
                </div>
                {bill.taxSlabs.map((ts, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>GST {ts.slab}% on {formatINR(ts.taxableAmount)}:</span>
                    <span>
                      CGST {formatINR(ts.cgst)} | SGST {formatINR(ts.sgst)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Payment Status & Method */}
            <div className="py-2 border-t-2 border-dashed border-black text-center space-y-1">
              {isPaid ? (
                <div className="border border-black bg-slate-100 p-1.5 rounded-xs">
                  <div className="text-[12px] font-black uppercase tracking-wider">
                    PAID IN FULL
                  </div>
                  <div className="text-[9px]">
                    Method: {bill.paymentMethod?.toUpperCase() || 'UPI'} •{' '}
                    {bill.paidAt ? formatISTDateTime(bill.paidAt) : 'Settled'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-black uppercase text-center">
                    PAY VIA ANY UPI APP
                  </div>

                  {qrCodeDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-1 bg-white">
                      <Image
                        src={qrCodeDataUrl}
                        alt="Scan to Pay UPI QR"
                        width={130}
                        height={130}
                        unoptimized
                        className="border border-black"
                      />
                      <div className="text-[8px] font-mono mt-0.5">
                        UPI ID: {bill.restaurant.upiId}
                      </div>
                      <div className="text-[8px] text-slate-700">
                        Google Pay • PhonePe • Paytm • BHIM
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-600">
                      Payment pending at cashier counter
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-2 border-t-2 border-dashed border-black text-center text-[9px] space-y-0.5">
              <div className="font-bold">Thank you for dining with us!</div>
              <div>Please visit us again.</div>
              <div className="text-[8px] text-slate-700 pt-0.5">TableQR Dine-In OS</div>
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

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print 80mm Bill</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
