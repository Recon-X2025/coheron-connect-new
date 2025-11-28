import pool from './connection.js';

async function verifyCRMRBAC() {
  try {
    console.log('🔍 Verifying CRM RBAC setup...\n');
    
    // Check roles
    console.log('📋 CRM Roles:');
    const roles = await pool.query(`
      SELECT code, name, module, level 
      FROM roles 
      WHERE module = 'crm' OR code IN ('system_admin', 'finance', 'auditor', 'data_steward', 'integrator')
      ORDER BY module, level
    `);
    
    console.log(`   Found ${roles.rows.length} roles:\n`);
    roles.rows.forEach((role: any) => {
      console.log(`   ✅ ${role.code.padEnd(20)} - ${role.name} (Level ${role.level})`);
    });
    
    // Check permissions
    console.log(`\n📋 CRM Permissions:`);
    const permissions = await pool.query(`
      SELECT COUNT(*) as count, feature
      FROM permissions 
      WHERE module = 'crm'
      GROUP BY feature
      ORDER BY feature
    `);
    
    console.log(`   Found permissions by feature:\n`);
    permissions.rows.forEach((perm: any) => {
      console.log(`   ✅ ${perm.feature || 'general'.padEnd(20)} - ${perm.count} permissions`);
    });
    
    const totalPerms = await pool.query(`SELECT COUNT(*) as count FROM permissions WHERE module = 'crm'`);
    console.log(`\n   Total CRM permissions: ${totalPerms.rows[0].count}`);
    
    // Check role-permission assignments
    console.log(`\n📋 Role-Permission Assignments:`);
    const assignments = await pool.query(`
      SELECT r.code as role, COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.granted = true
      WHERE r.code IN ('system_admin', 'sales_director', 'sales_manager', 'sales_rep', 'marketing_manager', 'marketing_specialist', 'support_agent', 'finance', 'partner', 'auditor', 'data_steward', 'integrator')
      GROUP BY r.code
      ORDER BY r.code
    `);
    
    console.log(`\n`);
    assignments.rows.forEach((assign: any) => {
      console.log(`   ✅ ${assign.role.padEnd(20)} - ${assign.permission_count} permissions`);
    });
    
    // Check CRM RBAC tables
    console.log(`\n📋 CRM RBAC Tables:`);
    const tables = ['territories', 'discount_approvals', 'quote_approvals', 'field_access_logs', 'export_approvals'];
    for (const table of tables) {
      const exists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);
      console.log(`   ${exists.rows[0].exists ? '✅' : '❌'} ${table}`);
    }
    
    console.log(`\n✅ Verification complete!`);
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    await pool.end();
    process.exit(1);
  }
}

verifyCRMRBAC();

