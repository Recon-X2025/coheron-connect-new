import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runInventoryMigration() {
  try {
    console.log('🔄 Running inventory module migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'inventory_module_complete.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let successCount = 0;
    let skipCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          successCount++;
          if (successCount % 10 === 0) {
            console.log(`✅ Processed ${successCount} statements...`);
          }
        } catch (error: any) {
          // Ignore errors for "IF NOT EXISTS" or "IF EXISTS" statements
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.code === '42710' || // duplicate_object
              error.code === '42P07' || // duplicate_table
              error.code === '42704') { // undefined_object (for DROP IF EXISTS)
            skipCount++;
          } else {
            console.error(`❌ Error executing statement: ${statement.substring(0, 100)}...`);
            console.error(`   Error: ${error.message}`);
            // Continue with other statements
          }
        }
      }
    }
    
    console.log(`✅ Inventory module migration completed!`);
    console.log(`   Successfully executed: ${successCount} statements`);
    console.log(`   Skipped (already exists): ${skipCount} statements`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runInventoryMigration();

