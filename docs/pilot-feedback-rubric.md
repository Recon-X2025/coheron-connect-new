# Coheron ERP — Pilot Feedback Scoring Rubric

**Purpose:** Quantify pilot feedback into a structured score that maps directly to GA readiness decisions.

---

## How to Use This Rubric

1. Each pilot customer scores every module they tested.
2. Scores are collected at week 4 (midpoint) and week 8 (final).
3. Aggregate scores drive the go/no-go decision for GA (see `pilot-success-definition.md`).

---

## Scoring Dimensions

Each module is scored on 5 dimensions. Each dimension uses a 1–5 scale.

| Score | Label | Meaning |
|-------|-------|---------|
| 5 | Excellent | Works perfectly, would use in production today |
| 4 | Good | Works well, minor issues that don't block usage |
| 3 | Acceptable | Core workflow works but rough edges are noticeable |
| 2 | Poor | Significant gaps or bugs that block regular use |
| 1 | Failing | Cannot complete the core workflow |

### Dimension Definitions

| # | Dimension | What It Measures |
|---|-----------|-----------------|
| D1 | **Workflow Completeness** | Can the user complete the primary end-to-end workflow without workarounds? |
| D2 | **Data Accuracy** | Are calculations, totals, balances, and reports correct? |
| D3 | **Usability** | Is the interface intuitive? Can a new user figure it out without hand-holding? |
| D4 | **Performance** | Are pages and actions fast enough for real-world use? |
| D5 | **Reliability** | Does the module work consistently without crashes, errors, or data loss? |

---

## Scorecard Template

### Per-Module Score (fill one per module per customer)

| Dimension | Score (1–5) | Notes |
|-----------|-------------|-------|
| D1 Workflow Completeness | | |
| D2 Data Accuracy | | |
| D3 Usability | | |
| D4 Performance | | |
| D5 Reliability | | |
| **Module Average** | | *(sum / 5)* |

### Aggregate Scorecard (all modules, one customer)

| Module | Status | D1 | D2 | D3 | D4 | D5 | Avg |
|--------|--------|----|----|----|----|-----|-----|
| Sales | Stable | | | | | | |
| Inventory | Stable | | | | | | |
| Accounting | Stable | | | | | | |
| HR | Stable | | | | | | |
| Projects | Stable | | | | | | |
| Support | Stable | | | | | | |
| Manufacturing | Stable | | | | | | |
| CRM | Beta | | | | | | |
| Marketing | Beta | | | | | | |
| POS | Beta | | | | | | |
| **Platform Average** | | | | | | | |

---

## Interpreting Scores

### Module-Level Thresholds

| Average Score | Verdict | Action |
|---------------|---------|--------|
| 4.0 – 5.0 | **GA Ready** | No action needed. Module ships at GA. |
| 3.5 – 3.9 | **Conditional** | Fix noted issues. Rescore before GA. |
| 2.5 – 3.4 | **Needs Work** | Dedicated sprint to resolve gaps. Rescore required. |
| Below 2.5 | **Not Ready** | Module cannot ship at GA. Requires major remediation or deferral. |

### Platform-Level Thresholds

| Condition | GA Decision |
|-----------|------------|
| All Stable modules avg >= 3.5 AND no module below 2.5 | **Go** |
| Any Stable module below 2.5 | **No-Go** until resolved |
| Platform average below 3.5 | **No-Go** — systemic issues |
| All Beta modules avg >= 3.5 | Beta modules graduate to Stable |
| Any Beta module below 3.0 | Beta module remains Beta at GA; ship with known-limitations note |

### Dimension-Level Red Flags

Any single dimension scoring 2 or below across multiple customers indicates a systemic issue:

| Dimension | If scored <= 2 | Likely Root Cause |
|-----------|---------------|-------------------|
| D1 Workflow Completeness | Missing features or broken steps | Engineering backlog gap |
| D2 Data Accuracy | Calculation or reporting bugs | Logic errors, needs audit |
| D3 Usability | Confusing UI or poor UX flow | Design review needed |
| D4 Performance | Slow loads or timeouts | Infrastructure or query optimization |
| D5 Reliability | Crashes or data loss | Stability bugs, needs error handling pass |

---

## Feedback Collection Process

1. **Week 4 — Midpoint check-in**
   - Send scorecard to each pilot customer contact.
   - Review scores internally. Any module below 3.0 gets an immediate action plan.

2. **Week 8 — Final assessment**
   - Send final scorecard.
   - Compare against midpoint to measure improvement.
   - Present aggregate results to leadership for go/no-go decision.

3. **Qualitative feedback**
   - Alongside scores, collect free-text answers to:
     - "What worked well?"
     - "What was frustrating or broken?"
     - "Would you pay for this product today? Why or why not?"

---

*This rubric is an internal tool. Pilot customers receive a simplified feedback form; scores are mapped to this rubric by the product team.*
