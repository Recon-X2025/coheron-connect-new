# Coheron ERP — Product Document

## Overview

Coheron ERP is a unified business management platform that consolidates CRM, Sales, HR, Manufacturing, Inventory, Accounting, Projects, Support, Marketing, POS, eCommerce, and eSignature into a single application. Built for small-to-mid-size businesses that need Freshworks-level capability without the cost of purchasing separate products for each function.

**Key differentiators:**
- All modules in one platform, one price — no per-module licensing
- India-first compliance (GST, PF/ESI, Indian payroll statutory)
- Manufacturing + Inventory — capabilities Freshworks does not offer
- Self-hosted option via Docker — serves regulated industries requiring on-prem
- Per-tenant module control — customers activate only what they need

---

## Architecture

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite, React Router 7 |
| Backend | Node.js, Express 4, TypeScript |
| Database | MongoDB (Mongoose ODM) |
| Auth | JWT with RBAC + record-level access control |
| Jobs | BullMQ + Redis |
| Real-Time | Socket.IO (WebSocket) |
| Email | Nodemailer (SMTP) |
| Payments | Razorpay |
| File Storage | S3-compatible (AWS S3 / MinIO) |
| Logging | Pino (structured JSON) |
| Error Tracking | Sentry |
| Deployment | Docker (multi-stage build), Docker Compose |
| API Docs | Swagger / OpenAPI 3.0 |

**Infrastructure:**
- Multi-tenant architecture with module-level access gating
- 193 database models, 100 route files, 150+ frontend components
- Route-level code splitting (React.lazy) — 75% bundle size reduction
- Optimized for 512MB RAM VPS (Node heap 320MB + Redis 64MB)

---

## Modules

### 1. CRM

Manage the full customer lifecycle from lead capture to deal closure.

