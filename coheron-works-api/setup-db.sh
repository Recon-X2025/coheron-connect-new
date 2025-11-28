#!/bin/bash

# Coheron ERP Database Setup Script

echo "🗄️  Setting up PostgreSQL database for Coheron ERP..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   macOS: brew install postgresql@14"
    echo "   Ubuntu: sudo apt-get install postgresql postgresql-contrib"
    exit 1
fi

# Database configuration
DB_NAME="coheron_erp"
DB_USER="coheron_user"
DB_PASSWORD="coheron_password"

echo "📝 Creating database and user..."

# Create database and user
psql -U postgres <<EOF
-- Create database
CREATE DATABASE $DB_NAME;

-- Create user
CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;

-- Connect to database and grant schema privileges
\c $DB_NAME
GRANT ALL ON SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $DB_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $DB_USER;

\q
EOF

if [ $? -eq 0 ]; then
    echo "✅ Database and user created successfully!"
    echo ""
    echo "📋 Database Details:"
    echo "   Database: $DB_NAME"
    echo "   User: $DB_USER"
    echo "   Password: $DB_PASSWORD"
    echo ""
    echo "🔧 Next steps:"
    echo "   1. Copy .env.example to .env"
    echo "   2. Update .env with database credentials"
    echo "   3. Run: npm run migrate"
    echo "   4. Run: npm run seed (optional)"
else
    echo "❌ Database setup failed. You may need to run as postgres user:"
    echo "   sudo -u postgres psql < setup-db.sh"
    exit 1
fi

