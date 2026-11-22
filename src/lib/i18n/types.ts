/**
 * TableQR Internationalization (i18n) Type Definitions
 * 
 * Supports English, Hindi (हिन्दी), and Bengali (বাংলা).
 */

export type Language = 'en' | 'hi' | 'bn';

export interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', flag: '🇮🇳' },
];

export interface TranslationDictionary {
  // Common UI
  tableNumber: string;
  searchPlaceholder: string;
  vegOnly: string;
  allDietary: string;
  veg: string;
  nonVeg: string;
  bestseller: string;
  soldOut: string;
  customizable: string;
  currency: string;
  loading: string;
  close: string;
  back: string;
  cancel: string;
  confirm: string;
  save: string;
  copied: string;
  error: string;

  // Actions
  callWaiter: string;
  callWaiterSending: string;
  callWaiterSent: string;
  callWaiterPrompt: string;
  requestBill: string;
  requestBillSending: string;
  requestBillSent: string;
  viewBill: string;
  addToCart: string;
  add: string;
  added: string;

  // Cart
  cartTitle: string;
  cartEmpty: string;
  cartEmptyDesc: string;
  cookingRequestPlaceholder: string;
  orderNotePlaceholder: string;
  orderNoteLabel: string;
  placeOrder: string;
  placingOrder: string;
  itemCount: string;
  viewCart: string;

  // Live Orders
  ordersTitle: string;
  noActiveOrders: string;
  noActiveOrdersDesc: string;
  orderPlaced: string;
  orderStatusNew: string;
  orderStatusCooking: string;
  orderStatusReady: string;
  orderStatusServed: string;
  orderRound: string;

  // Bill & Payments
  billTitle: string;
  taxInvoice: string;
  itemizedSummary: string;
  subtotal: string;
  discount: string;
  serviceCharge: string;
  cgst: string;
  sgst: string;
  roundOff: string;
  totalPayable: string;
  payWithUpi: string;
  payNowGateway: string;
  scanUpiQr: string;
  payWithAnyApp: string;
  billPaidSuccess: string;
  billAlreadySettled: string;
  orderRef: string;
  invoiceNumber: string;

  // WhatsApp Sharing
  shareOnWhatsApp: string;
  sendBillToPhone: string;
  enterMobileNumber: string;
  sendWhatsAppBill: string;
  copyBillText: string;
  billCopied: string;

  // PWA Install
  installAppTitle: string;
  installAppDesc: string;
  installButton: string;
  dismiss: string;
}
