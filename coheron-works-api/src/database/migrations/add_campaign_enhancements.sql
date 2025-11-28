-- Migration: Add enhanced fields to campaigns table for comprehensive marketing module
-- Run this migration to add new fields for campaign planning, objectives, KPIs, etc.

-- Add new campaign types
ALTER TABLE campaigns 
  DROP CONSTRAINT IF EXISTS campaigns_campaign_type_check;

ALTER TABLE campaigns
  ADD CONSTRAINT campaigns_campaign_type_check 
  CHECK (campaign_type IN ('email', 'social', 'sms', 'event', 'referral', 'ads', 'website', 'other'));

-- Add objective field
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS objective VARCHAR(20) CHECK (objective IN ('leads', 'awareness', 'revenue', 'engagement'));

-- Add budget limit field
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS budget_limit DECIMAL(10, 2) DEFAULT 0;

-- Add target KPIs (stored as JSON)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS target_kpis JSONB;

-- Add audience segment reference
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS audience_segment_id INTEGER;

-- Add description field
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Create audience segments table
CREATE TABLE IF NOT EXISTS audience_segments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    segment_type VARCHAR(20) CHECK (segment_type IN ('dynamic', 'static')) DEFAULT 'dynamic',
    criteria JSONB, -- Store segmentation criteria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create campaign assets table
CREATE TABLE IF NOT EXISTS campaign_assets (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) CHECK (asset_type IN ('image', 'template', 'landing_page', 'creative', 'document')) NOT NULL,
    name VARCHAR(255) NOT NULL,
    file_url TEXT,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create marketing automation workflows table
CREATE TABLE IF NOT EXISTS marketing_workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50), -- e.g., 'form_submission', 'email_open', 'lead_score_change'
    trigger_conditions JSONB,
    steps JSONB, -- Array of workflow steps
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create lead scoring rules table
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(20) CHECK (rule_type IN ('behavior', 'fit', 'custom')) NOT NULL,
    conditions JSONB,
    score_value INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create campaign performance tracking table
CREATE TABLE IF NOT EXISTS campaign_performance (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'ctr', 'cpl', 'cpa', 'roi', 'leads', 'clicks', 'impressions'
    metric_value DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(campaign_id, date, metric_type)
);

-- Create campaign financial tracking table (links to invoices/vendor bills)
CREATE TABLE IF NOT EXISTS campaign_financials (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    invoice_id INTEGER, -- Reference to invoices table
    vendor_bill_id INTEGER, -- Reference to vendor bills if exists
    amount DECIMAL(10, 2) NOT NULL,
    transaction_type VARCHAR(20) CHECK (transaction_type IN ('spend', 'revenue', 'refund')) DEFAULT 'spend',
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaigns_objective ON campaigns(objective);
CREATE INDEX IF NOT EXISTS idx_campaigns_audience_segment ON campaigns(audience_segment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_assets_campaign ON campaign_assets(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_workflows_campaign ON marketing_workflows(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_campaign ON campaign_performance(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_performance_date ON campaign_performance(date);
CREATE INDEX IF NOT EXISTS idx_campaign_financials_campaign ON campaign_financials(campaign_id);

