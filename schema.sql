-- ==========================================
-- IN-PLACE CONSTRAINT MIGRATION (RUN THIS FIRST)
-- ==========================================

-- 1. Profiles Constraint Fix
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. Cart Items Constraint Fix
ALTER TABLE public.cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_fkey;
ALTER TABLE public.cart_items ADD CONSTRAINT cart_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. Wishlist Items Constraint Fix
ALTER TABLE public.wishlist_items DROP CONSTRAINT IF EXISTS wishlist_items_user_id_fkey;
ALTER TABLE public.wishlist_items ADD CONSTRAINT wishlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. Orders Constraint Fix
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


-- ==========================================
-- FULL TABLE DEFINITIONS (SAFE TO RUN)
-- ==========================================

-- Enable UUID generator
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (custom backend authentication)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    type TEXT NOT NULL DEFAULT 'Signup',
    last_login TIMESTAMP WITH TIME ZONE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow admin write users" ON public.users;
CREATE POLICY "Allow admin write users" ON public.users FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    gender TEXT,
    date_of_birth DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow profile owner select" ON public.profiles;
CREATE POLICY "Allow profile owner select" ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow profile owner write" ON public.profiles;
CREATE POLICY "Allow profile owner write" ON public.profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL,
    collection TEXT,
    image_url TEXT,
    slug TEXT UNIQUE,
    sku TEXT,
    cost_price NUMERIC(10, 2),
    status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    images JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);


-- Enable RLS for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select products" ON public.products;
CREATE POLICY "Allow public select products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow service role write products" ON public.products;
CREATE POLICY "Allow service role write products" ON public.products FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4. Product Variants Table
CREATE TABLE IF NOT EXISTS public.product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    size TEXT NOT NULL,
    color TEXT NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public select product_variants" ON public.product_variants;
CREATE POLICY "Allow public select product_variants" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow service role write product_variants" ON public.product_variants;
CREATE POLICY "Allow service role write product_variants" ON public.product_variants FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Cart Items Table
CREATE TABLE IF NOT EXISTS public.cart_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    session_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for cart_items
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all cart_items access to service role" ON public.cart_items;
CREATE POLICY "Allow all cart_items access to service role" ON public.cart_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow select cart_items" ON public.cart_items;
CREATE POLICY "Allow select cart_items" ON public.cart_items FOR SELECT USING (true);

-- 6. Wishlist Items Table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, product_id)
);

-- Enable RLS for wishlist_items
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select wishlist_items" ON public.wishlist_items;
CREATE POLICY "Allow select wishlist_items" ON public.wishlist_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write wishlist_items" ON public.wishlist_items;
CREATE POLICY "Allow write wishlist_items" ON public.wishlist_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 7. Orders Table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    shipping_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    shipping_address JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
CREATE POLICY "Allow select orders" ON public.orders FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write orders" ON public.orders;
CREATE POLICY "Allow write orders" ON public.orders FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 8. Order Items Table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    size TEXT,
    color TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
CREATE POLICY "Allow select order_items" ON public.order_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write order_items" ON public.order_items;
CREATE POLICY "Allow write order_items" ON public.order_items FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. Rate Limits Table
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key TEXT PRIMARY KEY,
    attempts INT NOT NULL DEFAULT 1,
    first_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    blocked_until TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for rate_limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role all rate_limits" ON public.rate_limits;
CREATE POLICY "Allow service role all rate_limits" ON public.rate_limits FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. OTPs Table
CREATE TABLE IF NOT EXISTS public.otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    otp INT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    type TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for otps
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role all otps" ON public.otps;
CREATE POLICY "Allow service role all otps" ON public.otps FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. Suppressed Emails Table
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
    email TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    bounce_type TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for suppressed_emails
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role all suppressed_emails" ON public.suppressed_emails;
CREATE POLICY "Allow service role all suppressed_emails" ON public.suppressed_emails FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL,
    resource TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow service role all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow service role all audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Rate limiting RPCs.
-- Fixes a bug in the previous increment_rate_limit(): it only ever
-- incremented attempts and never reset first_at, so once a key's window
-- elapsed, checkRateLimit()'s "window expired" branch would return early
-- forever, permanently disabling enforcement for that key. The gate below
-- owns resetting the window; record_rate_attempt only increments within it.
DROP FUNCTION IF EXISTS public.increment_rate_limit(TEXT);

