'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Shield,
  UtensilsCrossed,
  QrCode,
  Tag,
  Settings,
  Users,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  RotateCcw,
  Printer,
  Copy,
  LogOut,
  Building2,
  Receipt,
  CheckCircle2,
  BarChart3,
  CreditCard,
  Zap,
} from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import { PrintableQrSheet, TableQrCardData } from './PrintableQrSheet';
import { AnalyticsDashboard } from './AnalyticsDashboard';

export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AdminVariant {
  id?: string;
  name: string;
  price: number;
  is_available: boolean;
  sort_order: number;
}

export interface AdminAddonItem {
  id?: string;
  name: string;
  price: number;
  is_available: boolean;
}

export interface AdminAddonGroup {
  id?: string;
  name: string;
  min_selection: number;
  max_selection: number;
  is_required: boolean;
  addon_items: AdminAddonItem[];
}

export interface AdminMenuItem {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  tax_rate: number;
  sort_order: number;
  prep_time_minutes: number;
  is_bestseller: boolean;
  item_variants?: AdminVariant[];
  addon_groups?: AdminAddonGroup[];
}

export interface AdminOffer {
  id: string;
  code: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'flat';
  discount_value: number;
  min_bill_amount: number;
  max_discount_cap: number | null;
  happy_hour_start: string | null;
  happy_hour_end: string | null;
  days_of_week: number[] | null;
  applicable_category_id: string | null;
  is_active: boolean;
}

export interface AdminStaff {
  id: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export interface AdminRestaurant {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  brand_color: string;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  fssai_license: string | null;
  upi_id: string;
  upi_name: string;
  is_tax_inclusive: boolean;
  default_tax_rate: number;
  is_service_charge_enabled: boolean;
  service_charge_rate: number;
  is_gateway_enabled?: boolean;
  gateway_provider?: 'razorpay' | 'cashfree' | null;
  gateway_key_id?: string | null;
  gateway_key_secret?: string | null;
  gateway_webhook_secret?: string | null;
}

interface AdminConsoleProps {
  initialRestaurant: AdminRestaurant;
  currentStaff: {
    name: string;
    role: string;
  };
}

type TabType = 'analytics' | 'menu' | 'tables' | 'offers' | 'settings';

export function AdminConsoleClient({ initialRestaurant, currentStaff }: AdminConsoleProps) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as TabType | null;
  const [activeTab, setActiveTab] = useState<TabType>(requestedTab || 'analytics');
  const [menuSubTab, setMenuSubTab] = useState<'items' | 'categories'>('items');

  // Core Data States
  const [restaurant, setRestaurant] = useState<AdminRestaurant>(initialRestaurant);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [tables, setTables] = useState<TableQrCardData[]>([]);
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [staffList, setStaffList] = useState<AdminStaff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter States
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'non_veg'>('all');

