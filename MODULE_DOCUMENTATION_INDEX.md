# Coheron ERP - Module Documentation Index

This document provides a comprehensive index of all module documentation, specifications, and implementation guides for the Coheron ERP system.

---

## Overview

The Coheron ERP system consists of multiple integrated modules covering CRM, Sales, Inventory, Accounting, Manufacturing, HR, POS, Projects, Marketing, Support, and Website functionality.

---

## Core Business Modules

### CRM Module
- **Status**: ✅ Implemented
- **Description**: Customer relationship management, leads, opportunities, contacts
- **Documentation**: See CRM-related files in codebase

### Sales Module
- **Status**: ✅ Implemented
- **Description**: Sales orders, quotations, sales pipeline management
- **Documentation**: See Sales-related files in codebase

### Inventory Module
- **Status**: ✅ Implemented
- **Description**: Stock management, warehouses, inventory tracking
- **Documentation**: 
  - `INVENTORY_MODULE_SPECIFICATION.md`

### Accounting Module
- **Status**: ✅ Implemented
- **Description**: Invoices, payments, financial reporting, chart of accounts
- **Documentation**: See Accounting-related files in codebase

---

## Specialized Modules

### Manufacturing Module
- **Status**: ✅ Implemented
- **Description**: Bill of Materials (BOM), production orders, work centers
- **Documentation**: See Manufacturing-related files in codebase

### HR Module
- **Status**: ✅ Implemented
- **Description**: Employee management, attendance, payroll, recruitment
- **Documentation**: 
  - `HRIS_IMPLEMENTATION_STATUS.md`
  - `HRIS_COMPLETION_SUMMARY.md`
  - `HRIS_MAPPING.md`

### POS Module
- **Status**: ✅ Implemented
- **Description**: Point of Sale for retail stores, FMCG outlets, service centers
- **Documentation**: 
  - `POS_MODULE_FEATURES.md`
  - `POS_MODULE_PRICING.md`
  - `POS_MODULE_TECHNICAL_SPEC.md`

---

## Supporting Modules

### Projects Module
- **Status**: ✅ Implemented
- **Description**: Project management, tasks, time tracking, resource allocation
- **Documentation**: 
  - `PROJECTS_MODULE_IMPLEMENTATION.md`
  - `PROJECTS_MODULE_NEXT_STEPS.md`
  - `PROJECTS_MODULE_RESOLVED.md`

### Marketing Module
- **Status**: ✅ Implemented
- **Description**: Campaign management, email marketing, lead generation
- **Documentation**: 
  - `MARKETING_MODULE_COMPLETE.md`
  - `MARKETING_CAMPAIGN_IMPLEMENTATION.md`

### Support Module
- **Status**: ✅ Implemented
- **Description**: Help desk, ticket management, customer support
- **Documentation**: 
  - `SUPPORT_DESK_COMPLETE.md`
  - `SUPPORT_DESK_IMPLEMENTATION.md`

### Website Module
- **Status**: 📋 Specification Complete
- **Description**: Built-in website/CMS and e-commerce storefront integrated with ERP
- **Documentation**: 
  - `WEBSITE_MODULE_SPECIFICATION.md` - Complete feature specification
  - `WEBSITE_MODULE_TECHNICAL_ARCHITECTURE.md` - Technical architecture and design
  - `WEBSITE_MODULE_USER_STORIES.md` - User stories and implementation tickets
  - `WEBSITE_MODULE_DATABASE_SCHEMA.md` - Database schema and ERD
  - `WEBSITE_MODULE_IMPLEMENTATION.md` - Implementation status (if exists)

---

## Module Documentation by Type

### Specifications
- `INVENTORY_MODULE_SPECIFICATION.md`
- `WEBSITE_MODULE_SPECIFICATION.md`
- `POS_MODULE_TECHNICAL_SPEC.md`

### Technical Architecture
- `WEBSITE_MODULE_TECHNICAL_ARCHITECTURE.md`
- `POS_MODULE_TECHNICAL_SPEC.md` (includes architecture)

### Database Schemas
- `WEBSITE_MODULE_DATABASE_SCHEMA.md`
- `coheron-works-api/src/database/schema.sql` (main ERP schema)

### User Stories & Tickets
- `WEBSITE_MODULE_USER_STORIES.md`

### Implementation Status
- `WEBSITE_MODULE_IMPLEMENTATION.md`
- `PROJECTS_MODULE_IMPLEMENTATION.md`
- `MARKETING_MODULE_COMPLETE.md`
- `SUPPORT_DESK_IMPLEMENTATION.md`
- `HRIS_IMPLEMENTATION_STATUS.md`

