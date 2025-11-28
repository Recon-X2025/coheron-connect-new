import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './connection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  try {
    console.log('🔄 Running database migrations...');
    
    // First, try to create database and user if they don't exist
    try {
      const adminPool = new (await import('pg')).Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: 'postgres', // Connect to default postgres database
        user: process.env.DB_USER || process.env.PGUSER || process.env.USER || 'postgres',
        password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
      });

      // Create database if it doesn't exist
      await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME || 'coheron_erp'}'`)
        .then(async (result) => {
          if (result.rows.length === 0) {
            console.log('📦 Creating database...');
            await adminPool.query(`CREATE DATABASE ${process.env.DB_NAME || 'coheron_erp'}`);
          }
        })
        .catch(() => {
          // Database might already exist or we don't have permissions
          console.log('⚠️  Could not create database (might already exist or need admin access)');
        });

      // Create user if it doesn't exist
      try {
        await adminPool.query(`CREATE USER ${process.env.DB_USER || 'coheron_user'} WITH PASSWORD '${process.env.DB_PASSWORD || 'coheron_password'}'`);
        console.log('👤 Created database user');
      } catch (err: any) {
        if (err.code !== '42710') { // 42710 = user already exists
          console.log('⚠️  Could not create user (might already exist)');
        }
      }

      // Grant privileges
      try {
        await adminPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB_NAME || 'coheron_erp'} TO ${process.env.DB_USER || 'coheron_user'}`);
        await adminPool.end();
      } catch (err) {
        console.log('⚠️  Could not grant privileges (might need admin access)');
      }
    } catch (adminError) {
      console.log('⚠️  Could not create database/user automatically. Please create manually:');
      console.log(`   CREATE DATABASE ${process.env.DB_NAME || 'coheron_erp'};`);
      console.log(`   CREATE USER ${process.env.DB_USER || 'coheron_user'} WITH PASSWORD '${process.env.DB_PASSWORD || 'coheron_password'}';`);
      console.log(`   GRANT ALL PRIVILEGES ON DATABASE ${process.env.DB_NAME || 'coheron_erp'} TO ${process.env.DB_USER || 'coheron_user'};`);
    }
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute schema
    await pool.query(schema);
    
    console.log('✅ Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is installed and running');
    console.error('   2. Check your .env file has correct database credentials');
    console.error('   3. Create database manually: psql -U postgres -c "CREATE DATABASE coheron_erp;"');
    process.exit(1);
  }
}

migrate();

