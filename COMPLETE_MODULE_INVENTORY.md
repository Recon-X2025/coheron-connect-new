# Complete Module Inventory - All Modules, Sub-Pages, and Functions

## 1. DASHBOARD MODULE
**Route:** `/dashboard`
- **Main Component:** `Dashboard.tsx`
- **Functions:**
  - Overview of all modules
  - Quick access to key metrics
  - Recent activity feed

---

## 2. CRM MODULE
**Base Route:** `/crm/*`

### Sub-Pages:
1. **CRM Dashboard** (`/crm/dashboard`)
   - Pipeline overview
   - Sales metrics
   - Activity feed
   - Quick actions

2. **Pipeline** (`/crm/pipeline`)
   - Kanban board view
   - Drag-and-drop opportunities
   - Stage management
   - Filters and search

3. **Leads** (`/crm/leads`)
   - Lead list view
   - Lead creation form
   - Lead scoring
   - Lead conversion
   - Lead assignment
   - Lead filtering/search

4. **Opportunities** (`/crm/opportunities`)
   - Opportunity list
   - Opportunity creation
   - Opportunity editing
   - Stage progression
   - Value tracking

5. **Customers** (`/crm/customers`)
   - Customer list
   - Customer details
   - Customer creation
   - Customer editing
   - Contact management

6. **Tasks & Calendar** (`/crm/tasks`)
   - Task list view
   - Kanban board for tasks
   - Calendar view (monthly)
   - Task creation
   - Task editing
   - Task deletion
   - Event creation
   - Event editing
   - Event deletion
   - Task filtering/search

7. **Automation Engine** (`/crm/automation`)
   - Workflow list
   - Workflow builder
   - Trigger configuration
   - Action configuration
   - Workflow activation/deactivation
   - Workflow deletion

---

## 3. SALES MODULE
**Base Route:** `/sales/*`

### Sub-Pages:
1. **Sales Dashboard** (`/sales/dashboard`)
   - Sales metrics
   - Revenue charts
   - Team performance
   - Recent orders

2. **Sales Orders** (`/sales/orders`)
   - Order list
   - Order creation
   - Order editing
   - Order confirmation
   - Bulk actions (placeholder)
   - Order filtering/search

3. **Quotations** (`/sales/quotations`)
   - Quotation list
   - Quotation creation
   - Quotation editing
   - Quotation conversion to order
   - Quotation approval

4. **Pricing Management** (`/sales/pricing`)
   - Price list view
   - Pricing rule creation
   - Pricing rule editing
   - Price list creation (placeholder)
   - Discount management

5. **Contracts Management** (`/sales/contracts`)
   - Contract list
   - Contract creation
   - Contract editing
   - Contract renewal
   - Contract expiration tracking

6. **Delivery Tracking** (`/sales/delivery`)
   - Delivery list
   - Delivery status tracking
   - Shipment tracking
   - Delivery confirmation

7. **Returns Management** (`/sales/returns`)
   - RMA list
   - Return request creation
   - Return approval
   - Refund processing
   - Restocking

8. **Sales Forecasting** (`/sales/forecasting`)
   - Forecast charts
   - Revenue projections
   - Target vs actual
   - Period-based forecasting

9. **Sales Team Performance** (`/sales/team`)
   - Team metrics
   - Individual performance
   - Target tracking
   - Commission calculations

---

## 4. INVENTORY MODULE
**Base Route:** `/inventory/*`

### Sub-Pages:
1. **Inventory Dashboard** (`/inventory/dashboard`)
   - Stock overview
   - Low stock alerts
   - Recent movements
   - Warehouse status

2. **Products** (`/inventory/products`)
   - Product list
   - Product creation
   - Product editing
   - Product variants
   - View stock levels
   - Product hierarchy

3. **Warehouses** (`/inventory/warehouses`)
   - Warehouse list
   - Warehouse creation
   - Warehouse editing
   - Warehouse configuration
   - Location management

4. **Stock Movements** (`/inventory/movements`)
   - **Tabs:**
     - Goods Receipt (GRN)
       - GRN list
       - GRN creation
       - GRN editing
       - GRN viewing
       - GRN deletion
     - Stock Issues
       - Issue list
       - Issue creation
       - Issue editing
       - Issue viewing
       - Issue approval
       - Issue deletion
       - Issue cancellation
     - Transfers
       - Transfer list
       - Transfer creation
       - Transfer editing
       - Transfer viewing
       - Transfer deletion
     - Returns
       - Return list
       - Return creation
       - Return editing
       - Return viewing
       - Return approval
       - Return deletion
       - Return cancellation
     - Adjustments
       - Adjustment list
       - Adjustment creation
       - Adjustment editing
       - Adjustment viewing
       - Adjustment deletion

