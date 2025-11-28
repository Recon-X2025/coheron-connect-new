-- ============================================
-- INVENTORY MODULE - Complete ERP Specification
-- ============================================
-- This migration adds comprehensive Inventory Management functionality
-- to the Coheron ERP system covering warehouses, stock movements, 
-- batch/serial tracking, valuation, quality, and replenishment.

-- ============================================
-- 1. UNIT OF MEASURE (UOM) MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS uom_category (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS uom (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category_id INTEGER REFERENCES uom_category(id),
    uom_type VARCHAR(50) CHECK (uom_type IN ('reference', 'bigger', 'smaller')) DEFAULT 'reference',
    factor DECIMAL(10, 6) DEFAULT 1.0, -- Conversion factor to reference UOM
    rounding DECIMAL(10, 6) DEFAULT 0.01,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. WAREHOUSE & LOCATION MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS warehouses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    warehouse_type VARCHAR(50) CHECK (warehouse_type IN ('internal', 'vendor', 'customer', 'transit', 'production')) DEFAULT 'internal',
    company_id INTEGER, -- Multi-company support
    partner_id INTEGER REFERENCES partners(id), -- For vendor/customer warehouses
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    phone VARCHAR(50),
    email VARCHAR(255),
    manager_id INTEGER REFERENCES users(id),
    active BOOLEAN DEFAULT true,
    view_location_id INTEGER, -- View location for stock operations
    lot_stock_id INTEGER, -- Stock location
    wh_input_stock_loc_id INTEGER, -- Input location
    wh_qc_stock_loc_id INTEGER, -- QC location
    wh_output_stock_loc_id INTEGER, -- Output location
    wh_pack_stock_loc_id INTEGER, -- Packing location
    temperature_controlled BOOLEAN DEFAULT false,
    humidity_controlled BOOLEAN DEFAULT false,
    security_level VARCHAR(50),
    operating_hours TEXT,
    capacity_cubic_meters DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    complete_name VARCHAR(255), -- Full path name
    location_id INTEGER REFERENCES stock_locations(id), -- Parent location
    warehouse_id INTEGER REFERENCES warehouses(id),
    usage VARCHAR(50) CHECK (usage IN ('supplier', 'view', 'internal', 'customer', 'inventory', 'production', 'transit')) DEFAULT 'internal',
    active BOOLEAN DEFAULT true,
    scrap_location BOOLEAN DEFAULT false,
    return_location BOOLEAN DEFAULT false,
    posx INTEGER, -- X coordinate for warehouse layout
    posy INTEGER, -- Y coordinate
    posz INTEGER, -- Z coordinate (shelf level)
    removal_strategy VARCHAR(50) CHECK (removal_strategy IN ('fifo', 'lifo', 'fefo', 'closest', 'least_packages')) DEFAULT 'fifo',
    company_id INTEGER,
    barcode VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 3. ENHANCED PRODUCT/ITEM MASTER
-- ============================================

-- Extend products table with inventory-specific fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS tracking VARCHAR(20) CHECK (tracking IN ('none', 'lot', 'serial', 'lot_serial')) DEFAULT 'none';
ALTER TABLE products ADD COLUMN IF NOT EXISTS purchase_ok BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_ok BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom_id INTEGER REFERENCES uom(id);
ALTER TABLE products ADD COLUMN IF NOT EXISTS uom_po_id INTEGER REFERENCES uom(id); -- Purchase UOM
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS volume DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS length DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS width DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS height DECIMAL(10, 2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS barcode_secondary VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(50); -- HSN/SAC for GST
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_min DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_max DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_qty DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS reorder_point DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS safety_stock DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS costing_method VARCHAR(50) CHECK (costing_method IN ('fifo', 'lifo', 'average', 'standard', 'real')) DEFAULT 'fifo';
ALTER TABLE products ADD COLUMN IF NOT EXISTS standard_price DECIMAL(10, 2) DEFAULT 0; -- Standard cost
ALTER TABLE products ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_purchase TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description_sale TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturer VARCHAR(255);
ALTER TABLE products ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(100);

-- Product Variants
CREATE TABLE IF NOT EXISTS product_variants (
    id SERIAL PRIMARY KEY,
    product_tmpl_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    default_code VARCHAR(100) UNIQUE,
    barcode VARCHAR(255),
    active BOOLEAN DEFAULT true,
    attribute_value_ids JSONB, -- JSON array of attribute values
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product Attributes (for variants)
CREATE TABLE IF NOT EXISTS product_attributes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    display_type VARCHAR(50) CHECK (display_type IN ('radio', 'select', 'color', 'text')) DEFAULT 'select',
    sequence INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_attribute_values (
    id SERIAL PRIMARY KEY,
    attribute_id INTEGER REFERENCES product_attributes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    sequence INTEGER DEFAULT 10,
    color VARCHAR(7), -- Hex color code
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. STOCK QUANTITY & VALUATION
-- ============================================

CREATE TABLE IF NOT EXISTS stock_quant (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    reserved_quantity DECIMAL(10, 2) DEFAULT 0,
    in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lot_id INTEGER, -- Reference to stock_production_lot
    package_id INTEGER, -- For package tracking
    owner_id INTEGER REFERENCES partners(id), -- Consignment stock
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id, lot_id, package_id, owner_id)
);

CREATE TABLE IF NOT EXISTS stock_valuation_layer (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    value DECIMAL(10, 2) NOT NULL, -- quantity * unit_cost
    remaining_qty DECIMAL(10, 2) NOT NULL,
    remaining_value DECIMAL(10, 2) NOT NULL,
    stock_move_id INTEGER, -- Reference to stock_move
    stock_valuation_layer_id INTEGER REFERENCES stock_valuation_layer(id), -- For splits
    description TEXT,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 5. BATCH/LOT & SERIAL NUMBER MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS stock_production_lot (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    ref VARCHAR(255), -- Reference number
    company_id INTEGER,
    product_uom_id INTEGER REFERENCES uom(id),
    quant_ids INTEGER[], -- Array of stock_quant IDs
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, product_id)
);

CREATE TABLE IF NOT EXISTS stock_lot (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    company_id INTEGER,
    ref VARCHAR(255),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(name, product_id)
);

-- Lot Attributes (expiry dates, manufacturing dates, etc.)
CREATE TABLE IF NOT EXISTS stock_lot_attributes (
    id SERIAL PRIMARY KEY,
    lot_id INTEGER REFERENCES stock_production_lot(id) ON DELETE CASCADE,
    attribute_name VARCHAR(100) NOT NULL,
    attribute_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Serial Numbers
CREATE TABLE IF NOT EXISTS stock_lot_serial (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    quant_id INTEGER REFERENCES stock_quant(id),
    company_id INTEGER,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. STOCK MOVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_picking_type (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL CHECK (code IN ('incoming', 'outgoing', 'internal', 'mrp_operation', 'mrp_consumption', 'mrp_production')),
    sequence INTEGER DEFAULT 10,
    default_location_src_id INTEGER REFERENCES stock_locations(id),
    default_location_dest_id INTEGER REFERENCES stock_locations(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    active BOOLEAN DEFAULT true,
    show_operations BOOLEAN DEFAULT false,
    show_reserved BOOLEAN DEFAULT true,
    use_create_lots BOOLEAN DEFAULT false,
    use_existing_lots BOOLEAN DEFAULT true,
    sequence_id INTEGER, -- For auto-numbering
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_picking (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL, -- Auto-generated picking number
    picking_type_id INTEGER REFERENCES stock_picking_type(id),
    state VARCHAR(50) CHECK (state IN ('draft', 'waiting', 'confirmed', 'assigned', 'done', 'cancel')) DEFAULT 'draft',
    location_id INTEGER REFERENCES stock_locations(id), -- Source location
    location_dest_id INTEGER REFERENCES stock_locations(id), -- Destination location
    partner_id INTEGER REFERENCES partners(id),
    scheduled_date TIMESTAMP,
    date_done TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    company_id INTEGER,
    origin VARCHAR(255), -- Source document (PO, SO, etc.)
    note TEXT,
    priority VARCHAR(20) CHECK (priority IN ('0', '1', '2', '3')) DEFAULT '1', -- 0=Not urgent, 3=Very urgent
    printed BOOLEAN DEFAULT false,
    is_locked BOOLEAN DEFAULT false,
    backorder_id INTEGER REFERENCES stock_picking(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_move (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    picking_id INTEGER REFERENCES stock_picking(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_id INTEGER REFERENCES uom(id),
    product_uom_qty DECIMAL(10, 2) NOT NULL, -- Quantity in UOM
    quantity_done DECIMAL(10, 2) DEFAULT 0, -- Actual quantity done
    reserved_availability DECIMAL(10, 2) DEFAULT 0,
    state VARCHAR(50) CHECK (state IN ('draft', 'waiting', 'confirmed', 'assigned', 'done', 'cancel')) DEFAULT 'draft',
    location_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    location_dest_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    origin VARCHAR(255), -- Source document reference
    reference VARCHAR(255), -- Document reference
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expected TIMESTAMP,
    date_deadline TIMESTAMP,
    procurement_id INTEGER, -- Link to procurement
    created_purchase_line_id INTEGER, -- Link to purchase order line
    sale_line_id INTEGER, -- Link to sale order line
    purchase_line_id INTEGER, -- Link to purchase order line
    raw_material_production_id INTEGER, -- Link to manufacturing order
    production_id INTEGER, -- Link to manufacturing order
    scrap_id INTEGER, -- Link to scrap record
    inventory_id INTEGER, -- Link to inventory adjustment
    picking_type_id INTEGER REFERENCES stock_picking_type(id),
    company_id INTEGER,
    price_unit DECIMAL(10, 2) DEFAULT 0, -- Unit cost
    product_packaging_id INTEGER,
    route_ids INTEGER[], -- Procurement routes
    warehouse_id INTEGER REFERENCES warehouses(id),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock Move Lines (for tracking lot/serial per move)
CREATE TABLE IF NOT EXISTS stock_move_line (
    id SERIAL PRIMARY KEY,
    move_id INTEGER REFERENCES stock_move(id) ON DELETE CASCADE NOT NULL,
    picking_id INTEGER REFERENCES stock_picking(id),
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_id INTEGER REFERENCES uom(id),
    location_id INTEGER REFERENCES stock_locations(id),
    location_dest_id INTEGER REFERENCES stock_locations(id),
    lot_id INTEGER REFERENCES stock_production_lot(id),
    lot_name VARCHAR(255), -- For lot creation
    package_id INTEGER,
    owner_id INTEGER REFERENCES partners(id),
    qty_done DECIMAL(10, 2) DEFAULT 0,
    product_uom_qty DECIMAL(10, 2) NOT NULL,
    result_package_id INTEGER,
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    state VARCHAR(50) CHECK (state IN ('draft', 'assigned', 'done', 'cancel')) DEFAULT 'draft',
    company_id INTEGER,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. GOODS RECEIPT NOTE (GRN)
-- ============================================

CREATE TABLE IF NOT EXISTS stock_grn (
    id SERIAL PRIMARY KEY,
    grn_number VARCHAR(100) UNIQUE NOT NULL,
    picking_id INTEGER REFERENCES stock_picking(id),
    purchase_order_id INTEGER, -- Reference to purchase order
    partner_id INTEGER REFERENCES partners(id) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    grn_date DATE NOT NULL,
    expected_date DATE,
    state VARCHAR(50) CHECK (state IN ('draft', 'received', 'qc_pending', 'qc_passed', 'qc_failed', 'done', 'cancel')) DEFAULT 'draft',
    qc_status VARCHAR(50) CHECK (qc_status IN ('pending', 'passed', 'failed', 'partial')) DEFAULT 'pending',
    qc_inspector_id INTEGER REFERENCES users(id),
    qc_date TIMESTAMP,
    qc_remarks TEXT,
    received_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    delivery_challan_number VARCHAR(100),
    supplier_invoice_number VARCHAR(100),
    document_attachments TEXT[], -- Array of file paths
    notes TEXT,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_grn_lines (
    id SERIAL PRIMARY KEY,
    grn_id INTEGER REFERENCES stock_grn(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    purchase_line_id INTEGER, -- Link to purchase order line
    product_uom_id INTEGER REFERENCES uom(id),
    ordered_qty DECIMAL(10, 2) NOT NULL,
    received_qty DECIMAL(10, 2) DEFAULT 0,
    accepted_qty DECIMAL(10, 2) DEFAULT 0,
    rejected_qty DECIMAL(10, 2) DEFAULT 0,
    unit_price DECIMAL(10, 2),
    landed_cost DECIMAL(10, 2) DEFAULT 0, -- Landed cost per unit
    freight_cost DECIMAL(10, 2) DEFAULT 0,
    handling_cost DECIMAL(10, 2) DEFAULT 0,
    duty_cost DECIMAL(10, 2) DEFAULT 0,
    insurance_cost DECIMAL(10, 2) DEFAULT 0,
    qc_status VARCHAR(50) CHECK (qc_status IN ('pending', 'passed', 'failed', 'partial')) DEFAULT 'pending',
    qc_remarks TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 8. STOCK TRANSFERS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_transfer (
    id SERIAL PRIMARY KEY,
    transfer_number VARCHAR(100) UNIQUE NOT NULL,
    picking_id INTEGER REFERENCES stock_picking(id),
    from_warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    to_warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    from_location_id INTEGER REFERENCES stock_locations(id),
    to_location_id INTEGER REFERENCES stock_locations(id),
    transfer_date DATE NOT NULL,
    expected_delivery_date DATE,
    state VARCHAR(50) CHECK (state IN ('draft', 'initiated', 'in_transit', 'received', 'rejected', 'done', 'cancel')) DEFAULT 'draft',
    transfer_type VARCHAR(50) CHECK (transfer_type IN ('warehouse_to_warehouse', 'bin_to_bin', 'inter_company', 'branch')) DEFAULT 'warehouse_to_warehouse',
    initiated_by INTEGER REFERENCES users(id),
    received_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    transporter_name VARCHAR(255),
    vehicle_number VARCHAR(100),
    tracking_number VARCHAR(100),
    notes TEXT,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_transfer_lines (
    id SERIAL PRIMARY KEY,
    transfer_id INTEGER REFERENCES stock_transfer(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_id INTEGER REFERENCES uom(id),
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_done DECIMAL(10, 2) DEFAULT 0,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    unit_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 9. STOCK ADJUSTMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_adjustment (
    id SERIAL PRIMARY KEY,
    adjustment_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id),
    adjustment_date DATE NOT NULL,
    adjustment_type VARCHAR(50) CHECK (adjustment_type IN ('gain', 'loss', 'damage', 'expiry', 'spoilage', 'theft', 'write_off', 'revaluation')) NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'pending_approval', 'approved', 'done', 'cancel')) DEFAULT 'draft',
    reason_code VARCHAR(100),
    reason_description TEXT,
    adjusted_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    approval_threshold DECIMAL(10, 2), -- Value threshold requiring approval
    total_value DECIMAL(10, 2) DEFAULT 0,
    document_attachments TEXT[],
    notes TEXT,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_adjustment_lines (
    id SERIAL PRIMARY KEY,
    adjustment_id INTEGER REFERENCES stock_adjustment(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_id INTEGER REFERENCES uom(id),
    system_qty DECIMAL(10, 2) NOT NULL, -- System quantity before adjustment
    physical_qty DECIMAL(10, 2) NOT NULL, -- Physical quantity counted
    adjustment_qty DECIMAL(10, 2) NOT NULL, -- Difference (physical - system)
    lot_id INTEGER REFERENCES stock_production_lot(id),
    unit_cost DECIMAL(10, 2),
    adjustment_value DECIMAL(10, 2), -- adjustment_qty * unit_cost
    reason_code VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 10. STOCK ISSUES
-- ============================================

CREATE TABLE IF NOT EXISTS stock_issue (
    id SERIAL PRIMARY KEY,
    issue_number VARCHAR(100) UNIQUE NOT NULL,
    picking_id INTEGER REFERENCES stock_picking(id),
    issue_type VARCHAR(50) CHECK (issue_type IN ('production', 'project', 'job', 'work_order', 'ad_hoc', 'sample', 'internal_consumption')) NOT NULL,
    from_warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    from_location_id INTEGER REFERENCES stock_locations(id),
    to_reference_type VARCHAR(50), -- 'manufacturing_order', 'project', 'work_order', etc.
    to_reference_id INTEGER, -- ID of the reference
    issue_date DATE NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'pending_approval', 'approved', 'done', 'cancel')) DEFAULT 'draft',
    issued_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    picking_strategy VARCHAR(50) CHECK (picking_strategy IN ('fifo', 'fefo', 'lifo', 'manual')) DEFAULT 'fifo',
    notes TEXT,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_issue_lines (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER REFERENCES stock_issue(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_id INTEGER REFERENCES uom(id),
    requested_qty DECIMAL(10, 2) NOT NULL,
    issued_qty DECIMAL(10, 2) DEFAULT 0,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    unit_cost DECIMAL(10, 2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 11. STOCK RETURNS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_return (
    id SERIAL PRIMARY KEY,
    return_number VARCHAR(100) UNIQUE NOT NULL,
    picking_id INTEGER REFERENCES stock_picking(id),
    return_type VARCHAR(50) CHECK (return_type IN ('purchase_return', 'sales_return', 'internal_return')) NOT NULL,
    original_transaction_type VARCHAR(50), -- 'grn', 'sale_order', 'transfer', etc.
    original_transaction_id INTEGER, -- ID of original transaction
    partner_id INTEGER REFERENCES partners(id),
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    return_date DATE NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'pending_approval', 'approved', 'received', 'done', 'cancel')) DEFAULT 'draft',
    return_reason VARCHAR(255),
    restock_location_id INTEGER REFERENCES stock_locations(id), -- Where to restock
    restock_rule VARCHAR(50) CHECK (restock_rule IN ('original_location', 'quarantine', 'damage_area')) DEFAULT 'original_location',
    qc_required BOOLEAN DEFAULT true,
    qc_status VARCHAR(50) CHECK (qc_status IN ('pending', 'passed', 'failed')) DEFAULT 'pending',
    returned_by INTEGER REFERENCES users(id),
    received_by INTEGER REFERENCES users(id),
    approved_by INTEGER REFERENCES users(id),
    credit_note_id INTEGER, -- Link to accounting credit note
    notes TEXT,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_return_lines (
    id SERIAL PRIMARY KEY,
    return_id INTEGER REFERENCES stock_return(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_uom_id INTEGER REFERENCES uom(id),
    original_qty DECIMAL(10, 2) NOT NULL, -- Original quantity from transaction
    returned_qty DECIMAL(10, 2) NOT NULL,
    accepted_qty DECIMAL(10, 2) DEFAULT 0,
    rejected_qty DECIMAL(10, 2) DEFAULT 0,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    unit_price DECIMAL(10, 2),
    return_reason VARCHAR(255),
    qc_status VARCHAR(50) CHECK (qc_status IN ('pending', 'passed', 'failed')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 12. QUALITY MANAGEMENT
-- ============================================

CREATE TABLE IF NOT EXISTS stock_quality_inspection (
    id SERIAL PRIMARY KEY,
    inspection_number VARCHAR(100) UNIQUE NOT NULL,
    inspection_type VARCHAR(50) CHECK (inspection_type IN ('grn', 'production', 'return', 'internal')) NOT NULL,
    source_type VARCHAR(50), -- 'grn', 'manufacturing_order', 'return', etc.
    source_id INTEGER, -- ID of source document
    product_id INTEGER REFERENCES products(id),
    warehouse_id INTEGER REFERENCES warehouses(id),
    inspection_date DATE NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'in_progress', 'passed', 'failed', 'partial')) DEFAULT 'draft',
    inspector_id INTEGER REFERENCES users(id),
    sampling_method VARCHAR(50) CHECK (sampling_method IN ('full', 'random', 'systematic', 'stratified')) DEFAULT 'full',
    sample_size INTEGER,
    total_qty DECIMAL(10, 2),
    inspected_qty DECIMAL(10, 2) DEFAULT 0,
    passed_qty DECIMAL(10, 2) DEFAULT 0,
    failed_qty DECIMAL(10, 2) DEFAULT 0,
    hold_qty DECIMAL(10, 2) DEFAULT 0,
    quarantine_location_id INTEGER REFERENCES stock_locations(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_quality_checklist (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER REFERENCES stock_quality_inspection(id) ON DELETE CASCADE NOT NULL,
    checklist_item VARCHAR(255) NOT NULL,
    standard_value TEXT,
    actual_value TEXT,
    status VARCHAR(50) CHECK (status IN ('pass', 'fail', 'na')) DEFAULT 'pass',
    remarks TEXT,
    sequence INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_non_conformance (
    id SERIAL PRIMARY KEY,
    ncr_number VARCHAR(100) UNIQUE NOT NULL,
    inspection_id INTEGER REFERENCES stock_quality_inspection(id),
    product_id INTEGER REFERENCES products(id) NOT NULL,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    quantity DECIMAL(10, 2) NOT NULL,
    non_conformance_type VARCHAR(50) CHECK (non_conformance_type IN ('defect', 'damage', 'specification', 'other')) NOT NULL,
    severity VARCHAR(50) CHECK (severity IN ('minor', 'major', 'critical')) DEFAULT 'minor',
    description TEXT NOT NULL,
    root_cause TEXT,
    corrective_action TEXT,
    preventive_action TEXT,
    state VARCHAR(50) CHECK (state IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
    assigned_to INTEGER REFERENCES users(id),
    resolved_by INTEGER REFERENCES users(id),
    resolved_date DATE,
    rework_order_id INTEGER, -- Link to rework order
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

-- ============================================
-- 13. REPLENISHMENT & PLANNING
-- ============================================

CREATE TABLE IF NOT EXISTS stock_reorder_rule (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id),
    product_min_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
    product_max_qty DECIMAL(10, 2) NOT NULL DEFAULT 0,
    qty_multiple DECIMAL(10, 2) DEFAULT 1,
    lead_days INTEGER DEFAULT 0,
    lead_type VARCHAR(50) CHECK (lead_type IN ('supplier', 'manufacturing', 'transit')) DEFAULT 'supplier',
    active BOOLEAN DEFAULT true,
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id, location_id)
);

CREATE TABLE IF NOT EXISTS stock_reorder_suggestion (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    current_qty DECIMAL(10, 2) NOT NULL,
    min_qty DECIMAL(10, 2) NOT NULL,
    max_qty DECIMAL(10, 2) NOT NULL,
    suggested_qty DECIMAL(10, 2) NOT NULL,
    reorder_point DECIMAL(10, 2),
    safety_stock DECIMAL(10, 2),
    forecasted_demand DECIMAL(10, 2),
    lead_time_days INTEGER,
    suggestion_type VARCHAR(50) CHECK (suggestion_type IN ('min_max', 'reorder_point', 'forecast', 'mrp')) DEFAULT 'min_max',
    state VARCHAR(50) CHECK (state IN ('new', 'approved', 'purchase_requisition_created', 'purchase_order_created', 'done', 'cancel')) DEFAULT 'new',
    purchase_requisition_id INTEGER,
    purchase_order_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_forecast (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    forecast_date DATE NOT NULL,
    forecast_qty DECIMAL(10, 2) NOT NULL,
    forecast_method VARCHAR(50) CHECK (forecast_method IN ('historical', 'trend', 'seasonal', 'ai', 'manual')) DEFAULT 'historical',
    confidence_level DECIMAL(5, 2), -- 0-100
    actual_qty DECIMAL(10, 2), -- For accuracy tracking
    accuracy DECIMAL(5, 2), -- Calculated accuracy
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id, forecast_date)
);

-- ============================================
-- 14. WAREHOUSE OPERATIONS
-- ============================================

-- Putaway Operations
CREATE TABLE IF NOT EXISTS stock_putaway (
    id SERIAL PRIMARY KEY,
    putaway_number VARCHAR(100) UNIQUE NOT NULL,
    picking_id INTEGER REFERENCES stock_picking(id),
    move_id INTEGER REFERENCES stock_move(id),
    product_id INTEGER REFERENCES products(id) NOT NULL,
    from_location_id INTEGER REFERENCES stock_locations(id), -- Usually receiving location
    suggested_location_id INTEGER REFERENCES stock_locations(id), -- System suggestion
    actual_location_id INTEGER REFERENCES stock_locations(id), -- Actual putaway location
    quantity DECIMAL(10, 2) NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'assigned', 'in_progress', 'done', 'cancel')) DEFAULT 'draft',
    assigned_to INTEGER REFERENCES users(id),
    completed_by INTEGER REFERENCES users(id),
    putaway_date TIMESTAMP,
    putaway_time_seconds INTEGER, -- Time taken
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Picking Operations
CREATE TABLE IF NOT EXISTS stock_picking_list (
    id SERIAL PRIMARY KEY,
    picking_list_number VARCHAR(100) UNIQUE NOT NULL,
    picking_type VARCHAR(50) CHECK (picking_type IN ('single_order', 'multi_order', 'wave', 'zone')) DEFAULT 'single_order',
    wave_id INTEGER, -- For wave picking
    zone_id INTEGER, -- For zone picking
    sale_order_ids INTEGER[], -- Array of sale order IDs
    picking_id INTEGER REFERENCES stock_picking(id),
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'assigned', 'in_progress', 'done', 'cancel')) DEFAULT 'draft',
    assigned_to INTEGER REFERENCES users(id),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    picking_route JSONB, -- Optimized picking route
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_picking_list_lines (
    id SERIAL PRIMARY KEY,
    picking_list_id INTEGER REFERENCES stock_picking_list(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    quantity_picked DECIMAL(10, 2) DEFAULT 0,
    sequence INTEGER DEFAULT 10, -- Picking sequence
    lot_id INTEGER REFERENCES stock_production_lot(id),
    state VARCHAR(50) CHECK (state IN ('pending', 'picked', 'short', 'cancel')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Packing Operations
CREATE TABLE IF NOT EXISTS stock_package (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    package_type_id INTEGER, -- Package type (carton, pallet, etc.)
    picking_id INTEGER REFERENCES stock_picking(id),
    location_id INTEGER REFERENCES stock_locations(id),
    weight DECIMAL(10, 2),
    volume DECIMAL(10, 2),
    package_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    packed_by INTEGER REFERENCES users(id),
    state VARCHAR(50) CHECK (state IN ('draft', 'packed', 'shipped', 'delivered')) DEFAULT 'draft',
    tracking_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_package_lines (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES stock_package(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 15. CYCLE COUNTING & PHYSICAL INVENTORY
-- ============================================

CREATE TABLE IF NOT EXISTS stock_cycle_count (
    id SERIAL PRIMARY KEY,
    count_number VARCHAR(100) UNIQUE NOT NULL,
    count_type VARCHAR(50) CHECK (count_type IN ('scheduled', 'random', 'abc_based', 'location_based', 'full_warehouse')) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id) NOT NULL,
    location_ids INTEGER[], -- Array of location IDs to count
    product_ids INTEGER[], -- Array of product IDs to count (if product-based)
    count_date DATE NOT NULL,
    state VARCHAR(50) CHECK (state IN ('draft', 'assigned', 'in_progress', 'done', 'adjustment_pending', 'done', 'cancel')) DEFAULT 'draft',
    count_method VARCHAR(50) CHECK (count_method IN ('blind', 'guided', 'partial', 'full')) DEFAULT 'guided',
    assigned_to INTEGER[], -- Array of user IDs
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    adjustment_id INTEGER REFERENCES stock_adjustment(id), -- Generated adjustment
    variance_threshold DECIMAL(10, 2), -- Value threshold for variance approval
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS stock_cycle_count_lines (
    id SERIAL PRIMARY KEY,
    cycle_count_id INTEGER REFERENCES stock_cycle_count(id) ON DELETE CASCADE NOT NULL,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    lot_id INTEGER REFERENCES stock_production_lot(id),
    system_qty DECIMAL(10, 2) NOT NULL, -- System quantity
    counted_qty DECIMAL(10, 2), -- Physical counted quantity
    variance_qty DECIMAL(10, 2), -- Difference
    variance_value DECIMAL(10, 2), -- Variance value
    unit_cost DECIMAL(10, 2),
    counted_by INTEGER REFERENCES users(id),
    count_timestamp TIMESTAMP,
    state VARCHAR(50) CHECK (state IN ('pending', 'counted', 'variance', 'approved', 'adjusted')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 16. STOCK RESERVATIONS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_reservation (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    reserved_qty DECIMAL(10, 2) NOT NULL,
    reservation_type VARCHAR(50) CHECK (reservation_type IN ('sale_order', 'manufacturing', 'project', 'transfer', 'other')) NOT NULL,
    reservation_origin_type VARCHAR(50), -- 'sale_order', 'manufacturing_order', etc.
    reservation_origin_id INTEGER, -- ID of origin document
    lot_id INTEGER REFERENCES stock_production_lot(id),
    state VARCHAR(50) CHECK (state IN ('reserved', 'partially_reserved', 'done', 'cancel')) DEFAULT 'reserved',
    expiry_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 17. ABC/XYZ ANALYSIS
-- ============================================

CREATE TABLE IF NOT EXISTS stock_abc_analysis (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    warehouse_id INTEGER REFERENCES warehouses(id),
    analysis_date DATE NOT NULL,
    abc_classification VARCHAR(1) CHECK (abc_classification IN ('A', 'B', 'C')) NOT NULL,
    xyz_classification VARCHAR(1) CHECK (xyz_classification IN ('X', 'Y', 'Z')) NOT NULL,
    consumption_value DECIMAL(10, 2) NOT NULL, -- Total consumption value
    consumption_qty DECIMAL(10, 2) NOT NULL, -- Total consumption quantity
    demand_variability DECIMAL(10, 4), -- Coefficient of variation
    last_movement_date DATE,
    days_since_last_movement INTEGER,
    slow_moving BOOLEAN DEFAULT false,
    non_moving BOOLEAN DEFAULT false,
    dead_stock BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, warehouse_id, analysis_date)
);

-- ============================================
-- 18. STOCK LEDGER & HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS stock_ledger (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id) NOT NULL,
    location_id INTEGER REFERENCES stock_locations(id) NOT NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'grn', 'issue', 'transfer', 'adjustment', 'return', etc.
    transaction_id INTEGER, -- ID of source transaction
    reference VARCHAR(255), -- Document reference
    in_qty DECIMAL(10, 2) DEFAULT 0,
    out_qty DECIMAL(10, 2) DEFAULT 0,
    balance_qty DECIMAL(10, 2) NOT NULL,
    in_value DECIMAL(10, 2) DEFAULT 0,
    out_value DECIMAL(10, 2) DEFAULT 0,
    balance_value DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2),
    lot_id INTEGER REFERENCES stock_production_lot(id),
    partner_id INTEGER REFERENCES partners(id),
    user_id INTEGER REFERENCES users(id),
    company_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 19. INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_warehouses_active ON warehouses(active);
CREATE INDEX IF NOT EXISTS idx_stock_locations_warehouse_id ON stock_locations(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_stock_locations_usage ON stock_locations(usage);
CREATE INDEX IF NOT EXISTS idx_stock_quant_product_location ON stock_quant(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_quant_lot ON stock_quant(lot_id);
CREATE INDEX IF NOT EXISTS idx_stock_move_product ON stock_move(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_move_state ON stock_move(state);
CREATE INDEX IF NOT EXISTS idx_stock_move_picking ON stock_move(picking_id);
CREATE INDEX IF NOT EXISTS idx_stock_picking_state ON stock_picking(state);
CREATE INDEX IF NOT EXISTS idx_stock_picking_partner ON stock_picking(partner_id);
CREATE INDEX IF NOT EXISTS idx_stock_grn_number ON stock_grn(grn_number);
CREATE INDEX IF NOT EXISTS idx_stock_grn_state ON stock_grn(state);
CREATE INDEX IF NOT EXISTS idx_stock_grn_partner ON stock_grn(partner_id);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_number ON stock_transfer(transfer_number);
CREATE INDEX IF NOT EXISTS idx_stock_transfer_state ON stock_transfer(state);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_number ON stock_adjustment(adjustment_number);
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_state ON stock_adjustment(state);
CREATE INDEX IF NOT EXISTS idx_stock_production_lot_name ON stock_production_lot(name);
CREATE INDEX IF NOT EXISTS idx_stock_production_lot_product ON stock_production_lot(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_lot_serial_name ON stock_lot_serial(name);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_product_location ON stock_ledger(product_id, location_id);
CREATE INDEX IF NOT EXISTS idx_stock_ledger_transaction_date ON stock_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_stock_reservation_product ON stock_reservation(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reservation_origin ON stock_reservation(reservation_origin_type, reservation_origin_id);
CREATE INDEX IF NOT EXISTS idx_stock_reorder_suggestion_product ON stock_reorder_suggestion(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_reorder_suggestion_state ON stock_reorder_suggestion(state);
CREATE INDEX IF NOT EXISTS idx_stock_cycle_count_state ON stock_cycle_count(state);
CREATE INDEX IF NOT EXISTS idx_products_tracking ON products(tracking);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(active);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- ============================================
-- 20. TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_warehouses_updated_at ON warehouses;
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_locations_updated_at ON stock_locations;
CREATE TRIGGER update_stock_locations_updated_at BEFORE UPDATE ON stock_locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_picking_updated_at ON stock_picking;
CREATE TRIGGER update_stock_picking_updated_at BEFORE UPDATE ON stock_picking
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_move_updated_at ON stock_move;
CREATE TRIGGER update_stock_move_updated_at BEFORE UPDATE ON stock_move
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_grn_updated_at ON stock_grn;
CREATE TRIGGER update_stock_grn_updated_at BEFORE UPDATE ON stock_grn
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_transfer_updated_at ON stock_transfer;
CREATE TRIGGER update_stock_transfer_updated_at BEFORE UPDATE ON stock_transfer
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_adjustment_updated_at ON stock_adjustment;
CREATE TRIGGER update_stock_adjustment_updated_at BEFORE UPDATE ON stock_adjustment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_issue_updated_at ON stock_issue;
CREATE TRIGGER update_stock_issue_updated_at BEFORE UPDATE ON stock_issue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_return_updated_at ON stock_return;
CREATE TRIGGER update_stock_return_updated_at BEFORE UPDATE ON stock_return
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_quality_inspection_updated_at ON stock_quality_inspection;
CREATE TRIGGER update_stock_quality_inspection_updated_at BEFORE UPDATE ON stock_quality_inspection
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_non_conformance_updated_at ON stock_non_conformance;
CREATE TRIGGER update_stock_non_conformance_updated_at BEFORE UPDATE ON stock_non_conformance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_reorder_suggestion_updated_at ON stock_reorder_suggestion;
CREATE TRIGGER update_stock_reorder_suggestion_updated_at BEFORE UPDATE ON stock_reorder_suggestion
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_forecast_updated_at ON stock_forecast;
CREATE TRIGGER update_stock_forecast_updated_at BEFORE UPDATE ON stock_forecast
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_reservation_updated_at ON stock_reservation;
CREATE TRIGGER update_stock_reservation_updated_at BEFORE UPDATE ON stock_reservation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_abc_analysis_updated_at ON stock_abc_analysis;
CREATE TRIGGER update_stock_abc_analysis_updated_at BEFORE UPDATE ON stock_abc_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_production_lot_updated_at ON stock_production_lot;
CREATE TRIGGER update_stock_production_lot_updated_at BEFORE UPDATE ON stock_production_lot
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_lot_serial_updated_at ON stock_lot_serial;
CREATE TRIGGER update_stock_lot_serial_updated_at BEFORE UPDATE ON stock_lot_serial
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_package_updated_at ON stock_package;
CREATE TRIGGER update_stock_package_updated_at BEFORE UPDATE ON stock_package
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_cycle_count_updated_at ON stock_cycle_count;
CREATE TRIGGER update_stock_cycle_count_updated_at BEFORE UPDATE ON stock_cycle_count
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- END OF INVENTORY MODULE MIGRATION
-- ============================================

