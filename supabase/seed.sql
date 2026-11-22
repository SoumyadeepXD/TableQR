-- ============================================================================
-- TableQR: Demo Restaurant Seed Data
-- 1 Demo Restaurant ("Darjeeling Chai & Cafe")
-- 12 Tables with unique unguessable QR tokens
-- 25 Menu items across 6 categories with veg/non-veg tags, variants, and addons
-- 4 Staff accounts (owner, manager, cashier, kitchen)
-- 2 Sample Offers
-- ============================================================================

-- Deterministic IDs
DO $$
DECLARE
    v_rest_id UUID := '11111111-1111-1111-1111-111111111111';
    v_cat_chai UUID := '22222222-2222-2222-2222-222222222201';
    v_cat_cold UUID := '22222222-2222-2222-2222-222222222202';
    v_cat_chaat UUID := '22222222-2222-2222-2222-222222222203';
    v_cat_toast UUID := '22222222-2222-2222-2222-222222222204';
    v_cat_momo UUID := '22222222-2222-2222-2222-222222222205';
    v_cat_dessert UUID := '22222222-2222-2222-2222-222222222206';

    v_item_kulhad UUID := '33333333-3333-3333-3333-333333333301';
    v_item_coldbrew UUID := '33333333-3333-3333-3333-333333333306';
    v_item_momo_steamed UUID := '33333333-3333-3333-3333-333333333319';

    v_addon_milk UUID := '44444444-4444-4444-4444-444444444401';
    v_addon_dip UUID := '44444444-4444-4444-4444-444444444402';

    v_user_owner UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
    v_user_manager UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    v_user_cashier UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    v_user_kitchen UUID := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
