# Coheron ERP

A modern, modular Enterprise Resource Planning platform built with React 19, Express, MongoDB, and TypeScript.

## Architecture

```
CoheronERP/
├── coheron-works-api/    # Express + MongoDB backend
├── coheron-works-web/    # React 19 + Vite frontend
```

## Modules

| Module | Status | Description |
|--------|--------|-------------|
| **Sales** | Stable | Orders, pricing rules, commissions, ATP, subscriptions |
| **Inventory** | Stable | Multi-warehouse, wave picking, cross-docking, GRN, batch/serial |
| **Accounting** | Stable | Double-entry GL, AP/AR, GST/TDS, budgeting, consolidation |
| **HR** | Stable | Employees, recruitment, leave, attendance, payroll, benefits |
| **Projects** | Stable | Agile/Gantt, milestones, timesheets, risk management |
| **Support** | Stable | Omnichannel ticketing, ITSM, knowledge base, SLA automation |
| **Manufacturing** | Stable | BOM, MRP, PLM, quality control, routing, kanban |
| **CRM** | Beta | Pipelines, leads, automation — AI scoring still in progress |
| **Marketing** | Beta | Campaigns, journeys, email/SMS — analytics limited |
| **POS** | Beta | Transactions, loyalty, kitchen display — offline/payments limited |
| **E-Signature** | Preview | Document signing scaffolding |
| **Platform** | Preview | API/webhook management, workflows in progress |
| **Compliance** | Preview | Frontend-only audit/GDPR scaffolding, no backend yet |
| **AI** | Preview | Chatbot/copilot stubs with LLM integration hooks |

*eCommerce is integrated into the Sales module via ECommerceChannel.*

**Status key:** Stable = full feature set, Beta = core features working but incomplete, Preview = scaffolded / early

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

## Security

- JWT-based authentication with optional two-factor (TOTP)
- Role-based access control (RBAC) with granular per-module permissions
- Per-tenant data isolation via tenant-scoped queries
- Audit logging for admin actions
- Non-root Docker container in production

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

After seeding, see `.env.example` for default admin credentials.

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

## Deployment

### Docker (Local Dev)

```bash
docker compose up --build
```

This uses `docker-compose.yml` which builds the image locally from the `Dockerfile`.

### Production (CI/CD via GitHub Actions)

Production deploys are automated. Pushing to `main` triggers the GitHub Actions workflow (`.github/workflows/deploy.yml`) which:

1. Builds the Docker image on GitHub's runners
2. Pushes it to `ghcr.io/recon-x2025/coheron-erp:latest`
3. SSHs into the Vultr VPS and runs `docker pull` + `docker compose up -d`

The VPS uses `docker-compose.prod.yml` which pulls the pre-built image instead of building locally (avoids OOM on the 512MB VPS).

#### Required GitHub Secrets

Add these in **Repo → Settings → Secrets and variables → Actions**:

| Secret | Value |
|--------|-------|
| `VULTR_SSH_KEY` | Private SSH key for `root@<server-ip>` |
| `VULTR_HOST` | Server IP address |

#### First-Time Server Setup

Copy the production compose file to the server:

```bash
scp docker-compose.prod.yml root@<server-ip>:/root/CoheronERP/
```

Ensure `.env` exists on the server with the required environment variables.

#### Health Check

```
GET /health → {"status":"ok"}
```

## License

Proprietary — Coheron Tech
