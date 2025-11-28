# Point of Sale (POS) Module - Technical Specification & Implementation Plan

## Executive Summary

This document outlines the complete technical specification and implementation plan for the Point of Sale (POS) module within the Coheron ERP system. The POS module is designed to support retail stores, FMCG outlets, manufacturing outlets, service centers, and D2C brands.

**Current Status**: Basic POS implementation exists with minimal features  
**Target**: Enterprise-grade POS with all features from POS_MODULE_FEATURES.md

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Components](#frontend-components)
5. [Integration Points](#integration-points)
6. [Implementation Phases](#implementation-phases)
7. [Technical Requirements](#technical-requirements)
8. [Testing Strategy](#testing-strategy)

---

## Architecture Overview

### Technology Stack

**Backend:**
- Node.js + Express.js
- PostgreSQL database
- RESTful API architecture
- WebSocket for real-time updates (optional)

**Frontend:**
- React + TypeScript
- Responsive design (desktop, tablet, mobile)
- Offline-first architecture (PWA)

**Hardware Integration:**
- Barcode scanner (USB/HID)
- Thermal printer (ESC/POS)
- Cash drawer (via printer)
- Card reader (via payment gateway)
- Weight scale (serial/USB)

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POS Terminal (Frontend)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Billing UI │  │  Payment UI  │  │  Reports UI  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP/WebSocket
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    POS API (Backend)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  POS Routes  │  │  Payment     │  │  Inventory   │      │
│  │              │  │  Gateway     │  │  Sync        │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                          │
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │  Inventory   │  │  Accounting  │
│  Database    │  │  Module      │  │  Module      │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Database Schema

### Current Schema (Basic)

**Existing Tables:**
- `pos_orders` - Basic POS order information
- `pos_order_lines` - Order line items

### Enhanced Schema (Required)

#### 1. POS Orders (Enhanced)

```sql
CREATE TABLE IF NOT EXISTS pos_orders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Store & Terminal
    store_id INTEGER REFERENCES stores(id),
    terminal_id INTEGER REFERENCES pos_terminals(id),
    session_id INTEGER REFERENCES pos_sessions(id),
    
    -- Customer
    partner_id INTEGER REFERENCES partners(id),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(20),
    customer_email VARCHAR(255),
    
    -- Order Details
    order_type VARCHAR(20) CHECK (order_type IN ('sale', 'return', 'exchange')) DEFAULT 'sale',
    state VARCHAR(20) CHECK (state IN ('draft', 'confirmed', 'paid', 'cancelled', 'void')) DEFAULT 'draft',
    is_parked BOOLEAN DEFAULT false,
    is_void BOOLEAN DEFAULT false,
    void_reason TEXT,
    void_user_id INTEGER REFERENCES users(id),
    void_date TIMESTAMP,
    
    -- Financial
    amount_untaxed DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_tax DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_discount DECIMAL(10, 2) DEFAULT 0,
    amount_paid DECIMAL(10, 2) NOT NULL DEFAULT 0,
    amount_return DECIMAL(10, 2) DEFAULT 0,
    
    -- Payment
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')) DEFAULT 'pending',
    payment_reference VARCHAR(255),
    
    -- Tax & Compliance
    tax_ids INTEGER[],
    gst_number VARCHAR(50),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    is_e_invoice BOOLEAN DEFAULT false,
    e_invoice_id VARCHAR(255),
    
    -- Staff
    user_id INTEGER REFERENCES users(id) NOT NULL,
    cashier_id INTEGER REFERENCES users(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    paid_at TIMESTAMP
);

CREATE INDEX idx_pos_orders_store ON pos_orders(store_id);
CREATE INDEX idx_pos_orders_session ON pos_orders(session_id);
CREATE INDEX idx_pos_orders_date ON pos_orders(created_at);
CREATE INDEX idx_pos_orders_state ON pos_orders(state);
```

#### 2. POS Order Lines (Enhanced)

```sql
CREATE TABLE IF NOT EXISTS pos_order_lines (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Product
    product_id INTEGER REFERENCES products(id) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    product_code VARCHAR(100),
    barcode VARCHAR(100),
    
    -- Variants
    variant_id INTEGER,
    variant_name VARCHAR(255),
    
    -- Quantity & Pricing
    qty DECIMAL(10, 3) NOT NULL DEFAULT 1,
    price_unit DECIMAL(10, 2) NOT NULL,
    price_subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')) DEFAULT 'percentage',
    price_total DECIMAL(10, 2) NOT NULL,
    
    -- Tax
    tax_id INTEGER REFERENCES account_tax(id),
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    
    -- Inventory
    lot_id INTEGER,
    expiry_date DATE,
    location_id INTEGER REFERENCES stock_locations(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_order_lines_order ON pos_order_lines(order_id);
CREATE INDEX idx_pos_order_lines_product ON pos_order_lines(product_id);
```

#### 3. POS Sessions (New)

```sql
CREATE TABLE IF NOT EXISTS pos_sessions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    session_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Store & Terminal
    store_id INTEGER REFERENCES stores(id) NOT NULL,
    terminal_id INTEGER REFERENCES pos_terminals(id) NOT NULL,
    
    -- User
    user_id INTEGER REFERENCES users(id) NOT NULL,
    
    -- Cash Management
    opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(10, 2),
    expected_balance DECIMAL(10, 2),
    difference DECIMAL(10, 2),
    
    -- Counts
    total_orders INTEGER DEFAULT 0,
    total_sales DECIMAL(10, 2) DEFAULT 0,
    total_cash DECIMAL(10, 2) DEFAULT 0,
    total_card DECIMAL(10, 2) DEFAULT 0,
    total_upi DECIMAL(10, 2) DEFAULT 0,
    total_other DECIMAL(10, 2) DEFAULT 0,
    
    -- State
    state VARCHAR(20) CHECK (state IN ('opening', 'opened', 'closing', 'closed')) DEFAULT 'opening',
    
    -- Timestamps
    start_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    stop_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pos_sessions_store ON pos_sessions(store_id);
CREATE INDEX idx_pos_sessions_terminal ON pos_sessions(terminal_id);
CREATE INDEX idx_pos_sessions_state ON pos_sessions(state);
```

#### 4. POS Terminals (New)

```sql
CREATE TABLE IF NOT EXISTS pos_terminals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Store
    store_id INTEGER REFERENCES stores(id) NOT NULL,
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    printer_id INTEGER,
    cash_drawer_enabled BOOLEAN DEFAULT true,
    barcode_scanner_enabled BOOLEAN DEFAULT true,
    
    -- Hardware
    hardware_config JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. POS Payments (New)

```sql
CREATE TABLE IF NOT EXISTS pos_payments (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES pos_orders(id) ON DELETE CASCADE NOT NULL,
    
    -- Payment Details
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    
    -- Payment Gateway
    gateway_transaction_id VARCHAR(255),
    gateway_response JSONB,
    payment_status VARCHAR(20) CHECK (payment_status IN ('pending', 'processing', 'success', 'failed', 'refunded')) DEFAULT 'pending',
    
    -- Card Details (tokenized)
    card_last4 VARCHAR(4),
    card_type VARCHAR(20),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX idx_pos_payments_order ON pos_payments(order_id);
CREATE INDEX idx_pos_payments_status ON pos_payments(payment_status);
```

#### 6. POS Returns (New)

```sql
CREATE TABLE IF NOT EXISTS pos_returns (
    id SERIAL PRIMARY KEY,
    original_order_id INTEGER REFERENCES pos_orders(id) NOT NULL,
    return_order_id INTEGER REFERENCES pos_orders(id),
    
    -- Return Details
    return_type VARCHAR(20) CHECK (return_type IN ('full', 'partial', 'exchange')) NOT NULL,
    return_reason TEXT,
    refund_method VARCHAR(20) CHECK (refund_method IN ('cash', 'card', 'store_credit', 'original_method')) NOT NULL,
    
    -- Financial
    amount_returned DECIMAL(10, 2) NOT NULL,
    amount_refunded DECIMAL(10, 2) DEFAULT 0,
    amount_store_credit DECIMAL(10, 2) DEFAULT 0,
    
    -- Approval
    requires_approval BOOLEAN DEFAULT false,
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);
```

#### 7. POS Promotions (New)

```sql
CREATE TABLE IF NOT EXISTS pos_promotions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    
    -- Type
    promotion_type VARCHAR(20) CHECK (promotion_type IN ('discount', 'bogo', 'bundle', 'coupon')) NOT NULL,
    
    -- Rules
    min_amount DECIMAL(10, 2),
    applicable_products INTEGER[],
    applicable_categories INTEGER[],
    
    -- Discount
    discount_type VARCHAR(20) CHECK (discount_type IN ('percentage', 'fixed')) NOT NULL,
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount DECIMAL(10, 2),
    
    -- Validity
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Usage
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    per_customer_limit INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 8. Stores (New)

```sql
CREATE TABLE IF NOT EXISTS stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    pincode VARCHAR(10),
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Configuration
    is_active BOOLEAN DEFAULT true,
    warehouse_id INTEGER REFERENCES stock_warehouses(id),
    
    -- Tax
    gst_number VARCHAR(50),
    tax_id INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Current Endpoints

**Existing:**
- `GET /api/pos` - Get all POS orders
- `POST /api/pos` - Create POS order

### Enhanced Endpoints (Required)

#### Orders

```
GET    /api/pos/orders                    # List orders with filters
GET    /api/pos/orders/:id                # Get order details
POST   /api/pos/orders                    # Create new order
PUT    /api/pos/orders/:id                # Update order
DELETE /api/pos/orders/:id                # Cancel/void order
POST   /api/pos/orders/:id/confirm         # Confirm order
POST   /api/pos/orders/:id/park           # Park order
GET    /api/pos/orders/parked             # Get parked orders
POST   /api/pos/orders/:id/reprint        # Reprint receipt
POST   /api/pos/orders/:id/void           # Void order (with approval)
```

#### Payments

```
POST   /api/pos/payments                  # Process payment
POST   /api/pos/payments/:id/refund       # Process refund
GET    /api/pos/payments/:id              # Get payment details
POST   /api/pos/payments/split            # Split payment
```

#### Returns & Exchanges

```
POST   /api/pos/returns                   # Create return
GET    /api/pos/returns/:id               # Get return details
POST   /api/pos/returns/:id/approve       # Approve return
POST   /api/pos/exchanges                 # Create exchange
```

#### Sessions

```
GET    /api/pos/sessions                  # List sessions
GET    /api/pos/sessions/current         # Get current session
POST   /api/pos/sessions                  # Open new session
POST   /api/pos/sessions/:id/close        # Close session
POST   /api/pos/sessions/:id/cash-in      # Cash in
POST   /api/pos/sessions/:id/cash-out     # Cash out
GET    /api/pos/sessions/:id/report       # Session report
```

#### Products & Inventory

```
GET    /api/pos/products                  # Get products for POS
GET    /api/pos/products/:id/stock        # Check stock availability
GET    /api/pos/products/search           # Search products (barcode, name, code)
POST   /api/pos/inventory/sync            # Sync inventory
```

#### Customers

```
GET    /api/pos/customers                 # List customers
GET    /api/pos/customers/:id             # Get customer details
POST   /api/pos/customers                 # Create customer
GET    /api/pos/customers/:id/history     # Purchase history
GET    /api/pos/customers/:id/loyalty     # Loyalty points
```

#### Promotions

```
GET    /api/pos/promotions                # List active promotions
GET    /api/pos/promotions/:code          # Get promotion by code
POST   /api/pos/promotions/apply          # Apply promotion to cart
```

#### Reports

```
GET    /api/pos/reports/sales             # Sales report
GET    /api/pos/reports/products          # Product performance
GET    /api/pos/reports/staff             # Staff performance
GET    /api/pos/reports/tax               # Tax report
GET    /api/pos/reports/daily             # Daily sales summary
```

---

## Frontend Components

### Current Components

**Existing:**
- `POSInterface.tsx` - Main POS interface
- `ProductGrid.tsx` - Product display
- `Cart.tsx` - Shopping cart
- `PaymentDialog.tsx` - Payment processing

### Enhanced Components (Required)

#### Core Components

```
src/modules/pos/
├── POSInterface.tsx                    # Main POS interface (enhanced)
├── components/
│   ├── ProductGrid.tsx                # Product grid (enhanced)
│   ├── ProductSearch.tsx              # Advanced search with barcode
│   ├── Cart.tsx                       # Shopping cart (enhanced)
│   ├── PaymentDialog.tsx              # Payment processing (enhanced)
│   ├── CustomerSelector.tsx           # Customer selection
│   ├── PromotionInput.tsx             # Promotion code input
│   ├── ReceiptPreview.tsx             # Receipt preview
│   ├── SessionManager.tsx             # Session opening/closing
│   ├── CashDrawer.tsx                 # Cash drawer controls
│   ├── ReturnsDialog.tsx              # Returns processing
│   ├── ExchangeDialog.tsx             # Exchange processing
│   └── Reports/
│       ├── SalesReport.tsx
│       ├── ProductReport.tsx
│       ├── StaffReport.tsx
│       └── TaxReport.tsx
├── hooks/
│   ├── usePOSSession.ts               # Session management hook
│   ├── useBarcodeScanner.ts           # Barcode scanner hook
│   ├── useOfflineSync.ts              # Offline sync hook
│   └── usePOSInventory.ts              # Inventory sync hook
└── services/
    ├── posService.ts                   # POS API service
    ├── paymentService.ts               # Payment processing
    ├── printerService.ts               # Receipt printing
    └── hardwareService.ts              # Hardware integration
```

---

## Integration Points

### 1. Inventory Module

**Integration:**
- Real-time stock sync
- Auto-decrement on sale
- Low-stock alerts
- Batch/lot tracking
- Expiry management

**API Calls:**
```
GET  /api/inventory/products/:id/stock
POST /api/inventory/movements
GET  /api/inventory/alerts
```

### 2. Sales Module

**Integration:**
- Convert POS orders to sales orders
- Sync customer data
- Order history

**API Calls:**
```
POST /api/sales/orders (from POS order)
GET  /api/sales/orders/:id
```

### 3. Accounting Module

**Integration:**
- Auto-create invoices
- Payment reconciliation
- Tax calculations
- GL posting

**API Calls:**
```
POST /api/accounting/invoices
POST /api/accounting/payments
GET  /api/accounting/taxes
```

### 4. CRM Module

**Integration:**
- Customer profiles
- Purchase history
- Loyalty points
- Customer engagement

**API Calls:**
```
GET  /api/crm/customers/:id
POST /api/crm/customers/:id/activities
GET  /api/crm/loyalty/:id
```

### 5. Payment Gateways

**Integration:**
- UPI (Razorpay, Paytm, PhonePe)
- Card payments (Razorpay, Stripe)
- Wallets
- BNPL (Simpl, LazyPay)

**API Calls:**
```
POST /api/payments/process
POST /api/payments/refund
GET  /api/payments/status
```

---

## Implementation Phases

### Phase 1: Core Enhancements (Weeks 1-2)

**Database:**
- ✅ Create enhanced schema (sessions, terminals, payments, returns)
- ✅ Migrate existing data
- ✅ Add indexes for performance

**Backend:**
- ✅ Enhanced POS order endpoints
- ✅ Session management endpoints
- ✅ Payment processing endpoints
- ✅ Basic return/exchange endpoints

**Frontend:**
- ✅ Enhanced POS interface
- ✅ Session management UI
- ✅ Improved payment dialog
- ✅ Basic return dialog

**Deliverables:**
- Enhanced POS with sessions
- Payment processing
- Basic returns

---

### Phase 2: Inventory & Product Management (Weeks 3-4)

**Backend:**
- ✅ Real-time inventory sync
- ✅ Product search (barcode, name, code)
- ✅ Stock availability checks
- ✅ Batch/lot tracking

**Frontend:**
- ✅ Barcode scanner integration
- ✅ Product search enhancements
- ✅ Stock indicators
- ✅ Batch selection

**Deliverables:**
- Real-time inventory sync
- Barcode scanning
- Stock management

---

### Phase 3: Customer & Loyalty (Weeks 5-6)

**Database:**
- ✅ Customer loyalty tables
- ✅ Points tracking

**Backend:**
- ✅ Customer management endpoints
- ✅ Loyalty program endpoints
- ✅ Purchase history

**Frontend:**
- ✅ Customer selector
- ✅ Loyalty points display
- ✅ Customer history

**Deliverables:**
- Customer management
- Loyalty program
- Purchase history

---

### Phase 4: Promotions & Discounts (Week 7)

**Backend:**
- ✅ Promotion management endpoints
- ✅ Discount calculation engine
- ✅ Coupon validation

**Frontend:**
- ✅ Promotion input
- ✅ Discount display
- ✅ Promotion management

**Deliverables:**
- Promotions & coupons
- Discount engine
- BOGO offers

---

### Phase 5: Reporting & Analytics (Week 8)

**Backend:**
- ✅ Sales reports
- ✅ Product reports
- ✅ Staff reports
- ✅ Tax reports

**Frontend:**
- ✅ Report dashboards
- ✅ Export functionality
- ✅ Charts & graphs

**Deliverables:**
- Comprehensive reporting
- Analytics dashboard
- Export capabilities

---

### Phase 6: Advanced Features (Weeks 9-10)

**Backend:**
- ✅ Offline mode support
- ✅ Auto-sync mechanism
- ✅ Multi-store support
- ✅ Franchise management

**Frontend:**
- ✅ Offline indicator
- ✅ Sync status
- ✅ Multi-store selector

**Deliverables:**
- Offline mode
- Multi-store support
- Auto-sync

---

### Phase 7: Hardware Integration (Weeks 11-12)

**Backend:**
- ✅ Printer integration (ESC/POS)
- ✅ Cash drawer control
- ✅ Barcode scanner (HID)
- ✅ Card reader integration

**Frontend:**
- ✅ Hardware settings
- ✅ Printer configuration
- ✅ Hardware test tools

**Deliverables:**
- Hardware integration
- Receipt printing
- Cash drawer control

---

### Phase 8: Compliance & Tax (Week 13)

**Backend:**
- ✅ GST calculation
- ✅ HSN/SAC mapping
- ✅ e-Invoice generation
- ✅ Tax reports

**Frontend:**
- ✅ GST-compliant invoices
- ✅ Tax breakdown
- ✅ e-Invoice display

**Deliverables:**
- GST compliance
- e-Invoicing
- Tax reporting

---

### Phase 9: Testing & Optimization (Weeks 14-15)

**Testing:**
- ✅ Unit tests
- ✅ Integration tests
- ✅ E2E tests
- ✅ Performance testing

**Optimization:**
- ✅ Database query optimization
- ✅ Frontend performance
- ✅ Caching strategies

**Deliverables:**
- Test coverage >80%
- Performance benchmarks
- Documentation

---

### Phase 10: Deployment & Training (Week 16)

**Deployment:**
- ✅ Production deployment
- ✅ Monitoring setup
- ✅ Backup procedures

**Training:**
- ✅ User documentation
- ✅ Training materials
- ✅ Video tutorials

**Deliverables:**
- Production deployment
- Documentation
- Training materials

---

## Technical Requirements

### Backend Requirements

**Dependencies:**
```json
{
  "express": "^4.18.0",
  "pg": "^8.11.0",
  "jsonwebtoken": "^9.0.0",
  "razorpay": "^2.9.0",
  "escpos": "^3.0.0",
  "node-hid": "^2.1.0",
  "ws": "^8.14.0"
}
```

**Environment Variables:**
```
POS_PRINTER_ENABLED=true
POS_BARCODE_SCANNER_ENABLED=true
POS_OFFLINE_MODE=true
RAZORPAY_KEY_ID=xxx
RAZORPAY_KEY_SECRET=xxx
```

### Frontend Requirements

**Dependencies:**
```json
{
  "react": "^18.2.0",
  "typescript": "^5.0.0",
  "react-router-dom": "^6.15.0",
  "axios": "^1.5.0",
  "react-query": "^3.39.0",
  "workbox": "^7.0.0"
}
```

**Browser Support:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Hardware Requirements

**Minimum:**
- CPU: Dual-core 2.0GHz
- RAM: 4GB
- Storage: 10GB
- Network: Broadband connection

**Recommended:**
- CPU: Quad-core 2.5GHz+
- RAM: 8GB+
- Storage: 50GB SSD
- Network: Fiber connection

**Peripheral Devices:**
- Barcode scanner (USB/HID)
- Thermal printer (80mm, ESC/POS)
- Cash drawer (via printer)
- Card reader (via payment gateway)

---

## Testing Strategy

### Unit Tests

**Backend:**
- Order creation/update
- Payment processing
- Discount calculations
- Tax calculations
- Session management

**Frontend:**
- Component rendering
- User interactions
- Form validations
- State management

### Integration Tests

- POS → Inventory sync
- POS → Accounting sync
- Payment gateway integration
- Hardware integration

### E2E Tests

- Complete checkout flow
- Return/exchange flow
- Session opening/closing
- Offline mode → sync

### Performance Tests

- Load testing (100+ concurrent users)
- Database query optimization
- Frontend rendering performance
- Offline sync performance

---

## Security Considerations

### Data Security

- Payment data tokenization
- PCI-DSS compliance
- Encrypted database connections
- Secure API endpoints (HTTPS)

### Access Control

- Role-based access (cashier, supervisor, manager)
- Approval workflows (voids, refunds, discounts)
- Audit trails
- Session timeouts

### Compliance

- GST compliance
- Data privacy (GDPR, local regulations)
- Financial regulations
- Tax reporting

---

## Monitoring & Maintenance

### Monitoring

- Real-time sales dashboard
- Error tracking (Sentry)
- Performance monitoring
- Hardware status

### Maintenance

- Regular database backups
- Log rotation
- Cache management
- Update procedures

---

## Success Metrics

### Performance

- Order processing time: <2 seconds
- Payment processing: <5 seconds
- Inventory sync: Real-time (<1 second)
- Offline sync: <30 seconds

### Reliability

- Uptime: 99.9%
- Error rate: <0.1%
- Data accuracy: 100%

### User Experience

- Checkout completion: <30 seconds
- User satisfaction: >4.5/5
- Training time: <2 hours

---

## Documentation Requirements

### Technical Documentation

- API documentation (OpenAPI/Swagger)
- Database schema documentation
- Integration guides
- Deployment guides

### User Documentation

- User manual
- Training videos
- FAQ
- Troubleshooting guide

---

**Version**: 1.0  
**Last Updated**: December 2024  
**Status**: Planning Phase