CREATE OR REPLACE FUNCTION public.check_rate_limit_gate(
    p_key TEXT,
    p_max INT,
    p_window_seconds INT,
    p_block_seconds INT DEFAULT 1800
)
RETURNS TABLE(blocked BOOLEAN, retry_after_seconds INT) AS $$
DECLARE
    v_row public.rate_limits;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_row FROM public.rate_limits WHERE key = p_key FOR UPDATE;

    IF v_row.key IS NOT NULL AND v_row.blocked_until IS NOT NULL AND v_row.blocked_until > v_now THEN
        RETURN QUERY SELECT TRUE, CEIL(EXTRACT(EPOCH FROM (v_row.blocked_until - v_now)))::INT;
        RETURN;
    END IF;

    IF v_row.key IS NULL OR v_row.first_at < v_now - (p_window_seconds || ' seconds')::INTERVAL THEN
        INSERT INTO public.rate_limits (key, attempts, first_at, blocked_until)
        VALUES (p_key, 0, v_now, NULL)
        ON CONFLICT (key) DO UPDATE SET attempts = 0, first_at = v_now, blocked_until = NULL;
        RETURN QUERY SELECT FALSE, 0;
        RETURN;
    END IF;

    IF v_row.attempts >= p_max THEN
        UPDATE public.rate_limits SET blocked_until = v_now + (p_block_seconds || ' seconds')::INTERVAL WHERE key = p_key;
        RETURN QUERY SELECT TRUE, p_block_seconds;
        RETURN;
    END IF;

    RETURN QUERY SELECT FALSE, 0;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.record_rate_attempt(p_key TEXT)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.rate_limits (key, attempts, first_at)
    VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE
    SET attempts = public.rate_limits.attempts + 1;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- MIGRATION: EXTEND PRODUCTS TABLE SCHEMA
-- ==========================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Seeding slugs for existing products based on their names
UPDATE public.products 
SET slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- ==========================================
-- MIGRATION: EXTEND ORDERS TABLE WITH SHIPROCKET FIELDS
-- ==========================================
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_order_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shiprocket_shipment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS awb_number TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_status TEXT;

-- ==========================================
-- MIGRATION: EXTEND PRODUCTS TABLE FOR SMART FILTERS
-- ==========================================
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gender TEXT DEFAULT 'Unisex';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS fabric_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sleeve_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS neck_type TEXT;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_new_arrival BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_best_seller BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS rating NUMERIC(3, 2) DEFAULT 4.5;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS original_price NUMERIC(10, 2);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS gsm INT DEFAULT 220;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tag TEXT;

-- ==========================================
-- NEW TABLE: COUPONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INT NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select coupons" ON public.coupons;
CREATE POLICY "Allow select coupons" ON public.coupons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write coupons" ON public.coupons;
CREATE POLICY "Allow write coupons" ON public.coupons FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- NEW TABLE: PRODUCT REVIEWS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.product_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select product_reviews" ON public.product_reviews;
CREATE POLICY "Allow select product_reviews" ON public.product_reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write product_reviews" ON public.product_reviews;
CREATE POLICY "Allow write product_reviews" ON public.product_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ==========================================
-- NEW TABLE: COLLECTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS public.collections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for collections
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select collections" ON public.collections;
CREATE POLICY "Allow select collections" ON public.collections FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write collections" ON public.collections;
CREATE POLICY "Allow write collections" ON public.collections FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ==========================================
-- STYLE PERSONALIZATION UPGRADES
-- ==========================================

-- Add personality_type column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS personality_type VARCHAR(50);

-- Create table for storing detailed style profiles
CREATE TABLE IF NOT EXISTS public.user_style_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    personality_type VARCHAR(50) NOT NULL,
    quiz_score JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for user_style_profiles
ALTER TABLE public.user_style_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow select user_style_profiles" ON public.user_style_profiles;
CREATE POLICY "Allow select user_style_profiles" ON public.user_style_profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow write user_style_profiles" ON public.user_style_profiles;
CREATE POLICY "Allow write user_style_profiles" ON public.user_style_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);


-- ==========================================
-- DATABASE PERFORMANCE & SECURITY OPTIMIZATIONS
-- ==========================================

-- 1. Index Definitions
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- 2. Restrict RLS Policies
-- Users
DROP POLICY IF EXISTS "Allow public read users" ON public.users;
DROP POLICY IF EXISTS "Allow matching user read users" ON public.users;
CREATE POLICY "Allow matching user read users" ON public.users FOR SELECT USING (auth.uid() = id);

-- Profiles
DROP POLICY IF EXISTS "Allow profile owner select" ON public.profiles;
DROP POLICY IF EXISTS "Allow profile owner select" ON public.profiles;
CREATE POLICY "Allow profile owner select" ON public.profiles FOR SELECT USING (auth.uid() = id);

-- Cart Items
DROP POLICY IF EXISTS "Allow select cart_items" ON public.cart_items;
DROP POLICY IF EXISTS "Allow select cart_items" ON public.cart_items;
CREATE POLICY "Allow select cart_items" ON public.cart_items FOR SELECT USING (auth.uid() = user_id);

-- Wishlist Items
DROP POLICY IF EXISTS "Allow select wishlist_items" ON public.wishlist_items;
DROP POLICY IF EXISTS "Allow select wishlist_items" ON public.wishlist_items;
CREATE POLICY "Allow select wishlist_items" ON public.wishlist_items FOR SELECT USING (auth.uid() = user_id);

-- Orders
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
DROP POLICY IF EXISTS "Allow select orders" ON public.orders;
CREATE POLICY "Allow select orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Order Items
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
DROP POLICY IF EXISTS "Allow select order_items" ON public.order_items;
CREATE POLICY "Allow select order_items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- User Style Profiles
DROP POLICY IF EXISTS "Allow select user_style_profiles" ON public.user_style_profiles;
DROP POLICY IF EXISTS "Allow select user_style_profiles" ON public.user_style_profiles;
CREATE POLICY "Allow select user_style_profiles" ON public.user_style_profiles FOR SELECT USING (auth.uid() = user_id);



