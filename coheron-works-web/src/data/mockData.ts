
// Mock Users
export const mockUsers: any[] = [
    { id: 1, name: 'Admin User', email: 'admin@coheronworks.com' },
    { id: 2, name: 'Sarah Chen', email: 'sarah.chen@coheronworks.com' },
    { id: 3, name: 'Mike Johnson', email: 'mike.j@coheronworks.com' },
    { id: 4, name: 'Emma Davis', email: 'emma.d@coheronworks.com' },
    { id: 5, name: 'Alex Kumar', email: 'alex.k@coheronworks.com' },
];

// Mock Tickets
export const mockTickets: any[] = [
    { id: 1, name: 'Website not loading', description: 'The company website is showing a 500 error.', partner_id: 1, user_id: 2, stage_id: 1, priority: 'high', create_date: '2024-02-01', close_date: null },
    { id: 2, name: 'Email sync issue', description: 'Emails are not syncing with the CRM for user Mike Johnson.', partner_id: 2, user_id: 3, stage_id: 2, priority: 'medium', create_date: '2024-01-28', close_date: null },
    { id: 3, name: 'New feature request: Reporting', description: 'Request for advanced reporting features in the analytics dashboard.', partner_id: 3, user_id: 4, stage_id: 3, priority: 'low', create_date: '2024-01-25', close_date: '2024-02-05' },
    { id: 4, name: 'Password reset for John Smith', description: 'John Smith from Acme Corp needs his password reset for the portal.', partner_id: 4, user_id: 2, stage_id: 1, priority: 'medium', create_date: '2024-02-03', close_date: null },
];

// Mock Partners (Customers/Vendors)
export const mockPartners: any[] = [
    { id: 1, name: 'Acme Corporation', email: 'contact@acme.com', phone: '+1-555-0101', company: 'Acme Corporation', type: 'company' },
    { id: 2, name: 'TechStart Inc', email: 'hello@techstart.io', phone: '+1-555-0102', company: 'TechStart Inc', type: 'company' },
    { id: 3, name: 'Global Solutions Ltd', email: 'info@globalsolutions.com', phone: '+1-555-0103', company: 'Global Solutions Ltd', type: 'company' },
    { id: 4, name: 'John Smith', email: 'john.smith@email.com', phone: '+1-555-0104', company: 'Acme Corporation', type: 'contact' },
    { id: 5, name: 'Jane Doe', email: 'jane.doe@email.com', phone: '+1-555-0105', company: 'TechStart Inc', type: 'contact' },
    { id: 6, name: 'Innovation Labs', email: 'contact@innovationlabs.com', phone: '+1-555-0106', company: 'Innovation Labs', type: 'company' },
    { id: 7, name: 'Digital Dynamics', email: 'info@digitaldynamics.com', phone: '+1-555-0107', company: 'Digital Dynamics', type: 'company' },
    { id: 8, name: 'Future Systems', email: 'hello@futuresystems.com', phone: '+1-555-0108', company: 'Future Systems', type: 'company' },
];

// Mock Leads/Opportunities
export const mockLeads: any[] = [
    { id: 1, name: 'Enterprise Software Deal', partner_id: 1, email: 'contact@acme.com', phone: '+1-555-0101', expected_revenue: 10000000, probability: 75, stage: 'proposition', user_id: 2, create_date: '2024-01-15', priority: 'high' },
    { id: 2, name: 'Cloud Migration Project', partner_id: 2, email: 'hello@techstart.io', phone: '+1-555-0102', expected_revenue: 6800000, probability: 60, stage: 'qualified', user_id: 3, create_date: '2024-01-20', priority: 'medium' },
    { id: 3, name: 'New Website Development', partner_id: 3, email: 'info@globalsolutions.com', phone: '+1-555-0103', expected_revenue: 3600000, probability: 40, stage: 'new', user_id: 2, create_date: '2024-01-25', priority: 'medium' },
    { id: 4, name: 'Mobile App Development', partner_id: 6, email: 'contact@innovationlabs.com', phone: '+1-555-0106', expected_revenue: 7600000, probability: 85, stage: 'proposition', user_id: 4, create_date: '2024-01-10', priority: 'high' },
    { id: 5, name: 'Data Analytics Platform', partner_id: 7, email: 'info@digitaldynamics.com', phone: '+1-555-0107', expected_revenue: 12000000, probability: 50, stage: 'qualified', user_id: 5, create_date: '2024-01-18', priority: 'high' },
    { id: 6, name: 'CRM Implementation', partner_id: 8, email: 'hello@futuresystems.com', phone: '+1-555-0108', expected_revenue: 5200000, probability: 90, stage: 'won', user_id: 2, create_date: '2024-01-05', priority: 'medium' },
];

