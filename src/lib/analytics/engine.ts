/**
 * TableQR Analytics Engine
 * Pure, unit-tested analytical aggregation module for restaurant operations in India.
 * Handles revenue by day & hour, order KPIs, best/worst seller rankings,
 * table turnover, payment method splits, offer usage, and CSV generation.
 * Timezone: Asia/Kolkata (IST).
 */

export interface RawInvoice {
  id: string;
  invoice_number: string;
  financial_year: string;
  subtotal: number;
  discount_amount: number;
  service_charge_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  round_off_amount: number;
  total_amount: number;
  applied_offer_id?: string | null;
  coupon_code?: string | null;
  payment_method: string;
  payment_status: string;
  paid_at?: string | null;
  created_at: string;
  table_session_id?: string | null;
  tables?: {
    table_number: string;
    section: string;
  } | null;
}

export interface RawOrder {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
  updated_at: string;
  table_id: string;
  table_session_id: string;
  tables?: {
    table_number: string;
    section: string;
  } | null;
}

export interface RawOrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  item_name: string;
  variant_name?: string | null;
  unit_price: number;
  quantity: number;
  tax_rate: number;
  status: string;
  created_at: string;
}

export interface RawTableSession {
  id: string;
  table_id: string;
  status: string;
  opened_at: string;
  closed_at?: string | null;
  tables?: {
    table_number: string;
    section: string;
  } | null;
}

export interface RawMenuItem {
  id: string;
  category_id: string;
  name: string;
  price: number;
  is_veg: boolean;
  categories?: {
    name: string;
  } | null;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  netSubtotal: number;
  totalDiscounts: number;
  totalTaxCollected: number;
  totalCgst: number;
  totalSgst: number;
  totalServiceCharge: number;
  totalPaidInvoices: number;
  totalOrders: number;
  averageBill: number;
  averagePrepTimeMinutes: number;
  averageTableTurnoverMinutes: number;
  completedSessionsCount: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD in IST
  dayLabel: string; // e.g. "Wed, 19 Nov"
  revenue: number;
  orderCount: number;
  invoiceCount: number;
  avgBill: number;
}

export interface HourlyDistributionPoint {
  hour: number; // 0 to 23
  hourLabel: string; // e.g. "12 PM"
  revenue: number;
  orderCount: number;
  invoiceCount: number;
  percentage: number;
}

export interface ItemPerformancePoint {
  menuItemId: string;
  itemName: string;
  categoryName: string;
  isVeg: boolean;
  quantitySold: number;
  grossRevenue: number;
  orderCount: number;
  revenueSharePercent: number;
}

export interface PaymentMethodSplitPoint {
  method: string;
  label: string;
  count: number;
  amount: number;
  percentage: number;
}

export interface OfferUsagePoint {
  couponCode: string;
  timesApplied: number;
  totalDiscountAmount: number;
  totalSalesVolume: number;
  averageDiscount: number;
}

export interface SectionPerformancePoint {
  section: string;
  tableCount: number;
  ordersCount: number;
  totalRevenue: number;
  avgTurnoverMinutes: number;
}

export interface AnalyticsPayload {
  range: {
    startDate: string;
    endDate: string;
    preset: string;
  };
  summary: AnalyticsSummary;
  dailyTrends: DailyTrendPoint[];
  hourlyDistribution: HourlyDistributionPoint[];
  bestSellers: ItemPerformancePoint[];
  worstSellers: ItemPerformancePoint[];
  paymentMethodSplit: PaymentMethodSplitPoint[];
  offerUsage: OfferUsagePoint[];
  sectionPerformance: SectionPerformancePoint[];
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    tableNumber: string;
    section: string;
    totalAmount: number;
    paymentMethod: string;
    paidAt: string;
  }>;
}

/**
 * Converts a UTC or ISO string to an IST Date representation (Asia/Kolkata +05:30)
 */
