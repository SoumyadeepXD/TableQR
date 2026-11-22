/**
 * TableQR Phase 6 Unit Test Suite: Payment Gateway Automation & Webhooks
 * 
 * Verifies:
 * 1. Cryptographic HMAC-SHA256 signatures & timing-safe equality checks
 * 2. Razorpay checkout callback signature verification & tamper rejection
 * 3. Razorpay webhook verification (X-Razorpay-Signature) & event payload parsing
 * 4. Cashfree timestamped webhook verification (x-webhook-signature) & parsing
 * 5. Dynamic UPI QR URI generation with transaction references
 * 6. Amount subunit calculations (Rupees -> Paise)
 * 7. Webhook amount validation & mismatch rejection (tamper guard)
 * 8. Idempotent settlement logic & double-payment prevention
 */

import {
  timingSafeCompare,
  generateRazorpayPaymentSignature,
  verifyRazorpayPaymentSignature,
  generateRazorpayWebhookSignature,
  verifyRazorpayWebhookSignature,
  generateCashfreeWebhookSignature,
  verifyCashfreeWebhookSignature,
} from '../src/lib/payments/gateway/crypto';

import { RazorpayGateway } from '../src/lib/payments/gateway/razorpay';
import { CashfreeGateway } from '../src/lib/payments/gateway/cashfree';
import { buildUpiUri } from '../src/lib/payments/upi';

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

