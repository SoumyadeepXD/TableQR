/**
 * Standalone Unit Test Suite for TableQR Analytics Engine
 * Tests summary KPIs, daily trends, hourly rush distribution, best/worst sellers,
 * payment splits, offer usage, section turnover, and CSV generation.
 */

import {
  computeSummaryMetrics,
  computeDailyTrends,
  computeHourlyDistribution,
  computeItemPerformance,
  computePaymentMethodSplit,
  computeOfferUsage,
  computeSectionPerformance,
  generateRevenueSummaryCSV,
  generateItemSalesCSV,
  generateInvoicesCSV,
  getISTDateParts,
  RawInvoice,
  RawOrder,
  RawOrderItem,
  RawTableSession,
  RawMenuItem,
} from '../src/lib/analytics/engine';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: unknown) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (failureDetails !== undefined) {
      console.error('     Details:', failureDetails);
    }
    failedTests++;
  }
}

console.log('\n=====================================================');
console.log('🧪 RUNNING TABLEQR ANALYTICS ENGINE UNIT TESTS');
console.log('=====================================================\n');

// Mock Data
const mockInvoices: RawInvoice[] = [
  {
    id: 'inv-1',
    invoice_number: 'TQR/2026-27/0001',
    financial_year: '2026-27',
    subtotal: 500,
    discount_amount: 50,
    service_charge_amount: 25,
    cgst_amount: 11.88,
    sgst_amount: 11.88,
    round_off_amount: 0.24,
    total_amount: 499,
    coupon_code: 'WELCOME10',
    payment_method: 'upi',
    payment_status: 'paid',
    paid_at: '2026-11-20T07:30:00Z', // 13:00 IST
    created_at: '2026-11-20T07:00:00Z',
    tables: { table_number: 'T-01', section: 'Indoor AC Hall' },
  },
  {
    id: 'inv-2',
    invoice_number: 'TQR/2026-27/0002',
    financial_year: '2026-27',
    subtotal: 800,
    discount_amount: 100,
    service_charge_amount: 40,
    cgst_amount: 18.5,
    sgst_amount: 18.5,
    round_off_amount: 0,
    total_amount: 777,
    coupon_code: 'WELCOME10',
    payment_method: 'cash',
    payment_status: 'paid',
    paid_at: '2026-11-20T14:00:00Z', // 19:30 IST
    created_at: '2026-11-20T13:30:00Z',
    tables: { table_number: 'T-07', section: 'Garden Courtyard' },
  },
  {
    id: 'inv-3',
    invoice_number: 'TQR/2026-27/0003',
    financial_year: '2026-27',
    subtotal: 300,
    discount_amount: 0,
    service_charge_amount: 0,
    cgst_amount: 7.5,
    sgst_amount: 7.5,
    round_off_amount: 0,
    total_amount: 315,
    coupon_code: null,
    payment_method: 'card',
    payment_status: 'paid',
    paid_at: '2026-11-21T03:30:00Z', // 09:00 IST
    created_at: '2026-11-21T03:00:00Z',
    tables: { table_number: 'T-11', section: 'Balcony Sunset Deck' },
  },
  {
    id: 'inv-4',
    invoice_number: 'TQR/2026-27/0004',
    financial_year: '2026-27',
    subtotal: 1000,
    discount_amount: 0,
    service_charge_amount: 0,
    cgst_amount: 25,
    sgst_amount: 25,
    round_off_amount: 0,
    total_amount: 1050,
    payment_method: 'upi',
    payment_status: 'unpaid', // Unpaid - should be excluded from revenue!
    created_at: '2026-11-21T06:00:00Z',
  },
];