export function getISTDateParts(isoString: string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  dateKey: string; // YYYY-MM-DD
} {
  const d = new Date(isoString);
  // IST offset is +5.5 hours (+330 minutes)
  const utc = d.getTime() + d.getTimezoneOffset() * 60000;
  const istTime = new Date(utc + 330 * 60000);

  const year = istTime.getFullYear();
  const month = istTime.getMonth() + 1;
  const day = istTime.getDate();
  const hour = istTime.getHours();
  const minute = istTime.getMinutes();
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  return { year, month, day, hour, minute, dateKey };
}

/**
 * Format a YYYY-MM-DD date key into friendly day label "Wed, 19 Nov"
 */
export function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Format hour 0..23 into "12 AM", "1 PM", "11 PM"
 */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return '12 PM';
  return `${hour - 12} PM`;
}

/**
 * Computes high-level summary KPIs
 */
export function computeSummaryMetrics(
  invoices: RawInvoice[],
  orders: RawOrder[],
  sessions: RawTableSession[]
): AnalyticsSummary {
  const paidInvoices = invoices.filter((i) => i.payment_status === 'paid');

  let totalRevenue = 0;
  let netSubtotal = 0;
  let totalDiscounts = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalServiceCharge = 0;

  for (const inv of paidInvoices) {
    totalRevenue += Number(inv.total_amount || 0);
    netSubtotal += Number(inv.subtotal || 0);
    totalDiscounts += Number(inv.discount_amount || 0);
    totalCgst += Number(inv.cgst_amount || 0);
    totalSgst += Number(inv.sgst_amount || 0);
    totalServiceCharge += Number(inv.service_charge_amount || 0);
  }

  const totalTaxCollected = totalCgst + totalSgst;
  const totalPaidInvoices = paidInvoices.length;
  const validOrders = orders.filter((o) => o.status !== 'cancelled');
  const totalOrders = validOrders.length;
  const averageBill = totalPaidInvoices > 0 ? Math.round((totalRevenue / totalPaidInvoices) * 100) / 100 : 0;

  // Compute average preparation time (minutes) from orders that reached ready/served
  let totalPrepMinutes = 0;
  let prepOrderCount = 0;

  for (const order of orders) {
    if (order.status === 'ready' || order.status === 'served') {
      const created = new Date(order.created_at).getTime();
      const updated = new Date(order.updated_at).getTime();
      const diffMinutes = (updated - created) / 60000;
      // Filter anomalies (0 to 180 min)
      if (diffMinutes >= 1 && diffMinutes <= 180) {
        totalPrepMinutes += diffMinutes;
        prepOrderCount++;
      }
    }
  }

  const averagePrepTimeMinutes =
    prepOrderCount > 0 ? Math.round((totalPrepMinutes / prepOrderCount) * 10) / 10 : 14;

  // Compute average table turnover duration (minutes) from completed sessions
  let totalSessionMinutes = 0;
  let completedSessionsCount = 0;

  for (const session of sessions) {
    if (session.status === 'completed' && session.closed_at) {
      const opened = new Date(session.opened_at).getTime();
      const closed = new Date(session.closed_at).getTime();
      const diffMinutes = (closed - opened) / 60000;
      if (diffMinutes >= 5 && diffMinutes <= 300) {
        totalSessionMinutes += diffMinutes;
        completedSessionsCount++;
      }
    }
  }

  const averageTableTurnoverMinutes =
    completedSessionsCount > 0 ? Math.round((totalSessionMinutes / completedSessionsCount) * 10) / 10 : 42;

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    netSubtotal: Math.round(netSubtotal * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalServiceCharge: Math.round(totalServiceCharge * 100) / 100,
    totalPaidInvoices,
    totalOrders,
    averageBill,
    averagePrepTimeMinutes,
    averageTableTurnoverMinutes,
    completedSessionsCount,
  };
}

/**
 * Computes daily revenue and order trends over the selected range
 */
