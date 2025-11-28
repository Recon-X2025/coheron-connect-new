# CRM Module – Complete Functional Specification + User Stories + RBAC

---

# 0. Document scope

This document covers: Lead / Contact / Account / Opportunity management, Campaigns, Quotes, Service handoff, Analytics, Mobility, Integrations, Automation, Customer Portal, plus detailed **user stories** for each capability and a full **RBAC** (role-based access control) design (roles, permissions, record/field level rules, examples).

---

# 1. Top-level capabilities (brief)

(Complete enterprise list; same as prior spec but included here for completeness)

* Lead Management
* Contact & Account Management
* Opportunity / Deal Management
* Sales Pipeline & Forecasting
* Marketing & Campaign Management
* Quote & Proposal Management
* Omni-channel Communication & Interaction History
* Task/Activity/Calendar Management
* Support Desk / Service integration
* Partner / Channel Sales management
* Territory management
* Product & Pricing management
* Contract & Renewal management
* Revenue & Sales analytics
* Mobile Sales App
* Integrations & APIs
* Automation Engine / Workflow builder
* Customer Portal
* Security, Audit & Compliance (RBAC, field-level, audit logs)

---

# 2. User stories (exhaustive, grouped by capability)

Format: **As a [role], I want [capability], so that [benefit].** Where useful include acceptance criteria (AC).

## 2.1 Lead Management

1. As a **Marketing Specialist**, I want to capture leads from web forms and landing pages automatically, so that leads enter the CRM without manual entry.

   * AC: lead appears in CRM within 30s of form submit; source and UTM captured.

2. As a **Sales Rep**, I want leads to be assigned to me via territory and round-robin rules, so I know which leads to follow up on.

   * AC: leads matching rep's territory get auto-assigned; assignment history logged.

3. As a **Sales Manager**, I want duplicate detection and merge for leads, so data quality remains high.

   * AC: system detects >85% likely duplicates and suggests merge with changelog.

4. As a **Marketing Specialist**, I want lead scoring based on demographics and behavior, so I can prioritize outreach.

   * AC: scoring model configurable; scores visible on lead record.

5. As a **Sales Rep**, I want lead nurturing sequences (email/SMS/WhatsApp) that pause when lead replies, so we avoid over-contacting.

   * AC: automation pauses on inbound message; next step logged.

## 2.2 Contact & Account Management

6. As a **Customer Success Manager**, I want a 360° profile showing interactions, contracts, invoices, and open tickets, so I can manage accounts effectively.

   * AC: profile shows last 12 months of interactions and linked records in one view.

7. As a **Sales Rep**, I want to map contact roles (decision-maker, influencer), so I can tailor messaging.

   * AC: role tags apply to contacts and are filterable.

8. As a **Data Steward**, I want account hierarchy (parent/child) management, so enterprise customers are modelled correctly.

   * AC: parent/child link visible and reportable.

## 2.3 Opportunity / Deal Management

9. As a **Sales Rep**, I want multi-pipeline support with custom stages, so I can use different flows per product line.

   * AC: pipelines configurable in admin; stage-probabilities used in forecasts.

10. As a **Sales Manager**, I want approvals for discounts above X%, so margins are preserved.

    * AC: discount request triggers approval workflow and blocks quote generation until approved.

11. As a **Finance Analyst**, I want deal-level TCV/ACV fields and multi-currency, so forecasts aggregate correctly.

    * AC: currency conversions use configured FX rates; ACV/TCV computed.

## 2.4 Sales Pipeline & Forecasting

12. As a **Head of Sales**, I want weighted-pipeline monthly forecasts by rep and region, so I can set targets.

    * AC: forecasts update in real-time and show Commit/Best Case/Pipeline.

13. As a **Sales Ops**, I want what-if modeling of deals moved across quarters, so I can test quota impacts.

    * AC: simulation feature with save/restore scenarios.

## 2.5 Marketing & Campaigns

14. As a **Marketing Manager**, I want segmented lists from CRM and campaign attribution reporting, so I can measure ROI.

    * AC: segment criteria saved; attribution supports first/last and multi-touch.

15. As a **Marketing Specialist**, I want email template A/B testing, so I can optimize engagement.

    * AC: A/B split, performance metrics after n opens/clicks.

## 2.6 Quotation & Proposal

16. As a **Sales Rep**, I want a quote-builder that pulls pricing and applies approval rules, so I can generate accurate quotes quickly.

    * AC: quote PDF contains correct pricing matrix and shows approval status.

17. As a **Customer**, I want to e-sign the proposal, so the process is frictionless.

    * AC: signed PDF stored, signature audit trail captured.

## 2.7 Customer Interaction & Omni-channel