// Mock Products
export const mockProducts: any[] = [
    { id: 1, name: 'Professional Services - Consulting', default_code: 'SERV-001', list_price: 12000, standard_price: 8000, qty_available: 0, type: 'service', categ_id: 1 },
    { id: 2, name: 'Software License - Enterprise', default_code: 'SOFT-001', list_price: 400000, standard_price: 240000, qty_available: 100, type: 'product', categ_id: 2 },
    { id: 3, name: 'Cloud Hosting - Monthly', default_code: 'HOST-001', list_price: 24000, standard_price: 12000, qty_available: 0, type: 'service', categ_id: 1 },
    { id: 4, name: 'Hardware - Server Rack', default_code: 'HARD-001', list_price: 680000, standard_price: 480000, qty_available: 15, type: 'product', categ_id: 3 },
    { id: 5, name: 'Training - Full Day Workshop', default_code: 'TRAIN-001', list_price: 160000, standard_price: 96000, qty_available: 0, type: 'service', categ_id: 1 },
    { id: 6, name: 'Support Contract - Annual', default_code: 'SUPP-001', list_price: 960000, standard_price: 640000, qty_available: 0, type: 'service', categ_id: 1 },
];

// Mock Sale Orders
export const mockSaleOrders: any[] = [
    {
        id: 1,
        name: 'SO001',
        partner_id: 1,
        date_order: '2024-01-20',
        amount_total: 2000000,
        state: 'sale',
        user_id: 2,
        order_line: [
            { id: 1, product_id: 2, product_uom_qty: 5, price_unit: 400000, price_subtotal: 2000000 }
        ]
    },
    {
        id: 2,
        name: 'SO002',
        partner_id: 2,
        date_order: '2024-01-22',
        amount_total: 717600,
        state: 'sent',
        user_id: 3,
        order_line: [
            { id: 2, product_id: 3, product_uom_qty: 30, price_unit: 23920, price_subtotal: 717600 }
        ]
    },
    {
        id: 3,
        name: 'SO003',
        partner_id: 6,
        date_order: '2024-01-25',
        amount_total: 1360000,
        state: 'draft',
        user_id: 4,
        order_line: [
            { id: 3, product_id: 4, product_uom_qty: 2, price_unit: 680000, price_subtotal: 1360000 }
        ]
    },
];

// Mock Invoices
export const mockInvoices: any[] = [
    { id: 1, name: 'INV/2024/0001', partner_id: 1, invoice_date: '2024-01-20', amount_total: 2000000, amount_residual: 0, state: 'posted', payment_state: 'paid', move_type: 'out_invoice' },
    { id: 2, name: 'INV/2024/0002', partner_id: 2, invoice_date: '2024-01-22', amount_total: 717600, amount_residual: 717600, state: 'posted', payment_state: 'not_paid', move_type: 'out_invoice' },
    { id: 3, name: 'INV/2024/0003', partner_id: 3, invoice_date: '2024-01-23', amount_total: 960000, amount_residual: 480000, state: 'posted', payment_state: 'partial', move_type: 'out_invoice' },
    { id: 4, name: 'BILL/2024/0001', partner_id: 6, invoice_date: '2024-01-18', amount_total: 400000, amount_residual: 0, state: 'posted', payment_state: 'paid', move_type: 'in_invoice' },
];

// Mock Employees
export const mockEmployees: any[] = [
    { id: 1, name: 'Sarah Chen', job_title: 'Sales Manager', department_id: 1, work_email: 'sarah.chen@coheronworks.com', work_phone: '+1-555-1001', attendance_state: 'checked_in' },
    { id: 2, name: 'Mike Johnson', job_title: 'Software Developer', department_id: 2, work_email: 'mike.j@coheronworks.com', work_phone: '+1-555-1002', attendance_state: 'checked_in' },
    { id: 3, name: 'Emma Davis', job_title: 'UI/UX Designer', department_id: 2, work_email: 'emma.d@coheronworks.com', work_phone: '+1-555-1003', attendance_state: 'checked_out' },
    { id: 4, name: 'Alex Kumar', job_title: 'DevOps Engineer', department_id: 2, work_email: 'alex.k@coheronworks.com', work_phone: '+1-555-1004', attendance_state: 'checked_in' },
    { id: 5, name: 'Lisa Wang', job_title: 'HR Manager', department_id: 3, work_email: 'lisa.w@coheronworks.com', work_phone: '+1-555-1005', attendance_state: 'checked_in' },
];

