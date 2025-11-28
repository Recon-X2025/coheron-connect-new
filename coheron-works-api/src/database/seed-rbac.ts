import pool from './connection.js';

/**
 * Seed RBAC roles and permissions based on expanded user stories
 * This creates the complete role hierarchy for all modules
 */

interface Role {
  name: string;
  code: string;
  description: string;
  module: string;
  level: number;
  parent_code?: string;
}

interface Permission {
  name: string;
  code: string;
  description: string;
  module: string;
  feature?: string;
  action: string;
  resource_type?: string;
  record_access_level?: string;
}

const roles: Role[] = [
  // CRM Module Roles (5 levels)
  { name: 'CRM Viewer', code: 'crm_viewer', description: 'Read-only access to assigned CRM records', module: 'crm', level: 1 },
  { name: 'CRM User', code: 'crm_user', description: 'Basic CRM operations on assigned records', module: 'crm', level: 2, parent_code: 'crm_viewer' },
  { name: 'CRM Team Lead', code: 'crm_team_lead', description: 'Team-level CRM management', module: 'crm', level: 3, parent_code: 'crm_user' },
  { name: 'CRM Manager', code: 'crm_manager', description: 'Department-wide CRM management', module: 'crm', level: 4, parent_code: 'crm_team_lead' },
  { name: 'CRM Administrator', code: 'crm_admin', description: 'Full CRM system access', module: 'crm', level: 5, parent_code: 'crm_manager' },

  // Sales Module Roles (6 levels)
  { name: 'Sales Viewer', code: 'sales_viewer', description: 'Read-only access to assigned sales records', module: 'sales', level: 1 },
  { name: 'Sales Representative (Junior)', code: 'sales_rep_junior', description: 'Basic sales operations', module: 'sales', level: 2, parent_code: 'sales_viewer' },
  { name: 'Sales Representative (Senior)', code: 'sales_rep_senior', description: 'Advanced sales operations with limited discounts', module: 'sales', level: 3, parent_code: 'sales_rep_junior' },
  { name: 'Sales Team Lead', code: 'sales_team_lead', description: 'Team sales management with approval up to $50K', module: 'sales', level: 4, parent_code: 'sales_rep_senior' },
  { name: 'Sales Manager', code: 'sales_manager', description: 'Department sales management with approval up to $500K', module: 'sales', level: 5, parent_code: 'sales_team_lead' },
  { name: 'Sales Director', code: 'sales_director', description: 'Full sales system access', module: 'sales', level: 6, parent_code: 'sales_manager' },

  // Inventory Module Roles (7 levels)
  { name: 'Inventory Viewer', code: 'inventory_viewer', description: 'Read-only inventory access', module: 'inventory', level: 1 },
  { name: 'Warehouse Operator (Basic)', code: 'warehouse_operator_basic', description: 'Basic warehouse operations with approval required', module: 'inventory', level: 2, parent_code: 'inventory_viewer' },
  { name: 'Warehouse Operator (Advanced)', code: 'warehouse_operator_advanced', description: 'Advanced warehouse operations with self-approval up to $1K', module: 'inventory', level: 3, parent_code: 'warehouse_operator_basic' },
  { name: 'Storekeeper', code: 'storekeeper', description: 'Store management with approval up to $10K', module: 'inventory', level: 4, parent_code: 'warehouse_operator_advanced' },
  { name: 'Warehouse Supervisor', code: 'warehouse_supervisor', description: 'Warehouse management with full approval', module: 'inventory', level: 5, parent_code: 'storekeeper' },
  { name: 'Inventory Manager', code: 'inventory_manager', description: 'Regional inventory management', module: 'inventory', level: 6, parent_code: 'warehouse_supervisor' },
  { name: 'Inventory Director', code: 'inventory_director', description: 'Global inventory management', module: 'inventory', level: 7, parent_code: 'inventory_manager' },

  // Accounting Module Roles (8 levels)
  { name: 'Accounting Viewer', code: 'accounting_viewer', description: 'Read-only accounting access', module: 'accounting', level: 1 },
  { name: 'Accounts Payable Clerk (Junior)', code: 'ap_clerk_junior', description: 'Basic AP operations', module: 'accounting', level: 2, parent_code: 'accounting_viewer' },
  { name: 'Accounts Payable Clerk (Senior)', code: 'ap_clerk_senior', description: 'Advanced AP operations', module: 'accounting', level: 3, parent_code: 'ap_clerk_junior' },
  { name: 'Accounts Receivable Clerk (Junior)', code: 'ar_clerk_junior', description: 'Basic AR operations', module: 'accounting', level: 4, parent_code: 'accounting_viewer' },
  { name: 'Accounts Receivable Clerk (Senior)', code: 'ar_clerk_senior', description: 'Advanced AR operations', module: 'accounting', level: 5, parent_code: 'ar_clerk_junior' },
  { name: 'Accounting Supervisor', code: 'accounting_supervisor', description: 'AP/AR supervision with approval up to $10K', module: 'accounting', level: 6, parent_code: 'ap_clerk_senior' },
  { name: 'Accountant', code: 'accountant', description: 'Full accounting with approval up to $50K', module: 'accounting', level: 7, parent_code: 'accounting_supervisor' },
  { name: 'Finance Manager', code: 'finance_manager', description: 'Full financial management', module: 'accounting', level: 8, parent_code: 'accountant' },

  // HR Module Roles (7 levels)
  { name: 'Employee Self-Service', code: 'employee_self_service', description: 'Employee self-service access', module: 'hr', level: 1 },
  { name: 'HR Assistant', code: 'hr_assistant', description: 'Basic HR operations', module: 'hr', level: 2, parent_code: 'employee_self_service' },
  { name: 'HR Executive', code: 'hr_executive', description: 'HR operations without salary access', module: 'hr', level: 3, parent_code: 'hr_assistant' },
  { name: 'HR Manager', code: 'hr_manager', description: 'HR management with limited salary access', module: 'hr', level: 4, parent_code: 'hr_executive' },
  { name: 'Payroll Administrator', code: 'payroll_admin', description: 'Payroll management', module: 'hr', level: 5, parent_code: 'hr_manager' },
  { name: 'HR Director', code: 'hr_director', description: 'Full HR management', module: 'hr', level: 6, parent_code: 'payroll_admin' },
  { name: 'HR System Administrator', code: 'hr_system_admin', description: 'HR system administration', module: 'hr', level: 7, parent_code: 'hr_director' },

  // Support Module Roles (7 levels - Multi-tier)
  { name: 'Support Viewer', code: 'support_viewer', description: 'Read-only support access', module: 'support', level: 1 },
  { name: 'Support Agent (Tier 1)', code: 'support_agent_tier1', description: 'Tier 1 support - create and respond to tickets', module: 'support', level: 2, parent_code: 'support_viewer' },
  { name: 'Support Agent (Tier 2)', code: 'support_agent_tier2', description: 'Tier 2 support - resolve and escalate tickets', module: 'support', level: 3, parent_code: 'support_agent_tier1' },
  { name: 'Support Specialist (Tier 3)', code: 'support_specialist_tier3', description: 'Tier 3 support - close tickets and access specialty area', module: 'support', level: 4, parent_code: 'support_agent_tier2' },
  { name: 'Support Team Lead', code: 'support_team_lead', description: 'Team support management', module: 'support', level: 5, parent_code: 'support_specialist_tier3' },
  { name: 'Support Manager', code: 'support_manager', description: 'Department support management', module: 'support', level: 6, parent_code: 'support_team_lead' },
  { name: 'Support Director', code: 'support_director', description: 'Full support system access', module: 'support', level: 7, parent_code: 'support_manager' },

  // System Admin Role
  { name: 'System Administrator', code: 'system_admin', description: 'Full system access', module: 'system', level: 10 },
];

