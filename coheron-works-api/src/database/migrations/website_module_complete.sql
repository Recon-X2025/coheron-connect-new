-- ============================================
-- WEBSITE MODULE - Complete ERP Specification
-- ============================================
-- This migration adds comprehensive Website/CMS and E-commerce functionality
-- to the Coheron ERP system

-- ============================================
-- 1. SITES & MULTI-SITE SUPPORT
-- ============================================

CREATE TABLE IF NOT EXISTS website_sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    subdomain VARCHAR(100),
    locale VARCHAR(10) DEFAULT 'en_US',
    theme VARCHAR(100) DEFAULT 'default',
    settings JSONB DEFAULT '{}', -- Site-specific settings
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    ssl_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. ENHANCED PAGES WITH BLOCKS
-- ============================================

-- Extend website_pages table
ALTER TABLE website_pages 
    ADD COLUMN IF NOT EXISTS site_id INTEGER REFERENCES website_sites(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS template VARCHAR(100) DEFAULT 'default',
    ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
    ADD COLUMN IF NOT EXISTS blocks JSONB DEFAULT '[]', -- Array of block configurations
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    ADD COLUMN IF NOT EXISTS publish_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS canonical_url TEXT,
    ADD COLUMN IF NOT EXISTS robots_meta VARCHAR(50) DEFAULT 'index, follow',
    ADD COLUMN IF NOT EXISTS og_image TEXT,
    ADD COLUMN IF NOT EXISTS og_title VARCHAR(255),
    ADD COLUMN IF NOT EXISTS og_description TEXT,
    ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id),
    ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);

-- Create unique constraint on slug per site
CREATE UNIQUE INDEX IF NOT EXISTS website_pages_site_slug_unique 
    ON website_pages(site_id, slug) 
    WHERE slug IS NOT NULL;

-- ============================================
-- 3. REUSABLE BLOCKS / GLOBAL SECTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS website_blocks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'image', 'gallery', 'product', 'cta', 'form', 'video', 'html', 'custom')),
    config JSONB NOT NULL DEFAULT '{}', -- Block-specific configuration
    is_global BOOLEAN DEFAULT false, -- Reusable across pages
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. MEDIA LIBRARY
-- ============================================

CREATE TABLE IF NOT EXISTS website_media (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_path TEXT,
    mime_type VARCHAR(100),
    file_size BIGINT, -- Size in bytes
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    description TEXT,
    version INTEGER DEFAULT 1,
    parent_id INTEGER REFERENCES website_media(id), -- For versions
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_media_site ON website_media(site_id);
CREATE INDEX IF NOT EXISTS idx_website_media_type ON website_media(mime_type);

-- ============================================
-- 5. PRODUCT CATALOG SYNC
-- ============================================

CREATE TABLE IF NOT EXISTS website_products (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    is_published BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    short_description TEXT,
    long_description TEXT,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_keywords VARCHAR(255),
    sync_status VARCHAR(20) CHECK (sync_status IN ('synced', 'pending', 'error')) DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, site_id)
);

CREATE INDEX IF NOT EXISTS idx_website_products_site ON website_products(site_id);
CREATE INDEX IF NOT EXISTS idx_website_products_published ON website_products(is_published);

