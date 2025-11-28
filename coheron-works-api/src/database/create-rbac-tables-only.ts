import pool from './connection.js';

async function createRBACTablesOnly() {
  try {
    console.log('🔄 Creating RBAC tables only...\n');
    
    // Step 1: Create ENUM types first
    console.log('📝 Creating ENUM types...');
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE module_type AS ENUM (
          'crm', 'sales', 'inventory', 'accounting', 'hr', 
          'manufacturing', 'marketing', 'pos', 'website', 
          'support', 'projects', 'dashboard', 'system'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE permission_action AS ENUM (
          'view', 'create', 'edit', 'delete', 'approve', 
          'export', 'import', 'configure', 'manage'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    await pool.query(`
      DO $$ BEGIN
        CREATE TYPE record_access_level AS ENUM (
          'own', 'team', 'department', 'all'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ ENUM types created\n');
    
    // Step 2: Create core RBAC tables
    console.log('📝 Creating core RBAC tables...');
    
    // Roles table (no dependencies)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        module module_type NOT NULL,
        level INTEGER DEFAULT 1,
        parent_role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
        is_system_role BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table: roles');
    
    // Permissions table (no dependencies)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        module module_type NOT NULL,
        feature VARCHAR(100),
        action permission_action NOT NULL,
        resource_type VARCHAR(100),
        field_restrictions JSONB,
        record_access_level record_access_level DEFAULT 'own',
        conditions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table: permissions');
    
    // Role-Permission mapping (depends on roles and permissions)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
        granted BOOLEAN DEFAULT true,
        conditions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, permission_id)
      );
    `);
    console.log('✅ Created table: role_permissions');
    
    // User-Role mapping (depends on roles and users)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE NOT NULL,
        assigned_by INTEGER REFERENCES users(id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        notes TEXT,
        UNIQUE(user_id, role_id)
      );
    `);
    console.log('✅ Created table: user_roles');
    
    // Teams table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE,
        description TEXT,
        module module_type,
        department VARCHAR(100),
        manager_id INTEGER REFERENCES users(id),
        parent_team_id INTEGER REFERENCES teams(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table: teams');
    
    // User-Team mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_teams (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
        role_in_team VARCHAR(100),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, team_id)
      );
    `);
    console.log('✅ Created table: user_teams');
    
    // Departments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) UNIQUE,
        description TEXT,
        manager_id INTEGER REFERENCES users(id),
        parent_department_id INTEGER REFERENCES departments(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table: departments');
    
    // User-Department mapping
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_departments (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE NOT NULL,
        role_in_department VARCHAR(100),
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, department_id)
      );
    `);
    console.log('✅ Created table: user_departments');
    
    // User permission overrides
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_permission_overrides (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE NOT NULL,
        granted BOOLEAN NOT NULL,
        reason TEXT,
        granted_by INTEGER REFERENCES users(id),
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, permission_id)
      );
    `);
    console.log('✅ Created table: user_permission_overrides');
    
    // Audit logs
    await pool.query(`
      CREATE TABLE IF NOT EXISTS rbac_audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(100),
        resource_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table: rbac_audit_logs');
    
    // Access attempts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS access_attempts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        resource_type VARCHAR(100) NOT NULL,
        resource_id INTEGER,
        action VARCHAR(100) NOT NULL,
        permission_required VARCHAR(255),
        granted BOOLEAN NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Created table: access_attempts');
    
    console.log('\n✅ All RBAC tables created successfully!');
    
    // Verify
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles')
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Verification: Found ${result.rows.length} core RBAC tables`);
    result.rows.forEach((row: any) => {
      console.log(`   ✅ ${row.table_name}`);
    });
    
    await pool.end();
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Failed to create RBAC tables:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    await pool.end();
    process.exit(1);
  }
}

createRBACTablesOnly();
