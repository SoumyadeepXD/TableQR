/**
 * TableQR Pure Billing Engine
 * 
 * Rules:
 * - Pure, unit-tested module used by server and client for previews.
 * - Never trust prices or totals from the client.
 * - Per-item GST rate (0, 5, 12, 18, 28%), default 5%.
 * - Supports tax inclusive (MRP) and tax exclusive modes.
 * - Splits GST into equal CGST and SGST with slab-wise breakdown.
 * - Symmetrical round-off to nearest rupee.
 * - Offers engine with min bill, max cap, happy hours, and category filters.
 */

export interface BillingItemAddon {
  name: string;
  price: number;
}

export interface BillingItemInput {
  menuItemId: string;
  name: string;
  categoryId?: string | null;
  unitPrice: number; // Base or variant price
  quantity: number;
  taxRate: number; // e.g. 5 for 5%
  addons?: BillingItemAddon[];
}

export interface BillingSettingsInput {
  isTaxInclusive: boolean;
  defaultTaxRate?: number;
  isServiceChargeEnabled: boolean;
  serviceChargeRate: number; // e.g. 5 for 5%
}

export interface BillingOfferInput {
  id?: string;
  code?: string | null;
  title?: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  minBillAmount?: number;
  maxDiscountCap?: number | null;
  applicableCategoryId?: string | null;
  happyHourStart?: string | null; // e.g. "14:00"
  happyHourEnd?: string | null;   // e.g. "17:00"
  daysOfWeek?: number[] | null;   // 0 = Sunday, 1 = Monday ... 6 = Saturday
  currentTime?: Date;             // Optional override for testing
}

export interface BillingTaxSlabBreakdown {
  slab: number; // e.g. 5
  taxableAmount: number;
  cgst: number;
  sgst: number;
  totalTax: number;
}

export interface BillingResult {
  itemsSubtotal: number;       // Gross items total
  eligibleDiscountSubtotal: number;
  discountAmount: number;
  discountDetails?: {
    code?: string;
    title: string;
    reason?: string;
  } | null;
  netTaxableSubtotal: number;  // Subtotal after discount
  serviceChargeAmount: number;
  serviceChargeRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalTax: number;
  taxBreakdownBySlab: BillingTaxSlabBreakdown[];
  totalBeforeRoundOff: number;
  roundOffAmount: number;
  totalAmount: number;         // Final payable rounded total
  isTaxInclusive: boolean;
}

/**
 * Validates whether an offer is active for the current time window and day in Asia/Kolkata
 */
export function isOfferTimeValid(
  offer: BillingOfferInput,
  currentTime: Date = new Date()
): { isValid: boolean; reason?: string } {
  // Format current date and time in IST (Asia/Kolkata)
  const istFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    weekday: 'short',
  });

  const parts = istFormatter.formatToParts(currentTime);
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const currentMinutesOfDay = hour * 60 + minute;

  // Day of week in IST: convert Date using IST
  const istDateString = currentTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istDateString);
  const dayOfWeek = istDate.getDay(); // 0 is Sunday

  // Check days of week
  if (offer.daysOfWeek && offer.daysOfWeek.length > 0) {
    if (!offer.daysOfWeek.includes(dayOfWeek)) {
      return { isValid: false, reason: 'Offer is not valid on this day of the week' };
    }
  }

  // Check happy hour time window
  if (offer.happyHourStart && offer.happyHourEnd) {
    const [startH, startM] = offer.happyHourStart.split(':').map((s) => parseInt(s, 10));
    const [endH, endM] = offer.happyHourEnd.split(':').map((s) => parseInt(s, 10));

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (currentMinutesOfDay < startMinutes || currentMinutesOfDay > endMinutes) {
      return {
        isValid: false,
        reason: `Happy Hour valid only between ${offer.happyHourStart} and ${offer.happyHourEnd} IST`,
      };
    }
  }

  return { isValid: true };
}

