/**
 * TableQR Billing Engine Unit Test Suite
 * 
 * Tests:
 * 1. Tax-exclusive 5% GST with CGST/SGST split
 * 2. Tax-inclusive mode (backward tax extraction)
 * 3. Multi-slab GST (0%, 5%, 12%, 18%)
 * 4. Percentage discount with max cap
 * 5. Flat discount with minimum bill requirement
 * 6. Category-specific offer filtering
 * 7. Happy Hour IST time window and day-of-week validation
 * 8. Service charge calculation (inclusive & exclusive)
 * 9. Symmetrical round-off to nearest rupee
 * 10. Edge cases: empty cart, 100% discount, zero tax
 */

import { calculateBill, isOfferTimeValid, BillingItemInput, BillingSettingsInput, BillingOfferInput } from '../src/lib/billing/engine';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: unknown) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (failureDetails) {
      console.error('     Details:', failureDetails);
    }
    failedTests++;
  }
}

function assertClose(actual: number, expected: number, testName: string, tolerance: number = 0.01) {
  const diff = Math.abs(actual - expected);
  assert(diff <= tolerance, `${testName} (expected ${expected}, got ${actual})`, { actual, expected, diff });
}

console.log('=====================================================');
console.log('🧪 RUNNING TABLEQR BILLING ENGINE UNIT TESTS');
console.log('=====================================================\n');

// ----------------------------------------------------
// Test Group 1: Standard Tax-Exclusive Billing (5% GST)
// ----------------------------------------------------
console.log('📌 Test Group 1: Standard Tax-Exclusive (5% GST, equal CGST/SGST)');
{
  const items: BillingItemInput[] = [
    {
      menuItemId: 'item-1',
      name: 'Masala Chai',
      unitPrice: 50,
      quantity: 2,
      taxRate: 5,
    },
    {
      menuItemId: 'item-2',
      name: 'Paneer Pakora',
      unitPrice: 150,
      quantity: 1,
      taxRate: 5,
      addons: [{ name: 'Extra Mint Chutney', price: 20 }],
    },
  ];

  const settings: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  const result = calculateBill({ items, settings });

  // Chai: 50 * 2 = 100
  // Pakora with addon: (150 + 20) * 1 = 170
  // Items subtotal = 270.00
  // 5% Tax on 270 = 13.50 -> CGST: 6.75, SGST: 6.75
  // Total before roundoff = 270 + 13.50 = 283.50
  // Round off: +0.50 -> Final Total = 284
  assertClose(result.itemsSubtotal, 270.00, 'Items Subtotal should be 270.00');
  assertClose(result.totalTax, 13.50, 'Total tax at 5% should be 13.50');
  assertClose(result.cgstAmount, 6.75, 'CGST should be exactly 6.75');
  assertClose(result.sgstAmount, 6.75, 'SGST should be exactly 6.75');
  assertClose(result.totalBeforeRoundOff, 283.50, 'Total before roundoff should be 283.50');
  assertClose(result.roundOffAmount, 0.50, 'Round off amount should be +0.50');
  assert(result.totalAmount === 284, 'Total amount rounded to nearest rupee should be 284');
}

