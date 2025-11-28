/**
 * Example script to assign CRM roles to users
 * 
 * Usage:
 *   npx tsx src/database/assign-roles-example.ts
 * 
 * Or modify this script to assign roles to specific users
 */

import pool from './connection.js';

async function assignRolesExample() {
  try {
    console.log('👤 Assigning CRM roles to users...\n');
    
    // Get all users
    const users = await pool.query('SELECT id, email, name FROM users ORDER BY id');
    
    if (users.rows.length === 0) {
      console.log('⚠️  No users found. Please create users first.');
      return;
    }
    
    console.log('📋 Available users:');
    users.rows.forEach((user: any) => {
      console.log(`   ${user.id}: ${user.email} (${user.name})`);
    });
    
    // Get all CRM roles
    const roles = await pool.query(`
      SELECT id, code, name 
      FROM roles 
      WHERE module = 'crm' OR code IN ('system_admin', 'finance', 'auditor', 'data_steward', 'integrator')
      ORDER BY code
    `);
    
    console.log('\n📋 Available roles:');
    roles.rows.forEach((role: any) => {
      console.log(`   ${role.code}: ${role.name}`);
    });
    
    // Example: Assign roles to first user (you can modify this)
    if (users.rows.length > 0) {
      const firstUser = users.rows[0];
      const salesRepRole = roles.rows.find((r: any) => r.code === 'sales_rep');
      
      if (salesRepRole) {
        try {
          await pool.query(
            `INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
             VALUES ($1, $2, $1, true)
             ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true`,
            [firstUser.id, salesRepRole.id]
          );
          console.log(`\n✅ Assigned role '${salesRepRole.code}' to user ${firstUser.email}`);
        } catch (error: any) {
          if (error.code === '23503') {
            console.log(`\n⚠️  Could not assign role (user or role might not exist)`);
          } else {
            throw error;
          }
        }
      }
    }
    
    // Show current user-role assignments
    console.log('\n📋 Current user-role assignments:');
    const assignments = await pool.query(`
      SELECT u.email, u.name, r.code as role_code, r.name as role_name, ur.is_active
      FROM user_roles ur
      INNER JOIN users u ON ur.user_id = u.id
      INNER JOIN roles r ON ur.role_id = r.id
      WHERE ur.is_active = true
      ORDER BY u.email, r.code
    `);
    
    if (assignments.rows.length === 0) {
      console.log('   No role assignments found.');
    } else {
      assignments.rows.forEach((assign: any) => {
        console.log(`   ✅ ${assign.email.padEnd(30)} - ${assign.role_code}`);
      });
    }
    
    console.log('\n💡 To assign roles manually, use:');
    console.log(`
INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
SELECT u.id, r.id, 1, true
FROM users u, roles r
WHERE u.email = 'user@example.com' AND r.code = 'sales_rep'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;
    `);
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

assignRolesExample();

