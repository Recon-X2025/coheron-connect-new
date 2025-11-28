/**
 * CRM Module RBAC Seed Script
 * 
 * This script seeds CRM-specific roles and permissions based on the complete specification.
 * Includes: System Admin, Sales Director, Sales Manager, Sales Rep, Marketing Manager,
 * Marketing Specialist, Customer Success, Finance, Partner, Read-Only Auditor, Data Steward, Integrator
 */

import pool from './connection.js';

interface Role {
  name: string;
  code: string;
  description: string;
  module: string;
  level: number;
  parent_code?: string;
  is_system_role: boolean;
}

interface Permission {
  name: string;
  code: string;
  description: string;
  module: string;
  feature?: string;
  action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' | 'import' | 'configure' | 'manage';
  resource_type?: string;
  record_access_level: 'own' | 'team' | 'department' | 'all';
  field_restrictions?: any;
}

// CRM-specific roles matching the specification
const crmRoles: Role[] = [
  // System Admin
  {
    name: 'System Admin',
    code: 'system_admin',
    description: 'Full system access, manage configuration, RBAC, integrations',
    module: 'system',
    level: 10,
    is_system_role: true
  },
  
  // Sales Director / Head of Sales
  {
    name: 'Sales Director',
    code: 'sales_director',
    description: 'Org-level visibility, forecast approvals, quota management',
    module: 'crm',
    level: 5,
    parent_code: 'sales_manager',
    is_system_role: true
  },
  
  // Sales Manager
  {
    name: 'Sales Manager',
    code: 'sales_manager',
    description: 'Team-level visibility, reassign leads, approve discounts up to threshold',
    module: 'crm',
    level: 4,
    parent_code: 'sales_rep',
    is_system_role: true
  },
  
  // Sales Rep
  {
    name: 'Sales Rep',
    code: 'sales_rep',
    description: 'Owns leads/opps assigned to them, create quotes, update stages',
    module: 'crm',
    level: 3,
    is_system_role: true
  },
  
  // Marketing Manager
  {
    name: 'Marketing Manager',
    code: 'marketing_manager',
    description: 'Manage campaigns, segments, view lead performance',
    module: 'crm',
    level: 4,
    is_system_role: true
  },
  
  // Marketing Specialist
  {
    name: 'Marketing Specialist',
    code: 'marketing_specialist',
    description: 'Create/send campaigns, view & edit marketing lists',
    module: 'crm',
    level: 3,
    parent_code: 'marketing_manager',
    is_system_role: true
  },
  
  // Customer Success / Support Agent
  {
    name: 'Support Agent',
    code: 'support_agent',
    description: 'Access accounts/contacts, create tickets, limited opportunity view',
    module: 'crm',
    level: 3,
    is_system_role: true
  },
  
  // Finance
  {
    name: 'Finance',
    code: 'finance',
    description: 'View invoices/quotes, finalize deals, export financial reports',
    module: 'accounting',
    level: 4,
    is_system_role: true
  },
  
  // Partner / Channel User
  {
    name: 'Partner',
    code: 'partner',
    description: 'Limited access to partner-registered leads/opps via portal',
    module: 'crm',
    level: 2,
    is_system_role: true
  },
  
  // Read-Only Auditor
  {
    name: 'Read-Only Auditor',
    code: 'auditor',
    description: 'View-only across modules for compliance',
    module: 'system',
    level: 2,
    is_system_role: true
  },
  
  // Data Steward
  {
    name: 'Data Steward',
    code: 'data_steward',
    description: 'Edit master data (accounts, products), run DQ reports',
    module: 'system',
    level: 4,
    is_system_role: true
  },
  
  // System Integrator / API Client
  {
    name: 'System Integrator',
    code: 'integrator',
    description: 'Service account with scoped API permissions',
    module: 'system',
    level: 3,
    is_system_role: true
  }
];

