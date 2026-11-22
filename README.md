# TableQR (टैबल क्यूआर) 🇮🇳

**TableQR** is a multi-restaurant QR dine-in ordering and billing SaaS engineered specifically for cafes and restaurants in India. Customers scan a table QR code, browse a live menu, order food with zero login, and pay via UPI. The kitchen receives live order tickets (KOT) in real-time, cashiers manage settlements with sequential Indian Financial Year GST invoices, and owners get sales and operational analytics.

---

## ⚡ Tech Stack & Architecture

- **Frontend & Server**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend & Database**: Supabase (PostgreSQL 15+, Supabase Auth, Realtime publications, Row Level Security)
- **Deployment**: Vercel + Supabase
- **Indian Business Localization**:
  - Timezone: `Asia/Kolkata` (IST)
  - Currency: `INR` (`₹`) with Indian numbering grouping (Lakhs / Crores)
  - GST: Configurable 0%, 5%, 12%, 18% with equal CGST / SGST split and restaurant GSTIN
  - Invoices: Atomic sequential numbering per financial year (April 1 to March 31, e.g., `TQR/2026-27/0001`)
  - Payments: Instant UPI QR codes and deep links (`upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...`)

---

## 📁 Project Directory Structure

```
kiosk/
├── .env.example                     # Environment template
├── README.md                        # Documentation & setup guide
├── package.json
├── tsconfig.json
├── next.config.ts
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql  # 17 tables, Indian FY calculation, atomic sequence generator
│   │   └── 0002_rls_policies.sql    # Row Level Security (RLS) policies for multi-tenancy & public QR
│   └── seed.sql                     # SQL seed: 1 cafe, 12 tables, 25 items, variants, addons, offers
├── scripts/
│   └── seed.ts                      # Automated Node/TSX seed script (creates auth users + seeds DB)
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root layout
│   │   ├── globals.css              # Tailwind CSS styles
│   │   ├── page.tsx                 # Interactive TableQR launcher & status hub
│   │   ├── login/
│   │   │   └── page.tsx             # Staff portal login with 1-click demo autofill
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts         # Supabase Auth PKCE session exchange
│   │   ├── r/
│   │   │   └── [slug]/
│   │   │       └── t/
│   │   │           └── [tableToken]/
│   │   │               └── page.tsx # Customer table entrypoint (no login required)
│   │   ├── kitchen/
│   │   │   └── page.tsx             # Kitchen order ticket (KOT) live board
│   │   ├── cashier/
│   │   │   └── page.tsx             # Cashier POS, billing & UPI payment desk
│   │   └── admin/
│   │       └── page.tsx             # Owner & Manager console (menu, tables, offers)
│   ├── lib/
│   │   ├── formatters.ts            # INR currency, Indian numbers, IST datetime, Indian FY
│   │   ├── supabase/
│   │   │   ├── client.ts            # Browser client (@supabase/ssr)
│   │   │   ├── server.ts            # Server client with async cookies()
│   │   │   ├── admin.ts             # Service role client for server scripts
│   │   │   └── middleware.ts        # Session refresh & route protection helper
│   │   └── types/
│   │       └── database.ts          # Strongly typed PostgreSQL schema definitions
│   └── middleware.ts                # Next.js route protection & role redirection
```

---

## 🛠️ Getting Started & Local Setup

### 1. Clone & Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials from your Supabase Dashboard (**Project Settings** -> **API**):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Apply Database Migrations & Seed Data

You can apply the database schema and seed data using either of the following methods:

#### Method A: Direct SQL in Supabase Dashboard (Recommended)
1. Go to your **Supabase Dashboard** -> **SQL Editor**.
2. Run `supabase/migrations/0001_initial_schema.sql`.
3. Run `supabase/migrations/0002_rls_policies.sql`.
4. Run `supabase/seed.sql`.

#### Method B: Automated TypeScript Runner
If you have configured `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`:
```bash
npx tsx scripts/seed.ts
```

### 4. Run the Development Server
```bash
npm run dev
```

