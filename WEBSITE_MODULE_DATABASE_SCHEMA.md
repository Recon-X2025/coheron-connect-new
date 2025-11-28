# Website Module - Database Schema

This document contains the complete database schema for the Website Module, including table definitions, relationships, indexes, and constraints.

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Site Management Tables](#site-management-tables)
3. [Content Management Tables](#content-management-tables)
4. [E-commerce Tables](#e-commerce-tables)
5. [Marketing Tables](#marketing-tables)
6. [Forms Tables](#forms-tables)
7. [Integration Tables](#integration-tables)
8. [Analytics Tables](#analytics-tables)
9. [Audit Tables](#audit-tables)
10. [Entity Relationship Diagram](#entity-relationship-diagram)
11. [Indexes & Performance](#indexes--performance)

---

## Schema Overview

The Website Module database schema is organized into the following logical groups:

- **Site Management**: Multi-site configuration, themes, domains
- **Content**: Pages, blocks, media, versions
- **E-commerce**: Products, categories, cart, orders
- **Marketing**: Promotions, campaigns
- **Forms**: Custom forms and submissions
- **Integrations**: Webhooks, sync logs, API keys
- **Analytics**: Pageviews, events, tracking
- **Audit**: Activity logs, change history

All tables use PostgreSQL and follow these conventions:
- Primary keys: `id SERIAL PRIMARY KEY`
- Timestamps: `created_at`, `updated_at`
- Soft deletes: `deleted_at` (where applicable)
- Foreign keys with proper constraints

---

## Site Management Tables

### website_sites

Stores multi-site configuration.

```sql
CREATE TABLE IF NOT EXISTS website_sites (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE NOT NULL,
    subdomain VARCHAR(100),
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    theme_id INTEGER REFERENCES website_themes(id),
    settings JSONB DEFAULT '{}',
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_website_sites_domain ON website_sites(domain);
CREATE INDEX idx_website_sites_status ON website_sites(status);
```

### website_themes

Theme definitions with CSS variables.

```sql
CREATE TABLE IF NOT EXISTS website_themes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    css_variables JSONB DEFAULT '{}',
    custom_css TEXT,
    preview_image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_themes_is_default ON website_themes(is_default);
```

### website_domains

Domain mapping for sites (supports multiple domains per site).

```sql
CREATE TABLE IF NOT EXISTS website_domains (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    ssl_enabled BOOLEAN DEFAULT TRUE,
    ssl_certificate TEXT,
    ssl_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_domains_site_id ON website_domains(site_id);
CREATE INDEX idx_website_domains_domain ON website_domains(domain);
```

---

## Content Management Tables

### website_pages

Page content with blocks and SEO metadata.

```sql
CREATE TABLE IF NOT EXISTS website_pages (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    template VARCHAR(50),
    blocks JSONB DEFAULT '[]',
    status VARCHAR(20) CHECK (status IN ('draft', 'published', 'scheduled', 'archived')) DEFAULT 'draft',
    publish_at TIMESTAMP,
    published_at TIMESTAMP,
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_canonical_url TEXT,
    seo_robots VARCHAR(100),
    seo_keywords TEXT[],
    meta_tags JSONB DEFAULT '{}',
    author_id INTEGER REFERENCES users(id),
    version INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(site_id, slug)
);

CREATE INDEX idx_website_pages_site_id ON website_pages(site_id);
CREATE INDEX idx_website_pages_slug ON website_pages(slug);
CREATE INDEX idx_website_pages_status ON website_pages(status);
CREATE INDEX idx_website_pages_publish_at ON website_pages(publish_at);
CREATE INDEX idx_website_pages_site_slug ON website_pages(site_id, slug);
```

### website_blocks

Reusable block components.

```sql
CREATE TABLE IF NOT EXISTS website_blocks (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('text', 'image', 'gallery', 'product', 'cta', 'form', 'video', 'heading', 'button')),
    config JSONB DEFAULT '{}',
    is_global BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_website_blocks_site_id ON website_blocks(site_id);
CREATE INDEX idx_website_blocks_type ON website_blocks(type);
CREATE INDEX idx_website_blocks_is_global ON website_blocks(is_global);
```

### website_media

Media library with versioning.

```sql
CREATE TABLE IF NOT EXISTS website_media (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type VARCHAR(100),
    file_size BIGINT,
    width INTEGER,
    height INTEGER,
    alt_text TEXT,
    description TEXT,
    folder_path TEXT,
    versions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_website_media_site_id ON website_media(site_id);
CREATE INDEX idx_website_media_mime_type ON website_media(mime_type);
CREATE INDEX idx_website_media_folder_path ON website_media(folder_path);
```

### website_page_versions

Version history for pages.

```sql
CREATE TABLE IF NOT EXISTS website_page_versions (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES website_pages(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    title VARCHAR(255),
    blocks JSONB,
    seo_title VARCHAR(255),
    seo_description TEXT,
    author_id INTEGER REFERENCES users(id),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, version)
);

CREATE INDEX idx_website_page_versions_page_id ON website_page_versions(page_id);
CREATE INDEX idx_website_page_versions_version ON website_page_versions(page_id, version);
```

---

## E-commerce Tables

### website_products

Product catalog synced from ERP.

```sql
CREATE TABLE IF NOT EXISTS website_products (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    erp_product_id INTEGER,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    short_description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),
    cost DECIMAL(10, 2),
    status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'draft')) DEFAULT 'active',
    is_featured BOOLEAN DEFAULT FALSE,
    is_bestseller BOOLEAN DEFAULT FALSE,
    weight DECIMAL(10, 2),
    dimensions JSONB,
    attributes JSONB DEFAULT '{}',
    images JSONB DEFAULT '[]',
    seo_title VARCHAR(255),
    seo_description TEXT,
    seo_slug VARCHAR(255),
    sync_status VARCHAR(20) CHECK (sync_status IN ('synced', 'pending', 'error')) DEFAULT 'pending',
    last_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(site_id, sku)
);

CREATE INDEX idx_website_products_site_id ON website_products(site_id);
CREATE INDEX idx_website_products_sku ON website_products(sku);
CREATE INDEX idx_website_products_erp_product_id ON website_products(erp_product_id);
CREATE INDEX idx_website_products_status ON website_products(status);
CREATE INDEX idx_website_products_is_featured ON website_products(is_featured);
CREATE INDEX idx_website_products_sync_status ON website_products(sync_status);
```

### website_product_variants

Product variants (size, color, etc.).

```sql
CREATE TABLE IF NOT EXISTS website_product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES website_products(id) ON DELETE CASCADE,
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255),
    price DECIMAL(10, 2),
    compare_at_price DECIMAL(10, 2),
    attributes JSONB DEFAULT '{}',
    image_url TEXT,
    inventory_quantity INTEGER DEFAULT 0,
    inventory_policy VARCHAR(20) CHECK (inventory_policy IN ('deny', 'continue')) DEFAULT 'deny',
    weight DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, sku)
);

CREATE INDEX idx_website_product_variants_product_id ON website_product_variants(product_id);
CREATE INDEX idx_website_product_variants_sku ON website_product_variants(sku);
```

### website_categories

Product category hierarchy.

```sql
CREATE TABLE IF NOT EXISTS website_categories (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES website_categories(id) ON DELETE SET NULL,
    image_url TEXT,
    seo_title VARCHAR(255),
    seo_description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(site_id, slug)
);

CREATE INDEX idx_website_categories_site_id ON website_categories(site_id);
CREATE INDEX idx_website_categories_parent_id ON website_categories(parent_id);
CREATE INDEX idx_website_categories_slug ON website_categories(slug);
```

### website_product_categories

Product-category mapping (many-to-many).

```sql
CREATE TABLE IF NOT EXISTS website_product_categories (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES website_products(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES website_categories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, category_id)
);

CREATE INDEX idx_website_product_categories_product_id ON website_product_categories(product_id);
CREATE INDEX idx_website_product_categories_category_id ON website_product_categories(category_id);
```

### website_carts

Shopping cart management.

```sql
CREATE TABLE IF NOT EXISTS website_carts (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    customer_id INTEGER REFERENCES partners(id),
    currency VARCHAR(10) DEFAULT 'USD',
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) DEFAULT 0,
    promotion_code VARCHAR(50),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_carts_site_id ON website_carts(site_id);
CREATE INDEX idx_website_carts_session_id ON website_carts(session_id);
CREATE INDEX idx_website_carts_customer_id ON website_carts(customer_id);
CREATE INDEX idx_website_carts_expires_at ON website_carts(expires_at);
```

### website_cart_items

Cart line items.

```sql
CREATE TABLE IF NOT EXISTS website_cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES website_carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES website_products(id),
    variant_id INTEGER REFERENCES website_product_variants(id),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    attributes JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_cart_items_cart_id ON website_cart_items(cart_id);
CREATE INDEX idx_website_cart_items_product_id ON website_cart_items(product_id);
```

### website_orders

E-commerce orders linked to ERP.

```sql
CREATE TABLE IF NOT EXISTS website_orders (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    order_number VARCHAR(100) UNIQUE NOT NULL,
    erp_order_id INTEGER,
    erp_order_ref VARCHAR(100),
    customer_id INTEGER REFERENCES partners(id),
    customer_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')) DEFAULT 'pending',
    payment_status VARCHAR(50) CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partial')) DEFAULT 'pending',
    shipping_status VARCHAR(50) CHECK (shipping_status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')) DEFAULT 'pending',
    currency VARCHAR(10) DEFAULT 'USD',
    subtotal DECIMAL(10, 2) DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    shipping_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    promotion_code VARCHAR(50),
    shipping_address JSONB NOT NULL,
    billing_address JSONB NOT NULL,
    shipping_method VARCHAR(100),
    payment_method VARCHAR(100),
    payment_reference VARCHAR(255),
    tracking_number VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_orders_site_id ON website_orders(site_id);
CREATE INDEX idx_website_orders_order_number ON website_orders(order_number);
CREATE INDEX idx_website_orders_erp_order_id ON website_orders(erp_order_id);
CREATE INDEX idx_website_orders_customer_id ON website_orders(customer_id);
CREATE INDEX idx_website_orders_customer_email ON website_orders(customer_email);
CREATE INDEX idx_website_orders_status ON website_orders(status);
CREATE INDEX idx_website_orders_created_at ON website_orders(created_at);
```

### website_order_items

Order line items with product snapshots.

```sql
CREATE TABLE IF NOT EXISTS website_order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES website_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES website_products(id),
    variant_id INTEGER REFERENCES website_product_variants(id),
    sku VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    attributes JSONB DEFAULT '{}',
    product_snapshot JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_order_items_order_id ON website_order_items(order_id);
CREATE INDEX idx_website_order_items_product_id ON website_order_items(product_id);
```

### website_order_status_history

Order status tracking.

```sql
CREATE TABLE IF NOT EXISTS website_order_status_history (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES website_orders(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50),
    shipping_status VARCHAR(50),
    notes TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_order_status_history_order_id ON website_order_status_history(order_id);
CREATE INDEX idx_website_order_status_history_created_at ON website_order_status_history(order_id, created_at);
```

---

## Marketing Tables

### website_promotions

Discount codes and promotional rules.

```sql
CREATE TABLE IF NOT EXISTS website_promotions (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    code VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    minimum_order_amount DECIMAL(10, 2),
    maximum_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP,
    usage_limit INTEGER,
    usage_limit_per_customer INTEGER,
    customer_segments JSONB DEFAULT '[]',
    product_ids INTEGER[],
    category_ids INTEGER[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_promotions_site_id ON website_promotions(site_id);
CREATE INDEX idx_website_promotions_code ON website_promotions(code);
CREATE INDEX idx_website_promotions_is_active ON website_promotions(is_active);
CREATE INDEX idx_website_promotions_valid_dates ON website_promotions(valid_from, valid_until);
```

### website_promotion_usage

Promotion usage tracking.

```sql
CREATE TABLE IF NOT EXISTS website_promotion_usage (
    id SERIAL PRIMARY KEY,
    promotion_id INTEGER REFERENCES website_promotions(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES website_orders(id),
    customer_id INTEGER REFERENCES partners(id),
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_promotion_usage_promotion_id ON website_promotion_usage(promotion_id);
CREATE INDEX idx_website_promotion_usage_order_id ON website_promotion_usage(order_id);
CREATE INDEX idx_website_promotion_usage_customer_id ON website_promotion_usage(customer_id);
```

---

## Forms Tables

### website_forms

Custom form definitions.

```sql
CREATE TABLE IF NOT EXISTS website_forms (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL,
    settings JSONB DEFAULT '{}',
    recaptcha_enabled BOOLEAN DEFAULT TRUE,
    crm_lead_enabled BOOLEAN DEFAULT TRUE,
    email_notifications BOOLEAN DEFAULT TRUE,
    notification_emails TEXT[],
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    UNIQUE(site_id, slug)
);

CREATE INDEX idx_website_forms_site_id ON website_forms(site_id);
CREATE INDEX idx_website_forms_slug ON website_forms(slug);
CREATE INDEX idx_website_forms_is_active ON website_forms(is_active);
```

### website_form_submissions

Form submission tracking.

```sql
CREATE TABLE IF NOT EXISTS website_form_submissions (
    id SERIAL PRIMARY KEY,
    form_id INTEGER REFERENCES website_forms(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) CHECK (status IN ('new', 'processed', 'converted', 'archived')) DEFAULT 'new',
    crm_lead_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_form_submissions_form_id ON website_form_submissions(form_id);
CREATE INDEX idx_website_form_submissions_status ON website_form_submissions(status);
CREATE INDEX idx_website_form_submissions_created_at ON website_form_submissions(created_at);
```

---

## Integration Tables

### website_webhooks

Webhook configurations.

```sql
CREATE TABLE IF NOT EXISTS website_webhooks (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    event VARCHAR(100) NOT NULL CHECK (event IN ('order.created', 'order.updated', 'payment.succeeded', 'payment.failed', 'content.published', 'product.updated', 'customer.created')),
    target_url TEXT NOT NULL,
    secret VARCHAR(255) NOT NULL,
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_webhooks_site_id ON website_webhooks(site_id);
CREATE INDEX idx_website_webhooks_event ON website_webhooks(event);
CREATE INDEX idx_website_webhooks_is_active ON website_webhooks(is_active);
```

### website_webhook_deliveries

Webhook delivery logs.

```sql
CREATE TABLE IF NOT EXISTS website_webhook_deliveries (
    id SERIAL PRIMARY KEY,
    webhook_id INTEGER REFERENCES website_webhooks(id) ON DELETE CASCADE,
    event_id VARCHAR(255),
    status_code INTEGER,
    response_body TEXT,
    error_message TEXT,
    attempts INTEGER DEFAULT 1,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_webhook_deliveries_webhook_id ON website_webhook_deliveries(webhook_id);
CREATE INDEX idx_website_webhook_deliveries_status_code ON website_webhook_deliveries(status_code);
CREATE INDEX idx_website_webhook_deliveries_created_at ON website_webhook_deliveries(created_at);
```

### website_integrations

Integration settings (payment, shipping, analytics).

```sql
CREATE TABLE IF NOT EXISTS website_integrations (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('payment', 'shipping', 'analytics', 'crm', 'email')),
    provider VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_integrations_site_id ON website_integrations(site_id);
CREATE INDEX idx_website_integrations_type ON website_integrations(type);
CREATE INDEX idx_website_integrations_is_active ON website_integrations(is_active);
```

### website_sync_logs

ERP sync operation logs.

```sql
CREATE TABLE IF NOT EXISTS website_sync_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('product', 'inventory', 'customer', 'order', 'price')),
    entity_type VARCHAR(50),
    entity_id INTEGER,
    status VARCHAR(20) CHECK (status IN ('success', 'error', 'pending')) DEFAULT 'pending',
    error_message TEXT,
    data_snapshot JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_sync_logs_site_id ON website_sync_logs(site_id);
CREATE INDEX idx_website_sync_logs_sync_type ON website_sync_logs(sync_type);
CREATE INDEX idx_website_sync_logs_status ON website_sync_logs(status);
CREATE INDEX idx_website_sync_logs_created_at ON website_sync_logs(created_at);
```

---

## Analytics Tables

### website_pageviews

Page view tracking.

```sql
CREATE TABLE IF NOT EXISTS website_pageviews (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    page_id INTEGER REFERENCES website_pages(id),
    page_url TEXT NOT NULL,
    page_title VARCHAR(255),
    referrer TEXT,
    user_agent TEXT,
    ip_address INET,
    session_id VARCHAR(255),
    customer_id INTEGER REFERENCES partners(id),
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_term VARCHAR(100),
    utm_content VARCHAR(100),
    country VARCHAR(2),
    device_type VARCHAR(20),
    browser VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_pageviews_site_id ON website_pageviews(site_id);
CREATE INDEX idx_website_pageviews_page_id ON website_pageviews(page_id);
CREATE INDEX idx_website_pageviews_session_id ON website_pageviews(session_id);
CREATE INDEX idx_website_pageviews_customer_id ON website_pageviews(customer_id);
CREATE INDEX idx_website_pageviews_created_at ON website_pageviews(created_at);
CREATE INDEX idx_website_pageviews_utm ON website_pageviews(utm_source, utm_medium, utm_campaign);
```

### website_events

Custom event tracking.

```sql
CREATE TABLE IF NOT EXISTS website_events (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    properties JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    customer_id INTEGER REFERENCES partners(id),
    page_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_events_site_id ON website_events(site_id);
CREATE INDEX idx_website_events_event_type ON website_events(event_type);
CREATE INDEX idx_website_events_session_id ON website_events(session_id);
CREATE INDEX idx_website_events_customer_id ON website_events(customer_id);
CREATE INDEX idx_website_events_created_at ON website_events(created_at);
```

---

## Audit Tables

### website_audit_logs

Comprehensive audit trail.

```sql
CREATE TABLE IF NOT EXISTS website_audit_logs (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES website_sites(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id INTEGER,
    resource_name VARCHAR(255),
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_audit_logs_site_id ON website_audit_logs(site_id);
CREATE INDEX idx_website_audit_logs_user_id ON website_audit_logs(user_id);
CREATE INDEX idx_website_audit_logs_action ON website_audit_logs(action);
CREATE INDEX idx_website_audit_logs_resource ON website_audit_logs(resource_type, resource_id);
CREATE INDEX idx_website_audit_logs_created_at ON website_audit_logs(created_at);
```

---

## Entity Relationship Diagram

### Simplified ERD

```
website_sites (1) ──< (N) website_pages
website_sites (1) ──< (N) website_products
website_sites (1) ──< (N) website_categories
website_sites (1) ──< (N) website_carts
website_sites (1) ──< (N) website_orders
website_sites (1) ──< (N) website_promotions
website_sites (1) ──< (N) website_forms
website_sites (1) ──< (N) website_webhooks

website_pages (1) ──< (N) website_page_versions
website_pages (1) ──< (N) website_pageviews

website_products (1) ──< (N) website_product_variants
website_products (N) >──< (N) website_categories (via website_product_categories)
website_products (1) ──< (N) website_cart_items
website_products (1) ──< (N) website_order_items

website_categories (1) ──< (N) website_categories (self-referential, parent_id)

website_carts (1) ──< (N) website_cart_items
partners (1) ──< (N) website_carts
partners (1) ──< (N) website_orders

website_orders (1) ──< (N) website_order_items
website_orders (1) ──< (N) website_order_status_history
website_orders (1) ──< (N) website_promotion_usage

website_promotions (1) ──< (N) website_promotion_usage

website_forms (1) ──< (N) website_form_submissions

website_webhooks (1) ──< (N) website_webhook_deliveries

users (1) ──< (N) website_pages (author_id)
users (1) ──< (N) website_audit_logs
```

---

## Indexes & Performance

### Critical Indexes

All foreign keys have indexes for join performance. Additional indexes for common queries:

**High-Traffic Queries:**
- `website_pages(site_id, slug, status)` - Page lookups
- `website_products(site_id, status, is_featured)` - Product listings
- `website_orders(site_id, status, created_at)` - Order management
- `website_carts(session_id, expires_at)` - Cart retrieval

**Search Queries:**
- Full-text search indexes on `website_pages.title`, `website_products.name`
- Consider PostgreSQL `tsvector` for advanced search

**Analytics Queries:**
- Composite indexes on `website_pageviews(site_id, created_at)` for time-series queries
- Indexes on UTM parameters for campaign analysis

### Performance Considerations

1. **Partitioning**: Consider partitioning `website_pageviews` and `website_events` by date for large datasets
2. **Archiving**: Archive old audit logs and analytics data
3. **Materialized Views**: For complex analytics queries
4. **Connection Pooling**: Use PgBouncer or similar
5. **Read Replicas**: For read-heavy workloads

### Database Maintenance

- Regular `VACUUM` and `ANALYZE`
- Monitor index usage and remove unused indexes
- Set up automated backups
- Monitor query performance with `pg_stat_statements`

---

## Migration Scripts

### Initial Schema Creation

```sql
-- Run all CREATE TABLE statements above
-- Then create indexes
-- Then set up triggers for updated_at timestamps
```

### Updated_at Trigger

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables with updated_at
CREATE TRIGGER update_website_sites_updated_at BEFORE UPDATE ON website_sites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Repeat for other tables...
```

---

## Document Version

- **v1.0** - Initial database schema document
- Last updated: [Current Date]