### Pricing Documentation
- `MODULE_PRICING_SUMMARY.md` - Quick reference guide
- `MODULE_PRICING_STRATEGY.md` - Detailed pricing strategy
- `PRICING_INR_COMPLETE.md` - Complete INR pricing guide
- `PRICING_STRATEGY.md` - Overall pricing strategy
- `PRICING_COST_OPTIMIZATION.md` - Cost optimization guide
- `POS_MODULE_PRICING.md` - POS-specific pricing

---

## Website Module Documentation

The Website Module is a comprehensive CMS and e-commerce solution. Complete documentation is available:

### 📋 Specification
**File**: `WEBSITE_MODULE_SPECIFICATION.md`

Complete feature specification including:
- Purpose & goals
- Target users
- MVP scope
- Roadmap (v1-v3)
- Key features (detailed)
- Data model
- Integrations
- Roles & permissions
- API examples
- UI pages & UX flows
- Non-functional requirements
- Acceptance criteria
- KPIs/metrics
- Tech stack
- Risks & mitigations

### 🏗️ Technical Architecture
**File**: `WEBSITE_MODULE_TECHNICAL_ARCHITECTURE.md`

Technical architecture document covering:
- System architecture diagrams
- Technology stack
- API architecture
- Frontend architecture
- Integration architecture
- Security architecture
- Deployment architecture
- Performance & scalability
- Data flow diagrams
- Component diagrams

### 📝 User Stories
**File**: `WEBSITE_MODULE_USER_STORIES.md`

User stories organized by epic:
- Epic 1: Site Management & Configuration
- Epic 2: Content Management
- Epic 3: E-commerce Core
- Epic 4: Payments & Shipping
- Epic 5: Promotions & Marketing
- Epic 6: Forms & Lead Management
- Epic 7: Admin & Management
- Epic 8: Headless & APIs
- Epic 9: Performance & Optimization
- Epic 10: Compliance & Security

Total: 219 story points (MVP: 171 points)

### 🗄️ Database Schema
**File**: `WEBSITE_MODULE_DATABASE_SCHEMA.md`

Complete database schema including:
- Site management tables
- Content management tables
- E-commerce tables
- Marketing tables
- Forms tables
- Integration tables
- Analytics tables
- Audit tables
- Entity relationship diagrams
- Indexes & performance considerations
- Migration scripts

---

## Quick Links

### Getting Started
- `QUICK_START.md` - Quick start guide
- `BACKEND_SETUP.md` - Backend setup instructions
- `BACKEND_README.md` - Backend documentation
- `coheron-works-api/README.md` - API documentation
- `coheron-works-api/DATABASE_SETUP_INSTRUCTIONS.md` - Database setup

### Implementation Status
- `SPRINT_PLANNING.md` - Sprint planning
- `SPRINT_1_PROGRESS.md` - Sprint progress
- `SPRINT_COMPLETION_SUMMARY.md` - Sprint summaries
- `INTEGRATION_COMPLETE.md` - Integration status
- `BACKEND_FRONTEND_INTEGRATION_STATUS.md` - Integration status

### Development Guides
- `PAGE_FUNCTIONALITY_SUMMARY.md` - Page functionality
- `UI_OPTIMIZATION_COMPLETE.md` - UI optimization
- `MIGRATION_COMPLETE.md` - Migration status

---

## Module Pricing Reference

For pricing information, see:
- `MODULE_PRICING_SUMMARY.md` - Quick reference
- `PRICING_INR_COMPLETE.md` - Complete INR pricing

**Website Module Pricing:**
- Standalone: $25 base + $5/user (USD) | ₹2,088 base + ₹418/user (INR)
- Example (5 users): $50/month | ₹4,178/month
- Example (10 users): $75/month | ₹6,258/month
- Add-on (for plan customers): 30-40% discount

---

## Documentation Standards

### Specification Documents
Should include:
- Purpose & goals
- Target users
- MVP scope
- Feature list
- Data model
- Integrations
- API examples
- Acceptance criteria

### Technical Architecture Documents
Should include:
- System architecture
- Technology stack
- Database schema
- API design
- Security considerations
- Deployment strategy

### Implementation Documents
Should include:
- Current status
- Completed features
- Pending items
- Known issues
- Next steps

---

## Contributing to Documentation

When adding new module documentation:

1. **Create specification document** following the format of existing specs
2. **Create technical architecture document** if module is complex
3. **Create user stories document** for implementation planning
4. **Create database schema document** if new tables are required
5. **Update this index** to include new documentation
6. **Update pricing documents** if pricing is defined

---

## Document Version

- **v1.0** - Initial module documentation index
- Last updated: [Current Date]

---

## Notes

- All documentation is in Markdown format
- Technical specifications should be kept up-to-date with implementation
- User stories should be converted to tickets in issue tracking system
- Database schemas should be version-controlled with migrations