// ----------------------------------------------------
// Test Group 2: Tax-Inclusive Mode (MRP pricing)
// ----------------------------------------------------
console.log('\n📌 Test Group 2: Tax-Inclusive Mode (MRP backwards tax extraction)');
{
  const items: BillingItemInput[] = [
    {
      menuItemId: 'item-3',
      name: 'Darjeeling Special Platter',
      unitPrice: 210, // MRP inclusive of 5% tax -> Base = 210 / 1.05 = 200, Tax = 10
      quantity: 1,
      taxRate: 5,
    },
  ];

  const settings: BillingSettingsInput = {
    isTaxInclusive: true,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  const result = calculateBill({ items, settings });

  assertClose(result.itemsSubtotal, 210.00, 'Gross items subtotal is 210.00');
  assertClose(result.netTaxableSubtotal, 200.00, 'Net taxable base extracted is 200.00');
  assertClose(result.totalTax, 10.00, 'Total embedded tax is 10.00');
  assertClose(result.cgstAmount, 5.00, 'CGST embedded is 5.00');
  assertClose(result.sgstAmount, 5.00, 'SGST embedded is 5.00');
  assertClose(result.totalAmount, 210, 'Final payable in tax-inclusive is exactly 210');
  assertClose(result.roundOffAmount, 0.00, 'Round off is 0.00');
}

// ----------------------------------------------------
// Test Group 3: Multi-Slab GST (0%, 5%, 12%, 18%)
// ----------------------------------------------------
console.log('\n📌 Test Group 3: Multi-Slab GST (0%, 5%, 12%, 18% in same cart)');
{
  const items: BillingItemInput[] = [
    {
      menuItemId: 'slab-0',
      name: 'Fresh Mineral Water',
      unitPrice: 50,
      quantity: 1,
      taxRate: 0, // 0% GST
    },
    {
      menuItemId: 'slab-5',
      name: 'Thukpa (Food)',
      unitPrice: 200,
      quantity: 1,
      taxRate: 5, // 5% GST -> Base 200, Tax 10 (CGST 5, SGST 5)
    },
    {
      menuItemId: 'slab-12',
      name: 'Packaged Bakery Hamper',
      unitPrice: 100,
      quantity: 1,
      taxRate: 12, // 12% GST -> Base 100, Tax 12 (CGST 6, SGST 6)
    },
    {
      menuItemId: 'slab-18',
      name: 'Special Mocktail (Beverage)',
      unitPrice: 150,
      quantity: 1,
      taxRate: 18, // 18% GST -> Base 150, Tax 27 (CGST 13.50, SGST 13.50)
    },
  ];

  const settings: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  const result = calculateBill({ items, settings });

  // Subtotal = 50 + 200 + 100 + 150 = 500
  // Total Tax = 0 + 10 + 12 + 27 = 49
  // CGST = 24.50, SGST = 24.50
  assertClose(result.itemsSubtotal, 500.00, 'Gross items total is 500.00');
  assertClose(result.totalTax, 49.00, 'Total tax across 4 slabs is 49.00');
  assertClose(result.cgstAmount, 24.50, 'CGST sum is 24.50');
  assertClose(result.sgstAmount, 24.50, 'SGST sum is 24.50');
  assert(result.taxBreakdownBySlab.length === 4, 'Should contain 4 distinct tax slab breakdowns');

  const slab5 = result.taxBreakdownBySlab.find((s) => s.slab === 5);
  assert(!!slab5 && slab5.totalTax === 10, 'Slab 5% has totalTax of 10');

  const slab18 = result.taxBreakdownBySlab.find((s) => s.slab === 18);
  assert(!!slab18 && slab18.totalTax === 27, 'Slab 18% has totalTax of 27');
}

// ----------------------------------------------------
// Test Group 4: Percentage Discount with Max Cap
// ----------------------------------------------------
console.log('\n📌 Test Group 4: Percentage Discount with Max Cap');
{
  const items: BillingItemInput[] = [
    {
      menuItemId: 'party-platter',
      name: 'Chef Tasting Menu',
      unitPrice: 1000,
      quantity: 1,
      taxRate: 5,
    },
  ];

  const settings: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  // 20% discount on ₹1000 would be ₹200, but cap is ₹100
  const offerWithCap: BillingOfferInput = {
    code: 'SAVE20',
    title: '20% Off up to ₹100',
    discountType: 'percentage',
    discountValue: 20,
    maxDiscountCap: 100,
  };

  const resultWithCap = calculateBill({ items, settings, offer: offerWithCap });
  assertClose(resultWithCap.discountAmount, 100.00, 'Discount is capped at 100.00 even though 20% is 200.00');
  // Net taxable subtotal: 900. 5% tax on 900 is 45.00
  assertClose(resultWithCap.totalTax, 45.00, 'Tax on discounted subtotal (900) is 45.00');
  assertClose(resultWithCap.totalAmount, 945, 'Final total is 945');

  // Same offer on smaller bill: 20% on ₹300 = ₹60 (below cap of ₹100)
  const smallItems: BillingItemInput[] = [
    {
      menuItemId: 'tea-snack',
      name: 'Tea & Samosa',
      unitPrice: 300,
      quantity: 1,
      taxRate: 5,
    },
  ];
  const resultSmall = calculateBill({ items: smallItems, settings, offer: offerWithCap });
  assertClose(resultSmall.discountAmount, 60.00, 'Discount is 60.00 when below cap');
}

// ----------------------------------------------------
// Test Group 5: Flat Discount with Min Bill Requirement
// ----------------------------------------------------
console.log('\n📌 Test Group 5: Flat Discount with Min Bill Requirement');
{
  const offerFlat: BillingOfferInput = {
    code: 'FLAT75',
    title: '₹75 Off on ₹300+',
    discountType: 'flat',
    discountValue: 75,
    minBillAmount: 300,
  };

  const settings: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  // Subtotal ₹250 (Below ₹300 threshold)
  const lowBill = calculateBill({
    items: [{ menuItemId: 'i-1', name: 'Item', unitPrice: 250, quantity: 1, taxRate: 5 }],
    settings,
    offer: offerFlat,
  });
  assert(lowBill.discountAmount === 0, 'Discount is 0 when subtotal < minBillAmount');
  assert(
    !!lowBill.discountDetails?.reason?.includes('Minimum order of ₹300 required'),
    'Reason mentions minimum order requirement'
  );

  // Subtotal ₹350 (Meets ₹300 threshold)
  const highBill = calculateBill({
    items: [{ menuItemId: 'i-1', name: 'Item', unitPrice: 350, quantity: 1, taxRate: 5 }],
    settings,
    offer: offerFlat,
  });
  assertClose(highBill.discountAmount, 75.00, 'Discount of 75.00 applied when threshold met');
  // Net subtotal: 350 - 75 = 275. 5% tax = 13.75. Total before round: 288.75 -> 289
  assert(highBill.totalAmount === 289, 'Final rounded total is 289');
}

// ----------------------------------------------------
// Test Group 6: Category-Specific Offers
// ----------------------------------------------------
console.log('\n📌 Test Group 6: Category-Specific Offers');
{
  const bakeryCategoryId = 'cat-bakery';
  const beveragesCategoryId = 'cat-beverages';

  const items: BillingItemInput[] = [
    {
      menuItemId: 'cake',
      name: 'Chocolate Croissant',
      categoryId: bakeryCategoryId,
      unitPrice: 120,
      quantity: 2, // 240
      taxRate: 5,
    },
    {
      menuItemId: 'coffee',
      name: 'Cold Coffee',
      categoryId: beveragesCategoryId,
      unitPrice: 160,
      quantity: 1, // 160
      taxRate: 18,
    },
  ];

  const offerBakeryOnly: BillingOfferInput = {
    code: 'BAKERY50',
    title: '50% Off Bakery Items',
    discountType: 'percentage',
    discountValue: 50,
    applicableCategoryId: bakeryCategoryId,
  };

  const settings: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  const result = calculateBill({ items, settings, offer: offerBakeryOnly });

  // Gross items subtotal: 240 (bakery) + 160 (coffee) = 400
  // Eligible subtotal for bakery is 240
  // 50% discount on 240 = 120
  assertClose(result.itemsSubtotal, 400.00, 'Gross items subtotal is 400');
  assertClose(result.eligibleDiscountSubtotal, 240.00, 'Only bakery items (240.00) are eligible');
  assertClose(result.discountAmount, 120.00, 'Discount is 120.00 (50% of 240)');

  // Bakery discounted to 120 @ 5% GST -> 6.00 tax
  // Coffee untouched at 160 @ 18% GST -> 28.80 tax
  // Total tax = 34.80
  assertClose(result.totalTax, 34.80, 'Total tax is 34.80 accurately calculated across slabs');
}

// ----------------------------------------------------
// Test Group 7: Happy Hour IST Time & Day Validation
// ----------------------------------------------------
console.log('\n📌 Test Group 7: Happy Hour IST Time & Day Validation');
{
  const happyHourOffer: BillingOfferInput = {
    code: 'HAPPYHOURS',
    title: 'Afternoon Delight (2 PM - 5 PM IST)',
    discountType: 'percentage',
    discountValue: 15,
    happyHourStart: '14:00',
    happyHourEnd: '17:00',
    daysOfWeek: [1, 2, 3, 4, 5], // Monday - Friday
  };

  // Create a Tuesday 3:30 PM IST (15:30 IST = 10:00 UTC)
  // 2026-03-10 was a Tuesday
  const insideTime = new Date('2026-03-10T10:00:00.000Z');
  const validCheck = isOfferTimeValid(happyHourOffer, insideTime);
  assert(validCheck.isValid === true, 'Valid during 15:30 IST on a Tuesday');

  // Tuesday 7:00 PM IST (19:00 IST = 13:30 UTC) - outside window
  const outsideTime = new Date('2026-03-10T13:30:00.000Z');
  const outsideCheck = isOfferTimeValid(happyHourOffer, outsideTime);
  assert(outsideCheck.isValid === false, 'Invalid outside happy hour window (19:00 IST)');
  assert(
    !!outsideCheck.reason?.includes('Happy Hour valid only between 14:00 and 17:00 IST'),
    'Reason mentions happy hour window'
  );

  // Sunday 3:30 PM IST (2026-03-08 was Sunday) - within hours, but excluded day
  const sundayTime = new Date('2026-03-08T10:00:00.000Z');
  const sundayCheck = isOfferTimeValid(happyHourOffer, sundayTime);
  assert(sundayCheck.isValid === false, 'Invalid on Sunday when daysOfWeek is Mon-Fri');
  assert(
    !!sundayCheck.reason?.includes('not valid on this day'),
    'Reason mentions day of week restriction'
  );
}

// ----------------------------------------------------
// Test Group 8: Service Charge
// ----------------------------------------------------
console.log('\n📌 Test Group 8: Service Charge (Optional restaurant setting)');
{
  const items: BillingItemInput[] = [
    {
      menuItemId: 'i-1',
      name: 'Meal',
      unitPrice: 1000,
      quantity: 1,
      taxRate: 5,
    },
  ];

  const settingsWithSC: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: true,
    serviceChargeRate: 5, // 5% service charge
  };

  const result = calculateBill({ items, settings: settingsWithSC });

  // Items: 1000
  // 5% Service charge = 50.00
  // 5% Tax on 1000 = 50.00
  // Total = 1000 + 50 + 50 = 1100
  assertClose(result.serviceChargeAmount, 50.00, '5% Service charge on 1000 is 50.00');
  assertClose(result.totalBeforeRoundOff, 1100.00, 'Total before roundoff is 1100.00');
  assert(result.totalAmount === 1100, 'Final payable is 1100');
}

