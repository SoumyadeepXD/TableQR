/**
 * TableQR Phase 5 Unit Test Suite: ESC/POS Thermal Printing & Receipt Formatter
 * 
 * Tests:
 * 1. ESC/POS Command Byte Sequences (Init, Alignment, Sizing, Invert, Bold, Cut, Drawer Kick)
 * 2. 80mm Column Geometry (48-char Font A line alignment & padding)
 * 3. Kitchen Order Ticket (KOT) Generation (Table, Order, Items, Addons, Inverted Cooking Notes)
 * 4. Reprint KOT Badge & Audit Formatting
 * 5. Customer Tax Invoice Bill Generation (GSTIN, FSSAI, Tax Breakdown, Drawer Pulse, Cut)
 * 6. Virtual ASCII Receipt Rendering & Control Code Stripping
 */

import { EscposBuilder, KotPrintPayload, BillPrintPayload } from '../print-agent/src/escpos';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    if (details) console.error(`     Details: ${details}`);
    failed++;
  }
}

function runPrintingTests() {
  console.log('\n================================================================');
  console.log('       TableQR Phase 5: ESC/POS Printing Engine Unit Tests      ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. ESC/POS Command Byte Sequences
  // ---------------------------------------------------------------------------
  console.log('--- 1. ESC/POS Command Protocols ---');

  const bInit = new EscposBuilder().init().toBuffer();
  assert(
    bInit[0] === 0x1b && bInit[1] === 0x40,
    'ESC @ initializes/resets printer',
    `Expected [0x1B, 0x40], got ${JSON.stringify(Array.from(bInit.subarray(0, 2)))}`
  );

  const bAlign = new EscposBuilder().align('center').toBuffer();
  assert(
    bAlign.includes(0x1b) && bAlign.includes(0x61) && bAlign.includes(1),
    'ESC a 1 sets center alignment'
  );

  const bAlignRight = new EscposBuilder().align('right').toBuffer();
  assert(
    bAlignRight.includes(0x1b) && bAlignRight.includes(0x61) && bAlignRight.includes(2),
    'ESC a 2 sets right alignment'
  );

  const bBold = new EscposBuilder().bold(true).toBuffer();
  assert(
    bBold.includes(0x1b) && bBold.includes(0x45) && bBold.includes(1),
    'ESC E 1 turns bold ON'
  );

  const bDoubleSize = new EscposBuilder().doubleSize(true).toBuffer();
  assert(
    bDoubleSize.includes(0x1d) && bDoubleSize.includes(0x21) && bDoubleSize.includes(0x11),
    'GS ! 0x11 sets double width and height'
  );

  const bDoubleHeight = new EscposBuilder().doubleHeight(true).toBuffer();
  assert(
    bDoubleHeight.includes(0x1d) && bDoubleHeight.includes(0x21) && bDoubleHeight.includes(0x01),
    'GS ! 0x01 sets double height'
  );

  const bInvert = new EscposBuilder().invert(true).toBuffer();
  assert(
    bInvert.includes(0x1d) && bInvert.includes(0x42) && bInvert.includes(1),
    'GS B 1 turns white-on-black inverted printing ON'
  );

  const bCut = new EscposBuilder().cut().toBuffer();
  assert(
    bCut.includes(0x1d) && bCut.includes(0x56) && bCut.includes(0x00),
    'GS V 0 executes paper cut'
  );

  const bDrawer = new EscposBuilder().drawerKick().toBuffer();
  assert(
    bDrawer.includes(0x1b) && bDrawer.includes(0x70) && bDrawer.includes(0x00),
    'ESC p 0 triggers cash drawer pulse'
  );

  // ---------------------------------------------------------------------------
  // 2. 80mm Column Alignment & Text Geometry
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. 80mm Column Geometry (48 Characters) ---');

  const bCol = new EscposBuilder().twoColumn('Item Subtotal', 'Rs. 450.00').toBuffer();
  const colText = bCol.toString('utf8');
  // Look for the line containing both strings
  const lines = colText.split('\n');
  const matchedLine = lines.find((l) => l.includes('Item Subtotal') && l.includes('Rs. 450.00'));
  assert(
    Boolean(matchedLine),
    'twoColumn outputs both left and right strings on one line',
    `Found line: "${matchedLine}"`
  );

  const bDiv = new EscposBuilder().divider('-').toBuffer();
  const divText = bDiv.toString('utf8');
  assert(
    divText.includes('-'.repeat(48)),
    'divider generates a 48-character dashed line for standard 80mm roll'
  );

  // ---------------------------------------------------------------------------
  // 3. Kitchen Order Ticket (KOT) Generation
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Kitchen Order Ticket (KOT) Encoding ---');

  const sampleKot: KotPrintPayload = {
    restaurantName: 'Darjeeling Chai & Cafe',
    tableNumber: 'T-04',
    section: 'Courtyard',
    orderNumber: 15,
    createdAt: '2026-11-22T13:45:00Z',
    customerNote: 'Make everything mild spicy',
    isReprint: false,
    items: [
      {
        itemName: 'Darjeeling Steamed Momos',
        quantity: 2,
        variantName: 'Full (8 pcs)',
        cookingRequest: 'Extra spicy chutney on side',
        addons: ['Chilli Garlic Dip', 'Fried Garlic Flakes'],
      },
      {
        itemName: 'Masala Chai',
        quantity: 3,
        cookingRequest: 'Less sugar please',
      },
    ],
  };

  const kotBuffer = EscposBuilder.buildKot(sampleKot);
  assert(kotBuffer.length > 100, `KOT buffer generated (${kotBuffer.length} bytes)`);

  const kotStr = kotBuffer.toString('utf8');
  assert(kotStr.includes('DARJEELING CHAI & CAFE'), 'KOT contains restaurant name in uppercase');
  assert(kotStr.includes('*** KITCHEN ORDER ***'), 'KOT contains header title');
  assert(kotStr.includes('TABLE: T-04'), 'KOT contains table number');
  assert(kotStr.includes('ORDER #15'), 'KOT contains sequential order number');
  assert(kotStr.includes('COURTYARD'), 'KOT contains dining section');
  assert(kotStr.includes('[ 2 ] DARJEELING STEAMED MOMOS'), 'KOT item includes bracketed quantity');
  assert(kotStr.includes('Portion: Full (8 pcs)'), 'KOT item includes variant portion');
  assert(kotStr.includes('+ Chilli Garlic Dip'), 'KOT item includes addon line');
  assert(kotStr.includes('EXTRA SPICY CHUTNEY ON SIDE'), 'KOT item includes cooking request');
  assert(kotStr.includes('ORDER NOTE: MAKE EVERYTHING MILD SPICY'), 'KOT includes customer order note');

  // Verify cooking request has reverse print GS B 1
  const hasInvert = kotBuffer.includes(0x1d) && kotBuffer.includes(0x42);
  assert(hasInvert, 'Cooking requests are wrapped in inverted (reverse) ESC/POS codes');

  // Verify paper cut command at end
  const hasCut = kotBuffer.includes(0x1d) && kotBuffer.includes(0x56);
  assert(hasCut, 'KOT terminates with paper cut command (GS V)');

  // ---------------------------------------------------------------------------
  // 4. Reprint KOT Badge & Audit Formatting
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Reprint KOT Validation ---');

  const reprintKot: KotPrintPayload = {
    ...sampleKot,
    isReprint: true,
  };
  const reprintBuffer = EscposBuilder.buildKot(reprintKot);
  const reprintStr = reprintBuffer.toString('utf8');

  assert(reprintStr.includes('*** REPRINT ***'), 'Reprint KOT includes prominent *** REPRINT *** header');

  // ---------------------------------------------------------------------------
  // 5. Customer Tax Invoice Bill Generation
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Customer Tax Invoice Bill Encoding ---');

  const sampleBill: BillPrintPayload = {
    restaurant: {
      name: 'Darjeeling Chai & Cafe',
      tagline: 'Authentic Hills Kitchen',
      address: '14 Gandhi Road',
      city: 'Darjeeling',
      phone: '+91 98765 43210',
      gstin: '19AAACD1234F1Z5',
      fssai: '12822001000123',
      upiId: 'darjeelingcafe@upi',
    },
    invoiceNumber: 'TQR/2026-27/0042',
    tableNumber: 'T-04',
    section: 'Courtyard',
    createdAt: '2026-11-22T14:30:00Z',
    items: [
      {
        itemName: 'Steamed Chicken Momos',
        variantName: 'Full (8 pcs)',
        quantity: 2,
        unitPrice: 220,
        lineTotal: 440,
        addons: [{ name: 'Chilli Dip', price: 30 }],
      },
      {
        itemName: 'Ginger Lemon Tea',
        quantity: 2,
        unitPrice: 80,
        lineTotal: 160,
      },
    ],
    subtotal: 600,
    discountAmount: 60,
    discountCode: 'WELCOME10',
    serviceChargeAmount: 27,
    serviceChargeRate: 5,
    cgstAmount: 14.18,
    sgstAmount: 14.18,
    roundOffAmount: 0.64,
    totalAmount: 596,
    paymentStatus: 'paid',
    paymentMethod: 'upi',
  };

  const billBuffer = EscposBuilder.buildBill(sampleBill);
  assert(billBuffer.length > 200, `Bill buffer generated (${billBuffer.length} bytes)`);

  const billStr = billBuffer.toString('utf8');
  assert(billStr.includes('DARJEELING CHAI & CAFE'), 'Bill contains restaurant header');
  assert(billStr.includes('GSTIN: 19AAACD1234F1Z5'), 'Bill contains legal GSTIN');
  assert(billStr.includes('FSSAI Lic: 12822001000123'), 'Bill contains legal FSSAI number');
  assert(billStr.includes('*** TAX INVOICE ***'), 'Bill labeled as TAX INVOICE');
  assert(billStr.includes('INV: TQR/2026-27/0042'), 'Bill contains sequential invoice number');
  assert(billStr.includes('Discount (WELCOME10):'), 'Bill details discount with offer code');
  assert(billStr.includes('CGST:'), 'Bill details CGST line');
  assert(billStr.includes('SGST:'), 'Bill details SGST line');
  assert(billStr.includes('Round-off:'), 'Bill details round-off line');
  assert(billStr.includes('TOTAL:'), 'Bill details grand total line');
  assert(billStr.includes('PAID IN FULL via UPI'), 'Bill shows payment settlement status');

  // Verify cash drawer pulse
  const billHasDrawer = billBuffer.includes(0x1b) && billBuffer.includes(0x70);
  assert(billHasDrawer, 'Bill includes cash drawer kick pulse (ESC p) to pop cash register');

  // Verify cut command
  const billHasCut = billBuffer.includes(0x1d) && billBuffer.includes(0x56);
  assert(billHasCut, 'Bill includes automatic paper cut command (GS V)');

  // ---------------------------------------------------------------------------
  // 6. Virtual ASCII Receipt Rendering
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Simulator ASCII Receipt Rendering ---');

  const asciiSlip = EscposBuilder.renderAsciiSlip(kotBuffer);
  assert(asciiSlip.includes('┌') && asciiSlip.includes('┐'), 'ASCII slip renders top border');
  assert(asciiSlip.includes('└') && asciiSlip.includes('┘'), 'ASCII slip renders bottom border');
  assert(asciiSlip.includes('CUT HERE'), 'ASCII slip renders cut line indicator');
  assert(
    !/[\x00-\x09\x0B-\x1F\x7F]/.test(asciiSlip.replace(/\r?\n/g, '')),
    'ASCII slip strips all raw control bytes cleanly for terminal and log display'
  );

  console.log('\n================================================================');
  console.log(`Summary: ${passed} passed, ${failed} failed out of ${passed + failed} assertions.`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPrintingTests();
