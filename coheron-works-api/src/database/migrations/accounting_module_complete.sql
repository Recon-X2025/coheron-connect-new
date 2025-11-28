-- ============================================
-- ACCOUNTING MODULE - Complete ERP Specification
-- ============================================
-- This migration adds comprehensive Accounting functionality
-- to the Coheron ERP system covering GL, AP, AR, Bank, Fixed Assets, Tax, etc.

-- ============================================
-- 1. GENERAL LEDGER - Chart of Accounts
-- ============================================

CREATE TABLE IF NOT EXISTS account_account (
    id SERIAL PRIMARY KEY,
    code VARCHAR(64) NOT NULL,
    name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL CHECK (account_type IN (
        'asset_receivable', 'asset_cash', 'asset_current', 'asset_non_current',
        'asset_fixed', 'asset_prepayments', 'liability_payable', 'liability_credit_card',
        'liability_current', 'liability_non_current', 'equity', 'equity_unaffected',
        'income', 'income_other', 'expense', 'expense_depreciation', 'expense_direct_cost',
        'off_balance'
    )),
    parent_id INTEGER REFERENCES account_account(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    internal_type VARCHAR(50), -- 'receivable', 'payable', 'liquidity', 'other'
    reconcile BOOLEAN DEFAULT false, -- Bank reconciliation flag
    deprecated BOOLEAN DEFAULT false,
    currency_id INTEGER, -- Multi-currency support
    company_id INTEGER, -- Multi-entity support (future)
    tag_ids INTEGER[], -- Account tags for reporting
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS account_account_code_unique ON account_account(code) WHERE deprecated = false;

-- ============================================
-- 2. GENERAL LEDGER - Fiscal Years & Periods
-- ============================================

CREATE TABLE IF NOT EXISTS account_fiscal_year (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    company_id INTEGER, -- Multi-entity support
    state VARCHAR(20) CHECK (state IN ('draft', 'open', 'closed')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_fiscal_period (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    fiscal_year_id INTEGER REFERENCES account_fiscal_year(id) ON DELETE CASCADE,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    state VARCHAR(20) CHECK (state IN ('draft', 'open', 'closed')) DEFAULT 'draft',
    special BOOLEAN DEFAULT false, -- Opening/closing periods
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. GENERAL LEDGER - Journal Entries
-- ============================================

CREATE TABLE IF NOT EXISTS account_journal (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    type VARCHAR(50) CHECK (type IN (
        'sale', 'purchase', 'cash', 'bank', 'general', 'situation', 'opening', 'closing'
    )) DEFAULT 'general',
    currency_id INTEGER,
    company_id INTEGER,
    default_account_id INTEGER REFERENCES account_account(id),
    sequence_id INTEGER, -- For numbering
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_move (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE, -- Journal entry number
    journal_id INTEGER REFERENCES account_journal(id) NOT NULL,
    date DATE NOT NULL,
    ref VARCHAR(255), -- Reference
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'cancel')) DEFAULT 'draft',
    move_type VARCHAR(20) CHECK (move_type IN ('entry', 'out_invoice', 'in_invoice', 'out_refund', 'in_refund')) DEFAULT 'entry',
    partner_id INTEGER REFERENCES partners(id),
    invoice_id INTEGER REFERENCES invoices(id), -- Link to AR/AP invoice
    amount_total DECIMAL(15, 2) DEFAULT 0,
    currency_id INTEGER,
    company_id INTEGER,
    auto_post BOOLEAN DEFAULT false,
    posted_by INTEGER REFERENCES users(id),
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_move_line (
    id SERIAL PRIMARY KEY,
    move_id INTEGER REFERENCES account_move(id) ON DELETE CASCADE NOT NULL,
    account_id INTEGER REFERENCES account_account(id) NOT NULL,
    partner_id INTEGER REFERENCES partners(id),
    name TEXT, -- Label/description
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0, -- Computed balance
    currency_id INTEGER,
    amount_currency DECIMAL(15, 2), -- Multi-currency amount
    date DATE NOT NULL,
    date_maturity DATE, -- For receivables/payables
    reconciled BOOLEAN DEFAULT false,
    full_reconcile_id INTEGER, -- Link to reconciliation group
    cost_center_id INTEGER, -- Cost center dimension
    project_id INTEGER REFERENCES projects(id), -- Project dimension
    department_id INTEGER, -- Department dimension
    product_id INTEGER REFERENCES products(id),
    tax_ids INTEGER[], -- Tax codes applied
    analytic_account_ids INTEGER[], -- Analytic accounts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS account_move_line_account_idx ON account_move_line(account_id);
CREATE INDEX IF NOT EXISTS account_move_line_move_idx ON account_move_line(move_id);
CREATE INDEX IF NOT EXISTS account_move_line_partner_idx ON account_move_line(partner_id);
CREATE INDEX IF NOT EXISTS account_move_line_date_idx ON account_move_line(date);

-- ============================================
-- 4. ACCOUNTS PAYABLE - Vendors
-- ============================================

CREATE TABLE IF NOT EXISTS account_vendor (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) UNIQUE NOT NULL,
    vendor_code VARCHAR(50) UNIQUE,
    payment_term_id INTEGER, -- Payment terms (days, net 30, etc.)
    credit_limit DECIMAL(15, 2),
    tax_id VARCHAR(100), -- Tax identification number
    vendor_type VARCHAR(50), -- 'supplier', 'contractor', 'service_provider'
    currency_id INTEGER,
    bank_accounts JSONB DEFAULT '[]', -- Bank account details for payments
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. ACCOUNTS PAYABLE - Purchase Invoices
-- ============================================

CREATE TABLE IF NOT EXISTS account_bill (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- Bill number
    vendor_id INTEGER REFERENCES account_vendor(id) NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE,
    reference VARCHAR(255), -- Vendor invoice number
    purchase_order_id INTEGER, -- Link to PO
    amount_untaxed DECIMAL(15, 2) DEFAULT 0,
    amount_tax DECIMAL(15, 2) DEFAULT 0,
    amount_total DECIMAL(15, 2) DEFAULT 0,
    amount_residual DECIMAL(15, 2) DEFAULT 0, -- Outstanding amount
    currency_id INTEGER,
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'paid', 'cancel')) DEFAULT 'draft',
    payment_state VARCHAR(20) CHECK (payment_state IN ('not_paid', 'in_payment', 'paid', 'partial')) DEFAULT 'not_paid',
    move_id INTEGER REFERENCES account_move(id), -- Posted GL entry
    early_payment_discount DECIMAL(5, 2), -- Early payment discount %
    early_payment_discount_date DATE,
    hold_reason TEXT, -- Why invoice is on hold
    ocr_data JSONB, -- OCR extracted data
    attachments JSONB DEFAULT '[]', -- Invoice attachments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_bill_line (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES account_bill(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    name TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    price_unit DECIMAL(15, 2) NOT NULL,
    price_subtotal DECIMAL(15, 2) NOT NULL,
    tax_ids INTEGER[], -- Tax codes
    account_id INTEGER REFERENCES account_account(id), -- Expense account
    cost_center_id INTEGER,
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. ACCOUNTS PAYABLE - Payments
-- ============================================

CREATE TABLE IF NOT EXISTS account_payment (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE, -- Payment reference
    payment_type VARCHAR(20) CHECK (payment_type IN ('inbound', 'outbound')) NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('manual', 'check', 'ach', 'wire', 'sepa', 'card', 'other')) DEFAULT 'manual',
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency_id INTEGER,
    payment_date DATE NOT NULL,
    journal_id INTEGER REFERENCES account_journal(id),
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'sent', 'reconciled', 'cancel')) DEFAULT 'draft',
    communication TEXT, -- Payment reference/note
    check_number VARCHAR(50), -- For check payments
    bank_account_id INTEGER, -- Bank account used
    move_id INTEGER REFERENCES account_move(id), -- Posted GL entry
    payment_batch_id INTEGER, -- Batch payment run
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_payment_register (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- Batch name
    payment_date DATE NOT NULL,
    journal_id INTEGER REFERENCES account_journal(id) NOT NULL,
    payment_method VARCHAR(50),
    total_amount DECIMAL(15, 2) DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'sent')) DEFAULT 'draft',
    export_file_path TEXT, -- Path to exported payment file (ACH, SEPA, etc.)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_payment_bill_rel (
    payment_id INTEGER REFERENCES account_payment(id) ON DELETE CASCADE,
    bill_id INTEGER REFERENCES account_bill(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    PRIMARY KEY (payment_id, bill_id)
);

-- ============================================
-- 7. ACCOUNTS RECEIVABLE - Customers (enhanced)
-- ============================================

CREATE TABLE IF NOT EXISTS account_customer (
    id SERIAL PRIMARY KEY,
    partner_id INTEGER REFERENCES partners(id) UNIQUE NOT NULL,
    customer_code VARCHAR(50) UNIQUE,
    credit_limit DECIMAL(15, 2),
    payment_term_id INTEGER,
    currency_id INTEGER,
    tax_id VARCHAR(100),
    credit_hold BOOLEAN DEFAULT false,
    credit_hold_reason TEXT,
    dunning_level INTEGER DEFAULT 0, -- Collection level
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. ACCOUNTS RECEIVABLE - Sales Invoices (enhance existing)
-- ============================================

-- Enhance existing invoices table
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS move_id INTEGER REFERENCES account_move(id),
    ADD COLUMN IF NOT EXISTS due_date DATE,
    ADD COLUMN IF NOT EXISTS reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS early_payment_discount DECIMAL(5, 2),
    ADD COLUMN IF NOT EXISTS early_payment_discount_date DATE,
    ADD COLUMN IF NOT EXISTS currency_id INTEGER,
    ADD COLUMN IF NOT EXISTS amount_untaxed DECIMAL(15, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_tax DECIMAL(15, 2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS invoice_line (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id),
    name TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1,
    price_unit DECIMAL(15, 2) NOT NULL,
    price_subtotal DECIMAL(15, 2) NOT NULL,
    tax_ids INTEGER[],
    account_id INTEGER REFERENCES account_account(id), -- Revenue account
    cost_center_id INTEGER,
    project_id INTEGER REFERENCES projects(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. ACCOUNTS RECEIVABLE - Receipts
-- ============================================

CREATE TABLE IF NOT EXISTS account_receipt (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE, -- Receipt number
    customer_id INTEGER REFERENCES account_customer(id) NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    amount DECIMAL(15, 2) NOT NULL,
    currency_id INTEGER,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'card', 'payment_gateway', 'direct_debit', 'other')) DEFAULT 'bank_transfer',
    journal_id INTEGER REFERENCES account_journal(id),
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'reconciled', 'cancel')) DEFAULT 'draft',
    communication TEXT,
    check_number VARCHAR(50),
    bank_account_id INTEGER,
    move_id INTEGER REFERENCES account_move(id),
    payment_gateway_transaction_id VARCHAR(255), -- For gateway payments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_receipt_invoice_rel (
    receipt_id INTEGER REFERENCES account_receipt(id) ON DELETE CASCADE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    PRIMARY KEY (receipt_id, invoice_id)
);

-- ============================================
-- 10. CASH & BANK MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS account_bank_account (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    routing_number VARCHAR(50), -- For ACH
    iban VARCHAR(50), -- For international
    swift_code VARCHAR(20),
    account_type VARCHAR(50) CHECK (account_type IN ('checking', 'savings', 'credit', 'loan', 'other')) DEFAULT 'checking',
    currency_id INTEGER,
    journal_id INTEGER REFERENCES account_journal(id),
    account_id INTEGER REFERENCES account_account(id), -- GL account
    balance_start DECIMAL(15, 2) DEFAULT 0, -- Opening balance
    balance_end DECIMAL(15, 2) DEFAULT 0, -- Current balance
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_bank_statement (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    bank_account_id INTEGER REFERENCES account_bank_account(id) NOT NULL,
    date_start DATE NOT NULL,
    date_end DATE NOT NULL,
    balance_start DECIMAL(15, 2) NOT NULL,
    balance_end DECIMAL(15, 2),
    balance_end_real DECIMAL(15, 2), -- Actual balance from bank
    state VARCHAR(20) CHECK (state IN ('draft', 'open', 'confirm', 'cancel')) DEFAULT 'draft',
    imported_file_path TEXT, -- Path to imported statement file
    imported_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_bank_statement_line (
    id SERIAL PRIMARY KEY,
    statement_id INTEGER REFERENCES account_bank_statement(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    name TEXT NOT NULL, -- Transaction description
    amount DECIMAL(15, 2) NOT NULL, -- Positive for deposits, negative for withdrawals
    partner_id INTEGER REFERENCES partners(id),
    ref VARCHAR(255), -- Reference number
    note TEXT,
    reconciled BOOLEAN DEFAULT false,
    move_id INTEGER REFERENCES account_move(id), -- Matched GL entry
    payment_id INTEGER REFERENCES account_payment(id), -- Matched payment
    receipt_id INTEGER REFERENCES account_receipt(id), -- Matched receipt
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS account_bank_statement_line_statement_idx ON account_bank_statement_line(statement_id);
CREATE INDEX IF NOT EXISTS account_bank_statement_line_reconciled_idx ON account_bank_statement_line(reconciled);

-- ============================================
-- 11. FIXED ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS account_asset_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    asset_account_id INTEGER REFERENCES account_account(id), -- Asset account
    depreciation_account_id INTEGER REFERENCES account_account(id), -- Depreciation expense account
    accumulated_depreciation_account_id INTEGER REFERENCES account_account(id), -- Accumulated depreciation
    gain_account_id INTEGER REFERENCES account_account(id), -- Gain on disposal
    loss_account_id INTEGER REFERENCES account_account(id), -- Loss on disposal
    depreciation_method VARCHAR(50) CHECK (depreciation_method IN ('straight_line', 'declining_balance', 'units_of_production', 'sum_of_years')) DEFAULT 'straight_line',
    depreciation_period VARCHAR(20) CHECK (depreciation_period IN ('monthly', 'quarterly', 'yearly')) DEFAULT 'monthly',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_asset (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    category_id INTEGER REFERENCES account_asset_category(id) NOT NULL,
    partner_id INTEGER REFERENCES partners(id), -- Vendor/supplier
    purchase_date DATE NOT NULL,
    purchase_value DECIMAL(15, 2) NOT NULL,
    current_value DECIMAL(15, 2) NOT NULL, -- Book value
    salvage_value DECIMAL(15, 2) DEFAULT 0,
    useful_life_years INTEGER NOT NULL,
    location VARCHAR(255),
    custodian_id INTEGER REFERENCES users(id), -- Asset custodian
    state VARCHAR(20) CHECK (state IN ('draft', 'open', 'close', 'removed')) DEFAULT 'draft',
    currency_id INTEGER,
    company_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS account_asset_depreciation (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES account_asset(id) ON DELETE CASCADE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    depreciation_amount DECIMAL(15, 2) NOT NULL,
    accumulated_depreciation DECIMAL(15, 2) NOT NULL,
    book_value DECIMAL(15, 2) NOT NULL,
    move_id INTEGER REFERENCES account_move(id), -- Posted depreciation entry
    state VARCHAR(20) CHECK (state IN ('draft', 'posted')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    posted_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_asset_disposal (
    id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES account_asset(id) NOT NULL,
    disposal_date DATE NOT NULL,
    disposal_type VARCHAR(50) CHECK (disposal_type IN ('sale', 'scrap', 'donation', 'write_off')) NOT NULL,
    disposal_value DECIMAL(15, 2),
    gain_loss DECIMAL(15, 2), -- Gain (positive) or loss (negative)
    move_id INTEGER REFERENCES account_move(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 12. TAX & COMPLIANCE
-- ============================================

CREATE TABLE IF NOT EXISTS account_tax_group (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    country_id VARCHAR(10), -- ISO country code
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_tax (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    type_tax_use VARCHAR(50) CHECK (type_tax_use IN ('sale', 'purchase', 'none')) NOT NULL,
    amount_type VARCHAR(50) CHECK (amount_type IN ('percent', 'fixed', 'group', 'division')) DEFAULT 'percent',
    amount DECIMAL(10, 4) NOT NULL, -- Tax rate or fixed amount
    tax_group_id INTEGER REFERENCES account_tax_group(id),
    account_id INTEGER REFERENCES account_account(id), -- Tax payable/receivable account
    refund_account_id INTEGER REFERENCES account_account(id), -- Tax refund account
    country_id VARCHAR(10),
    state_ids INTEGER[], -- Applicable states/regions
    active BOOLEAN DEFAULT true,
    sequence INTEGER DEFAULT 0, -- Order of application
    price_include BOOLEAN DEFAULT false, -- Tax included in price
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_tax_return (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tax_type VARCHAR(50) NOT NULL, -- 'vat', 'gst', 'sales_tax', 'withholding'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    filing_date DATE,
    due_date DATE,
    state VARCHAR(20) CHECK (state IN ('draft', 'filed', 'paid', 'overdue')) DEFAULT 'draft',
    total_taxable DECIMAL(15, 2) DEFAULT 0,
    total_tax DECIMAL(15, 2) DEFAULT 0,
    export_file_path TEXT, -- Statutory export file
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    filed_by INTEGER REFERENCES users(id),
    filed_at TIMESTAMP
);

-- ============================================
-- 13. FINANCIAL CLOSE & PERIOD END
-- ============================================

CREATE TABLE IF NOT EXISTS account_close_task (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    task_type VARCHAR(50) CHECK (task_type IN ('month_end', 'quarter_end', 'year_end')) NOT NULL,
    period_id INTEGER REFERENCES account_fiscal_period(id),
    fiscal_year_id INTEGER REFERENCES account_fiscal_year(id),
    description TEXT,
    owner_id INTEGER REFERENCES users(id), -- Task owner
    state VARCHAR(20) CHECK (state IN ('pending', 'in_progress', 'completed', 'blocked')) DEFAULT 'pending',
    due_date DATE,
    completed_at TIMESTAMP,
    completed_by INTEGER REFERENCES users(id),
    notes TEXT,
    checklist_items JSONB DEFAULT '[]', -- Sub-tasks
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_close_lock (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES account_fiscal_period(id) NOT NULL,
    locked BOOLEAN DEFAULT false,
    locked_by INTEGER REFERENCES users(id),
    locked_at TIMESTAMP,
    unlock_requires_approval BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 14. COST CENTERS & ANALYTIC ACCOUNTING
-- ============================================

CREATE TABLE IF NOT EXISTS account_analytic_account (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    parent_id INTEGER REFERENCES account_analytic_account(id) ON DELETE SET NULL,
    account_type VARCHAR(50) CHECK (account_type IN ('view', 'normal', 'contract', 'project')) DEFAULT 'normal',
    company_id INTEGER,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_cost_center (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    parent_id INTEGER REFERENCES account_cost_center(id) ON DELETE SET NULL,
    manager_id INTEGER REFERENCES users(id),
    budget_amount DECIMAL(15, 2) DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 15. INTERCOMPANY & MULTI-ENTITY
-- ============================================

CREATE TABLE IF NOT EXISTS res_company (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    currency_id INTEGER,
    country_id VARCHAR(10),
    fiscal_year_id INTEGER REFERENCES account_fiscal_year(id),
    parent_id INTEGER REFERENCES res_company(id), -- For subsidiaries
    is_consolidated BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_intercompany_transaction (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE,
    company_from_id INTEGER REFERENCES res_company(id) NOT NULL,
    company_to_id INTEGER REFERENCES res_company(id) NOT NULL,
    transaction_type VARCHAR(50) CHECK (transaction_type IN ('invoice', 'payment', 'transfer', 'expense')) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency_id INTEGER,
    move_id_from INTEGER REFERENCES account_move(id), -- GL entry in source company
    move_id_to INTEGER REFERENCES account_move(id), -- GL entry in destination company
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'reconciled', 'cancel')) DEFAULT 'draft',
    reconciled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 16. AUDIT TRAIL & DOCUMENT ATTACHMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS account_audit_log (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL, -- Table/model name
    record_id INTEGER NOT NULL,
    action VARCHAR(50) CHECK (action IN ('create', 'update', 'delete', 'post', 'cancel', 'approve', 'reject')) NOT NULL,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    changes JSONB, -- Field changes (before/after)
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS account_audit_log_model_record_idx ON account_audit_log(model_name, record_id);
CREATE INDEX IF NOT EXISTS account_audit_log_user_idx ON account_audit_log(user_id);
CREATE INDEX IF NOT EXISTS account_audit_log_created_idx ON account_audit_log(created_at);

CREATE TABLE IF NOT EXISTS account_document_attachment (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS account_document_attachment_model_record_idx ON account_document_attachment(model_name, record_id);

-- ============================================
-- 17. CURRENCY & EXCHANGE RATES
-- ============================================

CREATE TABLE IF NOT EXISTS res_currency (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    code VARCHAR(3) UNIQUE NOT NULL, -- ISO 4217 code (USD, EUR, INR, etc.)
    position VARCHAR(10) CHECK (position IN ('before', 'after')) DEFAULT 'before',
    decimal_places INTEGER DEFAULT 2,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS res_currency_rate (
    id SERIAL PRIMARY KEY,
    currency_id INTEGER REFERENCES res_currency(id) NOT NULL,
    company_id INTEGER REFERENCES res_company(id),
    name DATE NOT NULL, -- Rate date
    rate DECIMAL(15, 6) NOT NULL, -- Exchange rate to base currency
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(currency_id, company_id, name)
);

-- ============================================
-- 18. RECURRING ENTRIES & AUTOMATION
-- ============================================

CREATE TABLE IF NOT EXISTS account_recurring_entry (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    journal_id INTEGER REFERENCES account_journal(id) NOT NULL,
    frequency VARCHAR(50) CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')) NOT NULL,
    next_date DATE NOT NULL,
    end_date DATE,
    template_move_id INTEGER REFERENCES account_move(id), -- Template journal entry
    auto_post BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 19. ALLOCATIONS & DISTRIBUTIONS
-- ============================================

CREATE TABLE IF NOT EXISTS account_allocation (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source_account_id INTEGER REFERENCES account_account(id) NOT NULL,
    allocation_method VARCHAR(50) CHECK (allocation_method IN ('equal', 'percentage', 'fixed', 'basis')) DEFAULT 'equal',
    basis_account_ids INTEGER[], -- Basis accounts for allocation
    allocation_lines JSONB NOT NULL, -- [{account_id, percentage/amount, cost_center_id}]
    period_id INTEGER REFERENCES account_fiscal_period(id),
    move_id INTEGER REFERENCES account_move(id), -- Posted allocation entry
    state VARCHAR(20) CHECK (state IN ('draft', 'posted')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 20. APPROVAL WORKFLOWS
-- ============================================

CREATE TABLE IF NOT EXISTS account_approval_rule (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model_name VARCHAR(100) NOT NULL, -- 'account_move', 'account_bill', etc.
    condition_type VARCHAR(50) CHECK (condition_type IN ('amount', 'account', 'partner', 'journal', 'custom')) NOT NULL,
    condition_value JSONB NOT NULL, -- Condition criteria
    approval_level INTEGER DEFAULT 1, -- Approval level (1, 2, 3, etc.)
    approver_role VARCHAR(100), -- Role required for approval
    approver_user_id INTEGER REFERENCES users(id), -- Specific approver
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS account_approval (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    approval_rule_id INTEGER REFERENCES account_approval_rule(id),
    approval_level INTEGER DEFAULT 1,
    requested_by INTEGER REFERENCES users(id) NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    rejected_by INTEGER REFERENCES users(id),
    rejected_at TIMESTAMP,
    rejection_reason TEXT,
    state VARCHAR(20) CHECK (state IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS account_move_journal_idx ON account_move(journal_id);
CREATE INDEX IF NOT EXISTS account_move_date_idx ON account_move(date);
CREATE INDEX IF NOT EXISTS account_move_state_idx ON account_move(state);
CREATE INDEX IF NOT EXISTS account_move_partner_idx ON account_move(partner_id);

CREATE INDEX IF NOT EXISTS account_bill_vendor_idx ON account_bill(vendor_id);
CREATE INDEX IF NOT EXISTS account_bill_state_idx ON account_bill(state);
CREATE INDEX IF NOT EXISTS account_bill_date_idx ON account_bill(invoice_date);

CREATE INDEX IF NOT EXISTS account_receipt_customer_idx ON account_receipt(customer_id);
CREATE INDEX IF NOT EXISTS account_receipt_invoice_idx ON account_receipt(invoice_id);

CREATE INDEX IF NOT EXISTS account_asset_category_idx ON account_asset(category_id);
CREATE INDEX IF NOT EXISTS account_asset_state_idx ON account_asset(state);

CREATE INDEX IF NOT EXISTS account_tax_return_period_idx ON account_tax_return(period_start, period_end);
CREATE INDEX IF NOT EXISTS account_tax_return_state_idx ON account_tax_return(state);

-- ============================================
-- INITIAL DATA - Default Chart of Accounts
-- ============================================

-- Insert default currencies
INSERT INTO res_currency (name, symbol, code, position, decimal_places) VALUES
    ('US Dollar', '$', 'USD', 'before', 2),
    ('Euro', '€', 'EUR', 'before', 2),
    ('Indian Rupee', '₹', 'INR', 'before', 2),
    ('British Pound', '£', 'GBP', 'before', 2)
ON CONFLICT (code) DO NOTHING;

-- Insert default journals
INSERT INTO account_journal (name, code, type, active) VALUES
    ('Miscellaneous Operations', 'MISC', 'general', true),
    ('Bank', 'BNK1', 'bank', true),
    ('Cash', 'CSH1', 'cash', true),
    ('Sales', 'SALE', 'sale', true),
    ('Purchase', 'PURCH', 'purchase', true)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- END OF ACCOUNTING MODULE MIGRATION
-- ============================================