BEGIN
    -- 1. Insert Demo Restaurant
    INSERT INTO public.restaurants (
        id, slug, name, tagline, description, phone, email, address, city, state, pincode,
        currency, timezone, brand_color, upi_id, upi_name, gstin, fssai_license,
        is_tax_inclusive, default_tax_rate, is_service_charge_enabled, service_charge_rate, is_active
    ) VALUES (
        v_rest_id,
        'cafe-darjeeling',
        'Darjeeling Chai & Cafe',
        'Artisanal Teas, Himalayan Delights & Good Vibes',
        'Experience the misty magic of Darjeeling right in Indiranagar. Serving organic first-flush orthodox teas, authentic street-style momos, and hearty cafe favorites.',
        '+91 98765 43210',
        'hello@cafedarjeeling.in',
        '42, 100 Feet Road, HAL 2nd Stage, Indiranagar',
        'Bengaluru',
        'Karnataka',
        '560038',
        'INR',
        'Asia/Kolkata',
        '#d97706',
        'darjeelingcafe@okhdfcbank',
        'Darjeeling Chai & Cafe Pvt Ltd',
        '29AABCU9603R1ZM',
        '11223334000567',
        false,
        5.00,
        false,
        5.00,
        true
    ) ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        slug = EXCLUDED.slug,
        upi_id = EXCLUDED.upi_id,
        brand_color = EXCLUDED.brand_color;

    -- 2. Insert 12 Tables
    INSERT INTO public.tables (restaurant_id, table_number, section, capacity, qr_token, is_active)
    VALUES
        (v_rest_id, 'T-01', 'Indoor AC Hall', 2, 'tbl_t01_9d8e7a6b5c', true),
        (v_rest_id, 'T-02', 'Indoor AC Hall', 2, 'tbl_t02_1a2b3c4d5e', true),
        (v_rest_id, 'T-03', 'Indoor AC Hall', 4, 'tbl_t03_6f7e8d9c0b', true),
        (v_rest_id, 'T-04', 'Indoor AC Hall', 4, 'tbl_t04_2c3d4e5f6a', true),
        (v_rest_id, 'T-05', 'Indoor AC Hall', 6, 'tbl_t05_7b8a9c0d1e', true),
        (v_rest_id, 'T-06', 'Indoor AC Hall', 6, 'tbl_t06_3e4f5a6b7c', true),
        (v_rest_id, 'T-07', 'Garden Courtyard', 2, 'tbl_t07_8d9e0a1b2c', true),
        (v_rest_id, 'T-08', 'Garden Courtyard', 4, 'tbl_t08_4a5b6c7d8e', true),
        (v_rest_id, 'T-09', 'Garden Courtyard', 4, 'tbl_t09_9c0d1e2f3a', true),
        (v_rest_id, 'T-10', 'Garden Courtyard', 8, 'tbl_t10_5b6c7d8e9f', true),
        (v_rest_id, 'T-11', 'Balcony Sunset Deck', 2, 'tbl_t11_0e1f2a3b4c', true),
        (v_rest_id, 'T-12', 'Balcony Sunset Deck', 4, 'tbl_t12_6d7e8f9a0b', true)
    ON CONFLICT (restaurant_id, table_number) DO UPDATE SET
        qr_token = EXCLUDED.qr_token,
        section = EXCLUDED.section,
        capacity = EXCLUDED.capacity;

    -- 3. Insert 6 Menu Categories
    INSERT INTO public.categories (id, restaurant_id, name, description, sort_order, is_active)
    VALUES
        (v_cat_chai, v_rest_id, 'Artisanal Chais & Teas', 'Slow-brewed authentic teas and aromatic spiced kadak chais', 1, true),
        (v_cat_cold, v_rest_id, 'Cold Brews & Refreshers', 'Chilled handcrafted beverages and refreshing summer coolers', 2, true),
        (v_cat_chaat, v_rest_id, 'Small Plates & Chaats', 'Crunchy, tangy and savory tea-time pairings', 3, true),
        (v_cat_toast, v_rest_id, 'Gourmet Toasts & Sandwiches', 'Toasted sourdough with fresh locally-sourced fillings', 4, true),
        (v_cat_momo, v_rest_id, 'Himalayan Momos', 'Thin-skin hand-rolled dumplings served with spicy red chili chutney', 5, true),
        (v_cat_dessert, v_rest_id, 'Desserts & Bakes', 'Indulgent freshly baked tea cakes, brownies and sweets', 6, true)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order;

    -- 4. Insert 25 Menu Items
    -- Category 1: Artisanal Chais (5 items)
    INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price, is_veg, is_available, tax_rate, sort_order, prep_time_minutes, is_bestseller)
    VALUES
        (v_item_kulhad, v_rest_id, v_cat_chai, 'Claypot Kulhad Chai', 'Smoky clay cup infused spiced kadak milk tea made with crushed ginger and green cardamom.', 65.00, true, true, 5.00, 1, 7, true),
        ('33333333-3333-3333-3333-333333333302', v_rest_id, v_cat_chai, 'Darjeeling First Flush Muskatel', 'Delicate single-estate orthodox tea with subtle floral and peach notes. Served in a teapot.', 140.00, true, true, 5.00, 2, 5, false),
        ('33333333-3333-3333-3333-333333333303', v_rest_id, v_cat_chai, 'Saffron Kashmiri Kahwa', 'Green tea infused with Kashmiri saffron strands, crushed almonds, cinnamon, and whole spices.', 160.00, true, true, 5.00, 3, 8, true),
        ('33333333-3333-3333-3333-333333333304', v_rest_id, v_cat_chai, 'Lemongrass Ginger Green Tea', 'Fresh hand-picked Nilgiri green tea leaves with garden lemongrass and crushed honey ginger.', 95.00, true, true, 5.00, 4, 6, false),
        ('33333333-3333-3333-3333-333333333305', v_rest_id, v_cat_chai, 'Filter Kaapi (South Indian)', 'Traditional chicory blend decoction frothed with boiling whole milk in brass davarah.', 80.00, true, true, 5.00, 5, 5, false),

    -- Category 2: Cold Brews & Refreshers (4 items)
        (v_item_coldbrew, v_rest_id, v_cat_cold, 'Classic Nitro Cold Brew', '18-hour steep Chikmagalur Arabica brewed cold and nitrogen-infused for a velvety Guinness-like crema.', 190.00, true, true, 5.00, 1, 4, true),
        ('33333333-3333-3333-3333-333333333307', v_rest_id, v_cat_cold, 'Kokum Ginger Fizz', 'Traditional Konkan wild kokum extract with crushed ginger, fresh mint, rock salt and sparkling soda.', 130.00, true, true, 5.00, 2, 5, false),
        ('33333333-3333-3333-3333-333333333308', v_rest_id, v_cat_cold, 'Iced Hibiscus Berry Cooler', 'Ruby red steeped hibiscus tea shaken with wild berry puree, lime juice and crushed ice.', 150.00, true, true, 5.00, 3, 5, false),
        ('33333333-3333-3333-3333-333333333309', v_rest_id, v_cat_cold, 'Vietnamese Condensed Milk Iced Coffee', 'Dark roasted robusta dripped over sweet condensed milk and served tall over ice cubes.', 180.00, true, true, 5.00, 4, 6, false),

    -- Category 3: Small Bites & Chaats (5 items)
        ('33333333-3333-3333-3333-333333333310', v_rest_id, v_cat_chaat, 'Crispy Palak Chaat', 'Flash-fried baby spinach leaves crowned with chilled sweetened curd, tamarind glaze, and mint sev.', 175.00, true, true, 5.00, 1, 10, true),
        ('33333333-3333-3333-3333-333333333311', v_rest_id, v_cat_chaat, 'Street Style Bun Maska', 'Freshly baked Irani brioche bun sliced and generously slathered with salted butter. Best dipped in chai.', 75.00, true, true, 5.00, 2, 5, false),
        ('33333333-3333-3333-3333-333333333312', v_rest_id, v_cat_chaat, 'Keema Pav (Spiced Minced Mutton)', 'Slow-cooked spiced mutton keema garnished with coriander and lemon, served with 2 buttery toasted ladi pavs.', 295.00, false, true, 5.00, 3, 14, true),
        ('33333333-3333-3333-3333-333333333313', v_rest_id, v_cat_chaat, 'Kolkata Samosa (Singara, 2 Pcs)', 'Bengali spiced potato, cauliflower and roasted peanut stuffed crispy pastry with tamarind saunth.', 90.00, true, true, 5.00, 4, 8, false),
        ('33333333-3333-3333-3333-333333333314', v_rest_id, v_cat_chaat, 'Gunpowder Fries', 'Crisp skin-on golden potato fries tossed in fiery Madurai podi and served with curry leaf mayo.', 140.00, true, true, 5.00, 5, 8, false),

    -- Category 4: Sandwiches & Toasts (4 items)
        ('33333333-3333-3333-3333-333333333315', v_rest_id, v_cat_toast, 'Bombay Grilled Sandwich', 'Triple-layer toasted sandwich stuffed with spiced potatoes, beetroot, cucumber, mint chutney and Amul cheese.', 180.00, true, true, 5.00, 1, 12, true),
        ('33333333-3333-3333-3333-333333333316', v_rest_id, v_cat_toast, 'Chili Cheese Toast', 'Thick cut garlic sourdough topped with molten sharp cheddar, mozzarella, and chopped green bird-eye chilies.', 160.00, true, true, 5.00, 2, 10, false),
        ('33333333-3333-3333-3333-333333333317', v_rest_id, v_cat_toast, 'Tandoori Paneer Tikka Croissant', 'Flaky French butter croissant stuffed with chargrilled cottage cheese, pickled onions and makhani cream.', 240.00, true, true, 5.00, 3, 12, false),
        ('33333333-3333-3333-3333-333333333318', v_rest_id, v_cat_toast, 'Chicken Tikka Melt', 'Smoked clay-oven chicken chunks melted with mozzarella, bell peppers and spiced mayo on artisan ciabatta.', 260.00, false, true, 5.00, 4, 14, true),

    -- Category 5: Himalayan Momos (4 items)
        (v_item_momo_steamed, v_rest_id, v_cat_momo, 'Classic Steamed Momos (6 Pcs)', 'Delicate dumplings filled with finely chopped cabbage, scallions and ginger. Served with fiery Dalle Khursani dip.', 160.00, true, true, 5.00, 1, 12, true),
        ('33333333-3333-3333-3333-333333333320', v_rest_id, v_cat_momo, 'Darjeeling Chicken Momos (6 Pcs)', 'Authentic mountain-style minced chicken dumpling with coriander, shallots and clear broth dipping soup.', 210.00, false, true, 5.00, 2, 12, true),
        ('33333333-3333-3333-3333-333333333321', v_rest_id, v_cat_momo, 'Crispy Pan-Fried Kothey Momos (6 Pcs)', 'Half-steamed half golden pan-crisped dumplings tossed with sweet onion-tomato mountain gravy.', 190.00, true, true, 5.00, 3, 14, false),
        ('33333333-3333-3333-3333-333333333322', v_rest_id, v_cat_momo, 'Jhol Momos in Sesame Broth (6 Pcs)', 'Steamed juicy dumplings immersed in a warm, fragrant roasted tomato and Sichuan pepper soup.', 220.00, true, true, 5.00, 4, 15, false),

    -- Category 6: Desserts & Bakes (3 items)
        ('33333333-3333-3333-3333-333333333323', v_rest_id, v_cat_dessert, 'Warm Chai Spiced Carrot Cake', 'Decadent moist carrot cake infused with cinnamon, nutmeg and ginger, topped with cream cheese frosting.', 180.00, true, true, 5.00, 1, 6, true),
        ('33333333-3333-3333-3333-333333333324', v_rest_id, v_cat_dessert, 'Old Monk Chocolate Fudge Brownie', 'Dark Belgian chocolate fudge brownie infused with aged rum notes. Served warm with vanilla ice cream.', 220.00, true, true, 5.00, 2, 7, true),
        ('33333333-3333-3333-3333-333333333325', v_rest_id, v_cat_dessert, 'Baked Gulab Jamun Cheesecake', 'Fusion dessert of creamy New York style cheesecake layered over soaked mini Bengali gulab jamuns.', 210.00, true, true, 5.00, 3, 5, false)
    ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name,
        price = EXCLUDED.price,
        is_veg = EXCLUDED.is_veg,
        is_available = EXCLUDED.is_available;

    -- 5. Insert Variants
    -- Claypot Kulhad Chai (Single vs Pot for 2)
    INSERT INTO public.item_variants (id, restaurant_id, menu_item_id, name, price, is_available, sort_order)
    VALUES
        ('55555555-5555-5555-5555-555555555501', v_rest_id, v_item_kulhad, 'Regular Kulhad (150ml)', 65.00, true, 1),
        ('55555555-5555-5555-5555-555555555502', v_rest_id, v_item_kulhad, 'Sharing Kettle (400ml)', 140.00, true, 2),
    -- Cold Brew (Single 250ml vs Take-home bottle 500ml)
        ('55555555-5555-5555-5555-555555555503', v_rest_id, v_item_coldbrew, 'Glass (250ml)', 190.00, true, 1),
        ('55555555-5555-5555-5555-555555555504', v_rest_id, v_item_coldbrew, 'Glass Bottle (500ml)', 320.00, true, 2),
    -- Momos (6 pcs vs 10 pcs)
        ('55555555-5555-5555-5555-555555555505', v_rest_id, v_item_momo_steamed, 'Plate of 6 Pcs', 160.00, true, 1),
        ('55555555-5555-5555-5555-555555555506', v_rest_id, v_item_momo_steamed, 'Platter of 10 Pcs', 240.00, true, 2)
    ON CONFLICT (id) DO UPDATE SET price = EXCLUDED.price;

    -- 6. Insert Add-on Groups & Items
    -- Addon Group for Chais: Choice of Milk
    INSERT INTO public.addon_groups (id, restaurant_id, menu_item_id, name, min_selection, max_selection, is_required)
    VALUES
        (v_addon_milk, v_rest_id, v_item_kulhad, 'Choice of Milk', 0, 1, false),
        (v_addon_dip, v_rest_id, v_item_momo_steamed, 'Extra Dips & Sauces', 0, 2, false)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

    INSERT INTO public.addon_items (restaurant_id, addon_group_id, name, price, is_available, sort_order)
    VALUES
        (v_rest_id, v_addon_milk, 'Farm Whole Milk', 0.00, true, 1),
        (v_rest_id, v_addon_milk, 'Oat Milk (Dairy-Free)', 35.00, true, 2),
        (v_rest_id, v_addon_milk, 'Almond Milk (Nutty)', 40.00, true, 3),
        (v_rest_id, v_addon_dip, 'Extra Dalle Khursani Hot Chili Chutney', 20.00, true, 1),
        (v_rest_id, v_addon_dip, 'Roasted Sesame Peanut Dip', 25.00, true, 2);

    -- 7. Insert Offers
    INSERT INTO public.offers (restaurant_id, code, title, description, discount_type, discount_value, min_bill_amount, max_discount_cap, is_active)
    VALUES
        (v_rest_id, 'WELCOME50', '50% Off First Feast', 'Get 50% discount up to ₹100 on orders above ₹250', 'percentage', 50.00, 250.00, 100.00, true),
        (v_rest_id, 'CHAI10', '10% Flat Afternoon Chai Discount', 'Flat 10% off on your bill above ₹150', 'percentage', 10.00, 150.00, 50.00, true)
    ON CONFLICT DO NOTHING;

    -- 8. Seed Staff Accounts (linked to auth.users if already exists or placeholders)
    -- We use ON CONFLICT DO NOTHING so that when Supabase Auth users exist, they map to staff.
    -- For standalone setup, we insert the mapping for the 4 standard demo emails.
    INSERT INTO public.restaurant_staff (restaurant_id, user_id, role, name, phone, is_active)
    VALUES
        (v_rest_id, v_user_owner, 'owner', 'Arjun Sen (Owner)', '+91 98000 11111', true),
        (v_rest_id, v_user_manager, 'manager', 'Priya Sharma (Manager)', '+91 98000 22222', true),
        (v_rest_id, v_user_cashier, 'cashier', 'Ramesh Kumar (Cashier)', '+91 98000 33333', true),
        (v_rest_id, v_user_kitchen, 'kitchen', 'Chef Mingma (Kitchen)', '+91 98000 44444', true)
    ON CONFLICT (restaurant_id, user_id) DO UPDATE SET role = EXCLUDED.role, name = EXCLUDED.name;

END $$;
