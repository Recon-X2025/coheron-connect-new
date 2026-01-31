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

### 13. Compliance & Security

Audit-ready compliance infrastructure for SOC 1/2, GDPR, and ISO 27001.

| Feature | Description |
|---------|-------------|
| Security Dashboard | Real-time overview: failed logins, active sessions, critical events, pending DSARs |
| Audit Trail | Automatic logging of all data mutations (create/update/delete) with user, IP, entity, changes diff |
| Security Event Log | Typed event log (login, lockout, password change, data export, permission escalation) with severity levels |
| GDPR Consent Management | Per-purpose consent tracking (marketing, analytics, data processing, third party) with grant/withdraw history |
| Data Subject Requests (DSAR) | Full DSAR workflow: access, erasure, rectification, portability, restriction — with 30-day SLA tracking |
| Right to Erasure | User data anonymization across modules, legal hold enforcement for financial/tax records |
| Data Export (Portability) | Cross-module user data export in JSON/CSV for DSAR access requests |
| Retention Policies | Per-entity retention rules with configurable expiry actions (delete, anonymize, archive) |
| Data Breach Management | Breach incident workflow with 72-hour authority notification tracking (GDPR Art. 33) |
| Records of Processing (ROPA) | Processing activity registry with lawful basis, data categories, recipients, EEA transfer tracking |
| Change Management | Change record tracking for config, permission, role, and security setting changes |
| Compliance Reports | Auto-generated evidence packages for SOC 2, GDPR, and ISO 27001 audits |
| Data Classification | Field-level sensitivity registry (Public, Internal, Confidential, Restricted) for PII tracking |
| Access Review | Active session management, user permission review, dormant account flagging |

### 14. Platform

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
| Authentication | JWT access tokens (1h) + refresh tokens (7d) with JTI tracking |
| Token Revocation | Token blacklist with TTL auto-cleanup; revocation on logout, password change, admin action |
| Session Management | Active session tracking per user/tenant; view, terminate individual sessions; max concurrent sessions |
| Password Policy | Min 12 chars, uppercase + lowercase + digit + special; history check (last 5); forced re-auth on password change |
| Account Lockout | Auto-lock after 5 failed attempts, 15-minute lockout duration |
| Authorization | Permission-based + role-based access control |
| Record Access | Own / team / department / all access levels |
| Tenant Isolation | All data scoped by tenant_id |
| Field Encryption | AES-256-GCM encryption for PII fields (email, bank details, tax IDs) with SHA-256 lookup hashes |
| Security Headers | Helmet.js + X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| Rate Limiting | Global: 1000/15min; Auth endpoints: 10/min |
| Input Validation | Zod schema validation middleware for request body/query/params |
| Input Limits | 10MB JSON body limit |
| Audit Trail | Automatic mutation logging with user, IP, entity, changes, request correlation ID |
| Security Events | Typed security event log with severity (info/warning/critical) and anomaly tracking |
| Data Classification | Field-level sensitivity registry (Public → Restricted) for access logging |
| Two-Factor Auth | TOTP (speakeasy + QR code), SMS, Email OTP; backup codes (10, bcrypt-hashed); partial JWT login flow with 5-min expiry |
| SSO | SAML 2.0 + OIDC federation with Google, Microsoft, Okta, Auth0; auto-provisioning, group-to-role mapping, force-SSO mode |
| GDPR Compliance | Consent management, DSAR workflow (access/erasure/portability), retention policies, breach management, ROPA |
| SOC 2 Controls | Comprehensive audit trails, change management, access reviews, compliance evidence reports |
| ISO 27001 | Annex A control mapping with evidence generation across all security domains |
| Non-Root Container | Docker runs as unprivileged user |

---

## Deployment

### Quick Deploy (Vultr / Any VPS)

Single SSH command to deploy on a fresh Ubuntu VPS:

```bash
ssh root@<YOUR_VPS_IP>
curl -fsSL https://raw.githubusercontent.com/Recon-X2025/coheron-connect-new/main/deploy.sh | bash
```

The script automatically:
1. Installs Docker and Docker Compose (if not present)
2. Clones the repository
3. Prompts for MongoDB Atlas URI and JWT secret (auto-generates if skipped)
4. Builds the multi-stage Docker image (frontend + API in one container)
5. Starts all services via `docker compose up -d`
6. Runs a health check and prints the access URL