18. As a **Sales Rep**, I want all emails, calls, WhatsApp, chat logged to contact timeline automatically, so I don't waste time manual-logging.

    * AC: inbound/outbound synced to timeline with timestamps and transcript link.

19. As a **Support Agent**, I want to create a ticket from the contact timeline, so service issues are tracked.

    * AC: ticket created with link back to contact and initial context.

## 2.8 Tasks, Activities & Calendar

20. As a **Sales Rep**, I want follow-up reminders based on SLA, so I never miss critical touches.

    * AC: reminders trigger notifications; snooze/reschedule available.

21. As a **Manager**, I want activity KPIs (calls, meetings) per rep, so I can coach effectively.

    * AC: dashboards display moving averages and targets.

## 2.9 Partner / Channel

22. As a **Partner Manager**, I want deal registration by partners, so channel conflicts are avoided.

    * AC: deal registration portal with auto-approval or manager review.

23. As a **Partner**, I want a limited partner view to access leads assigned to me, so I can manage my pipeline.

    * AC: partner portal restricts data to partner-registered leads/opps.

## 2.10 Territory Management

24. As a **Sales Ops**, I want territory auto-assignment rules based on ZIP/state/industry, so leads/opps are routed correctly.

    * AC: rules editor supports precedence and fallback assignment.

## 2.11 Product Catalog & Pricing

25. As a **Product Manager**, I want price lists per market and promotions that apply automatically to quotes, so pricing remains consistent.

    * AC: price list effective-dates and eligibility criteria enforced.

## 2.12 Contract & Renewals

26. As an **Account Manager**, I want renewal alerts 90/60/30 days before contract end, so I can engage proactively.

    * AC: renewal tasks auto-created and visible on account timeline.

## 2.13 Analytics & Reporting

27. As a **CRO**, I want dashboards for win-rate, funnel leakage, sales velocity, and forecast accuracy, so I can monitor revenue health.

    * AC: dashboards exportable and filterable by time/region/product.

## 2.14 Mobility

28. As a **Field Sales Rep**, I want offline access to account and lead records and check-in GPS logging, so I can work without network.

    * AC: local cache available; sync when network returns; check-in timestamp + GPS stored.

## 2.15 Integrations & APIs

29. As an **Integration Engineer**, I want webhooks and REST APIs for leads/opps/contacts, so we can sync external systems reliably.

    * AC: API supports pagination, rate limits, OAuth2.

## 2.16 Automation Engine

30. As a **Sales Ops**, I want a no-code workflow builder with triggers (record created/updated, stage change) and actions (email, task, update field), so I can automate processes.

    * AC: workflow history integrated into audit logs.

## 2.17 Customer Portal

31. As a **Customer**, I want to view quotes, invoices, and upload documents, so I can self-serve.

    * AC: portal shows only data for customer accounts linked to login.

---

# 3. RBAC — Roles, Permissions, Policies

## 3.1 Design goals & principles

* Principle of Least Privilege.
* Support role-based + attribute-based + record-level access.
* Auditable changes and separation of duties for sensitive actions (discount approvals, exports).
* Fine-grained: module-level, object-level, field-level, and action-level controls.
* Support temporary elevation and approval workflows.
* Support hierarchical role inheritance (e.g., Sales Manager inherits Sales Rep + extra perms).

## 3.2 Canonical Roles (recommended)

1. **System Admin** — full system access, manage configuration, RBAC, integrations.

2. **Sales Director / Head of Sales** — org-level visibility, forecast approvals, quota management.

3. **Sales Manager** — team-level visibility, reassign leads, approve discounts up to threshold.

4. **Sales Rep** — owns leads/opps assigned to them, create quotes, update stages.

5. **Marketing Manager** — manage campaigns, segments, view lead performance.

6. **Marketing Specialist** — create/send campaigns, view & edit marketing lists.

7. **Customer Success / Support Agent** — access accounts/contacts, create tickets, limited opportunity view.

8. **Finance** — view invoices/quotes, finalize deals, export financial reports.

9. **Partner / Channel User** — limited access to partner-registered leads/opps via portal.

10. **Read-Only Auditor** — view-only across modules for compliance.

11. **Data Steward** — edit master data (accounts, products), run DQ reports.

12. **System Integrator / API Client** — service account with scoped API permissions.

> Note: Roles can be customized per customer but this is a strong starting point.

## 3.3 Permission primitives

* CRUD: Create, Read, Update, Delete.
* ACTIONS: Approve, Export, Merge, Assign, Reassign, Convert (lead→contact/opportunity), Send (emails/sms), Sign (contracts), E-Sign, Generate (PDF), Import, Bulk-Edit, Archive, Restore.
* FIELD-LEVEL: ability to view/edit sensitive fields (e.g., discount_percentage, margin, salary).
* RECORD-LEVEL: Own, Team, Territory, Public, Custom Sharing Rules.

