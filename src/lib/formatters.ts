/**
 * Formatting utilities for TableQR (India localization)
 * - Currency: INR (₹)
 * - Number formatting: Indian number system (Lakhs and Crores)
 * - Timezone: Asia/Kolkata (IST)
 * - Financial Year: April 1 to March 31 (e.g. 2026-27)
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_CURRENCY = 'INR';

/**
 * Format a number to Indian Rupee currency format (e.g., ₹1,250.00 or ₹95)
 */
export function formatINR(
  amount: number,
  options: { showDecimals?: boolean; showSymbol?: boolean } = {}
): string {
  const { showDecimals = true, showSymbol = true } = options;

  const validAmount = Number.isFinite(amount) ? amount : 0;

  const formatted = new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(validAmount);

  return formatted;
}

/**
 * Format raw numbers with the Indian numbering grouping (e.g. 1,00,000)
 */
export function formatIndianNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-IN').format(value);
}

/**
 * Format a date/timestamp to IST readable string
 */
export function formatISTDateTime(
  dateInput: string | Date | number,
  options: { dateOnly?: boolean; timeOnly?: boolean } = {}
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  if (options.timeOnly) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: DEFAULT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  if (options.dateOnly) {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: DEFAULT_TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  }

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: DEFAULT_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Calculate Indian Financial Year (starts April 1, ends March 31)
 * Example: November 2026 -> "2026-27"; February 2027 -> "2026-27"
 */
export function getIndianFinancialYear(dateInput?: Date): string {
  const date = dateInput || new Date();
  // Convert to IST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: DEFAULT_TIMEZONE,
    year: 'numeric',
    month: 'numeric',
  });

  const parts = formatter.formatToParts(date);
  const month = parseInt(parts.find((p) => p.type === 'month')?.value || '1', 10);
  const year = parseInt(parts.find((p) => p.type === 'year')?.value || '2026', 10);

  if (month >= 4) {
    const nextYearShort = String(year + 1).slice(-2);
    return `${year}-${nextYearShort}`;
  } else {
    const currentYearShort = String(year).slice(-2);
    return `${year - 1}-${currentYearShort}`;
  }
}

/**
 * Round off calculation: rounds final total to nearest whole Rupee
 * Returns { roundedTotal, roundOffAmount }
 * Positive roundOffAmount means rounded up, negative means rounded down.
 */
export function calculateRoundOff(rawAmount: number): {
  roundedTotal: number;
  roundOffAmount: number;
} {
  const roundedTotal = Math.round(rawAmount);
  const roundOffAmount = Number((roundedTotal - rawAmount).toFixed(2));
  return { roundedTotal, roundOffAmount };
}
