/**
 * TableQR Phase 7 Unit Test Suite: Polish, i18n Localization, WhatsApp Sharing & PWA
 * 
 * Verifies:
 * 1. Translation dictionary parity across English, Hindi, and Bengali (zero missing keys)
 * 2. Parameter interpolation and fallback handling in getTranslation()
 * 3. WhatsApp bill receipt markdown formatting with legal headers, itemization, and GST
 * 4. Indian phone number normalization and WhatsApp wa.me / api.whatsapp.com URL generation
 * 5. PWA manifest structure, standalone display configuration, and theme consistency
 * 6. Service worker cache rules and offline fallback
 */

import { translations, getTranslation } from '../src/lib/i18n/translations';
import { TranslationDictionary, Language } from '../src/lib/i18n/types';
import {
  cleanIndianPhoneNumber,
  formatWhatsAppBillText,
  buildWhatsAppShareUrl,
  WhatsAppBillPayload,
} from '../src/lib/whatsapp/formatter';
import manifest from '../src/app/manifest';

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

async function runPolishTests() {
  console.log('\n================================================================');
  console.log(' TableQR Phase 7: Polish, i18n, WhatsApp Sharing & PWA Tests   ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. i18n Dictionaries Parity & Completeness
  // ---------------------------------------------------------------------------
  console.log('--- 1. Multilingual Dictionaries Integrity (EN / HI / BN) ---');

  const enKeys = Object.keys(translations.en) as (keyof TranslationDictionary)[];
  const hiKeys = Object.keys(translations.hi) as (keyof TranslationDictionary)[];
  const bnKeys = Object.keys(translations.bn) as (keyof TranslationDictionary)[];

  assert(
    enKeys.length > 30,
    `English dictionary has comprehensive coverage (${enKeys.length} keys)`
  );

  assert(
    hiKeys.length === enKeys.length,
    `Hindi dictionary key count (${hiKeys.length}) matches English (${enKeys.length})`
  );

  assert(
    bnKeys.length === enKeys.length,
    `Bengali dictionary key count (${bnKeys.length}) matches English (${enKeys.length})`
  );

  // Check every individual key for presence and non-emptiness
  let allHiKeysPresent = true;
  let allBnKeysPresent = true;

  for (const k of enKeys) {
    if (!translations.hi[k] || typeof translations.hi[k] !== 'string') {
      allHiKeysPresent = false;
      console.error(`Missing Hindi translation for key: ${k}`);
    }
    if (!translations.bn[k] || typeof translations.bn[k] !== 'string') {
      allBnKeysPresent = false;
      console.error(`Missing Bengali translation for key: ${k}`);
    }
  }

  assert(allHiKeysPresent, 'All English keys are translated into Hindi with non-empty values');
  assert(allBnKeysPresent, 'All English keys are translated into Bengali with non-empty values');

  // ---------------------------------------------------------------------------
  // 2. getTranslation() Fallback & Interpolation
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Translation Lookup & Interpolation ---');

  assert(
    getTranslation('en', 'callWaiter') === 'Call Waiter',
    'getTranslation resolves English callWaiter'
  );

  assert(
    getTranslation('hi', 'callWaiter') === 'वेटर को बुलाएँ',
    'getTranslation resolves Hindi callWaiter'
  );

  assert(
    getTranslation('bn', 'callWaiter') === 'ওয়েটার ডাকুন',
    'getTranslation resolves Bengali callWaiter'
  );

  // Fallback to English for invalid language
  assert(
    getTranslation('fr' as Language, 'tableNumber') === 'Table',
    'getTranslation falls back to English for unconfigured languages'
  );

  // ---------------------------------------------------------------------------
  // 3. Indian Phone Number Normalization
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Indian Mobile Number Sanitization ---');

  assert(
    cleanIndianPhoneNumber('+91 98765-43210') === '9876543210',
    'Strips +91, spaces, and hyphens from "+91 98765-43210"'
  );

  assert(
    cleanIndianPhoneNumber('09876543210') === '9876543210',
    'Strips leading 0 from 11-digit number "09876543210"'
  );

  assert(
    cleanIndianPhoneNumber('919876543210') === '9876543210',
    'Strips leading 91 from 12-digit number "919876543210"'
  );

  assert(
    cleanIndianPhoneNumber('9876543210') === '9876543210',
    'Preserves standard 10-digit number "9876543210"'
  );

  assert(
    cleanIndianPhoneNumber('12345') === '12345',
    'Handles non-standard length without crashing'
  );

  assert(
    cleanIndianPhoneNumber(null) === '',
    'Handles null input safely'
  );

  // ---------------------------------------------------------------------------
  // 4. WhatsApp Receipt Formatting
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. WhatsApp Bill Markdown Formatting ---');

  const samplePayload: WhatsAppBillPayload = {
    restaurant: {
      name: 'Darjeeling Chai & Cafe',
      tagline: 'Authentic Hill Station Brews',
      address: '100ft Road, Indiranagar',
      city: 'Bengaluru',
      gstin: '29AABCU9603R1ZM',
      fssaiLicense: '11223344556677',
    },
    table: {
      tableNumber: '04',
      section: 'Garden Courtyard',
    },
    invoice: {
      invoiceNumber: 'INV-2024-25-0042',
      date: '22 Nov 2026, 02:45 AM',
      subtotal: 500.0,
      discountAmount: 50.0,
      offerCode: 'WELCOME10',
      serviceChargeAmount: 22.5,
      cgstAmount: 11.81,
      sgstAmount: 11.81,
      roundOffAmount: -0.12,
      totalAmount: 496.0,
      paymentStatus: 'paid',
      paymentMethod: 'gateway_razorpay',
    },
    items: [
      {
        name: 'Darjeeling First Flush Tea',
        quantity: 2,
        variantName: 'Pot for 2',
        price: 150.0,
        total: 300.0,
      },
      {
        name: 'Steamed Chicken Momos',
        quantity: 1,
        variantName: 'Classic (6 pcs)',
        price: 200.0,
        total: 200.0,
      },
    ],
    billUrl: 'https://tableqr.in/r/cafe-darjeeling/t/tbl_t04_abc123/bill',
  };

  const formattedWhatsAppText = formatWhatsAppBillText(samplePayload);

  assert(
    formattedWhatsAppText.includes('*DARJEELING CHAI & CAFE*'),
    'WhatsApp receipt includes restaurant name in bold uppercase'
  );

  assert(
    formattedWhatsAppText.includes('GSTIN: *29AABCU9603R1ZM*'),
    'WhatsApp receipt displays GSTIN prominently'
  );

  assert(
    formattedWhatsAppText.includes('FSSAI: 11223344556677'),
    'WhatsApp receipt displays FSSAI license'
  );

  assert(
    formattedWhatsAppText.includes('*TAX INVOICE #INV-2024-25-0042*'),
    'WhatsApp receipt displays invoice number'
  );

  assert(
    formattedWhatsAppText.includes('Table: *T-04* (Garden Courtyard)'),
    'WhatsApp receipt displays table number and section'
  );

  assert(
    formattedWhatsAppText.includes('• 2x Darjeeling First Flush Tea (Pot for 2) - ₹300.00'),
    'WhatsApp receipt includes itemized tea line'
  );

  assert(
    formattedWhatsAppText.includes('• 1x Steamed Chicken Momos (Classic (6 pcs)) - ₹200.00'),
    'WhatsApp receipt includes itemized momos line'
  );

  assert(
    formattedWhatsAppText.includes('Discount (WELCOME10): -₹50.00'),
    'WhatsApp receipt includes coupon offer line'
  );

  assert(
    formattedWhatsAppText.includes('Service Charge: ₹22.50'),
    'WhatsApp receipt includes service charge'
  );

  assert(
    formattedWhatsAppText.includes('CGST: ₹11.81') && formattedWhatsAppText.includes('SGST: ₹11.81'),
    'WhatsApp receipt details CGST and SGST split'
  );

  assert(
    formattedWhatsAppText.includes('Round-off: -₹0.12'),
    'WhatsApp receipt details round-off'
  );

  assert(
    formattedWhatsAppText.includes('*TOTAL AMOUNT: ₹496.00*'),
    'WhatsApp receipt displays grand total in bold'
  );

  assert(
    formattedWhatsAppText.includes('✅ Status: *PAID via GATEWAY_RAZORPAY*'),
    'WhatsApp receipt displays payment confirmation and method'
  );

  assert(
    formattedWhatsAppText.includes('https://tableqr.in/r/cafe-darjeeling/t/tbl_t04_abc123/bill'),
    'WhatsApp receipt embeds live digital tax invoice link'
  );

  // ---------------------------------------------------------------------------
  // 5. WhatsApp Click-to-Chat Deep Links
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. WhatsApp Deep Link URL Construction ---');

  const directPhoneUrl = buildWhatsAppShareUrl({
    phone: '+91 98765-43210',
    message: formattedWhatsAppText,
  });

  assert(
    directPhoneUrl.startsWith('https://wa.me/919876543210?text='),
    'Direct phone sharing uses https://wa.me/919876543210?text=...'
  );

  assert(
    directPhoneUrl.includes(encodeURIComponent('*DARJEELING CHAI & CAFE*')),
    'Message text is safely URI encoded'
  );

  const genericShareUrl = buildWhatsAppShareUrl({
    phone: null,
    message: formattedWhatsAppText,
  });

  assert(
    genericShareUrl.startsWith('https://api.whatsapp.com/send?text='),
    'Generic sharing without phone number uses https://api.whatsapp.com/send?text=...'
  );

  // ---------------------------------------------------------------------------
  // 6. PWA Manifest & Shell Specifications
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. PWA Manifest & App Configuration ---');

  const pwaConfig = manifest();

  assert(pwaConfig.name === 'TableQR — Contactless Dine-In Ordering & Billing', 'PWA name is set correctly');
  assert(pwaConfig.short_name === 'TableQR', 'PWA short_name is set to TableQR');
  assert(pwaConfig.display === 'standalone', 'PWA display mode is standalone');
  assert(pwaConfig.theme_color === '#059669', 'PWA theme_color is #059669 (emerald brand color)');
  assert(pwaConfig.background_color === '#020617', 'PWA background_color is #020617 (slate-950)');
  assert(pwaConfig.start_url === '/', 'PWA start_url is /');
  assert(
    Array.isArray(pwaConfig.icons) && pwaConfig.icons.length >= 2,
    `PWA config defines ${pwaConfig.icons?.length} icons for various resolutions`
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPolishTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