5. **Batch & Serial Management** (`/inventory/batch-serial`)
   - **Tabs:**
     - Batches/Lots
       - Lot list
       - Lot creation
       - Lot editing
       - Lot deletion
     - Serial Numbers
       - Serial list
       - Serial creation
       - Serial editing
       - Serial deletion

6. **Warehouse Operations** (`/inventory/warehouse-ops`)
   - **Tabs:**
     - Putaway Rules
       - Rule list
       - Rule creation (placeholder)
     - Picking Lists
       - List view
       - List creation (placeholder)
     - Packing Lists
       - List view
       - List creation (placeholder)
     - Cycle Counting
       - Count list
       - Count creation (placeholder)

7. **Stock Reports** (`/inventory/reports`)
   - Stock summary
   - Stock ledger
   - Reorder suggestions
   - ABC/XYZ analysis (placeholder)
   - Expiry tracking (placeholder)
   - Costing reports (placeholder)

8. **Inventory Settings** (`/inventory/settings`)
   - Inventory configuration
   - Valuation methods
   - Stock rules
   - UOM management

---

## 5. ACCOUNTING MODULE
**Base Route:** `/accounting/*`

### Sub-Pages:
1. **Accounting Dashboard** (`/accounting/dashboard`)
   - Financial overview
   - Cash flow
   - P&L summary
   - Recent transactions

2. **Invoices** (`/accounting/invoices`)
   - Invoice list
   - Invoice creation
   - Invoice viewing
   - Invoice editing
   - Invoice deletion
   - PDF download
   - Invoice posting
   - Payment recording

3. **Chart of Accounts** (`/accounting/chart-of-accounts`)
   - Account list
   - Account creation
   - Account editing
   - Account deletion
   - Account hierarchy
   - Account types

4. **Journal Entries** (`/accounting/journal-entries`)
   - Entry list
   - Entry creation
   - Entry viewing
   - Entry editing
   - Entry deletion
   - Entry posting

5. **Accounts Payable** (`/accounting/accounts-payable`)
   - Bill list
   - Bill creation
   - Bill viewing
   - Bill editing
   - Bill posting
   - Payment processing

6. **Financial Reports** (`/accounting/reports`)
   - P&L statement
   - Balance sheet
   - Cash flow statement
   - Trial balance
   - General ledger
   - Aged receivables/payables

---

## 6. HR MODULE
**Base Route:** `/hr/*`

### Sub-Pages:
1. **HR Dashboard** (`/hr`)
   - Employee overview
   - Attendance summary
   - Leave balance
   - Recruitment pipeline

2. **HR Modules** (`/hr/modules`)
   - Module selection
   - Module configuration

3. **Employees** (`/hr/employees`)
   - Employee list
   - Employee creation
   - Employee editing
   - Employee profile
   - Document management

4. **Payroll** (`/hr/payroll`)
   - Payroll processing
   - Salary calculation
   - Payslip generation
   - Tax calculations
   - Deductions

5. **Recruitment** (`/hr/recruitment`)
   - Job postings
   - Applicant tracking
   - Interview scheduling
   - Offer management

6. **Policies** (`/hr/policies`)
   - Policy list
   - Policy creation
   - Policy editing
   - Policy acknowledgment

7. **Appraisals** (`/hr/appraisals`)
   - Appraisal cycles
   - Performance reviews
   - Goal setting
   - 360 feedback

8. **LMS (Learning Management)** (`/hr/lms`)
   - Course catalog
   - Course creation
   - Enrollment
   - Progress tracking
   - Certifications

9. **Attendance** (`/hr/attendance`)
   - Attendance records
   - Time tracking
   - Shift management
   - Overtime calculation

10. **Leave Management** (`/hr/leave`)
    - Leave requests
    - Leave balance
    - Leave approval
    - Leave calendar
    - Leave policies

11. **Onboarding** (`/hr/onboarding`)
    - Onboarding checklist
    - Document collection
    - Task assignment
    - Progress tracking

12. **Offboarding** (`/hr/offboarding`)
    - Offboarding checklist
    - Exit interview
    - Asset return
    - Access revocation

---

## 7. MANUFACTURING MODULE
**Base Route:** `/manufacturing/*`

### Sub-Pages:
1. **Manufacturing Dashboard** (`/manufacturing/dashboard`)
   - Production overview
   - Work order status
   - Quality metrics
   - Resource utilization

2. **Manufacturing Orders** (`/manufacturing/orders`)
   - Order list
   - Order creation
   - Order editing
   - Order confirmation
   - Production planning

3. **BOM Management** (`/manufacturing/bom`)
   - BOM list
   - BOM creation
   - BOM editing
   - BOM versioning
   - Component management

4. **Routing Management** (`/manufacturing/routing`)
   - Routing list
   - Routing creation
   - Routing editing
   - Operation sequencing
   - Work center assignment

