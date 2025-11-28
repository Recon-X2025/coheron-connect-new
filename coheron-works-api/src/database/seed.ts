import pool from './connection.js';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const userResult = await pool.query(
      `INSERT INTO users (uid, name, email, password_hash) 
       VALUES (1, 'Admin User', 'admin@coheron.com', $1) 
       ON CONFLICT (uid) DO NOTHING 
       RETURNING id`,
      [hashedPassword]
    );

    const userId = userResult.rows[0]?.id || 1;

    // Create sample partners
    await pool.query(`
      INSERT INTO partners (name, email, phone, company, type) VALUES
      ('Acme Corporation', 'contact@acme.com', '+1-555-0101', 'Acme Corp', 'company'),
      ('John Doe', 'john.doe@example.com', '+1-555-0102', 'Acme Corp', 'contact'),
      ('Jane Smith', 'jane.smith@example.com', '+1-555-0103', 'Tech Solutions', 'contact')
      ON CONFLICT DO NOTHING
    `);

    // Create sample products
    await pool.query(`
      INSERT INTO products (name, default_code, list_price, standard_price, qty_available, type) VALUES
      ('Laptop Computer', 'LAP-001', 999.99, 750.00, 50, 'product'),
      ('Wireless Mouse', 'MOU-001', 29.99, 15.00, 200, 'product'),
      ('Consulting Service', 'SRV-001', 150.00, 100.00, 0, 'service'),
      ('Office Chair', 'CHR-001', 299.99, 200.00, 30, 'product')
      ON CONFLICT DO NOTHING
    `);

    // Get partner and product IDs
    const partners = await pool.query('SELECT id FROM partners LIMIT 3');
    const products = await pool.query('SELECT id FROM products LIMIT 4');

    if (partners.rows.length > 0 && products.rows.length > 0) {
      const partnerId = partners.rows[0].id;
      const productId = products.rows[0].id;

      // Create sample leads
      await pool.query(`
        INSERT INTO leads (name, partner_id, email, phone, expected_revenue, probability, stage, user_id, priority, type) VALUES
        ('New Lead - Acme Corp', $1, 'lead1@acme.com', '+1-555-0201', 50000, 30, 'new', $2, 'high', 'lead'),
        ('Qualified Lead - Tech Solutions', $1, 'lead2@tech.com', '+1-555-0202', 75000, 60, 'qualified', $2, 'medium', 'lead'),
        ('Opportunity - Enterprise Deal', $1, 'opp1@enterprise.com', '+1-555-0203', 150000, 80, 'proposition', $2, 'high', 'opportunity')
        ON CONFLICT DO NOTHING
      `, [partnerId, userId]);

      // Create sample sale orders
      await pool.query(`
        INSERT INTO sale_orders (name, partner_id, date_order, amount_total, state, user_id) VALUES
        ('SO001', $1, CURRENT_TIMESTAMP, 999.99, 'draft', $2),
        ('SO002', $1, CURRENT_TIMESTAMP, 299.99, 'sent', $2),
        ('SO003', $1, CURRENT_TIMESTAMP, 1529.97, 'sale', $2)
        ON CONFLICT (name) DO NOTHING
      `, [partnerId, userId]);

      // Create sample invoices
      await pool.query(`
        INSERT INTO invoices (name, partner_id, invoice_date, amount_total, amount_residual, state, payment_state, move_type) VALUES
        ('INV/2024/0001', $1, CURRENT_DATE, 999.99, 999.99, 'posted', 'not_paid', 'out_invoice'),
        ('INV/2024/0002', $1, CURRENT_DATE, 299.99, 0, 'posted', 'paid', 'out_invoice'),
        ('INV/2024/0003', $1, CURRENT_DATE, 1529.97, 529.97, 'posted', 'partial', 'out_invoice')
        ON CONFLICT (name) DO NOTHING
      `, [partnerId]);

      // Create sample manufacturing orders
      await pool.query(`
        INSERT INTO manufacturing_orders (name, product_id, product_qty, state, date_planned_start, date_planned_finished, user_id) VALUES
        ('MO/001', $1, 10, 'draft', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '7 days', $2),
        ('MO/002', $1, 25, 'confirmed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '14 days', $2),
        ('MO/003', $1, 50, 'progress', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '21 days', $2)
        ON CONFLICT (name) DO NOTHING
      `, [productId, userId]);

      // Create sample campaigns
      await pool.query(`
        INSERT INTO campaigns (name, campaign_type, state, start_date, end_date, budget, revenue, user_id, clicks, impressions, leads_count) VALUES
        ('Summer Sale Campaign', 'email', 'in_progress', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', 5000, 25000, $1, 1500, 10000, 25),
        ('Product Launch', 'social', 'done', CURRENT_DATE - INTERVAL '60 days', CURRENT_DATE - INTERVAL '30 days', 10000, 75000, $1, 5000, 50000, 100),
        ('Holiday Promotion', 'website', 'draft', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '60 days', 7500, 0, $1, 0, 0, 0)
        ON CONFLICT DO NOTHING
      `, [userId]);

      // Create sample employees
      await pool.query(`
        INSERT INTO employees (employee_id, name, work_email, work_phone, job_title, department_id, hire_date, employment_type, attendance_state) VALUES
        ('EMP001', 'Rajesh Kumar', 'rajesh@coheron.com', '+91-98765-43210', 'Software Engineer', 1, '2020-01-15', 'full_time', 'checked_in'),
        ('EMP002', 'Priya Sharma', 'priya@coheron.com', '+91-91234-56789', 'HR Manager', 2, '2019-03-01', 'full_time', 'checked_out'),
        ('EMP003', 'Amit Patel', 'amit@coheron.com', '+91-99887-66554', 'Sales Executive', 3, '2021-07-01', 'full_time', 'checked_in'),
        ('EMP004', 'Sneha Reddy', 'sneha@coheron.com', '+91-98765-12345', 'Product Manager', 1, '2022-05-10', 'full_time', 'checked_in')
        ON CONFLICT (employee_id) DO NOTHING
      `);

      // Get employee IDs
      const employees = await pool.query('SELECT id, employee_id FROM employees LIMIT 4');
      
      if (employees.rows.length > 0) {
        const emp1 = employees.rows[0].id;
        const emp2 = employees.rows[1]?.id || emp1;
        const emp3 = employees.rows[2]?.id || emp1;

        // Create sample leave requests
        await pool.query(`
          INSERT INTO leave_requests (employee_id, leave_type, from_date, to_date, days, reason, status) VALUES
          ($1, 'annual', CURRENT_DATE + INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days', 5, 'Family vacation', 'pending'),
          ($2, 'sick', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE - INTERVAL '2 days', 1, 'Medical appointment', 'approved'),
          ($3, 'casual', CURRENT_DATE + INTERVAL '8 days', CURRENT_DATE + INTERVAL '8 days', 1, 'Personal work', 'pending')
          ON CONFLICT DO NOTHING
        `, [emp1, emp2, emp3]);

        // Create sample leave balance
        await pool.query(`
          INSERT INTO leave_balance (employee_id, leave_type, total_days, used_days, year) VALUES
          ($1, 'annual', 12, 3, EXTRACT(YEAR FROM CURRENT_DATE)),
          ($1, 'sick', 6, 1, EXTRACT(YEAR FROM CURRENT_DATE)),
          ($1, 'casual', 8, 2, EXTRACT(YEAR FROM CURRENT_DATE)),
          ($1, 'earned', 15, 0, EXTRACT(YEAR FROM CURRENT_DATE))
          ON CONFLICT (employee_id, leave_type, year) DO NOTHING
        `, [emp1]);

        // Create sample courses
        await pool.query(`
          INSERT INTO courses (name, description, total_time, category, instructor, members_count) VALUES
          ('React Advanced Development', 'Advanced React patterns, hooks, and performance optimization', 40, 'Technical', 'John Doe', 25),
          ('Leadership Skills', 'Essential leadership and management skills for team leads', 24, 'Soft Skills', 'Jane Smith', 15),
          ('Node.js Backend Development', 'Building scalable backend services with Node.js', 35, 'Technical', 'Mike Johnson', 20)
          ON CONFLICT DO NOTHING
        `);

        // Create sample policies
        await pool.query(`
          INSERT INTO policies (name, category, body, is_active) VALUES
          ('Code of Conduct', 'General', 'Our company code of conduct outlines expected behavior and ethical standards for all employees.', true),
          ('Leave Policy', 'HR', 'Annual leave: 12 days, Sick leave: 6 days, Casual leave: 8 days per year.', true),
          ('Remote Work Policy', 'HR', 'Employees can work remotely up to 3 days per week with manager approval.', true),
          ('Data Security Policy', 'IT', 'All employees must follow data security protocols and maintain confidentiality.', true)
          ON CONFLICT DO NOTHING
        `);

        // Create sample applicants
        await pool.query(`
          INSERT INTO applicants (partner_name, name, email_from, stage_id, priority) VALUES
          ('Ravi Singh', 'Senior Full Stack Developer', 'ravi.singh@example.com', 1, 3),
          ('Kavita Nair', 'HR Manager', 'kavita.nair@example.com', 2, 4),
          ('Vikram Mehta', 'Sales Executive', 'vikram.mehta@example.com', 1, 2)
          ON CONFLICT DO NOTHING
        `);

        // Create sample appraisals
        await pool.query(`
          INSERT INTO appraisals (employee_id, manager_id, appraisal_period, date_close, state) VALUES
          ($1, $2, 'Q4 2024', CURRENT_DATE + INTERVAL '30 days', 'pending'),
          ($2, $2, 'Annual 2024', CURRENT_DATE + INTERVAL '45 days', 'new')
          ON CONFLICT DO NOTHING
        `, [emp1, emp2]);
      }
    }

    console.log('✅ Database seeding completed successfully!');
    console.log('📝 Default credentials:');
    console.log('   Email: admin@coheron.com');
    console.log('   Password: admin123');
    console.log('👥 Sample HR data created:');
    console.log('   - 4 employees');
    console.log('   - 3 leave requests');
    console.log('   - 3 courses');
    console.log('   - 4 policies');
    console.log('   - 3 applicants');
    console.log('   - 2 appraisals');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();

