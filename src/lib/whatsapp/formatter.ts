/**
 * TableQR WhatsApp Bill Formatter & Deep Link Generator
 * 
 * Generates WhatsApp-formatted markdown text receipts with itemized order details,
 * tax breakdown, live payment link, and direct wa.me / api.whatsapp.com deep links.
 */

export interface WhatsAppBillItem {
  name: string;
  quantity: number;
  variantName?: string | null;
  price: number;
  total: number;
}

export interface WhatsAppBillPayload {
  restaurant: {
    name: string;
    tagline?: string | null;
    address?: string | null;
    city?: string | null;
    gstin?: string | null;
    fssaiLicense?: string | null;
    phone?: string | null;
  };
  table: {
    tableNumber: string;
    section?: string | null;
  };
  invoice: {
    invoiceNumber: string;
    date: string;
    subtotal: number;
    discountAmount?: number;
    offerCode?: string | null;
    serviceChargeAmount?: number;
    cgstAmount: number;
    sgstAmount: number;
    roundOffAmount?: number;
    totalAmount: number;
    paymentStatus: string;
    paymentMethod?: string | null;
  };
  items: WhatsAppBillItem[];
  billUrl?: string;
}

/**
 * Normalizes Indian mobile number to 10 digits
 * Handles +91, 91, 0 prefixes, dashes, and spaces
 */
export function cleanIndianPhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return '';
  const digits = rawPhone.replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.substring(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.substring(1);
  }
  return digits;
}

/**
 * Formats an invoice bill into a clean WhatsApp markdown receipt
 */
export function formatWhatsAppBillText(payload: WhatsAppBillPayload): string {
  const { restaurant, table, invoice, items, billUrl } = payload;

  const lines: string[] = [];

  // 1. Restaurant Header
  lines.push(`🍽️ *${restaurant.name.toUpperCase()}*`);
  if (restaurant.tagline) {
    lines.push(`_${restaurant.tagline}_`);
  }
  if (restaurant.address || restaurant.city) {
    lines.push(`📍 ${[restaurant.address, restaurant.city].filter(Boolean).join(', ')}`);
  }
  if (restaurant.gstin) {
    lines.push(`🏛️ GSTIN: *${restaurant.gstin}*`);
  }
  if (restaurant.fssaiLicense) {
    lines.push(`📜 FSSAI: ${restaurant.fssaiLicense}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');

  // 2. Invoice & Table Details
  lines.push(`🧾 *TAX INVOICE #${invoice.invoiceNumber}*`);
  lines.push(`🪑 Table: *T-${table.tableNumber}* ${table.section ? `(${table.section})` : ''}`);
  lines.push(`📅 Date: ${invoice.date}`);

  lines.push('━━━━━━━━━━━━━━━━━━━━');

  // 3. Itemized List
  lines.push('*ORDER ITEMS:*');
  items.forEach((item) => {
    const variantStr = item.variantName ? ` (${item.variantName})` : '';
    lines.push(`• ${item.quantity}x ${item.name}${variantStr} - ₹${item.total.toFixed(2)}`);
  });

  lines.push('━━━━━━━━━━━━━━━━━━━━');

  // 4. Financial Breakdown
  lines.push(`Item Subtotal: ₹${invoice.subtotal.toFixed(2)}`);

  if (invoice.discountAmount && invoice.discountAmount > 0) {
    const codeStr = invoice.offerCode ? ` (${invoice.offerCode})` : '';
    lines.push(`Discount${codeStr}: -₹${invoice.discountAmount.toFixed(2)}`);
  }

  if (invoice.serviceChargeAmount && invoice.serviceChargeAmount > 0) {
    lines.push(`Service Charge: ₹${invoice.serviceChargeAmount.toFixed(2)}`);
  }

  lines.push(`CGST: ₹${invoice.cgstAmount.toFixed(2)}`);
  lines.push(`SGST: ₹${invoice.sgstAmount.toFixed(2)}`);

  if (invoice.roundOffAmount && Math.abs(invoice.roundOffAmount) > 0.001) {
    const sign = invoice.roundOffAmount > 0 ? '+' : '-';
    lines.push(`Round-off: ${sign}₹${Math.abs(invoice.roundOffAmount).toFixed(2)}`);
  }

  lines.push('━━━━━━━━━━━━━━━━━━━━');
  lines.push(`💰 *TOTAL AMOUNT: ₹${invoice.totalAmount.toFixed(2)}*`);

  const isPaid = invoice.paymentStatus.toLowerCase() === 'paid';
  const methodStr = invoice.paymentMethod ? ` via ${invoice.paymentMethod.toUpperCase()}` : '';
  lines.push(isPaid ? `✅ Status: *PAID${methodStr}*` : '⏳ Status: *UNPAID*');

  // 5. Digital Bill URL Link
  if (billUrl) {
    lines.push('━━━━━━━━━━━━━━━━━━━━');
    lines.push('📲 *View & Download Digital Tax Invoice:*');
    lines.push(billUrl);
  }

  lines.push('\nThank you for dining with us! Please visit again. 🙏✨');

  return lines.join('\n');
}

/**
 * Builds direct WhatsApp click-to-chat URL
 */
export function buildWhatsAppShareUrl(options: {
  phone?: string | null;
  message: string;
}): string {
  const cleanedPhone = cleanIndianPhoneNumber(options.phone);
  const encodedText = encodeURIComponent(options.message);

  if (cleanedPhone && cleanedPhone.length === 10) {
    return `https://wa.me/91${cleanedPhone}?text=${encodedText}`;
  }

  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
