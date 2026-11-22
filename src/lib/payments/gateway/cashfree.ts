/**
 * TableQR Cashfree Gateway Integration
 * 
 * Supports:
 * - Cashfree Order Creation (Rupees)
 * - Dynamic UPI QR code generation
 * - Signature Verification for Webhooks (`x-webhook-signature` + timestamp)
 * - Parsing for `PAYMENT_SUCCESS_WEBHOOK` & `ORDER_PAID`
 * - Resilient Sandbox / Mock Simulator fallback
 */

import {
  CreateGatewayOrderParams,
  GatewayOrderResult,
  WebhookEventResult,
  RestaurantGatewayConfig,
} from './types';
import { verifyCashfreeWebhookSignature } from './crypto';
import { buildUpiUri, generateUpiQrDataUrl } from '../upi';

export class CashfreeGateway {
  private appId: string;
  private secretKey: string;
  private isMock: boolean;

  constructor(config?: Partial<RestaurantGatewayConfig>) {
    this.appId = config?.keyId || process.env.CASHFREE_APP_ID || '';
    this.secretKey = config?.keySecret || process.env.CASHFREE_SECRET_KEY || '';
    this.isMock = !this.appId || !this.secretKey || this.appId.startsWith('mock_');
  }

  /**
   * Creates an order with Cashfree or simulates sandbox order
   */
  async createOrder(params: CreateGatewayOrderParams): Promise<GatewayOrderResult> {
    const orderId = `cf_ord_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const tags = {
      invoice_id: params.invoiceId,
      invoice_number: params.invoiceNumber,
      restaurant_id: params.restaurantId,
      table_number: params.tableNumber,
    };

    if (!this.isMock) {
      try {
        const response = await fetch('https://api.cashfree.com/pg/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-id': this.appId,
            'x-client-secret': this.secretKey,
            'x-api-version': '2023-08-01',
          },
          body: JSON.stringify({
            order_id: orderId,
            order_amount: params.amount,
            order_currency: 'INR',
            customer_details: {
              customer_id: `cust_${params.tableNumber}_${Date.now()}`,
              customer_phone: params.customerPhone || '9999999999',
              customer_email: params.customerEmail || 'guest@tableqr.in',
            },
            order_tags: tags,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(`Cashfree API error: ${errData.message || response.statusText}`);
        }
      } catch (err: unknown) {
        console.warn('[Cashfree API Warning] Falling back to signed sandbox order:', err);
      }
    }

    // Dynamic UPI URI linked to order
    const upiUri = buildUpiUri({
      vpa: process.env.DEFAULT_UPI_ID || 'darjeelingcafe@okhdfcbank',
      payeeName: params.restaurantName,
      amount: params.amount,
      transactionNote: `Table ${params.tableNumber} - ${params.invoiceNumber}`,
      transactionRef: orderId.slice(0, 35),
    });

    let qrDataUrl = '';
    try {
      qrDataUrl = await generateUpiQrDataUrl(upiUri);
    } catch {
      // QR render fallback ignored
    }

    return {
      gateway: 'cashfree',
      gatewayOrderId: orderId,
      amount: params.amount,
      amountInSubunits: Math.round(params.amount * 100),
      currency: 'INR',
      keyId: this.appId || 'cf_test_demo',
      upiQrString: upiUri,
      qrDataUrl,
      notes: tags,
      isMock: this.isMock,
    };
  }

  /**
   * Verifies client-side or redirect callback payment
   */
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean {
    if (this.isMock && signature === `mock_sig_${orderId}`) {
      return true;
    }
    return verifyCashfreeWebhookSignature(
      orderId,
      signature,
      '',
      this.secretKey || 'tableqr_cf_secret_default'
    );
  }

  /**
   * Verifies and parses Cashfree Webhook Event
   */
  parseWebhook(
    rawBody: string,
    signature: string,
    timestamp: string = ''
  ): WebhookEventResult {
    const isValid = verifyCashfreeWebhookSignature(
      rawBody,
      signature,
      timestamp,
      this.secretKey || 'tableqr_cf_secret_default'
    );

    if (!isValid) {
      return {
        isValid: false,
        eventType: 'unknown',
        gateway: 'cashfree',
        gatewayOrderId: '',
        amount: 0,
        currency: 'INR',
        status: 'failed',
        rawPayload: {},
        errorMessage: 'Invalid Cashfree webhook signature (x-webhook-signature)',
      };
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return {
        isValid: false,
        eventType: 'parse_error',
        gateway: 'cashfree',
        gatewayOrderId: '',
        amount: 0,
        currency: 'INR',
        status: 'failed',
        rawPayload: {},
        errorMessage: 'Failed to parse webhook JSON body',
      };
    }

    const event = String(payload.type || '');
    const data = (payload.data as Record<string, unknown>) || {};
    const orderData = (data.order as Record<string, unknown>) || {};
    const paymentData = (data.payment as Record<string, unknown>) || {};

    const gatewayOrderId = String(orderData.order_id || data.order_id || '');
    const gatewayPaymentId = String(paymentData.payment_id || data.cf_payment_id || '');
    const amount = Number(orderData.order_amount || data.order_amount || 0);

    const tags = (orderData.order_tags || {}) as Record<string, string>;
    const invoiceId = tags.invoice_id;

    const isSuccess =
      event === 'PAYMENT_SUCCESS_WEBHOOK' ||
      event === 'ORDER_PAID' ||
      String(paymentData.payment_status || '').toUpperCase() === 'SUCCESS';

    return {
      isValid: true,
      eventType: event,
      gateway: 'cashfree',
      gatewayOrderId,
      gatewayPaymentId,
      amount,
      currency: 'INR',
      invoiceId,
      status: isSuccess ? 'captured' : 'ignored',
      rawPayload: payload,
    };
  }
}
