/**
 * TableQR Payment Gateway Unified Types (Razorpay & Cashfree)
 */

export type PaymentGatewayProvider = 'razorpay' | 'cashfree' | 'mock';

export interface CreateGatewayOrderParams {
  amount: number;               // In INR (e.g. 540.00)
  currency?: string;            // Default 'INR'
  invoiceNumber: string;        // e.g. "TQR/2026-27/0042"
  invoiceId: string;
  restaurantId: string;
  restaurantName: string;
  tableNumber: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  notes?: Record<string, string>;
}

export interface GatewayOrderResult {
  gateway: PaymentGatewayProvider;
  gatewayOrderId: string;
  amount: number;               // In INR
  amountInSubunits: number;     // e.g. Paise for Razorpay (amount * 100)
  currency: string;
  keyId: string;
  upiQrString?: string;
  qrDataUrl?: string;
  paymentLink?: string;
  notes?: Record<string, string>;
  isMock?: boolean;
}

export interface VerifyPaymentParams {
  orderId: string;
  paymentId: string;
  signature: string;
  secret: string;
}

export interface WebhookVerificationParams {
  rawBody: string;
  signature: string;
  webhookSecret: string;
  timestamp?: string;           // Used by Cashfree
}

export interface WebhookEventResult {
  isValid: boolean;
  eventType: string;
  gateway: PaymentGatewayProvider;
  gatewayOrderId: string;
  gatewayPaymentId?: string;
  amount: number;               // In INR
  currency: string;
  invoiceId?: string;
  status: 'captured' | 'failed' | 'ignored';
  rawPayload: Record<string, unknown>;
  errorMessage?: string;
}

export interface RestaurantGatewayConfig {
  provider: PaymentGatewayProvider;
  keyId?: string | null;
  keySecret?: string | null;
  webhookSecret?: string | null;
  isEnabled: boolean;
  upiId?: string | null;
}