const mockOrders: RawOrder[] = [
  {
    id: 'ord-1',
    order_number: 1,
    status: 'served',
    created_at: '2026-11-20T07:00:00Z',
    updated_at: '2026-11-20T07:15:00Z', // 15 mins prep
    table_id: 'tbl-1',
    table_session_id: 'ses-1',
    tables: { table_number: 'T-01', section: 'Indoor AC Hall' },
  },
  {
    id: 'ord-2',
    order_number: 2,
    status: 'ready',
    created_at: '2026-11-20T13:30:00Z',
    updated_at: '2026-11-20T13:50:00Z', // 20 mins prep
    table_id: 'tbl-7',
    table_session_id: 'ses-2',
    tables: { table_number: 'T-07', section: 'Garden Courtyard' },
  },
  {
    id: 'ord-3',
    order_number: 3,
    status: 'cancelled', // Cancelled order
    created_at: '2026-11-21T01:00:00Z',
    updated_at: '2026-11-21T01:05:00Z',
    table_id: 'tbl-1',
    table_session_id: 'ses-1',
  },
  {
    id: 'ord-4',
    order_number: 4,
    status: 'served',
    created_at: '2026-11-21T03:00:00Z',
    updated_at: '2026-11-21T03:10:00Z', // 10 mins prep
    table_id: 'tbl-11',
    table_session_id: 'ses-3',
    tables: { table_number: 'T-11', section: 'Balcony Sunset Deck' },
  },
];

const mockSessions: RawTableSession[] = [
  {
    id: 'ses-1',
    table_id: 'tbl-1',
    status: 'completed',
    opened_at: '2026-11-20T06:45:00Z',
    closed_at: '2026-11-20T07:35:00Z', // 50 mins
    tables: { table_number: 'T-01', section: 'Indoor AC Hall' },
  },
  {
    id: 'ses-2',
    table_id: 'tbl-7',
    status: 'completed',
    opened_at: '2026-11-20T13:15:00Z',
    closed_at: '2026-11-20T14:15:00Z', // 60 mins
    tables: { table_number: 'T-07', section: 'Garden Courtyard' },
  },
  {
    id: 'ses-3',
    table_id: 'tbl-11',
    status: 'active', // Active - not closed
    opened_at: '2026-11-21T03:00:00Z',
    tables: { table_number: 'T-11', section: 'Balcony Sunset Deck' },
  },
];

const mockMenuItems: RawMenuItem[] = [
  { id: 'm-1', category_id: 'c-1', name: 'Darjeeling First Flush Tea', price: 140, is_veg: true, categories: { name: 'Chais' } },
  { id: 'm-2', category_id: 'c-1', name: 'Masala Kulhad Chai', price: 90, is_veg: true, categories: { name: 'Chais' } },
  { id: 'm-3', category_id: 'c-2', name: 'Steamed Chicken Momos', price: 220, is_veg: false, categories: { name: 'Momos' } },
  { id: 'm-4', category_id: 'c-3', name: 'Earl Grey Dark Chocolate Brownie', price: 180, is_veg: true, categories: { name: 'Desserts' } },
  { id: 'm-5', category_id: 'c-3', name: 'Matcha Opera Cake', price: 240, is_veg: true, categories: { name: 'Desserts' } }, // 0 sales item!
];

const mockOrderItems: RawOrderItem[] = [
  { id: 'oi-1', order_id: 'ord-1', menu_item_id: 'm-1', item_name: 'Darjeeling First Flush Tea', unit_price: 140, quantity: 2, tax_rate: 5, status: 'served', created_at: '2026-11-20T07:00:00Z' },
  { id: 'oi-2', order_id: 'ord-1', menu_item_id: 'm-2', item_name: 'Masala Kulhad Chai', unit_price: 90, quantity: 1, tax_rate: 5, status: 'served', created_at: '2026-11-20T07:00:00Z' },
  { id: 'oi-3', order_id: 'ord-2', menu_item_id: 'm-3', item_name: 'Steamed Chicken Momos', unit_price: 220, quantity: 3, tax_rate: 5, status: 'ready', created_at: '2026-11-20T13:30:00Z' },
  { id: 'oi-4', order_id: 'ord-2', menu_item_id: 'm-4', item_name: 'Earl Grey Dark Chocolate Brownie', unit_price: 180, quantity: 1, tax_rate: 18, status: 'ready', created_at: '2026-11-20T13:30:00Z' },
  { id: 'oi-5', order_id: 'ord-4', menu_item_id: 'm-1', item_name: 'Darjeeling First Flush Tea', unit_price: 140, quantity: 1, tax_rate: 5, status: 'served', created_at: '2026-11-21T03:00:00Z' },
  { id: 'oi-6', order_id: 'ord-3', menu_item_id: 'm-3', item_name: 'Steamed Chicken Momos', unit_price: 220, quantity: 2, tax_rate: 5, status: 'cancelled', created_at: '2026-11-21T01:00:00Z' }, // Cancelled item
];

