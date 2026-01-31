import { connectDB } from './connection.js';
import mongoose from './connection.js';
import bcrypt from 'bcryptjs';
import User from '../shared/models/User.js';
import { Partner } from '../shared/models/Partner.js';
import { Product } from '../shared/models/Product.js';
import { Lead } from '../models/Lead.js';
import { SaleOrder } from '../models/SaleOrder.js';
import { Invoice } from '../models/Invoice.js';
import ManufacturingOrder from '../models/ManufacturingOrder.js';
import { Campaign } from '../models/Campaign.js';
import { Employee } from '../models/Employee.js';
import { LeaveRequest, LeaveBalance } from '../models/Leave.js';
import { Course } from '../models/Course.js';
import { Policy } from '../models/Policy.js';
import { Applicant } from '../models/Applicant.js';
import { Appraisal } from '../models/Appraisal.js';

async function seed() {
  try {
    await connectDB();
    console.log('Seeding database with sample data...');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('Coheron@2025!', 10);
    const user = await User.findOneAndUpdate(
      { uid: 1 },
      { uid: 1, name: 'Admin User', email: 'admin@coheron.com', password_hash: hashedPassword },
      { upsert: true, new: true }
    );
    const userId = user._id;

    // Create sample partners
    const partnersData = [
      { name: 'Acme Corporation', email: 'contact@acme.com', phone: '+1-555-0101' },
      { name: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-0102' },
      { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1-555-0103' },
    ];
    for (const p of partnersData) {
      await Partner.findOneAndUpdate({ email: p.email }, p, { upsert: true, new: true });
    }

    // Create sample products
    const productsData = [
      { name: 'Laptop Computer', sku: 'LAP-001', price: 999.99, quantity: 50, status: 'active' },
      { name: 'Wireless Mouse', sku: 'MOU-001', price: 29.99, quantity: 200, status: 'active' },
      { name: 'Consulting Service', sku: 'SRV-001', price: 150.00, quantity: 0, status: 'active' },
      { name: 'Office Chair', sku: 'CHR-001', price: 299.99, quantity: 30, status: 'active' },
    ];
    for (const p of productsData) {
      await Product.findOneAndUpdate({ sku: p.sku }, p, { upsert: true, new: true });
    }

    // Get partner and product IDs
    const partner = await Partner.findOne({ email: 'contact@acme.com' });
    const product = await Product.findOne({ sku: 'LAP-001' });

    if (partner && product) {
      const partnerId = partner._id;
      const productId = product._id;

      // Create sample leads
      const leadsData = [
        { name: 'New Lead - Acme Corp', partner_id: partnerId, email: 'lead1@acme.com', phone: '+1-555-0201', expected_revenue: 50000, probability: 30, stage: 'new', user_id: userId, priority: 'high', type: 'lead' },
        { name: 'Qualified Lead - Tech Solutions', partner_id: partnerId, email: 'lead2@tech.com', phone: '+1-555-0202', expected_revenue: 75000, probability: 60, stage: 'qualified', user_id: userId, priority: 'medium', type: 'lead' },
        { name: 'Opportunity - Enterprise Deal', partner_id: partnerId, email: 'opp1@enterprise.com', phone: '+1-555-0203', expected_revenue: 150000, probability: 80, stage: 'proposition', user_id: userId, priority: 'high', type: 'opportunity' },
      ];
      for (const l of leadsData) {
        await Lead.findOneAndUpdate({ email: l.email }, l, { upsert: true, new: true });
      }

      // Create sample sale orders
      const saleOrdersData = [
        { name: 'SO001', partner_id: partnerId, date_order: new Date(), amount_total: 999.99, state: 'draft', user_id: userId },
        { name: 'SO002', partner_id: partnerId, date_order: new Date(), amount_total: 299.99, state: 'sent', user_id: userId },
        { name: 'SO003', partner_id: partnerId, date_order: new Date(), amount_total: 1529.97, state: 'sale', user_id: userId },
      ];
      for (const so of saleOrdersData) {
        await SaleOrder.findOneAndUpdate({ name: so.name }, so, { upsert: true, new: true });
      }

      // Create sample invoices
      const invoicesData = [
        { invoiceNumber: 'INV/2024/0001', customerId: partnerId, amount: 999.99, status: 'posted', issueDate: new Date(), dueDate: new Date(Date.now() + 30 * 86400000) },
        { invoiceNumber: 'INV/2024/0002', customerId: partnerId, amount: 299.99, status: 'paid', issueDate: new Date(), dueDate: new Date(Date.now() + 30 * 86400000) },
        { invoiceNumber: 'INV/2024/0003', customerId: partnerId, amount: 1529.97, status: 'partial', issueDate: new Date(), dueDate: new Date(Date.now() + 30 * 86400000) },
      ];
      for (const inv of invoicesData) {
        await Invoice.findOneAndUpdate({ invoiceNumber: inv.invoiceNumber }, inv, { upsert: true, new: true });
      }

      // Create sample manufacturing orders
      const now = new Date();
      const moData = [
        { name: 'MO/001', product_id: productId, product_qty: 10, state: 'draft', date_planned_start: now, date_planned_finished: new Date(now.getTime() + 7 * 86400000), user_id: userId },
        { name: 'MO/002', product_id: productId, product_qty: 25, state: 'confirmed', date_planned_start: now, date_planned_finished: new Date(now.getTime() + 14 * 86400000), user_id: userId },
        { name: 'MO/003', product_id: productId, product_qty: 50, state: 'progress', date_planned_start: now, date_planned_finished: new Date(now.getTime() + 21 * 86400000), user_id: userId },
      ];
      for (const mo of moData) {
        await ManufacturingOrder.findOneAndUpdate({ name: mo.name }, mo, { upsert: true, new: true });
      }

      // Create sample campaigns
      const campaignsData = [
        { name: 'Summer Sale Campaign', campaign_type: 'email', state: 'in_progress', start_date: now, end_date: new Date(now.getTime() + 30 * 86400000), budget: 5000, revenue: 25000, user_id: userId, clicks: 1500, impressions: 10000, leads_count: 25 },
        { name: 'Product Launch', campaign_type: 'social', state: 'done', start_date: new Date(now.getTime() - 60 * 86400000), end_date: new Date(now.getTime() - 30 * 86400000), budget: 10000, revenue: 75000, user_id: userId, clicks: 5000, impressions: 50000, leads_count: 100 },
        { name: 'Holiday Promotion', campaign_type: 'website', state: 'draft', start_date: new Date(now.getTime() + 30 * 86400000), end_date: new Date(now.getTime() + 60 * 86400000), budget: 7500, revenue: 0, user_id: userId, clicks: 0, impressions: 0, leads_count: 0 },
      ];
      for (const c of campaignsData) {
        await Campaign.findOneAndUpdate({ name: c.name }, c, { upsert: true, new: true });
      }

      // Create sample employees
      const employeesData = [
        { employee_id: 'EMP001', name: 'Rajesh Kumar', work_email: 'rajesh@coheron.com', work_phone: '+91-98765-43210', job_title: 'Software Engineer', hire_date: new Date('2020-01-15'), employment_type: 'full_time' },
        { employee_id: 'EMP002', name: 'Priya Sharma', work_email: 'priya@coheron.com', work_phone: '+91-91234-56789', job_title: 'HR Manager', hire_date: new Date('2019-03-01'), employment_type: 'full_time' },
        { employee_id: 'EMP003', name: 'Amit Patel', work_email: 'amit@coheron.com', work_phone: '+91-99887-66554', job_title: 'Sales Executive', hire_date: new Date('2021-07-01'), employment_type: 'full_time' },
        { employee_id: 'EMP004', name: 'Sneha Reddy', work_email: 'sneha@coheron.com', work_phone: '+91-98765-12345', job_title: 'Product Manager', hire_date: new Date('2022-05-10'), employment_type: 'full_time' },
      ];
      for (const e of employeesData) {
        await Employee.findOneAndUpdate({ employee_id: e.employee_id }, e, { upsert: true, new: true });
      }

      // Get employee IDs
      const emp1 = await Employee.findOne({ employee_id: 'EMP001' });
      const emp2 = await Employee.findOne({ employee_id: 'EMP002' });
      const emp3 = await Employee.findOne({ employee_id: 'EMP003' });

      if (emp1 && emp2 && emp3) {
        // Create sample leave requests
        const leaveData = [
          { employee_id: emp1._id, leave_type: 'annual', from_date: new Date(now.getTime() + 5 * 86400000), to_date: new Date(now.getTime() + 10 * 86400000), days: 5, reason: 'Family vacation', status: 'pending' },
          { employee_id: emp2._id, leave_type: 'sick', from_date: new Date(now.getTime() - 2 * 86400000), to_date: new Date(now.getTime() - 2 * 86400000), days: 1, reason: 'Medical appointment', status: 'approved' },
          { employee_id: emp3._id, leave_type: 'casual', from_date: new Date(now.getTime() + 8 * 86400000), to_date: new Date(now.getTime() + 8 * 86400000), days: 1, reason: 'Personal work', status: 'pending' },
        ];
        for (const l of leaveData) {
          await LeaveRequest.findOneAndUpdate(
            { employee_id: l.employee_id, leave_type: l.leave_type, from_date: l.from_date },
            l,
            { upsert: true, new: true }
          );
        }

        // Create sample leave balance
        const currentYear = new Date().getFullYear();
        const balanceData = [
          { employee_id: emp1._id, leave_type: 'annual', total: 12, used: 3, remaining: 9, year: currentYear },
          { employee_id: emp1._id, leave_type: 'sick', total: 6, used: 1, remaining: 5, year: currentYear },
          { employee_id: emp1._id, leave_type: 'casual', total: 8, used: 2, remaining: 6, year: currentYear },
          { employee_id: emp1._id, leave_type: 'earned', total: 15, used: 0, remaining: 15, year: currentYear },
        ];
        for (const b of balanceData) {
          await LeaveBalance.findOneAndUpdate(
            { employee_id: b.employee_id, leave_type: b.leave_type, year: b.year },
            b,
            { upsert: true, new: true }
          );
        }

        // Create sample courses
        const coursesData = [
          { name: 'React Advanced Development', description: 'Advanced React patterns, hooks, and performance optimization', total_time: 40, category: 'Technical', instructor: 'John Doe' },
          { name: 'Leadership Skills', description: 'Essential leadership and management skills for team leads', total_time: 24, category: 'Soft Skills', instructor: 'Jane Smith' },
          { name: 'Node.js Backend Development', description: 'Building scalable backend services with Node.js', total_time: 35, category: 'Technical', instructor: 'Mike Johnson' },
        ];
        for (const c of coursesData) {
          await Course.findOneAndUpdate({ name: c.name }, c, { upsert: true, new: true });
        }

        // Create sample policies
        const policiesData = [
          { name: 'Code of Conduct', category: 'General', body: 'Our company code of conduct outlines expected behavior and ethical standards for all employees.', is_active: true },
          { name: 'Leave Policy', category: 'HR', body: 'Annual leave: 12 days, Sick leave: 6 days, Casual leave: 8 days per year.', is_active: true },
          { name: 'Remote Work Policy', category: 'HR', body: 'Employees can work remotely up to 3 days per week with manager approval.', is_active: true },
          { name: 'Data Security Policy', category: 'IT', body: 'All employees must follow data security protocols and maintain confidentiality.', is_active: true },
        ];
        for (const p of policiesData) {
          await Policy.findOneAndUpdate({ name: p.name }, p, { upsert: true, new: true });
        }

        // Create sample applicants
        const applicantsData = [
          { partner_name: 'Ravi Singh', name: 'Senior Full Stack Developer', email_from: 'ravi.singh@example.com', stage_id: 1, priority: 3 },
          { partner_name: 'Kavita Nair', name: 'HR Manager', email_from: 'kavita.nair@example.com', stage_id: 2, priority: 4 },
          { partner_name: 'Vikram Mehta', name: 'Sales Executive', email_from: 'vikram.mehta@example.com', stage_id: 1, priority: 2 },
        ];
        for (const a of applicantsData) {
          await Applicant.findOneAndUpdate({ email_from: a.email_from }, a, { upsert: true, new: true });
        }

        // Create sample appraisals
        const appraisalsData = [
          { employee_id: emp1._id, manager_id: emp2._id, appraisal_period: 'Q4 2024', date_close: new Date(now.getTime() + 30 * 86400000), state: 'pending' },
          { employee_id: emp2._id, manager_id: emp2._id, appraisal_period: 'Annual 2024', date_close: new Date(now.getTime() + 45 * 86400000), state: 'new' },
        ];
        for (const a of appraisalsData) {
          await Appraisal.findOneAndUpdate(
            { employee_id: a.employee_id, appraisal_period: a.appraisal_period },
            a,
            { upsert: true, new: true }
          );
        }
      }
    }

    console.log('Database seeding completed successfully!');
    console.log('Default credentials:');
    console.log('   Email: admin@coheron.com');
    console.log('   Password: Coheron@2025!');
    console.log('Sample HR data created:');
    console.log('   - 4 employees');
    console.log('   - 3 leave requests');
    console.log('   - 3 courses');
    console.log('   - 4 policies');
    console.log('   - 3 applicants');
    console.log('   - 2 appraisals');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