-- Product Variants (for size/color/etc)
CREATE TABLE IF NOT EXISTS website_product_variants (
    id SERIAL PRIMARY KEY,
    website_product_id INTEGER REFERENCES website_products(id) ON DELETE CASCADE,
    variant_name VARCHAR(255) NOT NULL,
    variant_value VARCHAR(255) NOT NULL,
    price_override DECIMAL(10, 2),
    stock_override INTEGER,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Categories
CREATE TABLE IF NOT EXISTS website_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES website_categories(id) ON DELETE CASCADE,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_website_categories_site ON website_categories(site_id);
CREATE INDEX IF NOT EXISTS idx_website_categories_parent ON website_categories(parent_id);

-- Product-Category mapping
CREATE TABLE IF NOT EXISTS website_product_categories (
    website_product_id INTEGER REFERENCES website_products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES website_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (website_product_id, category_id)
);

-- ============================================
-- 6. SHOPPING CART
-- ============================================

CREATE TABLE IF NOT EXISTS website_carts (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255), -- For guest carts
    customer_id INTEGER REFERENCES partners(id), -- For registered customers
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    currency VARCHAR(10) DEFAULT 'USD',
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    promotion_code VARCHAR(100),
    expires_at TIMESTAMP, -- Cart expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_carts_session ON website_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_website_carts_customer ON website_carts(customer_id);

CREATE TABLE IF NOT EXISTS website_cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES website_carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    website_product_id INTEGER REFERENCES website_products(id),
    variant_id INTEGER REFERENCES website_product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_cart_items_cart ON website_cart_items(cart_id);

-- ============================================
-- 7. ORDERS (E-COMMERCE)
-- ============================================

CREATE TABLE IF NOT EXISTS website_orders (
    id SERIAL PRIMARY KEY,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES partners(id),
    erp_order_id INTEGER REFERENCES sale_orders(id), -- Link to ERP sales order
    session_id VARCHAR(255), -- For guest orders
    status VARCHAR(50) CHECK (status IN ('pending', 'confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')) DEFAULT 'pending',
    currency VARCHAR(10) DEFAULT 'USD',
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded', 'failed')) DEFAULT 'pending',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(255),
    shipping_address JSONB, -- Full address object
    billing_address JSONB,
    shipping_method VARCHAR(100),
    tracking_number VARCHAR(255),
    promotion_code VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_orders_customer ON website_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_website_orders_status ON website_orders(status);
CREATE INDEX IF NOT EXISTS idx_website_orders_erp ON website_orders(erp_order_id);

CREATE TABLE IF NOT EXISTS website_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES website_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    website_product_id INTEGER REFERENCES website_products(id),
    variant_id INTEGER REFERENCES website_product_variants(id),
    product_name VARCHAR(255) NOT NULL, -- Snapshot at time of order
    product_sku VARCHAR(100),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_order_items_order ON website_order_items(order_id);

-- Order Status History
CREATE TABLE IF NOT EXISTS website_order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES website_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. PROMOTIONS & COUPONS
-- ============================================

CREATE TABLE IF NOT EXISTS website_promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'free_shipping')) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    min_purchase_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    usage_limit INTEGER, -- Total usage limit
    usage_count INTEGER DEFAULT 0,
    usage_limit_per_customer INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    applicable_products INTEGER[], -- Product IDs (empty = all products)
    applicable_categories INTEGER[], -- Category IDs
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_promotions_code ON website_promotions(code);
CREATE INDEX IF NOT EXISTS idx_website_promotions_site ON website_promotions(site_id);