/**
 * Pure calculation function for restaurant orders and bills
 */
export function calculateBill(params: {
  items: BillingItemInput[];
  settings: BillingSettingsInput;
  offer?: BillingOfferInput | null;
  currentTime?: Date;
}): BillingResult {
  const { items, settings, offer, currentTime = new Date() } = params;

  // 1. Compute line totals per item
  interface InternalLineItem {
    menuItemId: string;
    categoryId?: string | null;
    rawLineTotal: number;
    taxRate: number;
    isEligibleForOffer: boolean;
  }

  let grossItemsTotal = 0;
  const lineItems: InternalLineItem[] = items.map((item) => {
    const addonsTotal = (item.addons || []).reduce((acc, a) => acc + (a.price || 0), 0);
    const unitPriceWithAddons = item.unitPrice + addonsTotal;
    const rawLineTotal = Number((unitPriceWithAddons * item.quantity).toFixed(2));
    grossItemsTotal += rawLineTotal;

    const isEligible = !offer?.applicableCategoryId || item.categoryId === offer.applicableCategoryId;

    return {
      menuItemId: item.menuItemId,
      categoryId: item.categoryId,
      rawLineTotal,
      taxRate: item.taxRate,
      isEligibleForOffer: isEligible,
    };
  });

  grossItemsTotal = Number(grossItemsTotal.toFixed(2));

  // 2. Evaluate Offer / Discount
  let discountAmount = 0;
  let eligibleDiscountSubtotal = 0;
  let discountDetails: BillingResult['discountDetails'] = null;

  if (offer && grossItemsTotal > 0) {
    // Check minimum bill amount requirement
    const minBill = offer.minBillAmount || 0;
    const timeValidity = isOfferTimeValid(offer, offer.currentTime || currentTime);

    if (!timeValidity.isValid) {
      discountDetails = {
        code: offer.code || undefined,
        title: offer.title || 'Offer',
        reason: timeValidity.reason,
      };
    } else if (grossItemsTotal < minBill) {
      discountDetails = {
        code: offer.code || undefined,
        title: offer.title || 'Offer',
        reason: `Minimum order of ₹${minBill} required (Current: ₹${grossItemsTotal})`,
      };
    } else {
      // Calculate eligible portion
      eligibleDiscountSubtotal = lineItems
        .filter((l) => l.isEligibleForOffer)
        .reduce((sum, l) => sum + l.rawLineTotal, 0);

      eligibleDiscountSubtotal = Number(eligibleDiscountSubtotal.toFixed(2));

      if (eligibleDiscountSubtotal > 0) {
        if (offer.discountType === 'percentage') {
          let rawDiscount = (eligibleDiscountSubtotal * offer.discountValue) / 100;
          if (offer.maxDiscountCap && offer.maxDiscountCap > 0) {
            rawDiscount = Math.min(rawDiscount, offer.maxDiscountCap);
          }
          discountAmount = Number(rawDiscount.toFixed(2));
        } else if (offer.discountType === 'flat') {
          discountAmount = Math.min(offer.discountValue, eligibleDiscountSubtotal);
          discountAmount = Number(discountAmount.toFixed(2));
        }

        discountDetails = {
          code: offer.code || undefined,
          title: offer.title || 'Discount Applied',
        };
      }
    }
  }

  // 3. Distribute discount proportionally across eligible line items
  // This ensures multi-slab GST is accurately levied on the net discounted price
  const discountRatio =
    eligibleDiscountSubtotal > 0 ? discountAmount / eligibleDiscountSubtotal : 0;

  const slabMap = new Map<number, { taxableAmount: number; totalTax: number }>();

  let totalTax = 0;
  let totalNetTaxableBase = 0;

  for (const item of lineItems) {
    const itemDiscount = item.isEligibleForOffer ? item.rawLineTotal * discountRatio : 0;
    const netItemPrice = Math.max(0, item.rawLineTotal - itemDiscount);

    let itemTaxable = 0;
    let itemTax = 0;

    if (settings.isTaxInclusive) {
      // Item price includes GST: Base = Gross / (1 + Rate / 100)
      itemTaxable = netItemPrice / (1 + item.taxRate / 100);
      itemTax = netItemPrice - itemTaxable;
    } else {
      // Tax exclusive: Tax = Base * (Rate / 100)
      itemTaxable = netItemPrice;
      itemTax = (netItemPrice * item.taxRate) / 100;
    }

    itemTaxable = Number(itemTaxable.toFixed(2));
    itemTax = Number(itemTax.toFixed(2));

    totalNetTaxableBase += itemTaxable;
    totalTax += itemTax;

    const existingSlab = slabMap.get(item.taxRate) || { taxableAmount: 0, totalTax: 0 };
    existingSlab.taxableAmount = Number((existingSlab.taxableAmount + itemTaxable).toFixed(2));
    existingSlab.totalTax = Number((existingSlab.totalTax + itemTax).toFixed(2));
    slabMap.set(item.taxRate, existingSlab);
  }

  totalNetTaxableBase = Number(totalNetTaxableBase.toFixed(2));
  totalTax = Number(totalTax.toFixed(2));

  // Split GST equally into CGST & SGST
  const cgstAmount = Number((totalTax / 2).toFixed(2));
  const sgstAmount = Number((totalTax - cgstAmount).toFixed(2)); // Ensures penny-balance

  // Format slab breakdown list
  const taxBreakdownBySlab: BillingTaxSlabBreakdown[] = Array.from(slabMap.entries())
    .map(([slab, data]) => {
      const slabCgst = Number((data.totalTax / 2).toFixed(2));
      const slabSgst = Number((data.totalTax - slabCgst).toFixed(2));
      return {
        slab,
        taxableAmount: data.taxableAmount,
        cgst: slabCgst,
        sgst: slabSgst,
        totalTax: data.totalTax,
      };
    })
    .sort((a, b) => a.slab - b.slab);

  // 4. Calculate Service Charge (optional)
  let serviceChargeAmount = 0;
  if (settings.isServiceChargeEnabled && settings.serviceChargeRate > 0) {
    const serviceChargeBase = Math.max(0, grossItemsTotal - discountAmount);
    serviceChargeAmount = Number(
      ((serviceChargeBase * settings.serviceChargeRate) / 100).toFixed(2)
    );
  }

  // 5. Compute Final Total before Round-off
  let totalBeforeRoundOff = 0;
  if (settings.isTaxInclusive) {
    // In tax inclusive, customer pays (Gross - Discount) + Service Charge
    totalBeforeRoundOff = Math.max(0, grossItemsTotal - discountAmount) + serviceChargeAmount;
  } else {
    // In tax exclusive, customer pays (Gross - Discount) + Tax + Service Charge
    totalBeforeRoundOff = Math.max(0, grossItemsTotal - discountAmount) + totalTax + serviceChargeAmount;
  }
  totalBeforeRoundOff = Number(totalBeforeRoundOff.toFixed(2));

  // 6. Round off to the nearest rupee
  const totalAmount = Math.round(totalBeforeRoundOff);
  const roundOffAmount = Number((totalAmount - totalBeforeRoundOff).toFixed(2));

  return {
    itemsSubtotal: grossItemsTotal,
    eligibleDiscountSubtotal,
    discountAmount,
    discountDetails,
    netTaxableSubtotal: totalNetTaxableBase,
    serviceChargeAmount,
    serviceChargeRate: settings.serviceChargeRate || 0,
    cgstAmount,
    sgstAmount,
    totalTax,
    taxBreakdownBySlab,
    totalBeforeRoundOff,
    roundOffAmount,
    totalAmount,
    isTaxInclusive: settings.isTaxInclusive,
  };
}
