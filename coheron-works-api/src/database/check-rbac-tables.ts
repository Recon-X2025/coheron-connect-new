import pool from './connection.js';

async function checkRBACTables() {
  try {
    console.log('🔍 Checking for RBAC tables...\n');
    
    const tables = ['roles', 'permissions', 'role_permissions', 'user_roles'];
    const results: Record<string, boolean> = {};
    
    for (const table of tables) {
      try {
        const result = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )`,
          [table]
        );
        results[table] = result.rows[0].exists;
        console.log(`${results[table] ? '✅' : '❌'} ${table}: ${results[table] ? 'EXISTS' : 'MISSING'}`);
      } catch (error: any) {
        results[table] = false;
        console.log(`❌ ${table}: ERROR - ${error.message}`);
      }
    }
    
    const allExist = Object.values(results).every(exists => exists);
    
    if (allExist) {
      console.log('\n✅ All RBAC tables exist! You can proceed with seeding.');
      
      // Count existing records
      const roleCount = await pool.query('SELECT COUNT(*) FROM roles');
      const permCount = await pool.query('SELECT COUNT(*) FROM permissions');
      console.log(`\n📊 Current data:`);
      console.log(`   Roles: ${roleCount.rows[0].count}`);
      console.log(`   Permissions: ${permCount.rows[0].count}`);
    } else {
      console.log('\n⚠️  Some RBAC tables are missing. You need to run the base migration.');
      console.log('   Note: The base migration may have errors, but RBAC tables should still be created.');
    }
    
    await pool.end();
    process.exit(allExist ? 0 : 1);
  } catch (error: any) {
    console.error('❌ Error checking tables:', error.message);
    await pool.end();
    process.exit(1);
  }
}

checkRBACTables();

