# Coheron ERP Backend API

Node.js/Express backend with PostgreSQL database for Coheron ERP.

## Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn

## Setup

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [PostgreSQL website](https://www.postgresql.org/download/windows/)

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# Create database and user
CREATE DATABASE coheron_erp;
CREATE USER coheron_user WITH PASSWORD 'coheron_password';
GRANT ALL PRIVILEGES ON DATABASE coheron_erp TO coheron_user;
\q
```

### 3. Install Dependencies

```bash
cd coheron-works-api
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 5. Run Migrations

```bash
npm run migrate
```

This will create all database tables and indexes.

### 6. Seed Database (Optional)

```bash
npm run seed
```

This will create sample data including:
- Default admin user (admin@coheron.com / admin123)
- Sample partners, products, leads, orders, etc.

### 7. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm run build
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Partners
- `GET /api/partners` - List all partners
- `GET /api/partners/:id` - Get partner by ID
- `POST /api/partners` - Create partner
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Delete partner

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Leads
- `GET /api/leads` - List all leads
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead

### Sale Orders
- `GET /api/sale-orders` - List all sale orders
- `GET /api/sale-orders/:id` - Get sale order by ID
- `POST /api/sale-orders` - Create sale order
- `PUT /api/sale-orders/:id` - Update sale order
- `DELETE /api/sale-orders/:id` - Delete sale order

### Invoices
- `GET /api/invoices` - List all invoices
- `GET /api/invoices/:id` - Get invoice by ID
- `POST /api/invoices` - Create invoice
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

### Manufacturing
- `GET /api/manufacturing` - List all manufacturing orders
- `GET /api/manufacturing/:id` - Get manufacturing order by ID
- `POST /api/manufacturing` - Create manufacturing order
- `PUT /api/manufacturing/:id` - Update manufacturing order
- `DELETE /api/manufacturing/:id` - Delete manufacturing order

### Campaigns
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign by ID
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign

### POS
- `GET /api/pos` - List all POS orders
- `POST /api/pos` - Create POS order

### Website
- `GET /api/website` - List all website pages
- `GET /api/website/:id` - Get page by ID
- `POST /api/website` - Create page
- `PUT /api/website/:id` - Update page
- `DELETE /api/website/:id` - Delete page

### Activities
- `GET /api/activities?res_id=1&res_model=leads` - Get activities for resource
- `POST /api/activities` - Create activity
- `PUT /api/activities/:id` - Update activity
- `DELETE /api/activities/:id` - Delete activity

## Database Schema

The database includes tables for:
- Users
- Partners (Customers/Vendors)
- Products
- Leads & Opportunities
- Sale Orders
- Invoices
- Manufacturing Orders
- Marketing Campaigns
- POS Orders
- Website Pages
- Activities

See `src/database/schema.sql` for full schema details.

## Default Credentials

After seeding:
- Email: `admin@coheron.com`
- Password: `admin123`

## Development

The server runs on `http://localhost:3000` by default.

Health check endpoint: `http://localhost:3000/health`

## Production

1. Set proper environment variables
2. Use a production PostgreSQL instance
3. Enable SSL for database connections
4. Set strong JWT_SECRET
5. Configure CORS properly
6. Use process manager (PM2, systemd, etc.)

