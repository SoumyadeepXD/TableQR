/**
 * TableQR Comprehensive Dictionaries for English, Hindi, and Bengali
 */

import { Language, TranslationDictionary } from './types';

export const translations: Record<Language, TranslationDictionary> = {
  en: {
    // Common UI
    tableNumber: 'Table',
    searchPlaceholder: 'Search dishes, drinks, desserts...',
    vegOnly: 'Veg Only',
    allDietary: 'All Items',
    veg: 'Veg',
    nonVeg: 'Non-Veg',
    bestseller: 'Bestseller',
    soldOut: 'Sold Out',
    customizable: 'Customizable',
    currency: '₹',
    loading: 'Loading...',
    close: 'Close',
    back: 'Back',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    copied: 'Copied to clipboard!',
    error: 'Something went wrong',

    // Actions
    callWaiter: 'Call Waiter',
    callWaiterSending: 'Calling Waiter...',
    callWaiterSent: 'Waiter has been alerted!',
    callWaiterPrompt: 'Need assistance or water? Our staff will attend to your table shortly.',
    requestBill: 'Request Bill',
    requestBillSending: 'Requesting Bill...',
    requestBillSent: 'Bill requested! Staff notified.',
    viewBill: 'View Bill & Pay',
    addToCart: 'Add to Cart',
    add: 'ADD',
    added: 'Added',

    // Cart
    cartTitle: 'Your Cart',
    cartEmpty: 'Your cart is empty',
    cartEmptyDesc: 'Delicious dishes await! Explore the menu and tap ADD.',
    cookingRequestPlaceholder: 'Special cooking instructions (e.g. less spicy, extra crisp)...',
    orderNotePlaceholder: 'Add a note for this round of order (optional)...',
    orderNoteLabel: 'Order Note for Kitchen',
    placeOrder: 'Place Order',
    placingOrder: 'Sending to Kitchen...',
    itemCount: 'items',
    viewCart: 'View Cart',

    // Live Orders
    ordersTitle: 'Live Kitchen Orders',
    noActiveOrders: 'No orders placed yet',
    noActiveOrdersDesc: 'Your orders will appear here with live preparation tracking.',
    orderPlaced: 'Order Sent',
    orderStatusNew: 'Order Received',
    orderStatusCooking: 'Cooking in Kitchen',
    orderStatusReady: 'Ready for Serving',
    orderStatusServed: 'Served at Table',
    orderRound: 'Round',

    // Bill & Payments
    billTitle: 'Table Bill & Tax Invoice',
    taxInvoice: 'TAX INVOICE',
    itemizedSummary: 'Itemized Order Summary',
    subtotal: 'Items Subtotal',
    discount: 'Offer Discount',
    serviceCharge: 'Staff Service Charge',
    cgst: 'Central GST (CGST)',
    sgst: 'State GST (SGST)',
    roundOff: 'Round-off',
    totalPayable: 'Total Payable Amount',
    payWithUpi: 'Pay via UPI App',
    payNowGateway: 'Auto-Confirm UPI (Gateway)',
    scanUpiQr: 'Scan with GPay, PhonePe or Paytm',
    payWithAnyApp: 'Instant deep-link for your phone',
    billPaidSuccess: 'Payment Confirmed & Settled!',
    billAlreadySettled: 'This table bill has already been settled.',
    orderRef: 'Order Ref',
    invoiceNumber: 'Invoice #',

    // WhatsApp Sharing
    shareOnWhatsApp: 'Share Bill on WhatsApp',
    sendBillToPhone: 'Send Bill to Phone',
    enterMobileNumber: 'Enter 10-digit mobile number',
    sendWhatsAppBill: 'Send on WhatsApp',
    copyBillText: 'Copy Receipt Text',
    billCopied: 'Bill receipt copied to clipboard!',

    // PWA Install
    installAppTitle: 'Install TableQR App',
    installAppDesc: 'Add to your Home Screen for lightning-fast contactless dine-in ordering.',
    installButton: 'Install App',
    dismiss: 'Not Now',
  },

  hi: {
    // Common UI
    tableNumber: 'टेबल',
    searchPlaceholder: 'व्यंजन, चाय, पेय खोजें...',
    vegOnly: 'केवल शाकाहारी',
    allDietary: 'सभी व्यंजन',
    veg: 'शाकाहारी',
    nonVeg: 'मांसाहारी',
    bestseller: 'लोकप्रिय',
    soldOut: 'समाप्त (उपलब्ध नहीं)',
    customizable: 'अनुकूलन योग्य',
    currency: '₹',
    loading: 'लोड हो रहा है...',
    close: 'बंद करें',
    back: 'वापस',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    save: 'सहेजें',
    copied: 'कॉपी कर लिया गया!',
    error: 'कुछ गड़बड़ हुई',

    // Actions
    callWaiter: 'वेटर को बुलाएँ',
    callWaiterSending: 'वेटर को सूचित कर रहे हैं...',
    callWaiterSent: 'वेटर को सूचित कर दिया गया है!',
    callWaiterPrompt: 'पानी या सहायता चाहिए? कर्मचारी जल्द आपकी टेबल पर पहुँचेंगे।',
    requestBill: 'बिल माँगें',
    requestBillSending: 'बिल माँगा जा रहा है...',
    requestBillSent: 'बिल माँगा गया! कैशियर को सूचना भेज दी गई है।',
    viewBill: 'बिल देखें और भुगतान करें',
    addToCart: 'कार्ट में जोड़ें',
    add: 'जोड़ें',
    added: 'जोड़ा गया',

    // Cart
    cartTitle: 'आपकी थाली / कार्ट',
    cartEmpty: 'आपकी कार्ट खाली है',
    cartEmptyDesc: 'स्वादिष्ट व्यंजन आपका इंतज़ार कर रहे हैं! मेनू से चुनें।',
    cookingRequestPlaceholder: 'पकाने का निर्देश (उदा. कम तीखा, अधिक कुरकुरा)...',
    orderNotePlaceholder: 'रसोईघर के लिए कोई विशेष निर्देश (वैकल्पिक)...',
    orderNoteLabel: 'रसोईघर के लिए निर्देश',
    placeOrder: 'ऑर्डर दें',
    placingOrder: 'रसोई में भेजा जा रहा है...',
    itemCount: 'आइटम',
    viewCart: 'कार्ट देखें',

    // Live Orders
    ordersTitle: 'रसोईघर में ऑर्डर की स्थिति',
    noActiveOrders: 'अभी तक कोई ऑर्डर नहीं दिया गया',
    noActiveOrdersDesc: 'आपके द्वारा दिए गए ऑर्डर यहाँ लाइव दिखेंगे।',
    orderPlaced: 'ऑर्डर भेजा गया',
    orderStatusNew: 'ऑर्डर प्राप्त हुआ',
    orderStatusCooking: 'पकाया जा रहा है',
    orderStatusReady: 'परोसने के लिए तैयार',
    orderStatusServed: 'टेबल पर परोसा गया',
    orderRound: 'दौर (राउंड)',

    // Bill & Payments
    billTitle: 'टेबल बिल एवं कर इनवॉइस',
    taxInvoice: 'कर बीजक (TAX INVOICE)',
    itemizedSummary: 'व्यंजनों का विवरण',
    subtotal: 'उप-योग (सबटोटल)',
    discount: 'छूट (डिस्काउंट)',
    serviceCharge: 'सर्विस चार्ज',
    cgst: 'केंद्रीय जीएसटी (CGST)',
    sgst: 'राज्य जीएसटी (SGST)',
    roundOff: 'राउंड-ऑफ',
    totalPayable: 'कुल देय राशि',
    payWithUpi: 'UPI ऐप से भुगतान करें',
    payNowGateway: 'गेटवे द्वारा तुरंत UPI भुगतान',
    scanUpiQr: 'GPay, PhonePe या Paytm से स्कैन करें',
    payWithAnyApp: 'सीधे अपने फोन के UPI ऐप से भुगतान करें',
    billPaidSuccess: 'भुगतान सफल और बिल चुकता हो गया!',
    billAlreadySettled: 'इस टेबल का बिल पहले ही भरा जा चुका है।',
    orderRef: 'ऑर्डर संदर्भ',
    invoiceNumber: 'इनवॉइस संख्या',

    // WhatsApp Sharing
    shareOnWhatsApp: 'व्हाट्सएप पर बिल भेजें',
    sendBillToPhone: 'फोन पर बिल मँगवाएँ',
    enterMobileNumber: '10 अंकों का मोबाइल नंबर दर्ज करें',
    sendWhatsAppBill: 'व्हाट्सएप पर भेजें',
    copyBillText: 'रसीद कॉपी करें',
    billCopied: 'बिल की रसीद कॉपी हो गई!',

    // PWA Install
    installAppTitle: 'TableQR ऐप इंस्टॉल करें',
    installAppDesc: 'बिना कतार त्वरित ऑर्डर के लिए होम स्क्रीन पर जोड़ें।',
    installButton: 'ऐप इंस्टॉल करें',
    dismiss: 'अभी नहीं',
  },

  bn: {
    // Common UI
    tableNumber: 'টেবিল',
    searchPlaceholder: 'খাবার, চা, পানীয় খুঁজুন...',
    vegOnly: 'শুধুমাত্র নিরামিষ',
    allDietary: 'সব খাবার',
    veg: 'নিরামিষ',
    nonVeg: 'আমিষ',
    bestseller: 'জনপ্রিয়',
    soldOut: 'শেষ হয়ে গেছে',
    customizable: 'কাস্টমাইজ করুন',
    currency: '₹',
    loading: 'লোড হচ্ছে...',
    close: 'বন্ধ করুন',
    back: 'পেছনে',
    cancel: 'বাতিল',
    confirm: 'নিশ্চিত করুন',
    save: 'সংরক্ষণ করুন',
    copied: 'ক্লিপবোর্ডে কপি করা হয়েছে!',
    error: 'কিছু ভুল হয়েছে',

    // Actions
    callWaiter: 'ওয়েটার ডাকুন',
    callWaiterSending: 'ওয়েটারকে খবর দেওয়া হচ্ছে...',
    callWaiterSent: 'ওয়েটারকে খবর দেওয়া হয়েছে!',
    callWaiterPrompt: 'জল বা কোনো সাহায্য দরকার? আমাদের কর্মী শীঘ্রই আপনার টেবিলে আসছেন।',
    requestBill: 'বিল চান',
    requestBillSending: 'বিল চাওয়া হচ্ছে...',
    requestBillSent: 'বিল চাওয়া হয়েছে! ক্যাশিয়ারকে জানানো হয়েছে।',
    viewBill: 'বিল দেখুন ও দিন',
    addToCart: 'ব্যাগে যোগ করুন',
    add: 'যোগ করুন',
    added: 'যোগ হয়েছে',

    // Cart
    cartTitle: 'আপনার অর্ডার ব্যাগ',
    cartEmpty: 'আপনার ব্যাগ খালি',
    cartEmptyDesc: 'সুস্বাদু পদ আপনার অপেক্ষায়! মেনু দেখে যোগ করুন।',
    cookingRequestPlaceholder: 'রান্নার বিশেষ নির্দেশ (যেমন: কম ঝাল, বেশি মুচমুচে)...',
    orderNotePlaceholder: 'এই অর্ডারের জন্য বিশেষ কোনো নির্দেশ (ঐচ্ছিক)...',
    orderNoteLabel: 'রান্নাঘরের জন্য বিশেষ নির্দেশ',
    placeOrder: 'অর্ডার পাঠান',
    placingOrder: 'রান্নাঘরে পাঠানো হচ্ছে...',
    itemCount: 'টি পদ',
    viewCart: 'ব্যাগ দেখুন',

    // Live Orders
    ordersTitle: 'রান্নাঘরে অর্ডারের স্থিতি',
    noActiveOrders: 'এখনও কোনো অর্ডার দেওয়া হয়নি',
    noActiveOrdersDesc: 'আপনার অর্ডারের অগ্রগতি এখানে সরাসরি দেখতে পাবেন।',
    orderPlaced: 'অর্ডার পাঠানো হয়েছে',
    orderStatusNew: 'অর্ডার গৃহীত',
    orderStatusCooking: 'রান্না হচ্ছে',
    orderStatusReady: 'পরিবেশনের জন্য প্রস্তুত',
    orderStatusServed: 'টেবিলে পরিবেশিত',
    orderRound: 'রাউন্ড',

    // Bill & Payments
    billTitle: 'টেবিল বিল ও কর চালান',
    taxInvoice: 'ট্যাক্স চালান (TAX INVOICE)',
    itemizedSummary: 'খাবারের বিস্তারিত তালিকা',
    subtotal: 'মোট মূল্য (সাবটোটাল)',
    discount: 'অফার ছাড়',
    serviceCharge: 'সার্ভিস চার্জ',
    cgst: 'কেন্দ্রীয় জিএসটি (CGST)',
    sgst: 'রাজ্য জিএসটি (SGST)',
    roundOff: 'রাউন্ড-অফ',
    totalPayable: 'মোট প্রদেয় টাকা',
    payWithUpi: 'UPI অ্যাপ দিয়ে দিন',
    payNowGateway: 'অনলাইন গেটওয়ে দিয়ে দ্রুত দিন',
    scanUpiQr: 'GPay, PhonePe বা Paytm দিয়ে স্ক্যান করুন',
    payWithAnyApp: 'আপনার ফোনের যেকোনো UPI অ্যাপ দিয়ে সরাসরি দিন',
    billPaidSuccess: 'পেমেন্ট সফল ও বিল পরিশোধিত হয়েছে!',
    billAlreadySettled: 'এই টেবিলের বিল আগেই পরিশোধ করা হয়েছে।',
    orderRef: 'অর্ডার রেফারেন্স',
    invoiceNumber: 'চালান নং',

    // WhatsApp Sharing
    shareOnWhatsApp: 'হোয়াটসঅ্যাপে বিল শেয়ার করুন',
    sendBillToPhone: 'ফোনে বিল পান',
    enterMobileNumber: '১০ সংখ্যার মোবাইল নম্বর লিখুন',
    sendWhatsAppBill: 'হোয়াটসঅ্যাপে পাঠান',
    copyBillText: 'রসিদ কপি করুন',
    billCopied: 'বিলের রসিদ ক্লিপবোর্ডে কপি হয়েছে!',

    // PWA Install
    installAppTitle: 'TableQR অ্যাপ ইনস্টল করুন',
    installAppDesc: 'দ্রুত ও সহজে অর্ডার করতে আপনার হোম স্ক্রিনে যুক্ত করুন।',
    installButton: 'অ্যাপ যুক্ত করুন',
    dismiss: 'এখন নয়',
  },
};

/**
 * Returns translation for a key, falling back to English if missing
 */
export function getTranslation(
  lang: Language,
  key: keyof TranslationDictionary,
  params?: Record<string, string | number>
): string {
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || String(key);

  if (params) {
    Object.entries(params).forEach(([paramKey, val]) => {
      text = text.replace(new RegExp(`{${paramKey}}`, 'g'), String(val));
    });
  }

  return text;
}