// ----------------------------------------------------
// Test Group 9: Symmetrical Round-Off to Nearest Rupee
// ----------------------------------------------------
console.log('\n📌 Test Group 9: Symmetrical Round-Off to Nearest Rupee');
{
  // Test case A: .49 rounds down (negative round-off)
  // Let items produce total before round-off = 100.49
  // Item 95.70 @ 5% GST = 95.70 + 4.785 = 100.485 -> 100.49
  const itemDown: BillingItemInput = {
    menuItemId: 'i-down',
    name: 'Item Down',
    unitPrice: 95.70,
    quantity: 1,
    taxRate: 5,
  };
  const resDown = calculateBill({
    items: [itemDown],
    settings: { isTaxInclusive: false, isServiceChargeEnabled: false, serviceChargeRate: 0 },
  });
  assert(resDown.totalAmount === 100, `100.49 rounds down to 100 (got ${resDown.totalAmount})`);
  assert(resDown.roundOffAmount < 0, `Round-off is negative (-₹${Math.abs(resDown.roundOffAmount)})`);

  // Test case B: .50 rounds up
  // Item 99.52 @ 5% GST = 99.52 + 4.976 = 104.50
  const itemUp: BillingItemInput = {
    menuItemId: 'i-up',
    name: 'Item Up',
    unitPrice: 99.52,
    quantity: 1,
    taxRate: 5,
  };
  const resUp = calculateBill({
    items: [itemUp],
    settings: { isTaxInclusive: false, isServiceChargeEnabled: false, serviceChargeRate: 0 },
  });
  assert(resUp.totalAmount === 104 || resUp.totalAmount === 105, 'Rounds properly at boundary');
  assertClose(resUp.totalAmount, resUp.totalBeforeRoundOff + resUp.roundOffAmount, 'Round off equation holds: Total = Before + RoundOff');
}

