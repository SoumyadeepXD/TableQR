'use client';

import React from 'react';
import Link from 'next/link';
import {
  Utensils,
  QrCode,
  ChefHat,
  Receipt,
  Shield,
  ArrowRight,
  Sparkles,
  ExternalLink,
  Store,
  CheckCircle2,
} from 'lucide-react';
import { formatINR, formatISTDateTime, getIndianFinancialYear } from '@/lib/formatters';

const DEMO_TABLES = [
  { number: 'T-01', section: 'Indoor AC Hall', token: 'tbl_t01_9d8e7a6b5c', cap: 2 },
  { number: 'T-02', section: 'Indoor AC Hall', token: 'tbl_t02_1a2b3c4d5e', cap: 2 },
  { number: 'T-03', section: 'Indoor AC Hall', token: 'tbl_t03_6f7e8d9c0b', cap: 4 },
  { number: 'T-04', section: 'Indoor AC Hall', token: 'tbl_t04_2c3d4e5f6a', cap: 4 },
  { number: 'T-07', section: 'Garden Courtyard', token: 'tbl_t07_8d9e0a1b2c', cap: 2 },
  { number: 'T-10', section: 'Garden Courtyard', token: 'tbl_t10_5b6c7d8e9f', cap: 8 },
  { number: 'T-11', section: 'Balcony Sunset Deck', token: 'tbl_t11_0e1f2a3b4c', cap: 2 },
  { number: 'T-12', section: 'Balcony Sunset Deck', token: 'tbl_t12_6d7e8f9a0b', cap: 4 },
];

const emptySubscribe = () => () => {};