// ============================================================================
// TEST GROUP 1: Summary Metrics & KPIs
// ============================================================================
console.log('📌 Test Group 1: Summary Metrics & KPIs');

const summary = computeSummaryMetrics(mockInvoices, mockOrders, mockSessions);

assert(summary.totalRevenue === 1591, 'Total revenue should exclude unpaid invoice (499 + 777 + 315 = 1591)', summary.totalRevenue);
assert(summary.totalPaidInvoices === 3, 'Total paid invoices should be 3', summary.totalPaidInvoices);
assert(summary.totalOrders === 3, 'Total valid orders should be 3 (excluding cancelled ord-3)', summary.totalOrders);
assert(summary.totalDiscounts === 150, 'Total discounts should be 50 + 100 = 150', summary.totalDiscounts);
assert(summary.averageBill === 530.33, 'Average bill should be 1591 / 3 = 530.33', summary.averageBill);
assert(summary.averagePrepTimeMinutes === 15, 'Average prep time should be (15 + 20 + 10) / 3 = 15.0 mins', summary.averagePrepTimeMinutes);
assert(summary.averageTableTurnoverMinutes === 55, 'Average turnover should be (50 + 60) / 2 = 55.0 mins', summary.averageTableTurnoverMinutes);
assert(summary.completedSessionsCount === 2, 'Completed sessions count should be 2', summary.completedSessionsCount);

// ============================================================================
// TEST GROUP 2: IST Date & Daily Trends
// ============================================================================
console.log('\n📌 Test Group 2: IST Date Conversion & Daily Trends');

const istParts = getISTDateParts('2026-11-20T19:00:00Z');
// 19:00 UTC + 5:30 = 00:30 on next day 2026-11-21 IST!
assert(istParts.dateKey === '2026-11-21', '19:00 UTC correctly rolls over to next date in IST (2026-11-21)', istParts.dateKey);
assert(istParts.hour === 0 && istParts.minute === 30, 'IST time correctly computed as 00:30', `${istParts.hour}:${istParts.minute}`);

const dailyTrends = computeDailyTrends(mockInvoices, mockOrders, '2026-11-20', '2026-11-21');
assert(dailyTrends.length === 2, 'Should return exactly 2 days for the range', dailyTrends.length);
assert(dailyTrends[0].revenue === 1276, 'Day 1 (2026-11-20) revenue should be 499 + 777 = 1276', dailyTrends[0].revenue);
assert(dailyTrends[1].revenue === 315, 'Day 2 (2026-11-21) revenue should be 315', dailyTrends[1].revenue);
assert(dailyTrends[0].invoiceCount === 2, 'Day 1 should have 2 paid invoices', dailyTrends[0].invoiceCount);
assert(dailyTrends[1].invoiceCount === 1, 'Day 2 should have 1 paid invoice', dailyTrends[1].invoiceCount);

// ============================================================================
// TEST GROUP 3: Hourly Distribution (0..23 IST)
// ============================================================================
console.log('\n📌 Test Group 3: Hourly Distribution');

const hourlyTrends = computeHourlyDistribution(mockInvoices, mockOrders);
assert(hourlyTrends.length === 24, 'Should contain all 24 hour slots', hourlyTrends.length);