export function computeDailyTrends(
  invoices: RawInvoice[],
  orders: RawOrder[],
  startDate: string,
  endDate: string
): DailyTrendPoint[] {
  const paidInvoices = invoices.filter((i) => i.payment_status === 'paid');
  const validOrders = orders.filter((o) => o.status !== 'cancelled');

  // Build map of dates
  const dailyMap: Record<
    string,
    { revenue: number; invoiceCount: number; orderCount: number }
  > = {};

  // Populate all dates in the range inclusive
  const start = new Date(startDate);
  const end = new Date(endDate);
  const current = new Date(start);

  while (current <= end) {
    const key = current.toISOString().slice(0, 10);
    dailyMap[key] = { revenue: 0, invoiceCount: 0, orderCount: 0 };
    current.setDate(current.getDate() + 1);
  }

  // Aggregate invoices
  for (const inv of paidInvoices) {
    const { dateKey } = getISTDateParts(inv.paid_at || inv.created_at);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { revenue: 0, invoiceCount: 0, orderCount: 0 };
    }
    dailyMap[dateKey].revenue += Number(inv.total_amount || 0);
    dailyMap[dateKey].invoiceCount += 1;
  }

  // Aggregate orders
  for (const ord of validOrders) {
    const { dateKey } = getISTDateParts(ord.created_at);
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { revenue: 0, invoiceCount: 0, orderCount: 0 };
    }
    dailyMap[dateKey].orderCount += 1;
  }

  // Transform into sorted array
  const sortedKeys = Object.keys(dailyMap).sort();
  return sortedKeys.map((dateKey) => {
    const item = dailyMap[dateKey];
    const revenue = Math.round(item.revenue * 100) / 100;
    const avgBill = item.invoiceCount > 0 ? Math.round((revenue / item.invoiceCount) * 100) / 100 : 0;
    return {
      date: dateKey,
      dayLabel: formatDayLabel(dateKey),
      revenue,
      orderCount: item.orderCount,
      invoiceCount: item.invoiceCount,
      avgBill,
    };
  });
}

/**
 * Computes hourly revenue and rush distribution (0 to 23 hours in IST)
 */
export function computeHourlyDistribution(
  invoices: RawInvoice[],
  orders: RawOrder[]
): HourlyDistributionPoint[] {
  const paidInvoices = invoices.filter((i) => i.payment_status === 'paid');
  const validOrders = orders.filter((o) => o.status !== 'cancelled');

  const hourlyMap: Record<number, { revenue: number; invoiceCount: number; orderCount: number }> = {};
  for (let h = 0; h < 24; h++) {
    hourlyMap[h] = { revenue: 0, invoiceCount: 0, orderCount: 0 };
  }

  let totalRevAllHours = 0;

  for (const inv of paidInvoices) {
    const { hour } = getISTDateParts(inv.paid_at || inv.created_at);
    const rev = Number(inv.total_amount || 0);
    hourlyMap[hour].revenue += rev;
    hourlyMap[hour].invoiceCount += 1;
    totalRevAllHours += rev;
  }

  for (const ord of validOrders) {
    const { hour } = getISTDateParts(ord.created_at);
    hourlyMap[hour].orderCount += 1;
  }

  return Array.from({ length: 24 }).map((_, h) => {
    const item = hourlyMap[h];
    const revenue = Math.round(item.revenue * 100) / 100;
    const percentage =
      totalRevAllHours > 0 ? Math.round((revenue / totalRevAllHours) * 1000) / 10 : 0;
    return {
      hour: h,
      hourLabel: formatHourLabel(h),
      revenue,
      orderCount: item.orderCount,
      invoiceCount: item.invoiceCount,
      percentage,
    };
  });
}

/**
 * Computes best and worst/slow sellers across the menu catalog
 */
