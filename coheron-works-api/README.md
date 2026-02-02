# Coheron ERP Backend API

Full-featured ERP backend built with Node.js, Express, MongoDB, Redis/BullMQ, and TypeScript.

## Prerequisites

- Node.js 18+
- MongoDB 6+
- Redis 7+ (for job queues, event bus, caching)
- npm

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your MongoDB URI, Redis URL, JWT secret, etc.
```

### 3. Initialize Database

```bash
npm run init-db
```

### 4. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## Architecture

```
src/
├── modules/           # Feature modules (16 modules, 207+ route paths)
│   ├── accounting/    # Chart of accounts, journals, GST, e-invoice, bank feeds
│   ├── admin/         # Auth, RBAC, SSO, 2FA, data import, studio
│   ├── ai/            # Copilot, chatbot, AI config
│   ├── crm/           # Leads, deals, pipelines, CPQ, forecasting, automation
│   ├── crossmodule/   # Files, payments, PDF, email/WhatsApp webhooks
│   ├── esignature/    # Electronic signatures
│   ├── hr/            # Employees, ATS, attendance, leave, payroll, LMS, lifecycle
│   ├── inventory/     # Stock, purchases, batches, serial numbers, RFID, shipping
│   ├── manufacturing/ # BOM, routing, MRP, quality, costing, scheduling, IoT
│   ├── marketing/     # Campaigns, journeys, email builder, SMS, social, A/B testing
│   ├── platform/      # Dashboards, workflows, integrations, orchestration, compliance
│   ├── pos/           # POS orders, payments, loyalty, kitchen display, multi-store
│   ├── projects/      # Tasks, agile, Gantt, OKRs, resources, risk management
│   ├── sales/         # Orders, invoices, quotations, subscriptions, pricing engine
│   ├── support/       # Tickets, ITSM, knowledge base, live chat, field service, SLA
│   └── website/       # CMS pages, e-commerce, cart, promotions
├── models/            # Mongoose schemas
├── services/          # Business logic services
├── orchestration/     # Event-driven orchestration layer
│   ├── EventBus.ts          # Publish/subscribe with BullMQ backing
│   ├── SagaOrchestrator.ts  # Multi-step saga engine with compensation
│   ├── ApprovalService.ts   # Human-in-the-loop approval gates
│   ├── handlers/             # Event handlers (workflow, notification, webhook bridges)
│   ├── sagas/                # Saga definitions
│   │   ├── orderToDeliverySaga.ts
│   │   ├── procureToPaySaga.ts
│   │   └── templates/        # Industry-standard saga templates
│   │       ├── orderToCashSaga.ts
│   │       ├── makeToStockSaga.ts
│   │       ├── hireToRetireSaga.ts
│   │       └── issueToResolutionSaga.ts
│   └── gateway/              # External integration layer
│       ├── InboundWebhookRouter.ts   # Razorpay, Shiprocket, Cashfree, Delhivery, GST
│       ├── WebhookDispatcher.ts      # Outbound webhooks with HMAC signing
│       ├── PollingAdapter.ts         # External data source polling
│       └── CircuitBreaker.ts         # Fault tolerance
├── jobs/              # BullMQ queues and workers
├── shared/            # Utilities, middleware, validators
└── database/          # DB initialization scripts
```

## Modules

| Module | Routes | Key Features |
|--------|--------|-------------|
| **Accounting** | 21 | Chart of accounts, journal entries, GST returns, e-invoicing, bank reconciliation, cost centers, currency revaluation, budgeting, consolidation |
| **Admin** | 13 | Auth, SSO (OAuth/SAML), 2FA, RBAC, data import, no-code studio, tenant config |
| **AI** | 4 | AI copilot, chatbot, configurable AI providers |
| **CRM** | 14 | Lead management, deal pipelines, CPQ, forecasting, automation flows, AI scoring, RFM analysis |
| **HR** | 19 | Employees, ATS, attendance, leave, payroll (India statutory), LMS, appraisals, lifecycle, biometric |
| **Inventory** | 20 | Stock management, purchase orders, batch/serial tracking, RFID, shipping, landed cost, cycle counting, demand planning |
| **Manufacturing** | 21 | BOM, routing, MRP/MPS, work orders, quality control, costing, scheduling, IoT, PLM |
| **Marketing** | 17 | Campaigns, journey builder, email/SMS, social media, A/B testing, attribution, SEO |
| **Platform** | 18 | Dashboards, workflows, orchestration, webhooks, custom fields, i18n, GDPR/DSAR, marketplace |
| **POS** | 10 | Point of sale, payment gateways, offline sync, loyalty, kitchen display, multi-store |
| **Projects** | 20 | Task management, agile/scrum, Gantt, OKRs, resource planning, risk management, bug lifecycle |
| **Sales** | 20 | Orders, invoices, quotations, subscriptions, pricing engine, commissions, dropship, ATP |
| **Support** | 20 | Helpdesk, ITSM, knowledge base, live chat, omnichannel, field service, SLA management, AI auto-response |
| **Website** | 7 | CMS, e-commerce storefront, cart, promotions, media library |

## Orchestration Layer

Event-driven architecture with saga orchestration for cross-module business processes.

### Event Bus
- BullMQ-backed publish/subscribe with 3 retries and exponential backoff
- Redis SETNX idempotency (exactly-once delivery)
- Tenant-aware handler routing with per-tenant skip lists
- Event versioning for schema evolution
- Automatic audit trail via `DomainEventLog`

### Saga Orchestrator
- Sequential multi-step execution with persistent state
- Automatic compensation (reverse rollback) on failure
- Human-in-the-loop approval gates with timeout/escalation
- Tenant-aware saga filtering via `enabled_sagas` config
- Crash recovery from `SagaInstance` persistence

### Pre-Built Sagas

| Saga | Trigger | Steps |
|------|---------|-------|
| **Order to Delivery** | Sale order confirmed | Reserve stock → Create picking tasks |
| **Procure to Pay** | PO approved | Create GRN → Manager approval → Create vendor bill |
| **Order to Cash** | Quotation converted | Confirm order → Reserve inventory → Pick → Deliver → Invoice |
| **Make to Stock** | MO started | Validate BOM → Reserve materials → Issue → QC approval → Receive goods |
| **Hire to Retire** | Employee onboarded | Setup payroll → Manager approval → Assign assets → Create access → Notify team |
| **Issue to Resolution** | Ticket created | Auto-assign agent → Set SLA deadlines → Resolution approval → Resolve → Send survey |

### External Gateway
- **Inbound webhooks**: Razorpay, Shiprocket, Cashfree, Delhivery, GST Portal, generic (HMAC signature verification)
- **Outbound webhooks**: HMAC-SHA256 signed dispatch with delivery logging and secret rotation
- **Polling adapter**: Configurable external source polling with dedup and circuit breaker
- **Circuit breaker**: Fault tolerance for all external calls

### Admin API

`GET/POST /api/platform/orchestration/...`

- `/events` — Recent events, stats, metrics, correlation trace
- `/dlq` — Dead-letter queue with retry capability
- `/sagas` — Saga instances with step-by-step flow visualization
- `/approvals` — Pending approval gates with decide endpoint
- `/webhooks` — Outbound webhook CRUD, secret rotation, delivery logs
- `/webhooks/inbound/:provider` — Inbound webhook receiver
- `/tenant-config` — Per-tenant orchestration configuration
- `/health` — Queue depths, worker status, saga/approval counts

## Testing

```bash
npm test              # Run tests
npm run test:watch    # Watch mode
```

## Production

1. Set proper environment variables (MongoDB URI, Redis URL, JWT_SECRET)
2. Use a replica set MongoDB instance
3. Enable TLS for all connections
4. Configure CORS and rate limiting
5. Use a process manager (PM2, systemd, Docker)

## Tech Stack

- **Runtime**: Node.js 18+ / TypeScript (ESM)
- **Framework**: Express 4
- **Database**: MongoDB (Mongoose ODM)
- **Job Queue**: Redis + BullMQ
- **Auth**: JWT + bcrypt, SSO (OAuth2/SAML), 2FA (TOTP)
- **Observability**: Pino logger, Sentry
- **File Storage**: S3-compatible
- **PDF**: PDFKit
- **Validation**: Zod
- **Testing**: Vitest