5. **Work Orders** (`/manufacturing/work-orders`)
   - Work order list
   - Work order creation
   - Work order editing
   - Work order execution
   - Time tracking

6. **Quality Control** (`/manufacturing/quality`)
   - Quality checkpoints
   - Inspection records
   - Defect tracking
   - Quality reports

7. **Costing Analytics** (`/manufacturing/costing`)
   - Cost analysis
   - Standard vs actual
   - Variance reports
   - Cost breakdown

---

## 8. MARKETING MODULE
**Base Route:** `/marketing/*`

### Sub-Pages:
1. **Marketing Dashboard** (`/marketing/dashboard`)
   - Campaign performance
   - Lead generation metrics
   - ROI analysis
   - Channel performance

2. **Campaigns** (`/marketing/campaigns`)
   - Campaign list
   - Campaign creation
   - Campaign editing
   - Campaign activation
   - Campaign analytics
   - Campaign financials
   - Lead capture forms
   - Workflow builder

---

## 9. POS MODULE
**Base Route:** `/pos/*`

### Sub-Pages:
1. **POS Dashboard** (`/pos/dashboard`)
   - Sales summary
   - Session status
   - Terminal status
   - Recent transactions

2. **POS Interface** (`/pos`)
   - Product selection
   - Cart management
   - Payment processing
   - Receipt printing
   - Cash drawer management

3. **POS Sessions** (`/pos/sessions`)
   - Session list
   - Session opening
   - Session closing
   - Cash reconciliation
   - Session details

4. **POS Terminals** (`/pos/terminals`)
   - Terminal list
   - Terminal creation
   - Terminal editing
   - Terminal deletion
   - Terminal configuration

---

## 10. SUPPORT MODULE
**Base Route:** `/support/*`

### Sub-Pages:
1. **Support Dashboard** (`/support/dashboard`)
   - Ticket overview
   - SLA status
   - Agent performance
   - Resolution metrics

2. **Support Tickets** (`/support/tickets`)
   - Ticket list
   - Ticket creation
   - Ticket viewing
   - Ticket editing
   - Ticket assignment
   - Ticket resolution

3. **Agent Workbench** (`/support/workbench`)
   - Active tickets
   - Canned responses
   - Quick actions
   - Customer history

4. **Knowledge Base** (`/support/knowledge-base`)
   - Article list
   - Article creation (placeholder)
   - Article editing
   - Article viewing
   - Category management

5. **Support Reports** (`/support/reports`)
   - Ticket analytics
   - Response time reports
   - Resolution reports
   - Customer satisfaction

6. **Survey Management** (`/support/surveys`)
   - Survey list
   - Survey creation (placeholder)
   - Survey editing
   - Response analysis

7. **ITSM** (`/support/itsm`)
   - Incident management
   - Problem management
   - Change management
   - Service catalog

8. **Automation Builder** (`/support/automation`)
   - Automation rules
   - Workflow builder
   - Trigger configuration
   - Action configuration

9. **Customer Portal** (`/portal`)
   - Ticket submission
   - Ticket tracking
   - Knowledge base access
   - Account information

---

## 11. PROJECTS MODULE
**Base Route:** `/projects/*`

### Sub-Pages:
1. **Projects Dashboard** (`/projects/dashboard`)
   - Project overview
   - Active projects
   - Resource allocation
   - Timeline view

2. **Projects List** (`/projects`)
   - Project list
   - Project creation
   - Project editing
   - Project filtering

3. **Project Detail** (`/projects/:id`)
   - Project overview
   - Task management
   - Team members
   - Documents
   - Timeline
   - Budget tracking

4. **Sprint Board** (`/projects/sprint`)
   - Sprint planning
   - Task board
   - Burndown chart
   - Sprint retrospective

5. **Backlog View** (`/projects/backlog`)
   - Backlog items
   - Prioritization
   - Estimation
   - Sprint assignment

6. **Bug Tracker** (`/projects/bugs`)
   - Bug list
   - Bug creation
   - Bug assignment
   - Bug resolution
   - Bug tracking

7. **Project Analytics** (`/projects/analytics`)
   - Project metrics
   - Resource utilization
   - Budget vs actual
   - Timeline analysis

8. **Project Wiki** (`/projects/wiki`)
   - Documentation
   - Knowledge base
   - Version control

---

## 12. WEBSITE MODULE
**Base Route:** `/website/*`

### Sub-Pages:
1. **Website Dashboard** (`/website/dashboard`)
   - Site overview
   - Traffic metrics
   - Conversion rates
   - Recent updates

2. **Website** (`/website`)
   - Site configuration
   - General settings

3. **Pages** (`/website/pages`)
   - Page list
   - Page creation
   - Page editing
   - Page publishing