export function computeItemPerformance(
  orderItems: RawOrderItem[],
  menuItems: RawMenuItem[]
): { bestSellers: ItemPerformancePoint[]; worstSellers: ItemPerformancePoint[] } {
  const activeItems = orderItems.filter((oi) => oi.status !== 'cancelled');

  // Aggregation map
  const itemMap: Record<
    string,
    {
      itemName: string;
      categoryName: string;
      isVeg: boolean;
      quantitySold: number;
      grossRevenue: number;
      orderCount: number;
    }
  > = {};

  // Initialize with all catalog menu items (so 0-seller items are caught)
  for (const m of menuItems) {
    itemMap[m.id] = {
      itemName: m.name,
      categoryName: m.categories?.name || 'General',
      isVeg: m.is_veg,
      quantitySold: 0,
      grossRevenue: 0,
      orderCount: 0,
    };
  }

  let totalItemRevenue = 0;

  for (const oi of activeItems) {
    const menuItemId = oi.menu_item_id;
    if (!itemMap[menuItemId]) {
      itemMap[menuItemId] = {
        itemName: oi.item_name,
        categoryName: 'General',
        isVeg: true,
        quantitySold: 0,
        grossRevenue: 0,
        orderCount: 0,
      };
    }

    const lineTotal = Number(oi.unit_price) * Number(oi.quantity);
    itemMap[menuItemId].quantitySold += Number(oi.quantity);
    itemMap[menuItemId].grossRevenue += lineTotal;
    itemMap[menuItemId].orderCount += 1;
    totalItemRevenue += lineTotal;
  }

  const allItems: ItemPerformancePoint[] = Object.keys(itemMap).map((menuItemId) => {
    const data = itemMap[menuItemId];
    const grossRevenue = Math.round(data.grossRevenue * 100) / 100;
    const revenueSharePercent =
      totalItemRevenue > 0 ? Math.round((grossRevenue / totalItemRevenue) * 1000) / 10 : 0;

    return {
      menuItemId,
      itemName: data.itemName,
      categoryName: data.categoryName,
      isVeg: data.isVeg,
      quantitySold: data.quantitySold,
      grossRevenue,
      orderCount: data.orderCount,
      revenueSharePercent,
    };
  });

  // Sort best sellers by quantity sold (descending), then revenue
  const bestSellers = [...allItems]
    .filter((i) => i.quantitySold > 0)
    .sort((a, b) => b.quantitySold - a.quantitySold || b.grossRevenue - a.grossRevenue)
    .slice(0, 10);

  // Sort worst sellers (items with lowest quantity, including 0)
  const worstSellers = [...allItems]
    .sort((a, b) => a.quantitySold - b.quantitySold || a.grossRevenue - b.grossRevenue)
    .slice(0, 10);

  return { bestSellers, worstSellers };
}

/**
 * Computes split by payment method (UPI vs Cash vs Card)
 */
