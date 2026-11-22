'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  QrCode,
  CheckCircle2,
  Copy,
  Check,
  Tag,
  Receipt,
  Clock,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  Zap,
  ShieldCheck,
  Loader2,
  Share2,
} from 'lucide-react';
import { formatINR, formatISTDateTime } from '@/lib/formatters';
import { createClient } from '@/lib/supabase/client';
import type { BillingResult } from '@/lib/billing/engine';
import { ThermalBillModal } from '@/components/printing/ThermalBillReceipt';
import { useTranslation } from '@/lib/i18n/context';
import { LanguageSelector } from '@/components/common/LanguageSelector';
import { WhatsAppShareModal } from '@/components/common/WhatsAppShareModal';
import type { WhatsAppBillPayload } from '@/lib/whatsapp/formatter';

interface CustomerBillClientProps {
  restaurant: {
    id: string;
    slug: string;
    name: string;
    tagline?: string | null;
    address?: string | null;
    city?: string | null;
    upiId?: string | null;
    gstin?: string | null;
    currency: string;
    isTaxInclusive: boolean;
  };
  table: {
    id: string;
    tableNumber: string;
    section?: string | null;
    qrToken: string;
  };
  sessionToken: string;
}

interface ItemSummaryLine {
  id: string;
  orderNumber: number;
  name: string;
  variantName?: string | null;
  unitPrice: number;
  quantity: number;
  addons: { name: string; price: number }[];
  lineTotal: number;
  taxRate: number;
  cookingRequest?: string | null;
}

interface InvoiceData {
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
}

