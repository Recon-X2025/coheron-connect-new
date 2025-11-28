-- ============================================
-- SALES MODULE - COMPREHENSIVE ENTERPRISE SCHEMA
-- ============================================
-- This migration adds all tables and features for enterprise-grade Sales Module
-- Includes: Leads, Opportunities, Quotations, Orders, Pricing, Contracts, Delivery, Returns, Forecasting, Analytics

-- ============================================
-- 1. LEAD & OPPORTUNITY MANAGEMENT (CRM CORE)
-- ============================================

-- Enhanced Leads table (extend existing)
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS source VARCHAR(100), -- Lead source (website, email, referral, etc.)
  ADD COLUMN IF NOT EXISTS medium VARCHAR(100), -- Marketing medium
  ADD COLUMN IF NOT EXISTS campaign_id INTEGER REFERENCES campaigns(id),
  ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0, -- Lead score
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS company_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100),
  ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS converted_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS lost_reason TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[]; -- Array of tags

-- Lead Activities (calls, emails, meetings)
CREATE TABLE IF NOT EXISTS lead_activities (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'whatsapp')) NOT NULL,
    subject VARCHAR(255),
    description TEXT,
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_minutes INTEGER,
    user_id INTEGER REFERENCES users(id),
    related_opportunity_id INTEGER REFERENCES leads(id), -- If type='opportunity'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead Scoring History
