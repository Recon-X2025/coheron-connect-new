-- ============================================
-- CRM RBAC ENHANCEMENTS MIGRATION
-- ============================================
-- This migration adds CRM-specific fields and tables for RBAC implementation
-- Includes: Territory management, Partner/Channel, Discount thresholds, Field-level security, Approval workflows

-- ============================================
-- 1. TERRITORY MANAGEMENT
-- ============================================

-- Territories table
CREATE TABLE IF NOT EXISTS territories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    region VARCHAR(100), -- e.g., 'North India', 'South India', 'APAC'
    country VARCHAR(100),
    state VARCHAR(100),
    zip_codes TEXT[], -- Array of ZIP codes covered
    industries TEXT[], -- Industries covered
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Territory assignments (users assigned to territories)
CREATE TABLE IF NOT EXISTS user_territories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, territory_id)
);

-- Territory assignment rules (auto-assignment rules)
CREATE TABLE IF NOT EXISTS territory_rules (
    id SERIAL PRIMARY KEY,
    territory_id INTEGER REFERENCES territories(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) CHECK (rule_type IN ('zip_code', 'state', 'country', 'industry', 'company_size')) NOT NULL,
    rule_value TEXT NOT NULL, -- e.g., 'Karnataka', '560001', 'IT'
    priority INTEGER DEFAULT 0, -- Higher priority = checked first
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. PARTNER / CHANNEL MANAGEMENT
-- ============================================

-- Partners table enhancement (if not already exists)
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_type VARCHAR(50) CHECK (partner_type IN ('reseller', 'distributor', 'agent', 'referral', 'none')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS partner_tier VARCHAR(50) CHECK (partner_tier IN ('bronze', 'silver', 'gold', 'platinum', 'none')) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS partner_status VARCHAR(50) CHECK (partner_status IN ('pending', 'approved', 'active', 'suspended', 'inactive')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS partner_manager_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0, -- Commission percentage
  ADD COLUMN IF NOT EXISTS partner_since DATE;

-- Partner deal registrations
CREATE TABLE IF NOT EXISTS partner_deal_registrations (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
    lead_id INTEGER REFERENCES leads(id) ON DELETE CASCADE,
    opportunity_id INTEGER REFERENCES leads(id), -- If lead converted to opportunity
    registration_number VARCHAR(100) UNIQUE,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. DISCOUNT & APPROVAL MANAGEMENT
-- ============================================

-- Discount approval thresholds
CREATE TABLE IF NOT EXISTS discount_thresholds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    discount_min DECIMAL(5, 2) NOT NULL, -- Minimum discount % (e.g., 10.00)
    discount_max DECIMAL(5, 2) NOT NULL, -- Maximum discount % (e.g., 25.00)
    approval_role VARCHAR(100) NOT NULL, -- Role required for approval (e.g., 'sales_manager', 'sales_director')
    requires_justification BOOLEAN DEFAULT true,
    auto_approve BOOLEAN DEFAULT false, -- If true, auto-approve within this range
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Discount approval requests
CREATE TABLE IF NOT EXISTS discount_approvals (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES sale_orders(id) ON DELETE CASCADE,
    requested_by INTEGER REFERENCES users(id),
    discount_percentage DECIMAL(5, 2) NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    discounted_amount DECIMAL(10, 2) NOT NULL,
    justification TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quote approval workflow
CREATE TABLE IF NOT EXISTS quote_approvals (
    id SERIAL PRIMARY KEY,
    quote_id INTEGER REFERENCES sale_orders(id) ON DELETE CASCADE,
    approval_type VARCHAR(50) CHECK (approval_type IN ('discount', 'amount', 'margin', 'terms')) NOT NULL,
    requested_by INTEGER REFERENCES users(id),
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')) DEFAULT 'pending',
    approver_role VARCHAR(100), -- Role required for approval
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    metadata JSONB, -- Additional approval context
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. FIELD-LEVEL SECURITY
-- ============================================

-- Field-level permissions (extends existing permissions table)
-- This is handled via the permissions table's field_restrictions JSONB column
-- Example: {"fields": ["discount_percentage", "margin"], "action": "read_only"}

-- Field access audit log
CREATE TABLE IF NOT EXISTS field_access_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    resource_type VARCHAR(100) NOT NULL, -- e.g., 'lead', 'opportunity', 'quote'
    resource_id INTEGER NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    action VARCHAR(50) CHECK (action IN ('view', 'edit', 'denied')) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. ENHANCE EXISTING CRM TABLES
-- ============================================

-- Enhance leads table with RBAC fields
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id),
  ADD COLUMN IF NOT EXISTS team_id INTEGER, -- References teams table (if exists)
  ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id), -- Partner who registered
  ADD COLUMN IF NOT EXISTS is_partner_registered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_source_data JSONB, -- Raw form data for marketing analysis
  ADD COLUMN IF NOT EXISTS utm_source VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_medium VARCHAR(100),
  ADD COLUMN IF NOT EXISTS utm_campaign VARCHAR(100);

-- Enhance sale_orders (quotes) with RBAC fields
ALTER TABLE sale_orders
  ADD COLUMN IF NOT EXISTS discount_percentage DECIMAL(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margin_percentage DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10, 2), -- Cost for margin calculation
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected')) DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 4) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS acv DECIMAL(10, 2), -- Annual Contract Value
  ADD COLUMN IF NOT EXISTS tcv DECIMAL(10, 2), -- Total Contract Value
  ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id),
  ADD COLUMN IF NOT EXISTS team_id INTEGER;

-- Enhance partners (accounts) with RBAC fields
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS territory_id INTEGER REFERENCES territories(id),
  ADD COLUMN IF NOT EXISTS team_id INTEGER,
  ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id), -- Account owner
  ADD COLUMN IF NOT EXISTS personal_phone VARCHAR(50), -- Sensitive field (masked for some roles)
  ADD COLUMN IF NOT EXISTS salary DECIMAL(10, 2); -- Sensitive field (HR only)

-- ============================================
-- 6. EXPORT APPROVAL WORKFLOW
-- ============================================

-- Export approval requests
CREATE TABLE IF NOT EXISTS export_approvals (
    id SERIAL PRIMARY KEY,
    requested_by INTEGER REFERENCES users(id),
    resource_type VARCHAR(100) NOT NULL, -- e.g., 'leads', 'contacts', 'opportunities'
    record_count INTEGER NOT NULL,
    filters JSONB, -- Export filters applied
    justification TEXT,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    export_file_url TEXT, -- Link to exported file
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. TEMPORARY ACCESS ELEVATION
-- ============================================

-- Temporary access elevation requests
CREATE TABLE IF NOT EXISTS access_elevations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    requested_by INTEGER REFERENCES users(id), -- Manager who requested
    resource_type VARCHAR(100) NOT NULL,
    resource_id INTEGER NOT NULL,
    permission_code VARCHAR(100) NOT NULL, -- Permission being elevated
    reason TEXT,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(50) CHECK (status IN ('pending', 'approved', 'rejected', 'expired')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_territory ON leads(territory_id);
CREATE INDEX IF NOT EXISTS idx_leads_team ON leads(team_id);
CREATE INDEX IF NOT EXISTS idx_leads_partner ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_approval ON sale_orders(approval_status);
CREATE INDEX IF NOT EXISTS idx_sale_orders_territory ON sale_orders(territory_id);
CREATE INDEX IF NOT EXISTS idx_partners_territory ON partners(territory_id);
CREATE INDEX IF NOT EXISTS idx_partners_owner ON partners(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_territories_user ON user_territories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_territories_territory ON user_territories(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_rules_territory ON territory_rules(territory_id);
CREATE INDEX IF NOT EXISTS idx_discount_approvals_quote ON discount_approvals(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_approvals_quote ON quote_approvals(quote_id);
CREATE INDEX IF NOT EXISTS idx_partner_deal_registrations_partner ON partner_deal_registrations(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_deal_registrations_lead ON partner_deal_registrations(lead_id);
CREATE INDEX IF NOT EXISTS idx_field_access_logs_resource ON field_access_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_export_approvals_user ON export_approvals(requested_by);
CREATE INDEX IF NOT EXISTS idx_access_elevations_user ON access_elevations(user_id);
CREATE INDEX IF NOT EXISTS idx_access_elevations_expires ON access_elevations(expires_at) WHERE status = 'approved';

-- ============================================
-- 9. DEFAULT DATA
-- ============================================

-- Insert default discount thresholds
INSERT INTO discount_thresholds (name, discount_min, discount_max, approval_role, requires_justification, auto_approve)
VALUES
  ('Auto Approve (<10%)', 0, 9.99, 'sales_rep', false, true),
  ('Manager Approval (10-25%)', 10, 24.99, 'sales_manager', true, false),
  ('Director Approval (25-40%)', 25, 39.99, 'sales_director', true, false),
  ('Executive Approval (>40%)', 40, 100, 'system_admin', true, false)
ON CONFLICT DO NOTHING;

-- ============================================
-- 10. COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON TABLE territories IS 'Sales territories for geographic and industry-based assignment';
COMMENT ON TABLE user_territories IS 'User assignments to territories for access control';
COMMENT ON TABLE territory_rules IS 'Auto-assignment rules for leads/opportunities based on geography/industry';
COMMENT ON TABLE partner_deal_registrations IS 'Partner deal registrations to prevent channel conflicts';
COMMENT ON TABLE discount_thresholds IS 'Discount approval thresholds and required approver roles';
COMMENT ON TABLE discount_approvals IS 'Discount approval requests and workflow';
COMMENT ON TABLE quote_approvals IS 'Quote approval workflow for discounts, amounts, margins, terms';
COMMENT ON TABLE field_access_logs IS 'Audit log for field-level access (sensitive fields)';
COMMENT ON TABLE export_approvals IS 'Bulk export approval workflow for compliance';
COMMENT ON TABLE access_elevations IS 'Temporary access elevation requests for urgent situations';

