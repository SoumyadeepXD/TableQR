import React, { Suspense } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { AlertCircle, Loader2 } from 'lucide-react';
import { CustomerAppClient } from '@/components/customer/CustomerAppClient';
import type { MenuItemWithDetails } from '@/components/customer/ItemCustomizerModal';

interface CustomerTablePageProps {
  params: Promise<{
    slug: string;
    tableToken: string;
  }>;
}

async function CustomerTableContent({ params }: CustomerTablePageProps) {
  const { slug, tableToken } = await params;
  const supabase = await createClient();

  // 1. Fetch restaurant by slug
  const { data: restaurant, error: restError } = await supabase
    .from('restaurants')
    .select(`
      id,
      slug,
      name,
      tagline,
      description,
      address,
      city,
      currency,
      brand_color,
      is_tax_inclusive,
      upi_id,
      upi_name
    `)
    .eq('slug', slug)
    .single();

  // 2. Fetch table by token
  const { data: table, error: tableError } = await supabase
    .from('tables')
    .select('id, restaurant_id, table_number, section, capacity, qr_token, is_active')
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
        <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900">Invalid Table QR Code</h1>
          <p className="mt-2 text-sm text-slate-600">
            This QR code could not be verified or the table session is inactive. Please ask cafe staff for assistance.
          </p>
          <div className="mt-6 p-3 bg-slate-50 rounded-xl text-xs font-mono text-slate-500 break-all text-left">
            Slug: {slug}<br />
            Token: {tableToken}
          </div>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center w-full py-3 px-4 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // 3. Fetch active table session if one exists
  const { data: activeSession } = await supabase
    .from('table_sessions')
    .select('id')
    .eq('restaurant_id', restaurant.id)
    .eq('table_id', table.id)
    .eq('status', 'active')
    .order('opened_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // 4. Fetch menu categories
  const { data: categoriesData } = await supabase
    .from('categories')
    .select('id, name, description, sort_order')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  // 5. Fetch all menu items with variants, addon groups, and addon items
  const { data: menuItemsData } = await supabase
    .from('menu_items')
    .select(`
      id,
      category_id,
      name,
      description,
      price,
      image_url,
      is_veg,
      is_available,
      tax_rate,
      prep_time_minutes,
      is_bestseller,
      sort_order,
      item_variants (
        id,
        name,
        price,
        is_available,
        sort_order
      ),
      addon_groups (
        id,
        name,
        min_selection,
        max_selection,
        is_required,
        addon_items (
          id,
          name,
          price,
          is_available,
          sort_order
        )
      )
    `)
    .eq('restaurant_id', restaurant.id)
    .order('sort_order', { ascending: true });

  // Group menu items into categories
  const categoriesWithItems = (categoriesData || []).map((cat) => {
    const items = (menuItemsData || [])
      .filter((m) => m.category_id === cat.id)
      .map((m) => ({
        ...m,
        price: Number(m.price),
        tax_rate: Number(m.tax_rate),
        item_variants: (m.item_variants || [])
          .map((v) => ({ ...v, price: Number(v.price) }))
          .sort((a, b) => a.sort_order - b.sort_order),
        addon_groups: (m.addon_groups || []).map((g) => ({
          ...g,
          addon_items: (g.addon_items || [])
            .map((ai) => ({ ...ai, price: Number(ai.price) }))
            .sort((a, b) => a.sort_order - b.sort_order),
        })),
      })) as MenuItemWithDetails[];

    return {
      ...cat,
      items,
    };
  });

  return (
    <CustomerAppClient
      restaurant={restaurant}
      table={table}
      categories={categoriesWithItems}
      initialSessionId={activeSession?.id || null}
    />
  );
}

export default function CustomerTablePage(props: CustomerTablePageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin text-amber-600 mr-2" />
          Loading Table Dining Experience...
        </div>
      }
    >
      <CustomerTableContent {...props} />
    </Suspense>
  );
}
