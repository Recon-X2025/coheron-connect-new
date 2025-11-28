# Website Module - Technical Architecture Document

## Executive Summary

This document outlines the complete technical architecture for the Website/CMS and E-commerce module within the Coheron ERP system. The module provides a built-in website builder, content management system, and storefront tightly integrated with ERP master data.

**Module Status**: Specification Complete  
**Target**: Enterprise-grade Website/CMS with full e-commerce capabilities

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [System Architecture](#system-architecture)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Architecture](#api-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Integration Architecture](#integration-architecture)
8. [Security Architecture](#security-architecture)
9. [Deployment Architecture](#deployment-architecture)
10. [Performance & Scalability](#performance--scalability)
11. [Data Flow Diagrams](#data-flow-diagrams)
12. [Component Diagrams](#component-diagrams)

---

## Architecture Overview

### High-Level Architecture

The Website module follows a microservices-oriented architecture with clear separation between:
- **Content Management Layer**: Page builder, media management, content publishing
- **E-commerce Layer**: Product catalog, cart, checkout, order processing
- **Integration Layer**: ERP sync, payment gateways, shipping carriers, analytics
- **Presentation Layer**: Public-facing website, admin dashboard, page builder UI

### Design Principles

1. **Separation of Concerns**: Clear boundaries between content, commerce, and integration
2. **Event-Driven Sync**: Real-time synchronization with ERP via webhooks and events
3. **Headless Capability**: REST and GraphQL APIs for headless deployments
4. **Multi-Tenancy**: Support for multiple sites with isolated data
5. **Performance First**: CDN, caching, and edge rendering for optimal performance
6. **Security by Design**: OWASP compliance, PCI considerations, role-based access

---

## System Architecture

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Public Internet / CDN                            │
│                    (Cloudflare / Akamai / AWS CloudFront)                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    Load Balancer / Ingress (K8s)                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │  Public Website │ │  Admin Dashboard │ │  Page Builder   │
        │   (Next.js SSR) │ │   (React SPA)    │ │   (React SPA)   │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        API Gateway / Router                               │
│                    (Rate Limiting, Auth, Routing)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Content API │          │ Commerce API  │          │ Integration  │
│   Service    │          │   Service    │          │   Service    │
└──────────────┘          └──────────────┘          └──────────────┘
        │                           │                           │
        └───────────────────────────┼───────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │   PostgreSQL    │ │      Redis      │ │   S3/MinIO      │
        │   (Primary DB)  │ │   (Cache/Sess)  │ │  (Media Store)  │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
                    │
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         ERP Core System                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Products │  │Inventory │  │  Orders  │  │ Customers│              │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
        │ Payment Gateway │ │ Shipping Carrier│ │  Analytics      │
        │ (Stripe/Adyen)  │ │ (FedEx/UPS)     │ │ (GA/GTM)        │
        └─────────────────┘ └─────────────────┘ └─────────────────┘
```

### Service Layer Breakdown

#### 1. Content API Service
- **Responsibility**: Page management, block system, media library, SEO
- **Endpoints**: `/api/v1/content/*`, `/api/v1/pages/*`, `/api/v1/media/*`
- **Database**: PostgreSQL (content tables)
- **Cache**: Redis (page cache, media metadata)

#### 2. Commerce API Service
- **Responsibility**: Products, cart, checkout, orders, promotions
- **Endpoints**: `/api/v1/products/*`, `/api/v1/cart/*`, `/api/v1/checkout/*`
- **Database**: PostgreSQL (commerce tables)
- **Cache**: Redis (product catalog, cart sessions)

#### 3. Integration Service
- **Responsibility**: ERP sync, webhooks, external integrations
- **Endpoints**: `/api/v1/integrations/*`, `/api/v1/webhooks/*`, `/api/v1/sync/*`
- **Database**: PostgreSQL (sync logs, webhook configs)
- **Queue**: Background job processing for sync operations

---

## Technology Stack

### Backend

**Runtime & Framework:**
- **Node.js** 18+ (LTS)
- **NestJS** or **Express.js** (API framework)
- **TypeScript** (type safety)

**Database:**
- **PostgreSQL** 14+ (primary database)
- **Redis** 7+ (caching, sessions, queues)

**Storage:**
- **S3-compatible storage** (AWS S3, MinIO, DigitalOcean Spaces)
- **Image CDN** (Cloudinary, imgproxy, or vendor CDN)

**Search:**
- **Elasticsearch** 8+ or **OpenSearch** (product search, content search)

**Message Queue (Optional):**
- **RabbitMQ** or **Redis Streams** (for async processing)

### Frontend

**Public Website:**
- **Next.js** 14+ (SSR/ISR for SEO and performance)
- **React** 18+
- **TypeScript**
- **Tailwind CSS** or **CSS Modules**

**Admin Dashboard & Page Builder:**
- **React** 18+ (SPA)
- **TypeScript**
- **React Query** (data fetching)
- **Zustand** or **Redux** (state management)
- **React DnD** or **dnd-kit** (drag-and-drop)

**Editor:**
- **BlockNote** or **Editor.js** (block-based editor)
- **Slate.js** or **Draft.js** (rich text editing)

### Infrastructure

**Containerization:**
- **Docker** (containerization)
- **Kubernetes** (orchestration)

**CDN & Edge:**
- **Cloudflare** or **AWS CloudFront** (CDN)
- **Vercel Edge** or **Cloudflare Workers** (edge functions)

**CI/CD:**
- **GitHub Actions** or **GitLab CI**
- **Docker Registry** (container images)

**Monitoring:**
- **Prometheus** + **Grafana** (metrics)
- **ELK Stack** or **Loki** (logging)
- **Sentry** (error tracking)

**Security:**
- **Let's Encrypt** (SSL certificates)
- **OWASP ZAP** (security scanning)

---

## Database Schema

### Schema Overview

The database schema is organized into logical groups:

1. **Site Management**: Multi-site configuration
2. **Content**: Pages, blocks, media
3. **E-commerce**: Products, categories, cart, orders
4. **Marketing**: Promotions, campaigns
5. **Forms**: Custom forms and submissions
6. **Integrations**: Webhooks, sync logs
7. **Analytics**: Pageviews, events
8. **Audit**: Activity logs

### Key Tables

#### Site Management
- `website_sites` - Site configuration
- `website_themes` - Theme definitions
- `website_domains` - Domain mapping

#### Content
- `website_pages` - Page content and metadata
- `website_blocks` - Reusable block components
- `website_media` - Media library
- `website_page_versions` - Version history

#### E-commerce
- `website_products` - Product catalog (synced from ERP)
- `website_product_variants` - Product variants
- `website_categories` - Category hierarchy
- `website_carts` - Shopping carts
- `website_cart_items` - Cart line items
- `website_orders` - E-commerce orders
- `website_order_items` - Order line items

#### Marketing
- `website_promotions` - Discount codes and rules
- `website_promotion_usage` - Usage tracking

#### Forms
- `website_forms` - Form definitions
- `website_form_submissions` - Form submissions

#### Integrations
- `website_webhooks` - Webhook configurations
- `website_webhook_deliveries` - Delivery logs
- `website_integrations` - Integration settings
- `website_sync_logs` - ERP sync logs

#### Analytics
- `website_pageviews` - Page view tracking
- `website_events` - Custom events

#### Audit
- `website_audit_logs` - Activity audit trail

See `WEBSITE_MODULE_DATABASE_SCHEMA.md` for complete SQL schema.

---

## API Architecture

### API Design Principles

1. **RESTful Design**: Standard HTTP methods and status codes
2. **GraphQL Support**: For headless deployments
3. **Versioning**: `/api/v1/*` prefix
4. **Pagination**: Cursor-based or offset-based
5. **Filtering & Sorting**: Query parameters
6. **Rate Limiting**: Per API key/user
7. **Authentication**: OAuth2, JWT tokens
8. **Documentation**: OpenAPI/Swagger

### API Endpoint Structure

```
/api/v1/
├── sites/
│   ├── GET    /sites                    # List sites
│   ├── POST   /sites                    # Create site
│   ├── GET    /sites/{id}               # Get site
│   ├── PUT    /sites/{id}               # Update site
│   └── DELETE /sites/{id}               # Delete site
│
├── pages/
│   ├── GET    /sites/{siteId}/pages     # List pages
│   ├── POST   /sites/{siteId}/pages     # Create page
│   ├── GET    /pages/slug/{slug}        # Get page by slug (public)
│   ├── GET    /pages/{id}               # Get page
│   ├── PUT    /pages/{id}               # Update page
│   ├── DELETE /pages/{id}               # Delete page
│   └── POST   /pages/{id}/publish       # Publish page
│
├── products/
│   ├── GET    /products                 # List products (public)
│   ├── GET    /products/{sku}           # Get product (public)
│   ├── GET    /products/{sku}/variants  # Get variants
│   └── POST   /products/sync            # Trigger sync (admin)
│
├── cart/
│   ├── POST   /cart                     # Create/update cart
│   ├── GET    /cart/{cartId}            # Get cart
│   ├── POST   /cart/{cartId}/items      # Add item
│   ├── PUT    /cart/{cartId}/items/{id} # Update item
│   └── DELETE /cart/{cartId}/items/{id} # Remove item
│
├── checkout/
│   ├── POST   /checkout                 # Create order
│   ├── GET    /orders/{orderId}         # Get order status
│   └── POST   /orders/{orderId}/cancel  # Cancel order
│
├── webhooks/
│   ├── GET    /webhooks                 # List webhooks
│   ├── POST   /webhooks                 # Create webhook
│   ├── PUT    /webhooks/{id}            # Update webhook
│   └── DELETE /webhooks/{id}            # Delete webhook
│
└── graphql/
    └── POST   /graphql                  # GraphQL endpoint
```

### GraphQL Schema (Sample)

```graphql
type Query {
  site(id: ID!): Site
  page(slug: String!): Page
  products(filter: ProductFilter, pagination: Pagination): ProductConnection
  product(sku: String!): Product
  cart(id: ID!): Cart
}

type Mutation {
  createCart(input: CartInput!): Cart
  addToCart(cartId: ID!, item: CartItemInput!): Cart
  checkout(input: CheckoutInput!): Order
}

type Site {
  id: ID!
  domain: String!
  name: String!
  theme: Theme
  pages: [Page!]!
}

type Page {
  id: ID!
  slug: String!
  title: String!
  blocks: [Block!]!
  seo: SEO
}

type Product {
  sku: String!
  name: String!
  price: Float!
  variants: [ProductVariant!]!
  inventory: Inventory
}
```

---

## Frontend Architecture

### Public Website (Next.js)

**Structure:**
```
pages/
├── _app.tsx              # App wrapper
├── _document.tsx         # HTML document
├── index.tsx             # Homepage
├── [slug].tsx            # Dynamic page routing
├── products/
│   ├── index.tsx         # Product list
│   └── [sku].tsx         # Product detail
├── cart.tsx              # Cart page
└── checkout.tsx          # Checkout page

components/
├── layout/
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── Navigation.tsx
├── blocks/
│   ├── TextBlock.tsx
│   ├── ImageBlock.tsx
│   ├── ProductBlock.tsx
│   └── ...
└── commerce/
    ├── ProductCard.tsx
    ├── Cart.tsx
    └── CheckoutForm.tsx
```

**Rendering Strategy:**
- **SSG** (Static Site Generation) for product pages
- **ISR** (Incremental Static Regeneration) for dynamic content
- **SSR** (Server-Side Rendering) for personalized pages
- **CSR** (Client-Side Rendering) for interactive components

### Admin Dashboard (React SPA)

**Structure:**
```
src/
├── pages/
│   ├── Dashboard.tsx
│   ├── Pages/
│   │   ├── PageList.tsx
│   │   ├── PageEditor.tsx
│   │   └── PageBuilder.tsx
│   ├── Products/
│   │   ├── ProductList.tsx
│   │   └── ProductEditor.tsx
│   ├── Orders/
│   │   └── OrderList.tsx
│   └── Settings/
│       └── SiteSettings.tsx
├── components/
│   ├── PageBuilder/
│   │   ├── Canvas.tsx
│   │   ├── BlockLibrary.tsx
│   │   └── PropertiesPanel.tsx
│   └── ...
└── services/
    ├── api.ts
    └── ...
```

### Page Builder Architecture

**Component Hierarchy:**
```
PageBuilder
├── Toolbar (save, preview, publish)
├── Sidebar
│   ├── BlockLibrary (draggable blocks)
│   └── PropertiesPanel (selected block config)
└── Canvas
    └── BlockRenderer
        ├── TextBlock
        ├── ImageBlock
        ├── ProductBlock
        └── ...
```

**State Management:**
- **Local State**: React hooks for UI state
- **Global State**: Zustand/Redux for page data
- **Persistence**: Auto-save to backend
- **Undo/Redo**: History stack

---

## Integration Architecture

### ERP Integration

**Sync Strategy:**
1. **Event-Driven**: Webhooks from ERP on data changes
2. **Polling**: Periodic sync for reconciliation
3. **Manual**: On-demand sync via admin UI

**Sync Flow:**
```
ERP Event → Webhook → Integration Service → Queue → Sync Job → Database Update → Cache Invalidation
```

**Data Sync:**
- **Products**: SKU, name, price, inventory, attributes
- **Customers**: Email, addresses, groups
- **Orders**: Status updates, shipment tracking
- **Inventory**: Real-time stock levels

### Payment Gateway Integration

**Architecture:**
- **Tokenization**: Never store raw card data
- **PCI Compliance**: Use hosted payment pages or tokenization
- **Multiple Gateways**: Abstraction layer for gateway switching

**Flow:**
```
Checkout → Payment Intent → Gateway API → Token → Order Creation → ERP Order
```

### Shipping Carrier Integration

**Architecture:**
- **Rate Calculation**: Real-time shipping rates
- **Label Generation**: Shipping label creation
- **Tracking**: Status updates via webhooks

**Flow:**
```
Order → Shipping Request → Carrier API → Rates → Selection → Label → Tracking
```

### Analytics Integration

**Supported:**
- Google Analytics 4
- Google Tag Manager
- Facebook Pixel
- Custom event tracking

**Implementation:**
- Server-side tracking (privacy-compliant)
- Client-side tracking (with consent)
- Event forwarding to ERP marketing module

---

## Security Architecture

### Authentication & Authorization

**Authentication:**
- **JWT Tokens**: Stateless authentication
- **OAuth2**: For API access
- **Session Management**: Redis-based sessions

**Authorization:**
- **Role-Based Access Control (RBAC)**: Roles and permissions
- **Resource-Level Permissions**: Per-site, per-page permissions
- **API Keys**: For programmatic access

### Security Measures

**OWASP Top 10 Mitigations:**
1. **Injection**: Parameterized queries, input validation
2. **Broken Authentication**: Strong passwords, rate limiting
3. **Sensitive Data Exposure**: Encryption at rest and in transit
4. **XML External Entities**: Disabled XXE processing
5. **Broken Access Control**: RBAC, resource-level checks
6. **Security Misconfiguration**: Secure defaults, regular audits
7. **XSS**: Content Security Policy, input sanitization
8. **Insecure Deserialization**: Safe deserialization practices
9. **Using Components with Known Vulnerabilities**: Dependency scanning
10. **Insufficient Logging**: Comprehensive audit logs

**Additional Security:**
- **HTTPS**: TLS 1.3 enforcement
- **CSP**: Content Security Policy headers
- **Rate Limiting**: Per IP, per user, per API key
- **CORS**: Configured for allowed origins
- **Input Validation**: Schema validation (Zod, Joi)
- **SQL Injection Prevention**: ORM/query builder usage

### PCI Compliance

**Payment Data Handling:**
- No storage of card numbers, CVV, or full track data
- Tokenization via payment gateway
- PCI DSS Level 1 compliance (if handling payments directly)
- Regular security audits

---

## Deployment Architecture

### Kubernetes Deployment

**Namespace Structure:**
```
website-module/
├── website-api (Deployment)
├── website-frontend (Deployment)
├── website-worker (Deployment - background jobs)
└── Services, Ingress, ConfigMaps, Secrets
```

**Resource Allocation:**
- **API Service**: 2-4 replicas, 512MB-2GB RAM
- **Frontend**: 2-3 replicas, 256MB-512MB RAM
- **Worker**: 1-2 replicas, 512MB-1GB RAM
- **Database**: Managed PostgreSQL (or self-hosted)
- **Redis**: Managed Redis (or self-hosted)

### CI/CD Pipeline

**Stages:**
1. **Build**: Docker image creation
2. **Test**: Unit tests, integration tests
3. **Security Scan**: Vulnerability scanning
4. **Deploy Staging**: Deploy to staging environment
5. **E2E Tests**: End-to-end testing
6. **Deploy Production**: Blue-green or rolling deployment

### Environment Strategy

**Environments:**
- **Development**: Local development
- **Staging**: Pre-production testing
- **Production**: Live environment

**Configuration:**
- Environment variables via ConfigMaps/Secrets
- Feature flags for gradual rollouts
- Database migrations via CI/CD

---

## Performance & Scalability

### Caching Strategy

**Layers:**
1. **CDN**: Static assets, images, pre-rendered pages
2. **Application Cache**: Redis for API responses
3. **Database Query Cache**: Frequently accessed data
4. **Page Cache**: Pre-rendered HTML pages

**Cache Invalidation:**
- Event-driven invalidation on data changes
- TTL-based expiration
- Manual cache clearing via admin

### Scalability Patterns

**Horizontal Scaling:**
- Stateless API services (easy scaling)
- Load balancer distribution
- Database connection pooling

**Vertical Scaling:**
- Database optimization
- Index optimization
- Query optimization

**Performance Targets:**
- **Page Load**: < 2 seconds (95th percentile)
- **API Response**: < 200ms (95th percentile)
- **Database Query**: < 100ms (95th percentile)
- **Cache Hit Rate**: > 80%

### Monitoring & Observability

**Metrics:**
- Request rate, latency, error rate
- Database query performance
- Cache hit/miss rates
- Resource utilization (CPU, memory)

**Logging:**
- Structured logging (JSON)
- Log aggregation (ELK/Loki)
- Error tracking (Sentry)

**Alerting:**
- High error rates
- Performance degradation
- Resource exhaustion
- Integration failures

---

## Data Flow Diagrams

### Page Rendering Flow

```
User Request → CDN Check → Cache Hit? → Return Cached Page
                                    ↓
                              Cache Miss
                                    ↓
                          Next.js Server → Database Query → Render Page → Cache → Return
```

### Order Creation Flow

```
Checkout Form → API Validation → Payment Gateway → Payment Success
                                                          ↓
                                              Create Order in Website DB
                                                          ↓
                                              Create Order in ERP (via API/Webhook)
                                                          ↓
                                              Update Inventory
                                                          ↓
                                              Send Confirmation Email
                                                          ↓
                                              Return Order Confirmation
```

### Product Sync Flow

```
ERP Product Update → Webhook → Integration Service → Validate Data
                                                          ↓
                                              Update Website Product Table
                                                          ↓
                                              Invalidate Product Cache
                                                          ↓
                                              Update Search Index (Elasticsearch)
                                                          ↓
                                              Trigger Re-render (if needed)
```

---

## Component Diagrams

### Content Management Components

```
┌──────────────┐
│ Page Builder │
└──────┬───────┘
       │
       ├─── Block Library
       ├─── Canvas Renderer
       ├─── Properties Editor
       └─── Preview Engine
            │
            └─── Block Components
                 ├── TextBlock
                 ├── ImageBlock
                 ├── ProductBlock
                 └── ...
```

### E-commerce Components

```
┌──────────────┐
│  E-commerce  │
└──────┬───────┘
       │
       ├─── Product Catalog
       ├─── Shopping Cart
       ├─── Checkout Flow
       └─── Order Management
            │
            └─── Payment Gateway
            └─── Shipping Carrier
            └─── ERP Integration
```

---

## Conclusion

This technical architecture provides a solid foundation for building an enterprise-grade Website/CMS and E-commerce module. The architecture emphasizes:

- **Scalability**: Horizontal scaling, caching, CDN
- **Security**: OWASP compliance, PCI considerations
- **Performance**: Sub-2s page loads, efficient APIs
- **Integration**: Seamless ERP integration
- **Flexibility**: Headless capability, multi-site support

The implementation should follow this architecture while adapting to specific requirements and constraints.

---

## Document Version

- **v1.0** - Initial technical architecture document
- Last updated: [Current Date]

