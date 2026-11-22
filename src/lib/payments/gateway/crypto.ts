/**
 * TableQR Payment Cryptographic Utilities
 * 
 * Implements HMAC-SHA256 verification and timing-safe equality checks
 * for Razorpay and Cashfree client callbacks and webhook events.
 */

import crypto from 'crypto';

/**
 * Timing-safe string comparison to protect against timing attacks
 */
export function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

// =============================================================================
// RAZORPAY CRYPTOGRAPHIC HELPERS
// =============================================================================

/**
 * Computes Razorpay checkout payment signature:
 * HMAC_SHA256(order_id + "|" + razorpay_payment_id, key_secret)
 */
export function generateRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
}

/**
 * Verifies Razorpay checkout callback signature
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  const expected = generateRazorpayPaymentSignature(orderId, paymentId, secret);
  return timingSafeCompare(expected, signature);
}

/**
 * Computes Razorpay webhook signature:
 * HMAC_SHA256(raw_body, webhook_secret)
 */
export function generateRazorpayWebhookSignature(
  rawBody: string,
  webhookSecret: string
): string {
  return crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');
}

/**
 * Verifies X-Razorpay-Signature from webhook header
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string,
  webhookSecret: string
): boolean {
  if (!rawBody || !signature || !webhookSecret) {
    return false;
  }
  const expected = generateRazorpayWebhookSignature(rawBody, webhookSecret);
  return timingSafeCompare(expected, signature);
}

// =============================================================================
// CASHFREE CRYPTOGRAPHIC HELPERS
// =============================================================================

/**
 * Computes Cashfree webhook signature:
 * HMAC_SHA256(timestamp + raw_body, client_secret) in base64
 */
export function generateCashfreeWebhookSignature(
  rawBody: string,
  timestamp: string,
  clientSecret: string
): string {
  const payload = timestamp ? `${timestamp}${rawBody}` : rawBody;
  return crypto
    .createHmac('sha256', clientSecret)
    .update(payload)
    .digest('base64');
}

/**
 * Verifies x-webhook-signature from Cashfree webhook header
 */
export function verifyCashfreeWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string = '',
  clientSecret: string
): boolean {
  if (!rawBody || !signature || !clientSecret) {
    return false;
  }
  const expected = generateCashfreeWebhookSignature(rawBody, timestamp, clientSecret);
  return timingSafeCompare(expected, signature);
}