  // Modals
  const [isQrSheetOpen, setIsQrSheetOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AdminMenuItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [isTableModalOpen, setIsTableModalOpen] = useState(false);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<AdminOffer | null>(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);

  // Forms State
  const [settingsForm, setSettingsForm] = useState(initialRestaurant);
  const [isSavingSettings, startSaveTransition] = useTransition();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Load Data
  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/data');
      const data = await res.json();
      if (res.ok) {
        setRestaurant(data.restaurant);
        setSettingsForm(data.restaurant);
        setCategories(data.categories || []);
        setMenuItems(data.menuItems || []);
        setTables(data.tables || []);
        setOffers(data.offers || []);
        setStaffList(data.staffList || []);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/admin/data');
        const data = await res.json();
        if (!ignore && res.ok) {
          setRestaurant(data.restaurant);
          setSettingsForm(data.restaurant);
          setCategories(data.categories || []);
          setMenuItems(data.menuItems || []);
          setTables(data.tables || []);
          setOffers(data.offers || []);
          setStaffList(data.staffList || []);
        }
      } catch (e) {
        if (!ignore) {
          console.error('Failed to load admin data:', e);
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
  }, []);

  // 2. Filtered Menu Items
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      if (selectedCategoryFilter !== 'all' && item.category_id !== selectedCategoryFilter) {
        return false;
      }
      if (vegFilter === 'veg' && !item.is_veg) return false;
      if (vegFilter === 'non_veg' && item.is_veg) return false;

      if (itemSearchQuery.trim()) {
        const q = itemSearchQuery.toLowerCase();
        return item.name.toLowerCase().includes(q) || item.description?.toLowerCase().includes(q);
      }
      return true;
    });
  }, [menuItems, selectedCategoryFilter, vegFilter, itemSearchQuery]);

  // 3. Item Availability Toggle
  const handleToggleItemAvailability = async (item: AdminMenuItem) => {
    const newStatus = !item.is_available;
    // Optimistic update
    setMenuItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i))
    );

    try {
      const res = await fetch(`/api/admin/menu-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: newStatus }),
      });
      if (res.ok) {
        showToast(`"${item.name}" marked ${newStatus ? 'Available' : 'Sold Out'}`);
      } else {
        throw new Error();
      }
    } catch {
      // Revert on failure
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, is_available: !newStatus } : i))
      );
      showToast('Failed to update item availability');
    }
  };

  // 4. Delete Item
  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/menu-items/${itemId}`, { method: 'DELETE' });
      if (res.ok) {
        setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
        showToast(`"${name}" deleted successfully`);
      }
    } catch {
      showToast('Failed to delete item');
    }
  };

  // 5. Delete Category
  const handleDeleteCategory = async (catId: string, name: string) => {
    if (!confirm(`Delete category "${name}"? All items in it will also be affected.`)) return;

    try {
      const res = await fetch(`/api/admin/categories/${catId}`, { method: 'DELETE' });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== catId));
        setMenuItems((prev) => prev.filter((i) => i.category_id !== catId));
        showToast(`Category "${name}" deleted`);
      }
    } catch {
      showToast('Failed to delete category');
    }
  };

  // 6. Delete Table
  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (!confirm(`Delete Table ${tableNumber}?`)) return;

    try {
      const res = await fetch(`/api/admin/tables/${tableId}`, { method: 'DELETE' });
      if (res.ok) {
        setTables((prev) => prev.filter((t) => t.id !== tableId));
        showToast(`Table ${tableNumber} deleted`);
      }
    } catch {
      showToast('Failed to delete table');
    }
  };

  // 7. Delete Offer
  const handleDeleteOffer = async (offerId: string, code: string) => {
    if (!confirm(`Delete offer ${code}?`)) return;

    try {
      const res = await fetch(`/api/admin/offers/${offerId}`, { method: 'DELETE' });
      if (res.ok) {
        setOffers((prev) => prev.filter((o) => o.id !== offerId));
        showToast(`Offer ${code} deleted`);
      }
    } catch {
      showToast('Failed to delete offer');
    }
  };

  // 8. Save Restaurant Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    startSaveTransition(async () => {
      try {
        const res = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: settingsForm.name,
            tagline: settingsForm.tagline,
            description: settingsForm.description,
            brandColor: settingsForm.brand_color,
            address: settingsForm.address,
            city: settingsForm.city,
            phone: settingsForm.phone,
            email: settingsForm.email,
            gstin: settingsForm.gstin,
            upiId: settingsForm.upi_id,
            upiName: settingsForm.upi_name,
            isTaxInclusive: settingsForm.is_tax_inclusive,
            defaultTaxRate: settingsForm.default_tax_rate,
            isServiceChargeEnabled: settingsForm.is_service_charge_enabled,
            serviceChargeRate: settingsForm.service_charge_rate,
            isGatewayEnabled: settingsForm.is_gateway_enabled ?? false,
            gatewayProvider: settingsForm.gateway_provider || 'razorpay',
            gatewayKeyId: settingsForm.gateway_key_id,
            gatewayKeySecret: settingsForm.gateway_key_secret,
            gatewayWebhookSecret: settingsForm.gateway_webhook_secret,
          }),
        });

        const data = await res.json();
        if (res.ok && data.restaurant) {
          setRestaurant(data.restaurant);
          setSettingsForm(data.restaurant);
          showToast('Settings saved successfully!');
        } else {
          throw new Error(data.error);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to save settings';
        showToast(msg);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* TOAST FEEDBACK */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 border border-slate-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-2 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ADMIN HEADER */}
      <header className="bg-slate-950/80 border-b border-slate-800 px-6 py-3.5 flex items-center justify-between backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg font-black"
            style={{ backgroundColor: restaurant.brand_color || '#ea580c' }}
          >
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-wide text-white">RESTAURANT ADMIN CONSOLE</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800">
                {currentStaff.role}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {restaurant.name} • Signed in as <span className="text-slate-200 font-semibold">{currentStaff.name}</span>
            </p>
          </div>
        </div>

        {/* Quick Navigation Links */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadAdminData}
            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer"
            title="Refresh Admin Data"
          >
            <RotateCcw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <Link
            href="/kitchen"
            className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Kitchen Board
          </Link>

          <Link
            href="/cashier"
            className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition"
          >
            Cashier POS
          </Link>

          <Link
            href="/login"
            className="p-2 text-slate-400 hover:text-rose-400 bg-slate-800 hover:bg-slate-700 rounded-xl transition"
            title="Switch Account / Logout"
          >
            <LogOut className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* TOP LEVEL NAVIGATION TABS */}
      <nav className="bg-slate-950/40 border-b border-slate-800 px-6 py-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Analytics & Reports</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'menu'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            <span>Menu & Categories ({menuItems.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tables')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'tables'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Tables & QR Cards ({tables.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('offers')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'offers'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Offers & Coupons ({offers.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Profile, Taxes & Staff</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-6 overflow-y-auto">
        {/* ========================================================================= */}
        {/* TAB 0: ANALYTICS & OPERATIONS DASHBOARD */}
        {/* ========================================================================= */}
        {activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto">
            <AnalyticsDashboard
              restaurant={{
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                brand_color: restaurant.brand_color,
              }}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: MENU & CATEGORIES MANAGEMENT */}
        {/* ========================================================================= */}
        {activeTab === 'menu' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header Strip with Sub-tabs and Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex bg-slate-800 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMenuSubTab('items')}
                  className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                    menuSubTab === 'items' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Menu Items ({menuItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setMenuSubTab('categories')}
                  className={`px-4 py-1.5 rounded-lg transition cursor-pointer ${
                    menuSubTab === 'categories' ? 'bg-slate-700 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Categories ({categories.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                {menuSubTab === 'items' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingItem(null);
                      setIsItemModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Menu Item</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setIsCategoryModalOpen(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Category</span>
                  </button>
                )}
              </div>
            </div>

            {/* SUB-TAB: ITEMS */}
            {menuSubTab === 'items' && (
              <div className="space-y-4">
                {/* Search & Category Filter Bar */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search items by name..."
                        value={itemSearchQuery}
                        onChange={(e) => setItemSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl pl-9 pr-3 py-1.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Veg Toggle */}
                    <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl font-bold">
                      <button
                        type="button"
                        onClick={() => setVegFilter('all')}
                        className={`px-2.5 py-1 rounded-lg ${vegFilter === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400'}`}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setVegFilter('veg')}
                        className={`px-2.5 py-1 rounded-lg ${vegFilter === 'veg' ? 'bg-emerald-900/60 text-emerald-300' : 'text-slate-400'}`}
                      >
                        Veg
                      </button>
                      <button
                        type="button"
                        onClick={() => setVegFilter('non_veg')}
                        className={`px-2.5 py-1 rounded-lg ${vegFilter === 'non_veg' ? 'bg-rose-900/60 text-rose-300' : 'text-slate-400'}`}
                      >
                        Non-Veg
                      </button>
                    </div>
                  </div>

                  {/* Categories Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                        selectedCategoryFilter === 'all'
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      All Categories
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(c.id)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                          selectedCategoryFilter === c.id
                            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/50'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-transparent'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMenuItems.map((item) => {
                    const cat = categories.find((c) => c.id === item.category_id);
                    const variantsCount = item.item_variants?.length || 0;
                    const addonGroupsCount = item.addon_groups?.length || 0;

                    return (
                      <div
                        key={item.id}
                        className={`bg-slate-950/70 border rounded-2xl p-4 flex flex-col justify-between transition-all ${
                          item.is_available ? 'border-slate-800' : 'border-slate-800/40 opacity-70 bg-slate-950/40'
                        }`}
                      >
                        <div>
                          {/* Item Header */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                                    item.is_veg ? 'border-emerald-500' : 'border-rose-500'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                                    }`}
                                  />
                                </span>
                                <h3 className="font-extrabold text-sm text-white">{item.name}</h3>
                              </div>
                              <span className="text-[11px] text-slate-400 font-semibold mt-0.5 block">
                                {cat?.name || 'Uncategorized'} • GST {item.tax_rate}%
                              </span>
                            </div>

                            <span className="font-black text-sm text-emerald-400">
                              {formatINR(Number(item.price))}
                            </span>
                          </div>

                          {item.description && (
                            <p className="text-xs text-slate-400 line-clamp-2 mt-2">
                              {item.description}
                            </p>
                          )}

                          {/* Variants & Addons chips */}
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {item.is_bestseller && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                ★ BESTSELLER
                              </span>
                            )}
                            {variantsCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300">
                                {variantsCount} Sizes
                              </span>
                            )}
                            {addonGroupsCount > 0 && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300">
                                {addonGroupsCount} Add-on groups
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer Actions */}
                        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                          {/* Availability Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleItemAvailability(item)}
                            className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                              item.is_available
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                item.is_available ? 'bg-emerald-400' : 'bg-rose-400'
                              }`}
                            />
                            <span>{item.is_available ? 'In Stock' : 'Sold Out'}</span>
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setIsItemModalOpen(true);
                              }}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                              title="Edit item"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item.id, item.name)}
                              className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-lg transition cursor-pointer"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SUB-TAB: CATEGORIES */}
            {menuSubTab === 'categories' && (
              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-slate-400 font-bold uppercase text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="p-4">Sort</th>
                      <th className="p-4">Category Name</th>
                      <th className="p-4">Description</th>
                      <th className="p-4">Items Count</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {categories.map((cat) => {
                      const count = menuItems.filter((i) => i.category_id === cat.id).length;
                      return (
                        <tr key={cat.id} className="hover:bg-slate-900/40 transition">
                          <td className="p-4 font-mono text-slate-500 font-bold">#{cat.sort_order}</td>
                          <td className="p-4 font-extrabold text-white">{cat.name}</td>
                          <td className="p-4 text-slate-400 max-w-xs truncate">{cat.description || '—'}</td>
                          <td className="p-4 font-bold text-slate-300">{count} items</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                cat.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {cat.is_active ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingCategory(cat);
                                  setIsCategoryModalOpen(true);
                                }}
                                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                                className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-lg transition cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TABLES & PRINTABLE QR SHEET */}
        {/* ========================================================================= */}
        {activeTab === 'tables' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-white">Table & QR Code Management</h2>
                <p className="text-xs text-slate-400">
                  {tables.length} Active Tables • Unique unguessable QR tokens • Instant dine-in routing
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsQrSheetOpen(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-indigo-600/20 transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Table QR Cards (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTableModalOpen(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Table</span>
                </button>
              </div>
            </div>

            {/* Tables Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => {
                const qrUrl = `/r/${restaurant.slug}/t/${table.qr_token}`;
                return (
                  <div
                    key={table.id}
                    className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-black text-white">Table {table.table_number}</h3>
                        <p className="text-xs text-slate-400 font-semibold">{table.section || 'Main Dining'}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-slate-900 text-slate-300 border border-slate-800">
                        Seats {table.capacity}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>QR Token:</span>
                        <span className="font-mono text-slate-300">{table.qr_token.slice(0, 10)}...</span>
                      </div>
                      <div className="flex justify-between text-slate-400 text-[11px]">
                        <span>Direct Link:</span>
                        <Link
                          href={qrUrl}
                          target="_blank"
                          className="text-indigo-400 hover:underline font-semibold"
                        >
                          Open Menu ↗
                        </Link>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          const fullUrl = `${window.location.origin}${qrUrl}`;
                          navigator.clipboard.writeText(fullUrl);
                          showToast(`Table ${table.table_number} URL copied!`);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTable(table.id, table.table_number)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition cursor-pointer"
                        title="Delete table"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: OFFERS & PROMOTIONS */}
        {/* ========================================================================= */}
        {activeTab === 'offers' && (
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-white">Promotions & Discount Coupons</h2>
                <p className="text-xs text-slate-400">
                  Configure flat discounts, percentage caps, happy-hour windows, and category offers
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditingOffer(null);
                  setIsOfferModalOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Offer / Coupon</span>
              </button>
            </div>

            {/* Offers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <div
                  key={offer.id}
                  className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-mono font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {offer.code}
                        </span>
                        <h3 className="font-extrabold text-sm text-white pt-2">{offer.title}</h3>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          offer.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {offer.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {offer.description && (
                      <p className="text-xs text-slate-400 mt-2">{offer.description}</p>
                    )}

                    <div className="mt-3 p-3 bg-slate-900 rounded-xl space-y-1 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Discount:</span>
                        <span className="font-bold text-white">
                          {offer.discount_type === 'percentage'
                            ? `${offer.discount_value}% Off`
                            : `₹${offer.discount_value} Flat Off`}
                        </span>
                      </div>
                      {offer.max_discount_cap && (
                        <div className="flex justify-between text-slate-400">
                          <span>Max Cap:</span>
                          <span className="text-slate-300">₹{offer.max_discount_cap}</span>
                        </div>
                      )}
                      {offer.min_bill_amount > 0 && (
                        <div className="flex justify-between text-slate-400">
                          <span>Min Bill:</span>
                          <span className="text-slate-300">₹{offer.min_bill_amount}</span>
                        </div>
                      )}
                      {offer.happy_hour_start && offer.happy_hour_end && (
                        <div className="flex justify-between text-slate-400">
                          <span>Happy Hours:</span>
                          <span className="text-amber-400 font-semibold">
                            {offer.happy_hour_start} - {offer.happy_hour_end} IST
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingOffer(offer);
                        setIsOfferModalOpen(true);
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOffer(offer.id, offer.code)}
                      className="p-1.5 bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 rounded-lg transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SETTINGS, TAXES & STAFF */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-4xl mx-auto space-y-8">
            <form onSubmit={handleSaveSettings} className="space-y-6">
              {/* RESTAURANT BRAND & PROFILE */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Restaurant Identity & Brand</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Restaurant Name</label>
                    <input
                      type="text"
                      value={settingsForm.name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Tagline</label>
                    <input
                      type="text"
                      value={settingsForm.tagline || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
                      placeholder="e.g. Authentic Himalayan Brews & Bites"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="font-bold text-slate-300 block mb-1">Address & City</label>
                    <input
                      type="text"
                      value={settingsForm.address || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                      placeholder="Full cafe street address"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Brand Color Picker */}
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Brand Theme Color</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settingsForm.brand_color || '#ea580c'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, brand_color: e.target.value })}
                        className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settingsForm.brand_color}
                        onChange={(e) => setSettingsForm({ ...settingsForm, brand_color: e.target.value })}
                        className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono text-xs uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* TAXES & BILLING ENGINE CONFIG */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>GST, Taxes & Service Charge (Billing Engine)</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">GSTIN Number</label>
                    <input
                      type="text"
                      value={settingsForm.gstin || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, gstin: e.target.value.toUpperCase() })}
                      placeholder="e.g. 19AAAAA0000A1Z5"
                      maxLength={15}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono uppercase focus:outline-none focus:border-emerald-500"
                    />
                    <span className="text-[10px] text-slate-500">Printed on all customer invoices</span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Default Food GST Rate (%)</label>
                    <select
                      value={settingsForm.default_tax_rate}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, default_tax_rate: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value={0}>0% (Exempt)</option>
                      <option value={5}>5% (Standard Restaurant Rate)</option>
                      <option value={12}>12% (Packaged / Bakery items)</option>
                      <option value={18}>18% (Beverages / Special)</option>
                    </select>
                  </div>

                  {/* Tax Inclusive vs Exclusive Switch */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-200 block">Menu Prices Inclusive of GST</span>
                      <p className="text-[11px] text-slate-400">
                        {settingsForm.is_tax_inclusive
                          ? 'Prices shown to customers include GST (MRP)'
                          : 'GST is added on top of menu prices'}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settingsForm.is_tax_inclusive}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, is_tax_inclusive: e.target.checked })
                      }
                      className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer"
                    />
                  </div>

                  {/* Service Charge Switch & Rate */}
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-200 block">Enable Service Charge</span>
                        <p className="text-[11px] text-slate-400">Optional staff tip percentage</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settingsForm.is_service_charge_enabled}
                        onChange={(e) =>
                          setSettingsForm({
                            ...settingsForm,
                            is_service_charge_enabled: e.target.checked,
                          })
                        }
                        className="w-5 h-5 rounded-md accent-indigo-600 cursor-pointer"
                      />
                    </div>

                    {settingsForm.is_service_charge_enabled && (
                      <div className="pt-2 flex items-center gap-2">
                        <span className="text-slate-400 text-xs">Rate:</span>
                        <input
                          type="number"
                          value={settingsForm.service_charge_rate}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              service_charge_rate: Number(e.target.value),
                            })
                          }
                          className="w-20 bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-white text-xs font-bold"
                        />
                        <span className="text-slate-400 text-xs">%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* UPI PAYMENT SETTINGS */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                  <QrCode className="w-4 h-4 text-amber-400" />
                  <span>UPI Payment Details</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Restaurant UPI VPA / ID</label>
                    <input
                      type="text"
                      value={settingsForm.upi_id}
                      onChange={(e) => setSettingsForm({ ...settingsForm, upi_id: e.target.value })}
                      placeholder="cafe.darjeeling@okaxis"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                      required
                    />
                    <span className="text-[10px] text-slate-500">
                      Destination UPI handle for customer payments
                    </span>
                  </div>

                  <div>
                    <label className="font-bold text-slate-300 block mb-1">Payee Business Name</label>
                    <input
                      type="text"
                      value={settingsForm.upi_name}
                      onChange={(e) => setSettingsForm({ ...settingsForm, upi_name: e.target.value })}
                      placeholder="Darjeeling Chai & Cafe"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* AUTOMATED PAYMENT GATEWAY CONFIG (RAZORPAY / CASHFREE) */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Zap className="w-4 h-4 text-emerald-400" />
                    <span>Automated Payment Gateway (Razorpay / Cashfree)</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-semibold">Enable Gateway</span>
                    <input
                      type="checkbox"
                      checked={Boolean(settingsForm.is_gateway_enabled)}
                      onChange={(e) =>
                        setSettingsForm({ ...settingsForm, is_gateway_enabled: e.target.checked })
                      }
                      className="w-5 h-5 rounded-md accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  Enable automated UPI & Card payments with instant webhook confirmation. When enabled,
                  customers can pay via auto-confirming gateway QR and tables settle instantly.
                </p>

                {Boolean(settingsForm.is_gateway_enabled) && (
                  <div className="space-y-4 pt-2 border-t border-slate-900">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="font-bold text-slate-300 block mb-1">
                          Gateway Provider
                        </label>
                        <select
                          value={settingsForm.gateway_provider || 'razorpay'}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              gateway_provider: e.target.value as 'razorpay' | 'cashfree',
                            })
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white focus:outline-none focus:border-emerald-500 font-bold"
                        >
                          <option value="razorpay">Razorpay (India)</option>
                          <option value="cashfree">Cashfree Payments (India)</option>
                        </select>
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Uses official Indian payment gateway with dynamic UPI QR & webhooks
                        </span>
                      </div>

                      <div>
                        <label className="font-bold text-slate-300 block mb-1">
                          {settingsForm.gateway_provider === 'cashfree' ? 'Cashfree App ID' : 'Razorpay Key ID'}
                        </label>
                        <input
                          type="text"
                          value={settingsForm.gateway_key_id || ''}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, gateway_key_id: e.target.value })
                          }
                          placeholder={
                            settingsForm.gateway_provider === 'cashfree'
                              ? 'e.g. CF1234567890...'
                              : 'rzp_test_... or rzp_live_...'
                          }
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="font-bold text-slate-300 block mb-1">
                          {settingsForm.gateway_provider === 'cashfree'
                            ? 'Cashfree Secret Key'
                            : 'Razorpay Key Secret'}
                        </label>
                        <input
                          type="password"
                          value={settingsForm.gateway_key_secret || ''}
                          onChange={(e) =>
                            setSettingsForm({ ...settingsForm, gateway_key_secret: e.target.value })
                          }
                          placeholder="••••••••••••••••••••"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Kept confidential; never exposed to customer clients
                        </span>
                      </div>

                      <div>
                        <label className="font-bold text-slate-300 block mb-1">
                          Webhook Secret
                        </label>
                        <input
                          type="password"
                          value={settingsForm.gateway_webhook_secret || ''}
                          onChange={(e) =>
                            setSettingsForm({
                              ...settingsForm,
                              gateway_webhook_secret: e.target.value,
                            })
                          }
                          placeholder="Secret configured in gateway webhook settings"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                        />
                        <span className="text-[10px] text-slate-500 mt-1 block">
                          Validates cryptographic HMAC-SHA256 signature on incoming callbacks
                        </span>
                      </div>
                    </div>

                    {/* Webhook Endpoint Info */}
                    <div className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-1.5 text-xs">
                      <div className="font-bold text-slate-300 flex items-center justify-between">
                        <span>Webhook Endpoint URL for Gateway Dashboard:</span>
                        <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                          POST
                        </span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded-xl font-mono text-[11px] text-emerald-400 break-all select-all border border-slate-800">
                        {typeof window !== 'undefined'
                          ? `${window.location.origin}/api/webhooks/${settingsForm.gateway_provider || 'razorpay'}`
                          : `https://tableqr.in/api/webhooks/${settingsForm.gateway_provider || 'razorpay'}`}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Subscribe to events:{' '}
                        <code className="text-slate-400 font-mono">
                          {settingsForm.gateway_provider === 'cashfree'
                            ? 'PAYMENT_SUCCESS_WEBHOOK, ORDER_PAID'
                            : 'order.paid, payment.captured'}
                        </code>
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <button
                type="submit"
                disabled={isSavingSettings}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/30 transition cursor-pointer"
              >
                {isSavingSettings ? 'Saving Settings...' : 'Save Changes'}
              </button>
            </form>

            {/* STAFF MANAGEMENT SECTION */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Staff Accounts & Roles</span>
                </h3>

                {currentStaff.role === 'owner' && (
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Staff</span>
                  </button>
                )}
              </div>

              <div className="divide-y divide-slate-800/80 text-xs">
                {staffList.map((s) => (
                  <div key={s.id} className="py-3 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white block">{s.name}</span>
                      <span className="text-[11px] text-slate-400 capitalize">
                        Role: <span className="font-semibold text-slate-300">{s.role}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          s.is_active ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-500'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* PRINTABLE QR SHEET MODAL */}
      {isQrSheetOpen && (
        <PrintableQrSheet
          restaurant={restaurant}
          tables={tables}
          onClose={() => setIsQrSheetOpen(false)}
        />
      )}

      {/* MODAL: ADD / EDIT MENU ITEM */}
      {isItemModalOpen && (
        <ItemModal
          item={editingItem}
          categories={categories}
          onClose={() => setIsItemModalOpen(false)}
          onSuccess={() => {
            setIsItemModalOpen(false);
            loadAdminData();
            showToast(editingItem ? 'Item updated!' : 'Item created!');
          }}
        />
      )}

      {/* MODAL: ADD / EDIT CATEGORY */}
      {isCategoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={() => {
            setIsCategoryModalOpen(false);
            loadAdminData();
            showToast(editingCategory ? 'Category updated!' : 'Category created!');
          }}
        />
      )}

      {/* MODAL: ADD TABLE */}
      {isTableModalOpen && (
        <TableModal
          onClose={() => setIsTableModalOpen(false)}
          onSuccess={() => {
            setIsTableModalOpen(false);
            loadAdminData();
            showToast('Table created!');
          }}
        />
      )}

      {/* MODAL: ADD / EDIT OFFER */}
      {isOfferModalOpen && (
        <OfferModal
          offer={editingOffer}
          categories={categories}
          onClose={() => setIsOfferModalOpen(false)}
          onSuccess={() => {
            setIsOfferModalOpen(false);
            loadAdminData();
            showToast(editingOffer ? 'Offer updated!' : 'Offer created!');
          }}
        />
      )}

      {/* MODAL: ADD STAFF */}
      {isStaffModalOpen && (
        <StaffModal
          onClose={() => setIsStaffModalOpen(false)}
          onSuccess={() => {
            setIsStaffModalOpen(false);
            loadAdminData();
            showToast('Staff member added!');
          }}
        />
      )}
    </div>
  );
}

// =========================================================================
// MODAL SUB-COMPONENTS
// =========================================================================

function ItemModal({
  item,
  categories,
  onClose,
  onSuccess,
}: {
  item: AdminMenuItem | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [categoryId, setCategoryId] = useState(item?.category_id || categories[0]?.id || '');
  const [description, setDescription] = useState(item?.description || '');
  const [price, setPrice] = useState<number | ''>(item ? Number(item.price) : '');
  const [taxRate, setTaxRate] = useState<number>(item?.tax_rate ?? 5);
  const [isVeg, setIsVeg] = useState<boolean>(item?.is_veg ?? true);
  const [isBestseller, setIsBestseller] = useState<boolean>(item?.is_bestseller ?? false);
  const [isAvailable, setIsAvailable] = useState<boolean>(item?.is_available ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || price === '') return;
    setIsSaving(true);
    setError(null);

    const payload = {
      name,
      categoryId,
      description: description || null,
      price: Number(price),
      taxRate: Number(taxRate),
      isVeg,
      isBestseller,
      isAvailable,
    };

    try {
      const url = item ? `/api/admin/menu-items/${item.id}` : '/api/admin/menu-items';
      const method = item ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save item');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Item save error';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">
            {item ? `Edit "${item.name}"` : 'New Menu Item'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Darjeeling Masala Chai"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Base Price (₹)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value ? Number(e.target.value) : '')}
                placeholder="150"
                min={0}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Taste profile, ingredients, portion notes..."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">GST Tax Rate (%)</label>
              <select
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value={0}>0%</option>
                <option value={5}>5% (Standard Food)</option>
                <option value={12}>12%</option>
                <option value={18}>18% (Beverages)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Dietary Marker</label>
              <select
                value={isVeg ? 'veg' : 'non_veg'}
                onChange={(e) => setIsVeg(e.target.value === 'veg')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="veg">🟢 Vegetarian</option>
                <option value="non_veg">🔴 Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
              <input
                type="checkbox"
                checked={isBestseller}
                onChange={(e) => setIsBestseller(e.target.checked)}
                className="w-4 h-4 rounded-md accent-amber-500"
              />
              <span>Mark as Bestseller ⭐</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-300">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="w-4 h-4 rounded-md accent-emerald-500"
              />
              <span>In Stock / Available</span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold cursor-pointer"
            >
              {isSaving ? 'Saving...' : 'Save Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CategoryModal({
  category,
  onClose,
  onSuccess,
}: {
  category: AdminCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(category?.name || '');
  const [description, setDescription] = useState(category?.description || '');
  const [sortOrder, setSortOrder] = useState<number>(category?.sort_order ?? 0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    setError(null);

    const payload = {
      name,
      description: description || null,
      sortOrder: Number(sortOrder),
    };

    try {
      const url = category ? `/api/admin/categories/${category.id}` : '/api/admin/categories';
      const method = category ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save category');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Category save error';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">
            {category ? `Edit "${category.name}"` : 'New Category'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Category Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Signature Chais"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Description (Optional)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description displayed on customer menu"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Display Sort Order</label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TableModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [tableNumber, setTableNumber] = useState('');
  const [section, setSection] = useState('Main Dining');
  const [capacity, setCapacity] = useState(4);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableNumber.trim()) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber: tableNumber.trim(),
          section,
          capacity: Number(capacity),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create table');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Table creation error';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">Add New Table</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Table Number / Label</label>
            <input
              type="text"
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              placeholder="e.g. 13 or P-1"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Section</label>
            <input
              type="text"
              value={section}
              onChange={(e) => setSection(e.target.value)}
              placeholder="e.g. Indoor, Patio, Rooftop"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Seating Capacity</label>
            <input
              type="number"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
              min={1}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
            >
              {isSaving ? 'Creating...' : 'Create Table'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OfferModal({
  offer,
  categories,
  onClose,
  onSuccess,
}: {
  offer: AdminOffer | null;
  categories: AdminCategory[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [code, setCode] = useState(offer?.code || '');
  const [title, setTitle] = useState(offer?.title || '');
  const [description, setDescription] = useState(offer?.description || '');
  const [applicableCategoryId, setApplicableCategoryId] = useState<string | null>(offer?.applicable_category_id || null);
  const [discountType, setDiscountType] = useState<'percentage' | 'flat'>(offer?.discount_type || 'percentage');
  const [discountValue, setDiscountValue] = useState<number | ''>(offer ? Number(offer.discount_value) : 10);
  const [minBillAmount, setMinBillAmount] = useState<number>(offer ? Number(offer.min_bill_amount) : 0);
  const [maxDiscountCap, setMaxDiscountCap] = useState<number | ''>(offer?.max_discount_cap ? Number(offer.max_discount_cap) : '');
  const [happyHourStart, setHappyHourStart] = useState(offer?.happy_hour_start || '');
  const [happyHourEnd, setHappyHourEnd] = useState(offer?.happy_hour_end || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || !title || discountValue === '') return;
    setIsSaving(true);
    setError(null);

    const payload = {
      code: code.trim().toUpperCase(),
      title,
      description: description || null,
      discountType,
      discountValue: Number(discountValue),
      minBillAmount: Number(minBillAmount),
      maxDiscountCap: maxDiscountCap ? Number(maxDiscountCap) : null,
      happyHourStart: happyHourStart || null,
      happyHourEnd: happyHourEnd || null,
      applicableCategoryId: applicableCategoryId || null,
    };

    try {
      const url = offer ? `/api/admin/offers/${offer.id}` : '/api/admin/offers';
      const method = offer ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save offer');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Offer save error';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">
            {offer ? `Edit Offer "${offer.code}"` : 'Create New Offer / Coupon'}
          </h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Coupon Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. WELCOME10"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Offer Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. 10% Off First Visit"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Valid on lunch orders above ₹500"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Applicable Category</label>
              <select
                value={applicableCategoryId || ''}
                onChange={(e) => setApplicableCategoryId(e.target.value || null)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="">All Categories (Entire Menu)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Discount Type</label>
              <select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'flat')}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="flat">Flat Amount (₹)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">
                Discount Value {discountType === 'percentage' ? '(%)' : '(₹)'}
              </label>
              <input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value ? Number(e.target.value) : '')}
                min={1}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Minimum Bill Amount (₹)</label>
              <input
                type="number"
                value={minBillAmount}
                onChange={(e) => setMinBillAmount(Number(e.target.value))}
                min={0}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Max Discount Cap (₹)</label>
              <input
                type="number"
                value={maxDiscountCap}
                onChange={(e) => setMaxDiscountCap(e.target.value ? Number(e.target.value) : '')}
                min={1}
                placeholder="No limit"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-slate-300 block mb-1">Happy Hour Start (HH:MM)</label>
              <input
                type="time"
                value={happyHourStart}
                onChange={(e) => setHappyHourStart(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="font-bold text-slate-300 block mb-1">Happy Hour End (HH:MM)</label>
              <input
                type="time"
                value={happyHourEnd}
                onChange={(e) => setHappyHourEnd(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
            >
              {isSaving ? 'Saving...' : 'Save Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StaffModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'manager' | 'cashier' | 'kitchen'>('kitchen');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;
    setIsSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add staff');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Staff creation error';
      setError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-black text-white">Add Staff Member</h3>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-slate-300 block mb-1">Staff Member Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ramesh Thapa"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Email (Login identifier)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ramesh@tableqr.in"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="font-bold text-slate-300 block mb-1">Staff Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'manager' | 'cashier' | 'kitchen')}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
            >
              <option value="kitchen">Kitchen Staff (Orders & KOT)</option>
              <option value="cashier">Cashier (Billing & Settle)</option>
              <option value="manager">Manager (All except staff)</option>
            </select>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl text-[11px] text-slate-400">
            Initial temporary password will be set to <span className="font-mono text-white">TableQR@2026</span>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold"
            >
              {isSaving ? 'Adding...' : 'Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