// Check 13:00 IST (inv-1 paid at 07:30 UTC = 13:00 IST)
const slot13 = hourlyTrends[13];
assert(slot13.revenue === 499, 'Hour 13 (1 PM) should have revenue of 499', slot13.revenue);
assert(slot13.hourLabel === '1 PM', 'Hour 13 label should be "1 PM"', slot13.hourLabel);

// Check 19:00 IST (inv-2 paid at 14:00 UTC = 19:30 IST)
const slot19 = hourlyTrends[19];
assert(slot19.revenue === 777, 'Hour 19 (7 PM) should have revenue of 777', slot19.revenue);

// Check 09:00 IST (inv-3 paid at 03:30 UTC = 09:00 IST)
const slot9 = hourlyTrends[9];
assert(slot9.revenue === 315, 'Hour 9 (9 AM) should have revenue of 315', slot9.revenue);

// Unused hour should have 0 revenue
assert(hourlyTrends[3].revenue === 0, 'Hour 3 (3 AM) should have 0 revenue', hourlyTrends[3].revenue);

// ============================================================================
// TEST GROUP 4: Best and Worst / Slow Sellers
// ============================================================================
console.log('\n📌 Test Group 4: Item Sales Performance (Best & Worst Sellers)');

const { bestSellers, worstSellers } = computeItemPerformance(mockOrderItems, mockMenuItems);

// Best seller should be Darjeeling First Flush Tea (2 + 1 = 3 units, or Steamed Chicken Momos 3 units)
assert(bestSellers.length > 0, 'Best sellers list should not be empty');
assert(bestSellers[0].quantitySold === 3, 'Top seller quantity should be 3', bestSellers[0].quantitySold);

// Cancelled items should NOT be counted in sales!
const momoItem = bestSellers.find((i) => i.itemName === 'Steamed Chicken Momos');
assert(momoItem?.quantitySold === 3, 'Cancelled momos (2 units) should NOT be counted, leaving 3 sold', momoItem?.quantitySold);

// Worst sellers should catch the 0-sale item from the catalog
const zeroSaleItem = worstSellers.find((i) => i.itemName === 'Matcha Opera Cake');
assert(zeroSaleItem !== undefined && zeroSaleItem.quantitySold === 0, 'Worst sellers should include 0-sale catalog item "Matcha Opera Cake"', zeroSaleItem);
assert(worstSellers[0].quantitySold === 0, 'First worst seller should have 0 units sold', worstSellers[0].quantitySold);

// ============================================================================
// TEST GROUP 5: Payment Method Split
// ============================================================================
console.log('\n📌 Test Group 5: Payment Method Split');

const paymentSplit = computePaymentMethodSplit(mockInvoices);
const upiSplit = paymentSplit.find((p) => p.method === 'upi');
const cashSplit = paymentSplit.find((p) => p.method === 'cash');
const cardSplit = paymentSplit.find((p) => p.method === 'card');

assert(upiSplit?.amount === 499, 'UPI amount should be 499', upiSplit?.amount);
assert(cashSplit?.amount === 777, 'Cash amount should be 777', cashSplit?.amount);
assert(cardSplit?.amount === 315, 'Card amount should be 315', cardSplit?.amount);
assert(cashSplit?.count === 1 && upiSplit?.count === 1, 'Each paid method should have 1 transaction');

const totalSplitPercentage = paymentSplit.reduce((acc, p) => acc + p.percentage, 0);
assert(Math.round(totalSplitPercentage) === 100, 'Sum of payment percentages should be ~100%', totalSplitPercentage);

// ============================================================================
// TEST GROUP 6: Offer & Coupon Usage
// ============================================================================
console.log('\n📌 Test Group 6: Offer & Coupon Usage');

