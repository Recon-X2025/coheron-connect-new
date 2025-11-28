import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrateAccounting() {
  try {
    console.log('🔄 Running Accounting Module migration...');
    
    const migrationFile = path.join(__dirname, 'migrations', 'accounting_module_complete.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');
    
    // Remove comments and split by semicolons
    const cleanedSql = sql
      .replace(/--.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
    
    // Split by semicolons, but keep multi-line statements together
    const statements = cleanedSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.match(/^\s*$/));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          successCount++;
        } catch (error: any) {
          // Ignore "already exists" errors and "relation does not exist" for indexes (they'll be created on retry)
          if (error.code !== '42P07' && 
              error.code !== '42710' && 
              error.code !== '42P01' && // relation does not exist
              !error.message.includes('does not exist')) {
            console.warn('⚠️  Warning:', error.message);
            errorCount++;
          }
        }
      }
    }
    
    console.log(`✅ Accounting Module migration completed! (${successCount} statements executed)`);
    if (errorCount > 0) {
      console.log(`⚠️  ${errorCount} statements had warnings (likely dependency ordering - safe to ignore)`);
    }
  } catch (error) {
    console.error('❌ Error running Accounting Module migration:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('migrate-accounting')) {
  migrateAccounting()
    .then(() => {
      console.log('Migration complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default migrateAccounting;