-- Promotion Usage Tracking
CREATE TABLE IF NOT EXISTS website_promotion_usage (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER REFERENCES website_promotions(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES website_orders(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES partners(id),
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. FORMS & LEAD CAPTURE
-- ============================================

CREATE TABLE IF NOT EXISTS website_forms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    form_type VARCHAR(50) CHECK (form_type IN ('contact', 'newsletter', 'quote', 'custom', 'lead_capture')) DEFAULT 'contact',
    fields JSONB NOT NULL, -- Form field definitions
    submit_action VARCHAR(50) CHECK (submit_action IN ('email', 'crm_lead', 'webhook', 'both')) DEFAULT 'email',
    email_to TEXT[], -- Array of email addresses
    email_subject VARCHAR(255),
    success_message TEXT,
    redirect_url TEXT,
    spam_protection BOOLEAN DEFAULT true,
    recaptcha_site_key VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS website_form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES website_forms(id) ON DELETE CASCADE,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES partners(id),
    lead_id INTEGER REFERENCES leads(id), -- If converted to CRM lead
    form_data JSONB NOT NULL, -- Submitted form data
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) CHECK (status IN ('new', 'processed', 'converted', 'spam')) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_form_submissions_form ON website_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_website_form_submissions_status ON website_form_submissions(status);

-- ============================================
-- 10. WEBHOOKS
-- ============================================

CREATE TABLE IF NOT EXISTS website_webhooks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- order.created, payment.succeeded, etc.
    target_url TEXT NOT NULL,
    secret VARCHAR(255), -- For HMAC signing
    method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_webhooks_event ON website_webhooks(event_type);
CREATE INDEX IF NOT EXISTS idx_website_webhooks_site ON website_webhooks(site_id);

-- Webhook Delivery Log
CREATE TABLE IF NOT EXISTS website_webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES website_webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER DEFAULT 1,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. ANALYTICS & TRACKING
-- ============================================

CREATE TABLE IF NOT EXISTS website_pageviews (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES website_pages(id) ON DELETE SET NULL,
    page_url TEXT NOT NULL,
    session_id VARCHAR(255),
    customer_id INTEGER REFERENCES partners(id),
    ip_address VARCHAR(45),
    user_agent TEXT,
    referrer TEXT,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    country VARCHAR(2),
    device_type VARCHAR(20), -- desktop, mobile, tablet
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_pageviews_site ON website_pageviews(site_id);
CREATE INDEX IF NOT EXISTS idx_website_pageviews_page ON website_pageviews(page_id);
CREATE INDEX IF NOT EXISTS idx_website_pageviews_created ON website_pageviews(created_at);

-- ============================================
-- 12. INTEGRATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS website_integrations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN ('payment', 'shipping', 'analytics', 'marketing', 'cms', 'other')),
    provider VARCHAR(100) NOT NULL, -- stripe, adyen, fedex, google_analytics, etc.
    config JSONB NOT NULL DEFAULT '{}', -- API keys, settings, etc.
    is_active BOOLEAN DEFAULT true,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_integrations_type ON website_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_website_integrations_site ON website_integrations(site_id);

-- ============================================
-- 13. AUDIT LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS website_audit_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- page, product, order, etc.
    entity_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- create, update, delete, publish, etc.
    user_id INTEGER REFERENCES users(id),
    changes JSONB, -- Before/after values
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_audit_logs_site ON website_audit_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_website_audit_logs_entity ON website_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_website_audit_logs_user ON website_audit_logs(user_id);

-- ============================================
-- 14. THEMES & TEMPLATES
-- ============================================

CREATE TABLE IF NOT EXISTS website_themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    author VARCHAR(255),
    css_variables JSONB DEFAULT '{}', -- CSS custom properties
    templates JSONB DEFAULT '{}', -- Available page templates
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System themes cannot be deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 15. INVENTORY HOLDS (for checkout)
-- ============================================

CREATE TABLE IF NOT EXISTS website_inventory_holds (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    cart_id INTEGER REFERENCES website_carts(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES website_orders(id) ON DELETE SET NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_website_inventory_holds_product ON website_inventory_holds(product_id);
CREATE INDEX IF NOT EXISTS idx_website_inventory_holds_expires ON website_inventory_holds(expires_at);

-- ============================================
-- 16. TAX RULES (linked to ERP)
-- ============================================

CREATE TABLE IF NOT EXISTS website_tax_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    country VARCHAR(2),
    state VARCHAR(100),
    tax_rate DECIMAL(5, 2) NOT NULL, -- Percentage
    applies_to_shipping BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 17. SHIPPING METHODS
-- ============================================

CREATE TABLE IF NOT EXISTS website_shipping_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    carrier VARCHAR(100), -- fedex, ups, shiprocket, etc.
    method_type VARCHAR(50) CHECK (method_type IN ('flat_rate', 'weight_based', 'price_based', 'carrier_api')) DEFAULT 'flat_rate',
    cost DECIMAL(10, 2) DEFAULT 0,
    free_shipping_threshold DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}', -- Carrier-specific config
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 18. PAYMENT METHODS
-- ============================================

CREATE TABLE IF NOT EXISTS website_payment_methods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- stripe, adyen, payu, etc.
    method_type VARCHAR(50) CHECK (method_type IN ('card', 'bank_transfer', 'wallet', 'cash_on_delivery', 'other')) DEFAULT 'card',
    is_active BOOLEAN DEFAULT true,
    config JSONB NOT NULL DEFAULT '{}', -- API keys, credentials
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_website_sites_updated_at BEFORE UPDATE ON website_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_blocks_updated_at BEFORE UPDATE ON website_blocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_media_updated_at BEFORE UPDATE ON website_media FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_products_updated_at BEFORE UPDATE ON website_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_categories_updated_at BEFORE UPDATE ON website_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_carts_updated_at BEFORE UPDATE ON website_carts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_orders_updated_at BEFORE UPDATE ON website_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_promotions_updated_at BEFORE UPDATE ON website_promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_forms_updated_at BEFORE UPDATE ON website_forms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_webhooks_updated_at BEFORE UPDATE ON website_webhooks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_integrations_updated_at BEFORE UPDATE ON website_integrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_themes_updated_at BEFORE UPDATE ON website_themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_tax_rules_updated_at BEFORE UPDATE ON website_tax_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_shipping_methods_updated_at BEFORE UPDATE ON website_shipping_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_website_payment_methods_updated_at BEFORE UPDATE ON website_payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_website_pages_site ON website_pages(site_id);
CREATE INDEX IF NOT EXISTS idx_website_pages_status ON website_pages(status);
CREATE INDEX IF NOT EXISTS idx_website_pages_slug ON website_pages(slug);
CREATE INDEX IF NOT EXISTS idx_website_blocks_site ON website_blocks(site_id);
CREATE INDEX IF NOT EXISTS idx_website_blocks_type ON website_blocks(type);

-- ============================================
-- INITIAL DATA / SEED
-- ============================================

-- Create default site
INSERT INTO website_sites (name, domain, is_default, is_active) 
VALUES ('Default Site', 'localhost', true, true)
ON CONFLICT DO NOTHING;

-- Create default theme
INSERT INTO website_themes (name, slug, description, is_system, is_active)
VALUES ('Default Theme', 'default', 'Default system theme', true, true)
ON CONFLICT DO NOTHING;