### Recommended Vultr Configuration

| Setting | Value |
|---------|-------|
| Plan | Cloud Compute — 1 vCPU, 1 GB RAM, 25 GB SSD ($6/mo) |
| Minimum | 1 vCPU, 512 MB RAM, 10 GB SSD (free tier eligible) |
| OS | Ubuntu 22.04 LTS |
| Database | MongoDB Atlas M0 (free) or M10+ for production |
| Region | Mumbai (ap-south) for India-first deployments |

### Docker Architecture

```
┌─────────────────────────────────────────────┐
│  docker-compose.yml                         │
│                                             │
│  ┌──────────────────────┐  ┌─────────────┐  │
│  │  coheron-erp (:80)   │  │  redis      │  │
│  │                      │  │  (7-alpine)  │  │
│  │  Node.js 20 Alpine   │  │  64MB max   │  │
│  │  Express API (:3000) │  │  LRU evict  │  │
│  │  Static frontend     │  │             │  │
│  │  Socket.IO           │  │  BullMQ     │  │
│  │  Heap: 320MB max     │  │  workers    │  │
│  └──────────┬───────────┘  └─────────────┘  │
│             │                               │
└─────────────┼───────────────────────────────┘
              │
    ┌─────────▼─────────┐
    │  MongoDB Atlas     │
    │  (cloud-managed)   │
    └───────────────────┘
```

**Container details:**
- Multi-stage Dockerfile: Stage 1 builds frontend (Vite), Stage 2 builds API (tsc), Stage 3 is production image
- Non-root container user (`appuser:1001`) for security
- Health check: `wget http://localhost:3000/health` every 30s
- Restart policy: `unless-stopped`
- Volumes: `uploads` (file storage), `redis-data` (job persistence)

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | 256-bit secret — **mandatory in production** (app fails to start without it) |
| `FIELD_ENCRYPTION_KEY` | Prod | 64-char hex string (32 bytes) for AES-256-GCM PII encryption |
| `PORT` | No | API port (default: 3000) |
| `NODE_ENV` | No | `production` (set in Dockerfile) |
| `CORS_ORIGIN` | No | Allowed origins (default: `*`) |
| `REDIS_URL` | No | Redis URL (default: `redis://redis:6379` via compose) |
| `ENABLE_WORKERS` | No | Enable BullMQ workers (default: `true`) |
| `EMAIL_ENABLED` | No | Enable SMTP email (default: `false`) |
| `SMTP_HOST` | No | SMTP server hostname |
| `SMTP_PORT` | No | SMTP port |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `EMAIL_FROM` | No | Sender email address |
| `RAZORPAY_KEY_ID` | No | Razorpay API key |
| `RAZORPAY_KEY_SECRET` | No | Razorpay secret |
| `S3_ENABLED` | No | Enable S3 file storage (default: `false`) |
| `S3_ENDPOINT` | No | S3-compatible endpoint URL |
| `S3_BUCKET_NAME` | No | S3 bucket name |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |

### Post-Deployment

```bash
# Seed the database with demo data
docker compose exec coheron-erp node dist/database/init-mongodb.js

# View logs
docker compose logs -f

# Restart
docker compose restart

# Update to latest version
git pull && docker compose up -d --build
```

### Monitoring

- Health check endpoint: `GET /health` — returns `{"status":"ok","database":"connected"}`
- Security dashboard: `GET /api/security-dashboard` — failed logins, active sessions, critical events
- Compliance reports: `GET /api/security-dashboard/reports/soc2|gdpr|iso27001` — audit evidence packages
- Structured JSON logs via Pino
- Sentry error tracking (optional, set `SENTRY_DSN`)
- Swagger API docs at `/api-docs` (dev mode)
- Docker health checks with auto-restart on failure

---

## Data Model Summary

**203 models** organized by domain:

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
| Compliance | 10+ | AuditTrail, SecurityEvent, TokenBlacklist, Session, Consent, DataSubjectRequest, RetentionPolicy, DataBreach, ProcessingActivity, ChangeRecord |
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
| Password | `Coheron@2025!` |

Demo data includes sample partners, products, leads, sale orders, invoices, manufacturing orders, campaigns, and employees.

---

## Technical Specifications

| Spec | Value |
|------|-------|
| API Endpoints | 100 route files |
| Frontend Components | 150+ React components |
| Database Models | 203 Mongoose schemas |
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
