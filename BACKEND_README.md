# ✅ Backend Database & API - Complete!

## What Was Built

A complete **Node.js/Express REST API** with **PostgreSQL database** for Coheron ERP.

### 📁 Project Structure
```
coheron-works-api/
├── src/
│   ├── database/
│   │   ├── connection.ts      # PostgreSQL connection pool
│   │   ├── schema.sql         # Complete database schema
│   │   ├── migrate.ts         # Migration script
│   │   └── seed.ts            # Seed script for sample data
│   ├── routes/
│   │   ├── auth.ts            # Authentication (login/register)
│   │   ├── partners.ts        # Partners CRUD
│   │   ├── products.ts        # Products CRUD
│   │   ├── leads.ts           # Leads/Opportunities CRUD
│   │   ├── saleOrders.ts      # Sales Orders CRUD
│   │   ├── invoices.ts         # Invoices CRUD
│   │   ├── manufacturing.ts   # Manufacturing Orders CRUD
│   │   ├── campaigns.ts       # Marketing Campaigns CRUD
│   │   ├── pos.ts             # POS Orders
│   │   ├── website.ts         # Website Pages CRUD
│   │   └── activities.ts      # Activities/Timeline CRUD
│   └── server.ts               # Express server
├── package.json
├── tsconfig.json
└── .env                        # Environment configuration
```

### 🗄️ Database Schema

**Tables Created:**
- ✅ `users` - User accounts with authentication
- ✅ `partners` - Customers/Vendors
- ✅ `products` - Product catalog
- ✅ `leads` - CRM leads and opportunities
- ✅ `sale_orders` - Sales orders with order lines
- ✅ `invoices` - Accounting invoices
- ✅ `manufacturing_orders` - Manufacturing operations
- ✅ `campaigns` - Marketing campaigns
- ✅ `pos_orders` - Point of Sale transactions
- ✅ `website_pages` - Website content
- ✅ `activities` - Activity timeline for CRM

**Features:**
- Foreign key relationships
- Indexes for performance
- Auto-updating `updated_at` timestamps
- Data validation with CHECK constraints

### 🔌 API Endpoints

**Base URL:** `http://localhost:3000/api`

**Available Endpoints:**
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/partners` - List partners
- `GET /api/products` - List products
- `GET /api/leads` - List leads/opportunities
- `GET /api/sale-orders` - List sales orders
- `GET /api/invoices` - List invoices
- `GET /api/manufacturing` - List manufacturing orders
- `GET /api/campaigns` - List campaigns
- `POST /api/pos` - Create POS order
- `GET /api/website` - List website pages
- `GET /api/activities?res_id=1&res_model=leads` - Get activities

All endpoints support:
- `GET /:id` - Get by ID
- `POST /` - Create
- `PUT /:id` - Update
- `DELETE /:id` - Delete

## 🚀 Quick Start

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database (Choose One Method)

**Method A: Automatic (Recommended)**
```bash
cd coheron-works-api
npm run migrate
```
This will attempt to create the database and user automatically.

**Method B: Manual**
```bash
psql postgres
CREATE DATABASE coheron_erp;
CREATE USER coheron_user WITH PASSWORD 'coheron_password';
GRANT ALL PRIVILEGES ON DATABASE coheron_erp TO coheron_user;
\q

cd coheron-works-api
npm run migrate
```

**Method C: Use Default Postgres User**
Edit `.env`:
```env
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

Then run:
```bash
npm run migrate
```

### 3. Seed Database (Optional)
```bash
npm run seed
```

Creates:
- Admin user: `admin@coheron.com` / `admin123`
- Sample data for all modules

### 4. Start Server
```bash
npm run dev
```

Server runs on: `http://localhost:3000`

## ✅ Verification

1. **Health Check:**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"ok","database":"connected"}`

2. **Test API:**
   ```bash
   curl http://localhost:3000/api/partners
   ```

## 🔗 Connect Frontend to Backend

Update frontend `.env`:
```env
VITE_API_URL=http://localhost:3000/api
```

Then update `odooService.ts` to use the new API instead of Odoo RPC.

## 📊 Database Features

- ✅ Full CRUD operations for all modules
- ✅ Foreign key relationships
- ✅ Indexes for performance
- ✅ Auto-updating timestamps
- ✅ Data validation
- ✅ Transaction support
- ✅ Prepared statements (SQL injection protection)

## 🔒 Security Features

- ✅ Password hashing (bcrypt)
- ✅ JWT authentication
- ✅ CORS configuration
- ✅ SQL injection protection (parameterized queries)
- ✅ Environment variable configuration

## 📝 Next Steps

1. ✅ Backend API created
2. ✅ Database schema ready
3. 🔄 Install PostgreSQL and run migrations
4. 🔄 Update frontend to use new API
5. 🔄 Add authentication middleware
6. 🔄 Deploy to production

---

**Status:** ✅ Backend code complete and ready to use!
**Next:** Install PostgreSQL and run migrations to start using the database.

