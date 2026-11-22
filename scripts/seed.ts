import './load-env';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(`
❌ Missing Supabase Environment Variables!
Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local or passed directly.
Example:
  export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
  export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
  npx tsx scripts/seed.ts
`);
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const DEMO_RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

const STAFF_USERS = [
  {
    email: 'owner@tableqr.in',
    password: 'TableQR@2026',
    role: 'owner' as const,
    name: 'Arjun Sen (Owner)',
    phone: '+91 98000 11111',
  },
  {
    email: 'manager@tableqr.in',
    password: 'TableQR@2026',
    role: 'manager' as const,
    name: 'Priya Sharma (Manager)',
    phone: '+91 98000 22222',
  },
  {
    email: 'cashier@tableqr.in',
    password: 'TableQR@2026',
    role: 'cashier' as const,
    name: 'Ramesh Kumar (Cashier)',
    phone: '+91 98000 33333',
  },
  {
    email: 'kitchen@tableqr.in',
    password: 'TableQR@2026',
    role: 'kitchen' as const,
    name: 'Chef Mingma (Kitchen Display)',
    phone: '+91 98000 44444',
  },
];

const TABLES = [
  { number: 'T-01', section: 'Indoor AC Hall', capacity: 2, token: 'tbl_t01_9d8e7a6b5c' },
  { number: 'T-02', section: 'Indoor AC Hall', capacity: 2, token: 'tbl_t02_1a2b3c4d5e' },
  { number: 'T-03', section: 'Indoor AC Hall', capacity: 4, token: 'tbl_t03_6f7e8d9c0b' },
  { number: 'T-04', section: 'Indoor AC Hall', capacity: 4, token: 'tbl_t04_2c3d4e5f6a' },
  { number: 'T-05', section: 'Indoor AC Hall', capacity: 6, token: 'tbl_t05_7b8a9c0d1e' },
  { number: 'T-06', section: 'Indoor AC Hall', capacity: 6, token: 'tbl_t06_3e4f5a6b7c' },
  { number: 'T-07', section: 'Garden Courtyard', capacity: 2, token: 'tbl_t07_8d9e0a1b2c' },
  { number: 'T-08', section: 'Garden Courtyard', capacity: 4, token: 'tbl_t08_4a5b6c7d8e' },
  { number: 'T-09', section: 'Garden Courtyard', capacity: 4, token: 'tbl_t09_9c0d1e2f3a' },
  { number: 'T-10', section: 'Garden Courtyard', capacity: 8, token: 'tbl_t10_5b6c7d8e9f' },
  { number: 'T-11', section: 'Balcony Sunset Deck', capacity: 2, token: 'tbl_t11_0e1f2a3b4c' },
  { number: 'T-12', section: 'Balcony Sunset Deck', capacity: 4, token: 'tbl_t12_6d7e8f9a0b' },
];

const CATEGORIES = [
  { id: '22222222-2222-2222-2222-222222222201', name: 'Artisanal Chais & Teas', desc: 'Slow-brewed authentic teas and aromatic spiced kadak chais', order: 1 },
  { id: '22222222-2222-2222-2222-222222222202', name: 'Cold Brews & Refreshers', desc: 'Chilled handcrafted beverages and refreshing summer coolers', order: 2 },
  { id: '22222222-2222-2222-2222-222222222203', name: 'Small Plates & Chaats', desc: 'Crunchy, tangy and savory tea-time pairings', order: 3 },
  { id: '22222222-2222-2222-2222-222222222204', name: 'Gourmet Toasts & Sandwiches', desc: 'Toasted sourdough with fresh locally-sourced fillings', order: 4 },
  { id: '22222222-2222-2222-2222-222222222205', name: 'Himalayan Momos', desc: 'Thin-skin hand-rolled dumplings served with spicy red chili chutney', order: 5 },
  { id: '22222222-2222-2222-2222-222222222206', name: 'Desserts & Bakes', desc: 'Indulgent freshly baked tea cakes, brownies and sweets', order: 6 },
];

