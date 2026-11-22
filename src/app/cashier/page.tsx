import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { CashierDashboardClient } from '@/components/cashier/CashierDashboardClient';

async function CashierContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/cashier');
  }

  // Fetch staff record with restaurant settings
  const { data: staff, error: staffError } = await supabase
    .from('restaurant_staff')
    .select(`
      id,
      name,
      role,
      restaurants (
        id,
        name,
        slug,
        upi_id,
        gstin,
        currency,
        is_tax_inclusive,
        is_service_charge_enabled,
        service_charge_rate
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (staffError || !staff || !staff.restaurants) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center space-y-3">
          <h2 className="text-lg font-bold text-rose-400">Staff Account Not Found</h2>
          <p className="text-xs text-slate-400">
            Your login is not associated with an active restaurant staff profile.
          </p>
        </div>
      </div>
    );
  }

  const restaurant = staff.restaurants as unknown as {
    id: string;
    name: string;
    slug: string;
    upi_id: string | null;
    gstin: string | null;
    currency: string;
    is_tax_inclusive: boolean;
    is_service_charge_enabled: boolean;
    service_charge_rate: number;
  };

  return (
    <CashierDashboardClient
      initialRestaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        upiId: restaurant.upi_id,
        gstin: restaurant.gstin,
        currency: restaurant.currency || 'INR',
        isTaxInclusive: restaurant.is_tax_inclusive,
        isServiceChargeEnabled: restaurant.is_service_charge_enabled,
        serviceChargeRate: Number(restaurant.service_charge_rate || 0),
      }}
      staff={{
        name: staff.name,
        role: staff.role,
      }}
    />
  );
}

export default function CashierPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Opening Cashier POS...</p>
          </div>
        </div>
      }
    >
      <CashierContent />
    </Suspense>
  );
}
