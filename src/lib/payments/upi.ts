/**
 * TableQR UPI Payment Integration Utilities
 * 
 * Spec compliant UPI deep link & QR generator:
 * Format: upi://pay?pa={vpa}&pn={payeeName}&am={amount}&cu=INR&tn={transactionNote}&tr={refId}
 */

import QRCode from 'qrcode';

export interface UpiPaymentParams {
  vpa: string;                 // Virtual Payment Address (e.g. cafe.darjeeling@okaxis)
  payeeName: string;           // Merchant / Cafe name
  amount: number;              // Exact amount in INR
  transactionNote?: string;    // e.g. "Table 4 Bill #TQR/2026-27/0001"
  transactionRef?: string;     // Unique ref (e.g. invoice id or order id)
}

/**
 * Builds the official NPCI standard UPI deep-link URI
 */
export function buildUpiUri(params: UpiPaymentParams): string {
  const { vpa, payeeName, amount, transactionNote, transactionRef } = params;

  // Format amount to exact 2 decimal places as required by UPI spec
  const formattedAmount = Number(amount).toFixed(2);

  const queryParams = new URLSearchParams();
  queryParams.set('pa', vpa.trim());
  queryParams.set('pn', payeeName.trim());
  queryParams.set('am', formattedAmount);
  queryParams.set('cu', 'INR');

  if (transactionNote) {
    queryParams.set('tn', transactionNote.slice(0, 80)); // Max 80 chars
  }

  if (transactionRef) {
    queryParams.set('tr', transactionRef.slice(0, 35)); // Max 35 chars alphanumeric
  }

  return `upi://pay?${queryParams.toString()}`;
}

/**
 * Generates high-contrast QR code as PNG Data URL for display on screen
 */
export async function generateUpiQrDataUrl(
  upiUri: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const width = options?.width || 280;
  const margin = options?.margin !== undefined ? options?.margin : 2;

  try {
    return await QRCode.toDataURL(upiUri, {
      width,
      margin,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827', // Crisp dark gray/black
        light: '#FFFFFF',
      },
    });
  } catch (error) {
    console.error('Failed to generate UPI QR code:', error);
    throw new Error('Could not generate UPI QR code');
  }
}

/**
 * Generates vector SVG QR code string for crisp printing on 80mm thermal printers
 */
export async function generateUpiQrSvg(
  upiUri: string,
  options?: { width?: number; margin?: number }
): Promise<string> {
  const width = options?.width || 200;
  const margin = options?.margin !== undefined ? options?.margin : 1;

  try {
    return await QRCode.toString(upiUri, {
      type: 'svg',
      width,
      margin,
      errorCorrectionLevel: 'M',
    });
  } catch (error) {
    console.error('Failed to generate UPI QR SVG:', error);
    throw new Error('Could not generate UPI QR SVG');
  }
}
