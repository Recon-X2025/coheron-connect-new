# Quick Database Setup Instructions

## If PostgreSQL is NOT installed:

### macOS:
```bash
brew install postgresql@14
brew services start postgresql@14
```

### Then create database:
```bash
psql postgres
CREATE DATABASE coheron_erp;
CREATE USER coheron_user WITH PASSWORD 'coheron_password';
GRANT ALL PRIVILEGES ON DATABASE coheron_erp TO coheron_user;
\q
```

### Then run:
```bash
cd coheron-works-api
npm run migrate
npm run seed
npm run dev
```

## If PostgreSQL IS installed:

Just run:
```bash
cd coheron-works-api
npm run migrate  # This will try to create DB/user automatically
npm run seed     # Optional: add sample data
npm run dev      # Start the server
```

## Alternative: Use Default Postgres User

Edit `.env` and change:
```
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

Then run `npm run migrate`