export function CustomerBillClient({
  restaurant,
  table,
  sessionToken,
}: CustomerBillClientProps) {
  const [bill, setBill] = useState<BillingResult | null>(null);
  const [itemsSummary, setItemsSummary] = useState<ItemSummaryLine[]>([]);
  const [existingInvoice, setExistingInvoice] = useState<InvoiceData | null>(null);
  const [upiUri, setUpiUri] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [isApplyingCoupon, startApplyTransition] = useTransition();

  // UI state
  const { t } = useTranslation();
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [showBillPrintModal, setShowBillPrintModal] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);

  // Payment Gateway Automation state
  const [paymentMode, setPaymentMode] = useState<'gateway' | 'static_upi'>('gateway');
  const [isCreatingGatewayOrder, setIsCreatingGatewayOrder] = useState(false);
  const [gatewayOrder, setGatewayOrder] = useState<{
    gatewayOrderId: string;
    gateway: string;
    amount: number;
    currency: string;
    keyId: string;
    upiQrString?: string;
    qrDataUrl?: string;
    isMock?: boolean;
  } | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);
  const [gatewayError, setGatewayError] = useState<string | null>(null);

  const supabase = createClient();

  // 1. Initial Load of Bill
  useEffect(() => {
    let ignore = false;

    async function loadInitialBill() {
      try {
        const params = new URLSearchParams();
        params.set('sessionToken', sessionToken);

        const res = await fetch(`/api/billing/calculate?${params.toString()}`);
        const data = await res.json();

        if (ignore) return;

        if (!res.ok) {
          throw new Error(data.error || 'Failed to calculate bill');
        }

        setBill(data.bill);
        setItemsSummary(data.itemsSummary || []);
        setUpiUri(data.upiUri || '');
        setQrDataUrl(data.qrDataUrl || '');

        let invoiceRecord = data.existingInvoice;
        if (!invoiceRecord && sessionToken) {
          try {
            const invRes = await fetch('/api/invoices', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sessionToken }),
            });
            if (invRes.ok) {
              const invData = await invRes.json();
              if (invData.invoice) {
                invoiceRecord = invData.invoice;
              }
            }
          } catch {
            // Ignore auto-create error
          }
        }
        setExistingInvoice(invoiceRecord);

        if (invoiceRecord?.payment_status === 'paid') {
          setIsPaid(true);
        }
      } catch (err: unknown) {
        if (!ignore) {
          const msg = err instanceof Error ? err.message : 'Unable to load bill';
          setError(msg);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadInitialBill();

    return () => {
      ignore = true;
    };
  }, [sessionToken]);

  // Function to re-fetch on coupon changes
  const applyCouponQuery = async (coupon: string | null) => {
    setIsLoading(true);
    setError(null);
    setCouponError(null);

    try {
      const params = new URLSearchParams();
      params.set('sessionToken', sessionToken);
      if (coupon) {
        params.set('couponCode', coupon);
      }

      const res = await fetch(`/api/billing/calculate?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to calculate bill');
      }

      setBill(data.bill);
      setItemsSummary(data.itemsSummary || []);
      setUpiUri(data.upiUri || '');
      setQrDataUrl(data.qrDataUrl || '');
      setExistingInvoice(data.existingInvoice);

      if (coupon) {
        if (data.bill?.discountDetails?.reason) {
          setCouponError(data.bill.discountDetails.reason);
          setAppliedCoupon(null);
        } else if (data.bill?.discountAmount > 0) {
          setAppliedCoupon(coupon.toUpperCase());
          setCouponError(null);
        }
      } else {
        setAppliedCoupon(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply coupon';
      setCouponError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitiateGatewayOrder = async (provider: 'razorpay' | 'cashfree' = 'razorpay') => {
    setIsCreatingGatewayOrder(true);
    setGatewayError(null);

    try {
      let invId = existingInvoice?.id;
      if (!invId) {
        const invRes = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionToken, couponCode: appliedCoupon }),
        });
        const invData = await invRes.json();
        if (!invRes.ok || !invData.invoice) {
          throw new Error(invData.error || 'Failed to initialize invoice');
        }
        invId = invData.invoice.id;
        setExistingInvoice(invData.invoice);
      }

      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invId,
          gateway: provider,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create online payment order');
      }

      setGatewayOrder(data.order);
    } catch (err: unknown) {
      setGatewayError(err instanceof Error ? err.message : 'Failed to initialize online payment');
    } finally {
      setIsCreatingGatewayOrder(false);
    }
  };

  const handleSimulatePaymentSuccess = async () => {
    if (!existingInvoice?.id || !gatewayOrder) return;
    setIsSimulatingPayment(true);
    setGatewayError(null);

    try {
      const mockPaymentId = `pay_mock_${Date.now()}`;
      const mockSignature = `mock_sig_${gatewayOrder.gatewayOrderId}`;

      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: existingInvoice.id,
          gateway: gatewayOrder.gateway,
          orderId: gatewayOrder.gatewayOrderId,
          paymentId: mockPaymentId,
          signature: mockSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Simulated verification failed');
      }

      setIsPaid(true);
      setExistingInvoice((prev) =>
        prev
          ? {
              ...prev,
              payment_status: 'paid',
              payment_method: `gateway_${gatewayOrder.gateway}`,
              paid_at: data.result.paidAt,
            }
          : null
      );
    } catch (err: unknown) {
      setGatewayError(err instanceof Error ? err.message : 'Failed to simulate payment');
    } finally {
      setIsSimulatingPayment(false);
    }
  };

  // 2. Realtime Subscription for Payment Updates
  useEffect(() => {
    const channel = supabase
      .channel(`customer-bill-${table.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoices',
          filter: `restaurant_id=eq.${restaurant.id}`,
        },
        (payload) => {
          const inv = payload.new as InvoiceData;
          if (inv && inv.payment_status === 'paid') {
            setIsPaid(true);
            setExistingInvoice(inv);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'table_sessions',
          filter: `session_token=eq.${sessionToken}`,
        },
        (payload) => {
          const sess = payload.new as { status?: string };
          if (sess && sess.status === 'completed') {
            setIsPaid(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, restaurant.id, table.id, sessionToken]);

  // Handle Coupon Apply
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    startApplyTransition(() => {
      applyCouponQuery(couponInput.trim());
    });
  };

  const handleRemoveCoupon = () => {
    setCouponInput('');
    setAppliedCoupon(null);
    setCouponError(null);
    applyCouponQuery(null);
  };

  // Copy UPI ID
  const handleCopyUpi = () => {
    if (!restaurant.upiId) return;
    navigator.clipboard.writeText(restaurant.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (isLoading && !bill) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Calculating your bill...</p>
        </div>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">No Active Bill Found</h2>
          <p className="text-sm text-slate-600">{error || 'Please place an order first to view your bill.'}</p>
          <Link
            href={`/r/${restaurant.slug}/t/${table.qrToken}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Menu</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/60 pb-16 text-slate-800">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link
            href={`/r/${restaurant.slug}/t/${table.qrToken}`}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold text-xs transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('back')}</span>
          </Link>

          <div className="text-center">
            <span className="font-extrabold text-sm text-slate-900 block">{restaurant.name}</span>
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/50">
              {t('tableNumber')} {table.tableNumber} {table.section ? `• ${table.section}` : ''}
            </span>
          </div>

          <div className="flex items-center gap-1.5 justify-end">
            <LanguageSelector variant="compact" />
            <button
              type="button"
              onClick={() => setShowWhatsAppModal(true)}
              className="p-1.5 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition cursor-pointer"
              title={t('shareOnWhatsApp')}
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowBillPrintModal(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              title="Print Receipt"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-5 space-y-4">
        {/* PAYMENT SUCCESS BANNER */}
        {isPaid && (
          <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center mx-auto text-white">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-xl font-black">Payment Confirmed!</h2>
              <p className="text-xs text-emerald-100 mt-1">
                Thank you for dining with us at {restaurant.name}.
              </p>
            </div>
            <div className="bg-emerald-700/60 rounded-2xl p-3 inline-block text-xs font-semibold">
              Paid: {formatINR(existingInvoice?.total_amount ?? (bill?.totalAmount || 0))} • Method:{' '}
              {existingInvoice?.payment_method?.toUpperCase() || 'UPI'}
            </div>
            {existingInvoice?.paid_at && (
              <div className="text-[11px] text-emerald-200">
                Settled on {formatISTDateTime(existingInvoice.paid_at)}
              </div>
            )}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowBillPrintModal(true)}
                className="px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>View Receipt / PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWhatsAppModal(true)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{t('shareOnWhatsApp')}</span>
              </button>
            </div>
          </div>
        )}

        {/* INVOICE & TAX DETAILS CARD */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-start justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-600" />
                <span className="font-extrabold text-sm text-slate-900">
                  {existingInvoice?.invoice_number ? `Invoice #${existingInvoice.invoice_number}` : 'Dine-In Estimate'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Financial Year: {existingInvoice?.financial_year || 'Current'}
              </p>
            </div>

            <div className="text-right">
              <span
                className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                  isPaid
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {isPaid ? 'PAID' : 'UNPAID'}
              </span>
              {restaurant.gstin && (
                <div className="text-[10px] text-slate-400 font-mono mt-1">
                  GSTIN: {restaurant.gstin}
                </div>
              )}
            </div>
          </div>

          {/* ITEM SUMMARY ACCORDION */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ordered Items ({itemsSummary.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {itemsSummary.map((item) => (
                <div key={item.id} className="py-2.5 flex items-start justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800">
                      {item.quantity} × {item.name}
                      {item.variantName && (
                        <span className="text-slate-500 font-normal"> ({item.variantName})</span>
                      )}
                    </div>
                    {item.addons.length > 0 && (
                      <div className="text-[11px] text-slate-400 pl-2">
                        {item.addons.map((a) => `+ ${a.name}`).join(', ')}
                      </div>
                    )}
                    <div className="text-[10px] text-slate-400">
                      Round #{item.orderNumber} • Tax {item.taxRate}%
                    </div>
                  </div>
                  <div className="font-bold text-slate-800">{formatINR(item.lineTotal)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* COUPON INPUT */}
          {!isPaid && (
            <div className="pt-3 border-t border-slate-100">
              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-extrabold text-emerald-800">
                        {appliedCoupon} APPLIED
                      </span>
                      <p className="text-[11px] text-emerald-600 font-semibold">
                        You saved {formatINR(bill.discountAmount)}!
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>Have a Coupon or Offer Code?</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME10, FLAT75"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isApplyingCoupon || !couponInput.trim()}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition"
                    >
                      {isApplyingCoupon ? 'Applying...' : 'Apply'}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-[11px] font-semibold text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{couponError}</span>
                    </p>
                  )}
                </form>
              )}
            </div>
          )}

          {/* BILL SUMMARY BREAKDOWN */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Items Subtotal</span>
              <span className="font-semibold">{formatINR(bill.itemsSubtotal)}</span>
            </div>

            {bill.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Discount ({bill.discountDetails?.title || 'Offer'})</span>
                </span>
                <span>-{formatINR(bill.discountAmount)}</span>
              </div>
            )}

            {bill.serviceChargeAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Service Charge ({bill.serviceChargeRate}%)</span>
                <span className="font-semibold">{formatINR(bill.serviceChargeAmount)}</span>
              </div>
            )}

            {/* GST (CGST + SGST Split) */}
            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <span>CGST (Central GST)</span>
              </span>
              <span className="font-semibold">{formatINR(bill.cgstAmount)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <span>SGST (State GST)</span>
              </span>
              <span className="font-semibold">{formatINR(bill.sgstAmount)}</span>
            </div>

            {/* Collapsible Tax Slab Breakdown */}
            {bill.taxBreakdownBySlab.length > 1 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowTaxBreakdown(!showTaxBreakdown)}
                  className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showTaxBreakdown ? 'Hide Slab Breakdown' : 'View Slabs Breakdown'}</span>
                  {showTaxBreakdown ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showTaxBreakdown && (
                  <div className="mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1.5 text-[11px] text-slate-500">
                    {bill.taxBreakdownBySlab.map((slab) => (
                      <div key={slab.slab} className="flex justify-between">
                        <span>
                          {slab.slab}% Slab (Base {formatINR(slab.taxableAmount)})
                        </span>
                        <span className="font-mono">
                          CGST {formatINR(slab.cgst)} + SGST {formatINR(slab.sgst)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {bill.roundOffAmount !== 0 && (
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>Round-off</span>
                <span className="font-mono">
                  {bill.roundOffAmount > 0 ? `+₹${bill.roundOffAmount.toFixed(2)}` : `-₹${Math.abs(bill.roundOffAmount).toFixed(2)}`}
                </span>
              </div>
            )}

            {/* GRAND TOTAL */}
            <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-baseline">
              <div>
                <span className="text-sm font-black text-slate-900 uppercase">Grand Total</span>
                <p className="text-[10px] text-slate-400">
                  {restaurant.isTaxInclusive ? 'Inclusive of all taxes' : 'Inclusive of GST & charges'}
                </p>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {formatINR(bill.totalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* PAYMENT CARD (Only shown when unpaid) */}
        {!isPaid && bill.totalAmount > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
            {/* Mode Switcher Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setPaymentMode('gateway')}
                className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentMode === 'gateway'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-rose-500" />
                <span>Auto-Confirm (Gateway)</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('static_upi')}
                className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  paymentMode === 'static_upi'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-amber-600" />
                <span>Counter UPI QR</span>
              </button>
            </div>

            {/* GATEWAY MODE */}
            {paymentMode === 'gateway' ? (
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-rose-50 text-rose-800 border border-rose-200/60 px-3 py-1 rounded-full text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-rose-600" />
                  <span>Razorpay / Dynamic UPI Auto-Confirm</span>
                </div>

                {!gatewayOrder ? (
                  <div className="space-y-3 py-2">
                    <p className="text-xs text-slate-500">
                      Generate a dynamic UPI QR and pay via any UPI app, Netbanking, or Cards. The kitchen and cashier are notified automatically the instant payment completes!
                    </p>

                    <button
                      type="button"
                      onClick={() => handleInitiateGatewayOrder('razorpay')}
                      disabled={isCreatingGatewayOrder}
                      className="w-full py-3.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 text-white rounded-2xl font-bold text-xs shadow-lg shadow-rose-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      {isCreatingGatewayOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Dynamic Payment QR...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>Pay {formatINR(bill.totalAmount)} with Auto-Confirm</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Dynamic QR */}
                    {gatewayOrder.qrDataUrl && (
                      <div className="flex justify-center my-2">
                        <div className="p-3 bg-white border-2 border-rose-600 rounded-3xl shadow-sm">
                          <Image
                            src={gatewayOrder.qrDataUrl}
                            alt="Dynamic UPI QR Code"
                            width={220}
                            height={220}
                            className="rounded-2xl"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Awaiting Payment • Auto-Detecting...</span>
                      </div>
                      <p className="text-[11px] text-slate-400 pt-1">
                        Order #{gatewayOrder.gatewayOrderId.slice(0, 16)}
                      </p>
                    </div>

                    {/* Mobile UPI Deep Link */}
                    {gatewayOrder.upiQrString && (
                      <div className="space-y-2 pt-1">
                        <a
                          href={gatewayOrder.upiQrString}
                          className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                        >
                          <span>Open in UPI App (GPay/PhonePe/Paytm)</span>
                        </a>
                      </div>
                    )}

                    {/* Sandbox Simulator button for testing */}
                    <div className="pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={handleSimulatePaymentSuccess}
                        disabled={isSimulatingPayment}
                        className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                      >
                        {isSimulatingPayment ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying Payment...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                            <span>🧪 Simulate Payment Success (Demo Sandbox)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {gatewayError && (
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
                    {gatewayError}
                  </div>
                )}
              </div>
            ) : (
              /* STATIC COUNTER UPI MODE */
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200/60 px-3 py-1 rounded-full text-xs font-bold">
                  <QrCode className="w-3.5 h-3.5 text-amber-600" />
                  <span>Manual Counter UPI Payment</span>
                </div>

                {qrDataUrl && (
                  <div className="flex justify-center my-2">
                    <div className="p-3 bg-white border-2 border-slate-900 rounded-3xl shadow-sm">
                      <Image
                        src={qrDataUrl}
                        alt="UPI Payment QR Code"
                        width={220}
                        height={220}
                        className="rounded-2xl"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <p className="font-extrabold text-sm text-slate-800">
                    Scan with any UPI App
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Google Pay • PhonePe • Paytm • BHIM • CRED
                  </p>
                </div>

                <div className="pt-2 space-y-2">
                  <a
                    href={upiUri}
                    className="w-full py-3.5 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-xs shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <span>Pay {formatINR(bill.totalAmount)} via UPI App</span>
                  </a>

                  {restaurant.upiId && (
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="w-full py-2.5 px-3 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedUpi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">UPI ID Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy UPI ID ({restaurant.upiId})</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  <span>After paying, cashier will confirm your bill</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 80mm Thermal Slip & PDF Modal */}
      {showBillPrintModal && bill && (
        <ThermalBillModal
          bill={{
            restaurant: {
              name: restaurant.name,
              tagline: restaurant.tagline,
              address: restaurant.address,
              city: restaurant.city,
              upiId: restaurant.upiId,
              gstin: restaurant.gstin,
            },
            invoiceNumber: existingInvoice?.invoice_number || null,
            tableNumber: table.tableNumber,
            section: table.section,
            serverName: 'QR Dine-In',
            createdAt: existingInvoice?.paid_at || new Date().toISOString(),
            items: itemsSummary.map((it) => ({
              id: it.id,
              itemName: it.name,
              variantName: it.variantName,
              unitPrice: it.unitPrice,
              quantity: it.quantity,
              addons: it.addons,
              lineTotal: it.lineTotal,
            })),
            subtotal: bill.itemsSubtotal,
            discountAmount: bill.discountAmount,
            discountCode: bill.discountDetails?.code || appliedCoupon || null,
            serviceChargeAmount: bill.serviceChargeAmount,
            serviceChargeRate: bill.serviceChargeRate,
            cgstAmount: bill.cgstAmount,
            sgstAmount: bill.sgstAmount,
            taxSlabs: bill.taxBreakdownBySlab,
            roundOffAmount: bill.roundOffAmount,
            totalAmount: bill.totalAmount,
            paymentStatus: isPaid ? 'paid' : 'unpaid',
            paymentMethod: existingInvoice?.payment_method || 'UPI',
            paidAt: existingInvoice?.paid_at || null,
            upiQrDataUrl: qrDataUrl || null,
          }}
          onClose={() => setShowBillPrintModal(false)}
        />
      )}

      {/* WhatsApp Bill Sharing Modal */}
      {showWhatsAppModal && bill && (
        <WhatsAppShareModal
          isOpen={showWhatsAppModal}
          onClose={() => setShowWhatsAppModal(false)}
          billPayload={{
            restaurant: {
              name: restaurant.name,
              tagline: restaurant.tagline,
              address: restaurant.address,
              city: restaurant.city,
              gstin: restaurant.gstin,
            },
            table: {
              tableNumber: table.tableNumber,
              section: table.section,
            },
            invoice: {
              invoiceNumber: existingInvoice?.invoice_number || 'PRO-FORMA',
              date: existingInvoice?.paid_at
                ? formatISTDateTime(existingInvoice.paid_at)
                : new Date().toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
              subtotal: bill.itemsSubtotal,
              discountAmount: bill.discountAmount,
              offerCode: bill.discountDetails?.code || appliedCoupon || null,
              serviceChargeAmount: bill.serviceChargeAmount,
              cgstAmount: bill.cgstAmount,
              sgstAmount: bill.sgstAmount,
              roundOffAmount: bill.roundOffAmount,
              totalAmount: bill.totalAmount,
              paymentStatus: isPaid ? 'paid' : 'unpaid',
              paymentMethod: existingInvoice?.payment_method || null,
            },
            items: itemsSummary.map((it) => ({
              name: it.name,
              quantity: it.quantity,
              variantName: it.variantName,
              price: it.unitPrice,
              total: it.lineTotal,
            })),
            billUrl: typeof window !== 'undefined' ? window.location.href : undefined,
          }}
        />
      )}
    </div>
  );
}