async function seed() {
  console.log('🚀 Starting TableQR Phase 0 Seed Script...');

  // 1. Seed Restaurant
  console.log('📌 Seeding Restaurant: Darjeeling Chai & Cafe (cafe-darjeeling)...');
  const { error: restError } = await supabase.from('restaurants').upsert({
    id: DEMO_RESTAURANT_ID,
    slug: 'cafe-darjeeling',
    name: 'Darjeeling Chai & Cafe',
    tagline: 'Artisanal Teas, Himalayan Delights & Good Vibes',
    description: 'Experience the misty magic of Darjeeling right in Indiranagar. Organic teas, authentic momos, and hearty cafe favorites.',
    phone: '+91 98765 43210',
    email: 'hello@cafedarjeeling.in',
    address: '42, 100 Feet Road, HAL 2nd Stage, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560038',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    brand_color: '#d97706',
    upi_id: 'darjeelingcafe@okhdfcbank',
    upi_name: 'Darjeeling Chai & Cafe Pvt Ltd',
    gstin: '29AABCU9603R1ZM',
    fssai_license: '11223334000567',
    is_tax_inclusive: false,
    default_tax_rate: 5.00,
    is_service_charge_enabled: false,
    service_charge_rate: 5.00,
    is_active: true,
  });

  if (restError) throw new Error(`Error inserting restaurant: ${restError.message}`);

  // 2. Seed Tables
  console.log(`📌 Seeding ${TABLES.length} Tables...`);
  for (const table of TABLES) {
    const { error: tableError } = await supabase.from('tables').upsert({
      restaurant_id: DEMO_RESTAURANT_ID,
      table_number: table.number,
      section: table.section,
      capacity: table.capacity,
      qr_token: table.token,
      is_active: true,
    }, { onConflict: 'restaurant_id,table_number' });

    if (tableError) throw new Error(`Error inserting table ${table.number}: ${tableError.message}`);
  }

  // 3. Seed Categories
  console.log(`📌 Seeding ${CATEGORIES.length} Categories...`);
  for (const cat of CATEGORIES) {
    const { error: catError } = await supabase.from('categories').upsert({
      id: cat.id,
      restaurant_id: DEMO_RESTAURANT_ID,
      name: cat.name,
      description: cat.desc,
      sort_order: cat.order,
      is_active: true,
    });
    if (catError) throw new Error(`Error inserting category ${cat.name}: ${catError.message}`);
  }

  // 4. Seed Auth Users and Staff
  console.log('📌 Provisioning Staff Auth Users & Profiles...');
  for (const staff of STAFF_USERS) {
    let userId: string;

    // Check if user exists in auth
    const { data: userList } = await supabase.auth.admin.listUsers();
    const existing = userList?.users?.find((u) => u.email === staff.email);

    if (existing) {
      userId = existing.id;
      await supabase.auth.admin.updateUserById(userId, {
        password: staff.password,
        user_metadata: { name: staff.name, role: staff.role },
      });
      console.log(`  ✓ Auth user ${staff.email} exists, password & profile refreshed (ID: ${userId})`);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: staff.email,
        password: staff.password,
        email_confirm: true,
        user_metadata: { name: staff.name, role: staff.role },
      });
      if (createError) throw new Error(`Failed to create auth user ${staff.email}: ${createError.message}`);
      userId = newUser.user.id;
      console.log(`  + Created auth user ${staff.email} (ID: ${userId})`);
    }

    // Upsert into restaurant_staff
    const { error: staffError } = await supabase.from('restaurant_staff').upsert({
      restaurant_id: DEMO_RESTAURANT_ID,
      user_id: userId,
      role: staff.role,
      name: staff.name,
      phone: staff.phone,
      is_active: true,
    }, { onConflict: 'restaurant_id,user_id' });

    if (staffError) throw new Error(`Failed to map staff profile for ${staff.email}: ${staffError.message}`);
  }

  console.log('\n✨ Database seeding completed successfully!');
  console.log('====================================================');
  console.log('Demo Restaurant: "Darjeeling Chai & Cafe" (/r/cafe-darjeeling)');
  console.log('Customer Test URL (Table T-01):');
  console.log('  👉 http://localhost:3001/r/cafe-darjeeling/t/tbl_t01_9d8e7a6b5c');
  console.log('\nStaff Logins (Password for all: TableQR@2026):');
  console.log('  👔 Owner:   owner@tableqr.in   -> /admin');
  console.log('  📋 Manager: manager@tableqr.in -> /admin');
  console.log('  💵 Cashier: cashier@tableqr.in -> /cashier');
  console.log('  🍳 Kitchen: kitchen@tableqr.in -> /kitchen');
  console.log('====================================================\n');
}

seed().catch((err: any) => {
  if (err?.message?.includes('schema cache') || err?.message?.includes('Could not find the table')) {
    console.error(`\n❌ Database Tables Not Found in Supabase!`);
    console.error(`Your Supabase project is connected, but the database tables have not been created yet.`);
    console.error(`\n👉 Please run the migration scripts in your Supabase Dashboard:`);
    console.error(`   1. Open Supabase Dashboard -> Click "SQL Editor" on the left menu -> "New Query"`);
    console.error(`   2. Copy & paste the contents of "supabase/migrations/0001_initial_schema.sql" and click "Run"`);
    console.error(`   3. Copy & paste the contents of "supabase/migrations/0002_rls_policies.sql" and click "Run"`);
    console.error(`\nThen run this script again:\n   npx tsx scripts/seed.ts\n`);
  } else {
    console.error('❌ Seeding failed:', err);
  }
  process.exit(1);
});
