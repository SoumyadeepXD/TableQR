'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Receipt,
  RotateCcw,
  Bell,
  CheckCircle2,
  Printer,
  CreditCard,
  Banknote,
  QrCode,
  Tag,
  Search,
  X,
  UtensilsCrossed,
  ChevronRight,
  LogOut,
  Share2,
} from 'lucide-react';
import { formatINR, formatISTDateTime } from '@/lib/formatters';
import { soundManager } from '@/lib/audio';
import { createClient } from '@/lib/supabase/client';
import { buildUpiUri, generateUpiQrDataUrl } from '@/lib/payments/upi';
import type { BillingResult } from '@/lib/billing/engine';
import { ThermalBillModal } from '@/components/printing/ThermalBillReceipt';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';

export interface CashierItemAddon {
  id: string;
  addon_name: string;
  price: number;
}

export interface CashierOrderItem {
  id: string;
  item_name: string;
  variant_name?: string | null;
  unit_price: number;
  quantity: number;
  order_item_addons?: CashierItemAddon[];
}

export interface CashierOrder {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
  order_items: CashierOrderItem[];
}

export interface CashierInvoice {
  id: string;
  invoice_number: string;
  financial_year: string;
  subtotal: number;
  discount_amount: number;
  service_charge_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  round_off_amount: number;
  total_amount: number;
  payment_method: string;
  payment_status: 'unpaid' | 'paid' | 'refunded';
  paid_at: string | null;
  gstin: string | null;
  gateway_order_id?: string | null;
  gateway_payment_id?: string | null;
}

export interface CashierOffer {
  id: string;
  code: string;
  title: string;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_bill_amount?: number;
  max_discount_cap?: number | null;
}

export interface ServiceRequestItem {
  id: string;
  table_id: string;
  type: string;
  status: string;
}

interface TableOverviewItem {
  table: {
    id: string;
    table_number: string;
    section: string;
    capacity: number;
    qr_token: string;
    is_active: boolean;
  };
  hasActiveSession: boolean;
  session: {
    id: string;
    session_token: string;
    status: string;
    opened_at: string;
  } | null;
  ordersCount: number;
  itemsCount: number;
  orders: CashierOrder[];
  bill: BillingResult;
  invoice: CashierInvoice | null;
  pendingRequests: ServiceRequestItem[];
  hasBillRequested: boolean;
  hasWaiterCalled: boolean;
}

interface CashierDashboardProps {
  initialRestaurant: {
    id: string;
    name: string;
    slug: string;
    upiId?: string | null;
    gstin?: string | null;
    currency: string;
    isTaxInclusive: boolean;
    isServiceChargeEnabled: boolean;
    serviceChargeRate: number;
  };
  staff: {
    name: string;
    role: string;
  };
}