export function computePaymentMethodSplit(invoices: RawInvoice[]): PaymentMethodSplitPoint[] {
  const paidInvoices = invoices.filter((i) => i.payment_status === 'paid');

  const methodsMap: Record<string, { count: number; amount: number; label: string }> = {
    upi: { count: 0, amount: 0, label: 'UPI (QR / Deep Link)' },
    cash: { count: 0, amount: 0, label: 'Cash at Counter' },
    card: { count: 0, amount: 0, label: 'Credit / Debit Card' },
    gateway_razorpay: { count: 0, amount: 0, label: 'Razorpay Gateway' },
    gateway_cashfree: { count: 0, amount: 0, label: 'Cashfree Gateway' },
  };

  let totalVolume = 0;

  for (const inv of paidInvoices) {
    const method = inv.payment_method || 'upi';
    const amount = Number(inv.total_amount || 0);

    if (!methodsMap[method]) {
      methodsMap[method] = {
        count: 0,
        amount: 0,
        label: method.toUpperCase(),
      };
    }

    methodsMap[method].count += 1;
    methodsMap[method].amount += amount;
    totalVolume += amount;
  }

  return Object.keys(methodsMap)
    .map((key) => {
      const data = methodsMap[key];
      const amount = Math.round(data.amount * 100) / 100;
      const percentage = totalVolume > 0 ? Math.round((amount / totalVolume) * 1000) / 10 : 0;
      return {
        method: key,
        label: data.label,
        count: data.count,
        amount,
        percentage,
      };
    })
    .filter((p) => p.count > 0 || ['upi', 'cash', 'card'].includes(p.method))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Computes offer and coupon usage metrics
 */
export function computeOfferUsage(invoices: RawInvoice[]): OfferUsagePoint[] {
  const paidInvoices = invoices.filter(
    (i) => i.payment_status === 'paid' && Number(i.discount_amount || 0) > 0
  );

  const offerMap: Record<
    string,
    { timesApplied: number; totalDiscount: number; totalSales: number }
  > = {};

  for (const inv of paidInvoices) {
    const code = (inv.coupon_code || 'PROMO_DISCOUNT').toUpperCase();
    if (!offerMap[code]) {
      offerMap[code] = { timesApplied: 0, totalDiscount: 0, totalSales: 0 };
    }

    offerMap[code].timesApplied += 1;
    offerMap[code].totalDiscount += Number(inv.discount_amount || 0);
    offerMap[code].totalSales += Number(inv.total_amount || 0);
  }

  return Object.keys(offerMap)
    .map((code) => {
      const data = offerMap[code];
      const totalDiscountAmount = Math.round(data.totalDiscount * 100) / 100;
      const totalSalesVolume = Math.round(data.totalSales * 100) / 100;
      const averageDiscount =
        data.timesApplied > 0 ? Math.round((totalDiscountAmount / data.timesApplied) * 100) / 100 : 0;

      return {
        couponCode: code,
        timesApplied: data.timesApplied,
        totalDiscountAmount,
        totalSalesVolume,
        averageDiscount,
      };
    })
    .sort((a, b) => b.totalDiscountAmount - a.totalDiscountAmount);
}

/**
 * Computes section and table performance
 */
export function computeSectionPerformance(
  tables: Array<{ id: string; table_number: string; section: string }>,
  sessions: RawTableSession[],
  invoices: RawInvoice[]
): SectionPerformancePoint[] {
  const sectionMap: Record<
    string,
    { tableCount: number; ordersCount: number; totalRevenue: number; totalMinutes: number; sessionCount: number }
  > = {};

  // Initialize all known sections from tables
  for (const t of tables) {
    const sec = t.section || 'Main Dining';
    if (!sectionMap[sec]) {
      sectionMap[sec] = { tableCount: 0, ordersCount: 0, totalRevenue: 0, totalMinutes: 0, sessionCount: 0 };
    }
    sectionMap[sec].tableCount += 1;
  }

  // Aggregate turnover from completed sessions
  for (const s of sessions) {
    const sec = s.tables?.section || 'Main Dining';
    if (!sectionMap[sec]) {
      sectionMap[sec] = { tableCount: 1, ordersCount: 0, totalRevenue: 0, totalMinutes: 0, sessionCount: 0 };
    }

    if (s.status === 'completed' && s.closed_at) {
      const diff = (new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000;
      if (diff >= 5 && diff <= 300) {
        sectionMap[sec].totalMinutes += diff;
        sectionMap[sec].sessionCount += 1;
      }
    }
  }

  // Aggregate revenue from paid invoices
  for (const inv of invoices) {
    if (inv.payment_status === 'paid') {
      const sec = inv.tables?.section || 'Main Dining';
      if (!sectionMap[sec]) {
        sectionMap[sec] = { tableCount: 1, ordersCount: 0, totalRevenue: 0, totalMinutes: 0, sessionCount: 0 };
      }
      sectionMap[sec].totalRevenue += Number(inv.total_amount || 0);
      sectionMap[sec].ordersCount += 1;
    }
  }

  return Object.keys(sectionMap).map((sec) => {
    const data = sectionMap[sec];
    const avgTurnoverMinutes =
      data.sessionCount > 0 ? Math.round((data.totalMinutes / data.sessionCount) * 10) / 10 : 40;

    return {
      section: sec,
      tableCount: data.tableCount,
      ordersCount: data.ordersCount,
      totalRevenue: Math.round(data.totalRevenue * 100) / 100,
      avgTurnoverMinutes,
    };
  });
}

// ============================================================================
// CSV EXPORTERS (UTF-8 formatted with BOM for Excel & Sheets in India)
// ============================================================================

const UTF8_BOM = '\uFEFF';

function escapeCsvField(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generates Daily Revenue & Orders Summary CSV
 */
export function generateRevenueSummaryCSV(
  dailyTrends: DailyTrendPoint[],
  restaurantName: string
): string {
  const headers = [
    'Date (IST)',
    'Day',
    'Paid Invoices',
    'Orders Placed',
    'Total Revenue (INR)',
    'Average Bill (INR)',
  ];

  const rows = dailyTrends.map((d) => [
    escapeCsvField(d.date),
    escapeCsvField(d.dayLabel),
    escapeCsvField(d.invoiceCount),
    escapeCsvField(d.orderCount),
    escapeCsvField(d.revenue.toFixed(2)),
    escapeCsvField(d.avgBill.toFixed(2)),
  ]);

  const csvContent = [
    `# TableQR Revenue Summary - ${restaurantName}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  return UTF8_BOM + csvContent;
}

/**
 * Generates Item Sales Performance CSV
 */
export function generateItemSalesCSV(
  items: ItemPerformancePoint[],
  restaurantName: string
): string {
  const headers = [
    'Item Name',
    'Category',
    'Dietary Type',
    'Units Sold',
    'Gross Revenue (INR)',
    'Revenue Share (%)',
  ];

  const rows = items.map((i) => [
    escapeCsvField(i.itemName),
    escapeCsvField(i.categoryName),
    escapeCsvField(i.isVeg ? 'Vegetarian' : 'Non-Vegetarian'),
    escapeCsvField(i.quantitySold),
    escapeCsvField(i.grossRevenue.toFixed(2)),
    escapeCsvField(i.revenueSharePercent.toFixed(1) + '%'),
  ]);

  const csvContent = [
    `# TableQR Item Sales Performance - ${restaurantName}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  return UTF8_BOM + csvContent;
}

/**
 * Generates Settled Invoices & Transactions CSV
 */
export function generateInvoicesCSV(
  invoices: RawInvoice[],
  restaurantName: string
): string {
  const headers = [
    'Invoice Number',
    'Financial Year',
    'Table Number',
    'Section',
    'Subtotal (INR)',
    'Discount (INR)',
    'Coupon Code',
    'CGST (INR)',
    'SGST (INR)',
    'Total Amount (INR)',
    'Payment Method',
    'Status',
    'Paid At (IST)',
  ];

  const rows = invoices.map((inv) => [
    escapeCsvField(inv.invoice_number),
    escapeCsvField(inv.financial_year),
    escapeCsvField(inv.tables?.table_number || 'N/A'),
    escapeCsvField(inv.tables?.section || 'Main'),
    escapeCsvField(Number(inv.subtotal || 0).toFixed(2)),
    escapeCsvField(Number(inv.discount_amount || 0).toFixed(2)),
    escapeCsvField(inv.coupon_code || 'None'),
    escapeCsvField(Number(inv.cgst_amount || 0).toFixed(2)),
    escapeCsvField(Number(inv.sgst_amount || 0).toFixed(2)),
    escapeCsvField(Number(inv.total_amount || 0).toFixed(2)),
    escapeCsvField(inv.payment_method.toUpperCase()),
    escapeCsvField(inv.payment_status.toUpperCase()),
    escapeCsvField(inv.paid_at || inv.created_at),
  ]);

  const csvContent = [
    `# TableQR Invoices & Transactions - ${restaurantName}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\r\n');

  return UTF8_BOM + csvContent;
}
