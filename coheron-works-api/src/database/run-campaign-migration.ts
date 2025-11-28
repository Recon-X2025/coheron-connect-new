import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runCampaignMigration() {
  try {
    console.log('🔄 Running campaign enhancements migration...');
    
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', 'add_campaign_enhancements.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement);
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        } catch (error: any) {
          // Ignore errors for "IF NOT EXISTS" or "IF EXISTS" statements
          if (error.message.includes('already exists') || 
              error.message.includes('does not exist') ||
              error.code === '42710' || // duplicate_object
              error.code === '42P07') { // duplicate_table
            console.log(`⚠️  Skipped (already exists): ${statement.substring(0, 50)}...`);
          } else {
            throw error;
          }
        }
      }
    }
    
    console.log('✅ Campaign enhancements migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runCampaignMigration();

