'use client';

import React, { useState } from 'react';
import { X, Plus, Minus, Check, AlertCircle } from 'lucide-react';
import { formatINR } from '@/lib/formatters';
import type { CartItem, CartItemAddon, CartItemVariant } from '@/lib/types/cart';
import { useTranslation } from '@/lib/i18n/context';

export interface MenuItemWithDetails {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_veg: boolean;
  is_available: boolean;
  tax_rate: number;
  prep_time_minutes: number;
  is_bestseller: boolean;
  item_variants: Array<{
    id: string;
    name: string;
    price: number;
    is_available: boolean;
    sort_order: number;
  }>;
  addon_groups: Array<{
    id: string;
    name: string;
    min_selection: number;
    max_selection: number;
    is_required: boolean;
    addon_items: Array<{
      id: string;
      name: string;
      price: number;
      is_available: boolean;
      sort_order: number;
    }>;
  }>;
}

interface ItemCustomizerFormProps {
  item: MenuItemWithDetails;
  onClose: () => void;
  onAddToCart: (configuredItem: CartItem) => void;
}

function ItemCustomizerForm({
  item,
  onClose,
  onAddToCart,
}: ItemCustomizerFormProps) {
  const { t } = useTranslation();
  const defaultVariant: CartItemVariant | null =
    item.item_variants && item.item_variants.length > 0
      ? {
          id: item.item_variants[0].id,
          name: item.item_variants[0].name,
          price: Number(item.item_variants[0].price),
        }
      : null;

  const [selectedVariant, setSelectedVariant] = useState<CartItemVariant | null>(defaultVariant);
  const [selectedAddons, setSelectedAddons] = useState<CartItemAddon[]>([]);
  const [cookingRequest, setCookingRequest] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentUnitPrice = selectedVariant ? selectedVariant.price : Number(item.price);
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);
  const unitLineTotal = currentUnitPrice + addonsTotal;
  const grandLineTotal = unitLineTotal * quantity;

  const handleToggleAddon = (
    group: MenuItemWithDetails['addon_groups'][0],
    addonItem: MenuItemWithDetails['addon_groups'][0]['addon_items'][0]
  ) => {
    setValidationError(null);
    const isAlreadySelected = selectedAddons.some((a) => a.addonItemId === addonItem.id);

    if (isAlreadySelected) {
      setSelectedAddons((prev) => prev.filter((a) => a.addonItemId !== addonItem.id));
    } else {
      // Check group max selection
      const groupAddonIds = new Set(group.addon_items.map((i) => i.id));
      const currentSelectedInGroup = selectedAddons.filter((a) =>
        a.addonItemId && groupAddonIds.has(a.addonItemId)
      );

      if (group.max_selection === 1) {
        // Single select (radio behavior): replace
        const otherAddons = selectedAddons.filter(
          (a) => !a.addonItemId || !groupAddonIds.has(a.addonItemId)
        );
        setSelectedAddons([
          ...otherAddons,
          {
            addonItemId: addonItem.id,
            name: addonItem.name,
            price: Number(addonItem.price),
          },
        ]);
      } else if (currentSelectedInGroup.length < group.max_selection) {
        // Multi select within limit
        setSelectedAddons((prev) => [
          ...prev,
          {
            addonItemId: addonItem.id,
            name: addonItem.name,
            price: Number(addonItem.price),
          },
        ]);
      } else {
        setValidationError(`You can select at most ${group.max_selection} option(s) for "${group.name}".`);
      }
    }
  };

  const handleAdd = () => {
    // Validate required addon groups
    for (const group of item.addon_groups) {
      if (group.is_required || group.min_selection > 0) {
        const groupAddonIds = new Set(group.addon_items.map((i) => i.id));
        const selectedCount = selectedAddons.filter(
          (a) => a.addonItemId && groupAddonIds.has(a.addonItemId)
        ).length;

        const min = Math.max(group.min_selection, group.is_required ? 1 : 0);
        if (selectedCount < min) {
          setValidationError(`Please select at least ${min} option(s) for "${group.name}".`);
          return;
        }
      }
    }

    const cartItemId = `${item.id}_${selectedVariant?.id || 'base'}_${selectedAddons
      .map((a) => a.addonItemId)
      .sort()
      .join('-')}_${encodeURIComponent(cookingRequest.trim())}`;

    onAddToCart({
      cartItemId,
      menuItemId: item.id,
      name: item.name,
      basePrice: Number(item.price),
      unitPrice: currentUnitPrice,
      quantity,
      isVeg: item.is_veg,
      taxRate: Number(item.tax_rate),
      imageUrl: item.image_url,
      variant: selectedVariant,
      addons: selectedAddons,
      cookingRequest: cookingRequest.trim() || undefined,
      lineTotal: grandLineTotal,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between">
          <div className="pr-4">
            <div className="flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${
                  item.is_veg ? 'border-emerald-600' : 'border-rose-600'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    item.is_veg ? 'bg-emerald-600' : 'bg-rose-600'
                  }`}
                />
              </span>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">{item.name}</h2>
            </div>
            {item.description && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Customization Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Variants */}
          {item.item_variants && item.item_variants.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Select Size / Portion <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] text-slate-400">Choose 1</span>
              </div>
              <div className="space-y-2">
                {item.item_variants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={!variant.is_available}
                      onClick={() =>
                        setSelectedVariant({
                          id: variant.id,
                          name: variant.name,
                          price: Number(variant.price),
                        })
                      }
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isSelected
                          ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-semibold shadow-xs'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                      } ${!variant.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-amber-600' : 'border-slate-300'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                        </div>
                        <span className="text-sm">{variant.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{formatINR(Number(variant.price))}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add-on Groups */}
          {item.addon_groups &&
            item.addon_groups.map((group) => (
              <div key={group.id} className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                    {group.name}{' '}
                    {group.is_required && <span className="text-rose-500">*</span>}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {group.max_selection === 1
                      ? 'Choose 1'
                      : `Max ${group.max_selection}`}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.addon_items.map((addon) => {
                    const isSelected = selectedAddons.some((a) => a.addonItemId === addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        disabled={!addon.is_available}
                        onClick={() => handleToggleAddon(group, addon)}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                          isSelected
                            ? 'border-amber-600 bg-amber-50/50 text-amber-900 font-semibold shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white text-slate-800'
                        } ${!addon.is_available ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 rounded-md border flex items-center justify-center ${
                              isSelected
                                ? 'bg-amber-600 border-amber-600 text-white'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                          <span className="text-sm">{addon.name}</span>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">
                          {Number(addon.price) === 0 ? 'Free' : `+${formatINR(Number(addon.price))}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

          {/* Free-text Cooking Request */}
          <div className="pt-2 border-t border-slate-100">
            <label
              htmlFor="cooking-request"
              className="block font-bold text-slate-900 text-xs uppercase tracking-wider mb-1"
            >
              Cooking Request (Optional)
            </label>
            <p className="text-xs text-slate-400 mb-2">
              Any special instructions? (e.g. Less spicy, no sugar, extra crispy)
            </p>
            <textarea
              id="cooking-request"
              rows={2}
              maxLength={200}
              value={cookingRequest}
              onChange={(e) => setCookingRequest(e.target.value)}
              placeholder={t('cookingRequestPlaceholder')}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 outline-none resize-none transition"
            />
          </div>
        </div>

        {/* Bottom Bar: Quantity & Add Button */}
        <div className="p-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-2xs">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-40 flex items-center justify-center text-slate-700 transition cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="font-bold text-sm min-w-5 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className="flex-1 py-3 px-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-bold text-sm shadow-md shadow-amber-600/20 flex items-center justify-between transition cursor-pointer"
          >
            <span>{t('addToCart')}</span>
            <span>{formatINR(grandLineTotal)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ItemCustomizerModalProps {
  item: MenuItemWithDetails | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (configuredItem: CartItem) => void;
}

export function ItemCustomizerModal({
  item,
  isOpen,
  onClose,
  onAddToCart,
}: ItemCustomizerModalProps) {
  if (!isOpen || !item) return null;

  return (
    <ItemCustomizerForm
      key={item.id}
      item={item}
      onClose={onClose}
      onAddToCart={onAddToCart}
    />
  );
}