// CRM-specific permissions
const crmPermissions: Permission[] = [
  // Lead Management Permissions
  { name: 'View Leads', code: 'crm.leads.view', description: 'View leads', module: 'crm', feature: 'leads', action: 'view', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Create Leads', code: 'crm.leads.create', description: 'Create new leads', module: 'crm', feature: 'leads', action: 'create', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Update Leads', code: 'crm.leads.update', description: 'Update leads', module: 'crm', feature: 'leads', action: 'edit', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Delete Leads', code: 'crm.leads.delete', description: 'Delete leads', module: 'crm', feature: 'leads', action: 'delete', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Assign Leads', code: 'crm.leads.assign', description: 'Assign leads to users', module: 'crm', feature: 'leads', action: 'manage', resource_type: 'lead', record_access_level: 'team' },
  { name: 'Merge Leads', code: 'crm.leads.merge', description: 'Merge duplicate leads', module: 'crm', feature: 'leads', action: 'edit', resource_type: 'lead', record_access_level: 'team' },
  { name: 'Convert Leads', code: 'crm.leads.convert', description: 'Convert leads to contacts/opportunities', module: 'crm', feature: 'leads', action: 'edit', resource_type: 'lead', record_access_level: 'own' },
  { name: 'Export Leads', code: 'crm.leads.export', description: 'Export leads data', module: 'crm', feature: 'leads', action: 'export', resource_type: 'lead', record_access_level: 'all' },
  
  // Contact & Account Permissions
  { name: 'View Contacts', code: 'crm.contacts.view', description: 'View contacts', module: 'crm', feature: 'contacts', action: 'view', resource_type: 'contact', record_access_level: 'own' },
  { name: 'Create Contacts', code: 'crm.contacts.create', description: 'Create contacts', module: 'crm', feature: 'contacts', action: 'create', resource_type: 'contact', record_access_level: 'own' },
  { name: 'Update Contacts', code: 'crm.contacts.update', description: 'Update contacts', module: 'crm', feature: 'contacts', action: 'edit', resource_type: 'contact', record_access_level: 'own' },
  { name: 'Delete Contacts', code: 'crm.contacts.delete', description: 'Delete contacts', module: 'crm', feature: 'contacts', action: 'delete', resource_type: 'contact', record_access_level: 'own' },
  { name: 'View Accounts', code: 'crm.accounts.view', description: 'View accounts', module: 'crm', feature: 'accounts', action: 'view', resource_type: 'account', record_access_level: 'own' },
  { name: 'Create Accounts', code: 'crm.accounts.create', description: 'Create accounts', module: 'crm', feature: 'accounts', action: 'create', resource_type: 'account', record_access_level: 'own' },
  { name: 'Update Accounts', code: 'crm.accounts.update', description: 'Update accounts', module: 'crm', feature: 'accounts', action: 'edit', resource_type: 'account', record_access_level: 'own' },
  { name: 'Delete Accounts', code: 'crm.accounts.delete', description: 'Delete accounts', module: 'crm', feature: 'accounts', action: 'delete', resource_type: 'account', record_access_level: 'team' },
  
  // Opportunity Permissions
  { name: 'View Opportunities', code: 'crm.opportunities.view', description: 'View opportunities', module: 'crm', feature: 'opportunities', action: 'view', resource_type: 'opportunity', record_access_level: 'own' },
  { name: 'Create Opportunities', code: 'crm.opportunities.create', description: 'Create opportunities', module: 'crm', feature: 'opportunities', action: 'create', resource_type: 'opportunity', record_access_level: 'own' },
  { name: 'Update Opportunities', code: 'crm.opportunities.update', description: 'Update opportunities', module: 'crm', feature: 'opportunities', action: 'edit', resource_type: 'opportunity', record_access_level: 'own' },
  { name: 'Delete Opportunities', code: 'crm.opportunities.delete', description: 'Delete opportunities', module: 'crm', feature: 'opportunities', action: 'delete', resource_type: 'opportunity', record_access_level: 'own' },
  { name: 'Approve Discounts', code: 'crm.opportunities.approve_discount', description: 'Approve discount requests', module: 'crm', feature: 'opportunities', action: 'approve', resource_type: 'opportunity', record_access_level: 'team' },
  
  // Quote Permissions
  { name: 'View Quotes', code: 'crm.quotes.view', description: 'View quotes', module: 'crm', feature: 'quotes', action: 'view', resource_type: 'quote', record_access_level: 'own' },
  { name: 'Create Quotes', code: 'crm.quotes.create', description: 'Create quotes', module: 'crm', feature: 'quotes', action: 'create', resource_type: 'quote', record_access_level: 'own' },
  { name: 'Update Quotes', code: 'crm.quotes.update', description: 'Update quotes', module: 'crm', feature: 'quotes', action: 'edit', resource_type: 'quote', record_access_level: 'own' },
  { name: 'Approve Quotes', code: 'crm.quotes.approve', description: 'Approve quotes', module: 'crm', feature: 'quotes', action: 'approve', resource_type: 'quote', record_access_level: 'team' },
  { name: 'Generate Quote PDF', code: 'crm.quotes.generate_pdf', description: 'Generate quote PDF', module: 'crm', feature: 'quotes', action: 'create', resource_type: 'quote', record_access_level: 'own' },
  
  // Campaign Permissions
  { name: 'View Campaigns', code: 'crm.campaigns.view', description: 'View campaigns', module: 'crm', feature: 'campaigns', action: 'view', resource_type: 'campaign', record_access_level: 'all' },
  { name: 'Create Campaigns', code: 'crm.campaigns.create', description: 'Create campaigns', module: 'crm', feature: 'campaigns', action: 'create', resource_type: 'campaign', record_access_level: 'all' },
  { name: 'Update Campaigns', code: 'crm.campaigns.update', description: 'Update campaigns', module: 'crm', feature: 'campaigns', action: 'edit', resource_type: 'campaign', record_access_level: 'all' },
  { name: 'Delete Campaigns', code: 'crm.campaigns.delete', description: 'Delete campaigns', module: 'crm', feature: 'campaigns', action: 'delete', resource_type: 'campaign', record_access_level: 'all' },
  { name: 'Send Campaigns', code: 'crm.campaigns.send', description: 'Send campaigns', module: 'crm', feature: 'campaigns', action: 'manage', resource_type: 'campaign', record_access_level: 'all' },
  
  // Ticket/Support Permissions
  { name: 'View Tickets', code: 'crm.tickets.view', description: 'View support tickets', module: 'crm', feature: 'tickets', action: 'view', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'Create Tickets', code: 'crm.tickets.create', description: 'Create support tickets', module: 'crm', feature: 'tickets', action: 'create', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'Update Tickets', code: 'crm.tickets.update', description: 'Update support tickets', module: 'crm', feature: 'tickets', action: 'edit', resource_type: 'ticket', record_access_level: 'own' },
  { name: 'Delete Tickets', code: 'crm.tickets.delete', description: 'Delete support tickets', module: 'crm', feature: 'tickets', action: 'delete', resource_type: 'ticket', record_access_level: 'team' },
  
  // Product Permissions
  { name: 'View Products', code: 'crm.products.view', description: 'View products', module: 'crm', feature: 'products', action: 'view', resource_type: 'product', record_access_level: 'all' },
  { name: 'Update Products', code: 'crm.products.update', description: 'Update products', module: 'crm', feature: 'products', action: 'edit', resource_type: 'product', record_access_level: 'all' },
  
  // Report & Export Permissions
  { name: 'View Reports', code: 'crm.reports.view', description: 'View reports', module: 'crm', feature: 'reports', action: 'view', resource_type: 'report', record_access_level: 'own' },
  { name: 'View Team Reports', code: 'crm.reports.team', description: 'View team reports', module: 'crm', feature: 'reports', action: 'view', resource_type: 'report', record_access_level: 'team' },
  { name: 'View All Reports', code: 'crm.reports.all', description: 'View all reports', module: 'crm', feature: 'reports', action: 'view', resource_type: 'report', record_access_level: 'all' },
  { name: 'Export Data', code: 'crm.export', description: 'Export CRM data', module: 'crm', feature: 'export', action: 'export', resource_type: 'all', record_access_level: 'all' },
  { name: 'Export Team Data', code: 'crm.export.team', description: 'Export team data', module: 'crm', feature: 'export', action: 'export', resource_type: 'all', record_access_level: 'team' },
  
  // Field-level Permissions (Sensitive Fields)
  { name: 'Edit Discount Percentage', code: 'crm.fields.discount_percentage.edit', description: 'Edit discount percentage field', module: 'crm', feature: 'fields', action: 'edit', resource_type: 'quote', record_access_level: 'own', field_restrictions: { max_value: 20, requires_approval: true } },
  { name: 'View Margin', code: 'crm.fields.margin.view', description: 'View margin field', module: 'crm', feature: 'fields', action: 'view', resource_type: 'quote', record_access_level: 'team' },
  { name: 'Edit Margin', code: 'crm.fields.margin.edit', description: 'Edit margin field', module: 'crm', feature: 'fields', action: 'edit', resource_type: 'quote', record_access_level: 'team' },
  { name: 'View Personal Phone', code: 'crm.fields.personal_phone.view', description: 'View personal phone field', module: 'crm', feature: 'fields', action: 'view', resource_type: 'contact', record_access_level: 'own' },
  { name: 'View Raw Source Data', code: 'crm.fields.raw_source_data.view', description: 'View raw source data field', module: 'crm', feature: 'fields', action: 'view', resource_type: 'lead', record_access_level: 'team' },
  
  // Territory Permissions
  { name: 'Manage Territories', code: 'crm.territories.manage', description: 'Manage territories', module: 'crm', feature: 'territories', action: 'manage', resource_type: 'territory', record_access_level: 'all' },
  { name: 'View Territories', code: 'crm.territories.view', description: 'View territories', module: 'crm', feature: 'territories', action: 'view', resource_type: 'territory', record_access_level: 'all' },
  
  // Partner Permissions
  { name: 'View Partner Deals', code: 'crm.partner.deals.view', description: 'View partner-registered deals', module: 'crm', feature: 'partner', action: 'view', resource_type: 'opportunity', record_access_level: 'own' },
  { name: 'Register Partner Deal', code: 'crm.partner.deals.register', description: 'Register partner deals', module: 'crm', feature: 'partner', action: 'create', resource_type: 'opportunity', record_access_level: 'own' },
  
  // Admin Permissions
  { name: 'Manage RBAC', code: 'system.rbac.manage', description: 'Manage roles and permissions', module: 'system', feature: 'rbac', action: 'manage', resource_type: 'role', record_access_level: 'all' },
  { name: 'View Audit Logs', code: 'system.audit.view', description: 'View audit logs', module: 'system', feature: 'audit', action: 'view', resource_type: 'audit_log', record_access_level: 'all' },
];

