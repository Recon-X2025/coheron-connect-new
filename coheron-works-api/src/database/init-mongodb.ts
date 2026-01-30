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

    // Import models to ensure indexes are created
    const User = (await import('../models/User.js')).default;
    const Partner = (await import('../models/Partner.js')).default;
    const Product = (await import('../models/Product.js')).default;
    const Role = (await import('../models/Role.js')).default;
    const Permission = (await import('../models/Permission.js')).default;
    const UserRole = (await import('../models/UserRole.js')).default;
    const RolePermission = (await import('../models/RolePermission.js')).default;

    console.log('Ensuring indexes...');
    await User.ensureIndexes();
    await Partner.ensureIndexes();
    await Product.ensureIndexes();
    await Role.ensureIndexes();
    await Permission.ensureIndexes();
    await UserRole.ensureIndexes();
    await RolePermission.ensureIndexes();

    // Seed admin user
    const existingAdmin = await User.findOne({ email: 'admin@coheron.com' });
    if (!existingAdmin) {
      console.log('Creating admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await User.create({
        uid: 1,
        name: 'Admin User',
        email: 'admin@coheron.com',
        password_hash: hashedPassword,
      });
    }

    // Seed partners
    const partnerCount = await Partner.countDocuments();
    if (partnerCount === 0) {
      console.log('Seeding partners...');
      await Partner.insertMany([
        { name: 'Acme Corporation', email: 'contact@acme.com', phone: '+1-555-0101', company: 'Acme Corp', type: 'company' },
        { name: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-0102', company: 'Acme Corp', type: 'contact' },
        { name: 'Jane Smith', email: 'jane.smith@example.com', phone: '+1-555-0103', company: 'Tech Solutions', type: 'contact' },
      ]);
    }

    // Seed products
    const productCount = await Product.countDocuments();
    if (productCount === 0) {
      console.log('Seeding products...');
      await Product.insertMany([
        { name: 'Laptop Computer', default_code: 'LAP-001', list_price: 999.99, standard_price: 750.00, qty_available: 50, type: 'product' },
        { name: 'Wireless Mouse', default_code: 'MOU-001', list_price: 29.99, standard_price: 15.00, qty_available: 200, type: 'product' },
        { name: 'Consulting Service', default_code: 'SRV-001', list_price: 150.00, standard_price: 100.00, qty_available: 0, type: 'service' },
        { name: 'Office Chair', default_code: 'CHR-001', list_price: 299.99, standard_price: 200.00, qty_available: 30, type: 'product' },
      ]);
    }

    // Seed RBAC roles
    const roleCount = await Role.countDocuments();
    if (roleCount === 0) {
      console.log('Seeding roles...');
      await Role.insertMany([
        { code: 'admin', name: 'Administrator', description: 'Full system access' },
        { code: 'sales_manager', name: 'Sales Manager', description: 'Manage sales operations' },
        { code: 'sales_user', name: 'Sales User', description: 'Basic sales access' },
        { code: 'hr_manager', name: 'HR Manager', description: 'Manage HR operations' },
        { code: 'hr_user', name: 'HR User', description: 'Basic HR access' },
        { code: 'inventory_manager', name: 'Inventory Manager', description: 'Manage inventory' },
        { code: 'accounting_manager', name: 'Accounting Manager', description: 'Manage accounting' },
        { code: 'crm_manager', name: 'CRM Manager', description: 'Manage CRM operations' },
        { code: 'project_manager', name: 'Project Manager', description: 'Manage projects' },
      ]);
    }

    // Seed permissions
    const permCount = await Permission.countDocuments();
    if (permCount === 0) {
      console.log('Seeding permissions...');
      const modules = ['crm', 'sales', 'inventory', 'manufacturing', 'accounting', 'hr', 'projects', 'support', 'website'];
      const resources = ['leads', 'orders', 'invoices', 'products', 'partners', 'employees', 'tickets'];
      const actions = ['view', 'create', 'edit', 'delete'];

      const perms: any[] = [];
      for (const mod of modules) {
        for (const action of actions) {
          perms.push({
            code: `${mod}.${action}`,
            name: `${mod} ${action}`,
            module: mod,
            action,
          });
        }
      }
      await Permission.insertMany(perms);
    }

    // Assign admin role to admin user
    const adminUser = await User.findOne({ email: 'admin@coheron.com' });
    const adminRole = await Role.findOne({ code: 'admin' });
    if (adminUser && adminRole) {
      const existing = await UserRole.findOne({ user_id: adminUser._id, role_id: adminRole._id });
      if (!existing) {
        await UserRole.create({ user_id: adminUser._id, role_id: adminRole._id, is_active: true });
      }
    }

    // Assign all permissions to admin role
    if (adminRole) {
      const allPerms = await Permission.find();
      const existingRolePerms = await RolePermission.find({ role_id: adminRole._id });
      const existingPermIds = new Set(existingRolePerms.map(rp => rp.permission_id.toString()));

      const newRolePerms = allPerms
        .filter(p => !existingPermIds.has(p._id.toString()))
        .map(p => ({ role_id: adminRole._id, permission_id: p._id, granted: true }));

      if (newRolePerms.length > 0) {
        await RolePermission.insertMany(newRolePerms);
      }
    }

    console.log('MongoDB initialization completed successfully!');
    console.log('Default credentials:');
    console.log('  Email: admin@coheron.com');
    console.log('  Password: admin123');

    process.exit(0);
  } catch (error) {
    console.error('MongoDB initialization failed:', error);
    process.exit(1);
  }
}

initMongoDB();
