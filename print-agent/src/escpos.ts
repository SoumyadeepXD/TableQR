/**
 * TableQR Pure ESC/POS Protocol Builder & Receipt Formatter
 * 
 * Standard 80mm thermal receipt specifications:
 * - Paper width: 80mm
 * - Printable width: 72mm (576 dots at 203 DPI)
 * - Font A (12x24): 48 columns per line
 * - Font B (9x17): 64 columns per line
 */

export interface KotItemPayload {
  itemName: string;
  quantity: number;
  variantName?: string | null;
  cookingRequest?: string | null;
  addons?: string[];
}

export interface KotPrintPayload {
  restaurantName: string;
  tableNumber: string;
  section: string;
  orderNumber: number;
  createdAt: string;
  customerNote?: string | null;
  isReprint?: boolean;
  items: KotItemPayload[];
}

export interface BillItemPayload {
  itemName: string;
  variantName?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  addons?: Array<{ name: string; price: number }>;
}

export interface BillPrintPayload {
  restaurant: {
    name: string;
    tagline?: string | null;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
    gstin?: string | null;
    fssai?: string | null;
    upiId?: string | null;
  };
  invoiceNumber?: string | null;
  tableNumber: string;
  section?: string | null;
  createdAt: string;
  items: BillItemPayload[];
  subtotal: number;
  discountAmount?: number;
  discountCode?: string | null;
  serviceChargeAmount?: number;
  serviceChargeRate?: number;
  cgstAmount: number;
  sgstAmount: number;
  roundOffAmount: number;
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string;
}

export class EscposBuilder {
  private buffer: number[] = [];
  private static readonly LINE_WIDTH = 48; // Font A 80mm standard

  constructor() {
    this.init();
  }

  /**
   * ESC @ - Initialize / reset printer
   */
  public init(): this {
    this.buffer.push(0x1b, 0x40);
    return this;
  }

  /**
   * ESC a n - Alignment (0: left, 1: center, 2: right)
   */
  public align(alignment: 'left' | 'center' | 'right'): this {
    const val = alignment === 'center' ? 1 : alignment === 'right' ? 2 : 0;
    this.buffer.push(0x1b, 0x61, val);
    return this;
  }

