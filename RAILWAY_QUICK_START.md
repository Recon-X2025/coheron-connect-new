# Railway Quick Start Guide

Complete your Railway deployment in 5 minutes.

## ✅ Already Done
- [x] Root Directory configured for both services

## 🚀 Next Steps (Do These Now)

### 1. Set Build & Start Commands (2 minutes)

**API Service:**
- Build Command: `npm install && npm run build`
- Start Command: `npm start`

**Web Service:**
- Build Command: `npm install && npm run build`
- Start Command: `npm run serve`

---

### 2. Add PostgreSQL Database (1 minute)

1. In Railway dashboard, click **"New"** → **"Database"** → **"Add PostgreSQL"**
2. Railway creates the database automatically
3. Note the service name (usually "Postgres")

---

### 3. Configure API Service Variables (2 minutes)

Go to **API service** → **Variables** tab:

**Click "Reference Variable" and link PostgreSQL:**
- Select your PostgreSQL service
- Railway auto-adds: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

**Add these variables manually:**

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `CORS_ORIGIN` | `https://your-web-service.railway.app` (update after step 4) |
| `JWT_SECRET` | Generate with: `openssl rand -base64 32` |

**Map PostgreSQL variables to your app:**
- `DB_HOST` = Reference `${{Postgres.PGHOST}}`
- `DB_PORT` = Reference `${{Postgres.PGPORT}}`
- `DB_NAME` = Reference `${{Postgres.PGDATABASE}}`
- `DB_USER` = Reference `${{Postgres.PGUSER}}`
- `DB_PASSWORD` = Reference `${{Postgres.PGPASSWORD}}`

---

### 4. Configure Web Service Variables (1 minute)

Go to **Web service** → **Variables** tab:

| Variable | Value |
|----------|-------|
| `VITE_ODOO_URL` | `http://your-odoo-instance.com:8069` |
| `VITE_ODOO_DATABASE` | `your_odoo_database` |
| `VITE_ODOO_PROTOCOL` | `jsonrpc` |
| `VITE_ODOO_TIMEOUT` | `30000` |
| `VITE_ENV` | `production` |

---

### 5. Deploy Both Services (2 minutes)

1. **Deploy API:**
   - Click "Deploy" on API service
   - Wait for build to complete
   - Copy the service URL

2. **Deploy Web:**
   - Click "Deploy" on Web service
   - Wait for build to complete
   - Copy the service URL

3. **Update CORS_ORIGIN:**
   - Go back to API service → Variables
   - Update `CORS_ORIGIN` with your Web service URL
   - Redeploy API service

---

### 6. Run Database Migrations (1 minute)

**Option A: Railway CLI**
```bash
npm i -g @railway/cli
railway login
railway link
cd coheron-works-api
railway run npm run migrate
```

**Option B: Railway Shell**
- Go to API service → Latest deployment → "Shell" tab
- Run: `npm run migrate`

---

## ✅ Verify Deployment

1. **API Health:** Visit `https://your-api.railway.app/health`
   - Should show: `{"status":"ok","database":"connected"}`

2. **Web App:** Visit `https://your-web.railway.app`
   - Should load the application

---

## 📋 Complete Checklist

Use `RAILWAY_SETUP_CHECKLIST.md` for detailed step-by-step instructions.

---

## 🆘 Quick Troubleshooting

**Build fails?**
- Check build logs in Railway
- Verify package.json exists in root directory

**Service won't start?**
- Check service logs
- Verify PORT variable is set

**Database connection fails?**
- Verify PostgreSQL service is running
- Check database variables are referenced correctly

**CORS errors?**
- Ensure CORS_ORIGIN matches frontend URL exactly
- No trailing slash in URL

---

## 📚 Reference Files

- `RAILWAY_SETUP_CHECKLIST.md` - Detailed checklist
- `RAILWAY_ENV_VARIABLES.md` - Environment variables reference
- `RAILWAY_DEPLOYMENT.md` - Full deployment guide