const offerUsage = computeOfferUsage(mockInvoices);
assert(offerUsage.length === 1, 'Should have 1 coupon code used ("WELCOME10")', offerUsage.length);
assert(offerUsage[0].couponCode === 'WELCOME10', 'Coupon code should be WELCOME10', offerUsage[0].couponCode);
assert(offerUsage[0].timesApplied === 2, 'WELCOME10 should have been used 2 times', offerUsage[0].timesApplied);
assert(offerUsage[0].totalDiscountAmount === 150, 'Total discount should be 50 + 100 = 150', offerUsage[0].totalDiscountAmount);
assert(offerUsage[0].averageDiscount === 75, 'Average discount should be 150 / 2 = 75', offerUsage[0].averageDiscount);

// ============================================================================
// TEST GROUP 7: Section Performance & Turnover
// ============================================================================
console.log('\n📌 Test Group 7: Section Performance & Turnover');

const mockTables = [
  { id: 'tbl-1', table_number: 'T-01', section: 'Indoor AC Hall' },
  { id: 'tbl-2', table_number: 'T-02', section: 'Indoor AC Hall' },
  { id: 'tbl-7', table_number: 'T-07', section: 'Garden Courtyard' },
  { id: 'tbl-11', table_number: 'T-11', section: 'Balcony Sunset Deck' },
];

const sectionPerf = computeSectionPerformance(mockTables, mockSessions, mockInvoices);
assert(sectionPerf.length === 3, 'Should cover all 3 sections', sectionPerf.length);

const acHall = sectionPerf.find((s) => s.section === 'Indoor AC Hall');
assert(acHall?.tableCount === 2, 'Indoor AC Hall should have 2 tables', acHall?.tableCount);
assert(acHall?.totalRevenue === 499, 'Indoor AC Hall revenue should be 499', acHall?.totalRevenue);
assert(acHall?.avgTurnoverMinutes === 50, 'Indoor AC Hall turnover should be 50 mins', acHall?.avgTurnoverMinutes);

// ============================================================================
// TEST GROUP 8: CSV Exporters (Format & UTF-8 BOM)
// ============================================================================
console.log('\n📌 Test Group 8: CSV Exporters');

const summaryCsv = generateRevenueSummaryCSV(dailyTrends, 'Darjeeling Chai & Cafe');
assert(summaryCsv.startsWith('\uFEFF'), 'Revenue summary CSV should start with UTF-8 BOM for Excel/Numbers');
assert(summaryCsv.includes('Total Revenue (INR)'), 'Revenue summary CSV contains proper column headers');
assert(summaryCsv.includes('"1276.00"'), 'Revenue summary CSV contains Day 1 revenue');

const itemsCsv = generateItemSalesCSV(bestSellers, 'Darjeeling Chai & Cafe');
assert(itemsCsv.startsWith('\uFEFF'), 'Item sales CSV should start with UTF-8 BOM');
assert(itemsCsv.includes('"Steamed Chicken Momos"'), 'Item sales CSV contains item name');
assert(itemsCsv.includes('Non-Vegetarian'), 'Item sales CSV contains dietary type');

const invoicesCsv = generateInvoicesCSV(mockInvoices, 'Darjeeling Chai & Cafe');
assert(invoicesCsv.startsWith('\uFEFF'), 'Invoices CSV should start with UTF-8 BOM');
assert(invoicesCsv.includes('"TQR/2026-27/0001"'), 'Invoices CSV contains invoice number');
assert(invoicesCsv.includes('"WELCOME10"'), 'Invoices CSV contains coupon code');
assert(invoicesCsv.includes('UPI'), 'Invoices CSV contains payment method');

// ============================================================================
// SUMMARY RESULTS
// ============================================================================
console.log('\n=====================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('=====================================================');

if (failedTests > 0) {
  console.error('\n❌ SOME ANALYTICS ENGINE TESTS FAILED!');
  process.exit(1);
} else {
  console.log('🎉 ALL ANALYTICS ENGINE TESTS PASSED PERFECTLY!\n');
}
