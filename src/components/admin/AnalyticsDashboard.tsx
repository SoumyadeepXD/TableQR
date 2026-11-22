'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  TrendingUp,
  RotateCcw,
  Download,
  IndianRupee,
  Clock,
  Flame,
  TrendingDown,
  ShoppingBag,
  Percent,
  Calendar,
  Layers,
  ChevronDown,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  QrCode,
  CreditCard,
  Banknote,
  UtensilsCrossed,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import {
  AnalyticsPayload,
  generateRevenueSummaryCSV,
  generateItemSalesCSV,
  generateInvoicesCSV,
  RawInvoice,
} from '@/lib/analytics/engine';

interface AnalyticsDashboardProps {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    brand_color: string;
  };
}

type PresetType = 'today' | 'yesterday' | '7d' | 'this_month' | '30d' | 'custom';

export function AnalyticsDashboard({ restaurant }: AnalyticsDashboardProps) {
  const [preset, setPreset] = useState<PresetType>('7d');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Sub-tabs
  const [sellerView, setSellerView] = useState<'best' | 'worst'>('best');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url = `/api/admin/analytics?preset=${preset}`;
      if (preset === 'custom' && customFrom && customTo) {
        url += `&from=${customFrom}&to=${customTo}`;
      }

      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch analytics');
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error loading analytics';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      setIsLoading(true);
      setError(null);
      try {
        let url = `/api/admin/analytics?preset=${preset}`;
        if (preset === 'custom') {
          if (!customFrom || !customTo) {
            setIsLoading(false);
            return;
          }
          url += `&from=${customFrom}&to=${customTo}`;
        }
        const res = await fetch(url);
        const json = await res.json();
        if (!ignore) {
          if (res.ok) {
            setData(json);
          } else {
            setError(json.error || 'Failed to fetch analytics');
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Error loading analytics';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      ignore = true;
    };
  }, [preset, customFrom, customTo]);

  // Handle CSV Downloads
  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportMenuOpen(false);
    showToast(`Downloaded ${filename}`);
  };

  const handleExportSummary = () => {
    if (!data) return;
    const csv = generateRevenueSummaryCSV(data.dailyTrends, restaurant.name);
    downloadCSV(csv, `${restaurant.slug}_revenue_summary_${data.range.startDate}_to_${data.range.endDate}.csv`);
  };

  const handleExportItems = () => {
    if (!data) return;
    const allItems = sellerView === 'best' ? data.bestSellers : data.worstSellers;
    const csv = generateItemSalesCSV(allItems, restaurant.name);
    downloadCSV(csv, `${restaurant.slug}_item_sales_${data.range.startDate}_to_${data.range.endDate}.csv`);
  };

  const handleExportInvoices = () => {
    if (!data) return;
    const rawInvoices: RawInvoice[] = data.recentInvoices.map((inv) => ({
      id: inv.id,
      invoice_number: inv.invoiceNumber,
      financial_year: '2026-27',
      subtotal: inv.totalAmount,
      discount_amount: 0,
      service_charge_amount: 0,
      cgst_amount: 0,
      sgst_amount: 0,
      round_off_amount: 0,
      total_amount: inv.totalAmount,
      payment_method: inv.paymentMethod,
      payment_status: 'paid',
      paid_at: inv.paidAt,
      created_at: inv.paidAt,
      tables: { table_number: inv.tableNumber, section: inv.section },
    }));

    const csv = generateInvoicesCSV(rawInvoices, restaurant.name);
    downloadCSV(csv, `${restaurant.slug}_invoices_${data.range.startDate}_to_${data.range.endDate}.csv`);
  };

  const maxDailyRevenue = Math.max(...(data?.dailyTrends.map((d) => d.revenue) || [1]), 100);
  const maxHourlyRevenue = Math.max(...(data?.hourlyDistribution.map((h) => h.revenue) || [1]), 100);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP CONTROLS BAR: Date Presets, Custom Range, Refresh, and CSV Exports */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        {/* Preset Selector */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          <span className="text-slate-400 text-[11px] uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Range:
          </span>
          {(
            [
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7d', label: 'Last 7 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'custom', label: 'Custom' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                startTransition(() => {
                  setPreset(p.id);
                });
              }}
              className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
                preset === p.id
                  ? 'bg-indigo-600 text-white shadow-xs font-black'
                  : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Range Inputs (if preset === 'custom') */}
        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-slate-500">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Actions: Refresh & CSV Export */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            type="button"
            onClick={fetchAnalytics}
            className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition cursor-pointer"
            title="Refresh Analytics"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          {/* CSV Export Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-950 border border-slate-800 rounded-2xl p-1.5 shadow-2xl z-40 text-xs font-semibold animate-in fade-in slide-in-from-top-1">
                <button
                  type="button"
                  onClick={handleExportSummary}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="block font-bold">Revenue Summary</span>
                    <span className="text-[10px] text-slate-400">Daily sales & orders</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportItems}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                >
                  <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="block font-bold">Menu Performance</span>
                    <span className="text-[10px] text-slate-400">Item volumes & revenue</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleExportInvoices}
                  className="w-full text-left px-3 py-2 rounded-xl text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="block font-bold">Invoices & Audit</span>
                    <span className="text-[10px] text-slate-400">Transactions & payment mode</span>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl flex items-center gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI METRIC CARDS (6 CARDS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Total Revenue */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Total Revenue</span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {data ? formatINR(data.summary.totalRevenue) : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Subtotal: {data ? formatINR(data.summary.netSubtotal) : '—'}
            </div>
          </div>
        </div>

        {/* 2. Paid Invoices */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Paid Invoices</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              {data ? data.summary.totalPaidInvoices : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Orders Placed: {data ? data.summary.totalOrders : '—'}
            </div>
          </div>
        </div>

        {/* 3. Average Bill */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Average Bill</span>
            <div className="w-7 h-7 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-indigo-300 tracking-tight">
              {data ? formatINR(data.summary.averageBill) : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Per Table Session
            </div>
          </div>
        </div>

        {/* 4. Average Prep Time */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Avg Prep Time</span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {data ? `${data.summary.averagePrepTimeMinutes}m` : '—'}
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
              <span>Target &lt; 20m: Optimal</span>
            </div>
          </div>
        </div>

        {/* 5. Table Turnover */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Table Turnover</span>
            <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {data ? `${data.summary.averageTableTurnoverMinutes}m` : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              {data ? `${data.summary.completedSessionsCount} sessions completed` : '—'}
            </div>
          </div>
        </div>

        {/* 6. Discounts & GST */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold">
            <span>Offers & Taxes</span>
            <div className="w-7 h-7 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl sm:text-2xl font-black text-cyan-300 tracking-tight">
              {data ? formatINR(data.summary.totalDiscounts) : '—'}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              GST: {data ? formatINR(data.summary.totalTaxCollected) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* CHARTS ROW: Daily Revenue Trend + Hourly Rush Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue Bar Chart (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <span>Daily Revenue & Sales Trend</span>
              </h3>
              <p className="text-xs text-slate-400">
                {data ? `${data.range.startDate} to ${data.range.endDate} (IST)` : 'Daily billing volume'}
              </p>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">Peak Day</span>
              <span className="text-xs font-black text-amber-400">{formatINR(maxDailyRevenue)}</span>
            </div>
          </div>

          {/* Responsive SVG / CSS Bar Chart */}
          <div className="h-64 flex items-end gap-2 pt-6 pb-2 px-1">
            {data?.dailyTrends.map((point) => {
              const heightPercent = maxDailyRevenue > 0 ? (point.revenue / maxDailyRevenue) * 100 : 0;
              return (
                <div
                  key={point.date}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-900 border border-slate-700 text-white rounded-xl px-2.5 py-1.5 text-[11px] font-bold shadow-xl whitespace-nowrap">
                    <div>{point.dayLabel}</div>
                    <div className="text-amber-400">{formatINR(point.revenue)}</div>
                    <div className="text-[9px] text-slate-400 font-normal">
                      {point.invoiceCount} invoices • {point.orderCount} orders
                    </div>
                  </div>

                  {/* Revenue Bar */}
                  <div
                    className="w-full bg-gradient-to-t from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-300 rounded-t-lg transition-all shadow-xs"
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                  />

                  {/* Date Label */}
                  <span className="text-[10px] text-slate-400 font-semibold mt-2 truncate w-full text-center">
                    {point.date.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly Rush Heatmap & Distribution (1 Col) */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Peak Rush Hours</span>
              </h3>
              <p className="text-xs text-slate-400">24-hour distribution (IST)</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800">
              Cafe Hours
            </span>
          </div>

          <div className="h-64 flex items-end gap-1 pt-6 pb-2">
            {data?.hourlyDistribution.map((point) => {
              const heightPercent = maxHourlyRevenue > 0 ? (point.revenue / maxHourlyRevenue) * 100 : 0;
              const isPeak = point.percentage >= 10;
              return (
                <div
                  key={point.hour}
                  className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                >
                  {/* Tooltip on Hover */}
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-slate-900 border border-slate-700 text-white rounded-xl px-2 py-1 text-[10px] font-bold shadow-xl whitespace-nowrap">
                    <div>{point.hourLabel}</div>
                    <div className="text-indigo-400">{formatINR(point.revenue)}</div>
                    <div className="text-[9px] text-slate-400">{point.percentage}% of day</div>
                  </div>

                  {/* Hourly Bar */}
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      isPeak
                        ? 'bg-gradient-to-t from-indigo-600 to-indigo-400'
                        : point.revenue > 0
                        ? 'bg-slate-700 hover:bg-slate-600'
                        : 'bg-slate-800/40'
                    }`}
                    style={{ height: `${Math.max(heightPercent, 3)}%` }}
                  />

                  {/* Every 3 hours show label */}
                  {point.hour % 4 === 0 ? (
                    <span className="text-[9px] text-slate-400 font-bold mt-2">
                      {point.hour}h
                    </span>
                  ) : (
                    <span className="text-[9px] text-transparent mt-2">•</span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60 font-medium">
            <span>Breakfast (8-11)</span>
            <span>Lunch (12-15)</span>
            <span>Hi-Tea (16-19)</span>
            <span>Dinner (20-23)</span>
          </div>
        </div>
      </div>

      {/* SECOND ROW: Best vs Worst Sellers & Payment Method Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Menu Item Performance (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSellerView('best')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  sellerView === 'best'
                    ? 'bg-amber-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Top 10 Best Sellers</span>
              </button>

              <button
                type="button"
                onClick={() => setSellerView('worst')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition cursor-pointer ${
                  sellerView === 'worst'
                    ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Lowest & 0-Sales Items</span>
              </button>
            </div>

            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Sorted by Units Sold & Revenue
            </span>
          </div>

          {/* Items List */}
          <div className="divide-y divide-slate-800/60">
            {(sellerView === 'best' ? data?.bestSellers : data?.worstSellers)?.map((item, idx) => (
              <div key={item.menuItemId} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 text-center text-xs font-black text-slate-500">
                    #{idx + 1}
                  </span>
                  <div
                    className={`w-3.5 h-3.5 border rounded-xs flex items-center justify-center shrink-0 ${
                      item.isVeg ? 'border-emerald-500' : 'border-rose-500'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                      }`}
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">
                      {item.itemName}
                    </span>
                    <span className="text-[10px] text-slate-400">{item.categoryName}</span>
                  </div>
                </div>

                <div className="flex items-center gap-6 shrink-0 text-right">
                  <div>
                    <span className="text-xs font-black text-white block">
                      {item.quantitySold} sold
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {item.revenueSharePercent}% sales
                    </span>
                  </div>
                  <div className="w-20 text-right font-black text-xs text-amber-400">
                    {formatINR(item.grossRevenue)}
                  </div>
                </div>
              </div>
            ))}

            {(sellerView === 'best' ? data?.bestSellers : data?.worstSellers)?.length === 0 && (
              <div className="py-8 text-center text-xs text-slate-400">
                No menu items found for this period
              </div>
            )}
          </div>
        </div>

        {/* Payment Method Split (1 Col) */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Payment Method Split</span>
              </h3>
              <p className="text-xs text-slate-400">Settled revenue by channel</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {data?.paymentMethodSplit.map((p) => {
              const icon =
                p.method === 'upi' ? (
                  <QrCode className="w-4 h-4 text-emerald-400" />
                ) : p.method === 'cash' ? (
                  <Banknote className="w-4 h-4 text-amber-400" />
                ) : (
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                );

              return (
                <div key={p.method} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 font-bold text-white">
                      {icon}
                      <span>{p.label}</span>
                    </div>
                    <div className="text-right font-bold text-slate-300">
                      <span>{formatINR(p.amount)}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({p.percentage}%)</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        p.method === 'upi'
                          ? 'bg-emerald-500'
                          : p.method === 'cash'
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${p.percentage}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-500 text-right">
                    {p.count} transactions
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* THIRD ROW: Section & Table Turnover + Offers & Coupons Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dining Section & Table Turnover */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Section & Table Turnover</span>
              </h3>
              <p className="text-xs text-slate-400">Dine-in velocity across dining areas</p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60">
            {data?.sectionPerformance.map((sec) => (
              <div key={sec.section} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-bold text-white block">{sec.section}</span>
                  <span className="text-[10px] text-slate-400">
                    {sec.tableCount} tables • {sec.ordersCount} orders served
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-amber-400">
                    {formatINR(sec.totalRevenue)}
                  </div>
                  <div className="text-[10px] text-slate-300 font-semibold mt-0.5">
                    Avg Turnover: {sec.avgTurnoverMinutes} mins
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Offer & Coupon Campaign Usage */}
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Percent className="w-4 h-4 text-cyan-400" />
                <span>Offer & Coupon Performance</span>
              </h3>
              <p className="text-xs text-slate-400">Customer savings & campaign impact</p>
            </div>
          </div>

          <div className="divide-y divide-slate-800/60">
            {data?.offerUsage.map((off) => (
              <div key={off.couponCode} className="py-3 flex items-center justify-between gap-4">
                <div>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-black font-mono bg-cyan-950 text-cyan-300 border border-cyan-800">
                    {off.couponCode}
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Redeemed {off.timesApplied} times • Avg discount {formatINR(off.averageDiscount)}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-rose-400">
                    -{formatINR(off.totalDiscountAmount)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Generated {formatINR(off.totalSalesVolume)}
                  </div>
                </div>
              </div>
            ))}

            {(!data?.offerUsage || data.offerUsage.length === 0) && (
              <div className="py-8 text-center text-xs text-slate-400">
                No coupon offers redeemed in this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOURTH ROW: Recent Settled Transactions Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-black text-white">Recent Settled Invoices</h3>
            <p className="text-xs text-slate-400">Last 10 paid table sessions</p>
          </div>
          <span className="text-[10px] font-bold text-slate-400">Auto-logged with Audit Trail</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="pb-2.5">Invoice #</th>
                <th className="pb-2.5">Table</th>
                <th className="pb-2.5">Section</th>
                <th className="pb-2.5">Payment Mode</th>
                <th className="pb-2.5 text-right">Total Amount</th>
                <th className="pb-2.5 text-right">Paid At (IST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data?.recentInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-900/60 transition">
                  <td className="py-2.5 font-mono font-bold text-white">{inv.invoiceNumber}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      {inv.tableNumber}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-400">{inv.section}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-900 text-slate-300 border border-slate-700">
                      {inv.paymentMethod}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-black text-white">
                    {formatINR(inv.totalAmount)}
                  </td>
                  <td className="py-2.5 text-right text-slate-400 text-[11px]">
                    {new Date(inv.paidAt).toLocaleTimeString('en-IN', {
                      timeZone: 'Asia/Kolkata',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </td>
                </tr>
              ))}

              {(!data?.recentInvoices || data.recentInvoices.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                    No settled invoices found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
