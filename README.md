# Coheron ERP

A modern, modular Enterprise Resource Planning platform built with React 19, Express, MongoDB, and TypeScript.

## Architecture

```
CoheronERP/
├── coheron-works-api/    # Express + MongoDB backend
├── coheron-works-web/    # React 19 + Vite frontend
```

## Modules (15)

| Module | Description |
|--------|-------------|
| **CRM** | Pipeline management, lead scoring, customer 360, territory rules |
| **Sales** | Quotations, orders, invoicing, pricing rules, forecasting |
| **Inventory** | Multi-warehouse, barcode, stock reservations, GRN, batch/serial |
| **Accounting** | Double-entry GL, AP/AR, GST/TDS, bank reconciliation, fixed assets |
| **HR** | Employees, recruitment (ATS), leave, attendance, payroll, appraisals |
| **Projects** | Kanban/Gantt, milestones, timesheets, budgets, inspections |
| **Support** | Tickets, SLA, live chat, knowledge base, CSAT surveys |
| **Marketing** | Campaigns, email designer, automation workflows, RFM analysis |
| **Manufacturing** | BOM, MRP, manufacturing orders, routing, quality checklists, costing |
| **POS** | Touch point-of-sale, payments, receipt printing |
| **eCommerce** | Online store, product catalog, cart, checkout, promotions |
| **E-Signature** | Digital signing, audit trail, signer management |
| **Platform** | No-code studio, extensions, custom apps, API access |
| **Compliance** | Compliance frameworks, policy management, incident tracking |
| **AI** | AI assistant, predictive analytics, smart automation |

## Pricing & Packages

### Tiered Plans

| Plan | Modules | Price | Users |
|------|---------|-------|-------|
| Starter | CRM, Sales, Support | ₹2,999/mo | Up to 5 |
| Business | CRM, Sales, Support, Inventory, Accounting, HR, Projects | ₹7,999/mo | Up to 25 |
| Enterprise | All 14 modules | ₹14,999/mo | Unlimited |

### Industry Bundles

| Bundle | Price/mo |
|--------|----------|
| Retail & eCommerce | ₹9,999 |
| Manufacturing | ₹11,999 |
| Professional Services | ₹8,999 |
| Healthcare | ₹10,999 |
| Education | ₹6,999 |
| Hospitality | ₹9,999 |

### À La Carte

Individual modules available from ₹699–₹2,499/user/month with an interactive module picker on the pricing page.

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, React Router 7, Lucide Icons

**Backend:** Node.js, Express, TypeScript, MongoDB (Mongoose), Socket.IO, JWT auth

**Key Features:**
- Multi-tenant architecture with per-tenant module enablement
- RBAC with granular permissions
- Real-time module hot-toggle via WebSockets
- Two-factor authentication & SSO
- Data import/export
- AI-powered assistant add-on
- PWA support

## Brand

The Coheron logo features two intertwined circles representing connection and coherence.

- **Trust Blue:** #4169E1
- **Turquoise:** #03E1AC
- Logo component: `src/components/brand/CoheronLogo.tsx`
- Static SVGs: `src/assets/brand/`

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB 6+

### Backend

```bash
cd coheron-works-api
npm install
cp .env.example .env   # configure MongoDB URI, JWT_SECRET
npm run dev
```

### Frontend

```bash
cd coheron-works-web
npm install
npm run dev
```

### Default Credentials

After seeding: `admin@coheron.com` / `admin123`

## Admin

- `/admin` — Admin portal
- `/admin/roles` — RBAC role management
- `/admin/permissions` — Permission management
- `/admin/plan-manager` — Pricing plans & module prices CRUD
- `/admin/import` — Data import
- `/admin/audit` — Audit logs

## API Highlights

| Endpoint | Description |
|----------|-------------|
| `GET /pricing-plans` | List active pricing plans (public) |
| `GET /pricing-plans/by-type/:type` | Filter by tier/industry/addon |
| `GET /module-prices` | List module à la carte prices (public) |
| `POST /tenant-config/subscribe-plan` | Apply plan modules to tenant |
| `POST /tenant-config/add-modules` | À la carte add modules |
| `POST /tenant-config/remove-modules` | Remove modules |

See `coheron-works-api/README.md` for full API endpoint listing.

## License

Proprietary — Coheron Tech