| Feature | Description |
|---------|-------------|
| Lead Management | Capture, score, and nurture leads with activity tracking |
| BANT Qualification | Budget (amount, currency, status, fiscal year, decision date), Authority (decision maker, title, level 1-10, org chart), Need (pain points, current solution, gap analysis, urgency, impact, compelling event), Timeline (target date, urgency, buying stage, blockers) — auto-scored 0-25 per dimension, overall 0-100 |
| UTM & Attribution | Full UTM tracking (source, medium, campaign, term, content) + landing page, referrer, gclid, fbclid, li_fat_id, msclkid; multi-touch attribution with first/last/creation touchpoints, attribution model selection |
| Engagement Tracking | Per-channel metrics: emails (sent/opened/clicked/replied/bounced), calls (total/connected/duration/recorded), meetings (scheduled/completed/no-show/total duration), WhatsApp (sent/delivered/read/replied), website (visits/pages/time/last visit), content (downloads/webinars/forms/demos); auto-computed engagement score & level |
| Lead Enrichment | Company enrichment (industry, employee count, revenue, tech stack, founding year, social profiles) + person enrichment (title, seniority, department, education, certifications, social profiles); enrichment source & timestamp tracking |
| Duplicate Detection | Potential match tracking with match score (0-100), matched fields, auto-detected vs manual, merge status (pending/merged/rejected/ignored), master record reference |
| Pipeline View | Visual deal pipeline with drag-and-drop stage progression |
| MEDDIC Qualification | Metrics (quantified value, business impact, ROI, payback period), Economic Buyer (name, title, engagement level, relationship, access, last meeting), Decision Criteria (technical/business/economic criteria, weighting, competitor comparison), Decision Process (steps with owners/dates/status, approval levels, paper process, legal review), Identify Pain (pains with severity/impact/current cost/quantified), Champion (name, title, influence level, engagement, reliability, coaching status) — scored per dimension |
| Buying Committee | Track each committee member: name, title, role (champion/economic buyer/technical buyer/user/influencer/blocker/coach), influence level, sentiment, engagement level, concerns, relationship owner, last contact |
| Competitor Tracking | Per-deal competitor: name, strengths/weaknesses, pricing details, relationship status, differentiation strategy, threat level (low/medium/high/critical), win probability impact |
| Deal Health | Health grade (A-F), risk factors with category/severity/likelihood/impact/mitigation/owner/status, engagement score & trend (improving/stable/declining/critical), staleness tracking (days since activity/communication/stage change) |
| Win/Loss Analysis | Close analysis: win/loss reasons, primary reason, competitor lost/won to, lessons learned, success factors, improvement areas, decision factors, champion effectiveness, sales process adherence score, next steps |
| Forecast & Prediction | Forecast category (omitted/pipeline/best case/commit/closed), weighted/unweighted amount, manual override, AI prediction (win probability, expected close, confidence, predicted value, risk factors, next best action, last calculated), forecast history |
| RFM Analysis | Recency/Frequency/Monetary customer segmentation — quintile scoring (1-5 per dimension), 11 segments (Champions, Loyal, Potential Loyalist, New, Promising, Need Attention, About to Sleep, At Risk, Can't Lose, Hibernating, Lost), churn prediction (risk level + probability), batch analysis runs with configurable periods |
| Contact Management | Unified partner/customer database shared across modules |
| Activity Feed | Calls, emails, meetings, notes linked to leads and deals |
| Lead Scoring | Automated BANT scoring service with qualification status (unqualified/partially/qualified/highly) |
| RBAC | CRM-specific role-based access with audit logging |

### 2. Sales

End-to-end order-to-cash process.

| Feature | Description |
|---------|-------------|
| Quotations & Orders | Create, send, confirm sale orders with line items |
| Pricing Rules | Configurable pricing strategies per product/customer |
| Contracts | Manage sales contracts with terms and renewals |
| Delivery Management | Track shipments and delivery status |
| Returns | Process sales returns with reason tracking |
| Sales Forecasting | Pipeline-based revenue forecasting |
| Team Performance | Sales team metrics and territory management |
| Analytics | Revenue trends, conversion rates, top performers |

### 3. Inventory & Warehouse

Full warehouse management with stock tracking.

| Feature | Description |
|---------|-------------|
| Multi-Warehouse | Manage multiple warehouses with location hierarchy |
| Stock Tracking | Real-time stock quantities via stock quants and ledger |
| GRN (Goods Receipt) | Receive inventory with quality checks |
| Stock Transfers | Inter-warehouse transfers with tracking numbers |
| Adjustments | Stock adjustments with audit trail |
| Cycle Counts | Scheduled inventory counts |
| Picking/Packing/Putaway | Warehouse operation tasks |
| Batch & Serial Tracking | Full traceability per unit |

### 4. Manufacturing

Production planning and execution.

| Feature | Description |
|---------|-------------|
| Manufacturing Orders | Create and track production orders through lifecycle |
| Bill of Materials (BOM) | Multi-level BOM with component quantities |
| Routing | Define operation sequences with work centers |
| Work Orders | Break MOs into operation-level work orders |
| Quality Control | Inspections, non-conformance reports, checklists |
| Costing | Track production costs per operation and material |
| Material Consumption | Track raw material usage against planned quantities |
| MRP (Material Requirements Planning) | MRP runs with configurable horizon (days), demand sources (sales orders, forecasts, safety/min stock), lot size consolidation; demand analysis per product/warehouse with shortage calculation; planned order generation (manufacturing or purchase) with lead time scheduling, cost estimation; confirm/cancel planned orders with audit trail |

### 5. Accounting

Double-entry accounting with Indian tax compliance.

| Feature | Description |
|---------|-------------|
| Chart of Accounts | Configurable account hierarchy |
| Journal Entries | Manual and automated journal entries |
| Invoicing | GST-compliant invoices with CGST/SGST/IGST breakdown |
| Accounts Payable | Vendor bills, payment tracking, aging reports |
| Accounts Receivable | Customer invoices, payment collection, aging |
| Bank Management | Bank reconciliation and statement import |
| Fixed Assets | Asset register with depreciation tracking |
| Tax Management | GST configuration, HSN codes, tax reports |
| GST Returns | GSTR-1 (B2B, B2C, exports, credit/debit notes, HSN summary), GSTR-3B (outward/inward supplies, ITC available/reversed, tax payable/paid with IGST/CGST/SGST/cess split, interest & late fee), GSTR-9/9C annual returns; draft → pending review → ready to file → filed workflow; ARN & acknowledgement tracking |
| E-Invoice | IRN generation with NIC API integration, signed invoice & QR code storage, acknowledgement number/date, e-Way Bill (EWB number, date, validity), cancellation with reason/remark, error tracking (code + message), per-invoice status lifecycle (pending → generated → cancelled/failed) |
| Financial Reports | P&L, Balance Sheet, Cash Flow, Trial Balance |

### 6. HR & People

Complete human resource management.

| Feature | Description |
|---------|-------------|
| Employee Management | 60+ field profiles with documents, skills, certifications |
| Attendance | Shift management, clock-in/out, work hours tracking |
| Leave Management | Leave types, policies, balance tracking, approval workflows |
| Payroll | Salary structures, CTC breakdown, statutory deductions (PF, ESI), auto TDS computation on payslip creation |
| Recruitment | Applicant tracking from sourcing to onboarding |
| Appraisals | Performance reviews with goal tracking |
| Learning (LMS) | Course management with content tracking |
| Policies | Company policy management and acknowledgment |
| Tax Compliance | Old/New regime tax calculation (full Indian slabs + 87A rebate + 4% cess), HRA/LTA/80C/80D/24B deductions, tax projection with monthly TDS, regime comparison, Form 16 (Part A + Part B) JSON generation |
| Onboarding/Offboarding | Structured processes for new and departing employees |

### 7. Projects

Project management with financial tracking and agile support.

| Feature | Description |
|---------|-------------|
| Project Dashboard | Overview with KPIs, milestones, budget status |
| Task Management | Tasks with assignments, priorities, dependencies |
| Timesheets | Time tracking linked to tasks and billing |
| Financials | Project budgets, expenses, profitability analysis |
| Risk & Issues | Risk register with probability/impact matrices |
| Agile/Scrum | Sprints, burndown charts, retrospectives, backlog |
| Wiki | Project knowledge base with versioning |
| Quality | Compliance templates, inspections, checklists |
| Resource Management | Allocation and capacity planning |
| Change Requests | Formal change management process |
| Procurement | Project-specific purchasing |

### 8. Support & Helpdesk

Multi-channel customer support with real-time chat.

| Feature | Description |
|---------|-------------|
| Ticket Management | Create, assign, track support tickets with workflow automation |
| SLA Policies | Response/resolution time enforcement with escalation |
| Email Integration | Inbound email-to-ticket via SendGrid/Mailgun webhooks |
| Live Chat | Real-time chat via Socket.IO with visitor/agent rooms, typing indicators |
| Agent Workbench | Unified agent interface with ticket queue |
| Automation Rules | Auto-assign, auto-close, canned response triggers |
| Knowledge Base | Self-service articles for customers |
| ITSM | Issue types, lifecycle tracking, attachments |
| Customer Surveys | Post-resolution satisfaction surveys |
| Team Management | Support team configuration and routing |
| WhatsApp Channel | Meta Graph API integration — webhook verification, inbound message → auto ticket creation, outbound replies from ticket conversations |
| Reports | Ticket volume, resolution times, agent performance |

### 9. Marketing

Campaign management and marketing automation.

| Feature | Description |
|---------|-------------|
| Campaigns | Email, social, and website campaign management |
| Marketing Workflows | Automated campaign sequences |
| Campaign Analytics | Open rates, click rates, conversion tracking |

### 10. Point of Sale (POS)

Retail and in-store sales with integrated payments.

| Feature | Description |
|---------|-------------|
| POS Interface | Touch-optimized sales terminal |
| Sessions | Shift-based session management with cash reconciliation |
| Terminals | Multi-terminal support |
| Payments | Multiple payment methods per transaction, Razorpay integration |
| Order Management | POS orders linked to inventory |

### 11. Website & eCommerce

Build and manage an online storefront with integrated payments.

| Feature | Description |
|---------|-------------|
| Page Builder | Visual website page construction |
| Product Catalog | Online product listings synced with inventory |
| Shopping Cart | Customer cart with session management |
| Order Processing | Online orders flowing into sales pipeline |
| Payments | Razorpay payment gateway with order-level payment initiation |
| Promotions | Discount codes, campaigns, promotional pricing |
| Media Library | Centralized asset management |
| Site Analytics | Traffic and conversion tracking |

### 12. E-Signature

Digital document signing with email notifications and S3 storage.

| Feature | Description |
|---------|-------------|
| Templates | Reusable document templates with field placement |
| Signing Interface | Browser-based document signing |
| Email Notifications | Automated signing request and completion emails via Nodemailer |
| Audit Trail | Complete signing history with timestamps |
| Multi-Signer | Sequential signer workflows |
| S3 Storage | Document files stored in S3-compatible storage when enabled |

### 13. Platform

Cross-cutting platform capabilities.

| Feature | Description |
|---------|-------------|
| Workflow Engine | Trigger-based automation with condition evaluation and 6 action types (update_field, send_email, send_notification, assign, create_task, webhook) |
| Real-Time | Socket.IO WebSocket layer — chat rooms, per-user notifications, tenant-scoped dashboard broadcasts |
| Email Service | Nodemailer SMTP transport with branded HTML templates (invoice, ticket reply, welcome, password reset) |
| Payment Gateway | Razorpay integration — order creation, signature verification, webhooks, refunds |
| File Storage | S3-compatible storage (AWS S3 / MinIO) — upload, presigned download URLs, metadata tracking |
| Integrations | Gmail, Slack, WhatsApp (Meta Graph API), Razorpay, S3, webhooks, custom |
| Custom Reports | Configurable reports with filters, grouping, charts |
| Dashboards | Module-specific dashboards with KPI cards and sparklines |
| Custom Fields | Tenant-scoped custom field definitions for any module |
| RBAC | Roles, permissions, user assignments, audit logs |
| Multi-Tenancy | Tenant-scoped data isolation with per-tenant module control |
| Customer Portal | Self-service portal with branded login (logo, colors, support info); configurable feature toggles (tickets, orders, invoices, quotes, knowledge base, live chat, projects); portal user registration with email verification, password reset, domain allowlisting, optional admin approval; user preferences (language, timezone, email/SMS notifications) |
| SSO / SAML | SAML 2.0 and OIDC single sign-on with provider presets (Google, Microsoft, Okta, Auth0); configurable attribute mapping (email, name, groups); role mapping (group → role); auto-provisioning and login-time profile sync; force-SSO mode with optional password fallback; SP metadata (entity ID, ACS URL, SLO URL) |
| CSV Export | Export data from any list view |
| Global Search | Cmd+K cross-module search |

---

## Security

| Capability | Implementation |
|------------|---------------|
| Authentication | JWT tokens (24h expiry) with 2FA partial-token flow |
| Authorization | Permission-based + role-based access control |
| Record Access | Own / team / department / all access levels |
| Tenant Isolation | All data scoped by tenant_id |
| Security Headers | Helmet.js (XSS, clickjacking, HSTS) |
| Rate Limiting | 1000 requests per 15-minute window |
| Input Limits | 10MB JSON body limit |
| Audit Logging | Access attempt tracking, RBAC audit log |
| Two-Factor Auth | TOTP (speakeasy + QR code), SMS, Email OTP; backup codes (10, bcrypt-hashed); partial JWT login flow with 5-min expiry |
| SSO | SAML 2.0 + OIDC federation with Google, Microsoft, Okta, Auth0; auto-provisioning, group-to-role mapping, force-SSO mode |
| Non-Root Container | Docker runs as unprivileged user |

---

## Deployment

**Single-command deployment** on any VPS or cloud instance:

```
./deploy.sh
```

**Requirements:**
- Docker + Docker Compose
- MongoDB Atlas (free tier supported)
- 512MB RAM minimum (1GB recommended)

**Stack:**
- `coheron-erp` container: Node.js app serving API + static frontend
- `redis` container: Background job processing (64MB)
- MongoDB Atlas: Database (cloud-managed)

**Monitoring:**
- Health check endpoint: `GET /health`
- Structured JSON logs (pino)
- Sentry error tracking (optional)
- Swagger API docs at `/api-docs` (dev mode)

---

## Data Model Summary

**193 models** organized by domain:

| Domain | Model Count | Key Entities |
|--------|-------------|-------------|
| CRM | 12+ | Lead (BANT, UTM, Engagement, Enrichment, Duplicates), Deal (MEDDIC, Buying Committee, Health, Forecast), Pipeline, CrmTask, LeadActivity, LeadScoringHistory, CustomerRFM, RFMAnalysisRun |
| Sales | 15+ | SaleOrder, Invoice, SalesContract, SalesForecast, Territory |
| Inventory | 18+ | Product, Warehouse, StockQuant, StockLedger, GRN, StockTransfer, StockReservation |
| Manufacturing | 28+ | ManufacturingOrder, Bom, BomLine, Routing, WorkOrder, MoQualityInspection, MRPRun, MRPDemand, MRPPlannedOrder |
| Accounting | 20+ | AccountMove, AccountJournal, AccountPayment, FixedAsset, TaxReport, GSTReturn, TDS, EInvoice |
| HR | 25+ | Employee (60+ fields), Leave, Attendance, Payroll, Appraisal, Course |
| Projects | 20+ | Project, ProjectTask, Sprint, ProjectBudget, ProjectRisk, WikiPage |
| Support | 15+ | SupportTicket, SlaPolicy, CannedResponse, ChatSession, ChatMessage |
| Platform | 15+ | Workflow, WorkflowRun, Integration, Report, Dashboard, Payment, FileStorage, CustomField, PortalUser, PortalSettings, SSOConfig |

---

## Competitive Comparison

| Capability | Coheron ERP | Freshworks | Zoho One |
|-----------|-------------|------------|----------|
| CRM | Included | Freshsales ($9-69/user/mo) | Included |
| Helpdesk | Included | Freshdesk ($15-95/agent/mo) | Included |
| HR | Included | Freshteam (discontinued) | Included |
| Accounting | Included | Not available | Included |
| Manufacturing | Included | Not available | Not available |
| Inventory/WMS | Included | Not available | Separate product |
| POS | Included | Not available | Not available |
| eCommerce | Included | Not available | Separate product |
| E-Signature | Included | Not available | Separate product |
| Project Management | Included | Not available | Included |
| Self-Hosted | Yes (Docker) | No | No |
| India Compliance | Built-in (GST, PF, ESI) | Add-on | Partial |
| Per-Module Pricing | Single price, all modules | Per-product pricing | Per-app pricing |

---

## Demo Access

| Field | Value |
|-------|-------|
| URL | `http://<your-server-ip>` |
| Email | `admin@coheron.com` |
| Password | `admin123` |

Demo data includes sample partners, products, leads, sale orders, invoices, manufacturing orders, campaigns, and employees.

---

## Technical Specifications

| Spec | Value |
|------|-------|
| API Endpoints | 100 route files |
| Frontend Components | 150+ React components |
| Database Models | 193 Mongoose schemas |
| Test Coverage | 24 integration tests (auth, CRUD, pagination, filtering) |
| Real-Time | Socket.IO with JWT auth, chat/notification/dashboard rooms |
| Email | Nodemailer SMTP with 4 branded HTML templates |
| Payments | Razorpay (order, verify, webhook, refund) |
| File Storage | S3-compatible (upload, presigned URLs, metadata) |
| Workflow Actions | 6 types (update_field, send_email, send_notification, assign, create_task, webhook) |
| Bundle Size | 333 KB (code-split from 1,321 KB) |
| Min RAM | 512 MB |
| Node.js | 20 LTS |
| TypeScript | 5.3+ (strict mode) |
| License | Proprietary |