  /**
   * ESC E n - Bold / emphasized font
   */
  public bold(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x45, enable ? 1 : 0);
    return this;
  }

  /**
   * GS ! n - Text sizing (bit 4-7: width multiplier, bit 0-3: height multiplier)
   */
  public doubleSize(enable: boolean = true): this {
    // 0x11 = double width & height, 0x00 = normal
    this.buffer.push(0x1d, 0x21, enable ? 0x11 : 0x00);
    return this;
  }

  public doubleHeight(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x01 : 0x00);
    return this;
  }

  public doubleWidth(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x21, enable ? 0x10 : 0x00);
    return this;
  }

  /**
   * GS B n - Black/white reverse printing (inverted)
   */
  public invert(enable: boolean = true): this {
    this.buffer.push(0x1d, 0x42, enable ? 1 : 0);
    return this;
  }

  /**
   * ESC - n - Underline
   */
  public underline(enable: boolean = true): this {
    this.buffer.push(0x1b, 0x2d, enable ? 1 : 0);
    return this;
  }

  /**
   * Feed n lines
   */
  public feed(lines: number = 1): this {
    this.buffer.push(0x1b, 0x64, lines);
    return this;
  }

  /**
   * Append raw ASCII / UTF-8 text string
   */
  public text(str: string): this {
    const bytes = Buffer.from(str, 'utf8');
    for (const b of bytes) {
      this.buffer.push(b);
    }
    return this;
  }

  /**
   * Print string followed by LF (0x0A)
   */
  public line(str: string = ''): this {
    if (str) {
      this.text(str);
    }
    this.buffer.push(0x0a);
    return this;
  }

  /**
   * Horizontal divider line
   */
  public divider(char: string = '-', length: number = EscposBuilder.LINE_WIDTH): this {
    const lineStr = char.repeat(Math.min(length, EscposBuilder.LINE_WIDTH));
    return this.line(lineStr);
  }

  /**
   * Format two columns left-aligned and right-aligned across 48 chars
   */
  public twoColumn(left: string, right: string, width: number = EscposBuilder.LINE_WIDTH): this {
    const available = width - right.length;
    if (available < 1) {
      this.line(left);
      this.line(right.padStart(width, ' '));
      return this;
    }

    if (left.length <= available) {
      const padded = left.padEnd(available, ' ') + right;
      return this.line(padded);
    }

    // Wrap left if longer than available space
    const truncated = left.substring(0, available - 1) + ' ';
    return this.line(truncated + right);
  }

  /**
   * GS V m - Cut paper (full or partial)
   */
  public cut(partial: boolean = false): this {
    // Feed 3 lines before cut to clear printhead
    this.feed(3);
    // GS V 0x42 0x00 (partial cut with feed) or 0x00
    this.buffer.push(0x1d, 0x56, partial ? 0x01 : 0x00);
    return this;
  }

  /**
   * ESC p m t1 t2 - Cash drawer kick pulse
   */
  public drawerKick(pin: 0 | 1 = 0): this {
    // ESC p <pin> <on-time> <off-time>
    this.buffer.push(0x1b, 0x70, pin, 0x19, 0xfa);
    return this;
  }

  /**
   * Get raw binary buffer
   */
  public toBuffer(): Buffer {
    return Buffer.from(this.buffer);
  }

  // =========================================================================
  // HIGH-LEVEL ESC/POS TEMPLATES
  // =========================================================================

  /**
   * Builds an 80mm Kitchen Order Ticket (KOT)
   */
  public static buildKot(data: KotPrintPayload): Buffer {
    const b = new EscposBuilder();

    // 1. Header
    b.align('center')
      .bold(true)
      .line(data.restaurantName.toUpperCase())
      .bold(false)
      .line('*** KITCHEN ORDER ***');

    if (data.isReprint) {
      b.invert(true).bold(true).line(' *** REPRINT *** ').bold(false).invert(false);
    }

    b.align('left').divider('=');

    // 2. Table and Order Info
    b.bold(true)
      .doubleHeight(true)
      .twoColumn(`TABLE: ${data.tableNumber}`, `ORDER #${data.orderNumber}`)
      .doubleHeight(false)
      .bold(false);

    b.twoColumn(`SECTION: ${data.section.toUpperCase()}`, `DATE: ${data.createdAt.substring(0, 10)}`);
    b.twoColumn('SERVER: QR DINE-IN', `TIME: ${data.createdAt.substring(11, 19)}`);
    b.divider('-');

    // 3. Items List
    b.bold(true).line('QTY  ITEM DESCRIPTION').bold(false).divider('-');

    for (const it of data.items) {
      // Quantity + Item name in bold Font A
      b.bold(true).line(`[ ${it.quantity} ] ${it.itemName.toUpperCase()}`).bold(false);

      if (it.variantName) {
        b.line(`      * Portion: ${it.variantName}`);
      }

      if (it.addons && it.addons.length > 0) {
        for (const add of it.addons) {
          b.line(`      + ${add}`);
        }
      }

      // Highlighted cooking request in reverse print
      if (it.cookingRequest) {
        b.invert(true).bold(true).line(` >>> ${it.cookingRequest.toUpperCase()} <<< `).bold(false).invert(false);
      }

      b.line(); // spacing between items
    }

    // 4. Order Note
    if (data.customerNote) {
      b.divider('-');
      b.bold(true).line(`ORDER NOTE: ${data.customerNote.toUpperCase()}`).bold(false);
    }

    // 5. Footer & Cut
    b.divider('=');
    b.align('center')
      .line('*** END OF KOT ***')
      .line('TableQR Live Dispatch')
      .feed(2)
      .cut();

    return b.toBuffer();
  }

  /**
   * Builds an 80mm Tax Invoice & Customer Bill
   */
  public static buildBill(data: BillPrintPayload): Buffer {
    const b = new EscposBuilder();

    // 1. Restaurant Header
    b.align('center')
      .doubleWidth(true)
      .bold(true)
      .line(data.restaurant.name.toUpperCase())
      .doubleWidth(false)
      .bold(false);

    if (data.restaurant.tagline) {
      b.line(data.restaurant.tagline);
    }
    if (data.restaurant.address) {
      b.line(data.restaurant.address + (data.restaurant.city ? `, ${data.restaurant.city}` : ''));
    }
    if (data.restaurant.phone) {
      b.line(`Ph: ${data.restaurant.phone}`);
    }
    if (data.restaurant.gstin) {
      b.bold(true).line(`GSTIN: ${data.restaurant.gstin}`).bold(false);
    }
    if (data.restaurant.fssai) {
      b.line(`FSSAI Lic: ${data.restaurant.fssai}`);
    }

    b.bold(true).line('*** TAX INVOICE ***').bold(false);
    b.align('left').divider('=');

    // 2. Bill Meta
    b.twoColumn(`INV: ${data.invoiceNumber || 'PROVISIONAL'}`, `TABLE: ${data.tableNumber}`);
    b.twoColumn(`DATE: ${data.createdAt.substring(0, 10)}`, `TIME: ${data.createdAt.substring(11, 19)}`);
    if (data.section) {
      b.twoColumn(`SECTION: ${data.section.toUpperCase()}`, 'CHANNEL: QR DINE-IN');
    }
    b.divider('-');

    // 3. Items
    b.bold(true).twoColumn('QTY  ITEM', 'AMOUNT (INR)').bold(false).divider('-');

    for (const it of data.items) {
      const left = `${it.quantity}x ${it.itemName.toUpperCase()}`;
      const right = `Rs. ${it.lineTotal.toFixed(2)}`;
      b.twoColumn(left, right);

      if (it.variantName) {
        b.line(`    * ${it.variantName}`);
      }
      if (it.addons && it.addons.length > 0) {
        for (const add of it.addons) {
          b.line(`    + ${add.name} (Rs.${add.price})`);
        }
      }
    }

    // 4. Totals Breakdown
    b.divider('-');
    b.twoColumn('Items Subtotal:', `Rs. ${data.subtotal.toFixed(2)}`);

    if ((data.discountAmount || 0) > 0) {
      const discountLabel = data.discountCode ? `Discount (${data.discountCode}):` : 'Discount:';
      b.twoColumn(discountLabel, `-Rs. ${(data.discountAmount || 0).toFixed(2)}`);
    }

    if ((data.serviceChargeAmount || 0) > 0) {
      b.twoColumn(`Service Charge (${data.serviceChargeRate || 5}%):`, `Rs. ${(data.serviceChargeAmount || 0).toFixed(2)}`);
    }

    b.twoColumn('CGST:', `Rs. ${data.cgstAmount.toFixed(2)}`);
    b.twoColumn('SGST:', `Rs. ${data.sgstAmount.toFixed(2)}`);

    if (data.roundOffAmount !== 0) {
      const roSign = data.roundOffAmount > 0 ? '+' : '';
      b.twoColumn('Round-off:', `${roSign}Rs. ${data.roundOffAmount.toFixed(2)}`);
    }

    b.divider('=');

    // Grand Total in Double Size Bold
    b.bold(true)
      .doubleSize(true)
      .twoColumn('TOTAL:', `Rs. ${Math.round(data.totalAmount)}`)
      .doubleSize(false)
      .bold(false);

    b.divider('=');

    // 5. Payment Details
    b.align('center');
    if (data.paymentStatus === 'paid') {
      b.bold(true).line(`PAID IN FULL via ${data.paymentMethod?.toUpperCase() || 'UPI'}`).bold(false);
    } else {
      b.bold(true).line('PAYMENT PENDING').bold(false);
      if (data.restaurant.upiId) {
        b.line(`UPI ID: ${data.restaurant.upiId}`);
        b.line('Scan QR on Table or at Counter');
      }
    }

    b.line();
    b.line('Thank you for dining with us!');
    b.line('Please visit again');
    b.line('TableQR Dine-In OS');

    // Drawer kick & Cut
    b.feed(2)
      .drawerKick()
      .cut();

    return b.toBuffer();
  }

  /**
   * Simulator: Converts an ESC/POS binary buffer into a human-readable framed ASCII slip
   */
  public static renderAsciiSlip(buffer: Buffer): string {
    const raw = buffer.toString('utf8');
    // Strip control characters (0x00 to 0x1F except \n and spaces)
    // Replace cut sequences with a visible cut indicator
    const cleaned = raw
      .replace(/\x1d\x56[\x00\x01\x42]/g, '\n[=== PAPER CUT ===]\n')
      .replace(/\x1b\x70[\s\S]{3}/g, '\n[=== DRAWER KICK ===]\n')
      .replace(/[\x00-\x09\x0B-\x1F\x7F]/g, '');

    const lines = cleaned.split('\n');
    const width = 48;
    const border = '─'.repeat(width + 2);

    const framed = [
      `┌${border}┐`,
      ...lines.map((l) => {
        const trimmed = l.trimEnd();
        if (trimmed.includes('[=== PAPER CUT ===]')) {
          return `├${'─'.repeat(width + 2)}┤\n│  ✂ - - - - - - - - - CUT HERE - - - - - - - - - ✂  │`;
        }
        if (trimmed.includes('[=== DRAWER KICK ===]')) {
          return `│  ⚡ [CASH DRAWER PULSE TRIGGERED]                 │`;
        }
        return `│ ${trimmed.padEnd(width, ' ')} │`;
      }),
      `└${border}┘`,
    ];

    return framed.join('\n');
  }
}
