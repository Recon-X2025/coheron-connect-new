import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCRMRBACMigration() {
  try {
    console.log('🔄 Running CRM RBAC enhancements migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'crm_rbac_enhancements.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    // We need to be careful with functions and complex statements
    const statements = migrationSQL
      .split(/;(?![^$]*\$\$)/) // Split on semicolons but not inside $$ blocks
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          successCount++;
          if (successCount % 5 === 0) {
            console.log(`✅ Processed ${successCount} statements...`);
          }
        } catch (error: any) {
          // Ignore errors for "IF NOT EXISTS" or "IF EXISTS" statements
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.code === '42710' || // duplicate_object
              error.code === '42P07' || // duplicate_table
              error.code === '42704' || // undefined_object (for DROP IF EXISTS)
              error.code === '42701') { // duplicate_column
            skipCount++;
          } else {
            console.error(`❌ Error executing statement:`);
            console.error(`   ${statement.substring(0, 100)}...`);
            console.error(`   Error: ${error.message}`);
            errorCount++;
            // Continue with other statements
          }
        }
      }
    }
    
    console.log(`\n✅ CRM RBAC migration completed!`);
    console.log(`   Successfully executed: ${successCount} statements`);
    console.log(`   Skipped (already exists): ${skipCount} statements`);
    if (errorCount > 0) {
      console.log(`   Errors: ${errorCount} statements`);
    }
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

runCRMRBACMigration();

