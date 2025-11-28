-- Coheron ERP Database Schema
-- PostgreSQL Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    uid INTEGER UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Partners (Customers/Vendors)
CREATE TABLE IF NOT EXISTS partners (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    company VARCHAR(255),
    image_url TEXT,
    type VARCHAR(20) CHECK (type IN ('contact', 'company')) DEFAULT 'contact',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    default_code VARCHAR(100),
    list_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    standard_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    qty_available INTEGER DEFAULT 0,
    type VARCHAR(20) CHECK (type IN ('product', 'service', 'consu')) DEFAULT 'product',
    categ_id INTEGER,
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- CRM Leads
CREATE TABLE IF NOT EXISTS leads (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    partner_id INTEGER REFERENCES partners(id),
    email VARCHAR(255),
    phone VARCHAR(50),
    expected_revenue DECIMAL(10, 2) DEFAULT 0,
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    stage VARCHAR(50) CHECK (stage IN ('new', 'qualified', 'proposition', 'won', 'lost')) DEFAULT 'new',
    user_id INTEGER REFERENCES users(id),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
    type VARCHAR(20) CHECK (type IN ('lead', 'opportunity')) DEFAULT 'lead',
    date_deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales Orders
CREATE TABLE IF NOT EXISTS sale_orders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    date_order TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount_total DECIMAL(10, 2) DEFAULT 0,
    state VARCHAR(20) CHECK (state IN ('draft', 'sent', 'sale', 'done', 'cancel')) DEFAULT 'draft',
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sale Order Lines
CREATE TABLE IF NOT EXISTS sale_order_lines (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES sale_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    product_uom_qty DECIMAL(10, 2) NOT NULL DEFAULT 1,
    price_unit DECIMAL(10, 2) NOT NULL,
    price_subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    invoice_date DATE NOT NULL,
    amount_total DECIMAL(10, 2) DEFAULT 0,
    amount_residual DECIMAL(10, 2) DEFAULT 0,
    state VARCHAR(20) CHECK (state IN ('draft', 'posted', 'cancel')) DEFAULT 'draft',
    payment_state VARCHAR(20) CHECK (payment_state IN ('not_paid', 'in_payment', 'paid', 'partial')) DEFAULT 'not_paid',
    move_type VARCHAR(20) CHECK (move_type IN ('out_invoice', 'in_invoice', 'out_refund', 'in_refund')) DEFAULT 'out_invoice',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- MANUFACTURING ORDERS MODULE - COMPREHENSIVE SCHEMA
-- ============================================

-- Enhanced Manufacturing Orders
CREATE TABLE IF NOT EXISTS manufacturing_orders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    mo_number VARCHAR(50) UNIQUE, -- Auto-generated MO number
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_qty DECIMAL(10, 2) NOT NULL,
    qty_produced DECIMAL(10, 2) DEFAULT 0, -- Actual quantity produced
    qty_scrapped DECIMAL(10, 2) DEFAULT 0, -- Scrapped quantity
    state VARCHAR(20) CHECK (state IN ('draft', 'confirmed', 'progress', 'to_close', 'done', 'cancel')) DEFAULT 'draft',
    mo_type VARCHAR(20) CHECK (mo_type IN ('make_to_stock', 'make_to_order')) DEFAULT 'make_to_stock',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    date_planned_start TIMESTAMP,
    date_planned_finished TIMESTAMP,
    date_start TIMESTAMP, -- Actual start date
    date_finished TIMESTAMP, -- Actual finish date
    user_id INTEGER REFERENCES users(id), -- Responsible user
    bom_id INTEGER, -- Bill of Materials reference
    routing_id INTEGER, -- Routing reference
    sale_order_id INTEGER REFERENCES sale_orders(id), -- Linked sales order (for MTO)
    project_id INTEGER REFERENCES projects(id), -- Linked project
    warehouse_id INTEGER, -- Production warehouse/plant
    location_src_id INTEGER, -- Source location
    location_dest_id INTEGER, -- Destination location
    origin VARCHAR(255), -- Source of MO creation (MRP, Sales Order, Manual, etc.)
    procurement_group_id INTEGER, -- For grouping related MOs
    picking_type_id INTEGER, -- Picking type for material issue
    workorder_count INTEGER DEFAULT 0,
    unreserved_qty DECIMAL(10, 2) DEFAULT 0, -- Unreserved quantity
    reserved_availability DECIMAL(10, 2) DEFAULT 0, -- Reserved availability
    availability_state VARCHAR(20) CHECK (availability_state IN ('assigned', 'waiting', 'partially_available', 'none')) DEFAULT 'none',
    is_locked BOOLEAN DEFAULT false, -- Lock for editing
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill of Materials (BOM)
CREATE TABLE IF NOT EXISTS bom (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE, -- BOM code
    product_id INTEGER REFERENCES products(id) NOT NULL, -- Finished product
    product_qty DECIMAL(10, 2) NOT NULL DEFAULT 1, -- Quantity of finished product
    product_uom_id INTEGER, -- Unit of measure
    type VARCHAR(20) CHECK (type IN ('normal', 'phantom', 'subcontract')) DEFAULT 'normal',
    active BOOLEAN DEFAULT true,
    version INTEGER DEFAULT 1, -- BOM version
    date_start DATE, -- Validity start date
    date_stop DATE, -- Validity end date
    sequence INTEGER DEFAULT 10, -- For multiple BOMs per product
    ready_to_produce VARCHAR(20) CHECK (ready_to_produce IN ('all_available', 'asap')) DEFAULT 'asap',
    picking_type_id INTEGER,
    company_id INTEGER,
    user_id INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- BOM Lines (Components)
CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER REFERENCES bom(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_qty DECIMAL(10, 4) NOT NULL, -- Quantity needed per finished product
    product_uom_id INTEGER,
    sequence INTEGER DEFAULT 10, -- Line sequence
    operation_id INTEGER, -- Link to specific operation (if routing exists)
    type VARCHAR(20) CHECK (type IN ('normal', 'phantom', 'subcontract')) DEFAULT 'normal',
    attribute_value_ids TEXT, -- For variant-specific BOMs
    date_start DATE,
    date_stop DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routing (Production Routing)
CREATE TABLE IF NOT EXISTS routing (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    active BOOLEAN DEFAULT true,
    company_id INTEGER,
    location_id INTEGER, -- Production location
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routing Operations (Work Operations)
CREATE TABLE IF NOT EXISTS routing_operations (
    id SERIAL PRIMARY KEY,
    routing_id INTEGER REFERENCES routing(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    sequence INTEGER NOT NULL, -- Operation sequence
    workcenter_id INTEGER, -- Work center where operation is performed
    time_mode VARCHAR(20) CHECK (time_mode IN ('auto', 'manual')) DEFAULT 'auto',
    time_cycle_manual DECIMAL(10, 2), -- Manual cycle time (hours)
    time_cycle DECIMAL(10, 2), -- Calculated cycle time
    time_mode_batch INTEGER DEFAULT 1, -- Batch size for time calculation
    batch_size INTEGER DEFAULT 1,
    time_start DECIMAL(10, 2) DEFAULT 0, -- Setup time
    time_stop DECIMAL(10, 2) DEFAULT 0, -- Teardown time
    worksheet_type VARCHAR(50), -- Type of worksheet/instructions
    note TEXT, -- Operation instructions
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Centers
CREATE TABLE IF NOT EXISTS workcenters (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    active BOOLEAN DEFAULT true,
    workcenter_type VARCHAR(50), -- 'machine', 'labor', 'both'
    capacity INTEGER DEFAULT 1, -- Number of parallel jobs
    time_efficiency DECIMAL(5, 2) DEFAULT 100, -- Efficiency percentage
    time_start DECIMAL(10, 2) DEFAULT 0, -- Start time (hours)
    time_stop DECIMAL(10, 2) DEFAULT 0, -- Stop time (hours)
    costs_hour DECIMAL(10, 2) DEFAULT 0, -- Hourly cost
    costs_hour_account_id INTEGER, -- Cost account
    costs_cycle DECIMAL(10, 2) DEFAULT 0, -- Cost per cycle
    costs_cycle_account_id INTEGER,
    oee_target DECIMAL(5, 2) DEFAULT 90, -- OEE target percentage
    location_id INTEGER, -- Physical location
    resource_calendar_id INTEGER, -- Working hours calendar
    company_id INTEGER,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Work Orders (Operations for Manufacturing Orders)
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    operation_id INTEGER REFERENCES routing_operations(id),
    workcenter_id INTEGER REFERENCES workcenters(id),
    state VARCHAR(20) CHECK (state IN ('pending', 'ready', 'progress', 'done', 'cancel')) DEFAULT 'pending',
    sequence INTEGER NOT NULL, -- Operation sequence
    date_planned_start TIMESTAMP,
    date_planned_finished TIMESTAMP,
    date_start TIMESTAMP, -- Actual start
    date_finished TIMESTAMP, -- Actual finish
    duration_expected DECIMAL(10, 2), -- Expected duration (hours)
    duration DECIMAL(10, 2) DEFAULT 0, -- Actual duration
    duration_unit DECIMAL(10, 2) DEFAULT 0, -- Duration per unit
    qty_produced DECIMAL(10, 2) DEFAULT 0, -- Quantity produced in this operation
    qty_producing DECIMAL(10, 2) DEFAULT 0, -- Currently producing
    qty_scrapped DECIMAL(10, 2) DEFAULT 0, -- Scrapped in this operation
    is_user_working BOOLEAN DEFAULT false, -- Is operator currently working
    user_id INTEGER REFERENCES users(id), -- Assigned operator
    employee_ids INTEGER[], -- Multiple employees assigned
    worksheet_type VARCHAR(50),
    worksheet_page INTEGER DEFAULT 0,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material Consumption (Raw Material Issues)
CREATE TABLE IF NOT EXISTS mo_material_consumption (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    bom_line_id INTEGER REFERENCES bom_lines(id),
    workorder_id INTEGER REFERENCES work_orders(id), -- Operation where consumed
    product_uom_qty DECIMAL(10, 4) NOT NULL, -- Quantity consumed
    product_uom_id INTEGER,
    state VARCHAR(20) CHECK (state IN ('draft', 'done', 'cancel')) DEFAULT 'draft',
    date_expected TIMESTAMP,
    date_planned TIMESTAMP,
    date_actual TIMESTAMP, -- Actual consumption date
    location_id INTEGER, -- Source location
    lot_id INTEGER, -- Lot/Batch tracking
    tracking VARCHAR(20) CHECK (tracking IN ('none', 'lot', 'serial')) DEFAULT 'none',
    backflush_mode VARCHAR(20) CHECK (backflush_mode IN ('manual', 'auto', 'start')) DEFAULT 'manual',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Material Reservations
CREATE TABLE IF NOT EXISTS mo_material_reservations (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    bom_line_id INTEGER REFERENCES bom_lines(id),
    product_uom_qty DECIMAL(10, 4) NOT NULL, -- Reserved quantity
    product_uom_id INTEGER,
    location_id INTEGER, -- Reserved from location
    lot_id INTEGER, -- Specific lot reserved
    state VARCHAR(20) CHECK (state IN ('draft', 'assigned', 'done', 'cancel')) DEFAULT 'draft',
    date_expected TIMESTAMP,
    date_planned TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Finished Goods Receipt
CREATE TABLE IF NOT EXISTS mo_finished_goods (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_qty DECIMAL(10, 2) NOT NULL, -- Quantity received
    product_uom_id INTEGER,
    location_id INTEGER, -- Destination location
    lot_id INTEGER, -- Lot/Batch created
    serial_number VARCHAR(100), -- Serial number (if tracked)
    state VARCHAR(20) CHECK (state IN ('draft', 'done', 'cancel')) DEFAULT 'draft',
    date_planned TIMESTAMP,
    date_actual TIMESTAMP, -- Actual receipt date
    quality_state VARCHAR(20) CHECK (quality_state IN ('none', 'pass', 'fail', 'pending')) DEFAULT 'none',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality Control - In-Process Inspections
CREATE TABLE IF NOT EXISTS mo_quality_inspections (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    workorder_id INTEGER REFERENCES work_orders(id), -- Operation where inspection occurs
    inspection_type VARCHAR(50) CHECK (inspection_type IN ('in_process', 'final', 'sample')) DEFAULT 'in_process',
    product_id INTEGER REFERENCES products(id),
    qty_to_inspect DECIMAL(10, 2),
    qty_inspected DECIMAL(10, 2) DEFAULT 0,
    qty_passed DECIMAL(10, 2) DEFAULT 0,
    qty_failed DECIMAL(10, 2) DEFAULT 0,
    state VARCHAR(20) CHECK (state IN ('draft', 'in_progress', 'done', 'cancel')) DEFAULT 'draft',
    inspector_id INTEGER REFERENCES users(id),
    inspection_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality Control - Inspection Checklist Items
CREATE TABLE IF NOT EXISTS mo_quality_checklist (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES mo_quality_inspections(id) ON DELETE CASCADE NOT NULL,
    checklist_item VARCHAR(255) NOT NULL,
    specification TEXT, -- Expected value/specification
    actual_value TEXT, -- Actual measured value
    tolerance_min DECIMAL(10, 4),
    tolerance_max DECIMAL(10, 4),
    result VARCHAR(20) CHECK (result IN ('pass', 'fail', 'pending')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Non-Conformance Reports (NCR)
CREATE TABLE IF NOT EXISTS mo_non_conformance (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    workorder_id INTEGER REFERENCES work_orders(id),
    inspection_id INTEGER REFERENCES mo_quality_inspections(id),
    ncr_number VARCHAR(100) UNIQUE,
    product_id INTEGER REFERENCES products(id),
    qty_non_conforming DECIMAL(10, 2),
    severity VARCHAR(20) CHECK (severity IN ('minor', 'major', 'critical')) DEFAULT 'minor',
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    state VARCHAR(20) CHECK (state IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id),
    resolution_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rework Orders
CREATE TABLE IF NOT EXISTS mo_rework_orders (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    ncr_id INTEGER REFERENCES mo_non_conformance(id),
    name VARCHAR(100) UNIQUE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    qty_to_rework DECIMAL(10, 2) NOT NULL,
    workorder_id INTEGER REFERENCES work_orders(id), -- Operation to rework
    state VARCHAR(20) CHECK (state IN ('draft', 'confirmed', 'progress', 'done', 'cancel')) DEFAULT 'draft',
    date_planned_start TIMESTAMP,
    date_planned_finished TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturing Costing
CREATE TABLE IF NOT EXISTS mo_costing (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    cost_type VARCHAR(50) CHECK (cost_type IN ('material', 'labor', 'overhead', 'subcontract', 'scrap', 'total')) NOT NULL,
    standard_cost DECIMAL(10, 2) DEFAULT 0, -- Standard/planned cost
    actual_cost DECIMAL(10, 2) DEFAULT 0, -- Actual cost
    variance DECIMAL(10, 2) DEFAULT 0, -- Variance (actual - standard)
    variance_percent DECIMAL(5, 2) DEFAULT 0, -- Variance percentage
    currency VARCHAR(10) DEFAULT 'USD',
    cost_account_id INTEGER, -- GL account
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Subcontracting
CREATE TABLE IF NOT EXISTS mo_subcontracting (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    workorder_id INTEGER REFERENCES work_orders(id), -- Subcontracted operation
    partner_id INTEGER REFERENCES partners(id) NOT NULL, -- Subcontractor
    purchase_order_id INTEGER, -- Generated PO for subcontracting
    product_id INTEGER REFERENCES products(id), -- Product being subcontracted
    qty DECIMAL(10, 2) NOT NULL,
    state VARCHAR(20) CHECK (state IN ('draft', 'sent', 'received', 'done', 'cancel')) DEFAULT 'draft',
    date_planned_send TIMESTAMP,
    date_actual_send TIMESTAMP,
    date_planned_receive TIMESTAMP,
    date_actual_receive TIMESTAMP,
    material_sent_qty DECIMAL(10, 2) DEFAULT 0, -- Material sent to vendor
    finished_received_qty DECIMAL(10, 2) DEFAULT 0, -- Finished goods received
    cost DECIMAL(10, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shop Floor - Operator Activities
CREATE TABLE IF NOT EXISTS mo_operator_activities (
    id SERIAL PRIMARY KEY,
    workorder_id INTEGER REFERENCES work_orders(id) NOT NULL,
    operator_id INTEGER REFERENCES users(id) NOT NULL,
    activity_type VARCHAR(50) CHECK (activity_type IN ('start', 'pause', 'resume', 'stop', 'complete', 'scrap')) NOT NULL,
    qty_produced DECIMAL(10, 2) DEFAULT 0,
    qty_scrapped DECIMAL(10, 2) DEFAULT 0,
    downtime_reason VARCHAR(255), -- Reason for downtime
    downtime_duration DECIMAL(10, 2) DEFAULT 0, -- Downtime in hours
    notes TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturing Analytics - OEE Tracking
CREATE TABLE IF NOT EXISTS mo_oee_tracking (
    id SERIAL PRIMARY KEY,
    workorder_id INTEGER REFERENCES work_orders(id),
    workcenter_id INTEGER REFERENCES workcenters(id),
    date_tracked DATE NOT NULL,
    shift VARCHAR(50), -- Shift identifier
    availability_percent DECIMAL(5, 2) DEFAULT 0, -- Machine availability %
    performance_percent DECIMAL(5, 2) DEFAULT 0, -- Performance %
    quality_percent DECIMAL(5, 2) DEFAULT 0, -- Quality %
    oee_percent DECIMAL(5, 2) DEFAULT 0, -- Overall Equipment Effectiveness
    planned_production_time DECIMAL(10, 2) DEFAULT 0, -- Hours
    actual_production_time DECIMAL(10, 2) DEFAULT 0, -- Hours
    downtime DECIMAL(10, 2) DEFAULT 0, -- Hours
    ideal_cycle_time DECIMAL(10, 4) DEFAULT 0, -- Hours per unit
    actual_cycle_time DECIMAL(10, 4) DEFAULT 0, -- Hours per unit
    units_produced INTEGER DEFAULT 0,
    units_scrapped INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturing KPIs Summary
CREATE TABLE IF NOT EXISTS mo_kpi_summary (
    id SERIAL PRIMARY KEY,
    mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL, -- 'cycle_time', 'yield', 'scrap_rate', 'cost_variance', etc.
    metric_value DECIMAL(10, 4),
    metric_unit VARCHAR(50), -- 'hours', 'percentage', 'currency', etc.
    target_value DECIMAL(10, 4),
    variance DECIMAL(10, 4),
    period_start DATE,
    period_end DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Manufacturing Order Splits (for partial production)
CREATE TABLE IF NOT EXISTS mo_splits (
    id SERIAL PRIMARY KEY,
    parent_mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    child_mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    split_qty DECIMAL(10, 2) NOT NULL,
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(parent_mo_id, child_mo_id)
);

-- Manufacturing Order Merges
CREATE TABLE IF NOT EXISTS mo_merges (
    id SERIAL PRIMARY KEY,
    merged_mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    source_mo_id INTEGER REFERENCES manufacturing_orders(id) ON DELETE CASCADE NOT NULL,
    reason TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(merged_mo_id, source_mo_id)
);

-- Marketing Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(20) CHECK (campaign_type IN ('email', 'social', 'website', 'other')) DEFAULT 'email',
    state VARCHAR(20) CHECK (state IN ('draft', 'in_progress', 'done', 'cancel')) DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(10, 2) DEFAULT 0,
    revenue DECIMAL(10, 2) DEFAULT 0,
    expected_revenue DECIMAL(10, 2) DEFAULT 0,
    user_id INTEGER REFERENCES users(id),
    total_cost DECIMAL(10, 2) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    leads_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POS Orders
CREATE TABLE IF NOT EXISTS pos_orders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    partner_id INTEGER REFERENCES partners(id),
    amount_total DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'mobile', 'split')),
    amount_paid DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- POS Order Lines
CREATE TABLE IF NOT EXISTS pos_order_lines (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    qty DECIMAL(10, 2) NOT NULL,
    price_unit DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Website Pages
CREATE TABLE IF NOT EXISTS website_pages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(255) UNIQUE NOT NULL,
    is_published BOOLEAN DEFAULT false,
    view_id INTEGER,
    content TEXT,
    meta_title VARCHAR(255),
    meta_description TEXT,
    meta_keywords VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activities (for CRM timeline)
CREATE TABLE IF NOT EXISTS activities (
    id SERIAL PRIMARY KEY,
    res_id INTEGER NOT NULL,
    res_model VARCHAR(100) NOT NULL,
    activity_type VARCHAR(50) CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'log')) DEFAULT 'note',
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    date_deadline TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    state VARCHAR(20) CHECK (state IN ('planned', 'done', 'canceled')) DEFAULT 'planned',
    duration INTEGER, -- in minutes
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- HR MODULE TABLES
-- ============================================

-- Employees
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    work_email VARCHAR(255),
    work_phone VARCHAR(50),
    job_title VARCHAR(255),
    department_id INTEGER,
    manager_id INTEGER REFERENCES employees(id),
    hire_date DATE,
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract')) DEFAULT 'full_time',
    attendance_state VARCHAR(20) CHECK (attendance_state IN ('checked_in', 'checked_out')) DEFAULT 'checked_out',
    image_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Personal Information
CREATE TABLE IF NOT EXISTS employee_personal_info (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    date_of_birth DATE,
    pan_number VARCHAR(20),
    aadhaar_number VARCHAR(20),
    address TEXT,
    personal_email VARCHAR(255),
    personal_phone VARCHAR(50),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    emergency_contact_relationship VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Bank Details
CREATE TABLE IF NOT EXISTS employee_bank_details (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    ifsc_code VARCHAR(20),
    account_holder_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Employee Documents
CREATE TABLE IF NOT EXISTS employee_documents (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- e.g., 'id_proof', 'contract', 'certificate'
    document_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by INTEGER REFERENCES users(id)
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    hours_worked DECIMAL(5, 2),
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('present', 'absent', 'leave', 'holiday')) DEFAULT 'present',
    late_entry BOOLEAN DEFAULT false,
    early_exit BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, date)
);

-- Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'casual', 'earned', 'loss_of_pay')) NOT NULL,
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    days DECIMAL(5, 2) NOT NULL,
    reason TEXT,
    contact_during_leave VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    approved_by INTEGER REFERENCES employees(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Leave Balance
CREATE TABLE IF NOT EXISTS leave_balance (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) CHECK (leave_type IN ('annual', 'sick', 'casual', 'earned')) NOT NULL,
    total_days DECIMAL(5, 2) NOT NULL DEFAULT 0,
    used_days DECIMAL(5, 2) DEFAULT 0,
    remaining_days DECIMAL(5, 2) GENERATED ALWAYS AS (total_days - used_days) STORED,
    year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(employee_id, leave_type, year)
);

-- Payroll - Payslips
CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    name VARCHAR(100) NOT NULL,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    basic_wage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    gross_wage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    net_wage DECIMAL(10, 2) NOT NULL DEFAULT 0,
    state VARCHAR(20) CHECK (state IN ('draft', 'done', 'cancel')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payroll - Salary Structure
CREATE TABLE IF NOT EXISTS salary_structures (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
    component_type VARCHAR(20) CHECK (component_type IN ('earning', 'deduction')) NOT NULL,
    component_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    calculation_type VARCHAR(20) CHECK (calculation_type IN ('fixed', 'percentage', 'calculated')) DEFAULT 'fixed',
    percentage DECIMAL(5, 2), -- If percentage type
    is_active BOOLEAN DEFAULT true,
    effective_from DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Performance Appraisals
CREATE TABLE IF NOT EXISTS appraisals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    manager_id INTEGER REFERENCES employees(id),
    appraisal_period VARCHAR(50), -- e.g., 'Q1 2024', 'Annual 2024'
    date_close DATE,
    final_assessment TEXT,
    state VARCHAR(20) CHECK (state IN ('new', 'pending', 'done', 'cancel')) DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Goals & OKRs
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) CHECK (goal_type IN ('okr', 'kpi', 'personal')) DEFAULT 'okr',
    target_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2) DEFAULT 0,
    progress_percentage DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE 
            WHEN target_value > 0 THEN (current_value / target_value * 100)
            ELSE 0
        END
    ) STORED,
    status VARCHAR(20) CHECK (status IN ('on_track', 'at_risk', 'completed', 'cancelled')) DEFAULT 'on_track',
    due_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Learning & Development - Courses
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_time DECIMAL(5, 2) NOT NULL, -- in hours
    category VARCHAR(100),
    instructor VARCHAR(255),
    members_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course Enrollments
CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_percentage DECIMAL(5, 2) DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('enrolled', 'in_progress', 'completed', 'dropped')) DEFAULT 'enrolled',
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Certifications
CREATE TABLE IF NOT EXISTS certifications (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    course_id INTEGER REFERENCES courses(id),
    certificate_number VARCHAR(100) UNIQUE,
    issued_date DATE NOT NULL,
    expiry_date DATE,
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recruitment - Applicants
CREATE TABLE IF NOT EXISTS applicants (
    id SERIAL PRIMARY KEY,
    partner_name VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL, -- Job position
    email_from VARCHAR(255),
    stage_id INTEGER DEFAULT 1,
    priority INTEGER CHECK (priority >= 0 AND priority <= 5) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Job Postings
CREATE TABLE IF NOT EXISTS job_postings (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    employment_type VARCHAR(50) CHECK (employment_type IN ('full_time', 'part_time', 'contract')) DEFAULT 'full_time',
    experience_required VARCHAR(100),
    location VARCHAR(255),
    description TEXT,
    required_skills TEXT,
    status VARCHAR(20) CHECK (status IN ('draft', 'active', 'closed')) DEFAULT 'draft',
    applicants_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policies
CREATE TABLE IF NOT EXISTS policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    body TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Policy Acknowledgments
CREATE TABLE IF NOT EXISTS policy_acknowledgments (
    id SERIAL PRIMARY KEY,
    policy_id INTEGER REFERENCES policies(id) ON DELETE CASCADE,
    employee_id INTEGER REFERENCES employees(id) NOT NULL,
    acknowledged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(policy_id, employee_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_partner_id ON leads(partner_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_stage ON leads(stage);
CREATE INDEX IF NOT EXISTS idx_sale_orders_partner_id ON sale_orders(partner_id);
CREATE INDEX IF NOT EXISTS idx_sale_orders_state ON sale_orders(state);
CREATE INDEX IF NOT EXISTS idx_sale_order_lines_order_id ON sale_order_lines(order_id);
CREATE INDEX IF NOT EXISTS idx_invoices_partner_id ON invoices(partner_id);
CREATE INDEX IF NOT EXISTS idx_invoices_state ON invoices(state);
CREATE INDEX IF NOT EXISTS idx_activities_res ON activities(res_id, res_model);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(name);

-- HR Indexes
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_appraisals_employee_id ON appraisals(employee_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_employee_id ON course_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_applicants_stage_id ON applicants(stage_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers (drop existing first)
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at BEFORE UPDATE ON partners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sale_orders_updated_at ON sale_orders;
CREATE TRIGGER update_sale_orders_updated_at BEFORE UPDATE ON sale_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manufacturing_orders_updated_at ON manufacturing_orders;
CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_website_pages_updated_at ON website_pages;
CREATE TRIGGER update_website_pages_updated_at BEFORE UPDATE ON website_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_activities_updated_at ON activities;
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON activities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- HR Triggers
DROP TRIGGER IF EXISTS update_employees_updated_at ON employees;
CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON employees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_personal_info_updated_at ON employee_personal_info;
CREATE TRIGGER update_employee_personal_info_updated_at BEFORE UPDATE ON employee_personal_info
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_bank_details_updated_at ON employee_bank_details;
CREATE TRIGGER update_employee_bank_details_updated_at BEFORE UPDATE ON employee_bank_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_attendance_updated_at ON attendance;
CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON leave_requests;
CREATE TRIGGER update_leave_requests_updated_at BEFORE UPDATE ON leave_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leave_balance_updated_at ON leave_balance;
CREATE TRIGGER update_leave_balance_updated_at BEFORE UPDATE ON leave_balance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payslips_updated_at ON payslips;
CREATE TRIGGER update_payslips_updated_at BEFORE UPDATE ON payslips
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_salary_structures_updated_at ON salary_structures;
CREATE TRIGGER update_salary_structures_updated_at BEFORE UPDATE ON salary_structures
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_appraisals_updated_at ON appraisals;
CREATE TRIGGER update_appraisals_updated_at BEFORE UPDATE ON appraisals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_course_enrollments_updated_at ON course_enrollments;
CREATE TRIGGER update_course_enrollments_updated_at BEFORE UPDATE ON course_enrollments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_applicants_updated_at ON applicants;
CREATE TRIGGER update_applicants_updated_at BEFORE UPDATE ON applicants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON job_postings;
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON job_postings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at BEFORE UPDATE ON policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- JIRA-LIKE AGILE PROJECT MANAGEMENT TABLES
-- ============================================

-- Projects (Enhanced)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    key VARCHAR(50) UNIQUE NOT NULL, -- Project key like "PROJ"
    description TEXT,
    project_type VARCHAR(50) CHECK (project_type IN ('kanban', 'scrum', 'classic')) DEFAULT 'scrum',
    lead_id INTEGER REFERENCES users(id),
    avatar_url TEXT,
    status VARCHAR(20) CHECK (status IN ('active', 'archived', 'deleted')) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Epics (Large features/initiatives)
CREATE TABLE IF NOT EXISTS epics (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    key VARCHAR(50) NOT NULL, -- e.g., "PROJ-1"
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(20), -- For visual identification
    status VARCHAR(20) CHECK (status IN ('new', 'in_progress', 'done', 'cancelled')) DEFAULT 'new',
    start_date DATE,
    end_date DATE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, key)
);

-- Issue Types (Story, Task, Bug, Epic, etc.)
CREATE TABLE IF NOT EXISTS issue_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- 'Story', 'Task', 'Bug', 'Epic', 'Subtask'
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issues/Tasks (Jira-like)
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    issue_type_id INTEGER REFERENCES issue_types(id),
    key VARCHAR(50) NOT NULL, -- e.g., "PROJ-123"
    summary VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'To Do', -- 'To Do', 'In Progress', 'Done', etc.
    priority VARCHAR(20) CHECK (priority IN ('lowest', 'low', 'medium', 'high', 'highest')) DEFAULT 'medium',
    assignee_id INTEGER REFERENCES users(id),
    reporter_id INTEGER REFERENCES users(id),
    epic_id INTEGER REFERENCES epics(id),
    parent_issue_id INTEGER REFERENCES issues(id), -- For subtasks
    story_points INTEGER, -- Agile estimation
    time_estimate INTEGER, -- Estimated hours
    time_spent INTEGER DEFAULT 0, -- Actual hours spent
    labels TEXT[], -- Array of labels
    components TEXT[], -- Array of components
    fix_version VARCHAR(100), -- Release version
    due_date DATE,
    resolution VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    UNIQUE(project_id, key)
);

-- Sprints
CREATE TABLE IF NOT EXISTS sprints (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    goal TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    state VARCHAR(20) CHECK (state IN ('future', 'active', 'closed')) DEFAULT 'future',
    completed_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprint Issues (Many-to-many relationship)
CREATE TABLE IF NOT EXISTS sprint_issues (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    position INTEGER, -- For ordering in backlog
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, issue_id)
);

-- Backlog (Issues not in any sprint)
CREATE TABLE IF NOT EXISTS backlog (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0, -- Higher = more priority
    rank INTEGER, -- For drag-and-drop ordering
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, issue_id)
);

-- Burndown Chart Data
CREATE TABLE IF NOT EXISTS burndown_data (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    remaining_story_points DECIMAL(10, 2) DEFAULT 0,
    remaining_tasks INTEGER DEFAULT 0,
    completed_story_points DECIMAL(10, 2) DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id, date)
);

-- Velocity Tracking
CREATE TABLE IF NOT EXISTS velocity_data (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    sprint_id INTEGER REFERENCES sprints(id),
    completed_story_points DECIMAL(10, 2) DEFAULT 0,
    completed_issues INTEGER DEFAULT 0,
    planned_story_points DECIMAL(10, 2) DEFAULT 0,
    planned_issues INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sprint Retrospectives
CREATE TABLE IF NOT EXISTS sprint_retrospectives (
    id SERIAL PRIMARY KEY,
    sprint_id INTEGER REFERENCES sprints(id) ON DELETE CASCADE,
    facilitator_id INTEGER REFERENCES users(id),
    notes TEXT,
    status VARCHAR(20) CHECK (status IN ('draft', 'completed', 'archived')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sprint_id)
);

-- Sprint Retrospective Items
CREATE TABLE IF NOT EXISTS sprint_retrospective_items (
    id SERIAL PRIMARY KEY,
    retrospective_id INTEGER REFERENCES sprint_retrospectives(id) ON DELETE CASCADE,
    category VARCHAR(50) CHECK (category IN ('went_well', 'could_improve', 'action_item')) NOT NULL,
    content TEXT NOT NULL,
    assignee_id INTEGER REFERENCES users(id),
    due_date DATE,
    status VARCHAR(20) CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue Comments
CREATE TABLE IF NOT EXISTS issue_comments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue Attachments
CREATE TABLE IF NOT EXISTS issue_attachments (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Issue History/Changelog
CREATE TABLE IF NOT EXISTS issue_history (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES issues(id) ON DELETE CASCADE,
    field_name VARCHAR(100) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflows (Custom status transitions)
CREATE TABLE IF NOT EXISTS workflows (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Steps (Statuses in workflow)
CREATE TABLE IF NOT EXISTS workflow_steps (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    position INTEGER,
    is_final BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Transitions
CREATE TABLE IF NOT EXISTS workflow_transitions (
    id SERIAL PRIMARY KEY,
    workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
    from_step_id INTEGER REFERENCES workflow_steps(id),
    to_step_id INTEGER REFERENCES workflow_steps(id),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL, -- 'issue_created', 'status_changed', etc.
    conditions JSONB, -- JSON conditions
    actions JSONB, -- JSON actions to execute
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Releases/Versions
CREATE TABLE IF NOT EXISTS releases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL, -- e.g., "1.0.0"
    description TEXT,
    release_date DATE,
    status VARCHAR(20) CHECK (status IN ('unreleased', 'released', 'archived')) DEFAULT 'unreleased',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, version)
);

-- ============================================
-- CONFLUENCE-LIKE KNOWLEDGE BASE TABLES
-- ============================================

-- Knowledge Base Spaces (Workspaces)
CREATE TABLE IF NOT EXISTS kb_spaces (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL, -- Space key like "ENG", "HR"
    name VARCHAR(255) NOT NULL,
    description TEXT,
    space_type VARCHAR(50) CHECK (space_type IN ('team', 'personal', 'documentation', 'knowledge')) DEFAULT 'team',
    owner_id INTEGER REFERENCES users(id),
    icon_url TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Space Permissions
CREATE TABLE IF NOT EXISTS space_permissions (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES kb_spaces(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    permission_type VARCHAR(50) CHECK (permission_type IN ('view', 'edit', 'admin')) DEFAULT 'view',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(space_id, user_id)
);

-- KB Pages (Wiki pages)
CREATE TABLE IF NOT EXISTS kb_pages (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES kb_spaces(id) ON DELETE CASCADE,
    parent_page_id INTEGER REFERENCES kb_pages(id), -- For hierarchy
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL, -- URL-friendly identifier
    content TEXT NOT NULL, -- Rich text content (HTML/Markdown)
    content_format VARCHAR(20) CHECK (content_format IN ('html', 'markdown', 'wiki')) DEFAULT 'html',
    excerpt TEXT, -- Short description
    labels TEXT[], -- Array of labels
    status VARCHAR(20) CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    author_id INTEGER REFERENCES users(id),
    last_modified_by INTEGER REFERENCES users(id),
    view_count INTEGER DEFAULT 0,
    is_homepage BOOLEAN DEFAULT false,
    position INTEGER, -- For ordering
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(space_id, slug)
);

-- Page Versions (Version history)
CREATE TABLE IF NOT EXISTS kb_page_versions (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES kb_pages(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    content_format VARCHAR(20),
    change_summary TEXT, -- What changed in this version
    author_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, version_number)
);

-- Page Comments
CREATE TABLE IF NOT EXISTS kb_page_comments (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES kb_pages(id) ON DELETE CASCADE,
    parent_comment_id INTEGER REFERENCES kb_page_comments(id), -- For nested comments
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page Attachments
CREATE TABLE IF NOT EXISTS kb_page_attachments (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES kb_pages(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page Templates
CREATE TABLE IF NOT EXISTS kb_page_templates (
    id SERIAL PRIMARY KEY,
    space_id INTEGER REFERENCES kb_spaces(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_content TEXT NOT NULL,
    template_type VARCHAR(50), -- 'meeting_notes', 'requirements', 'sop', etc.
    is_system BOOLEAN DEFAULT false,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page Links (Linking pages to issues/tasks)
CREATE TABLE IF NOT EXISTS kb_page_links (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES kb_pages(id) ON DELETE CASCADE,
    linked_type VARCHAR(50) NOT NULL, -- 'issue', 'project', 'page', etc.
    linked_id INTEGER NOT NULL,
    link_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page Labels/Tags
CREATE TABLE IF NOT EXISTS kb_labels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Page to Labels (Many-to-many)
CREATE TABLE IF NOT EXISTS kb_page_labels (
    id SERIAL PRIMARY KEY,
    page_id INTEGER REFERENCES kb_pages(id) ON DELETE CASCADE,
    label_id INTEGER REFERENCES kb_labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(page_id, label_id)
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_projects_key ON projects(key);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_key ON issues(key);
CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assignee_id ON issues(assignee_id);
CREATE INDEX IF NOT EXISTS idx_issues_epic_id ON issues(epic_id);
CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_state ON sprints(state);
CREATE INDEX IF NOT EXISTS idx_sprint_issues_sprint_id ON sprint_issues(sprint_id);
CREATE INDEX IF NOT EXISTS idx_sprint_issues_issue_id ON sprint_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_backlog_project_id ON backlog(project_id);
CREATE INDEX IF NOT EXISTS idx_burndown_data_sprint_id ON burndown_data(sprint_id);
CREATE INDEX IF NOT EXISTS idx_issue_comments_issue_id ON issue_comments(issue_id);
CREATE INDEX IF NOT EXISTS idx_kb_pages_space_id ON kb_pages(space_id);
CREATE INDEX IF NOT EXISTS idx_kb_pages_parent_page_id ON kb_pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_kb_pages_slug ON kb_pages(slug);
CREATE INDEX IF NOT EXISTS idx_kb_page_versions_page_id ON kb_page_versions(page_id);

-- Add triggers for new tables
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_epics_updated_at ON epics;
CREATE TRIGGER update_epics_updated_at BEFORE UPDATE ON epics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_issues_updated_at ON issues;
CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprints_updated_at ON sprints;
CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON sprints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_rules_updated_at ON automation_rules;
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_releases_updated_at ON releases;
CREATE TRIGGER update_releases_updated_at BEFORE UPDATE ON releases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprint_retrospectives_updated_at ON sprint_retrospectives;
CREATE TRIGGER update_sprint_retrospectives_updated_at BEFORE UPDATE ON sprint_retrospectives
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sprint_retrospective_items_updated_at ON sprint_retrospective_items;
CREATE TRIGGER update_sprint_retrospective_items_updated_at BEFORE UPDATE ON sprint_retrospective_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_spaces_updated_at ON kb_spaces;
CREATE TRIGGER update_kb_spaces_updated_at BEFORE UPDATE ON kb_spaces
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_pages_updated_at ON kb_pages;
CREATE TRIGGER update_kb_pages_updated_at BEFORE UPDATE ON kb_pages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_page_comments_updated_at ON kb_page_comments;
CREATE TRIGGER update_kb_page_comments_updated_at BEFORE UPDATE ON kb_page_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_page_templates_updated_at ON kb_page_templates;
CREATE TRIGGER update_kb_page_templates_updated_at BEFORE UPDATE ON kb_page_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUPPORT DESK MODULE - Full ERP Specification
-- ============================================

-- Support Teams/Groups
CREATE TABLE IF NOT EXISTS support_teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support Agents
CREATE TABLE IF NOT EXISTS support_agents (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
    team_id INTEGER REFERENCES support_teams(id),
    agent_type VARCHAR(50) CHECK (agent_type IN ('agent', 'admin', 'supervisor')) DEFAULT 'agent',
    is_active BOOLEAN DEFAULT true,
    max_tickets INTEGER DEFAULT 10,
    skills TEXT[], -- Array of skill tags
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Channels
CREATE TABLE IF NOT EXISTS ticket_channels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    channel_type VARCHAR(50) CHECK (channel_type IN ('email', 'web', 'mobile', 'whatsapp', 'sms', 'chat', 'voice', 'api', 'social')) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB, -- Channel-specific configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Categories
CREATE TABLE IF NOT EXISTS ticket_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INTEGER REFERENCES ticket_categories(id),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Policies
CREATE TABLE IF NOT EXISTS sla_policies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) CHECK (priority IN ('p1', 'p2', 'p3', 'p4', 'p5', 'low', 'medium', 'high', 'urgent')) NOT NULL,
    first_response_time_minutes INTEGER NOT NULL,
    resolution_time_minutes INTEGER NOT NULL,
    business_hours_only BOOLEAN DEFAULT false,
    working_hours JSONB, -- { "monday": {"start": "09:00", "end": "17:00"}, ... }
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support Tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    ticket_type VARCHAR(50) CHECK (ticket_type IN ('issue', 'request', 'change', 'incident', 'problem')) DEFAULT 'issue',
    status VARCHAR(50) CHECK (status IN ('open', 'in_progress', 'pending', 'resolved', 'closed', 'cancelled')) DEFAULT 'open',
    priority VARCHAR(20) CHECK (priority IN ('p1', 'p2', 'p3', 'p4', 'p5', 'low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    channel_id INTEGER REFERENCES ticket_channels(id),
    category_id INTEGER REFERENCES ticket_categories(id),
    partner_id INTEGER REFERENCES partners(id), -- Customer
    contact_id INTEGER, -- Specific contact if different from partner
    assigned_agent_id INTEGER REFERENCES support_agents(id),
    assigned_team_id INTEGER REFERENCES support_teams(id),
    sla_policy_id INTEGER REFERENCES sla_policies(id),
    parent_ticket_id INTEGER REFERENCES support_tickets(id), -- For parent-child relationships
    merged_from_ticket_id INTEGER REFERENCES support_tickets(id), -- If merged from another ticket
    source VARCHAR(100), -- Email address, API key, etc.
    tags TEXT[],
    custom_fields JSONB, -- Flexible custom field storage
    first_response_at TIMESTAMP,
    first_response_by INTEGER REFERENCES support_agents(id),
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES support_agents(id),
    closed_at TIMESTAMP,
    closed_by INTEGER REFERENCES support_agents(id),
    sla_first_response_deadline TIMESTAMP,
    sla_resolution_deadline TIMESTAMP,
    is_sla_breached BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true, -- Public vs internal ticket
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Notes/Comments
CREATE TABLE IF NOT EXISTS ticket_notes (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    note_type VARCHAR(50) CHECK (note_type IN ('public', 'private', 'internal')) DEFAULT 'public',
    content TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Attachments
CREATE TABLE IF NOT EXISTS ticket_attachments (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    note_id INTEGER REFERENCES ticket_notes(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ticket Watchers
CREATE TABLE IF NOT EXISTS ticket_watchers (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(ticket_id, user_id)
);

-- Ticket History/Audit Log
CREATE TABLE IF NOT EXISTS ticket_history (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'created', 'assigned', 'status_changed', 'priority_changed', etc.
    old_value TEXT,
    new_value TEXT,
    performed_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SLA Escalations
CREATE TABLE IF NOT EXISTS sla_escalations (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    escalation_level INTEGER DEFAULT 1,
    escalation_reason VARCHAR(255),
    escalated_to INTEGER REFERENCES support_agents(id),
    escalated_to_team_id INTEGER REFERENCES support_teams(id),
    escalated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workflow Automation Rules
CREATE TABLE IF NOT EXISTS support_automation_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_event VARCHAR(100) NOT NULL, -- 'ticket_created', 'ticket_updated', 'sla_breach', 'time_based', etc.
    trigger_conditions JSONB NOT NULL, -- JSON conditions
    actions JSONB NOT NULL, -- JSON array of actions
    is_active BOOLEAN DEFAULT true,
    execution_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Canned Responses/Macros
CREATE TABLE IF NOT EXISTS canned_responses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    shortcut VARCHAR(50), -- Keyboard shortcut
    content TEXT NOT NULL,
    category VARCHAR(100),
    is_public BOOLEAN DEFAULT false, -- Public to all agents or private
    created_by INTEGER REFERENCES users(id),
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Knowledge Base Articles
CREATE TABLE IF NOT EXISTS kb_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    slug VARCHAR(500) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    category_id INTEGER REFERENCES ticket_categories(id),
    parent_article_id INTEGER REFERENCES kb_articles(id), -- For article hierarchy
    article_type VARCHAR(50) CHECK (article_type IN ('article', 'faq', 'how_to', 'troubleshooting')) DEFAULT 'article',
    status VARCHAR(50) CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    is_public BOOLEAN DEFAULT true,
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    author_id INTEGER REFERENCES users(id),
    tags TEXT[],
    meta_keywords VARCHAR(500),
    meta_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- KB Article Revisions
CREATE TABLE IF NOT EXISTS kb_article_revisions (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES kb_articles(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    change_summary TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(article_id, revision_number)
);

-- KB Article Attachments
CREATE TABLE IF NOT EXISTS kb_article_attachments (
    id SERIAL PRIMARY KEY,
    article_id INTEGER REFERENCES kb_articles(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    uploaded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Live Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    visitor_name VARCHAR(255),
    visitor_email VARCHAR(255),
    visitor_phone VARCHAR(50),
    partner_id INTEGER REFERENCES partners(id),
    channel VARCHAR(50) CHECK (channel IN ('web', 'mobile', 'whatsapp', 'api')) DEFAULT 'web',
    status VARCHAR(50) CHECK (status IN ('waiting', 'active', 'ended', 'transferred')) DEFAULT 'waiting',
    assigned_agent_id INTEGER REFERENCES support_agents(id),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    message_type VARCHAR(50) CHECK (message_type IN ('user', 'agent', 'system', 'bot')) DEFAULT 'user',
    content TEXT NOT NULL,
    sender_id INTEGER REFERENCES users(id), -- NULL for visitor messages
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chatbot Conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100),
    visitor_id VARCHAR(100),
    intent VARCHAR(255),
    confidence DECIMAL(5, 4),
    response TEXT,
    escalated_to_agent BOOLEAN DEFAULT false,
    ticket_id INTEGER REFERENCES support_tickets(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Surveys
CREATE TABLE IF NOT EXISTS surveys (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    survey_type VARCHAR(50) CHECK (survey_type IN ('csat', 'ces', 'nps', 'custom')) NOT NULL,
    description TEXT,
    questions JSONB NOT NULL, -- Array of question objects
    trigger_event VARCHAR(100), -- 'ticket_closed', 'ticket_resolved', 'manual', etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Survey Responses
CREATE TABLE IF NOT EXISTS survey_responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id),
    ticket_id INTEGER REFERENCES support_tickets(id),
    partner_id INTEGER REFERENCES partners(id),
    responses JSONB NOT NULL, -- User responses
    score INTEGER, -- For CSAT/CES/NPS
    feedback TEXT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ITSM: Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id SERIAL PRIMARY KEY,
    incident_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) CHECK (priority IN ('p1', 'p2', 'p3', 'p4', 'p5')) NOT NULL,
    impact VARCHAR(20) CHECK (impact IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    urgency VARCHAR(20) CHECK (urgency IN ('low', 'medium', 'high', 'critical')) NOT NULL,
    status VARCHAR(50) CHECK (status IN ('new', 'assigned', 'in_progress', 'resolved', 'closed')) DEFAULT 'new',
    assigned_to INTEGER REFERENCES support_agents(id),
    affected_users INTEGER,
    affected_systems TEXT[],
    resolution TEXT,
    resolved_at TIMESTAMP,
    closed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ITSM: Problems
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    problem_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) CHECK (status IN ('new', 'investigating', 'identified', 'resolved', 'closed')) DEFAULT 'new',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    root_cause_analysis TEXT,
    solution TEXT,
    assigned_to INTEGER REFERENCES support_agents(id),
    related_incidents INTEGER[], -- Array of incident IDs
    known_error BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ITSM: Change Requests
CREATE TABLE IF NOT EXISTS change_requests (
    id SERIAL PRIMARY KEY,
    change_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    change_type VARCHAR(50) CHECK (change_type IN ('standard', 'normal', 'emergency')) DEFAULT 'normal',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(50) CHECK (status IN ('draft', 'submitted', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled')) DEFAULT 'draft',
    requested_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    implemented_by INTEGER REFERENCES users(id),
    risk_level VARCHAR(20) CHECK (risk_level IN ('low', 'medium', 'high')) DEFAULT 'medium',
    impact_analysis TEXT,
    rollback_plan TEXT,
    scheduled_start TIMESTAMP,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Change Approval Board (CAB)
CREATE TABLE IF NOT EXISTS change_cab_members (
    id SERIAL PRIMARY KEY,
    change_id INTEGER REFERENCES change_requests(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(50) CHECK (role IN ('approver', 'reviewer', 'observer')) DEFAULT 'reviewer',
    approval_status VARCHAR(50) CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    comments TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agent Performance Metrics
CREATE TABLE IF NOT EXISTS agent_metrics (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES support_agents(id),
    metric_date DATE NOT NULL,
    tickets_assigned INTEGER DEFAULT 0,
    tickets_resolved INTEGER DEFAULT 0,
    tickets_closed INTEGER DEFAULT 0,
    avg_first_response_time_minutes DECIMAL(10, 2),
    avg_resolution_time_minutes DECIMAL(10, 2),
    sla_met_count INTEGER DEFAULT 0,
    sla_breached_count INTEGER DEFAULT 0,
    customer_satisfaction_score DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agent_id, metric_date)
);

-- Ticket Time Tracking
CREATE TABLE IF NOT EXISTS ticket_time_logs (
    id SERIAL PRIMARY KEY,
    ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
    agent_id INTEGER REFERENCES support_agents(id),
    time_spent_minutes INTEGER NOT NULL,
    activity_type VARCHAR(50), -- 'work', 'waiting', 'research', etc.
    description TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR SUPPORT DESK MODULE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_number ON support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_partner_id ON support_tickets(partner_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_agent_id ON support_tickets(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_team_id ON support_tickets(assigned_team_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_sla_deadlines ON support_tickets(sla_first_response_deadline, sla_resolution_deadline);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_ticket_notes_ticket_id ON ticket_notes(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_watchers_ticket_id ON ticket_watchers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_history_ticket_id ON ticket_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX IF NOT EXISTS idx_kb_articles_status ON kb_articles(status);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_session_id ON chat_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX IF NOT EXISTS idx_survey_responses_ticket_id ON survey_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_problems_status ON problems(status);
CREATE INDEX IF NOT EXISTS idx_change_requests_status ON change_requests(status);

-- ============================================
-- TRIGGERS FOR SUPPORT DESK MODULE
-- ============================================

DROP TRIGGER IF EXISTS update_support_teams_updated_at ON support_teams;
CREATE TRIGGER update_support_teams_updated_at BEFORE UPDATE ON support_teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_agents_updated_at ON support_agents;
CREATE TRIGGER update_support_agents_updated_at BEFORE UPDATE ON support_agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_channels_updated_at ON ticket_channels;
CREATE TRIGGER update_ticket_channels_updated_at BEFORE UPDATE ON ticket_channels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_categories_updated_at ON ticket_categories;
CREATE TRIGGER update_ticket_categories_updated_at BEFORE UPDATE ON ticket_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sla_policies_updated_at ON sla_policies;
CREATE TRIGGER update_sla_policies_updated_at BEFORE UPDATE ON sla_policies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON support_tickets;
CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ticket_notes_updated_at ON ticket_notes;
CREATE TRIGGER update_ticket_notes_updated_at BEFORE UPDATE ON ticket_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_automation_rules_updated_at ON support_automation_rules;
CREATE TRIGGER update_support_automation_rules_updated_at BEFORE UPDATE ON support_automation_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_canned_responses_updated_at ON canned_responses;
CREATE TRIGGER update_canned_responses_updated_at BEFORE UPDATE ON canned_responses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kb_articles_updated_at ON kb_articles;
CREATE TRIGGER update_kb_articles_updated_at BEFORE UPDATE ON kb_articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_sessions_updated_at ON chat_sessions;
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_surveys_updated_at ON surveys;
CREATE TRIGGER update_surveys_updated_at BEFORE UPDATE ON surveys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incidents_updated_at ON incidents;
CREATE TRIGGER update_incidents_updated_at BEFORE UPDATE ON incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_problems_updated_at ON problems;
CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_change_requests_updated_at ON change_requests;
CREATE TRIGGER update_change_requests_updated_at BEFORE UPDATE ON change_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMPREHENSIVE ERP PROJECTS MODULE
-- ============================================

-- Enhanced Projects Master Table (ERP-focused, separate from Jira-like projects)
-- Note: The existing 'projects' table at line 596 is Jira-like. This creates ERP projects.
-- If needed, we can merge or use the existing table with additional columns.
-- For now, we'll enhance the existing projects table structure by adding missing columns

-- First, let's check if we need to alter the existing projects table or create ERP-specific tables
-- We'll add ERP-specific project tables that complement the existing structure

-- ERP Project Master (Enhanced version - can be merged with existing projects table)
-- Adding columns to existing projects table if they don't exist
DO $$ 
BEGIN
    -- Add ERP-specific columns to projects table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='code') THEN
        ALTER TABLE projects ADD COLUMN code VARCHAR(100) UNIQUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='project_manager_id') THEN
        ALTER TABLE projects ADD COLUMN project_manager_id INTEGER REFERENCES users(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='partner_id') THEN
        ALTER TABLE projects ADD COLUMN partner_id INTEGER REFERENCES partners(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='industry_sector') THEN
        ALTER TABLE projects ADD COLUMN industry_sector VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='contract_type') THEN
        ALTER TABLE projects ADD COLUMN contract_type VARCHAR(50) CHECK (contract_type IN ('time_material', 'fixed_bid', 'retainer', 'cost_plus'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='billing_type') THEN
        ALTER TABLE projects ADD COLUMN billing_type VARCHAR(50) CHECK (billing_type IN ('milestone', 'progress_percent', 'time_based', 'fixed'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='start_date') THEN
        ALTER TABLE projects ADD COLUMN start_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='end_date') THEN
        ALTER TABLE projects ADD COLUMN end_date DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='parent_program_id') THEN
        ALTER TABLE projects ADD COLUMN parent_program_id INTEGER REFERENCES projects(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='state') THEN
        ALTER TABLE projects ADD COLUMN state VARCHAR(50) CHECK (state IN ('draft', 'planning', 'active', 'on_hold', 'completed', 'cancelled')) DEFAULT 'draft';
    END IF;
    -- Update project_type to include ERP types
    -- Note: This might conflict with existing Jira types, so we'll use a more flexible approach
END $$;

-- Project Stakeholders
CREATE TABLE IF NOT EXISTS project_stakeholders (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(100), -- 'sponsor', 'executive', 'team_member', 'observer', etc.
    responsibility TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Project Approvals Matrix
CREATE TABLE IF NOT EXISTS project_approvals (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    approval_type VARCHAR(100) NOT NULL, -- 'budget', 'scope_change', 'timeline', 'resource', 'go_live'
    approver_id INTEGER REFERENCES users(id),
    status VARCHAR(20) CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    comments TEXT,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Milestones (WBS Level 1)
CREATE TABLE IF NOT EXISTS project_milestones (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    status VARCHAR(50) CHECK (status IN ('planned', 'in_progress', 'completed', 'delayed', 'cancelled')) DEFAULT 'planned',
    is_critical BOOLEAN DEFAULT false,
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Tasks (WBS Level 2+)
CREATE TABLE IF NOT EXISTS project_tasks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES project_milestones(id),
    parent_task_id INTEGER REFERENCES project_tasks(id), -- For subtasks
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) CHECK (task_type IN ('task', 'deliverable', 'milestone', 'phase')) DEFAULT 'task',
    status VARCHAR(50) CHECK (status IN ('backlog', 'todo', 'in_progress', 'review', 'done', 'blocked', 'cancelled')) DEFAULT 'backlog',
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id),
    estimated_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    planned_start_date DATE,
    planned_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    due_date DATE,
    sla_hours INTEGER, -- SLA in hours for task completion
    tags TEXT[],
    checklist JSONB, -- Array of checklist items with status
    dependencies TEXT, -- JSON array of task IDs this task depends on
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Resource Allocation
CREATE TABLE IF NOT EXISTS project_resources (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    role VARCHAR(100), -- 'developer', 'designer', 'analyst', 'manager', etc.
    skill_level VARCHAR(50), -- 'junior', 'mid', 'senior', 'expert'
    allocation_percentage INTEGER DEFAULT 100 CHECK (allocation_percentage >= 0 AND allocation_percentage <= 100),
    cost_rate_per_hour DECIMAL(10, 2) DEFAULT 0,
    planned_hours DECIMAL(10, 2) DEFAULT 0,
    actual_hours DECIMAL(10, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    shift_type VARCHAR(50), -- 'day', 'night', 'flexible'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);

-- Project Budgets
CREATE TABLE IF NOT EXISTS project_budgets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    budget_type VARCHAR(50) CHECK (budget_type IN ('revenue', 'capex', 'opex', 'contingency')) NOT NULL,
    category VARCHAR(100), -- 'labor', 'materials', 'travel', 'subcontractor', 'overhead', etc.
    description TEXT,
    planned_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    committed_amount DECIMAL(15, 2) DEFAULT 0,
    actual_amount DECIMAL(15, 2) DEFAULT 0,
    revision_number INTEGER DEFAULT 1,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Costs (Actual cost tracking)
CREATE TABLE IF NOT EXISTS project_costs (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    cost_type VARCHAR(50) CHECK (cost_type IN ('labor', 'material', 'subcontractor', 'travel', 'expense', 'overhead', 'other')) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    cost_date DATE NOT NULL,
    vendor_id INTEGER REFERENCES partners(id),
    invoice_id INTEGER REFERENCES invoices(id),
    timesheet_id INTEGER, -- Link to timesheet if labor cost
    purchase_order_id INTEGER, -- Link to PO if material cost
    is_billable BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Billing
CREATE TABLE IF NOT EXISTS project_billing (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    milestone_id INTEGER REFERENCES project_milestones(id),
    billing_type VARCHAR(50) CHECK (billing_type IN ('milestone', 'progress', 'time_material', 'fixed')) NOT NULL,
    billing_percentage DECIMAL(5, 2), -- For progress-based billing
    amount DECIMAL(15, 2) NOT NULL,
    invoice_id INTEGER REFERENCES invoices(id),
    retention_amount DECIMAL(15, 2) DEFAULT 0,
    retention_release_date DATE,
    billing_date DATE,
    status VARCHAR(50) CHECK (status IN ('draft', 'billed', 'paid', 'overdue')) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Revenue Recognition
CREATE TABLE IF NOT EXISTS project_revenue_recognition (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    recognition_method VARCHAR(50) CHECK (recognition_method IN ('percentage_completion', 'milestone', 'time_based', 'deferred')) NOT NULL,
    completion_percentage DECIMAL(5, 2) DEFAULT 0,
    recognized_amount DECIMAL(15, 2) DEFAULT 0,
    deferred_amount DECIMAL(15, 2) DEFAULT 0,
    recognition_date DATE,
    accounting_period VARCHAR(20), -- '2025-Q1', '2025-01', etc.
    gl_account_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Timesheets (Project-specific)
CREATE TABLE IF NOT EXISTS timesheets (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    user_id INTEGER REFERENCES users(id),
    date_worked DATE NOT NULL,
    hours_worked DECIMAL(5, 2) NOT NULL,
    description TEXT,
    is_billable BOOLEAN DEFAULT true,
    billing_rate DECIMAL(10, 2),
    approval_status VARCHAR(50) CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')) DEFAULT 'draft',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Risks
CREATE TABLE IF NOT EXISTS project_risks (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    risk_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- 'technical', 'schedule', 'budget', 'resource', 'external', 'quality'
    probability INTEGER CHECK (probability >= 1 AND probability <= 5) DEFAULT 3, -- 1-5 scale
    impact INTEGER CHECK (impact >= 1 AND impact <= 5) DEFAULT 3, -- 1-5 scale
    risk_score INTEGER GENERATED ALWAYS AS (probability * impact) STORED,
    status VARCHAR(50) CHECK (status IN ('identified', 'assessed', 'mitigated', 'monitored', 'closed')) DEFAULT 'identified',
    mitigation_plan TEXT,
    mitigation_owner INTEGER REFERENCES users(id),
    residual_risk_score INTEGER,
    contingency_plan TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Issues
CREATE TABLE IF NOT EXISTS project_issues (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    issue_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50) CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    status VARCHAR(50) CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'escalated')) DEFAULT 'open',
    priority VARCHAR(50) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    assigned_to INTEGER REFERENCES users(id),
    reported_by INTEGER REFERENCES users(id),
    root_cause TEXT,
    resolution TEXT,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    sla_deadline TIMESTAMP,
    is_sla_breached BOOLEAN DEFAULT false,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Change Requests
CREATE TABLE IF NOT EXISTS project_change_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    change_code VARCHAR(50),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    change_type VARCHAR(50) CHECK (change_type IN ('scope', 'timeline', 'budget', 'resource', 'quality', 'other')) NOT NULL,
    requested_by INTEGER REFERENCES users(id),
    status VARCHAR(50) CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'implemented')) DEFAULT 'draft',
    scope_impact TEXT,
    cost_impact DECIMAL(15, 2) DEFAULT 0,
    timeline_impact_days INTEGER DEFAULT 0,
    original_contract_value DECIMAL(15, 2),
    revised_contract_value DECIMAL(15, 2),
    approval_workflow JSONB, -- Array of approvers with status
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    implementation_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Quality Checklists
CREATE TABLE IF NOT EXISTS project_quality_checklists (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    checklist_name VARCHAR(255) NOT NULL,
    checklist_type VARCHAR(50), -- 'qa', 'qc', 'inspection', 'acceptance'
    items JSONB NOT NULL, -- Array of {item, status, notes, checked_by, checked_at}
    status VARCHAR(50) CHECK (status IN ('draft', 'in_progress', 'completed', 'failed')) DEFAULT 'draft',
    completed_by INTEGER REFERENCES users(id),
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inspection Reports
CREATE TABLE IF NOT EXISTS project_inspections (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    inspection_type VARCHAR(100),
    inspection_date DATE NOT NULL,
    inspector_id INTEGER REFERENCES users(id),
    findings TEXT,
    non_conformities TEXT,
    corrective_actions TEXT,
    status VARCHAR(50) CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed')) DEFAULT 'scheduled',
    acceptance_criteria TEXT,
    sign_off_required BOOLEAN DEFAULT false,
    signed_off_by INTEGER REFERENCES users(id),
    signed_off_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Documents (Document Vault)
CREATE TABLE IF NOT EXISTS project_documents (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    document_type VARCHAR(100), -- 'contract', 'specification', 'design', 'test_report', 'audit', etc.
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    version_number INTEGER DEFAULT 1,
    is_current_version BOOLEAN DEFAULT true,
    previous_version_id INTEGER REFERENCES project_documents(id),
    uploaded_by INTEGER REFERENCES users(id),
    tags TEXT[],
    access_level VARCHAR(50) CHECK (access_level IN ('public', 'internal', 'confidential', 'restricted')) DEFAULT 'internal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Trail
CREATE TABLE IF NOT EXISTS project_audit_log (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- 'project', 'task', 'budget', 'risk', etc.
    entity_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'approve', 'reject'
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    changed_by INTEGER REFERENCES users(id),
    change_reason TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Procurement (Purchase Requests from Projects)
CREATE TABLE IF NOT EXISTS project_purchase_requests (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    request_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NOT NULL,
    requested_by INTEGER REFERENCES users(id),
    requested_date DATE DEFAULT CURRENT_DATE,
    required_date DATE,
    status VARCHAR(50) CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'purchased', 'received')) DEFAULT 'draft',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    purchase_order_id INTEGER, -- Link to purchase order when created
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Purchase Request Lines
CREATE TABLE IF NOT EXISTS project_purchase_request_lines (
    id SERIAL PRIMARY KEY,
    request_id INTEGER REFERENCES project_purchase_requests(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id),
    description TEXT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2),
    total_amount DECIMAL(15, 2),
    vendor_id INTEGER REFERENCES partners(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Inventory Reservations
CREATE TABLE IF NOT EXISTS project_inventory_reservations (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES project_tasks(id),
    product_id INTEGER REFERENCES products(id),
    quantity DECIMAL(10, 2) NOT NULL,
    reserved_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) CHECK (status IN ('reserved', 'allocated', 'consumed', 'released')) DEFAULT 'reserved',
    batch_number VARCHAR(100),
    serial_number VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Programs/Portfolios (Parent Projects)
-- Note: This uses self-referential relationship on projects table
-- parent_program_id column already added above

-- Project Dependencies (Task Dependencies)
CREATE TABLE IF NOT EXISTS project_task_dependencies (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
    depends_on_task_id INTEGER REFERENCES project_tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')) DEFAULT 'finish_to_start',
    lag_days INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, depends_on_task_id)
);

-- Project Comments/Collaboration
CREATE TABLE IF NOT EXISTS project_comments (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL, -- 'project', 'task', 'risk', 'issue', etc.
    entity_id INTEGER NOT NULL,
    parent_comment_id INTEGER REFERENCES project_comments(id), -- For threaded comments
    user_id INTEGER REFERENCES users(id),
    content TEXT NOT NULL,
    attachments JSONB, -- Array of attachment file paths
    is_internal BOOLEAN DEFAULT false, -- Internal vs client-facing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Meeting Notes
CREATE TABLE IF NOT EXISTS project_meetings (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    meeting_title VARCHAR(255) NOT NULL,
    meeting_date TIMESTAMP NOT NULL,
    meeting_type VARCHAR(50), -- 'status_update', 'planning', 'review', 'client_meeting', etc.
    attendees JSONB, -- Array of user IDs
    agenda TEXT,
    notes TEXT,
    action_items JSONB, -- Array of {item, owner, due_date, status}
    recorded_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Activity Log (General activity tracking)
CREATE TABLE IF NOT EXISTS project_activities (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- 'task_created', 'milestone_completed', 'budget_updated', etc.
    entity_type VARCHAR(100),
    entity_id INTEGER,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    metadata JSONB, -- Additional context data
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Templates
CREATE TABLE IF NOT EXISTS project_compliance_templates (
    id SERIAL PRIMARY KEY,
    template_name VARCHAR(255) NOT NULL,
    compliance_standard VARCHAR(100), -- 'ISO_9001', 'ISO_27001', 'PMO', 'SOX', etc.
    template_content JSONB NOT NULL, -- Checklist, requirements, etc.
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Project Compliance Tracking
CREATE TABLE IF NOT EXISTS project_compliance (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    template_id INTEGER REFERENCES project_compliance_templates(id),
    compliance_status VARCHAR(50) CHECK (compliance_status IN ('not_started', 'in_progress', 'compliant', 'non_compliant')) DEFAULT 'not_started',
    last_audit_date DATE,
    next_audit_date DATE,
    audit_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- INDEXES FOR ERP PROJECTS MODULE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_projects_code ON projects(code);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager_id ON projects(project_manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_partner_id ON projects(partner_id);
CREATE INDEX IF NOT EXISTS idx_projects_state ON projects(state);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_project_id ON project_stakeholders(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stakeholders_user_id ON project_stakeholders(user_id);
CREATE INDEX IF NOT EXISTS idx_project_approvals_project_id ON project_approvals(project_id);
CREATE INDEX IF NOT EXISTS idx_project_approvals_status ON project_approvals(status);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_status ON project_milestones(status);
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_milestone_id ON project_tasks(milestone_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON project_tasks(status);
-- Index will be created only if table and column exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_tasks') 
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_tasks' AND column_name = 'assigned_to') THEN
        CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON project_tasks(assigned_to);
    END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_project_resources_project_id ON project_resources(project_id);
CREATE INDEX IF NOT EXISTS idx_project_resources_user_id ON project_resources(user_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_project_id ON project_budgets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_budgets_budget_type ON project_budgets(budget_type);
CREATE INDEX IF NOT EXISTS idx_project_costs_project_id ON project_costs(project_id);
CREATE INDEX IF NOT EXISTS idx_project_costs_cost_type ON project_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_project_costs_cost_date ON project_costs(cost_date);
CREATE INDEX IF NOT EXISTS idx_project_billing_project_id ON project_billing(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_project_id ON timesheets(project_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_user_id ON timesheets(user_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date_worked ON timesheets(date_worked);
CREATE INDEX IF NOT EXISTS idx_timesheets_approval_status ON timesheets(approval_status);
CREATE INDEX IF NOT EXISTS idx_project_risks_project_id ON project_risks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_risks_risk_score ON project_risks(risk_score);
CREATE INDEX IF NOT EXISTS idx_project_issues_project_id ON project_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_project_issues_status ON project_issues(status);
CREATE INDEX IF NOT EXISTS idx_project_change_requests_project_id ON project_change_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_project_change_requests_status ON project_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_project_quality_checklists_project_id ON project_quality_checklists(project_id);
CREATE INDEX IF NOT EXISTS idx_project_inspections_project_id ON project_inspections(project_id);
CREATE INDEX IF NOT EXISTS idx_project_documents_project_id ON project_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_audit_log_project_id ON project_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_project_audit_log_entity ON project_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_project_purchase_requests_project_id ON project_purchase_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_project_task_dependencies_task_id ON project_task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_entity ON project_comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_project_meetings_project_id ON project_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_project_activities_project_id ON project_activities(project_id);

-- ============================================
-- TRIGGERS FOR ERP PROJECTS MODULE
-- ============================================

DROP TRIGGER IF EXISTS update_project_stakeholders_updated_at ON project_stakeholders;
CREATE TRIGGER update_project_stakeholders_updated_at BEFORE UPDATE ON project_stakeholders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_approvals_updated_at ON project_approvals;
CREATE TRIGGER update_project_approvals_updated_at BEFORE UPDATE ON project_approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_milestones_updated_at ON project_milestones;
CREATE TRIGGER update_project_milestones_updated_at BEFORE UPDATE ON project_milestones
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_tasks_updated_at ON project_tasks;
CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_resources_updated_at ON project_resources;
CREATE TRIGGER update_project_resources_updated_at BEFORE UPDATE ON project_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_budgets_updated_at ON project_budgets;
CREATE TRIGGER update_project_budgets_updated_at BEFORE UPDATE ON project_budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_costs_updated_at ON project_costs;
CREATE TRIGGER update_project_costs_updated_at BEFORE UPDATE ON project_costs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_billing_updated_at ON project_billing;
CREATE TRIGGER update_project_billing_updated_at BEFORE UPDATE ON project_billing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_revenue_recognition_updated_at ON project_revenue_recognition;
CREATE TRIGGER update_project_revenue_recognition_updated_at BEFORE UPDATE ON project_revenue_recognition
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_timesheets_updated_at ON timesheets;
CREATE TRIGGER update_timesheets_updated_at BEFORE UPDATE ON timesheets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_risks_updated_at ON project_risks;
CREATE TRIGGER update_project_risks_updated_at BEFORE UPDATE ON project_risks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_issues_updated_at ON project_issues;
CREATE TRIGGER update_project_issues_updated_at BEFORE UPDATE ON project_issues
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_change_requests_updated_at ON project_change_requests;
CREATE TRIGGER update_project_change_requests_updated_at BEFORE UPDATE ON project_change_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_quality_checklists_updated_at ON project_quality_checklists;
CREATE TRIGGER update_project_quality_checklists_updated_at BEFORE UPDATE ON project_quality_checklists
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_inspections_updated_at ON project_inspections;
CREATE TRIGGER update_project_inspections_updated_at BEFORE UPDATE ON project_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_documents_updated_at ON project_documents;
CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON project_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_purchase_requests_updated_at ON project_purchase_requests;
CREATE TRIGGER update_project_purchase_requests_updated_at BEFORE UPDATE ON project_purchase_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_inventory_reservations_updated_at ON project_inventory_reservations;
CREATE TRIGGER update_project_inventory_reservations_updated_at BEFORE UPDATE ON project_inventory_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_comments_updated_at ON project_comments;
CREATE TRIGGER update_project_comments_updated_at BEFORE UPDATE ON project_comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_meetings_updated_at ON project_meetings;
CREATE TRIGGER update_project_meetings_updated_at BEFORE UPDATE ON project_meetings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_compliance_templates_updated_at ON project_compliance_templates;
CREATE TRIGGER update_project_compliance_templates_updated_at BEFORE UPDATE ON project_compliance_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_compliance_updated_at ON project_compliance;
CREATE TRIGGER update_project_compliance_updated_at BEFORE UPDATE ON project_compliance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES FOR MANUFACTURING ORDERS MODULE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_product_id ON manufacturing_orders(product_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_state ON manufacturing_orders(state);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_mo_type ON manufacturing_orders(mo_type);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_sale_order_id ON manufacturing_orders(sale_order_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_date_planned_start ON manufacturing_orders(date_planned_start);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_user_id ON manufacturing_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_bom_id ON manufacturing_orders(bom_id);
CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_routing_id ON manufacturing_orders(routing_id);

CREATE INDEX IF NOT EXISTS idx_bom_product_id ON bom(product_id);
CREATE INDEX IF NOT EXISTS idx_bom_active ON bom(active);
CREATE INDEX IF NOT EXISTS idx_bom_lines_bom_id ON bom_lines(bom_id);
CREATE INDEX IF NOT EXISTS idx_bom_lines_product_id ON bom_lines(product_id);

CREATE INDEX IF NOT EXISTS idx_routing_active ON routing(active);
CREATE INDEX IF NOT EXISTS idx_routing_operations_routing_id ON routing_operations(routing_id);
CREATE INDEX IF NOT EXISTS idx_routing_operations_workcenter_id ON routing_operations(workcenter_id);
CREATE INDEX IF NOT EXISTS idx_routing_operations_sequence ON routing_operations(sequence);

CREATE INDEX IF NOT EXISTS idx_workcenters_active ON workcenters(active);
CREATE INDEX IF NOT EXISTS idx_workcenters_code ON workcenters(code);

CREATE INDEX IF NOT EXISTS idx_work_orders_mo_id ON work_orders(mo_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_state ON work_orders(state);
CREATE INDEX IF NOT EXISTS idx_work_orders_workcenter_id ON work_orders(workcenter_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_operation_id ON work_orders(operation_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_date_planned_start ON work_orders(date_planned_start);

CREATE INDEX IF NOT EXISTS idx_mo_material_consumption_mo_id ON mo_material_consumption(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_material_consumption_product_id ON mo_material_consumption(product_id);
CREATE INDEX IF NOT EXISTS idx_mo_material_consumption_workorder_id ON mo_material_consumption(workorder_id);
CREATE INDEX IF NOT EXISTS idx_mo_material_consumption_state ON mo_material_consumption(state);

CREATE INDEX IF NOT EXISTS idx_mo_material_reservations_mo_id ON mo_material_reservations(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_material_reservations_product_id ON mo_material_reservations(product_id);
CREATE INDEX IF NOT EXISTS idx_mo_material_reservations_state ON mo_material_reservations(state);

CREATE INDEX IF NOT EXISTS idx_mo_finished_goods_mo_id ON mo_finished_goods(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_finished_goods_product_id ON mo_finished_goods(product_id);
CREATE INDEX IF NOT EXISTS idx_mo_finished_goods_state ON mo_finished_goods(state);

CREATE INDEX IF NOT EXISTS idx_mo_quality_inspections_mo_id ON mo_quality_inspections(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_quality_inspections_workorder_id ON mo_quality_inspections(workorder_id);
CREATE INDEX IF NOT EXISTS idx_mo_quality_inspections_state ON mo_quality_inspections(state);
CREATE INDEX IF NOT EXISTS idx_mo_quality_checklist_inspection_id ON mo_quality_checklist(inspection_id);

CREATE INDEX IF NOT EXISTS idx_mo_non_conformance_mo_id ON mo_non_conformance(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_non_conformance_state ON mo_non_conformance(state);
CREATE INDEX IF NOT EXISTS idx_mo_non_conformance_ncr_number ON mo_non_conformance(ncr_number);

CREATE INDEX IF NOT EXISTS idx_mo_rework_orders_mo_id ON mo_rework_orders(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_rework_orders_state ON mo_rework_orders(state);

CREATE INDEX IF NOT EXISTS idx_mo_costing_mo_id ON mo_costing(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_costing_cost_type ON mo_costing(cost_type);

CREATE INDEX IF NOT EXISTS idx_mo_subcontracting_mo_id ON mo_subcontracting(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_subcontracting_partner_id ON mo_subcontracting(partner_id);
CREATE INDEX IF NOT EXISTS idx_mo_subcontracting_state ON mo_subcontracting(state);

CREATE INDEX IF NOT EXISTS idx_mo_operator_activities_workorder_id ON mo_operator_activities(workorder_id);
CREATE INDEX IF NOT EXISTS idx_mo_operator_activities_operator_id ON mo_operator_activities(operator_id);
CREATE INDEX IF NOT EXISTS idx_mo_operator_activities_timestamp ON mo_operator_activities(timestamp);

CREATE INDEX IF NOT EXISTS idx_mo_oee_tracking_workorder_id ON mo_oee_tracking(workorder_id);
CREATE INDEX IF NOT EXISTS idx_mo_oee_tracking_workcenter_id ON mo_oee_tracking(workcenter_id);
CREATE INDEX IF NOT EXISTS idx_mo_oee_tracking_date_tracked ON mo_oee_tracking(date_tracked);

CREATE INDEX IF NOT EXISTS idx_mo_kpi_summary_mo_id ON mo_kpi_summary(mo_id);
CREATE INDEX IF NOT EXISTS idx_mo_kpi_summary_metric_name ON mo_kpi_summary(metric_name);

-- ============================================
-- TRIGGERS FOR MANUFACTURING ORDERS MODULE
-- ============================================

DROP TRIGGER IF EXISTS update_manufacturing_orders_updated_at ON manufacturing_orders;
CREATE TRIGGER update_manufacturing_orders_updated_at BEFORE UPDATE ON manufacturing_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bom_updated_at ON bom;
CREATE TRIGGER update_bom_updated_at BEFORE UPDATE ON bom
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_routing_updated_at ON routing;
CREATE TRIGGER update_routing_updated_at BEFORE UPDATE ON routing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workcenters_updated_at ON workcenters;
CREATE TRIGGER update_workcenters_updated_at BEFORE UPDATE ON workcenters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_work_orders_updated_at ON work_orders;
CREATE TRIGGER update_work_orders_updated_at BEFORE UPDATE ON work_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_material_consumption_updated_at ON mo_material_consumption;
CREATE TRIGGER update_mo_material_consumption_updated_at BEFORE UPDATE ON mo_material_consumption
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_material_reservations_updated_at ON mo_material_reservations;
CREATE TRIGGER update_mo_material_reservations_updated_at BEFORE UPDATE ON mo_material_reservations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_finished_goods_updated_at ON mo_finished_goods;
CREATE TRIGGER update_mo_finished_goods_updated_at BEFORE UPDATE ON mo_finished_goods
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_quality_inspections_updated_at ON mo_quality_inspections;
CREATE TRIGGER update_mo_quality_inspections_updated_at BEFORE UPDATE ON mo_quality_inspections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_non_conformance_updated_at ON mo_non_conformance;
CREATE TRIGGER update_mo_non_conformance_updated_at BEFORE UPDATE ON mo_non_conformance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_rework_orders_updated_at ON mo_rework_orders;
CREATE TRIGGER update_mo_rework_orders_updated_at BEFORE UPDATE ON mo_rework_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_costing_updated_at ON mo_costing;
CREATE TRIGGER update_mo_costing_updated_at BEFORE UPDATE ON mo_costing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_mo_subcontracting_updated_at ON mo_subcontracting;
CREATE TRIGGER update_mo_subcontracting_updated_at BEFORE UPDATE ON mo_subcontracting
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RBAC (Role-Based Access Control) MODULE
-- ============================================

-- Modules enumeration
CREATE TYPE module_type AS ENUM (
    'crm', 'sales', 'inventory', 'accounting', 'hr', 
    'manufacturing', 'marketing', 'pos', 'website', 
    'support', 'projects', 'dashboard', 'system'
);

-- Permission actions
CREATE TYPE permission_action AS ENUM (
    'view', 'create', 'edit', 'delete', 'approve', 
    'export', 'import', 'configure', 'manage'
);

-- Record access levels
CREATE TYPE record_access_level AS ENUM (
    'own', 'team', 'department', 'all'
);

-- Role hierarchy (parent-child relationships)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'crm_viewer', 'sales_manager'
    description TEXT,
    module module_type NOT NULL,
    level INTEGER DEFAULT 1, -- 1-8 based on hierarchy
    parent_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_system_role BOOLEAN DEFAULT false, -- System roles cannot be deleted
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- For conflict resolution
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions (granular permissions per module/feature)
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL UNIQUE, -- e.g., 'crm.leads.create', 'sales.orders.approve'
    description TEXT,
    module module_type NOT NULL,
    feature VARCHAR(100), -- e.g., 'leads', 'opportunities', 'contacts'
    action permission_action NOT NULL,
    resource_type VARCHAR(100), -- e.g., 'lead', 'order', 'invoice'
    field_restrictions JSONB, -- Specific fields that are restricted
    record_access_level record_access_level DEFAULT 'own',
    conditions JSONB, -- Additional conditions (e.g., amount limits, team restrictions)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Permission mapping (many-to-many)
CREATE TABLE IF NOT EXISTS role_permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    granted BOOLEAN DEFAULT true, -- true = granted, false = explicitly denied
    conditions JSONB, -- Role-specific conditions (e.g., approval limits)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role_id, permission_id)
);

-- User-Role mapping (users can have multiple roles)
CREATE TABLE IF NOT EXISTS user_roles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    assigned_by INTEGER REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP, -- For temporary access
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    UNIQUE(user_id, role_id)
);

-- Teams (for team-based access)
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    module module_type,
    department VARCHAR(100),
    manager_id INTEGER REFERENCES users(id),
    parent_team_id INTEGER REFERENCES teams(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Team mapping
CREATE TABLE IF NOT EXISTS user_teams (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
    role_in_team VARCHAR(100), -- 'member', 'lead', 'manager'
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, team_id)
);

-- Departments (for department-based access)
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) UNIQUE,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    parent_department_id INTEGER REFERENCES departments(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User-Department mapping
CREATE TABLE IF NOT EXISTS user_departments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
    role_in_department VARCHAR(100),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, department_id)
);

-- Permission overrides (user-specific permission overrides)
CREATE TABLE IF NOT EXISTS user_permission_overrides (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
    granted BOOLEAN NOT NULL,
    reason TEXT,
    granted_by INTEGER REFERENCES users(id),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, permission_id)
);

-- Workflow permissions (for multi-stage approvals)
CREATE TABLE IF NOT EXISTS workflow_permissions (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(255) NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    can_transition BOOLEAN DEFAULT false,
    can_approve BOOLEAN DEFAULT false,
    can_reject BOOLEAN DEFAULT false,
    can_bypass BOOLEAN DEFAULT false,
    approval_limit DECIMAL(15, 2), -- Amount limit for approval
    conditions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(workflow_name, stage_name, role_id)
);

-- API Key permissions (for API access control)
CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    permissions JSONB, -- Scoped permissions
    scope VARCHAR(100), -- 'read', 'write', 'full'
    ip_whitelist TEXT[], -- Allowed IP addresses
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs (comprehensive permission and access logging)
CREATE TABLE IF NOT EXISTS rbac_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'permission_granted', 'permission_denied', 'role_assigned', 'access_attempt', etc.
    resource_type VARCHAR(100), -- 'role', 'permission', 'user', 'api_key', etc.
    resource_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Access attempts (for security monitoring)
CREATE TABLE IF NOT EXISTS access_attempts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    resource_type VARCHAR(100) NOT NULL,
    resource_id INTEGER,
    action VARCHAR(100) NOT NULL,
    permission_required VARCHAR(255),
    granted BOOLEAN NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Segregation of Duties (SoD) rules
CREATE TABLE IF NOT EXISTS sod_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    conflicting_role_ids INTEGER[] NOT NULL, -- Array of role IDs that conflict
    severity VARCHAR(50) CHECK (severity IN ('warning', 'error', 'block')) DEFAULT 'error',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SoD violations log
CREATE TABLE IF NOT EXISTS sod_violations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) NOT NULL,
    sod_rule_id INTEGER REFERENCES sod_rules(id) NOT NULL,
    conflicting_roles INTEGER[] NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by INTEGER REFERENCES users(id),
    status VARCHAR(50) CHECK (status IN ('active', 'resolved', 'ignored')) DEFAULT 'active'
);

-- Geofencing rules (location-based access)
CREATE TABLE IF NOT EXISTS geofencing_rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    ip_ranges CIDR[], -- Allowed IP ranges
    countries TEXT[], -- Allowed countries
    require_vpn BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Role-Geofencing mapping
CREATE TABLE IF NOT EXISTS role_geofencing (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
    geofencing_rule_id INTEGER REFERENCES geofencing_rules(id) ON DELETE CASCADE NOT NULL,
    UNIQUE(role_id, geofencing_rule_id)
);

-- Device restrictions
CREATE TABLE IF NOT EXISTS device_restrictions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    require_device_registration BOOLEAN DEFAULT false,
    allowed_device_types TEXT[], -- 'desktop', 'mobile', 'tablet'
    require_mdm_compliance BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Registered devices
CREATE TABLE IF NOT EXISTS registered_devices (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    device_id VARCHAR(255) NOT NULL,
    device_type VARCHAR(50),
    device_name VARCHAR(255),
    ip_address VARCHAR(45),
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, device_id)
);

-- Indexes for RBAC tables
CREATE INDEX IF NOT EXISTS idx_roles_module ON roles(module);
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role_id);
CREATE INDEX IF NOT EXISTS idx_roles_code ON roles(code);
CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_teams_user ON user_teams(user_id);
CREATE INDEX IF NOT EXISTS idx_user_teams_team ON user_teams(team_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_user ON user_departments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_departments_dept ON user_departments(department_id);
CREATE INDEX IF NOT EXISTS idx_workflow_permissions_workflow ON workflow_permissions(workflow_name, stage_name);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_user ON rbac_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_rbac_audit_logs_created ON rbac_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_access_attempts_user ON access_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_access_attempts_created ON access_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_sod_violations_user ON sod_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_registered_devices_user ON registered_devices(user_id);

-- Triggers for RBAC tables
DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_permissions_updated_at ON permissions;
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_departments_updated_at ON departments;
CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sod_rules_updated_at ON sod_rules;
CREATE TRIGGER update_sod_rules_updated_at BEFORE UPDATE ON sod_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_geofencing_rules_updated_at ON geofencing_rules;
CREATE TRIGGER update_geofencing_rules_updated_at BEFORE UPDATE ON geofencing_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_restrictions_updated_at ON device_restrictions;
CREATE TRIGGER update_device_restrictions_updated_at BEFORE UPDATE ON device_restrictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