// Role-Permission mappings based on specification
const rolePermissionMap: Record<string, string[]> = {
  system_admin: [
    // All permissions
    ...crmPermissions.map(p => p.code),
    'system.rbac.manage',
    'system.audit.view'
  ],
  
  sales_director: [
    // Read access to most things
    'crm.leads.view', 'crm.contacts.view', 'crm.accounts.view', 'crm.opportunities.view',
    'crm.quotes.view', 'crm.campaigns.view', 'crm.tickets.view', 'crm.products.view',
    'crm.reports.all', 'crm.export',
    // Approve forecasts and quotas
    'crm.opportunities.approve_discount',
    'crm.quotes.approve',
    'crm.fields.margin.view', 'crm.fields.margin.edit'
  ],
  
  sales_manager: [
    // Team-level access
    'crm.leads.view', 'crm.leads.create', 'crm.leads.update', 'crm.leads.assign', 'crm.leads.merge',
    'crm.contacts.view', 'crm.accounts.view', 'crm.accounts.update',
    'crm.opportunities.view', 'crm.opportunities.create', 'crm.opportunities.update',
    'crm.quotes.view', 'crm.quotes.create', 'crm.quotes.approve',
    'crm.campaigns.view', 'crm.tickets.view', 'crm.products.view',
    'crm.reports.team', 'crm.export.team',
    'crm.opportunities.approve_discount',
    'crm.fields.discount_percentage.edit', 'crm.fields.margin.view',
    'crm.territories.view'
  ],
  
  sales_rep: [
    // Own records only
    'crm.leads.view', 'crm.leads.create', 'crm.leads.update', 'crm.leads.convert',
    'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.update',
    'crm.accounts.view', 'crm.accounts.create', 'crm.accounts.update',
    'crm.opportunities.view', 'crm.opportunities.create', 'crm.opportunities.update',
    'crm.quotes.view', 'crm.quotes.create', 'crm.quotes.update', 'crm.quotes.generate_pdf',
    'crm.campaigns.view', 'crm.tickets.create', 'crm.products.view',
    'crm.reports.view',
    'crm.fields.discount_percentage.edit', // Limited by approval workflow
    'crm.fields.personal_phone.view'
  ],
  
  marketing_manager: [
    'crm.leads.view', 'crm.contacts.view', 'crm.accounts.view', 'crm.opportunities.view',
    'crm.campaigns.view', 'crm.campaigns.create', 'crm.campaigns.update', 'crm.campaigns.delete',
    'crm.products.view',
    'crm.reports.view', 'crm.fields.raw_source_data.view'
  ],
  
  marketing_specialist: [
    'crm.leads.view', 'crm.contacts.view', 'crm.accounts.view',
    'crm.campaigns.view', 'crm.campaigns.create', 'crm.campaigns.send',
    'crm.reports.view'
  ],
  
  support_agent: [
    'crm.contacts.view', 'crm.accounts.view', 'crm.opportunities.view',
    'crm.tickets.view', 'crm.tickets.create', 'crm.tickets.update',
    'crm.reports.view', 'crm.fields.personal_phone.view'
  ],
  
  finance: [
    'crm.leads.view', 'crm.contacts.view', 'crm.accounts.view', 'crm.opportunities.view',
    'crm.quotes.view', 'crm.quotes.approve',
    'crm.products.view', 'crm.products.update',
    'crm.reports.all', 'crm.export',
    'crm.fields.margin.view', 'crm.fields.margin.edit'
  ],
  
  partner: [
    'crm.partner.deals.view', 'crm.partner.deals.register',
    'crm.leads.view', 'crm.opportunities.view', // Only partner-registered
    'crm.contacts.view' // Limited fields
  ],
  
  auditor: [
    // Read-only access to everything
    'crm.leads.view', 'crm.contacts.view', 'crm.accounts.view', 'crm.opportunities.view',
    'crm.quotes.view', 'crm.campaigns.view', 'crm.tickets.view', 'crm.products.view',
    'crm.reports.all', 'crm.export',
    'system.audit.view'
  ],
  
  data_steward: [
    'crm.leads.view', 'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.update',
    'crm.accounts.view', 'crm.accounts.create', 'crm.accounts.update', 'crm.accounts.delete',
    'crm.products.view', 'crm.products.update',
    'crm.reports.view', 'crm.fields.raw_source_data.view'
  ],
  
  integrator: [
    // API-scoped permissions (would be further restricted by API key scope)
    'crm.leads.view', 'crm.leads.create', 'crm.leads.update',
    'crm.contacts.view', 'crm.contacts.create', 'crm.contacts.update',
    'crm.opportunities.view', 'crm.opportunities.create', 'crm.opportunities.update'
  ]
};