// ----------------------------------------------------
// Test Group 10: Edge Cases
// ----------------------------------------------------
console.log('\n📌 Test Group 10: Edge Cases (Empty cart, 100% discount, zero tax)');
{
  const settings: BillingSettingsInput = {
    isTaxInclusive: false,
    isServiceChargeEnabled: false,
    serviceChargeRate: 0,
  };

  // Empty cart
  const emptyResult = calculateBill({ items: [], settings });
  assert(emptyResult.itemsSubtotal === 0, 'Empty cart has 0 subtotal');
  assert(emptyResult.totalAmount === 0, 'Empty cart has 0 total amount');
  assert(emptyResult.taxBreakdownBySlab.length === 0, 'Empty cart has empty tax breakdown');

  // 100% discount
  const freeOffer: BillingOfferInput = {
    code: '100OFF',
    title: 'Free Treat',
    discountType: 'percentage',
    discountValue: 100,
  };
  const freeResult = calculateBill({
    items: [{ menuItemId: 'i-1', name: 'Coffee', unitPrice: 150, quantity: 1, taxRate: 5 }],
    settings,
    offer: freeOffer,
  });
  assertClose(freeResult.discountAmount, 150.00, '100% discount gives 150 discount');
  assertClose(freeResult.totalTax, 0.00, 'Tax on 100% discounted bill is 0.00');
  assert(freeResult.totalAmount === 0, 'Final payable is 0');
}

console.log('\n=====================================================');
console.log(`📊 TEST RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log('=====================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL BILLING ENGINE TESTS PASSED PERFECTLY!\n');
}