const permissions: Permission[] = [
  // System Permissions
  { name: 'View Roles', code: 'system.roles.view', description: 'View system roles', module: 'system', action: 'view' },
  { name: 'Create Roles', code: 'system.roles.create', description: 'Create new roles', module: 'system', action: 'create' },
  { name: 'Edit Roles', code: 'system.roles.edit', description: 'Edit existing roles', module: 'system', action: 'edit' },
  { name: 'Delete Roles', code: 'system.roles.delete', description: 'Delete roles', module: 'system', action: 'delete' },
  { name: 'View Permissions', code: 'system.permissions.view', description: 'View system permissions', module: 'system', action: 'view' },
  { name: 'Create Permissions', code: 'system.permissions.create', description: 'Create new permissions', module: 'system', action: 'create' },
  { name: 'Manage Users', code: 'system.users.manage', description: 'Manage user roles and permissions', module: 'system', action: 'manage' },
  { name: 'View Users', code: 'system.users.view', description: 'View user information', module: 'system', action: 'view' },
  { name: 'View Audit Logs', code: 'system.audit.view', description: 'View audit logs', module: 'system', action: 'view' },

  // CRM Permissions
  { name: 'View Leads', code: 'crm.leads.view', description: 'View CRM leads', module: 'crm', feature: 'leads', action: 'view', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Create Leads', code: 'crm.leads.create', description: 'Create new leads', module: 'crm', feature: 'leads', action: 'create', resource_type: 'lead' },
  { name: 'Edit Leads', code: 'crm.leads.edit', description: 'Edit leads', module: 'crm', feature: 'leads', action: 'edit', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Delete Leads', code: 'crm.leads.delete', description: 'Delete leads', module: 'crm', feature: 'leads', action: 'delete', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Convert Leads', code: 'crm.leads.convert', description: 'Convert leads to opportunities', module: 'crm', feature: 'leads', action: 'approve', resource_type: 'lead', record_access_level: 'own' },
  { name: 'View All Leads', code: 'crm.leads.view_all', description: 'View all leads (team/department/all)', module: 'crm', feature: 'leads', action: 'view', resource_type: 'lead', record_access_level: 'all' },
  { name: 'View Opportunities', code: 'crm.opportunities.view', description: 'View opportunities', module: 'crm', feature: 'opportunities', action: 'view', resource_type: 'opportunity', record_access_level: 'own' },
  { name: 'Create Opportunities', code: 'crm.opportunities.create', description: 'Create opportunities', module: 'crm', feature: 'opportunities', action: 'create', resource_type: 'opportunity' },
  { name: 'Edit Opportunities', code: 'crm.opportunities.edit', description: 'Edit opportunities', module: 'crm', feature: 'opportunities', action: 'edit', resource_type: 'opportunity', record_access_level: 'own' },

  // Sales Permissions
  { name: 'View Quotations', code: 'sales.quotations.view', description: 'View sales quotations', module: 'sales', feature: 'quotations', action: 'view', resource_type: 'quotation', record_access_level: 'own' },
  { name: 'Create Quotations', code: 'sales.quotations.create', description: 'Create quotations', module: 'sales', feature: 'quotations', action: 'create', resource_type: 'quotation' },
  { name: 'Edit Quotations', code: 'sales.quotations.edit', description: 'Edit quotations', module: 'sales', feature: 'quotations', action: 'edit', resource_type: 'quotation', record_access_level: 'own' },
  { name: 'Approve Quotations', code: 'sales.quotations.approve', description: 'Approve quotations', module: 'sales', feature: 'quotations', action: 'approve', resource_type: 'quotation' },
  { name: 'View Orders', code: 'sales.orders.view', description: 'View sales orders', module: 'sales', feature: 'orders', action: 'view', resource_type: 'order', record_access_level: 'own' },
  { name: 'Create Orders', code: 'sales.orders.create', description: 'Create sales orders', module: 'sales', feature: 'orders', action: 'create', resource_type: 'order' },
  { name: 'Cancel Orders', code: 'sales.orders.cancel', description: 'Cancel sales orders', module: 'sales', feature: 'orders', action: 'delete', resource_type: 'order' },
  { name: 'Apply Discounts', code: 'sales.discounts.apply', description: 'Apply discounts to orders', module: 'sales', feature: 'discounts', action: 'edit' },

  // Inventory Permissions
  { name: 'View Inventory', code: 'inventory.stock.view', description: 'View inventory stock', module: 'inventory', feature: 'stock', action: 'view', record_access_level: 'own' },
  { name: 'Create Goods Receipt', code: 'inventory.receipt.create', description: 'Create goods receipts', module: 'inventory', feature: 'receipt', action: 'create' },
  { name: 'Create Goods Issue', code: 'inventory.issue.create', description: 'Create goods issues', module: 'inventory', feature: 'issue', action: 'create' },
  { name: 'Approve Transactions', code: 'inventory.transactions.approve', description: 'Approve inventory transactions', module: 'inventory', feature: 'transactions', action: 'approve' },
  { name: 'Modify Item Master', code: 'inventory.items.edit', description: 'Modify item master data', module: 'inventory', feature: 'items', action: 'edit' },

  // Support Permissions
  { name: 'View Tickets', code: 'support.tickets.view', description: 'View support tickets', module: 'support', feature: 'tickets', action: 'view', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'Create Tickets', code: 'support.tickets.create', description: 'Create support tickets', module: 'support', feature: 'tickets', action: 'create', resource_type: 'ticket' },
  { name: 'Respond to Tickets', code: 'support.tickets.respond', description: 'Respond to tickets', module: 'support', feature: 'tickets', action: 'edit', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'Resolve Tickets', code: 'support.tickets.resolve', description: 'Resolve tickets', module: 'support', feature: 'tickets', action: 'approve', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'Close Tickets', code: 'support.tickets.close', description: 'Close tickets', module: 'support', feature: 'tickets', action: 'delete', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'View All Tickets', code: 'support.tickets.view_all', description: 'View all tickets (team/department)', module: 'support', feature: 'tickets', action: 'view', resource_type: 'ticket', record_access_level: 'all' },
];

async function seedRBAC() {
  try {
    console.log('🌱 Seeding RBAC roles and permissions...');

    // Create roles
    const roleMap = new Map<string, number>();
    
    for (const role of roles) {
      const parentId = role.parent_code ? roleMap.get(role.parent_code) : null;
      
      const result = await pool.query(
        `INSERT INTO roles (name, code, description, module, level, parent_role_id, is_system_role)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           level = EXCLUDED.level,
           parent_role_id = EXCLUDED.parent_role_id
         RETURNING id`,
        [role.name, role.code, role.description, role.module, role.level, parentId, true]
      );
      
      roleMap.set(role.code, result.rows[0].id);
      console.log(`✅ Created role: ${role.name} (${role.code})`);
    }

    // Create permissions
    const permissionMap = new Map<string, number>();
    
    for (const permission of permissions) {
      const result = await pool.query(
        `INSERT INTO permissions (name, code, description, module, feature, action, resource_type, record_access_level)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description
         RETURNING id`,
        [
          permission.name,
          permission.code,
          permission.description,
          permission.module,
          permission.feature || null,
          permission.action,
          permission.resource_type || null,
          permission.record_access_level || 'own'
        ]
      );
      
      permissionMap.set(permission.code, result.rows[0].id);
      console.log(`✅ Created permission: ${permission.name} (${permission.code})`);
    }

    // Assign permissions to roles based on hierarchy
    // System Admin gets all permissions
    const systemAdminRoleId = roleMap.get('system_admin');
    if (systemAdminRoleId) {
      for (const [permissionCode, permissionId] of permissionMap) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id, granted)
           VALUES ($1, $2, true)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [systemAdminRoleId, permissionId]
        );
      }
      console.log(`✅ Assigned all permissions to System Administrator`);
    }

    // Assign module-specific permissions to module admins
    const moduleAdminRoles = [
      { role: 'crm_admin', permissions: ['crm.'] },
      { role: 'sales_director', permissions: ['sales.'] },
      { role: 'inventory_director', permissions: ['inventory.'] },
      { role: 'finance_manager', permissions: ['accounting.'] },
      { role: 'hr_system_admin', permissions: ['hr.'] },
      { role: 'support_director', permissions: ['support.'] },
    ];

    for (const { role: roleCode, permissions: permissionPrefixes } of moduleAdminRoles) {
      const roleId = roleMap.get(roleCode);
      if (roleId) {
        for (const [permissionCode, permissionId] of permissionMap) {
          if (permissionPrefixes.some(prefix => permissionCode.startsWith(prefix))) {
            await pool.query(
              `INSERT INTO role_permissions (role_id, permission_id, granted)
               VALUES ($1, $2, true)
               ON CONFLICT (role_id, permission_id) DO NOTHING`,
              [roleId, permissionId]
            );
          }
        }
        console.log(`✅ Assigned module permissions to ${roleCode}`);
      }
    }

    // Assign basic permissions to lower-level roles
    // CRM Viewer gets view permissions
    const crmViewerId = roleMap.get('crm_viewer');
    if (crmViewerId) {
      const viewPermissions = Array.from(permissionMap.entries())
        .filter(([code]) => code.startsWith('crm.') && code.includes('.view'))
        .map(([, id]) => id);
      
      for (const permId of viewPermissions) {
        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id, granted)
           VALUES ($1, $2, true)
           ON CONFLICT (role_id, permission_id) DO NOTHING`,
          [crmViewerId, permId]
        );
      }
      console.log(`✅ Assigned view permissions to CRM Viewer`);
    }

    console.log('✅ RBAC seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedRBAC()
    .then(() => {
      console.log('✅ Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed failed:', error);
      process.exit(1);
    });
}

export default seedRBAC;

