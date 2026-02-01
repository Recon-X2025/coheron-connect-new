# Coheron ERP — Pilot Success Definition

**Purpose:** Align the team on what "a successful pilot" means before we start measuring.

---

## Pilot Objective

Validate that Coheron ERP can replace existing tools for core business workflows across Sales, Inventory, Accounting, HR, Projects, Support, and Manufacturing — and that Beta modules (CRM, Marketing, POS) are viable enough to graduate to Stable before GA.

## Time Frame

8 weeks from first pilot customer onboarding.

## Success Criteria

### 1. Adoption

- At least 3 pilot customers actively using the platform by week 2.
- At least 80% of invited users at each customer have logged in by week 4.
- Each customer uses a minimum of 3 Stable modules in their daily operations.

### 2. Functional Completeness

- All Stable module test checklist items pass (see `pilot-test-checklist.md`).
- CRM, Marketing, and POS core workflows complete without blockers.
- No end-to-end workflow (lead → order → invoice → payment) is broken.

### 3. Reliability

- Zero P0 (system-down) incidents lasting more than 1 hour.
- Fewer than 5 P1 (major feature broken) bugs open at any point.
- All P1 bugs resolved within 48 hours of report.

### 4. User Satisfaction

- Average feedback score of 3.5 / 5 or higher across all modules (see `pilot-feedback-rubric.md`).
- No module scores below 2.5 / 5 on any dimension.
- At least 2 of 3 pilot customers say they would continue using the platform.

### 5. Performance

- Page loads under 3 seconds (p95) throughout the pilot.
- No reported timeouts during normal business-hours usage.

### 6. Beta Module Progress

- CRM: AI scoring either shipped or cleanly removed; pipeline automation bug-free.
- Marketing: Analytics delivers open/click/conversion metrics.
- POS: At least one payment gateway fully integrated; offline mode functional for basic sales.

## What Failure Looks Like

The pilot is considered unsuccessful if any of the following are true at the end of 8 weeks:

- Fewer than 2 customers are actively using the platform.
- Any Stable module has unresolved P0/P1 bugs.
- Average user satisfaction is below 3.0 / 5.
- No Beta module has made measurable progress toward Stable.

## Decision Point

At the end of week 8, leadership reviews pilot data against these criteria and makes a go/no-go decision for Phase 2 (GA preparation). The decision and reasoning are documented and shared with the full team.

---

*This is an internal alignment document. Share with engineering, product, and leadership. Do not distribute to pilot customers.*