export function CashierDashboardClient({ initialRestaurant, staff }: CashierDashboardProps) {
  const [tablesData, setTablesData] = useState<TableOverviewItem[]>([]);
  const [activeOffers, setActiveOffers] = useState<CashierOffer[]>([]);
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [isLoading, setIsLoading] = useState(true);
  const [filterMode, setFilterMode] = useState<'all' | 'occupied' | 'bill_requested' | 'vacant'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Table for Settle / View Modal
  const [selectedTable, setSelectedTable] = useState<TableOverviewItem | null>(null);
  const [selectedOfferCode, setSelectedOfferCode] = useState<string>('');
  const [customCouponInput, setCustomCouponInput] = useState<string>('');
  const [selectedBill, setSelectedBill] = useState<BillingResult | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<CashierInvoice | null>(null);
  const [isCalculatingBill, setIsCalculatingBill] = useState(false);
  const [couponFeedback, setCouponFeedback] = useState<{ message: string; isError: boolean } | null>(null);

  // Payment Settlement State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card'>('cash');
  const [cashReceived, setCashReceived] = useState<number | ''>('');
  const [isSettling, setIsSettling] = useState(false);
  const [settleSuccess, setSettleSuccess] = useState<string | null>(null);
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [showBillPrintModal, setShowBillPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  const supabase = createClient();

  // 1. Fetch live cashier data
  const fetchCashierData = useCallback(async (quiet: boolean = false) => {
    if (!quiet) setIsLoading(true);
    try {
      const res = await fetch('/api/cashier/tables');
      const data = await res.json();
      if (res.ok && data.tables) {
        setTablesData(data.tables);
        if (data.restaurant) setRestaurant(data.restaurant);
        if (data.activeOffers) setActiveOffers(data.activeOffers);
      }
    } catch (err) {
      console.error('Failed to load cashier tables:', err);
    } finally {
      if (!quiet) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const res = await fetch('/api/cashier/tables');
        const data = await res.json();
        if (ignore) return;
        if (res.ok && data.tables) {
          setTablesData(data.tables);
          if (data.restaurant) setRestaurant(data.restaurant);
          if (data.activeOffers) setActiveOffers(data.activeOffers);
        }
      } catch (err) {
        console.error('Failed to load cashier tables:', err);
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, []);

  // 2. Realtime Subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('cashier-pos-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const req = payload.new as { type?: string };
            if (req.type === 'request_bill') {
              soundManager.playKitchenAlert();
            } else if (req.type === 'call_waiter') {
              soundManager.playSuccessChime();
            }
          }
          fetchCashierData(true);
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
          fetchCashierData(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          fetchCashierData(true);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'table_sessions',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        () => {
          fetchCashierData(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurant.id, fetchCashierData]);

  // 3. Open Settle Modal for a Table
  const handleOpenTableSettle = async (item: TableOverviewItem) => {
    setSelectedTable(item);
    setSelectedOfferCode('');
    setCustomCouponInput('');
    setCouponFeedback(null);
    setSettleSuccess(null);
    setCashReceived('');
    setSelectedInvoice(item.invoice);
    setSelectedBill(item.bill);

    // Generate UPI QR preview
    if (item.bill?.totalAmount > 0) {
      const upi = buildUpiUri({
        vpa: restaurant.upiId || 'cafe.darjeeling@okaxis',
        payeeName: restaurant.name,
        amount: item.bill.totalAmount,
        transactionNote: `Table ${item.table.table_number} Bill`,
      });
      try {
        const qr = await generateUpiQrDataUrl(upi, { width: 220 });
        setUpiQrUrl(qr);
      } catch (e) {
        console.error('QR generation error:', e);
      }
    }
  };

  // 4. Recalculate bill with coupon / offer
  const handleApplyOffer = async (code: string) => {
    if (!selectedTable?.session) return;
    setIsCalculatingBill(true);
    setCouponFeedback(null);

    try {
      const params = new URLSearchParams();
      params.set('sessionId', selectedTable.session.id);
      if (code) {
        params.set('couponCode', code);
      }

      const res = await fetch(`/api/billing/calculate?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.bill) {
        setSelectedBill(data.bill);
        if (code) {
          if (data.bill.discountDetails?.reason) {
            setCouponFeedback({ message: data.bill.discountDetails.reason, isError: true });
          } else if (data.bill.discountAmount > 0) {
            setCouponFeedback({
              message: `Saved ${formatINR(data.bill.discountAmount)} with ${code}!`,
              isError: false,
            });
            setSelectedOfferCode(code);
          }
        } else {
          setSelectedOfferCode('');
        }

        // Update UPI QR for recalculated amount
        if (data.bill.totalAmount > 0) {
          const upi = buildUpiUri({
            vpa: restaurant.upiId || 'cafe.darjeeling@okaxis',
            payeeName: restaurant.name,
            amount: data.bill.totalAmount,
            transactionNote: `Table ${selectedTable.table.table_number} Bill`,
          });
          const qr = await generateUpiQrDataUrl(upi, { width: 220 });
          setUpiQrUrl(qr);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error applying offer';
      setCouponFeedback({ message: msg, isError: true });
    } finally {
      setIsCalculatingBill(false);
    }
  };

  // 5. Generate Invoice or Settle & Mark Paid
  const handleSettleAndMarkPaid = async () => {
    if (!selectedTable?.session || !selectedBill) return;
    setIsSettling(true);
    setSettleSuccess(null);

    try {
      // Step A: Ensure invoice exists
      let invoiceId = selectedInvoice?.id;
      if (!invoiceId) {
        const invoiceRes = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: selectedTable.session.id,
            couponCode: selectedOfferCode || customCouponInput || undefined,
          }),
        });
        const invoiceData = await invoiceRes.json();
        if (!invoiceRes.ok || !invoiceData.invoice) {
          throw new Error(invoiceData.error || 'Failed to generate invoice');
        }
        invoiceId = invoiceData.invoice.id;
        setSelectedInvoice(invoiceData.invoice);
      }

      // Step B: Mark Paid
      const markPaidRes = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          amountReceived: typeof cashReceived === 'number' ? cashReceived : undefined,
        }),
      });

      const markPaidData = await markPaidRes.json();
      if (!markPaidRes.ok) {
        throw new Error(markPaidData.error || 'Failed to mark invoice paid');
      }

      soundManager.playSuccessChime();
      setSettleSuccess(
        `Table ${selectedTable.table.table_number} settled successfully via ${paymentMethod.toUpperCase()}! Change due: ${formatINR(
          markPaidData.changeDue || 0
        )}`
      );

      // Refresh cashier data
      await fetchCashierData(true);

      // Close modal after brief celebratory pause
      setTimeout(() => {
        setSelectedTable(null);
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not settle bill';
      alert(`Settlement Error: ${msg}`);
    } finally {
      setIsSettling(false);
    }
  };

  // Metrics
  const metrics = useMemo(() => {
    let occupied = 0;
    let billRequested = 0;
    let pendingRevenue = 0;

    tablesData.forEach((t) => {
      if (t.hasActiveSession) {
        occupied++;
        pendingRevenue += t.bill?.totalAmount || 0;
      }
      if (t.hasBillRequested) {
        billRequested++;
      }
    });

    return {
      totalTables: tablesData.length,
      occupied,
      vacant: tablesData.length - occupied,
      billRequested,
      pendingRevenue,
    };
  }, [tablesData]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tablesData.filter((item) => {
      if (filterMode === 'occupied' && !item.hasActiveSession) return false;
      if (filterMode === 'vacant' && item.hasActiveSession) return false;
      if (filterMode === 'bill_requested' && !item.hasBillRequested) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.table.table_number.toLowerCase().includes(q) ||
          item.table.section.toLowerCase().includes(q)
        );
      }

      return true;
    });
  }, [tablesData, filterMode, searchQuery]);

  // Change Due calculation
  const changeDue = useMemo(() => {
    if (paymentMethod !== 'cash' || typeof cashReceived !== 'number') return 0;
    const total = selectedBill?.totalAmount || 0;
    return Math.max(0, cashReceived - total);
  }, [paymentMethod, cashReceived, selectedBill]);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* CASHIER TOP BAR */}
      <header className="bg-slate-950/80 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base font-black tracking-wide text-white">CASHIER POS & SETTLEMENT</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                Live Station
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {restaurant.name} • Cashier: <span className="text-slate-200 font-semibold">{staff.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchCashierData()}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            title="Refresh Table Status"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <Link
            href="/kitchen"
            className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Kitchen Display
          </Link>

          <Link
            href="/admin"
            className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Admin Panel
          </Link>

          <Link
            href="/login"
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            title="Switch User / Logout"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* METRICS & QUICK FILTER STRIP */}
      <section className="bg-slate-950/40 border-b border-slate-800/80 px-6 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Quick Metrics */}
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Occupancy</span>
              <span className="text-sm font-black text-white">
                {metrics.occupied} / {metrics.totalTables}{' '}
                <span className="text-slate-400 font-normal text-xs">
                  ({Math.round((metrics.occupied / (metrics.totalTables || 1)) * 100)}%)
                </span>
              </span>
            </div>

            <div className="h-7 w-px bg-slate-800" />

            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Bill Requests</span>
              <span
                className={`text-sm font-black ${
                  metrics.billRequested > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-300'
                }`}
              >
                {metrics.billRequested} Pending
              </span>
            </div>

            <div className="h-7 w-px bg-slate-800" />

            <div>
              <span className="text-slate-500 font-semibold uppercase text-[10px] block">Pending Dining Revenue</span>
              <span className="text-sm font-black text-emerald-400">{formatINR(metrics.pendingRevenue)}</span>
            </div>
          </div>

          {/* Filter Pills & Search */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search table #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-36 text-xs bg-slate-800 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'all' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({metrics.totalTables})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('occupied')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'occupied' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Dining ({metrics.occupied})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('bill_requested')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'bill_requested'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Bill Waiting ({metrics.billRequested})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('vacant')}
                className={`px-3 py-1 rounded-lg transition cursor-pointer ${
                  filterMode === 'vacant' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vacant ({metrics.vacant})
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* TABLES POS GRID */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredTables.map((item) => {
            const isOccupied = item.hasActiveSession;
            const hasBill = item.hasBillRequested;
            const hasWaiter = item.hasWaiterCalled;
            const billAmount = item.bill?.totalAmount || 0;

            let cardBorder = 'border-slate-800 hover:border-slate-700 bg-slate-900/60';
            if (hasBill) {
              cardBorder = 'border-amber-500/70 bg-amber-950/20 ring-2 ring-amber-500/40 animate-pulse';
            } else if (hasWaiter) {
              cardBorder = 'border-sky-500/70 bg-sky-950/20 ring-1 ring-sky-500/30';
            } else if (isOccupied) {
              cardBorder = 'border-emerald-700/60 bg-emerald-950/20 hover:border-emerald-600';
            }

            return (
              <div
                key={item.table.id}
                onClick={() => isOccupied && handleOpenTableSettle(item)}
                className={`rounded-2xl p-4 border flex flex-col justify-between transition-all select-none ${cardBorder} ${
                  isOccupied ? 'cursor-pointer hover:scale-[1.02] shadow-lg' : 'opacity-60 cursor-default'
                }`}
              >
                {/* Table Header */}
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                        Table {item.table.table_number}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-semibold">{item.table.section || 'Main'}</p>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {hasBill ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                          <Bell className="w-3 h-3" />
                          <span>Bill!</span>
                        </span>
                      ) : hasWaiter ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500 text-white flex items-center gap-1 shadow-sm">
                          <Bell className="w-3 h-3" />
                          <span>Waiter</span>
                        </span>
                      ) : isOccupied ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-900/80 text-emerald-300 border border-emerald-700/60">
                          Dining
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-500">
                          Vacant
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dining Details */}
                  {isOccupied ? (
                    <div className="mt-4 space-y-1.5 text-xs text-slate-300">
                      <div className="flex justify-between text-slate-400">
                        <span>Orders:</span>
                        <span className="font-bold text-slate-200">{item.ordersCount} rounds</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Items:</span>
                        <span className="font-bold text-slate-200">{item.itemsCount} dishes</span>
                      </div>
                      {item.session?.opened_at && (
                        <div className="flex justify-between text-slate-500 text-[11px]">
                          <span>Seated:</span>
                          <span>{formatISTDateTime(item.session.opened_at, { timeOnly: true })}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="mt-6 text-center text-slate-600 text-xs py-2">
                      Ready for guests
                    </div>
                  )}
                </div>

                {/* Card Footer / Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  {isOccupied ? (
                    <>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total</span>
                        <span className="text-base font-black text-white">{formatINR(billAmount)}</span>
                      </div>
                      <button
                        type="button"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-sm"
                      >
                        <span>Settle</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="text-[11px] text-slate-600 font-semibold w-full text-center">
                      Scan QR to start
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* SETTLEMENT & BILL DRAWER / MODAL */}
      {selectedTable && selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black">
                  T{selectedTable.table.table_number}
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    Table {selectedTable.table.table_number} Settle & Invoice
                  </h2>
                  <p className="text-xs text-slate-400">
                    {selectedTable.table.section || 'Main'} • {selectedTable.itemsCount} Items •{' '}
                    {selectedInvoice?.invoice_number ? `#${selectedInvoice.invoice_number}` : 'Uninvoiced'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowWhatsAppModal(true)}
                  className="px-3 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  title="Share digital invoice on customer WhatsApp"
                >
                  <Share2 className="w-4 h-4 text-emerald-400" />
                  <span>WhatsApp Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBillPrintModal(true)}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                  <span>Print 80mm Bill</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedTable(null)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Two Columns */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Items by Round (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-amber-500" />
                  <span>Order Rounds History</span>
                </h3>

                <div className="space-y-3">
                  {selectedTable.orders.map((order, idx) => (
                    <div
                      key={order.id}
                      className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-white">
                          Round #{selectedTable.orders.length - idx} (Order #{order.order_number})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatISTDateTime(order.created_at, { timeOnly: true })}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-800/80 text-xs">
                        {order.order_items.map((item: CashierOrderItem) => (
                          <div key={item.id} className="py-1.5 flex justify-between items-start">
                            <div>
                              <span className="font-bold text-slate-200">
                                {item.quantity}× {item.item_name}
                                {item.variant_name && (
                                  <span className="text-slate-400 font-normal"> ({item.variant_name})</span>
                                )}
                              </span>
                              {item.order_item_addons && item.order_item_addons.length > 0 && (
                                <div className="text-[10px] text-slate-400 pl-2">
                                  {item.order_item_addons.map((a: CashierItemAddon) => `+ ${a.addon_name}`).join(', ')}
                                </div>
                              )}
                            </div>
                            <span className="font-mono text-slate-300">
                              {formatINR(Number(item.unit_price) * item.quantity)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Offer / Coupon Code Selector */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-amber-400" />
                      <span>Apply Offers / Discount</span>
                    </span>
                    {selectedOfferCode && (
                      <button
                        type="button"
                        onClick={() => handleApplyOffer('')}
                        className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                      >
                        Remove Offer
                      </button>
                    )}
                  </div>

                  {/* Active Offers Chips */}
                  <div className="flex flex-wrap gap-2">
                    {activeOffers.map((off) => (
                      <button
                        key={off.id}
                        type="button"
                        onClick={() => handleApplyOffer(off.code)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition cursor-pointer ${
                          selectedOfferCode === off.code
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        {off.code} ({off.discount_type === 'percentage' ? `${off.discount_value}%` : `₹${off.discount_value}`})
                      </button>
                    ))}
                  </div>

                  {/* Custom Coupon Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Or enter coupon code..."
                      value={customCouponInput}
                      onChange={(e) => setCustomCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      disabled={isCalculatingBill || !customCouponInput.trim()}
                      onClick={() => handleApplyOffer(customCouponInput.trim())}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      {isCalculatingBill ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {couponFeedback && (
                    <p
                      className={`text-xs font-semibold ${
                        couponFeedback.isError ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {couponFeedback.message}
                    </p>
                  )}
                </div>
              </div>

              {/* RIGHT COLUMN: Billing Summary & Payment (5 cols) */}
              <div className="md:col-span-5 space-y-4">
                {/* Bill Breakdown Box */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2.5 text-xs">
                  <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px] border-b border-slate-800 pb-2">
                    Bill Computation
                  </h4>

                  <div className="flex justify-between text-slate-400">
                    <span>Items Subtotal</span>
                    <span className="font-semibold text-slate-200">{formatINR(selectedBill.itemsSubtotal)}</span>
                  </div>

                  {selectedBill.discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-semibold">
                      <span>Discount ({selectedBill.discountDetails?.title || 'Applied'})</span>
                      <span>-{formatINR(selectedBill.discountAmount)}</span>
                    </div>
                  )}

                  {selectedBill.serviceChargeAmount > 0 && (
                    <div className="flex justify-between text-slate-400">
                      <span>Service Charge ({selectedBill.serviceChargeRate}%)</span>
                      <span className="text-slate-200">{formatINR(selectedBill.serviceChargeAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-400">
                    <span>CGST (Central GST)</span>
                    <span className="text-slate-200">{formatINR(selectedBill.cgstAmount)}</span>
                  </div>

                  <div className="flex justify-between text-slate-400">
                    <span>SGST (State GST)</span>
                    <span className="text-slate-200">{formatINR(selectedBill.sgstAmount)}</span>
                  </div>

                  {selectedBill.roundOffAmount !== 0 && (
                    <div className="flex justify-between text-slate-500 font-mono text-[11px]">
                      <span>Round-off</span>
                      <span>
                        {selectedBill.roundOffAmount > 0
                          ? `+₹${selectedBill.roundOffAmount.toFixed(2)}`
                          : `-₹${Math.abs(selectedBill.roundOffAmount).toFixed(2)}`}
                      </span>
                    </div>
                  )}

                  {/* GRAND TOTAL */}
                  <div className="pt-2.5 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="font-black text-sm uppercase text-white">Total Amount</span>
                    <span className="text-2xl font-black text-emerald-400">
                      {formatINR(selectedBill.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* PAYMENT METHOD SELECTION OR ALREADY SETTLED */}
                {selectedInvoice?.payment_status === 'paid' ? (
                  <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-5 text-center space-y-3">
                    <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-black text-white text-base">Bill Already Settled</h4>
                      <p className="text-xs text-emerald-300 font-medium mt-1">
                        Paid via {(selectedInvoice.payment_method || 'gateway').toUpperCase()}
                        {selectedInvoice.gateway_order_id && ` • Order: ${selectedInvoice.gateway_order_id}`}
                      </p>
                      {selectedInvoice.paid_at && (
                        <p className="text-[11px] text-slate-400 font-mono mt-1">
                          {formatISTDateTime(selectedInvoice.paid_at)}
                        </p>
                      )}
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowBillPrintModal(true)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Print Final Receipt</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <h4 className="font-extrabold text-white uppercase tracking-wider text-[11px]">
                      Settlement Method
                    </h4>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('cash')}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'cash'
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <Banknote className="w-5 h-5" />
                        <span className="text-xs font-bold">Cash</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'upi'
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <QrCode className="w-5 h-5" />
                        <span className="text-xs font-bold">UPI QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <CreditCard className="w-5 h-5" />
                        <span className="text-xs font-bold">Card</span>
                      </button>
                    </div>

                    {/* Cash Change Calculator */}
                    {paymentMethod === 'cash' && (
                      <div className="space-y-2 pt-2 border-t border-slate-800">
                        <label className="text-[11px] font-bold text-slate-400 block">
                          Cash Tendered by Customer:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            placeholder={`Min ₹${selectedBill.totalAmount}`}
                            value={cashReceived}
                            onChange={(e) =>
                              setCashReceived(e.target.value ? Number(e.target.value) : '')
                            }
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() => setCashReceived(selectedBill.totalAmount)}
                            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl text-slate-300"
                          >
                            Exact
                          </button>
                        </div>

                        {/* Quick Denominations */}
                        <div className="flex gap-1.5">
                          {[100, 200, 500, 2000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setCashReceived(amt)}
                              className="flex-1 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-bold rounded-lg text-slate-300"
                            >
                              ₹{amt}
                            </button>
                          ))}
                        </div>

                        {typeof cashReceived === 'number' && (
                          <div className="p-2.5 bg-slate-900 rounded-xl flex justify-between items-center text-xs">
                            <span className="text-slate-400 font-semibold">Change to Return:</span>
                            <span
                              className={`text-base font-black ${
                                changeDue > 0 ? 'text-amber-400' : 'text-slate-300'
                              }`}
                            >
                              {formatINR(changeDue)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* UPI QR Display on POS */}
                    {paymentMethod === 'upi' && (
                      <div className="text-center py-2 space-y-2">
                        {upiQrUrl && (
                          <div className="inline-block p-2 bg-white rounded-2xl shadow-sm">
                            <Image
                              src={upiQrUrl}
                              alt="Cashier Desk UPI QR"
                              width={160}
                              height={160}
                              className="rounded-xl"
                            />
                          </div>
                        )}
                        <p className="text-[11px] text-slate-400 font-semibold">
                          Customer can scan this screen with GPay/PhonePe
                        </p>
                        <div className="text-[10px] text-slate-500 font-mono">
                          VPA: {restaurant.upiId || 'cafe.darjeeling@okaxis'}
                        </div>
                      </div>
                    )}

                    {/* Settle Action Button */}
                    <button
                      type="button"
                      disabled={isSettling}
                      onClick={handleSettleAndMarkPaid}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      <span>
                        {isSettling
                          ? 'Settling Invoice...'
                          : `Mark Paid via ${paymentMethod.toUpperCase()} (${formatINR(
                              selectedBill.totalAmount
                            )})`}
                      </span>
                    </button>

                    {settleSuccess && (
                      <div className="p-3 bg-emerald-950/80 border border-emerald-700 text-emerald-300 rounded-xl text-xs font-semibold text-center animate-in fade-in">
                        {settleSuccess}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 80mm Thermal Receipt & Tax Invoice Modal */}
      {showBillPrintModal && selectedTable && selectedBill && (
        <ThermalBillModal
          bill={{
            restaurant: {
              name: restaurant.name,
              tagline: 'Darjeeling Chai & Cafe',
              upiId: restaurant.upiId,
              gstin: restaurant.gstin,
            },
            invoiceNumber: selectedInvoice?.invoice_number || null,
            tableNumber: selectedTable.table.table_number,
            section: selectedTable.table.section,
            serverName: 'Cashier Desk',
            createdAt: selectedInvoice?.paid_at || new Date().toISOString(),
            items: selectedTable.orders.flatMap((o) =>
              o.order_items.map((it: CashierOrderItem) => ({
                id: it.id,
                itemName: it.item_name,
                variantName: it.variant_name,
                unitPrice: Number(it.unit_price),
                quantity: it.quantity,
                addons: it.order_item_addons?.map((a) => ({
                  name: a.addon_name,
                  price: Number(a.price),
                })),
                lineTotal:
                  (Number(it.unit_price) +
                    (it.order_item_addons?.reduce((sum, a) => sum + Number(a.price), 0) || 0)) *
                  it.quantity,
              }))
            ),
            subtotal: selectedBill.itemsSubtotal,
            discountAmount: selectedBill.discountAmount,
            discountCode: selectedBill.discountDetails?.code || selectedOfferCode || null,
            serviceChargeAmount: selectedBill.serviceChargeAmount,
            serviceChargeRate: selectedBill.serviceChargeRate,
            cgstAmount: selectedBill.cgstAmount,
            sgstAmount: selectedBill.sgstAmount,
            taxSlabs: selectedBill.taxBreakdownBySlab,
            roundOffAmount: selectedBill.roundOffAmount,
            totalAmount: selectedBill.totalAmount,
            paymentStatus: (selectedInvoice?.payment_status as 'paid' | 'unpaid') || 'unpaid',
            paymentMethod: selectedInvoice?.payment_method || paymentMethod,
            paidAt: selectedInvoice?.paid_at || null,
            upiQrDataUrl: upiQrUrl || null,
          }}
          onClose={() => setShowBillPrintModal(false)}
        />
      )}

      {/* WhatsApp Bill Sharing Modal */}
      {showWhatsAppModal && selectedTable && selectedBill && (
        <WhatsAppShareModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          billPayload={{
            restaurant: {
              name: restaurant.name,
              tagline: 'Darjeeling Chai & Cafe',
              address: 'Indiranagar',
              city: 'Bengaluru',
              gstin: restaurant.gstin,
            },
            table: {
              tableNumber: selectedTable.table.table_number,
              section: selectedTable.table.section,
            },
            invoice: {
              invoiceNumber: selectedInvoice?.invoice_number || 'PRO-FORMA',
              date: selectedInvoice?.paid_at
                ? formatISTDateTime(selectedInvoice.paid_at)
                : new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
              subtotal: selectedBill.itemsSubtotal,
              discountAmount: selectedBill.discountAmount,
              offerCode: selectedBill.discountDetails?.code || selectedOfferCode || null,
              serviceChargeAmount: selectedBill.serviceChargeAmount,
              cgstAmount: selectedBill.cgstAmount,
              sgstAmount: selectedBill.sgstAmount,
              roundOffAmount: selectedBill.roundOffAmount,
              totalAmount: selectedBill.totalAmount,
              paymentStatus: selectedInvoice?.payment_status || 'unpaid',
              paymentMethod: selectedInvoice?.payment_method || paymentMethod,
            },
            items: selectedTable.orders.flatMap((o) =>
              o.order_items.map((it) => ({
                name: it.item_name,
                quantity: it.quantity,
                variantName: it.variant_name,
                price: Number(it.unit_price),
                total:
                  (Number(it.unit_price) +
                    (it.order_item_addons?.reduce((sum, a) => sum + Number(a.price), 0) || 0)) *
                  it.quantity,
              }))
            ),
            billUrl: typeof window !== 'undefined'
              ? `${window.location.origin}/r/cafe-darjeeling/t/${selectedTable.table.qr_token}/bill`
              : undefined,
          }}
        />
      )}
    </div>
  );
}