## 3.4 Permission matrix (high-level)

| Role                 |     Leads | Contacts/Accounts |        Opportunities |                   Quotes |   Campaigns |   Tickets |  Products |       Reports/Export | Admin |
| -------------------- | --------: | ----------------: | -------------------: | -----------------------: | ----------: | --------: | --------: | -------------------: | ----: |
| System Admin         |     CRUD* |             CRUD* |                CRUD* |                    CRUD* |       CRUD* |     CRUD* |     CRUD* |                  All |  Full |
| Sales Director       |     R/A** |                 R |                    R |                    R/A** |           R |         R |         R |                  All |     - |
| Sales Manager        | CRUD team |     R/Update team |            CRUD team |        Approve discounts |           R |         R |         R |         Team reports |     - |
| Sales Rep            | C/R/U own |         C/R/U own |            C/R/U own | Create, request discount |    R (read) |    Create |         R |           My reports |     - |
| Marketing Manager    |         R |                 R |                    R |                        R |        CRUD |         R |         R |   Campaign analytics |     - |
| Marketing Specialist |         R |                 R |                    R |                        R | Create/send |         - |         - |     Campaign reports |     - |
| Support Agent        |         R |                 R |             R (view) |                        - |           - |      CRUD |         - |       Ticket reports |     - |
| Finance              |         R |                 R |                    R |                  Approve |           - |         - |         R |    Financial exports |     - |
| Partner              |   C/R own |             R own | C/R own (registered) |                        - |           - |         - |         - |                    - |     - |
| Read-Only Auditor    |         R |                 R |                    R |                        R |           R |         R |         R |                    R |     - |
| Data Steward         |         R |              CRUD |                    R |                        R |           R |         R |      CRUD | Data quality reports |     - |
| Integrator           | API-scope |         API-scope |            API-scope |                API-scope |   API-scope | API-scope | API-scope |              Depends |     - |

* CRUD* implies configuration-level access too.
** A = Approve (e.g., Sales Director can approve quotas and forecasts).

## 3.5 Record-level policies (examples)

* **Ownership**: Records have an owner_id. Owners get full edit rights.
* **Team sharing**: Owner's team has read/write if shared.
* **Territory filter**: Users can only view records in territories they belong to, unless they have higher role.
* **Sensitive fields**: `discount_percentage`, `cost_price`, `salary` are hidden or read-only for roles lacking `FIELD_EDIT_SENSITIVE`.
* **Export controls**: Only `Finance`, `System Admin`, and `Read-Only Auditor` can export leads/contacts in bulk. Export actions logged.
* **Temporary elevation**: Managers can request temporary edit rights for a record; request auto-expire and logged.

## 3.6 Approval workflows & separation of duties

* Discount approvals: thresholds configurable. E.g., <10% auto, 10–25% manager approval, >25% director approval.
* Quote approval: if quote total > X or margin < Y, require procurement/finance approval.
* Export approval: bulk export requests above N records need justification & manager approval.

## 3.7 Field-level security examples

* `deal.margin` — editable only by `Finance`, `System Admin`, `Sales Director`.
* `contact.personal_phone` — visible to Sales/Support; masked for Partner role.
* `lead.raw_source_data` — accessible to `Marketing Manager` and `Data Steward`.

## 3.8 Sample JSON role definition (copy-paste)

```json
{
  "role": "sales_manager",
  "inherits": ["sales_rep"],
  "permissions": {
    "leads": ["read", "create", "update", "assign", "merge"],
    "opportunities": ["read", "create", "update", "approve_discount"],
    "quotes": ["read", "create", "approve_quote"],
    "reports": ["read", "team_reports"],
    "export": ["team_export"],
    "admin_ui": ["view_team_dashboard"]
  },
  "record_level": {
    "scope": "team",
    "territory_restriction": true
  },
  "field_level": {
    "discount_percentage": {"max_edit": 20, "requires_approval": true}
  }
}
```

## 3.9 Sample ACL rules (pseudocode)

```
# Rule: Sales Rep can edit opportunity only if owner_id == current_user OR current_user.role == 'sales_manager' and opportunity.team == current_user.team
allow_update(opportunity) if (
  (opportunity.owner_id == current_user.id) OR 
  (current_user.role in ['sales_manager','sales_director'] AND current_user.team_id == opportunity.team_id)
)

# Rule: Export only for permitted roles and with reason for >1000 rows
allow_export(records) if (
  current_user.role in ['finance','system_admin','auditor'] OR
  (current_user.role == 'sales_manager' AND records.count <= 1000)
)
```

## 3.10 RBAC implementation checklist (engineering)