Visit [http://localhost:3001](http://localhost:3001) to open the TableQR launcher.

---

## 🍱 Demo Restaurant: "Darjeeling Chai & Cafe"

- **Slug**: `cafe-darjeeling`
- **Location**: Indiranagar, Bengaluru, Karnataka
- **UPI VPA**: `darjeelingcafe@okhdfcbank`
- **GSTIN**: `29AABCU9603R1ZM`

### Sample Customer QR Table Links
| Table | Section | Capacity | Test URL |
|---|---|---|---|
| **Table T-01** | Indoor AC Hall | 2 | `/r/cafe-darjeeling/t/tbl_t01_9d8e7a6b5c` |
| **Table T-02** | Indoor AC Hall | 2 | `/r/cafe-darjeeling/t/tbl_t02_1a2b3c4d5e` |
| **Table T-03** | Indoor AC Hall | 4 | `/r/cafe-darjeeling/t/tbl_t03_6f7e8d9c0b` |
| **Table T-07** | Garden Courtyard | 2 | `/r/cafe-darjeeling/t/tbl_t07_8d9e0a1b2c` |
| **Table T-10** | Garden Courtyard | 8 | `/r/cafe-darjeeling/t/tbl_t10_5b6c7d8e9f` |
| **Table T-11** | Balcony Sunset Deck | 2 | `/r/cafe-darjeeling/t/tbl_t11_0e1f2a3b4c` |

### Demo Staff Accounts
**Password for all demo accounts**: `TableQR@2026`

| Role | Email | Workspace | Description |
|---|---|---|---|
| **Owner** | `owner@tableqr.in` | `/admin` | Menu catalog, QR sheets, offers, settings, revenue analytics |
| **Manager** | `manager@tableqr.in` | `/admin` | Day-to-day operations, menu availability, staff |
| **Cashier** | `cashier@tableqr.in` | `/cashier` | Table orders settlement, UPI QR, FY invoices, mark paid |
| **Kitchen** | `kitchen@tableqr.in` | `/kitchen` | Realtime live KOT tickets, preparation timers, stock toggle |

---

## 🛡️ Multi-Tenant Row Level Security (RLS)

Every table contains `restaurant_id`.
1. **Public Customer Access**:
   - Customers do not log in.
   - Access to active restaurant profile, categories, menu items, variants, and addons is public for active restaurants.
   - Table details are accessed via unguessable `qr_token`.
   - Orders and sessions are guarded by the table's `session_token`.
2. **Staff Access**:
   - Authenticated users belong to `restaurant_staff`.
   - Postgres helper functions `get_staff_restaurant_id()` and `get_staff_role()` dynamically enforce that staff can never view or mutate data belonging to other restaurants.
3. **Supabase Realtime**:
   - Enabled on `orders`, `order_items`, `service_requests`, and `menu_items` for live updates.

---

### Test Suites (234 Total Unit Tests)
```bash
# Run All Test Suites
npm run test:billing && npm run test:analytics && npm run test:printing && npm run test:payments && npm run test:polish

# Individual Test Suites:
npm run test:billing    # Pure Indian Tax Billing Engine & Edge Cases (51 tests)
npm run test:analytics  # Analytics Engine, Aggregations & CSV Export (50 tests)
npm run test:printing   # ESC/POS Thermal Printing & Agent Network (43 tests)
npm run test:payments   # Razorpay & Cashfree Automation & Webhooks (51 tests)
npm run test:polish     # i18n Localization, WhatsApp Sharing & PWA (39 tests)
```

---

## 🖨️ Thermal Printing & Auto-Print Agent (Phase 5)

TableQR includes full 80mm thermal receipt printing (72mm printable width / 48 columns) for both browsers and headless hardware:

1. **Browser 80mm Printing**:
   - Kitchen KOT modal (`ThermalKotModal`) with table, order number, highlighted inverted cooking requests, and `*** REPRINT ***` indicator.
   - Cashier and Customer bill modal (`ThermalBillModal`) with restaurant header, GSTIN, FSSAI number, itemized totals, discount breakdown, CGST/SGST slabs, round-off, and dynamic UPI QR code.
   - Print-to-PDF ready via `@page { size: 80mm auto; margin: 0; }`.
2. **Local Auto-Print Agent (`print-agent/`)**:
   - Standalone Node.js daemon for restaurant POS terminals, kitchen PCs, or Raspberry Pi.
   - Generates raw ESC/POS binary buffers (`GS !`, `GS B`, `GS V`, `ESC p`).
   - Supports **TCP Network printers** (port 9100), **USB/Device** (`/dev/usb/lp0`), and **Virtual Simulation mode** with ASCII terminal preview.
   - Deduplication and security via `x-agent-secret` and `audit_logs` ACK callbacks.

---

## ⚡ Payment Gateway Automation & Dynamic Webhooks (Phase 6)

TableQR features an enterprise-grade automated payment pipeline supporting India's top payment aggregators: **Razorpay** and **Cashfree Payments**:

1. **Dual-Mode Customer Payment Screen**:
   - **⚡ Auto-Confirm (Gateway)**: Dynamic order creation via Razorpay / Cashfree with dynamic UPI QR code carrying the order reference (`tr`), instant webhook settlement, and live status feedback.
   - **📱 Counter UPI QR**: Static restaurant VPA QR with direct UPI app intent link (`upi://pay`) for manual cashier mark-paid settlement.
   - **🧪 Interactive Sandbox / Demo Simulator**: Test gateway payments and simulate real-time settlement directly on demo environments without live merchant keys.
2. **Strict Security & Cryptographic Verification**:
   - **Timing-Safe Equality**: All HMAC comparisons use `crypto.timingSafeEqual` (`timingSafeCompare`) to prevent side-channel timing attacks.
   - **Razorpay Checkout**: Computes and verifies `HMAC-SHA256(order_id + "|" + payment_id, key_secret)`.
   - **Razorpay Webhooks**: Verifies raw body `HMAC-SHA256(raw_body, webhook_secret)` against header `X-Razorpay-Signature`. Handles `order.paid` and `payment.captured`.
   - **Cashfree Webhooks**: Verifies timestamped base64 `HMAC-SHA256(timestamp + raw_body, secret_key)` against `x-webhook-signature` with anti-replay protection. Handles `PAYMENT_SUCCESS_WEBHOOK` and `ORDER_PAID`.
3. **Double-Payment & Tamper Prevention**:
   - **Idempotent Settlement**: Webhook retries inspect invoice status. If already `paid`, returns `alreadyPaid: true` with zero duplicate ledger entries.
   - **Amount Mismatch Guard**: Verifies paid amount against server-computed total (`|expected - paid| <= ₹1.00`), immediately rejecting tampered amounts.
   - **Optimistic Concurrency**: Invoices transition from `payment_status = 'unpaid'` atomically in SQL.
   - **Comprehensive Audit Trail**: Logs gateway order ID, payment ID, amount, and timestamp into `audit_logs` and `payment_transactions`.
4. **Owner Admin Gateway Settings**:
   - In `/admin` Settings tab, owners can enable/disable gateways, toggle between Razorpay and Cashfree, configure Key IDs, secrets, and copy their dedicated webhook endpoint URL.

---

## 🌐 Localization, WhatsApp Sharing & PWA (Phase 7)

TableQR is tailored for diverse Indian dining environments with multi-language support, direct WhatsApp bill dispatch, and mobile-first offline PWA capabilities:

1. **Multilingual i18n Engine**:
   - **Supported Languages**: English (`en`), Hindi (`hi` - हिन्दी), and Bengali (`bn` - বাংলা).
   - **76 Core Translation Keys**: Covering table sessions, menu search, veg filters, item customization, cooking requests, cart, live kitchen preparation states, service calls, bills, and payment statuses.
   - **Context & Persistence**: Backed by React Context (`LanguageProvider`) and `localStorage` (`tableqr_user_language`), falling back gracefully to English.
   - **Interactive Language Selectors**: Available in customer header (pill switcher), bill header (compact selector), and settings.

2. **WhatsApp Digital Bill Sharing**:
   - **Indian Phone Sanitizer**: Cleans messy customer input (`+91`, `91`, leading `0`, dashes, spaces) into clean 10-digit Indian mobile numbers (`cleanIndianPhoneNumber`).
   - **Compliant Markdown Tax Invoice**: Automatically compiles restaurant header, GSTIN, FSSAI number, table/section, FY sequential invoice number, itemized quantities, tax breakdown (CGST, SGST, service charge, round-off), settlement confirmation, and live digital invoice URL.
   - **Dual-Mode Dispatch**:
     - Direct Chat: `https://wa.me/91XXXXXXXXXX?text=...` opens WhatsApp directly to the customer's chat.
     - Contact Picker: Fallback generic share link (`https://api.whatsapp.com/send?text=...`) allowing staff or customers to pick any contact or group.
   - **One-Click Share Modals**: Integrated in customer bill screen (`CustomerBillClient`) and cashier settlement drawer (`CashierDashboardClient`).

3. **Progressive Web App (PWA)**:
   - **Web App Manifest (`/manifest.webmanifest`)**: Next.js App Router dynamic manifest configured for standalone full-screen mobile experience, `#059669` emerald brand theme, and high-DPI icons.
   - **Service Worker (`public/sw.js`)**: Cache-first strategy for static shell assets, fonts, and icons; network-first with offline fallback for dining menu routes.
   - **Cross-Platform Install Prompts (`PwaInstallPrompt`)**: Detects mobile Android Chrome `beforeinstallprompt` event with 1-click install button, and provides step-by-step visual instructions for iOS Safari "Add to Home Screen".

---

## 🚀 Production Deployment Checklist (Vercel & Supabase)

### 1. Supabase Cloud Configuration
1. Create a new Supabase project in the **AWS ap-south-1 (Mumbai)** region for lowest latency across India.
2. Under **SQL Editor**, execute the migration and seed scripts:
   - `supabase/migrations/0001_initial_schema.sql`
   - `supabase/migrations/0002_rls_policies.sql`
   - `supabase/seed.sql`
3. Under **Authentication** -> **URL Configuration**, set Site URL to your Vercel domain (e.g. `https://tableqr.vercel.app`) and add `https://tableqr.vercel.app/auth/callback` to Redirect URLs.
4. Under **Database** -> **Replication**, verify Realtime is active on `orders`, `order_items`, `service_requests`, and `menu_items`.

### 2. Vercel Project Setup
1. Push your repository to GitHub or GitLab.
2. Import the project into Vercel and configure the following Environment Variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
   NEXT_PUBLIC_APP_URL=https://tableqr.vercel.app
   ```
3. Deploy! Next.js will build all 31 routes with Partial Prerendering and optimized Turbopack bundles.

### 3. Payment Gateway Webhook Webhooks
1. In your **Razorpay Dashboard**:
   - Webhook URL: `https://tableqr.vercel.app/api/webhooks/razorpay`
   - Secret: Configure your webhook secret and copy to `/admin` Settings.
   - Events: `order.paid`, `payment.captured`.
2. In your **Cashfree Dashboard**:
   - Webhook URL: `https://tableqr.vercel.app/api/webhooks/cashfree`
   - Secret: Configure your secret key and copy to `/admin` Settings.
   - Events: `PAYMENT_SUCCESS_WEBHOOK`, `ORDER_PAID`.

---

## 🗺️ Phases Roadmap

- [x] **Phase 0**: Project scaffold, database schema, RLS policies, auth, seed data
- [x] **Phase 1**: Customer ordering flow + live kitchen board
- [x] **Phase 2**: Billing engine with tests, bill screen, UPI QR, cashier "Mark paid"
- [x] **Phase 3**: Owner admin: menu, tables, QR sheet, offers, settings
- [x] **Phase 4**: Analytics dashboard (revenue by day & hour, orders, average bill, best/worst sellers, table turnover, prep times, payment split, CSV export)
- [x] **Phase 5**: Printing: KOT and bill, auto-print agent (ESC/POS, network/USB/simulator)
- [x] **Phase 6**: Payment gateway automation (Razorpay / Cashfree) with webhooks
- [x] **Phase 7**: Polish: PWA install, Hindi/Bengali/English localization, WhatsApp sharing

