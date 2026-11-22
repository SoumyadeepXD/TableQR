import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AdminConsoleClient, AdminRestaurant } from '@/components/admin/AdminConsoleClient';

async function AdminContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirectTo=/admin');
  }

  // Fetch staff record with restaurant profile
  const { data: staff, error: staffError } = await supabase
    .from('restaurant_staff')
    .select(`
      id,
      name,
      role,
      is_active,
      restaurants (*)
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (staffError || !staff || !staff.restaurants) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center space-y-4">
          <h2 className="text-xl font-bold text-rose-400">Staff Account Not Found</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your login account is not associated with an active restaurant profile, or your account has been deactivated.
          </p>
          <a
            href="/login"
            className="inline-block mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition"
          >
            Return to Login
          </a>
        </div>
      </div>
    );
  }

  if (staff.role !== 'owner' && staff.role !== 'manager') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 p-8 rounded-3xl border border-slate-800 text-center space-y-4">
          <h2 className="text-xl font-bold text-amber-400">Owner & Manager Access Only</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your staff account has role <span className="font-mono text-white font-bold uppercase">{staff.role}</span>.
            The Owner Admin Console requires <span className="font-semibold text-slate-200">Owner</span> or <span className="font-semibold text-slate-200">Manager</span> role.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            {staff.role === 'kitchen' && (
              <a
                href="/kitchen"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
              >
                Go to Kitchen Display
              </a>
            )}
            {staff.role === 'cashier' && (
              <a
                href="/cashier"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
              >
                Go to Cashier POS
              </a>
            )}
            <a
              href="/login"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              Switch Account
            </a>
          </div>
        </div>
      </div>
    );
  }

  const rawRest = staff.restaurants as Record<string, unknown>;
  const restaurant: AdminRestaurant = {
    id: String(rawRest.id || ''),
    slug: String(rawRest.slug || ''),
    name: String(rawRest.name || ''),
    tagline: (rawRest.tagline as string | null) || null,
    description: (rawRest.description as string | null) || null,
    brand_color: String(rawRest.brand_color || '#d97706'),
    address: (rawRest.address as string | null) || null,
    city: (rawRest.city as string | null) || null,
    state: (rawRest.state as string | null) || null,
    pincode: (rawRest.pincode as string | null) || null,
    phone: (rawRest.phone as string | null) || null,
    email: (rawRest.email as string | null) || null,
    gstin: (rawRest.gstin as string | null) || null,
    fssai_license: (rawRest.fssai_license as string | null) || null,
    upi_id: String(rawRest.upi_id || ''),
    upi_name: String(rawRest.upi_name || rawRest.name || ''),
    is_tax_inclusive: Boolean(rawRest.is_tax_inclusive),
    default_tax_rate: Number(rawRest.default_tax_rate || 5),
    is_service_charge_enabled: Boolean(rawRest.is_service_charge_enabled),
    service_charge_rate: Number(rawRest.service_charge_rate || 0),
  };

  return (
    <AdminConsoleClient
      initialRestaurant={restaurant}
      currentStaff={{
        name: staff.name,
        role: staff.role,
      }}
    />
  );
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-2" />
          Loading Admin Workspace...
        </div>
      }
    >
      <AdminContent />
    </Suspense>
  );
}
