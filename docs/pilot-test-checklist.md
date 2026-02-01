# Coheron ERP — Pilot Test Checklist

Use this checklist to systematically validate each module during the pilot. Check off items as you confirm they work as expected.

---

## Stable Modules (Thorough Workflow Testing)

### Sales
- [ ] Create a new sales order with multiple line items → order saves and totals calculate correctly
- [ ] Apply a pricing rule (discount/tiered pricing) → prices adjust on the order
- [ ] Set up a commission rule for a sales rep → commission calculates on order completion
- [ ] Check available-to-promise (ATP) for a product → shows correct available quantity
- [ ] Create a subscription order → recurring schedule is created
- [ ] End-to-end: Create lead (CRM) → convert to opportunity → generate quote → confirm order → create invoice

### Inventory
- [ ] Add a new product with batch/serial tracking enabled → product appears in inventory
- [ ] Receive goods via GRN at a specific warehouse → stock levels update
- [ ] Transfer stock between two warehouses → source decreases, destination increases
- [ ] Create and execute a wave pick list → items picked and status updates
- [ ] Perform a cross-docking operation → inbound goods route directly to outbound
- [ ] View stock levels across all warehouses → multi-warehouse summary is accurate

### Accounting
- [ ] Create a manual journal entry → GL balances update (debits = credits)
- [ ] Record a vendor bill (AP) → payable appears in aging report
- [ ] Record a customer invoice (AR) → receivable appears in aging report
- [ ] Apply a payment against an invoice → invoice status changes to paid
- [ ] Generate a GST report → tax amounts match transaction totals
- [ ] Set up a budget for a department → budget vs. actual comparison works
- [ ] Run multi-entity consolidation → combined balances are correct

### HR
- [ ] Add a new employee record → appears in employee directory
- [ ] Post a job opening and track an applicant → recruitment pipeline updates
- [ ] Submit and approve a leave request → leave balance decreases
- [ ] Record attendance (check-in/check-out) → attendance log shows correct hours
- [ ] Run payroll for a pay period → payslips generate with correct calculations
- [ ] Assign a benefit plan to an employee → benefit appears on employee profile

### Projects
- [ ] Create a project with milestones → milestones show on Gantt chart
- [ ] Create tasks on an Agile board → tasks move through columns (To Do → In Progress → Done)
- [ ] Log a timesheet entry against a task → hours appear on the project summary
- [ ] Add a risk item to a project → risk register displays with severity rating
- [ ] Complete all tasks in a milestone → milestone marks as complete

### Support
- [ ] Create a ticket via email channel → ticket appears in queue
- [ ] Assign a ticket to an agent → agent sees it in their list
- [ ] Escalate a ticket based on SLA breach → escalation triggers automatically
- [ ] Search the knowledge base → relevant articles appear
- [ ] Resolve and close a ticket → status updates and SLA metrics record
- [ ] Test omnichannel: create tickets from email, chat, and phone → all appear in unified queue

### Manufacturing
- [ ] Define a bill of materials (BOM) for a product → BOM saves with components and quantities
- [ ] Run MRP planning → purchase/production suggestions generate based on demand
- [ ] Create a manufacturing order from BOM → order routes through defined routing steps
- [ ] Record a quality check on a finished item → QC result logs pass/fail
- [ ] Use kanban board to track production orders → cards move through stages
- [ ] Update a product in PLM → version history records the change

---

## Beta Modules (Core Flow Validation)

### CRM
- [ ] Create a new lead with contact details → lead appears in pipeline
- [ ] Move a lead through pipeline stages → stage updates and history tracks
- [ ] Convert a lead to an opportunity → opportunity record is created
- [ ] Set up a basic automation rule (e.g., auto-assign by region) → rule triggers correctly
- [ ] *Known limitation:* AI lead scoring is not yet functional — skip AI-related features

### Marketing
- [ ] Create an email campaign with a recipient list → campaign saves and shows recipient count
- [ ] Send a test email from a campaign → email is delivered
- [ ] Set up a basic customer journey (e.g., welcome series) → journey steps execute in order
- [ ] Send an SMS campaign → SMS is delivered
- [ ] *Known limitation:* Analytics dashboards are limited — basic send/open metrics only

### POS
- [ ] Open a POS session and ring up a sale → transaction records and receipt generates
- [ ] Apply a loyalty reward to a transaction → discount applies correctly
- [ ] Use kitchen display (if applicable) → order appears on KDS
- [ ] Close the POS session and reconcile → session totals match transactions
- [ ] *Known limitation:* Offline mode and some payment gateways are not yet supported

---

## Preview Modules (Smoke Tests Only)

These modules are scaffolded. Just confirm they load without errors.

### E-Signature
- [ ] Navigate to the E-Signature module → page loads without errors
- [ ] Attempt to upload a document for signing → UI is present (signing flow may not complete)

### Platform
- [ ] Navigate to the Platform / API management section → page loads without errors
- [ ] View the webhook configuration screen → UI renders

### Compliance
- [ ] Navigate to the Compliance / Audit section → page loads without errors
- [ ] View the GDPR data subject request screen → UI renders

### AI
- [ ] Navigate to the AI / Chatbot section → page loads without errors
- [ ] Attempt to open the copilot panel → UI renders (responses may be stubbed)

---

## Platform-Wide Checks

- [ ] Log in with valid credentials → dashboard loads
- [ ] Log in with two-factor authentication → TOTP code accepted
- [ ] Non-admin user cannot access `/admin` → access denied or redirect
- [ ] Module visibility matches tenant's enabled modules → disabled modules are hidden
- [ ] Real-time updates: change data in one tab → reflected in another tab without refresh
- [ ] Data import: upload a CSV via `/admin/import` → records import correctly
- [ ] Audit log: perform an admin action → entry appears in `/admin/audit`
