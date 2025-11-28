# Backend Database Setup Guide

## PostgreSQL Installation

### macOS
```bash
# Install PostgreSQL using Homebrew
brew install postgresql@14

# Start PostgreSQL service
brew services start postgresql@14

# Verify installation
psql --version
```

### Ubuntu/Debian
```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
psql --version
```

### Windows
1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Run the installer
3. Remember the postgres user password you set during installation
4. PostgreSQL service will start automatically

## Database Setup

### Option 1: Automatic Setup (Recommended)

The migration script will attempt to create the database and user automatically:

```bash
cd coheron-works-api
npm run migrate
```

### Option 2: Manual Setup

If automatic setup fails, create the database manually:

```bash
# Connect to PostgreSQL as admin
psql -U postgres

# In psql prompt, run:
CREATE DATABASE coheron_erp;
CREATE USER coheron_user WITH PASSWORD 'coheron_password';
GRANT ALL PRIVILEGES ON DATABASE coheron_erp TO coheron_user;
\c coheron_erp
GRANT ALL ON SCHEMA public TO coheron_user;
\q

# Then run migrations
cd coheron-works-api
npm run migrate
```

### Option 3: Using Default Postgres User

If you want to use the default postgres user, update `.env`:

```env
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=coheron_erp
```

Then run:
```bash
npm run migrate
```

## Seed Database (Optional)

After migration, seed the database with sample data:

```bash
npm run seed
```

This creates:
- Admin user: `admin@coheron.com` / `admin123`
- Sample partners, products, leads, orders, etc.

## Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm run build
npm start
```

The API will be available at `http://localhost:3000`

## Verify Setup

1. **Check database connection:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

2. **Test API endpoint:**
   ```bash
   curl http://localhost:3000/api/partners
   ```
   Should return an array (empty if not seeded, or with data if seeded)

## Troubleshooting

### "role does not exist" error
- Create the user manually (see Option 2 above)
- Or use the default postgres user (Option 3)

### "database does not exist" error
- Create the database manually: `CREATE DATABASE coheron_erp;`
- Or let the migration script create it automatically

### Connection refused
- Make sure PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Check the port in `.env` matches your PostgreSQL port (default: 5432)

### Permission denied
- Make sure the database user has proper permissions
- Try using the postgres superuser for initial setup

## Next Steps

1. ✅ Database created and migrated
2. ✅ Backend server running
3. 🔄 Update frontend to use backend API instead of mock data
4. 🔄 Configure CORS if needed
5. 🔄 Set up authentication tokens