export default function HomePage() {
  const isClient = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const currentFY = isClient ? getIndianFinancialYear() : '2026-27';
  const currentIST = isClient ? formatISTDateTime(new Date()) : 'Kolkata (IST)';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs backdrop-blur-md bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Table<span className="text-amber-600">QR</span>
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">
                India Dine-In SaaS
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold shadow-xs transition"
            >
              <span>Staff Login</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        <section className="bg-gradient-to-br from-amber-600 via-amber-700 to-orange-800 rounded-3xl p-8 sm:p-12 text-white shadow-xl shadow-amber-600/10 relative overflow-hidden">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-medium mb-4 border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>Phase 3 Active: Owner Admin, Tables & Menu Console</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
              Multi-Restaurant QR Dine-in SaaS for Indian Cafes & Restaurants
            </h1>
            <p className="mt-4 text-base sm:text-lg text-amber-100/90 leading-relaxed font-normal">
              Customers scan QR at their table, order with no login, and pay via UPI. Kitchen gets live KOT tickets, and owners get real-time analytics. Built for Indian dining operations.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 text-xs">
              <div className="px-3 py-1.5 bg-black/25 backdrop-blur-xs rounded-lg border border-white/10">
                Timezone: <span className="font-semibold text-white">Asia/Kolkata (IST)</span>
              </div>
              <div className="px-3 py-1.5 bg-black/25 backdrop-blur-xs rounded-lg border border-white/10">
                Currency: <span className="font-semibold text-white">INR ({formatINR(1250)})</span>
              </div>
              <div className="px-3 py-1.5 bg-black/25 backdrop-blur-xs rounded-lg border border-white/10">
                Indian FY: <span className="font-semibold text-white">{currentFY}</span>
              </div>
              <div className="px-3 py-1.5 bg-black/25 backdrop-blur-xs rounded-lg border border-white/10">
                Live IST: <span className="font-semibold text-white">{currentIST}</span>
              </div>
            </div>
          </div>
        </section>

        {/* 1. Customer Demo Flow */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-amber-600" />
                Customer Entry: Scan & Order (No Login)
              </h2>
              <p className="text-xs text-slate-500">
                Each table has a unique, unguessable cryptographic token in its QR URL.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-400">
              Demo Cafe: Darjeeling Chai & Cafe (/r/cafe-darjeeling)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {DEMO_TABLES.map((table) => (
              <Link
                key={table.token}
                href={`/r/cafe-darjeeling/t/${table.token}`}
                className="group p-4 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition">
                      {table.number}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                      Cap: {table.cap}
                    </span>
                  </div>
                  <div className="font-semibold text-slate-900 text-xs">
                    Table {table.number}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {table.section}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-amber-600">
                  <span>Open Table</span>
                  <ExternalLink className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 2. Staff Roles & Dedicated Workspaces */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Staff Workspaces (Role-Isolated via Supabase RLS)
            </h2>
            <p className="text-xs text-slate-500">
              Multi-tenant RBAC isolating restaurant data per role and restaurant ID.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Kitchen */}
            <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 text-white flex flex-col justify-between shadow-md">
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-600 flex items-center justify-center text-white mb-4 shadow-sm">
                  <ChefHat className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Kitchen Display (KOT)</h3>
                <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                  Realtime board for cooks with elapsed-time timers, order column stages, item cancellation, and stock toggle.
                </p>
                <div className="mt-4 text-[11px] font-mono text-slate-400 bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                  Route: <code>/kitchen</code><br />
                  Role: <code>kitchen@tableqr.in</code>
                </div>
              </div>
              <Link
                href="/kitchen"
                className="mt-5 w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold text-center transition block"
              >
                Go to Kitchen Station →
              </Link>
            </div>

            {/* Cashier */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 text-slate-900 flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white mb-4 shadow-sm">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Cashier & POS Desk</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Table session billing, GST split, UPI QR generation, sequential FY invoices, and manual &ldquo;Mark Paid&rdquo;.
                </p>
                <div className="mt-4 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  Route: <code>/cashier</code><br />
                  Role: <code>cashier@tableqr.in</code>
                </div>
              </div>
              <Link
                href="/cashier"
                className="mt-5 w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold text-center transition block"
              >
                Go to Cashier Desk →
              </Link>
            </div>

            {/* Admin */}
            <div className="p-6 bg-white rounded-3xl border border-slate-200 text-slate-900 flex flex-col justify-between shadow-xs">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white mb-4 shadow-sm">
                  <Store className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base">Owner Admin & Analytics</h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Menu catalog, 12 table QR sheets (PDF), offers/coupons, GST/UPI settings, and revenue analytics.
                </p>
                <div className="mt-4 text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  Route: <code>/admin</code><br />
                  Role: <code>owner@tableqr.in</code>
                </div>
              </div>
              <Link
                href="/admin"
                className="mt-5 w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold text-center transition block"
              >
                Go to Owner Console →
              </Link>
            </div>
          </div>
        </section>

        {/* 3. Phase 0 Deliverable Checklist */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Phase 0: Verification Checklist
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">17 Postgres Tables & Relationships:</span>
                <p className="text-slate-500 mt-0.5">
                  Restaurants, staff, tables, sessions, categories, menu items, variants, addons, orders, items, invoices, sequences, offers, service requests, and audit logs.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Row Level Security (RLS) On Every Table:</span>
                <p className="text-slate-500 mt-0.5">
                  Multi-tenant isolation using <code>get_staff_restaurant_id()</code> and <code>get_staff_role()</code> + public access policies for customer QR tables.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Indian Business Engine Standards:</span>
                <p className="text-slate-500 mt-0.5">
                  Timezone <code>Asia/Kolkata</code>, currency <code>INR (₹)</code>, Indian numbering format, and atomic Indian FY invoice sequencing (<code>TQR/2026-27/0001</code>).
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">Complete Demo Seed Provisioning:</span>
                <p className="text-slate-500 mt-0.5">
                  1 demo cafe (Darjeeling Chai &amp; Cafe), 12 tables with unique tokens, 25 authentic menu items, variants, addons, and 4 staff accounts.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>TableQR — Multi-Restaurant QR Dine-in SaaS • Phase 0 Active</p>
      </footer>
    </div>
  );
}
