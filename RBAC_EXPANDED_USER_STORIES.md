# 📘 ERP System – Expanded RBAC User Stories (Granular Role Hierarchies)

## Table of Contents
1. [Global RBAC Foundation](#1-global-rbac-foundation)
2. [Module-Level RBAC with Granular Roles](#2-module-level-rbac-with-granular-roles)
3. [Cross-Cutting RBAC](#3-cross-cutting-rbac)
4. [Advanced RBAC Features](#4-advanced-rbac-features)

---

# 1. Global RBAC Foundation (Applies to ALL Modules)

## 1.1 Role Management Hierarchy

### System-Level Roles

**As a System Admin, I want to:**
- Create roles with hierarchical inheritance (parent → child roles)
- Define role templates for rapid deployment
- Clone roles with permission inheritance
- Archive roles without deleting historical data
- Set role expiration dates for temporary access
- Assign multiple roles to users with conflict resolution rules
- Define role dependencies (e.g., "Sales Manager" requires "Sales User")
- View role usage analytics (how many users, last used, etc.)

### Permission Granularity Levels

**As a System Admin, I want to define permissions at:**
- **Module Level**: Full module access (CRM, Sales, Inventory, etc.)
- **Feature Level**: Specific features within modules (e.g., "Lead Conversion" within CRM)
- **Action Level**: CRUD operations (Create, Read, Update, Delete, Approve, Export)
- **Field Level**: Individual field visibility/editability
- **Record Level**: Own records, team records, department records, all records
- **Workflow Level**: Stage transitions, approvals, escalations
- **Data Level**: View, export, modify, delete data based on sensitivity

---

# 2. Module-Level RBAC with Granular Roles

## 2.1 CRM Module (Leads, Contacts, Opportunities)

### CRM Role Hierarchy (5 Levels)

#### Level 1: CRM Viewer (Read-Only)
**As a CRM Viewer, I want to:**
- View leads assigned to me only
- View my own contacts
- View opportunities I'm assigned to
- View basic account information
- Export my own data only
- **Cannot**: Create, edit, delete, or convert leads

#### Level 2: CRM User (Basic Operations)
**As a CRM User, I want to:**
- All Level 1 permissions
- Create new leads for myself
- Edit leads assigned to me
- Create and edit my own contacts
- View team leads (if part of a team)
- Convert my own leads to opportunities
- Add notes to assigned records
- **Cannot**: Delete leads, access all company data, approve conversions

#### Level 3: CRM Team Lead (Team Management)
**As a CRM Team Lead, I want to:**
- All Level 2 permissions
- View all leads for my team members
- Reassign leads within my team
- Edit team members' leads
- View team performance dashboards
- Approve lead conversions for team members
- Export team data
- Manage team-specific fields and customizations
- **Cannot**: Access other teams' data, delete company-wide records

#### Level 4: CRM Manager (Department-Wide)
**As a CRM Manager, I want to:**
- All Level 3 permissions
- View all leads across all teams in my department
- Reassign leads across teams
- Configure lead stages and pipelines
- Set up automation rules for my department
- Approve bulk operations
- Access department-wide analytics
- Manage department-level custom fields
- Export department data
- **Cannot**: Access other departments, modify system-wide settings

#### Level 5: CRM Administrator (Full Access)
**As a CRM Administrator, I want to:**
- All Level 4 permissions
- Full access to all CRM data across organization
- Configure system-wide CRM settings
- Manage all pipelines and stages
- Create/modify/delete custom fields
- Set up global automation rules
- Access all analytics and reports
- Export all CRM data
- Manage integrations and API access

### CRM Specialized Roles

#### Lead Qualification Specialist
**As a Lead Qualification Specialist, I want to:**
- View unqualified leads from all sources
- Qualify/disqualify leads
- Update lead scores
- Add qualification notes
- Reassign qualified leads to sales team
- **Cannot**: Create opportunities, access customer data

#### Lead Generation Specialist
**As a Lead Generation Specialist, I want to:**
- Create leads from external sources
- Import bulk leads
- Enrich lead data
- Assign leads to teams
- View lead source analytics
- **Cannot**: Convert leads, access opportunity data

#### Opportunity Manager
**As an Opportunity Manager, I want to:**
- View all opportunities (read-only for non-assigned)
- Edit opportunities assigned to me
- Create opportunities from leads
- Update opportunity stages
- Access opportunity forecasting
- **Cannot**: Delete opportunities, modify closed opportunities

#### Customer Success Manager
**As a Customer Success Manager, I want to:**
- View all customer accounts
- Edit customer information
- Access customer communication history
- View customer health scores
- Create renewal opportunities
- **Cannot**: Delete accounts, modify financial data

---

## 2.2 Sales Module (Quotes, Orders, Contracts)

### Sales Role Hierarchy (6 Levels)

#### Level 1: Sales Viewer
**As a Sales Viewer, I want to:**
- View quotations assigned to me
- View my own sales orders
- View order status and tracking
- Export my own order data
- **Cannot**: Create, edit, approve, or cancel orders

#### Level 2: Sales Representative (Junior)
**As a Sales Representative (Junior), I want to:**
- All Level 1 permissions
- Create quotations for assigned customers
- Edit my own quotations (before approval)
- Create sales orders from approved quotations
- View standard price lists
- Add notes to my orders
- **Cannot**: Approve quotations, modify pricing, cancel orders, access contracts

#### Level 3: Sales Representative (Senior)
**As a Sales Representative (Senior), I want to:**
- All Level 2 permissions
- Apply discounts up to 10%
- Modify quotations after creation (with manager approval required)
- Create return orders (with approval)
- Access customer credit limits
- View team quotations
- **Cannot**: Approve orders, access contract management, modify price lists

#### Level 4: Sales Team Lead
**As a Sales Team Lead, I want to:**
- All Level 3 permissions
- Approve quotations up to $50,000
- View all team quotations and orders
- Reassign orders within team
- Apply discounts up to 20%
- Access team performance dashboards
- Export team sales data
- Manage team-specific price lists
- **Cannot**: Approve high-value orders, access other teams, modify contracts

#### Level 5: Sales Manager
**As a Sales Manager, I want to:**
- All Level 4 permissions
- Approve quotations up to $500,000
- Approve all team orders
- Cancel orders (with reason required)
- Access all department quotations and orders
- Configure sales workflows
- Set up team-specific discounts and promotions
- Access department-wide analytics
- Manage contracts for my department
- Export department data
- **Cannot**: Approve enterprise orders, modify system price lists, access other departments

#### Level 6: Sales Director/VP
**As a Sales Director, I want to:**
- All Level 5 permissions
- Approve all quotations and orders
- Access all sales data across organization
- Configure system-wide sales settings
- Manage all price lists and discount rules
- Full contract management access
- Access executive dashboards
- Export all sales data
- Manage sales integrations

### Sales Specialized Roles

#### Pricing Administrator
**As a Pricing Administrator, I want to:**
- Create and modify price lists
- Set up discount rules
- Configure pricing tiers
- Manage promotional pricing
- View pricing analytics
- **Cannot**: Create orders, approve quotations, access customer financial data

#### Contract Administrator
**As a Contract Administrator, I want to:**
- Create and edit contracts
- Manage contract renewals
- Set up contract templates
- Track contract compliance
- View contract analytics
- **Cannot**: Approve contracts, modify pricing, access order details

#### Sales Operations Analyst
**As a Sales Operations Analyst, I want to:**
- View all sales data (read-only)
- Export sales reports
- Access sales analytics and forecasting
- Create custom reports
- View pipeline analytics
- **Cannot**: Create/edit orders, approve anything, modify settings

#### Returns & Refunds Specialist
**As a Returns & Refunds Specialist, I want to:**
- Create return orders
- Process refunds
- Manage RMA (Return Merchandise Authorization)
- Update return status
- Access return analytics
- **Cannot**: Create sales orders, approve returns above threshold, modify pricing

---

## 2.3 Inventory Module (Stock, Warehouse, Transfers)

### Inventory Role Hierarchy (7 Levels)

#### Level 1: Inventory Viewer
**As an Inventory Viewer, I want to:**
- View stock levels for assigned warehouses
- View item master data (read-only)
- View stock movement history
- Export stock reports for my warehouse
- **Cannot**: Create transactions, modify stock, access other warehouses

#### Level 2: Warehouse Operator (Basic)
**As a Warehouse Operator (Basic), I want to:**
- All Level 1 permissions
- Create goods receipts (with approval required)
- Create goods issues (with approval required)
- Update stock quantities via cycle count (with approval)
- Scan barcodes for stock lookup
- **Cannot**: Approve transactions, transfer between warehouses, modify item master

#### Level 3: Warehouse Operator (Advanced)
**As a Warehouse Operator (Advanced), I want to:**
- All Level 2 permissions
- Create goods receipts (self-approve up to $1,000)
- Create goods issues (self-approve up to $1,000)
- Create internal transfers within warehouse
- Perform cycle counts (self-approve)
- Access picking and putaway operations
- **Cannot**: Transfer between warehouses, modify item master, approve high-value transactions

#### Level 4: Storekeeper
**As a Storekeeper, I want to:**
- All Level 3 permissions
- Approve goods receipts up to $10,000
- Approve goods issues up to $10,000
- Create inter-warehouse transfers (with approval)
- Modify item master for assigned categories
- Manage bin locations
- Access warehouse-specific reports
- **Cannot**: Approve high-value transactions, modify system settings, access other warehouses

#### Level 5: Warehouse Supervisor
**As a Warehouse Supervisor, I want to:**
- All Level 4 permissions
- Approve all transactions for my warehouse
- Create and approve inter-warehouse transfers
- Manage warehouse configuration
- Access warehouse performance metrics
- Export warehouse data
- Manage warehouse users
- **Cannot**: Modify item master globally, access other warehouses' data, modify system settings

#### Level 6: Inventory Manager
**As an Inventory Manager, I want to:**
- All Level 5 permissions
- Access all warehouses in my region/department
- Approve high-value transactions across warehouses
- Create and modify item master
- Configure reorder points and rules
- Set up warehouse workflows
- Access multi-warehouse analytics
- Export regional data
- **Cannot**: Modify system-wide settings, access other regions, modify costing methods

#### Level 7: Inventory Director
**As an Inventory Director, I want to:**
- All Level 6 permissions
- Full access to all warehouses globally
- Configure system-wide inventory settings
- Modify costing methods
- Manage all item master data
- Access global inventory analytics
- Export all inventory data
- Manage inventory integrations

### Inventory Specialized Roles

#### Procurement Specialist
**As a Procurement Specialist, I want to:**
- View stock levels across all warehouses
- Create purchase requisitions
- View reorder suggestions
- Access procurement reports
- Manage vendor information (read-only)
- **Cannot**: Approve purchases, modify stock, access warehouse operations

#### Quality Control Inspector
**As a Quality Control Inspector, I want to:**
- View incoming goods receipts
- Create quality inspection records
- Approve/reject goods based on quality
- Access quality reports
- **Cannot**: Create receipts, modify stock, access other warehouse functions

#### Cycle Count Coordinator
**As a Cycle Count Coordinator, I want to:**
- Create cycle count schedules
- Assign cycle counts to operators
- Review and approve cycle count results
- Access cycle count accuracy reports
- **Cannot**: Perform cycle counts, modify stock directly, access other functions

#### Stock Auditor
**As a Stock Auditor, I want to:**
- View all stock data (read-only)
- Access audit trail reports
- Export stock movement logs
- Compare physical vs system stock
- Generate discrepancy reports
- **Cannot**: Modify any data, approve transactions, access operational functions

---

## 2.4 Accounting Module (Invoices, Ledger, Payments)

### Accounting Role Hierarchy (8 Levels)

#### Level 1: Accounting Viewer
**As an Accounting Viewer, I want to:**
- View invoices assigned to me
- View my own payment records
- View basic ledger entries (read-only)
- Export my own transaction data
- **Cannot**: Create, edit, approve, or delete any accounting records

#### Level 2: Accounts Payable Clerk (Junior)
**As an Accounts Payable Clerk (Junior), I want to:**
- All Level 1 permissions
- Create vendor bills
- Enter basic invoice data
- View vendor information
- **Cannot**: Approve payments, modify posted entries, access bank reconciliation

#### Level 3: Accounts Payable Clerk (Senior)
**As an Accounts Payable Clerk (Senior), I want to:**
- All Level 2 permissions
- Edit vendor bills (before posting)
- Create payment entries (with approval required)
- Match bills with purchase orders
- Access AP aging reports
- **Cannot**: Approve payments, post entries, access AR or GL

#### Level 4: Accounts Receivable Clerk (Junior)
**As an Accounts Receivable Clerk (Junior), I want to:**
- All Level 1 permissions
- Create customer invoices
- Enter basic invoice data
- View customer information
- **Cannot**: Approve receipts, modify posted entries, access bank reconciliation

#### Level 5: Accounts Receivable Clerk (Senior)
**As an Accounts Receivable Clerk (Senior), I want to:**
- All Level 4 permissions
- Edit customer invoices (before posting)
- Record customer payments (with approval required)
- Match payments with invoices
- Access AR aging reports
- **Cannot**: Approve receipts, post entries, access AP or GL

#### Level 6: Accounting Supervisor (AP/AR)
**As an Accounting Supervisor (AP/AR), I want to:**
- All Level 3 and Level 5 permissions
- Approve payments up to $10,000
- Approve receipts up to $10,000
- Post invoices and bills
- Reconcile bank statements (basic)
- Access AP/AR dashboards
- Export AP/AR data
- **Cannot**: Approve high-value payments, access GL, modify chart of accounts

#### Level 7: Accountant
**As an Accountant, I want to:**
- All Level 6 permissions
- Approve payments up to $50,000
- Full bank reconciliation access
- Create and post journal entries
- Access general ledger
- View financial reports
- Manage chart of accounts (with approval)
- Access tax reports
- Export accounting data
- **Cannot**: Approve high-value transactions, modify system settings, access audit functions

#### Level 8: Finance Manager/CFO
**As a Finance Manager/CFO, I want to:**
- All Level 7 permissions
- Approve all payments and receipts
- Full access to all accounting functions
- Modify chart of accounts
- Access all financial reports
- Configure accounting settings
- Manage fiscal periods
- Access audit trails
- Export all financial data
- Manage accounting integrations

### Accounting Specialized Roles

#### Tax Specialist
**As a Tax Specialist, I want to:**
- View all invoices and bills
- Calculate and apply taxes
- Generate tax reports
- Manage tax configurations
- Access tax compliance reports
- **Cannot**: Approve payments, modify posted entries, access bank reconciliation

#### Bank Reconciliation Specialist
**As a Bank Reconciliation Specialist, I want to:**
- Access bank statements
- Reconcile bank accounts
- Match transactions
- Create reconciliation reports
- **Cannot**: Approve payments, modify invoices, access GL configuration

#### Financial Analyst
**As a Financial Analyst, I want to:**
- View all financial data (read-only)
- Access all financial reports
- Create custom financial reports
- Export financial data
- Access forecasting and budgeting tools
- **Cannot**: Create transactions, approve payments, modify settings

#### Audit Specialist
**As an Audit Specialist, I want to:**
- View all accounting records (read-only)
- Access complete audit trails
- Export audit logs
- Generate audit reports
- Compare periods and identify discrepancies
- **Cannot**: Modify any data, approve transactions, access operational functions

---

## 2.5 HR Module (Employees, Payroll, Attendance)

### HR Role Hierarchy (7 Levels)

#### Level 1: Employee Self-Service
**As an Employee (Self-Service), I want to:**
- View my own employee profile
- Update my personal information
- View my own attendance records
- Apply for leave
- View my own payslips
- Access company policies (read-only)
- **Cannot**: View other employees, modify HR data, access payroll functions

#### Level 2: HR Assistant
**As an HR Assistant, I want to:**
- All Level 1 permissions
- View employee basic information (non-sensitive)
- Create new employee records
- Update employee basic information
- Manage attendance entry
- Process leave applications (approve/reject)
- **Cannot**: Access salary data, modify payroll, access disciplinary records

#### Level 3: HR Executive
**As an HR Executive, I want to:**
- All Level 2 permissions
- View all employee information (except salary)
- Edit employee records
- Manage employee onboarding
- Access attendance reports
- Manage leave policies
- Access basic HR reports
- **Cannot**: Access payroll details, modify compensation, access sensitive records

#### Level 4: HR Manager
**As an HR Manager, I want to:**
- All Level 3 permissions
- View employee compensation (read-only for non-direct reports)
- Edit compensation for direct reports
- Access all employee records
- Manage performance reviews
- Access disciplinary records
- Configure HR policies
- Access comprehensive HR reports
- Export HR data
- **Cannot**: Modify payroll calculations, access payroll processing, modify system settings

#### Level 5: Payroll Administrator
**As a Payroll Administrator, I want to:**
- View all employee salary information
- Process payroll
- Generate payslips
- Manage payroll configurations
- Access payroll reports
- Handle payroll adjustments
- **Cannot**: Modify employee records, access disciplinary records, modify HR policies

#### Level 6: HR Director
**As an HR Director, I want to:**
- All Level 4 and Level 5 permissions
- Full access to all HR functions
- Modify compensation for all employees
- Access all sensitive employee records
- Configure all HR policies
- Manage organizational structure
- Access executive HR dashboards
- Export all HR data
- **Cannot**: Modify system-wide HR settings, access other modules' sensitive data

#### Level 7: HR System Administrator
**As an HR System Administrator, I want to:**
- All Level 6 permissions
- Configure system-wide HR settings
- Manage HR integrations
- Access all audit logs
- Manage HR user permissions
- Configure workflows
- Full system access for HR module

### HR Specialized Roles

#### Recruiter
**As a Recruiter, I want to:**
- Create job postings
- Manage candidate applications
- Schedule interviews
- Create offer letters
- Access recruitment reports
- **Cannot**: Access employee records, modify payroll, access sensitive HR data

#### Benefits Administrator
**As a Benefits Administrator, I want to:**
- View employee benefits enrollment
- Manage benefits plans
- Process benefits changes
- Access benefits reports
- **Cannot**: Modify salary, access payroll processing, modify employee records

#### Training & Development Coordinator
**As a Training & Development Coordinator, I want to:**
- View employee training records
- Schedule training sessions
- Track training completion
- Access training reports
- **Cannot**: Modify employee records, access payroll, modify HR policies

#### Compliance Officer
**As a Compliance Officer, I want to:**
- View all HR records (read-only)
- Access compliance reports
- Export compliance data
- Monitor policy adherence
- **Cannot**: Modify any HR data, process payroll, approve transactions

---

## 2.6 Manufacturing Module (BOM, Work Orders, Routing)

### Manufacturing Role Hierarchy (6 Levels)

#### Level 1: Production Viewer
**As a Production Viewer, I want to:**
- View work orders assigned to me
- View BOMs (read-only)
- View production schedules
- View work center status
- **Cannot**: Create, modify, or approve any production data

#### Level 2: Production Operator
**As a Production Operator, I want to:**
- All Level 1 permissions
- Update work order status (start, pause, complete)
- Record production quantities
- Record material consumption
- Record time on work orders
- **Cannot**: Create work orders, modify BOMs, approve production

#### Level 3: Production Supervisor
**As a Production Supervisor, I want to:**
- All Level 2 permissions
- Create work orders from production plans
- Modify work order schedules
- Approve material issues
- Access work center dashboards
- View team production metrics
- **Cannot**: Modify BOMs, create production plans, modify routing

#### Level 4: Production Planner
**As a Production Planner, I want to:**
- All Level 3 permissions
- Create production plans
- Modify production schedules
- Create and modify BOMs (with approval)
- Create and modify routings (with approval)
- Access production planning tools
- View production capacity
- **Cannot**: Approve BOM changes, modify work centers, access costing

#### Level 5: Manufacturing Manager
**As a Manufacturing Manager, I want to:**
- All Level 4 permissions
- Approve BOM changes
- Approve routing changes
- Modify work centers
- Access all production data
- Configure production workflows
- Access manufacturing analytics
- Export production data
- **Cannot**: Modify costing methods, access other departments, modify system settings

#### Level 6: Manufacturing Director
**As a Manufacturing Director, I want to:**
- All Level 5 permissions
- Full access to all manufacturing functions
- Modify costing methods
- Configure system-wide manufacturing settings
- Access executive manufacturing dashboards
- Export all manufacturing data
- Manage manufacturing integrations

### Manufacturing Specialized Roles

#### BOM Engineer
**As a BOM Engineer, I want to:**
- Create and modify BOMs
- View product structures
- Manage BOM versions
- Access BOM analytics
- **Cannot**: Create work orders, approve production, modify routing

#### Quality Control Inspector (Manufacturing)
**As a Quality Control Inspector (Manufacturing), I want to:**
- View work orders
- Create quality inspection records
- Approve/reject production batches
- Access quality reports
- **Cannot**: Modify production, create work orders, access BOMs

#### Maintenance Technician
**As a Maintenance Technician, I want to:**
- View work center status
- Create maintenance requests
- Update maintenance records
- Access maintenance schedules
- **Cannot**: Modify production, create work orders, access production planning

---

## 2.7 Marketing Module (Campaigns, Email, Segments)

### Marketing Role Hierarchy (5 Levels)

#### Level 1: Marketing Viewer
**As a Marketing Viewer, I want to:**
- View campaigns I'm assigned to
- View campaign performance (read-only)
- View email templates (read-only)
- **Cannot**: Create, edit, or execute campaigns

#### Level 2: Marketing Coordinator
**As a Marketing Coordinator, I want to:**
- All Level 1 permissions
- Create draft campaigns
- Edit campaigns I created
- Create email templates
- Create basic audience segments
- **Cannot**: Execute campaigns, send emails, access customer lists, approve campaigns

#### Level 3: Marketing Specialist
**As a Marketing Specialist, I want to:**
- All Level 2 permissions
- Execute campaigns I created
- Send email blasts (with approval for >10,000 recipients)
- Create advanced audience segments
- Access campaign analytics
- Export campaign data
- **Cannot**: Access full customer database, approve high-volume campaigns, modify system settings

#### Level 4: Marketing Manager
**As a Marketing Manager, I want to:**
- All Level 3 permissions
- Approve all campaigns
- Access all customer segments
- Export customer lists (with restrictions)
- Access all campaign analytics
- Configure marketing workflows
- Manage marketing budgets
- Access team performance dashboards
- **Cannot**: Modify system integrations, access other departments' data

#### Level 5: Marketing Director
**As a Marketing Director, I want to:**
- All Level 4 permissions
- Full access to all marketing functions
- Access all customer data
- Configure system-wide marketing settings
- Manage all marketing integrations
- Access executive marketing dashboards
- Export all marketing data

### Marketing Specialized Roles

#### Content Creator
**As a Content Creator, I want to:**
- Create and edit email templates
- Create landing pages
- Manage marketing content library
- **Cannot**: Execute campaigns, access customer data, send emails

#### Marketing Analyst
**As a Marketing Analyst, I want to:**
- View all campaign data (read-only)
- Access all marketing analytics
- Create custom reports
- Export marketing data
- **Cannot**: Create or execute campaigns, modify settings

#### Email Marketing Specialist
**As an Email Marketing Specialist, I want to:**
- Create and execute email campaigns
- Manage email lists
- Access email performance analytics
- A/B test emails
- **Cannot**: Access other marketing channels, modify system settings

---

## 2.8 POS Module (Billing, Inventory Sync, User Terminals)

### POS Role Hierarchy (5 Levels)

#### Level 1: Cashier (Basic)
**As a Cashier (Basic), I want to:**
- Process sales transactions
- Accept cash and card payments
- Issue receipts
- View product prices (read-only)
- **Cannot**: Process refunds, void transactions, modify prices, access reports

#### Level 2: Cashier (Senior)
**As a Cashier (Senior), I want to:**
- All Level 1 permissions
- Process refunds up to $100
- Void transactions (with manager approval)
- Apply discounts up to 5%
- **Cannot**: Modify prices, access reports, open/close register

#### Level 3: Store Supervisor
**As a Store Supervisor, I want to:**
- All Level 2 permissions
- Process all refunds
- Void any transaction
- Apply discounts up to 20%
- Open and close POS registers
- Access store reports
- View store inventory
- **Cannot**: Modify system settings, access other stores, modify price lists

#### Level 4: Store Manager
**As a Store Manager, I want to:**
- All Level 3 permissions
- Apply any discount
- Modify prices at POS (temporary)
- Access all store reports
- Manage store inventory
- Configure store settings
- Manage store users
- Export store data
- **Cannot**: Modify system-wide settings, access other stores' financial data

#### Level 5: POS Administrator
**As a POS Administrator, I want to:**
- All Level 4 permissions
- Configure all POS terminals
- Modify price lists
- Access all store data
- Configure system-wide POS settings
- Manage all POS integrations
- Export all POS data

### POS Specialized Roles

#### Inventory Sync Specialist
**As an Inventory Sync Specialist, I want to:**
- View POS inventory sync status
- Manually sync inventory
- Resolve sync conflicts
- Access sync reports
- **Cannot**: Process sales, modify prices, access financial data

---

## 2.9 Website Module (CMS, Pages, Media)

### Website Role Hierarchy (6 Levels)

#### Level 1: Content Viewer
**As a Content Viewer, I want to:**
- View published pages
- View media library (read-only)
- Preview drafts (if shared with me)
- **Cannot**: Create, edit, or publish content

#### Level 2: Content Editor (Junior)
**As a Content Editor (Junior), I want to:**
- All Level 1 permissions
- Create draft pages
- Edit pages assigned to me
- Upload media files
- Save drafts
- **Cannot**: Publish content, delete pages, modify navigation

#### Level 3: Content Editor (Senior)
**As a Content Editor (Senior), I want to:**
- All Level 2 permissions
- Edit any page
- Delete pages I created
- Modify page metadata
- **Cannot**: Publish content, modify navigation, access analytics

#### Level 4: Content Publisher
**As a Content Publisher, I want to:**
- All Level 3 permissions
- Publish pages
- Schedule publishing
- Unpublish pages
- Manage published content
- **Cannot**: Modify navigation structure, access analytics, modify themes

#### Level 5: Website Manager
**As a Website Manager, I want to:**
- All Level 4 permissions
- Modify navigation menus
- Manage media library (delete files)
- Access website analytics
- Configure page templates
- Manage content workflows
- **Cannot**: Modify themes, change domain settings, access system settings

#### Level 6: Website Administrator
**As a Website Administrator, I want to:**
- All Level 5 permissions
- Modify themes
- Configure domain settings
- Manage all website settings
- Access all analytics
- Manage integrations
- Export all website data

### Website Specialized Roles

#### SEO Specialist
**As an SEO Specialist, I want to:**
- Edit page SEO metadata
- Manage sitemaps
- Access SEO analytics
- **Cannot**: Publish pages, modify content structure, access system settings

#### Media Librarian
**As a Media Librarian, I want to:**
- Upload and organize media files
- Delete media files
- Manage media categories
- **Cannot**: Create pages, publish content, modify settings

---

## 2.10 Support Module (Tickets, SLAs, Knowledge Base)

### Support Role Hierarchy (7 Levels - Multi-Tier Escalation)

#### Level 1: Support Viewer
**As a Support Viewer, I want to:**
- View tickets assigned to me (read-only)
- View knowledge base articles (read-only)
- **Cannot**: Create, edit, or respond to tickets

#### Level 2: Support Agent (Tier 1)
**As a Support Agent (Tier 1), I want to:**
- All Level 1 permissions
- Create new tickets
- Respond to tickets assigned to me
- Update ticket status (open, in progress, pending)
- Add public and private notes
- Search knowledge base
- Use canned responses
- **Cannot**: Resolve tickets, escalate to Tier 2, access SLA management, modify knowledge base

#### Level 3: Support Agent (Tier 2)
**As a Support Agent (Tier 2), I want to:**
- All Level 2 permissions
- Resolve tickets assigned to me
- Escalate tickets to Tier 3 or specialists
- Reassign tickets within my team
- Access advanced troubleshooting tools
- View customer communication history
- **Cannot**: Close tickets without resolution, modify SLAs, access all teams' tickets

#### Level 4: Support Specialist (Tier 3)
**As a Support Specialist (Tier 3), I want to:**
- All Level 3 permissions
- Access all tickets in my specialty area
- Close tickets
- Escalate to management
- Access technical documentation
- Create knowledge base articles (with approval)
- **Cannot**: Modify SLAs, access other specialties, modify system settings

#### Level 5: Support Team Lead
**As a Support Team Lead, I want to:**
- All Level 4 permissions
- View all tickets for my team
- Reassign tickets across team members
- Approve knowledge base articles
- Access team performance dashboards
- Modify SLAs for my team (with approval)
- Export team ticket data
- **Cannot**: Access other teams' tickets, modify system-wide SLAs, access other departments

#### Level 6: Support Manager
**As a Support Manager, I want to:**
- All Level 5 permissions
- View all tickets across all teams
- Modify SLAs
- Configure support workflows
- Access all support analytics
- Manage support teams
- Export all support data
- **Cannot**: Modify system integrations, access other modules' sensitive data

#### Level 7: Support Director
**As a Support Director, I want to:**
- All Level 6 permissions
- Full access to all support functions
- Configure system-wide support settings
- Manage all support integrations
- Access executive support dashboards
- Export all support data

### Support Specialized Roles

#### Knowledge Base Editor
**As a Knowledge Base Editor, I want to:**
- Create and edit knowledge base articles
- Approve article revisions
- Organize article categories
- Access article analytics
- **Cannot**: Manage tickets, modify SLAs, access customer data

#### SLA Administrator
**As an SLA Administrator, I want to:**
- Create and modify SLA policies
- Configure escalation rules
- Access SLA compliance reports
- **Cannot**: Manage tickets, modify knowledge base, access customer data

#### Support Analyst
**As a Support Analyst, I want to:**
- View all support data (read-only)
- Access all support analytics
- Create custom reports
- Export support data
- **Cannot**: Manage tickets, modify settings, access operational functions

---

## 2.11 Projects Module (Tasks, Milestones, Time Logs)

### Projects Role Hierarchy (6 Levels)

#### Level 1: Project Viewer
**As a Project Viewer, I want to:**
- View projects I'm assigned to (read-only)
- View tasks assigned to me
- View project timelines
- **Cannot**: Create, edit, or update any project data

#### Level 2: Project Member
**As a Project Member, I want to:**
- All Level 1 permissions
- Update task status for assigned tasks
- Log time on assigned tasks
- Add comments to tasks
- Upload files to tasks
- **Cannot**: Create tasks, modify project plans, approve time logs

#### Level 3: Project Contributor
**As a Project Contributor, I want to:**
- All Level 2 permissions
- Create tasks within assigned projects
- Edit tasks I created
- Assign tasks to team members (within project)
- **Cannot**: Modify project structure, approve time logs, access budgets

#### Level 4: Project Lead
**As a Project Lead, I want to:**
- All Level 3 permissions
- Modify project plans
- Create and modify milestones
- Approve time logs for project members
- Access project dashboards
- View project budgets (read-only)
- Export project data
- **Cannot**: Modify budgets, access other projects, modify system settings

#### Level 5: Project Manager
**As a Project Manager, I want to:**
- All Level 4 permissions
- Create and manage projects
- Modify project budgets
- Approve all project expenses
- Access all projects I manage
- Configure project templates
- Access project analytics
- Export project data
- **Cannot**: Access other managers' projects, modify system settings

#### Level 6: PMO Administrator
**As a PMO Administrator, I want to:**
- All Level 5 permissions
- View all projects across organization
- Configure project workflows
- Manage project templates
- Access portfolio analytics
- Export all project data
- Manage project integrations

### Projects Specialized Roles

#### Time & Attendance Coordinator
**As a Time & Attendance Coordinator, I want to:**
- View all time logs
- Approve/reject time logs
- Access time tracking reports
- **Cannot**: Create projects, modify tasks, access budgets

#### Resource Manager
**As a Resource Manager, I want to:**
- View all projects (read-only)
- View resource allocation
- Assign resources to projects
- Access resource utilization reports
- **Cannot**: Modify project plans, approve expenses, access budgets

#### Project Analyst
**As a Project Analyst, I want to:**
- View all project data (read-only)
- Access all project analytics
- Create custom reports
- Export project data
- **Cannot**: Modify projects, approve expenses, access operational functions

---

## 2.12 Dashboard Module

### Dashboard Role Hierarchy (4 Levels)

#### Level 1: Personal Dashboard User
**As a Personal Dashboard User, I want to:**
- View my personalized dashboard
- Customize my dashboard layout
- View widgets for data I have access to
- **Cannot**: Share dashboards, create public dashboards, access team data

#### Level 2: Team Dashboard Manager
**As a Team Dashboard Manager, I want to:**
- All Level 1 permissions
- Create team dashboards
- Share dashboards with team members
- Configure team-specific widgets
- Access team aggregated data
- **Cannot**: Create department dashboards, access other teams' data

#### Level 3: Department Dashboard Administrator
**As a Department Dashboard Administrator, I want to:**
- All Level 2 permissions
- Create department-wide dashboards
- Configure department widgets
- Access department aggregated data
- Manage dashboard permissions for department
- **Cannot**: Create organization-wide dashboards, access other departments

#### Level 4: System Dashboard Administrator
**As a System Dashboard Administrator, I want to:**
- All Level 3 permissions
- Create organization-wide dashboards
- Configure global dashboard templates
- Manage all dashboard permissions
- Access all dashboard analytics
- Export dashboard configurations

---

# 3. Cross-Cutting RBAC User Stories

## 3.1 Workflow Permissions (Multi-Stage Approval)

### Approval Hierarchy Levels

**As a System Admin, I want to configure:**
- **Single Approval**: One approver required
- **Dual Approval**: Two approvers required (can be sequential or parallel)
- **Multi-Level Approval**: 3+ approvers in sequence (Level 1 → Level 2 → Level 3)
- **Conditional Approval**: Different approval paths based on amount, type, or other criteria
- **Delegation Rules**: Automatic delegation when approver is unavailable

### Workflow Stage Permissions

**As a [Role], I want to:**
- Move records to next stage (if I have "transition" permission)
- Approve records at my approval level
- Reject records and send back to previous stage
- Skip stages (if I have "bypass" permission)
- View workflow history and approval chain

## 3.2 Data Export Restrictions (Granular)

### Export Permission Levels

**Level 1: No Export**
- Cannot export any data

**Level 2: Personal Data Export**
- Export only own records

**Level 3: Team Data Export**
- Export team records (with restrictions on sensitive fields)

**Level 4: Department Data Export**
- Export department data (with field-level restrictions)

**Level 5: Full Data Export**
- Export all data (with audit logging)

### Export Format Restrictions

**As a [Role], I can export:**
- CSV (basic data only)
- Excel (with formulas, if permitted)
- PDF (formatted reports, if permitted)
- JSON/API (if API access granted)

## 3.3 API Permission Control (Scoped Access)

### API Key Permission Levels

**Level 1: Read-Only API**
- GET requests only
- Limited to own data

**Level 2: Read-Write API (Personal)**
- GET, POST, PUT for own data
- DELETE restricted

**Level 3: Read-Write API (Team)**
- GET, POST, PUT for team data
- DELETE with approval

**Level 4: Full API Access (Department)**
- All HTTP methods
- Department data scope
- Webhook creation

**Level 5: System API Access**
- Full system access
- All integrations
- Webhook management

---

# 4. Advanced RBAC Features

## 4.1 Delegated Administration

### Module-Level Delegated Admins

**As a System Admin, I want to assign:**
- **CRM Admin**: Full CRM module administration (cannot access other modules)
- **Sales Admin**: Full Sales module administration
- **Inventory Admin**: Full Inventory module administration
- **Accounting Admin**: Full Accounting module administration (with financial limits)
- **HR Admin**: Full HR module administration (with salary visibility limits)
- **Support Admin**: Full Support module administration
- **Projects Admin**: Full Projects module administration

### Feature-Level Delegated Admins

**As a System Admin, I want to assign:**
- **Pricing Admin**: Manage all pricing (across Sales and POS)
- **Workflow Admin**: Configure workflows across modules
- **Report Admin**: Create and manage all reports
- **Integration Admin**: Manage API keys and integrations

## 4.2 Temporary Access Management

### Temporary Permission Elevation

**As an Admin, I want to:**
- Grant temporary elevated permissions with expiry date
- Set automatic revocation after X days
- Require approval for temporary access requests
- Send notifications before access expires
- Audit all temporary access grants

### Time-Based Access

**As a System Admin, I want to configure:**
- **Business Hours Only**: Access restricted to business hours
- **Time Windows**: Access allowed only during specific time windows
- **Recurring Temporary Access**: Weekly/monthly temporary access grants

## 4.3 Geofencing & Device Restrictions

### Location-Based Access

**As a Security Officer, I want to:**
- Restrict access based on IP address ranges
- Require VPN connection for sensitive modules
- Block access from specific countries/regions
- Allow access only from registered office locations

### Device Restrictions

**As a Security Officer, I want to:**
- Require device registration
- Restrict access to specific device types
- Enforce mobile device management (MDM) compliance
- Block access from unregistered devices

## 4.4 Conditional Access Rules

### Attribute-Based Access Control (ABAC)

**As a System Admin, I want to configure access based on:**
- **User Attributes**: Department, location, employment type
- **Resource Attributes**: Data classification, sensitivity level
- **Environmental Attributes**: Time of day, network location, device type
- **Action Attributes**: Operation type, data volume

### Dynamic Permission Assignment

**As a System Admin, I want to:**
- Automatically assign roles based on user attributes
- Revoke permissions when user attributes change
- Apply different permissions for contractors vs employees
- Adjust permissions based on project assignments

## 4.5 Audit & Compliance

### Comprehensive Audit Logging

**As an Auditor, I want to view logs for:**
- All permission changes (who, what, when, why)
- All access attempts (successful and failed)
- All data exports (what, when, by whom)
- All approval actions
- All configuration changes
- All API access

### Compliance Reporting

**As a Compliance Officer, I want to:**
- Generate access certification reports
- Identify users with excessive permissions
- Track segregation of duties violations
- Export audit logs for regulatory compliance
- Generate role usage reports

## 4.6 Role Templates & Quick Setup

### Pre-Built Role Templates

**As a System Admin, I want access to:**
- Industry-specific role templates (Retail, Manufacturing, Services, etc.)
- Department-specific role templates
- Compliance-ready role templates (SOX, GDPR, HIPAA)
- Best-practice role configurations

### Role Cloning & Customization

**As a System Admin, I want to:**
- Clone existing roles with all permissions
- Create role variations quickly
- Apply role templates and customize
- Bulk assign roles to users

---

# 5. Role Conflict Resolution & Hierarchy Rules

## 5.1 Multiple Role Assignment

**As a System Admin, I want to configure:**
- **Most Permissive**: User gets union of all role permissions
- **Least Permissive**: User gets intersection of all role permissions
- **Priority-Based**: Higher priority role overrides lower priority
- **Module-Specific**: Different rules per module

## 5.2 Role Inheritance

**As a System Admin, I want to:**
- Define parent-child role relationships
- Child roles inherit parent permissions
- Child roles can add additional permissions
- Child roles cannot remove parent permissions (unless explicitly allowed)

## 5.3 Segregation of Duties (SoD)

**As a Compliance Officer, I want to:**
- Define conflicting roles (e.g., "AP Clerk" and "AR Clerk" cannot be same user)
- Prevent users from having conflicting permissions
- Get alerts when SoD violations occur
- Generate SoD compliance reports

---

# 6. Implementation Priority Matrix

## High Priority (Phase 1)
- Basic role hierarchy (3-4 levels per module)
- Module-level access control
- Basic approval workflows
- Audit logging

## Medium Priority (Phase 2)
- Granular role hierarchies (5-7 levels)
- Field-level permissions
- Advanced approval workflows
- Export restrictions
- Delegated administration

## Low Priority (Phase 3)
- Geofencing and device restrictions
- Attribute-based access control
- Advanced audit analytics
- Role templates and quick setup

---

# 7. Acceptance Criteria Template

For each user story, the following acceptance criteria apply:

## Functional Criteria
- [ ] Permission is enforced in UI (buttons/actions hidden)
- [ ] Permission is enforced in API (403 errors for unauthorized)
- [ ] Permission is enforced in database (record-level filtering)
- [ ] Error messages are clear and actionable

## Non-Functional Criteria
- [ ] Permission checks don't impact performance (<50ms overhead)
- [ ] Audit logs capture all permission-related actions
- [ ] Role changes take effect immediately (no restart required)
- [ ] System supports 10,000+ users with 100+ roles

## Security Criteria
- [ ] All permission checks happen server-side
- [ ] No sensitive data exposed in error messages
- [ ] API endpoints validate permissions before processing
- [ ] Database queries respect record-level permissions

---

# 8. Testing Scenarios

## Role Assignment Testing
- User with single role
- User with multiple roles (conflict resolution)
- User with inherited roles
- User with temporary elevated permissions

## Permission Testing
- User with no access (should see nothing)
- User with read-only access (should see but not edit)
- User with full access (should see and edit everything)
- User with conditional access (should see based on conditions)

## Workflow Testing
- Single approval workflow
- Multi-level approval workflow
- Parallel approval workflow
- Conditional approval workflow

## Edge Cases
- User with expired temporary access
- User accessing from restricted location
- User with conflicting roles (SoD violation)
- User accessing during restricted time window

---

**End of Expanded RBAC User Stories Document**

