# 🚀 Quick Start Guide

## Application Status

✅ **Frontend**: Running on http://localhost:5173  
✅ **Backend API**: Running on http://localhost:3000  
⚠️ **Database**: Requires PostgreSQL setup

---

## Step 1: Set Up PostgreSQL Database

### Install PostgreSQL (if not installed)

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

### Create Database

```bash
cd coheron-works-api

# Option 1: Automatic (recommended)
npm run migrate

# Option 2: Manual
psql postgres
CREATE DATABASE coheron_erp;
CREATE USER coheron_user WITH PASSWORD 'coheron_password';
GRANT ALL PRIVILEGES ON DATABASE coheron_erp TO coheron_user;
\q
npm run migrate
```

### Seed Database (Optional)

```bash
npm run seed
```

This creates:
- Admin user: `admin@coheron.com` / `admin123`
- Sample data for all modules

---

## Step 2: Start Services

### Backend API (Terminal 1)
```bash
cd coheron-works-api
npm run dev
```
✅ Server runs on: http://localhost:3000

### Frontend (Terminal 2)
```bash
cd coheron-works-web
npm run dev
```
✅ App runs on: http://localhost:5173

---

## Step 3: Access the Application

1. **Open Browser**: http://localhost:5173
2. **Login Options**:
   - **New API**: Use email/password (if database seeded: `admin@coheron.com` / `admin123`)
   - **Odoo**: Use username/password/database (if Odoo is running)
3. **Signup**: Create new account at http://localhost:5173/signup

---

## Available Pages

### Main Pages
- **Dashboard**: http://localhost:5173/dashboard
- **Settings**: http://localhost:5173/settings
- **Admin Portal**: http://localhost:5173/admin
- **Subscription**: http://localhost:5173/subscription

### CRM Module
- **Pipeline**: http://localhost:5173/crm/pipeline
- **Leads**: http://localhost:5173/crm/leads
- **Opportunities**: http://localhost:5173/crm/opportunities
- **Customers**: http://localhost:5173/crm/customers

### Sales Module
- **Sales Orders**: http://localhost:5173/sales/orders
- **Quotations**: http://localhost:5173/sales/quotations

### Accounting
- **Invoices**: http://localhost:5173/accounting/invoices

### Inventory
- **Products**: http://localhost:5173/inventory/products

### Manufacturing
- **Orders**: http://localhost:5173/manufacturing/orders

### Marketing
- **Campaigns**: http://localhost:5173/marketing/campaigns

### POS
- **Point of Sale**: http://localhost:5173/pos

### Website
- **Pages**: http://localhost:5173/website/pages

---

## API Endpoints

**Base URL**: http://localhost:3000/api

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Data Endpoints
- `GET /api/partners` - List partners
- `GET /api/products` - List products
- `GET /api/leads` - List leads
- `GET /api/sale-orders` - List sales orders
- `GET /api/invoices` - List invoices
- `GET /api/manufacturing` - List manufacturing orders
- `GET /api/campaigns` - List campaigns
- `GET /api/website` - List website pages

All endpoints support full CRUD operations.

---

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running: `brew services list` (macOS) or `sudo systemctl status postgresql` (Linux)
- Verify database exists: `psql -l | grep coheron_erp`
- Check `.env` file in `coheron-works-api/`

### Frontend can't connect to backend
- Verify backend is running: `curl http://localhost:3000/health`
- Check `VITE_API_URL` in `coheron-works-web/.env`
- Check CORS settings in backend

### Database connection errors
- Verify PostgreSQL is running
- Check database credentials in `.env`
- Try creating database manually (see Step 1)

### Port already in use
- Change port in `.env` files
- Or kill process using the port:
  ```bash
  lsof -ti:3000 | xargs kill  # Backend
  lsof -ti:5173 | xargs kill  # Frontend
  ```

---

## Default Credentials

After seeding database:
- **Email**: `admin@coheron.com`
- **Password**: `admin123`

---

## Next Steps

1. ✅ Database setup
2. ✅ Backend running
3. ✅ Frontend running
4. 🔄 Test all modules
5. 🔄 Configure production environment
6. 🔄 Deploy to production

---

**Status**: ✅ Application is ready to use!

