import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/coheron_erp';

async function initMongoDB() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Import all models
    const User = (await import('../shared/models/User.js')).default;
    const { Partner } = await import('../shared/models/Partner.js');
    const { Product } = await import('../shared/models/Product.js');
    const { Role } = await import('../shared/models/Role.js');
    const { Permission } = await import('../shared/models/Permission.js');
    const { UserRole } = await import('../shared/models/UserRole.js');
    const { RolePermission } = await import('../shared/models/RolePermission.js');
    const { TenantConfig } = await import('../shared/models/TenantConfig.js');
    const { Lead } = await import('../models/Lead.js');
    const { SaleOrder } = await import('../models/SaleOrder.js');
    const { Invoice } = await import('../models/Invoice.js');
    const { Employee } = await import('../models/Employee.js');
    const { SupportTicket } = await import('../models/SupportTicket.js');
    const { SlaPolicy } = await import('../models/SlaPolicy.js');
    const { ChatWidgetConfig, ChatSession, ChatMessage } = await import('../models/LiveChat.js');
    const { Campaign } = await import('../models/Campaign.js');
    const ManufacturingOrder = (await import('../models/ManufacturingOrder.js')).default;
    const Workflow = (await import('../models/Workflow.js')).default;
    const PosTerminal = (await import('../models/PosTerminal.js')).default;
    const PosSession = (await import('../models/PosSession.js')).default;
    const PosOrder = (await import('../models/PosOrder.js')).default;
    const Project = (await import('../models/Project.js')).default;
    const AccountAccount = (await import('../models/AccountAccount.js')).default;
    const AccountJournal = (await import('../models/AccountJournal.js')).default;
    const { LeaveRequest, LeaveBalance } = await import('../models/Leave.js');
    const { Course } = await import('../models/Course.js');
    const { Policy } = await import('../models/Policy.js');

    // =============================================
    // 1. TENANT
    // =============================================
    console.log('\n--- Creating Tenant ---');
    const tenantId = new mongoose.Types.ObjectId();
    await TenantConfig.findOneAndUpdate(
      { tenant_id: tenantId },
      {
        tenant_id: tenantId,
        enabled_modules: [
          'crm', 'sales', 'inventory', 'manufacturing', 'accounting',
          'hr', 'projects', 'support', 'marketing', 'pos', 'website',
          'esignature', 'platform',
        ],
        is_active: true,
      },
      { upsert: true, new: true }
    );
    console.log(`Tenant created: ${tenantId}`);

    // =============================================
    // 2. ROLES & PERMISSIONS
    // =============================================
    console.log('\n--- Creating Roles ---');
    const rolesData = [
      { code: 'admin', name: 'Administrator', description: 'Full system access', module: 'system', level: 10, is_system_role: true },
      { code: 'sales_manager', name: 'Sales Manager', description: 'Manage sales operations', module: 'sales', level: 4 },
      { code: 'sales_user', name: 'Sales User', description: 'Basic sales access', module: 'sales', level: 2 },
      { code: 'hr_manager', name: 'HR Manager', description: 'Manage HR operations', module: 'hr', level: 4 },
      { code: 'hr_user', name: 'HR User', description: 'Basic HR access', module: 'hr', level: 2 },
      { code: 'inventory_manager', name: 'Inventory Manager', description: 'Manage inventory', module: 'inventory', level: 4 },
      { code: 'accounting_manager', name: 'Accounting Manager', description: 'Manage accounting', module: 'accounting', level: 4 },
      { code: 'crm_manager', name: 'CRM Manager', description: 'Manage CRM operations', module: 'crm', level: 4 },
      { code: 'project_manager', name: 'Project Manager', description: 'Manage projects', module: 'projects', level: 4 },
      { code: 'support_agent', name: 'Support Agent', description: 'Handle support tickets and live chat', module: 'support', level: 3 },
      { code: 'pos_operator', name: 'POS Operator', description: 'Operate point of sale terminal', module: 'pos', level: 2 },
      { code: 'marketing_manager', name: 'Marketing Manager', description: 'Manage campaigns', module: 'marketing', level: 4 },
    ];
    for (const r of rolesData) {
      await Role.findOneAndUpdate({ code: r.code }, r, { upsert: true });
    }

    console.log('--- Creating Permissions ---');
    const modules = ['crm', 'sales', 'inventory', 'manufacturing', 'accounting', 'hr', 'projects', 'support', 'marketing', 'pos', 'website', 'esignature', 'platform'];
    const actions = ['view', 'create', 'edit', 'delete'];
    const perms: any[] = [];
    for (const mod of modules) {
      for (const action of actions) {
        perms.push({ code: `${mod}.${action}`, name: `${mod} ${action}`, module: mod, action });
      }
    }
    for (const p of perms) {
      await Permission.findOneAndUpdate({ code: p.code }, p, { upsert: true });
    }

    // Assign all permissions to admin role
    const adminRole = await Role.findOne({ code: 'admin' });
    if (adminRole) {
      const allPerms = await Permission.find();
      for (const p of allPerms) {
        await RolePermission.findOneAndUpdate(
          { role_id: adminRole._id, permission_id: p._id },
          { role_id: adminRole._id, permission_id: p._id, granted: true },
          { upsert: true }
        );
      }
    }

    // =============================================
    // 3. USERS (test accounts by role)
    // =============================================
    console.log('\n--- Creating Users ---');
    const password = await bcrypt.hash('Coheron@2025!', 10);

    interface UserSeed { uid: number; name: string; email: string; role: string }
    const usersData: UserSeed[] = [
      { uid: 1,  name: 'Admin User',      email: 'admin@coheron.com',      role: 'admin' },
      { uid: 2,  name: 'Rahul Verma',     email: 'rahul@coheron.com',      role: 'sales_manager' },
      { uid: 3,  name: 'Neha Gupta',      email: 'neha@coheron.com',       role: 'sales_user' },
      { uid: 4,  name: 'Priya Sharma',    email: 'priya@coheron.com',      role: 'hr_manager' },
      { uid: 5,  name: 'Deepak Singh',    email: 'deepak@coheron.com',     role: 'inventory_manager' },
      { uid: 6,  name: 'Anita Desai',     email: 'anita@coheron.com',      role: 'accounting_manager' },
      { uid: 7,  name: 'Vikram Mehta',    email: 'vikram@coheron.com',     role: 'crm_manager' },
      { uid: 8,  name: 'Kavita Nair',     email: 'kavita@coheron.com',     role: 'project_manager' },
      { uid: 9,  name: 'Suresh Reddy',    email: 'suresh@coheron.com',     role: 'support_agent' },
      { uid: 10, name: 'Meera Iyer',      email: 'meera@coheron.com',      role: 'pos_operator' },
      { uid: 11, name: 'Arjun Patel',     email: 'arjun@coheron.com',      role: 'marketing_manager' },
    ];

    for (const u of usersData) {
      const user = await User.findOneAndUpdate(
        { email: u.email },
        { uid: u.uid, name: u.name, email: u.email, password_hash: password, tenant_id: tenantId, active: true },
        { upsert: true, new: true }
      );
      const role = await Role.findOne({ code: u.role });
      if (role) {
        await UserRole.findOneAndUpdate(
          { user_id: user._id, role_id: role._id },
          { user_id: user._id, role_id: role._id, is_active: true },
          { upsert: true }
        );
      }
    }

    // =============================================
    // 4. CRM — Partners & Leads
    // =============================================
    console.log('\n--- Seeding CRM ---');
    const partnersData = [
      { name: 'Acme Corporation', email: 'contact@acme.com', phone: '+91-98765-43210', company: 'Acme Corp', type: 'company' },
      { name: 'TechVista Solutions', email: 'info@techvista.in', phone: '+91-98765-43211', company: 'TechVista', type: 'company' },
      { name: 'John Doe', email: 'john.doe@example.com', phone: '+91-98765-43212', company: 'Acme Corp', type: 'contact' },
      { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+91-98765-43213', company: 'TechVista', type: 'contact' },
      { name: 'Rajesh Kumar', email: 'rajesh@clientco.in', phone: '+91-98765-43214', company: 'ClientCo', type: 'contact' },
    ];
    for (const p of partnersData) {
      await Partner.findOneAndUpdate({ email: p.email }, p, { upsert: true });
    }
    const acme = await Partner.findOne({ email: 'contact@acme.com' });
    const techvista = await Partner.findOne({ email: 'info@techvista.in' });
    const admin = await User.findOne({ email: 'admin@coheron.com' });

    const leadsData = [
      { name: 'ERP Implementation - Acme', partner_id: acme?._id, email: 'lead@acme.com', phone: '+91-11111-11111', expected_revenue: 500000, probability: 30, stage: 'new', user_id: admin?._id, priority: 'high', type: 'lead' },
      { name: 'CRM Migration - TechVista', partner_id: techvista?._id, email: 'lead@techvista.in', phone: '+91-22222-22222', expected_revenue: 250000, probability: 60, stage: 'qualified', user_id: admin?._id, priority: 'medium', type: 'lead' },
      { name: 'Enterprise Deal - Global Inc', email: 'sales@globalinc.com', phone: '+91-33333-33333', expected_revenue: 1500000, probability: 80, stage: 'proposition', user_id: admin?._id, priority: 'high', type: 'opportunity' },
      { name: 'SMB Package - StartupX', email: 'founder@startupx.io', phone: '+91-44444-44444', expected_revenue: 75000, probability: 50, stage: 'new', user_id: admin?._id, priority: 'low', type: 'lead' },
    ];
    for (const l of leadsData) {
      await Lead.findOneAndUpdate({ email: l.email }, l, { upsert: true });
    }

    // =============================================
    // 5. PRODUCTS
    // =============================================
    console.log('--- Seeding Products ---');
    const productsData = [
      { name: 'Laptop Computer', default_code: 'LAP-001', list_price: 65000, standard_price: 48000, qty_available: 50, type: 'product' },
      { name: 'Wireless Mouse', default_code: 'MOU-001', list_price: 1500, standard_price: 800, qty_available: 200, type: 'product' },
      { name: 'USB-C Hub', default_code: 'HUB-001', list_price: 3500, standard_price: 2000, qty_available: 100, type: 'product' },
      { name: 'Standing Desk', default_code: 'DSK-001', list_price: 25000, standard_price: 15000, qty_available: 20, type: 'product' },
      { name: 'Ergonomic Chair', default_code: 'CHR-001', list_price: 18000, standard_price: 12000, qty_available: 30, type: 'product' },
      { name: 'Cloud Consulting (per hour)', default_code: 'SRV-001', list_price: 5000, standard_price: 3000, qty_available: 0, type: 'service' },
      { name: 'Annual Support Plan', default_code: 'SUP-001', list_price: 120000, standard_price: 80000, qty_available: 0, type: 'service' },
    ];
    for (const p of productsData) {
      await Product.findOneAndUpdate({ default_code: p.default_code }, p, { upsert: true });
    }
    const laptop = await Product.findOne({ default_code: 'LAP-001' });

    // =============================================
    // 6. SALES — Orders & Invoices
    // =============================================
    console.log('--- Seeding Sales ---');
    const saleOrdersData = [
      { name: 'SO-2026-001', partner_id: acme?._id, date_order: new Date(), amount_total: 130000, state: 'draft', user_id: admin?._id },
      { name: 'SO-2026-002', partner_id: techvista?._id, date_order: new Date(), amount_total: 250000, state: 'sale', user_id: admin?._id },
      { name: 'SO-2026-003', partner_id: acme?._id, date_order: new Date(Date.now() - 7 * 86400000), amount_total: 75000, state: 'sale', user_id: admin?._id },
      { name: 'SO-2026-004', partner_id: techvista?._id, date_order: new Date(Date.now() - 14 * 86400000), amount_total: 360000, state: 'done', user_id: admin?._id },
    ];
    for (const so of saleOrdersData) {
      await SaleOrder.findOneAndUpdate({ name: so.name }, so, { upsert: true });
    }

    const invoicesData = [
      { name: 'INV/2026/0001', partner_id: acme?._id, amount_total: 130000, amount_residual: 130000, state: 'posted', payment_state: 'not_paid', invoice_date: new Date(), due_date: new Date(Date.now() + 30 * 86400000), tenant_id: tenantId },
      { name: 'INV/2026/0002', partner_id: techvista?._id, amount_total: 250000, amount_residual: 0, state: 'posted', payment_state: 'paid', invoice_date: new Date(Date.now() - 15 * 86400000), due_date: new Date(Date.now() + 15 * 86400000), tenant_id: tenantId },
      { name: 'INV/2026/0003', partner_id: acme?._id, amount_total: 75000, amount_residual: 25000, state: 'posted', payment_state: 'partial', invoice_date: new Date(Date.now() - 7 * 86400000), due_date: new Date(Date.now() + 23 * 86400000), tenant_id: tenantId },
      { name: 'INV/2026/0004', partner_id: techvista?._id, amount_total: 360000, amount_residual: 360000, state: 'draft', payment_state: 'not_paid', tenant_id: tenantId },
    ];
    for (const inv of invoicesData) {
      await Invoice.findOneAndUpdate({ name: inv.name }, inv, { upsert: true });
    }

    // =============================================
    // 7. MANUFACTURING
    // =============================================
    console.log('--- Seeding Manufacturing ---');
    const now = new Date();
    const moData = [
      { name: 'MO/2026/001', mo_number: 'MO-001', product_id: laptop?._id, product_qty: 20, state: 'draft', date_planned_start: now, date_planned_finished: new Date(now.getTime() + 7 * 86400000), user_id: admin?._id },
      { name: 'MO/2026/002', mo_number: 'MO-002', product_id: laptop?._id, product_qty: 50, state: 'confirmed', date_planned_start: now, date_planned_finished: new Date(now.getTime() + 14 * 86400000), user_id: admin?._id },
      { name: 'MO/2026/003', mo_number: 'MO-003', product_id: laptop?._id, product_qty: 100, state: 'progress', date_planned_start: new Date(now.getTime() - 7 * 86400000), date_planned_finished: new Date(now.getTime() + 7 * 86400000), user_id: admin?._id },
    ];
    for (const mo of moData) {
      await ManufacturingOrder.findOneAndUpdate({ name: mo.name }, mo, { upsert: true });
    }

    // =============================================
    // 8. ACCOUNTING
    // =============================================
    console.log('--- Seeding Accounting ---');
    const accounts = [
      { code: '1000', name: 'Cash', account_type: 'asset_cash', level: 0, reconcile: true },
      { code: '1200', name: 'Accounts Receivable', account_type: 'asset_receivable', level: 0 },
      { code: '2000', name: 'Accounts Payable', account_type: 'liability_payable', level: 0 },
      { code: '3000', name: 'Equity', account_type: 'equity', level: 0 },
      { code: '4000', name: 'Sales Revenue', account_type: 'income', level: 0 },
      { code: '5000', name: 'Operating Expenses', account_type: 'expense', level: 0 },
    ];
    for (const a of accounts) {
      await AccountAccount.findOneAndUpdate({ code: a.code }, a, { upsert: true });
    }
    await AccountJournal.findOneAndUpdate(
      { code: 'MISC' },
      { name: 'Miscellaneous Operations', code: 'MISC', type: 'general', active: true },
      { upsert: true }
    );

    // =============================================
    // 9. HR — Employees, Leave, Courses, Policies
    // =============================================
    console.log('--- Seeding HR ---');
    const employeesData = [
      { employee_id: 'EMP001', name: 'Rajesh Kumar', work_email: 'rajesh.k@coheron.com', work_phone: '+91-98765-43210', job_title: 'Software Engineer', department: 'Engineering', hire_date: new Date('2022-01-15'), employment_type: 'full_time' },
      { employee_id: 'EMP002', name: 'Priya Sharma', work_email: 'priya.s@coheron.com', work_phone: '+91-91234-56789', job_title: 'HR Manager', department: 'Human Resources', hire_date: new Date('2021-03-01'), employment_type: 'full_time' },
      { employee_id: 'EMP003', name: 'Amit Patel', work_email: 'amit.p@coheron.com', work_phone: '+91-99887-66554', job_title: 'Sales Executive', department: 'Sales', hire_date: new Date('2023-07-01'), employment_type: 'full_time' },
      { employee_id: 'EMP004', name: 'Sneha Reddy', work_email: 'sneha.r@coheron.com', work_phone: '+91-98765-12345', job_title: 'Product Manager', department: 'Product', hire_date: new Date('2022-05-10'), employment_type: 'full_time' },
      { employee_id: 'EMP005', name: 'Karan Deshmukh', work_email: 'karan.d@coheron.com', work_phone: '+91-99876-54321', job_title: 'DevOps Engineer', department: 'Engineering', hire_date: new Date('2023-09-15'), employment_type: 'full_time' },
    ];
    for (const e of employeesData) {
      await Employee.findOneAndUpdate({ employee_id: e.employee_id }, e, { upsert: true });
    }
    const emp1 = await Employee.findOne({ employee_id: 'EMP001' });
    const emp2 = await Employee.findOne({ employee_id: 'EMP002' });

    if (emp1 && emp2) {
      const year = new Date().getFullYear();
      const leaveTypes = ['annual', 'sick', 'casual', 'earned'];
      for (const lt of leaveTypes) {
        await LeaveBalance.findOneAndUpdate(
          { employee_id: emp1._id, leave_type: lt, year },
          { employee_id: emp1._id, leave_type: lt, total: lt === 'earned' ? 15 : lt === 'annual' ? 12 : lt === 'sick' ? 6 : 8, used: 2, remaining: lt === 'earned' ? 13 : lt === 'annual' ? 10 : lt === 'sick' ? 4 : 6, year },
          { upsert: true }
        );
      }
      await LeaveRequest.findOneAndUpdate(
        { employee_id: emp1._id, leave_type: 'annual', from_date: new Date(now.getTime() + 5 * 86400000) },
        { employee_id: emp1._id, leave_type: 'annual', from_date: new Date(now.getTime() + 5 * 86400000), to_date: new Date(now.getTime() + 10 * 86400000), days: 5, reason: 'Family vacation', status: 'pending' },
        { upsert: true }
      );
    }

    const coursesData = [
      { name: 'React Advanced Development', description: 'Advanced React patterns and hooks', total_time: 40, category: 'Technical' },
      { name: 'Leadership Skills', description: 'Management and leadership essentials', total_time: 24, category: 'Soft Skills' },
      { name: 'Cloud Security Fundamentals', description: 'AWS/GCP security best practices', total_time: 30, category: 'Technical' },
    ];
    for (const c of coursesData) {
      await Course.findOneAndUpdate({ name: c.name }, c, { upsert: true });
    }

    const policiesData = [
      { name: 'Code of Conduct', category: 'General', body: 'Company code of conduct covering ethical standards and expected behavior.', is_active: true },
      { name: 'Leave Policy', category: 'HR', body: 'Annual: 12d, Sick: 6d, Casual: 8d, Earned: 15d per year.', is_active: true },
      { name: 'Remote Work Policy', category: 'HR', body: 'Employees may work remotely up to 3 days/week with manager approval.', is_active: true },
      { name: 'Data Security Policy', category: 'IT', body: 'All employees must follow data security protocols.', is_active: true },
    ];
    for (const p of policiesData) {
      await Policy.findOneAndUpdate({ name: p.name }, p, { upsert: true });
    }

    // =============================================
    // 10. SUPPORT — SLA, Tickets, Live Chat
    // =============================================
    console.log('--- Seeding Support ---');
    const slaData = [
      { name: 'Critical SLA', priority: 'critical', first_response_time_minutes: 30, resolution_time_minutes: 240, is_active: true },
      { name: 'High Priority SLA', priority: 'high', first_response_time_minutes: 60, resolution_time_minutes: 480, is_active: true },
      { name: 'Medium Priority SLA', priority: 'medium', first_response_time_minutes: 240, resolution_time_minutes: 1440, is_active: true },
      { name: 'Low Priority SLA', priority: 'low', first_response_time_minutes: 480, resolution_time_minutes: 2880, is_active: true },
    ];
    for (const s of slaData) {
      await SlaPolicy.findOneAndUpdate({ priority: s.priority }, s, { upsert: true });
    }

    const ticketsData = [
      { ticket_number: 'TKT-001', subject: 'Cannot login to dashboard', description: 'Getting 401 error when trying to login.', ticket_type: 'issue', status: 'new', priority: 'high', partner_id: acme?._id, is_public: true },
      { ticket_number: 'TKT-002', subject: 'Feature request: Dark mode', description: 'Please add dark mode to the UI.', ticket_type: 'feature_request', status: 'in_progress', priority: 'low', partner_id: techvista?._id, is_public: true },
      { ticket_number: 'TKT-003', subject: 'Invoice PDF not generating', description: 'PDF download returns blank page.', ticket_type: 'bug', status: 'new', priority: 'critical', partner_id: acme?._id, is_public: true },
      { ticket_number: 'TKT-004', subject: 'How to set up multi-warehouse?', description: 'Need help configuring multiple warehouses.', ticket_type: 'question', status: 'resolved', priority: 'medium', partner_id: techvista?._id, is_public: true },
    ];
    for (const t of ticketsData) {
      await SupportTicket.findOneAndUpdate({ ticket_number: t.ticket_number }, t, { upsert: true });
    }

    // Live Chat
    await ChatWidgetConfig.findOneAndUpdate(
      { tenant_id: tenantId },
      { tenant_id: tenantId, widget_name: 'Coheron Support', greeting_message: 'Hi! How can we help you today?', theme_color: '#4F46E5', auto_assign: true, is_active: true },
      { upsert: true }
    );
    const chatSession = await ChatSession.findOneAndUpdate(
      { tenant_id: tenantId, visitor_email: 'visitor@example.com' },
      { tenant_id: tenantId, visitor_name: 'Website Visitor', visitor_email: 'visitor@example.com', status: 'active', channel: 'widget' },
      { upsert: true, new: true }
    );
    await ChatMessage.findOneAndUpdate(
      { session_id: chatSession._id, content: 'Hello, I need help with my order.' },
      { session_id: chatSession._id, sender_type: 'visitor', content: 'Hello, I need help with my order.', message_type: 'text' },
      { upsert: true }
    );
    await ChatMessage.findOneAndUpdate(
      { session_id: chatSession._id, content: 'Sure! Can you share your order number?' },
      { session_id: chatSession._id, sender_type: 'agent', sender_id: admin?._id?.toString(), content: 'Sure! Can you share your order number?', message_type: 'text' },
      { upsert: true }
    );

    // =============================================
    // 11. MARKETING — Campaigns
    // =============================================
    console.log('--- Seeding Marketing ---');
    const campaignsData = [
      { name: 'Republic Day Sale', campaign_type: 'email', state: 'in_progress', start_date: now, end_date: new Date(now.getTime() + 15 * 86400000), budget: 50000, revenue: 250000, user_id: admin?._id, clicks: 1500, impressions: 10000, leads_count: 25 },
      { name: 'Product Launch - ERP v2', campaign_type: 'social', state: 'done', start_date: new Date(now.getTime() - 60 * 86400000), end_date: new Date(now.getTime() - 30 * 86400000), budget: 100000, revenue: 750000, user_id: admin?._id, clicks: 5000, impressions: 50000, leads_count: 100 },
      { name: 'Summer Webinar Series', campaign_type: 'website', state: 'draft', start_date: new Date(now.getTime() + 30 * 86400000), end_date: new Date(now.getTime() + 60 * 86400000), budget: 30000, revenue: 0, user_id: admin?._id },
    ];
    for (const c of campaignsData) {
      await Campaign.findOneAndUpdate({ name: c.name }, c, { upsert: true });
    }

    // =============================================
    // 12. POS — Terminal, Session, Order
    // =============================================
    console.log('--- Seeding POS ---');
    const terminal = await PosTerminal.findOneAndUpdate(
      { name: 'Terminal 1' },
      { name: 'Terminal 1', code: 'T1', is_active: true, cash_drawer_enabled: true, barcode_scanner_enabled: true },
      { upsert: true, new: true }
    );
    const posSession = await PosSession.findOneAndUpdate(
      { session_number: 'SESS-000001' },
      { name: 'SESS-000001', session_number: 'SESS-000001', terminal_id: terminal._id, user_id: admin?._id, opening_balance: 5000, state: 'opened', start_at: now },
      { upsert: true, new: true }
    );
    await PosOrder.findOneAndUpdate(
      { order_number: 'POS-000001' },
      { name: 'POS-000001', order_number: 'POS-000001', terminal_id: terminal._id, session_id: posSession._id, order_type: 'sale', state: 'paid', amount_untaxed: 66500, amount_tax: 11970, amount_total: 78470, amount_paid: 78470, payment_method: 'upi', payment_status: 'paid', paid_at: now },
      { upsert: true }
    );

    // =============================================
    // 13. PROJECTS
    // =============================================
    console.log('--- Seeding Projects ---');
    const projectsData = [
      { name: 'ERP v2.0 Development', key: 'ERP2', code: 'PROJ-001', description: 'Next major version of Coheron ERP', state: 'active', start_date: new Date('2026-01-01'), planned_end_date: new Date('2026-06-30'), budget_planned: 5000000, priority: 'high' },
      { name: 'Website Redesign', key: 'WEB', code: 'PROJ-002', description: 'Redesign the marketing website', state: 'planning', start_date: new Date('2026-02-01'), planned_end_date: new Date('2026-04-30'), budget_planned: 1500000, priority: 'medium' },
    ];
    for (const p of projectsData) {
      await Project.findOneAndUpdate({ name: p.name }, p, { upsert: true });
    }

    // =============================================
    // 14. WORKFLOWS
    // =============================================
    console.log('--- Seeding Workflows ---');
    const workflowsData = [
      {
        name: 'Auto-assign high priority tickets',
        module: 'support',
        trigger: { type: 'on_create', entity: 'SupportTicket' },
        conditions: [{ field: 'priority', operator: 'equals', value: 'critical' }],
        actions: [
          { type: 'send_notification', config: { userId: admin?._id?.toString(), title: 'Critical ticket created', message: 'A critical support ticket was just created.' }, order: 0 },
          { type: 'send_email', config: { to: 'admin@coheron.com', subject: 'Critical Ticket Alert', body: '<p>A critical support ticket requires immediate attention.</p>' }, order: 1 },
        ],
        is_active: true,
        tenant_id: tenantId,
      },
      {
        name: 'Notify on sale order confirmed',
        module: 'sales',
        trigger: { type: 'on_update', entity: 'SaleOrder' },
        conditions: [{ field: 'state', operator: 'equals', value: 'sale' }],
        actions: [
          { type: 'send_email', config: { to: 'sales@coheron.com', subject: 'Sale Order Confirmed', body: '<p>A sale order has been confirmed.</p>' }, order: 0 },
        ],
        is_active: true,
        tenant_id: tenantId,
      },
    ];
    for (const w of workflowsData) {
      await Workflow.findOneAndUpdate({ name: w.name, tenant_id: w.tenant_id }, w, { upsert: true });
    }

    // =============================================
    // SUMMARY
    // =============================================
    console.log('\n========================================');
    console.log('  DATABASE INITIALIZATION COMPLETE');
    console.log('========================================\n');
    console.log(`Tenant ID: ${tenantId}`);
    console.log('');
    console.log('Test Accounts (all password: Coheron@2025!):');
    console.log('┌──────────────────────────┬────────────────────────┬─────────────────────┐');
    console.log('│ Name                     │ Email                  │ Role                │');
    console.log('├──────────────────────────┼────────────────────────┼─────────────────────┤');
    for (const u of usersData) {
      console.log(`│ ${u.name.padEnd(24)} │ ${u.email.padEnd(22)} │ ${u.role.padEnd(19)} │`);
    }
    console.log('└──────────────────────────┴────────────────────────┴─────────────────────┘');
    console.log('');
    console.log('Seeded Data:');
    console.log('  CRM:           5 partners, 4 leads');
    console.log('  Products:      7 products');
    console.log('  Sales:         4 sale orders, 4 invoices');
    console.log('  Manufacturing: 3 manufacturing orders');
    console.log('  Accounting:    6 accounts, 1 journal');
    console.log('  HR:            5 employees, leave balances, 3 courses, 4 policies');
    console.log('  Support:       4 SLA policies, 4 tickets, live chat config + session');
    console.log('  Marketing:     3 campaigns');
    console.log('  POS:           1 terminal, 1 session, 1 order');
    console.log('  Projects:      2 projects');
    console.log('  Workflows:     2 active workflows');
    console.log('  Platform:      12 roles, 52 permissions, tenant config');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Initialization failed:', error);
    process.exit(1);
  }
}

initMongoDB();
