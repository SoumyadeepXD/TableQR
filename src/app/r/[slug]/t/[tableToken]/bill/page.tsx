import React, { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AlertCircle, ArrowLeft, Loader2, Receipt } from 'lucide-react';
import { CustomerBillClient } from '@/components/customer/CustomerBillClient';

interface CustomerBillPageProps {
  params: Promise<{
    slug: string;
    tableToken: string;
  }>;
}

async function CustomerBillContent({ params }: CustomerBillPageProps) {
  const { slug, tableToken } = await params;
  const supabase = await createClient();

  // 1. Fetch restaurant
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select(`
      id,
      slug,
      name,
      tagline,
      address,
      city,
      upi_id,
      gstin,
      currency,
      is_tax_inclusive
    `)
    .eq('slug', slug)
    .single();

  // 2. Fetch table
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, restaurant_id, table_number, section, qr_token, is_active')
    .eq('qr_token', tableToken)
    .single();

  const isInvalid =
    restError ||
    tableError ||
    !restaurant ||
    !table ||
    table.restaurant_id !== restaurant.id ||
    !table.is_active;

  if (isInvalid) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Invalid Table or Cafe</h2>
          <p className="text-sm text-slate-600">Please re-scan the QR code on your table.</p>
        </div>
      </div>
    );
  }

  // 3. Find active table session (or latest completed session)
  const { data: session } = await supabase
    .from('table_sessions')
    .select('id, session_token, status')
    .eq('table_id', table.id)
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-6 shadow-sm border border-slate-200 text-center space-y-4">
          <Receipt className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">No Orders Placed Yet</h2>
          <p className="text-sm text-slate-600">You haven&apos;t ordered any items at Table {table.table_number} yet.</p>
          <Link
            href={`/r/${restaurant.slug}/t/${table.qr_token}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl font-bold text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Browse Menu</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <CustomerBillClient
      restaurant={{
        id: restaurant.id,
        slug: restaurant.slug,
        name: restaurant.name,
        tagline: restaurant.tagline,
        address: restaurant.address,
        city: restaurant.city,
        upiId: restaurant.upi_id,
        gstin: restaurant.gstin,
        currency: restaurant.currency || 'INR',
        isTaxInclusive: restaurant.is_tax_inclusive,
      }}
      table={{
        id: table.id,
        tableNumber: table.table_number,
        section: table.section,
        qrToken: table.qr_token,
      }}
      sessionToken={session.session_token}
    />
  );
}

export default function CustomerBillPage({ params }: CustomerBillPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-amber-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading bill...</p>
          </div>
        </div>
      }
    >
      <CustomerBillContent params={params} />
    </Suspense>
  );
}