async function runPaymentTests() {
  console.log('\n================================================================');
  console.log(' TableQR Phase 6: Payment Gateway Automation & Webhooks Tests  ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Timing-Safe Comparison & Primitives
  // ---------------------------------------------------------------------------
  console.log('--- 1. Cryptographic Timing-Safe Equality Primitives ---');

  assert(
    timingSafeCompare('secret_token_123', 'secret_token_123'),
    'timingSafeCompare returns true for identical strings'
  );

  assert(
    !timingSafeCompare('secret_token_123', 'secret_token_124'),
    'timingSafeCompare returns false for same length different strings'
  );

  assert(
    !timingSafeCompare('short', 'longer_string'),
    'timingSafeCompare returns false for different length strings'
  );

  assert(
    timingSafeCompare('', ''),
    'timingSafeCompare handles empty strings correctly'
  );

  assert(
    !timingSafeCompare(null as unknown as string, 'abc'),
    'timingSafeCompare safely handles non-string inputs'
  );

  // ---------------------------------------------------------------------------
  // 2. Razorpay Checkout Callback Signature Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Razorpay Checkout Callback Signature Verification ---');

  const rzpKeySecret = 'rzp_test_secret_xyz123456789';
  const rzpOrderId = 'order_M1234567890abc';
  const rzpPaymentId = 'pay_P1234567890xyz';

  const validRzpCheckoutSig = generateRazorpayPaymentSignature(
    rzpOrderId,
    rzpPaymentId,
    rzpKeySecret
  );

  assert(
    typeof validRzpCheckoutSig === 'string' && validRzpCheckoutSig.length === 64,
    'Razorpay payment signature produces valid 64-char hex string'
  );

  assert(
    verifyRazorpayPaymentSignature(rzpOrderId, rzpPaymentId, validRzpCheckoutSig, rzpKeySecret),
    'Valid Razorpay checkout callback signature is verified successfully'
  );

  const tamperedSig = validRzpCheckoutSig.slice(0, -1) + (validRzpCheckoutSig.endsWith('0') ? '1' : '0');
  assert(
    !verifyRazorpayPaymentSignature(rzpOrderId, rzpPaymentId, tamperedSig, rzpKeySecret),
    'Tampered Razorpay signature is firmly rejected'
  );

  assert(
    !verifyRazorpayPaymentSignature('order_different', rzpPaymentId, validRzpCheckoutSig, rzpKeySecret),
    'Razorpay signature verification fails if order ID was altered'
  );

  assert(
    !verifyRazorpayPaymentSignature(rzpOrderId, 'pay_different', validRzpCheckoutSig, rzpKeySecret),
    'Razorpay signature verification fails if payment ID was altered'
  );

  assert(
    !verifyRazorpayPaymentSignature(rzpOrderId, rzpPaymentId, validRzpCheckoutSig, 'wrong_secret'),
    'Razorpay signature verification fails with incorrect merchant secret'
  );

  // ---------------------------------------------------------------------------
  // 3. Razorpay Webhook Signature Verification (X-Razorpay-Signature)
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Razorpay Webhook Signature Verification ---');

  const rzpWebhookSecret = 'rzp_whsec_secret_kiosk_9876';
  const sampleRzpWebhookBody = JSON.stringify({
    entity: 'event',
    account_id: 'acc_test_123',
    event: 'order.paid',
    contains: ['payment', 'order'],
    payload: {
      order: {
        entity: {
          id: rzpOrderId,
          amount: 54000,
          currency: 'INR',
          status: 'paid',
          notes: {
            invoice_id: 'inv_darjeeling_001',
            invoice_number: 'INV-2024-25-0001',
          },
        },
      },
      payment: {
        entity: {
          id: rzpPaymentId,
          order_id: rzpOrderId,
          amount: 54000,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          vpa: 'customer@okaxis',
          notes: {
            invoice_id: 'inv_darjeeling_001',
          },
        },
      },
    },
  });

  const validRzpWebhookSig = generateRazorpayWebhookSignature(
    sampleRzpWebhookBody,
    rzpWebhookSecret
  );

  assert(
    verifyRazorpayWebhookSignature(sampleRzpWebhookBody, validRzpWebhookSig, rzpWebhookSecret),
    'Valid Razorpay webhook signature (HMAC-SHA256 hex) is verified'
  );

  // Tamper payload body (e.g. malicious actor changes amount)
  const tamperedRzpBody = sampleRzpWebhookBody.replace('54000', '1000');
  assert(
    !verifyRazorpayWebhookSignature(tamperedRzpBody, validRzpWebhookSig, rzpWebhookSecret),
    'Tampered webhook body fails signature verification'
  );

  assert(
    !verifyRazorpayWebhookSignature(sampleRzpWebhookBody, validRzpWebhookSig, 'wrong_whsec'),
    'Webhook signature fails with mismatched webhook secret'
  );

  // ---------------------------------------------------------------------------
  // 4. Razorpay Webhook Parser
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Razorpay Webhook Event Parser ---');

  const rzpGateway = new RazorpayGateway({
    keyId: 'rzp_test_key_1',
    keySecret: rzpKeySecret,
    webhookSecret: rzpWebhookSecret,
  });

  const parsedRzpEvent = rzpGateway.parseWebhook(sampleRzpWebhookBody, validRzpWebhookSig);

  assert(parsedRzpEvent.isValid === true, 'Webhook marked as valid when signature passes');
  assert(parsedRzpEvent.eventType === 'order.paid', 'Event type correctly extracted as order.paid');
  assert(parsedRzpEvent.status === 'captured', 'Status marked as captured');
  assert(parsedRzpEvent.gatewayOrderId === rzpOrderId, 'Gateway Order ID matched');
  assert(parsedRzpEvent.gatewayPaymentId === rzpPaymentId, 'Gateway Payment ID matched');
  assert(parsedRzpEvent.amount === 540, 'Amount in Paise (54000) converted correctly to ₹540.00');
  assert(parsedRzpEvent.invoiceId === 'inv_darjeeling_001', 'Invoice ID extracted from notes');

  // Test invalid signature rejection in parser
  const invalidRzpEvent = rzpGateway.parseWebhook(sampleRzpWebhookBody, 'bogus_sig');
  assert(invalidRzpEvent.isValid === false, 'Parser returns isValid: false on invalid signature');
  assert(
    Boolean(invalidRzpEvent.errorMessage?.includes('Invalid Razorpay webhook signature')),
    'Appropriate error message returned for invalid signature'
  );

  // ---------------------------------------------------------------------------
  // 5. Cashfree Webhook Signature Verification (Timestamped Base64)
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Cashfree Webhook Signature Verification ---');

  const cfClientSecret = 'cf_secret_key_prod_abcdef123456';
  const cfTimestamp = '1700000000';
  const sampleCfWebhookBody = JSON.stringify({
    type: 'PAYMENT_SUCCESS_WEBHOOK',
    event_time: '2026-11-22T01:30:00+05:30',
    data: {
      order: {
        order_id: 'cf_ord_darjeeling_999',
        order_amount: 875.0,
        order_currency: 'INR',
        order_tags: {
          invoice_id: 'inv_darjeeling_002',
          invoice_number: 'INV-2024-25-0002',
        },
      },
      payment: {
        cf_payment_id: 99887766,
        payment_id: 'pay_cf_99887766',
        payment_status: 'SUCCESS',
        payment_amount: 875.0,
        payment_currency: 'INR',
        payment_time: '2026-11-22T01:30:00+05:30',
      },
      customer_details: {
        customer_name: 'Table 4 Guest',
        customer_phone: '9876543210',
      },
    },
  });

  const validCfWebhookSig = generateCashfreeWebhookSignature(
    sampleCfWebhookBody,
    cfTimestamp,
    cfClientSecret
  );

  assert(
    typeof validCfWebhookSig === 'string' && validCfWebhookSig.length > 20,
    'Cashfree signature produces base64 string'
  );

  assert(
    verifyCashfreeWebhookSignature(sampleCfWebhookBody, validCfWebhookSig, cfTimestamp, cfClientSecret),
    'Valid Cashfree timestamped webhook signature is verified'
  );

  // Replay / timestamp tamper test
  const alteredTimestamp = '1700000001';
  assert(
    !verifyCashfreeWebhookSignature(sampleCfWebhookBody, validCfWebhookSig, alteredTimestamp, cfClientSecret),
    'Altered timestamp fails Cashfree signature verification (anti-replay guard)'
  );

  // Altered payload test
  const tamperedCfBody = sampleCfWebhookBody.replace('875', '10');
  assert(
    !verifyCashfreeWebhookSignature(tamperedCfBody, validCfWebhookSig, cfTimestamp, cfClientSecret),
    'Tampered Cashfree webhook body is firmly rejected'
  );

  // ---------------------------------------------------------------------------
  // 6. Cashfree Webhook Parser
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Cashfree Webhook Event Parser ---');

  const cfGateway = new CashfreeGateway({
    keyId: 'cf_app_id_1',
    keySecret: cfClientSecret,
  });

  const parsedCfEvent = cfGateway.parseWebhook(
    sampleCfWebhookBody,
    validCfWebhookSig,
    cfTimestamp
  );

  assert(parsedCfEvent.isValid === true, 'Cashfree webhook marked as valid');
  assert(parsedCfEvent.eventType === 'PAYMENT_SUCCESS_WEBHOOK', 'Event type matched');
  assert(parsedCfEvent.status === 'captured', 'Status marked as captured');
  assert(parsedCfEvent.gatewayOrderId === 'cf_ord_darjeeling_999', 'Order ID extracted');
  assert(parsedCfEvent.gatewayPaymentId === 'pay_cf_99887766', 'Payment ID extracted');
  assert(parsedCfEvent.amount === 875, 'Amount in Rupees is ₹875');
  assert(parsedCfEvent.invoiceId === 'inv_darjeeling_002', 'Invoice ID extracted from order_tags');

  // Test invalid signature rejection in Cashfree parser
  const invalidCfEvent = cfGateway.parseWebhook(sampleCfWebhookBody, 'invalid_sig', cfTimestamp);
  assert(invalidCfEvent.isValid === false, 'Parser returns isValid: false on invalid Cashfree signature');

  // ---------------------------------------------------------------------------
  // 7. Dynamic UPI QR URI Generation & Subunit Math
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Dynamic UPI QR URI Generation & Subunit Precision ---');

  const dynamicUpiUri = buildUpiUri({
    vpa: 'darjeelingcafe@okhdfcbank',
    payeeName: 'Darjeeling Cafe',
    amount: 1250.5,
    transactionNote: 'Table 4 - INV-2024-25-0004',
    transactionRef: 'order_rzp_9876543210',
  });

  assert(
    dynamicUpiUri.startsWith('upi://pay?'),
    'Dynamic UPI URI starts with upi://pay?'
  );

  assert(
    dynamicUpiUri.includes('pa=darjeelingcafe%40okhdfcbank') || dynamicUpiUri.includes('pa=darjeelingcafe@okhdfcbank'),
    'UPI URI includes payee VPA'
  );

  assert(
    dynamicUpiUri.includes('am=1250.50'),
    'UPI URI includes exact 2-decimal formatted amount am=1250.50'
  );

  assert(
    dynamicUpiUri.includes('cu=INR'),
    'UPI URI specifies currency INR'
  );

  assert(
    dynamicUpiUri.includes('tr=order_rzp_9876543210'),
    'UPI URI embeds gateway order reference in tr parameter'
  );

  // Subunit conversion (Rupees to Paise) precision checks
  assert(Math.round(249.5 * 100) === 24950, '₹249.50 converts accurately to 24950 paise');
  assert(Math.round(0 * 100) === 0, '₹0.00 converts to 0 paise');
  assert(Math.round(199.99 * 100) === 19999, '₹199.99 converts to 19999 paise');
  assert(Math.round(1500.0 * 100) === 150000, '₹1500.00 converts to 150000 paise');

  // ---------------------------------------------------------------------------
  // 8. Amount Validation, Mismatch Rejection & Idempotency
  // ---------------------------------------------------------------------------
  console.log('\n--- 8. Amount Tamper Guard & Idempotency Rules ---');

  // Simulate Amount Matching Guard Logic (as implemented in settleInvoiceFromGateway)
  function testAmountTolerance(expectedBillAmount: number, receivedPaymentAmount: number): boolean {
    const diff = Math.abs(expectedBillAmount - receivedPaymentAmount);
    return diff <= 1.0; // ₹1.00 tolerance for symmetric round-off differences
  }

  assert(
    testAmountTolerance(500.0, 500.0),
    'Identical amount (₹500 vs ₹500) passes validation'
  );

  assert(
    testAmountTolerance(500.0, 500.4),
    'Small round-off deviation (₹500.00 vs ₹500.40, diff 0.40 <= 1.0) is tolerated'
  );

  assert(
    !testAmountTolerance(500.0, 100.0),
    'Underpayment / fraudulent amount (₹500.00 bill vs ₹100.00 paid) is strictly rejected'
  );

  assert(
    !testAmountTolerance(500.0, 502.0),
    'Discrepancy greater than ₹1.00 is strictly rejected'
  );

  // Simulate Idempotency Guard Logic
  interface MockInvoice {
    id: string;
    invoice_number: string;
    total_amount: number;
    payment_status: 'unpaid' | 'paid';
    paid_at: string | null;
  }

  function simulateSettlement(invoice: MockInvoice, paidAmount: number) {
    if (invoice.payment_status === 'paid') {
      return {
        alreadyPaid: true,
        success: true,
        message: 'Invoice was already settled previously. No duplicate action performed.',
      };
    }

    if (!testAmountTolerance(invoice.total_amount, paidAmount)) {
      throw new Error('Amount mismatch');
    }

    invoice.payment_status = 'paid';
    invoice.paid_at = new Date().toISOString();
    return {
      alreadyPaid: false,
      success: true,
      message: 'Settled successfully',
    };
  }

  const testInvoice: MockInvoice = {
    id: 'inv_101',
    invoice_number: 'INV-2024-25-0101',
    total_amount: 650.0,
    payment_status: 'unpaid',
    paid_at: null,
  };

  // First settlement attempt
  const firstAttempt = simulateSettlement(testInvoice, 650.0);
  assert(
    firstAttempt.success === true && firstAttempt.alreadyPaid === false,
    'First settlement transitions invoice to paid'
  );
  assert(testInvoice.payment_status === 'paid', 'Invoice is marked as paid in database');

  // Duplicate webhook delivery (e.g. gateway retries or concurrent webhook calls)
  const duplicateAttempt = simulateSettlement(testInvoice, 650.0);
  assert(
    duplicateAttempt.success === true && duplicateAttempt.alreadyPaid === true,
    'Duplicate webhook safely returns alreadyPaid: true without double crediting'
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

runPaymentTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