async function seedCRMRBAC() {
  try {
    console.log('🌱 Seeding CRM RBAC roles and permissions...');

    // Create roles
    const roleMap = new Map<string, number>();
    
    for (const role of crmRoles) {
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
        [role.name, role.code, role.description, role.module, role.level, parentId, role.is_system_role]
      );
      
      roleMap.set(role.code, result.rows[0].id);
      console.log(`✅ Created/Updated role: ${role.name} (${role.code})`);
    }

    // Create permissions
    const permissionMap = new Map<string, number>();
    
    for (const permission of crmPermissions) {
      const result = await pool.query(
        `INSERT INTO permissions (name, code, description, module, feature, action, resource_type, record_access_level, field_restrictions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (code) DO UPDATE SET
           name = EXCLUDED.name,
           description = EXCLUDED.description,
           field_restrictions = EXCLUDED.field_restrictions
         RETURNING id`,
        [
          permission.name,
          permission.code,
          permission.description,
          permission.module,
          permission.feature || null,
          permission.action,
          permission.resource_type || null,
          permission.record_access_level || 'own',
          permission.field_restrictions ? JSON.stringify(permission.field_restrictions) : null
        ]
      );
      
      permissionMap.set(permission.code, result.rows[0].id);
      console.log(`✅ Created/Updated permission: ${permission.name} (${permission.code})`);
    }

    // Assign permissions to roles
    for (const [roleCode, permissionCodes] of Object.entries(rolePermissionMap)) {
      const roleId = roleMap.get(roleCode);
      if (!roleId) {
        console.warn(`⚠️  Role not found: ${roleCode}`);
        continue;
      }

      for (const permissionCode of permissionCodes) {
        const permissionId = permissionMap.get(permissionCode);
        if (!permissionId) {
          console.warn(`⚠️  Permission not found: ${permissionCode}`);
          continue;
        }

        await pool.query(
          `INSERT INTO role_permissions (role_id, permission_id, granted)
           VALUES ($1, $2, true)
           ON CONFLICT (role_id, permission_id) DO UPDATE SET granted = true`,
          [roleId, permissionId]
        );
      }
      
      console.log(`✅ Assigned ${permissionCodes.length} permissions to role: ${roleCode}`);
    }

    console.log('✅ CRM RBAC seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding CRM RBAC:', error);
    throw error;
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('seed-crm-rbac.ts') ||
                     process.argv[1]?.endsWith('seed-crm-rbac.js');

if (isMainModule || !import.meta.url.includes('node_modules')) {
  seedCRMRBAC()
    .then(() => {
      console.log('✅ Seed script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seed script failed:', error);
      process.exit(1);
    });
}

export default seedCRMRBAC;

