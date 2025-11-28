# Railway Deployment Setup Checklist

Use this checklist to complete your Railway deployment configuration.

## ✅ Step 1: Root Directory (COMPLETED)
- [x] API Service: Root Directory = `coheron-works-api`
- [x] Web Service: Root Directory = `coheron-works-web`

## 📋 Step 2: Configure Build & Start Commands

### API Backend Service
- [ ] **Build Command:** `npm install && npm run build`
- [ ] **Start Command:** `npm start`

### Web Frontend Service
- [ ] **Build Command:** `npm install && npm run build`
- [ ] **Start Command:** `npm run serve`

---

## 🗄️ Step 3: Set Up PostgreSQL Database

1. **Add PostgreSQL Service:**
   - [ ] In Railway dashboard, click "New" → "Database" → "Add PostgreSQL"
   - [ ] Railway will automatically create a PostgreSQL instance
   - [ ] Note the service name (e.g., "Postgres")

2. **Link Database to API Service:**
   - [ ] Go to your API service settings
   - [ ] Click "Variables" tab
   - [ ] Click "Reference Variable"
   - [ ] Select your PostgreSQL service
   - [ ] Railway will automatically add `DATABASE_URL` and individual connection variables:
     - `PGHOST`
     - `PGPORT`
     - `PGDATABASE`
     - `PGUSER`
     - `PGPASSWORD`

---

## 🔧 Step 4: Configure Environment Variables

### API Backend Service Variables

Go to API service → Variables tab and add:

**Required:**
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `3000` (Railway will override with $PORT, but set as fallback)
- [ ] `CORS_ORIGIN` = `https://your-web-service.railway.app` (update after deploying web service)

**Database (from Railway PostgreSQL service):**
- [ ] `DATABASE_URL` = (auto-added by Railway when you reference PostgreSQL)
- [ ] OR set individually:
  - [ ] `DB_HOST` = (from Railway PostgreSQL `PGHOST`)
  - [ ] `DB_PORT` = (from Railway PostgreSQL `PGPORT`)
  - [ ] `DB_NAME` = (from Railway PostgreSQL `PGDATABASE`)
  - [ ] `DB_USER` = (from Railway PostgreSQL `PGUSER`)
  - [ ] `DB_PASSWORD` = (from Railway PostgreSQL `PGPASSWORD`)

**Security:**
- [ ] `JWT_SECRET` = (generate a strong random string, e.g., use: `openssl rand -base64 32`)

### Web Frontend Service Variables

Go to Web service → Variables tab and add:

**Required (Vite requires VITE_ prefix):**
- [ ] `VITE_ODOO_URL` = `http://your-odoo-instance.com:8069` (your Odoo server URL)
- [ ] `VITE_ODOO_DATABASE` = `your_odoo_database_name`
- [ ] `VITE_ODOO_PROTOCOL` = `jsonrpc`
- [ ] `VITE_ODOO_TIMEOUT` = `30000`
- [ ] `VITE_ENV` = `production`

**Optional:**
- [ ] `VITE_API_URL` = `https://your-api-service.railway.app` (if using the API service)

**Note:** Vite variables are embedded at build time. After changing these, you must rebuild the service.

---

## 🚀 Step 5: Deploy Services

1. **Deploy API Service:**
   - [ ] Click "Deploy" on API service
   - [ ] Wait for build to complete
   - [ ] Check build logs for errors
   - [ ] Note the service URL (e.g., `https://api-production-xxxx.up.railway.app`)

2. **Deploy Web Service:**
   - [ ] Click "Deploy" on Web service
   - [ ] Wait for build to complete
   - [ ] Check build logs for errors
   - [ ] Note the service URL (e.g., `https://web-production-xxxx.up.railway.app`)

---

## 🗃️ Step 6: Run Database Migrations

After API service is deployed:

1. **Option A: Using Railway CLI**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link to your project
   railway link
   
   # Run migrations
   cd coheron-works-api
   railway run npm run migrate
   ```

2. **Option B: Using Railway Service Shell**
   - [ ] Go to API service → "Deployments" → Click on latest deployment
   - [ ] Click "Shell" tab
   - [ ] Run: `npm run migrate`
   - [ ] (Optional) Run: `npm run seed` for sample data

3. **Option C: Using Railway's Deploy Script**
   - [ ] Add a one-time deploy script (see below)

---

## 🔗 Step 7: Update Service URLs

After both services are deployed:

1. **Update API CORS_ORIGIN:**
   - [ ] Go to API service → Variables
   - [ ] Update `CORS_ORIGIN` to your Web service URL
   - [ ] Redeploy API service

2. **Update Web VITE_API_URL (if needed):**
   - [ ] Go to Web service → Variables
   - [ ] Update `VITE_API_URL` to your API service URL
   - [ ] Redeploy Web service (Vite vars require rebuild)

---

## ✅ Step 8: Verify Deployment

- [ ] **API Health Check:**
  - Visit: `https://your-api-service.railway.app/health`
  - Should return: `{"status":"ok","database":"connected"}`

- [ ] **Web Frontend:**
  - Visit: `https://your-web-service.railway.app`
  - Should load the application

- [ ] **Database Connection:**
  - Check API logs for: `✅ Connected to PostgreSQL database`
  - Health endpoint should show `"database":"connected"`

---

## 🔄 Step 9: Set Up Custom Domains (Optional)

- [ ] Add custom domain to API service
- [ ] Add custom domain to Web service
- [ ] Update CORS_ORIGIN and environment variables with new domains

---

## 📝 Quick Reference: Railway Service URLs

After deployment, note your service URLs here:

- **API Service:** `https://____________________.railway.app`
- **Web Service:** `https://____________________.railway.app`
- **Database:** (managed by Railway)

---

## 🆘 Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Verify Node.js version (Railway auto-detects from package.json)
- Ensure all dependencies are in package.json

### Service Won't Start
- Check service logs
- Verify PORT environment variable is used in code
- Check database connection variables

### Database Connection Fails
- Verify PostgreSQL service is running
- Check database environment variables are set correctly
- Ensure API service has access to PostgreSQL service

### CORS Errors
- Verify CORS_ORIGIN matches your frontend URL exactly
- Check API service logs for CORS errors
- Ensure frontend is making requests to correct API URL

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [Railway PostgreSQL Guide](https://docs.railway.app/databases/postgresql)

