# Coheron ERP — Phase 2: General Availability Criteria

This document defines what must be true before Coheron ERP can move from pilot to GA (General Availability) and begin charging production customers.

---

## Module Graduation Criteria

### Preview → Beta

A module moves from Preview to Beta when:

- [ ] Core data models and API endpoints are implemented and functional
- [ ] Primary user workflow can be completed end-to-end (not just UI scaffolding)
- [ ] Backend logic exists for all major CRUD operations
- [ ] Basic validation and error handling are in place
- [ ] At least one pilot user has tested the core workflow successfully

### Beta → Stable

A module moves from Beta to Stable when:

- [ ] All documented features for the module are implemented and functional
- [ ] Known limitations from the Beta phase are resolved
- [ ] Edge cases and error paths are handled gracefully
- [ ] Performance meets platform-wide benchmarks (see below)
- [ ] Module has been used in production-like conditions by pilot users for at least 2 weeks without critical bugs
- [ ] API endpoints have input validation, proper error responses, and are documented

---

## Per-Module GA Readiness

### Currently Stable — Must Maintain

| Module | GA Requirement |
|--------|---------------|
| Sales | No P0/P1 bugs. ATP, subscriptions, and eCommerce channel validated by pilot users. |
| Inventory | No P0/P1 bugs. Multi-warehouse, batch/serial, GRN workflows validated. |
| Accounting | No P0/P1 bugs. GST/TDS calculations verified. Consolidation tested with multi-entity data. |
| HR | No P0/P1 bugs. Payroll calculations verified against sample data. |
| Projects | No P0/P1 bugs. Gantt/Agile views and timesheet flows validated. |
| Support | No P0/P1 bugs. SLA automation tested under realistic ticket volumes. |
| Manufacturing | No P0/P1 bugs. MRP planning and BOM accuracy validated. |

### Must Graduate to Stable for GA

| Module | Current | Gap to Close |
|--------|---------|-------------|
| CRM | Beta | AI lead scoring must either ship or be cleanly removed from UI. Pipeline and automation must be bug-free. |
| Marketing | Beta | Analytics must provide at minimum: delivery, open, click, and conversion metrics. Journey builder must handle failure/retry. |
| POS | Beta | Offline mode must work for basic transactions. At least one payment gateway must be fully integrated. |

### Not Required for GA (Remain Preview)

| Module | Reason |
|--------|--------|
| E-Signature | Nice-to-have. Can ship post-GA as an add-on. |
| Platform | API/webhook management is internal tooling. Can mature independently. |
| Compliance | Requires legal review and real regulatory mapping. Not blocking initial GA for non-regulated industries. |
| AI | LLM features are evolving rapidly. Better to ship post-GA with a solid integration rather than rush. |

---

## Platform-Wide Requirements

All of the following must be met before GA:

### Performance
- [ ] Page load time under 3 seconds on standard broadband
- [ ] API response time under 500ms for typical CRUD operations (p95)
- [ ] System handles at least 50 concurrent users per tenant without degradation
- [ ] Background jobs (MRP, payroll, reports) complete without timeout for datasets up to 10,000 records

### Security
- [ ] All OWASP Top 10 vulnerabilities addressed
- [ ] JWT tokens expire and refresh correctly
- [ ] Two-factor authentication works reliably
- [ ] Tenant data isolation verified — no cross-tenant data leakage
- [ ] Secrets management: no credentials in source code or client bundles
- [ ] Rate limiting on authentication and public API endpoints
- [ ] Penetration test completed by an independent party (or thorough internal review documented)

### Reliability
- [ ] Automated database backups running on schedule
- [ ] Health check endpoint (`/health`) monitored with alerting
- [ ] Deployment pipeline tested: rollback procedure documented and verified
- [ ] Error tracking in place (e.g., Sentry or equivalent) with alerts for server errors

### Documentation
- [ ] API documentation covers all public endpoints with request/response examples
- [ ] User-facing help documentation for all Stable modules
- [ ] Admin guide covering tenant setup, RBAC configuration, and module enablement
- [ ] Deployment and operations runbook for infrastructure team

### Support Readiness
- [ ] Support team trained on all Stable and Beta modules
- [ ] SLA defined and published: response times for P0 (critical), P1 (high), P2 (medium), P3 (low)
- [ ] Escalation path documented: support → engineering → on-call
- [ ] Customer-facing status page or incident communication channel established

### Billing & Legal
- [ ] Billing integration tested: plan subscription, upgrades, downgrades, cancellation
- [ ] Terms of service and privacy policy reviewed by legal
- [ ] Data processing agreement (DPA) available for enterprise customers
- [ ] Pricing validated against pilot feedback — no surprises at launch

---

## Summary: GA Go/No-Go Checklist

Before flipping the switch to GA, all of the following must be true:

- [ ] All 7 Stable modules have zero P0/P1 bugs
- [ ] CRM, Marketing, and POS have graduated to Stable
- [ ] Platform-wide performance benchmarks met
- [ ] Security review completed with no critical findings open
- [ ] Documentation package complete (API, user, admin, ops)
- [ ] Support SLAs defined and team is trained
- [ ] Billing integration tested end-to-end
- [ ] Legal sign-off on terms, privacy policy, and DPA
- [ ] At least 3 pilot customers have validated core workflows without blockers