1. Centralized AuthZ service (microservice / middleware) with policy engine (Rego/Open Policy Agent recommended).
2. Role → Permission → Resource mapping stored in DB (editable via Admin UI).
3. Support hierarchical/inherited roles and temporary elevation tokens.
4. Enforce at API layer and UI layer (defense in depth).
5. Field-level permission checks in data serialization layer.
6. Audit log for all admin actions, approvals, exports, merges.
7. Support attribute-based rules (territory, team, custom tags).
8. Provide role-testing sandbox for admins to simulate user permissions.
9. Provide migration scripts for existing customers to map old roles to new model.

---

# 4. RBAC: Example role-to-permission matrix (detailed CSV-ready)

```
role,resource,action,scope,notes
system_admin,all,all,global,full_system_access
sales_rep,lead,create,own,can create leads
sales_rep,lead,read,own,can read owned leads
sales_rep,lead,update,own,can update owned leads
sales_manager,lead,assign,team,assign leads within team
marketing_manager,campaign,create,global,create campaigns
finance,quote,approve,global,approve quotes for invoicing
partner,opportunity,read,partner_only,read only partner-registered opportunities
auditor,export,read,global,read-only exports permitted for audits
```

---

# 5. RBAC Edge Cases & Governance

* **Cross-team access for escalations**: Temporary tickets for escalation should grant time-boxed view access, logged with reason.
* **Data purging/backup**: Only `System Admin` with approval can purge PII; must record justification.
* **Role changes**: On role change, recalc access tokens and run a background job to verify no orphaned elevated records.
* **Third-party integrations**: Use service accounts with restricted scopes. No personal user credentials in integrations.
* **GDPR / DPDP considerations**: Ability to anonymize/erase user PII; controls on data exports and deletion.

---

# 6. Example user stories specifically for RBAC and security

1. As a **Security Admin**, I want to create roles and map permissions via an Admin UI, so I can update access without code.

   * AC: role created/edited and takes effect immediately for new sessions.

2. As a **Manager**, I want to simulate a subordinate's permissions, so I can validate access for changes.

   * AC: simulation shows allowed/denied actions in < 5s.

3. As a **Compliance Officer**, I want a tamper-evident audit trail for all approvals, exports, and merges, so audits are feasible.

   * AC: every sensitive action logs user, timestamp, old/new values, and reason.

4. As a **Sales Rep**, I want temporary elevation to edit a locked record after manager approval, so I can finish an urgent deal.

   * AC: elevation granted for N hours; auto-expires; logged.

---

# 7. Operational examples & workflows (practical)

## 7.1 Discount approval workflow (RBAC in action)

* Sales Rep creates quote with discount 18% -> System checks `discount_threshold` table -> 18% > 10% and <=25% -> auto-notify Sales Manager(s) -> Manager approves or escalates -> On approval, quote status changes and Finance is notified if margin below threshold. All actions logged.

## 7.2 Territory enforcement

* Lead captured from region Karnataka -> territory rule matches 'South India' -> assign to team SouthSales -> only users in SouthSales or above can view unless record shared.

## 7.3 Partner portal flow

* Partner registers -> Partner Manager approves -> Partner gets portal role with `opportunity:create` and `opportunity:read` scoped to partner-registered leads only -> partner cannot export or view pricing details beyond allowed fields.

---

# 8. Acceptance criteria checklist for Go-Live (security & RBAC focus)

* [ ] Roles and default permission sets created and verified.
* [ ] Field-level restrictions implemented for sensitive fields.
* [ ] Audit logging enabled for admin actions and exports.
* [ ] Approval workflows tested end-to-end (discounts, exports).
* [ ] API tokens / service accounts scoped and rotated.
* [ ] Role simulation tool available in Admin UI.
* [ ] Data sharing/territory rules validated with sample data.
* [ ] Pen test and IAM review complete.

---

# 9. Developer notes: API & UI enforcement examples

* **API**: Every API endpoint must perform an authorization check using centralized policy engine (input: user_id, role, resource, action, record attributes). Return 403 with reason on deny.
* **UI**: Disable/hide UI actions the user is not permitted to perform, but still enforce on API. Show reason tooltips when actions are hidden/blocked.
* **Batch jobs & background processes**: Run as service account with explicit permissions; background tasks that modify records should log acting identity and reason.

---

# 10. Appendix — Useful artifacts to deliver next (I can produce any of these instantly)

* Full CSV of role → permission rows for import.
* JSON policy bundle for OPA (Rego) or another policy engine.
* ERD for CRM entities showing owner_id/team_id/territory_id fields.
* Wireframes for Admin UI (Role editor, Permission matrix, Role simulator).
* Sample audit log schema with fields to capture.

---

