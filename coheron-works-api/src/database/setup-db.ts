import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function setupDatabase() {
  const dbName = process.env.DB_NAME || 'coheron_erp';
  const dbUser = process.env.DB_USER || 'coheron_user';
  const dbPassword = process.env.DB_PASSWORD || 'coheron_password';
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = parseInt(process.env.DB_PORT || '5432');

  // Try to connect - first as postgres, then as current user
  let postgresPool: pg.Pool | null = null;
  let connectedUser = 'postgres';

  // Try postgres user first
  try {
    postgresPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: 'postgres',
      user: 'postgres',
      password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || '',
    });
    console.log('🔌 Trying to connect as postgres user...');
    await postgresPool.query('SELECT 1');
    console.log('✅ Connected as postgres user');
  } catch (err) {
    // Try current system user (common on macOS Homebrew PostgreSQL)
    const currentUser = process.env.USER || 'postgres';
    console.log(`🔌 Trying to connect as ${currentUser} user...`);
    postgresPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: 'postgres',
      user: currentUser,
      password: '',
    });
    try {
      await postgresPool.query('SELECT 1');
      connectedUser = currentUser;
      console.log(`✅ Connected as ${currentUser} user`);
    } catch (err2) {
      console.error('❌ Could not connect to PostgreSQL');
      console.error('   Tried: postgres user');
      console.error(`   Tried: ${currentUser} user`);
      throw new Error('Cannot connect to PostgreSQL. Please ensure PostgreSQL is running and accessible.');
    }
  }

  try {

    // Create database if it doesn't exist
    console.log(`📦 Creating database ${dbName}...`);
    try {
      await postgresPool.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database ${dbName} created`);
    } catch (err: any) {
      if (err.code === '42P04') {
        console.log(`ℹ️  Database ${dbName} already exists`);
      } else {
        throw err;
      }
    }

    // Create user if it doesn't exist
    console.log(`👤 Creating user ${dbUser}...`);
    try {
      await postgresPool.query(
        `CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`
      );
      console.log(`✅ User ${dbUser} created`);
    } catch (err: any) {
      if (err.code === '42710') {
        console.log(`ℹ️  User ${dbUser} already exists`);
      } else {
        throw err;
      }
    }

    // Grant privileges
    console.log('🔐 Granting privileges...');
    await postgresPool.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO ${dbUser}`);
    
    // Connect to the new database to grant schema privileges
    const dbPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: connectedUser,
      password: process.env.PG_PASSWORD || process.env.POSTGRES_PASSWORD || '',
    });

    await dbPool.query(`GRANT ALL ON SCHEMA public TO ${dbUser}`);
    await dbPool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${dbUser}`);
    await dbPool.query(`GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${dbUser}`);
    await dbPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${dbUser}`);
    await dbPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${dbUser}`);
    
    await dbPool.end();
    await postgresPool.end();

    console.log('✅ Database setup complete!');
    console.log('');
    console.log('📋 Database Details:');
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${dbUser}`);
    console.log(`   Password: ${dbPassword}`);
    console.log('');
    console.log('🔧 Running migration...');
    
    // Now run the migration
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    const userPool = new Pool({
      host: dbHost,
      port: dbPort,
      database: dbName,
      user: dbUser,
      password: dbPassword,
    });

    await userPool.query(schema);
    await userPool.end();

    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Setup failed:', error.message);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is installed and running');
    console.error('   2. Try setting PG_PASSWORD environment variable:');
    console.error('      export PG_PASSWORD=your_postgres_password');
    console.error('   3. Or modify .env to use postgres user temporarily');
    console.error('   4. Make sure PostgreSQL allows local connections');
    process.exit(1);
  }
}

setupDatabase();