CREATE TABLE IF NOT EXISTS lead_scoring_history (
    id SERIAL PRIMARY KEY,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    scoring_rule_id INTEGER REFERENCES lead_scoring_rules(id),
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead Assignment Rules
CREATE TABLE IF NOT EXISTS lead_assignment_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    assignment_type VARCHAR(20) CHECK (assignment_type IN ('round_robin', 'territory', 'score', 'manual')) NOT NULL,
    criteria JSONB, -- Assignment criteria
    user_ids INTEGER[], -- Assigned users
    territory_id INTEGER, -- If territory-based
    priority INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Territories
CREATE TABLE IF NOT EXISTS sales_territories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    region VARCHAR(100),
    country VARCHAR(100),
    manager_id INTEGER REFERENCES users(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competitor Tracking
CREATE TABLE IF NOT EXISTS competitor_tracking (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_strength TEXT,
    competitor_weakness TEXT,
    our_competitive_advantage TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Opportunity Documents (SOWs, proposals)
CREATE TABLE IF NOT EXISTS opportunity_documents (
    id SERIAL PRIMARY KEY,
    opportunity_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    document_type VARCHAR(50) CHECK (document_type IN ('proposal', 'sow', 'quote', 'contract', 'other')) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_path TEXT,
    version INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CUSTOMER & ACCOUNT MANAGEMENT
-- ============================================

-- Enhance Partners table (extend existing)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES partners(id), -- Account hierarchy
  ADD COLUMN IF NOT EXISTS industry VARCHAR(100),
  ADD COLUMN IF NOT EXISTS segment VARCHAR(50), -- Customer segment
  ADD COLUMN IF NOT EXISTS category VARCHAR(50), -- Customer category
  ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(50), -- e.g., 'Net 30', 'COD'
  ADD COLUMN IF NOT EXISTS tax_id VARCHAR(100), -- GST/VAT number
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS billing_address TEXT,
  ADD COLUMN IF NOT EXISTS shipping_address TEXT,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS customer_rating INTEGER CHECK (customer_rating >= 1 AND customer_rating <= 5),
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Customer Contacts (separate from partners)
CREATE TABLE IF NOT EXISTS customer_contacts (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    job_title VARCHAR(255),
    department VARCHAR(100),
    is_primary BOOLEAN DEFAULT false,
    is_billing_contact BOOLEAN DEFAULT false,
    is_shipping_contact BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Activity Timeline (360° view)
CREATE TABLE IF NOT EXISTS customer_activities (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) CHECK (activity_type IN ('call', 'email', 'meeting', 'order', 'invoice', 'payment', 'support', 'note')) NOT NULL,
    subject VARCHAR(255),
    description TEXT,
    related_order_id INTEGER REFERENCES sale_orders(id),
    related_invoice_id INTEGER REFERENCES invoices(id),
    related_lead_id INTEGER REFERENCES leads(id),
    activity_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. QUOTATION / ESTIMATE MANAGEMENT
-- ============================================

-- Enhance Sale Orders table for quotations
ALTER TABLE sale_orders
  ADD COLUMN IF NOT EXISTS quote_number VARCHAR(100) UNIQUE,
  ADD COLUMN IF NOT EXISTS valid_until DATE, -- Quote validity
  ADD COLUMN IF NOT EXISTS quote_template_id INTEGER,
  ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
  ADD COLUMN IF NOT EXISTS delivery_terms VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(100),
  ADD COLUMN IF NOT EXISTS incoterm VARCHAR(50), -- FOB, CIF, etc.
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS currency_rate DECIMAL(10, 6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS amount_untaxed DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_tax DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS esign_document_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS opportunity_id INTEGER REFERENCES leads(id),
  ADD COLUMN IF NOT EXISTS order_type VARCHAR(50) CHECK (order_type IN ('standard', 'backorder', 'preorder', 'blanket', 'contract')) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS warehouse_id INTEGER,
  ADD COLUMN IF NOT EXISTS delivery_date DATE,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Quotation Versions
CREATE TABLE IF NOT EXISTS quotation_versions (
    id SERIAL PRIMARY KEY,
    sale_order_id INTEGER REFERENCES sale_orders(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    quote_data JSONB, -- Store full quote data as JSON
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sale_order_id, version_number)
);

-- Enhance Sale Order Lines
ALTER TABLE sale_order_lines
  ADD COLUMN IF NOT EXISTS discount DECIMAL(5, 2) DEFAULT 0, -- Percentage discount
  ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0, -- Fixed discount
  ADD COLUMN IF NOT EXISTS tax_id INTEGER,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255), -- Store product name for historical records
  ADD COLUMN IF NOT EXISTS product_description TEXT,
  ADD COLUMN IF NOT EXISTS uom VARCHAR(50), -- Unit of measure
  ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 10;

-- Quote Templates
CREATE TABLE IF NOT EXISTS quote_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) CHECK (template_type IN ('standard', 'custom')) DEFAULT 'standard',
    header_html TEXT,
    footer_html TEXT,
    body_html TEXT,
    styles JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. PRICING & DISCOUNT ENGINE
-- ============================================

-- Price Lists
CREATE TABLE IF NOT EXISTS price_lists (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Prices (price list items)
CREATE TABLE IF NOT EXISTS product_prices (
    id SERIAL PRIMARY KEY,
    price_list_id INTEGER REFERENCES price_lists(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    min_quantity DECIMAL(10, 2) DEFAULT 1, -- Minimum quantity for this price
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(price_list_id, product_id, min_quantity)
);

-- Customer-Specific Pricing
CREATE TABLE IF NOT EXISTS customer_prices (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(partner_id, product_id)
);

-- Pricing Rules
CREATE TABLE IF NOT EXISTS pricing_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) CHECK (rule_type IN ('volume', 'tiered', 'promotional', 'contract', 'region')) NOT NULL,
    conditions JSONB, -- Rule conditions (quantity, date range, customer segment, etc.)
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'formula')) NOT NULL,
    discount_value DECIMAL(10, 2),
    formula TEXT, -- For formula-based pricing
    priority INTEGER DEFAULT 10, -- Lower number = higher priority
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discount Approval Rules
CREATE TABLE IF NOT EXISTS discount_approval_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    max_discount_percentage DECIMAL(5, 2), -- Max discount allowed without approval
    max_discount_amount DECIMAL(10, 2),
    requires_approval BOOLEAN DEFAULT true,
    approver_id INTEGER REFERENCES users(id),
    approval_workflow JSONB, -- Multi-level approval workflow
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Promotional Pricing
CREATE TABLE IF NOT EXISTS promotional_pricing (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(255),
    product_ids INTEGER[], -- Products included
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed', 'buy_x_get_y')) NOT NULL,
    discount_value DECIMAL(10, 2),
    buy_x_get_y_config JSONB, -- For BOGO offers
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. CONTRACTS, SLAs & SUBSCRIPTION MANAGEMENT
-- ============================================

-- Contracts
CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(100) UNIQUE NOT NULL,
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    contract_type VARCHAR(50) CHECK (contract_type IN ('sales', 'service', 'subscription', 'maintenance')) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_date DATE,
    auto_renew BOOLEAN DEFAULT false,
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly', 'one_time')) DEFAULT 'monthly',
    contract_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'expired', 'cancelled', 'renewed')) DEFAULT 'draft',
    terms_and_conditions TEXT,
    signed_at TIMESTAMP,
    signed_by INTEGER REFERENCES users(id),
    esign_document_id VARCHAR(255),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contract Lines (products/services in contract)
CREATE TABLE IF NOT EXISTS contract_lines (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(255),
    quantity DECIMAL(10, 2) DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    billing_frequency VARCHAR(20) CHECK (billing_frequency IN ('monthly', 'quarterly', 'yearly', 'one_time')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLAs (Service Level Agreements)
CREATE TABLE IF NOT EXISTS slas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    sla_type VARCHAR(50) CHECK (sla_type IN ('response_time', 'resolution_time', 'uptime', 'custom')) NOT NULL,
    target_value DECIMAL(10, 2) NOT NULL, -- e.g., 4 hours, 99.9%
    unit VARCHAR(20), -- hours, percentage, etc.
    penalty_per_violation DECIMAL(10, 2) DEFAULT 0,
    credit_per_violation DECIMAL(10, 2) DEFAULT 0,
    measurement_period VARCHAR(20) CHECK (measurement_period IN ('daily', 'weekly', 'monthly', 'quarterly')) DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Performance Tracking
CREATE TABLE IF NOT EXISTS sla_performance (
    id SERIAL PRIMARY KEY,
    sla_id INTEGER REFERENCES slas(id) ON DELETE CASCADE,
    contract_id INTEGER REFERENCES contracts(id) ON DELETE CASCADE,
    measurement_date DATE NOT NULL,
    actual_value DECIMAL(10, 2),
    target_value DECIMAL(10, 2),
    is_violated BOOLEAN DEFAULT false,
    violation_count INTEGER DEFAULT 0,
    penalty_applied DECIMAL(10, 2) DEFAULT 0,
    credit_applied DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sla_id, measurement_date)
);

-- Subscription Management
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    subscription_number VARCHAR(100) UNIQUE NOT NULL,
    contract_id INTEGER REFERENCES contracts(id),
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    product_id INTEGER REFERENCES products(id),
    subscription_plan VARCHAR(255),
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    next_billing_date DATE,
    status VARCHAR(20) CHECK (status IN ('active', 'suspended', 'cancelled', 'expired')) DEFAULT 'active',
    auto_renew BOOLEAN DEFAULT true,
    cancellation_reason TEXT,
    cancelled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Usage-Based Billing Rules
CREATE TABLE IF NOT EXISTS usage_billing_rules (
    id SERIAL PRIMARY KEY,
    subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE CASCADE,
    metric_name VARCHAR(255) NOT NULL, -- e.g., 'API calls', 'storage_gb', 'users'
    unit_price DECIMAL(10, 4) NOT NULL, -- Price per unit
    included_units DECIMAL(10, 2) DEFAULT 0, -- Free tier units
    overage_price DECIMAL(10, 4), -- Price for overage
    billing_frequency VARCHAR(20) CHECK (billing_frequency IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. DELIVERY & FULFILLMENT
-- ============================================

-- Delivery Orders
CREATE TABLE IF NOT EXISTS delivery_orders (
    id SERIAL PRIMARY KEY,
    delivery_number VARCHAR(100) UNIQUE NOT NULL,
    sale_order_id INTEGER REFERENCES sale_orders(id),
    warehouse_id INTEGER,
    delivery_date DATE NOT NULL,
    delivery_address TEXT,
    delivery_method VARCHAR(50), -- Standard, Express, Overnight, etc.
    carrier_name VARCHAR(255),
    tracking_number VARCHAR(255),
    status VARCHAR(20) CHECK (status IN ('draft', 'ready', 'in_transit', 'delivered', 'cancelled')) DEFAULT 'draft',
    delivered_at TIMESTAMP,
    delivery_notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Order Lines
CREATE TABLE IF NOT EXISTS delivery_order_lines (
    id SERIAL PRIMARY KEY,
    delivery_order_id INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
    sale_order_line_id INTEGER REFERENCES sale_order_lines(id),
    product_id INTEGER REFERENCES products(id),
    quantity_ordered DECIMAL(10, 2) NOT NULL,
    quantity_delivered DECIMAL(10, 2) DEFAULT 0,
    quantity_pending DECIMAL(10, 2) GENERATED ALWAYS AS (quantity_ordered - quantity_delivered) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Tracking
CREATE TABLE IF NOT EXISTS shipment_tracking (
    id SERIAL PRIMARY KEY,
    delivery_order_id INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
    tracking_event VARCHAR(100) NOT NULL, -- 'Picked up', 'In transit', 'Out for delivery', 'Delivered', etc.
    location VARCHAR(255),
    event_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Freight Charges
CREATE TABLE IF NOT EXISTS freight_charges (
    id SERIAL PRIMARY KEY,
    delivery_order_id INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
    charge_type VARCHAR(50) CHECK (charge_type IN ('shipping', 'handling', 'insurance', 'customs', 'other')) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. RETURNS & AFTER-SALES
-- ============================================

-- Return Merchandise Authorization (RMA)
CREATE TABLE IF NOT EXISTS rmas (
    id SERIAL PRIMARY KEY,
    rma_number VARCHAR(100) UNIQUE NOT NULL,
    sale_order_id INTEGER REFERENCES sale_orders(id),
    delivery_order_id INTEGER REFERENCES delivery_orders(id),
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    reason VARCHAR(100) CHECK (reason IN ('defective', 'wrong_item', 'damaged', 'not_as_described', 'customer_change_mind', 'warranty', 'other')) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('requested', 'approved', 'rejected', 'received', 'processed', 'completed', 'cancelled')) DEFAULT 'requested',
    requested_date DATE NOT NULL,
    approved_date DATE,
    received_date DATE,
    processed_date DATE,
    refund_amount DECIMAL(10, 2) DEFAULT 0,
    refund_method VARCHAR(50) CHECK (refund_method IN ('original_payment', 'store_credit', 'replacement', 'repair')),
    replacement_order_id INTEGER REFERENCES sale_orders(id),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RMA Lines
CREATE TABLE IF NOT EXISTS rma_lines (
    id SERIAL PRIMARY KEY,
    rma_id INTEGER REFERENCES rmas(id) ON DELETE CASCADE,
    sale_order_line_id INTEGER REFERENCES sale_order_lines(id),
    product_id INTEGER REFERENCES products(id) NOT NULL,
    quantity_returned DECIMAL(10, 2) NOT NULL,
    condition VARCHAR(50) CHECK (condition IN ('new', 'used', 'defective', 'damaged')) DEFAULT 'used',
    refund_amount DECIMAL(10, 2) DEFAULT 0,
    replacement_product_id INTEGER REFERENCES products(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Warranty Tracking
CREATE TABLE IF NOT EXISTS warranties (
    id SERIAL PRIMARY KEY,
    warranty_number VARCHAR(100) UNIQUE NOT NULL,
    sale_order_id INTEGER REFERENCES sale_orders(id),
    sale_order_line_id INTEGER REFERENCES sale_order_lines(id),
    product_id INTEGER REFERENCES products(id) NOT NULL,
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    warranty_type VARCHAR(50) CHECK (warranty_type IN ('manufacturer', 'extended', 'service')) NOT NULL,
    warranty_period_months INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('active', 'expired', 'void')) DEFAULT 'active',
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Repair Requests
CREATE TABLE IF NOT EXISTS repair_requests (
    id SERIAL PRIMARY KEY,
    repair_number VARCHAR(100) UNIQUE NOT NULL,
    warranty_id INTEGER REFERENCES warranties(id),
    sale_order_id INTEGER REFERENCES sale_orders(id),
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    issue_description TEXT NOT NULL,
    status VARCHAR(20) CHECK (status IN ('requested', 'approved', 'in_repair', 'completed', 'rejected', 'cancelled')) DEFAULT 'requested',
    estimated_cost DECIMAL(10, 2) DEFAULT 0,
    actual_cost DECIMAL(10, 2) DEFAULT 0,
    repair_center VARCHAR(255),
    requested_date DATE NOT NULL,
    completed_date DATE,
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. SALES FORECASTING & PLANNING
-- ============================================

-- Sales Forecasts
CREATE TABLE IF NOT EXISTS sales_forecasts (
    id SERIAL PRIMARY KEY,
    forecast_name VARCHAR(255) NOT NULL,
    forecast_type VARCHAR(50) CHECK (forecast_type IN ('quantity', 'revenue', 'pipeline', 'rep_level')) NOT NULL,
    period_type VARCHAR(20) CHECK (period_type IN ('monthly', 'quarterly', 'yearly')) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    user_id INTEGER REFERENCES users(id), -- For rep-level forecasts
    territory_id INTEGER REFERENCES sales_territories(id), -- For territory forecasts
    forecasted_amount DECIMAL(10, 2) NOT NULL,
    forecasted_quantity DECIMAL(10, 2),
    actual_amount DECIMAL(10, 2) DEFAULT 0,
    actual_quantity DECIMAL(10, 2) DEFAULT 0,
    confidence_level INTEGER CHECK (confidence_level >= 0 AND confidence_level <= 100), -- 0-100%
    forecast_method VARCHAR(50), -- 'manual', 'historical', 'ai', 'pipeline'
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Forecast Lines (product-wise or opportunity-wise breakdown)
CREATE TABLE IF NOT EXISTS forecast_lines (
    id SERIAL PRIMARY KEY,
    forecast_id INTEGER REFERENCES sales_forecasts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    opportunity_id INTEGER REFERENCES leads(id),
    forecasted_amount DECIMAL(10, 2) NOT NULL,
    forecasted_quantity DECIMAL(10, 2),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Targets
CREATE TABLE IF NOT EXISTS sales_targets (
    id SERIAL PRIMARY KEY,
    target_name VARCHAR(255) NOT NULL,
    user_id INTEGER REFERENCES users(id), -- Individual rep target
    team_id INTEGER, -- Team target
    territory_id INTEGER REFERENCES sales_territories(id), -- Territory target
    product_id INTEGER REFERENCES products(id), -- Product-specific target
    period_type VARCHAR(20) CHECK (period_type IN ('monthly', 'quarterly', 'yearly')) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    revenue_target DECIMAL(10, 2) NOT NULL,
    quantity_target DECIMAL(10, 2),
    deal_count_target INTEGER,
    achievement_revenue DECIMAL(10, 2) DEFAULT 0,
    achievement_quantity DECIMAL(10, 2) DEFAULT 0,
    achievement_deal_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. SALES TEAM PERFORMANCE MANAGEMENT
-- ============================================

-- Sales Teams
CREATE TABLE IF NOT EXISTS sales_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    manager_id INTEGER REFERENCES users(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Team Members
CREATE TABLE IF NOT EXISTS sales_team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES sales_teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('manager', 'rep', 'coordinator', 'analyst')) DEFAULT 'rep',
    joined_date DATE DEFAULT CURRENT_DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(team_id, user_id)
);

-- Sales Incentives
CREATE TABLE IF NOT EXISTS sales_incentives (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    incentive_type VARCHAR(50) CHECK (incentive_type IN ('commission', 'bonus', 'spiff', 'contest')) NOT NULL,
    calculation_method VARCHAR(50) CHECK (calculation_method IN ('percentage', 'fixed', 'tiered', 'formula')) NOT NULL,
    calculation_formula TEXT, -- For formula-based calculations
    conditions JSONB, -- Conditions for earning incentive
    amount_percentage DECIMAL(5, 2), -- Commission percentage
    fixed_amount DECIMAL(10, 2), -- Fixed bonus amount
    tier_rules JSONB, -- For tiered incentives
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Incentive Payments
CREATE TABLE IF NOT EXISTS sales_incentive_payments (
    id SERIAL PRIMARY KEY,
    incentive_id INTEGER REFERENCES sales_incentives(id),
    user_id INTEGER REFERENCES users(id) NOT NULL,
    sale_order_id INTEGER REFERENCES sale_orders(id),
    period_start DATE,
    period_end DATE,
    base_amount DECIMAL(10, 2) NOT NULL, -- Order amount or target amount
    incentive_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'approved', 'paid', 'cancelled')) DEFAULT 'pending',
    paid_at TIMESTAMP,
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Activity KPIs
CREATE TABLE IF NOT EXISTS sales_activity_kpis (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calls_made INTEGER DEFAULT 0,
    emails_sent INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0,
    opportunities_created INTEGER DEFAULT 0,
    quotes_sent INTEGER DEFAULT 0,
    orders_won INTEGER DEFAULT 0,
    orders_lost INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, period_start, period_end)
);

-- ============================================
-- 10. CUSTOMER COMMUNICATION & DOCUMENTS
-- ============================================

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) CHECK (template_type IN ('quote', 'order_ack', 'delivery', 'invoice', 'custom')) NOT NULL,
    subject VARCHAR(255),
    body_html TEXT,
    body_text TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email Communications
CREATE TABLE IF NOT EXISTS email_communications (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id),
    lead_id INTEGER REFERENCES leads(id),
    sale_order_id INTEGER REFERENCES sale_orders(id),
    template_id INTEGER REFERENCES email_templates(id),
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    sent_to VARCHAR(255) NOT NULL,
    sent_from VARCHAR(255) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) CHECK (status IN ('draft', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed')) DEFAULT 'sent',
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Document Folders (per customer)
CREATE TABLE IF NOT EXISTS document_folders (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    folder_name VARCHAR(255) NOT NULL,
    parent_folder_id INTEGER REFERENCES document_folders(id),
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customer Documents
CREATE TABLE IF NOT EXISTS customer_documents (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    folder_id INTEGER REFERENCES document_folders(id),
    document_type VARCHAR(50) CHECK (document_type IN ('quote', 'order', 'invoice', 'contract', 'proposal', 'other')) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    related_sale_order_id INTEGER REFERENCES sale_orders(id),
    related_invoice_id INTEGER REFERENCES invoices(id),
    related_contract_id INTEGER REFERENCES contracts(id),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. ANALYTICS & REPORTING TABLES
-- ============================================

-- Sales Analytics Cache (for performance)
CREATE TABLE IF NOT EXISTS sales_analytics_cache (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_type VARCHAR(50) CHECK (metric_type IN ('revenue', 'quantity', 'count', 'percentage', 'average')) NOT NULL,
    period_type VARCHAR(20) CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    dimension VARCHAR(100), -- e.g., 'product', 'customer', 'territory', 'rep'
    dimension_value VARCHAR(255),
    metric_value DECIMAL(10, 2) NOT NULL,
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_name, period_type, period_start, dimension, dimension_value)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Lead indexes
CREATE INDEX IF NOT EXISTS idx_leads_partner ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at);

-- Lead activities
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_date ON lead_activities(activity_date);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user ON lead_activities(user_id);

-- Sale orders
CREATE INDEX IF NOT EXISTS idx_sale_orders_partner ON sale_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_state ON sale_orders(state);
CREATE INDEX IF NOT EXISTS idx_sale_orders_date ON sale_orders(date_order);
CREATE INDEX IF NOT EXISTS idx_sale_orders_opportunity ON sale_orders(opportunity_id);

-- Price lists
CREATE INDEX IF NOT EXISTS idx_product_prices_list ON product_prices(price_list_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON product_prices(product_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_partner ON customer_prices(partner_id);
CREATE INDEX IF NOT EXISTS idx_customer_prices_product ON customer_prices(product_id);

-- Contracts
CREATE INDEX IF NOT EXISTS idx_contracts_partner ON contracts(partner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON contracts(start_date, end_date);

-- Delivery orders
CREATE INDEX IF NOT EXISTS idx_delivery_orders_sale ON delivery_orders(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_date ON delivery_orders(delivery_date);

-- RMAs
CREATE INDEX IF NOT EXISTS idx_rmas_partner ON rmas(partner_id);
CREATE INDEX IF NOT EXISTS idx_rmas_sale_order ON rmas(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_rmas_status ON rmas(status);

-- Forecasts
CREATE INDEX IF NOT EXISTS idx_forecasts_user ON sales_forecasts(user_id);
CREATE INDEX IF NOT EXISTS idx_forecasts_period ON sales_forecasts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_targets_user ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_targets_period ON sales_targets(period_start, period_end);

-- Analytics cache
CREATE INDEX IF NOT EXISTS idx_analytics_cache_metric ON sales_analytics_cache(metric_name, period_type);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_period ON sales_analytics_cache(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_dimension ON sales_analytics_cache(dimension, dimension_value);