// Mock Projects
export const mockProjects: any[] = [
    { id: 1, name: 'Mobile App Redesign', user_id: 2, partner_id: 1, date_start: '2024-01-01', date: '2024-03-31', task_count: 18, progress: 65 },
    { id: 2, name: 'API Gateway v2', user_id: 3, partner_id: 2, date_start: '2023-12-01', date: '2024-02-28', task_count: 24, progress: 100 },
    { id: 3, name: 'Dashboard Analytics', user_id: 4, partner_id: 3, date_start: '2024-01-15', date: '2024-04-15', task_count: 20, progress: 40 },
];

// Mock Tasks
export const mockTasks: any[] = [
    { id: 1, name: 'Design new login screen', project_id: 1, user_id: 3, stage_id: 2, priority: '1', date_deadline: '2024-02-10', description: 'Create mockups for the new login interface' },
    { id: 2, name: 'Implement authentication API', project_id: 1, user_id: 2, stage_id: 3, priority: '2', date_deadline: '2024-02-15', description: 'Build JWT-based authentication' },
    { id: 3, name: 'Database migration', project_id: 2, user_id: 4, stage_id: 4, priority: '0', date_deadline: '2024-02-01', description: 'Migrate from MySQL to PostgreSQL' },
    { id: 4, name: 'Setup CI/CD pipeline', project_id: 3, user_id: 4, stage_id: 1, priority: '1', date_deadline: '2024-02-20', description: 'Configure GitHub Actions' },
];

// Mock Stock Pickings
export const mockStockPickings: any[] = [
    { id: 1, name: 'WH/IN/00001', partner_id: 6, scheduled_date: '2024-01-25', state: 'done', picking_type: 'incoming', location_id: 1, location_dest_id: 2 },
    { id: 2, name: 'WH/OUT/00001', partner_id: 1, scheduled_date: '2024-01-26', state: 'assigned', picking_type: 'outgoing', location_id: 2, location_dest_id: 3 },
    { id: 3, name: 'WH/OUT/00002', partner_id: 2, scheduled_date: '2024-01-27', state: 'confirmed', picking_type: 'outgoing', location_id: 2, location_dest_id: 3 },
];

// Mock Payslips
export const mockPayslips: any[] = [
    { id: 1, name: 'SLIP/2024/01/001', employee_id: 1, date_from: '2024-01-01', date_to: '2024-01-31', basic_wage: 120000, net_wage: 105000, state: 'done' },
    { id: 2, name: 'SLIP/2024/01/002', employee_id: 2, date_from: '2024-01-01', date_to: '2024-01-31', basic_wage: 95000, net_wage: 82000, state: 'done' },
    { id: 3, name: 'SLIP/2024/01/003', employee_id: 3, date_from: '2024-01-01', date_to: '2024-01-31', basic_wage: 85000, net_wage: 74000, state: 'done' },
];

// Mock Applicants
export const mockApplicants: any[] = [
    { id: 1, name: 'Senior Python Developer', partner_name: 'David Wilson', email_from: 'david.w@email.com', job_id: 1, stage_id: 2, priority: '3' },
    { id: 2, name: 'Marketing Specialist', partner_name: 'Sarah Jones', email_from: 'sarah.j@email.com', job_id: 2, stage_id: 1, priority: '2' },
    { id: 3, name: 'DevOps Engineer', partner_name: 'Robert Brown', email_from: 'robert.b@email.com', job_id: 3, stage_id: 3, priority: '2' },
];

// Mock Policies
export const mockPolicies: any[] = [
    { id: 1, name: 'Employee Handbook 2024', category: 'General', create_date: '2024-01-01', body: 'General company policies and guidelines...' },
    { id: 2, name: 'Remote Work Policy', category: 'HR', create_date: '2024-01-15', body: 'Guidelines for working remotely...' },
    { id: 3, name: 'Expense Reimbursement', category: 'Finance', create_date: '2024-01-10', body: 'Process for claiming expenses...' },
];

// Mock Appraisals
export const mockAppraisals: any[] = [
    { id: 1, employee_id: 2, manager_id: 1, date_close: '2024-03-31', state: 'pending', final_assessment: 'Meeting expectations' },
    { id: 2, employee_id: 3, manager_id: 1, date_close: '2024-03-31', state: 'new' },
];

// Mock Courses
export const mockCourses: any[] = [
    { id: 1, name: 'Onboarding 101', description: 'Company introduction and basics', total_time: 4, members_count: 15 },
    { id: 2, name: 'Security Awareness', description: 'Cybersecurity best practices', total_time: 2, members_count: 45 },
    { id: 3, name: 'Odoo Development', description: 'Technical training for developers', total_time: 20, members_count: 8 },
];