4. **Page Builder** (`/website/builder`)
   - Drag-and-drop builder
   - Component library
   - Template selection
   - Preview mode
   - Save functionality (placeholder)

5. **Product Catalog** (`/website/catalog`)
   - Product list
   - Product creation
   - Product editing
   - Product variants
   - Category management

6. **Site Settings** (`/website/settings`)
   - General settings
   - SEO configuration
   - Domain settings
   - Theme settings

7. **Promotions** (`/website/promotions`)
   - Promotion list
   - Promotion creation
   - Promotion editing
   - Discount rules
   - Coupon management

8. **Media Library** (`/website/media`)
   - Media list
   - Media upload
   - Media organization
   - Media editing

9. **Cart & Checkout** (`/website/checkout`)
   - Cart management
   - Checkout flow
   - Customer information
   - Shipping address
   - Payment method
   - Order confirmation

10. **Payment Gateways** (`/website/payment-gateways`)
    - Gateway list
    - Gateway configuration
    - Gateway creation
    - Gateway editing
    - Gateway deletion
    - API key management

11. **SEO Tools** (`/website/seo`)
    - SEO analysis
    - Meta tag management
    - Sitemap generation
    - Keyword tracking

12. **Website Analytics** (`/website/analytics`)
    - Traffic analysis
    - Conversion tracking
    - User behavior
    - Performance metrics

---

## 13. ADMIN MODULE
**Base Route:** `/admin/*`

### Sub-Pages:
1. **Admin Portal** (`/admin`)
   - System overview
   - User management
   - System configuration

2. **Roles Management** (`/admin/roles`)
   - Role list
   - Role creation
   - Role editing
   - Role deletion
   - Permission assignment

3. **Permissions Management** (`/admin/permissions`)
   - Permission list
   - Permission creation
   - Permission editing
   - Permission grouping

4. **User Role Assignments** (`/admin/users`)
   - User list
   - Role assignment
   - Permission assignment
   - User management

5. **Audit Logs Viewer** (`/admin/audit`)
   - Log list
   - Log filtering
   - Log search
   - Activity tracking

---

## 14. E-SIGNATURE MODULE
**Base Route:** `/esignature`

### Sub-Pages:
1. **E-Signature** (`/esignature`)
   - Document list
   - Document creation
   - Document sending
   - Signature tracking
   - Document signing
   - Template management

---

## 15. SETTINGS MODULE
**Route:** `/settings`
- **Main Component:** `Settings.tsx`
- **Functions:**
  - User preferences
  - System configuration
  - Integration settings
  - Notification preferences

---

## 16. SUBSCRIPTION MODULE
**Route:** `/subscription`
- **Main Component:** `Subscription.tsx`
- **Functions:**
  - Subscription plans
  - Billing information
  - Payment methods
  - Usage tracking

---

## SUMMARY STATISTICS

### Total Modules: 16
### Total Sub-Pages: ~120+
### Total Functions: ~500+

### Module Breakdown:
- **CRM:** 7 sub-pages
- **Sales:** 9 sub-pages
- **Inventory:** 8 sub-pages
- **Accounting:** 6 sub-pages
- **HR:** 12 sub-pages
- **Manufacturing:** 7 sub-pages
- **Marketing:** 2 sub-pages
- **POS:** 4 sub-pages
- **Support:** 9 sub-pages
- **Projects:** 8 sub-pages
- **Website:** 12 sub-pages
- **Admin:** 5 sub-pages
- **E-Signature:** 1 sub-page
- **Dashboard:** 1 page
- **Settings:** 1 page
- **Subscription:** 1 page

---

## NOTES

### Placeholder Functions (Need Implementation):
1. **Sales Orders:** Bulk Actions button
2. **Pricing Management:** Create Price List form
3. **Warehouse Operations:** All operation forms (Putaway, Picking, Packing, Cycle Count)
4. **Stock Reports:** ABC/XYZ analysis, Expiry tracking, Costing reports
5. **Page Builder:** Save functionality
6. **Knowledge Base:** New Article form
7. **Survey Management:** New Survey form

### Completed Functions:
- Invoice CRUD operations (View, Edit, Delete, Download PDF)
- Journal Entry CRUD operations
- Chart of Accounts CRUD operations
- Accounts Payable CRUD operations
- Stock Issue CRUD operations
- Stock Return CRUD operations
- GRN/Transfer/Adjustment CRUD operations
- Batch/Serial CRUD operations
- Payment Gateway CRUD operations
- POS Terminal CRUD operations
- CRM Task/Calendar CRUD operations
- CRM Automation Workflow CRUD operations
- Enhanced Cart & Checkout flow
- POS Sessions management

---

**Last Updated:** Based on current codebase structure and App.tsx routes
**Status:** Comprehensive inventory of all modules, sub-pages, and functions
