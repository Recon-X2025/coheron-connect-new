# Railway Environment Variables Reference

Copy these environment variables into Railway's service settings.

## API Backend Service Environment Variables

### Required Variables

```env
NODE_ENV=production
PORT=3000
```

### Database Variables (from Railway PostgreSQL)

Railway automatically provides these when you link the PostgreSQL service:

```env
# Option 1: Use DATABASE_URL (recommended)
DATABASE_URL=postgresql://user:password@host:port/database

# Option 2: Use individual variables
PGHOST=containers-us-west-xxx.railway.app
PGPORT=5432
PGDATABASE=railway
PGUSER=postgres
PGPASSWORD=your_password
```

**For the API service, map Railway's variables to your app's expected names:**

```env
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
```

Or use Railway's variable references:
- In Railway dashboard, go to API service → Variables
- Click "Reference Variable"
- Select your PostgreSQL service
- Railway will auto-add the connection variables

### CORS Configuration

```env
CORS_ORIGIN=https://your-web-service.railway.app
```

**Important:** Update this after deploying the web service with its actual URL.

### Security

```env
JWT_SECRET=your-super-secret-jwt-key-generate-with-openssl-rand-base64-32
```

**Generate a secure JWT secret:**
```bash
openssl rand -base64 32
```

---

## Web Frontend Service Environment Variables

### Required Variables (Vite requires VITE_ prefix)

```env
VITE_ODOO_URL=http://your-odoo-instance.com:8069
VITE_ODOO_DATABASE=your_odoo_database_name
VITE_ODOO_PROTOCOL=jsonrpc
VITE_ODOO_TIMEOUT=30000
VITE_ENV=production
```

### Optional: API Backend URL

```env
VITE_API_URL=https://your-api-service.railway.app
```

**Important Notes:**
- Vite variables are embedded at **build time**
- After changing these variables, you **must rebuild** the service
- Variables must start with `VITE_` to be accessible in the frontend code

---

## Quick Setup Instructions

### 1. API Service Variables

1. Go to Railway dashboard → Your API service
2. Click "Variables" tab
3. Add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | Railway will override with $PORT |
| `CORS_ORIGIN` | `https://your-web-service.railway.app` | Update after web deploy |
| `JWT_SECRET` | `[generate with openssl]` | Generate secure key |
| `DB_HOST` | `${{Postgres.PGHOST}}` | Reference from PostgreSQL service |
| `DB_PORT` | `${{Postgres.PGPORT}}` | Reference from PostgreSQL service |
| `DB_NAME` | `${{Postgres.PGDATABASE}}` | Reference from PostgreSQL service |
| `DB_USER` | `${{Postgres.PGUSER}}` | Reference from PostgreSQL service |
| `DB_PASSWORD` | `${{Postgres.PGPASSWORD}}` | Reference from PostgreSQL service |

### 2. Web Service Variables

1. Go to Railway dashboard → Your Web service
2. Click "Variables" tab
3. Add these variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `VITE_ODOO_URL` | `http://your-odoo-instance.com:8069` | Your Odoo server |
| `VITE_ODOO_DATABASE` | `your_database` | Your Odoo database |
| `VITE_ODOO_PROTOCOL` | `jsonrpc` | |
| `VITE_ODOO_TIMEOUT` | `30000` | |
| `VITE_ENV` | `production` | |
| `VITE_API_URL` | `https://your-api-service.railway.app` | Optional |

---

## Railway Variable Reference Syntax

Railway allows referencing variables from other services:

```env
# Reference PostgreSQL service variables
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}

# Reference another service's URL
API_URL=${{API_SERVICE.RAILWAY_PUBLIC_DOMAIN}}
```

To use this:
1. In Variables tab, click "Reference Variable"
2. Select the service (e.g., "Postgres")
3. Select the variable (e.g., "PGHOST")
4. Railway will create the reference automatically

---

## Environment Variable Priority

Railway environment variables override:
1. Railway service variables (highest priority)
2. Railway project variables
3. Default values in code (lowest priority)

---

## Testing Variables

After setting variables, verify they're loaded:

**API Service:**
```bash
# In Railway service shell or logs
echo $DB_HOST
echo $DB_NAME
```

**Web Service:**
```bash
# Check build logs - Vite will show which variables were embedded
# Look for: "VITE_ODOO_URL" in build output
```

---

## Common Issues

### Variables Not Working

1. **Vite variables not updating:**
   - Vite embeds variables at build time
   - Solution: Redeploy the service after changing variables

2. **Database variables not found:**
   - Ensure PostgreSQL service is linked
   - Check variable names match exactly
   - Verify Railway variable references are set up

3. **CORS errors:**
   - Ensure `CORS_ORIGIN` matches frontend URL exactly
   - Include `https://` protocol
   - No trailing slash

### Database Connection Issues

If using `DATABASE_URL` instead of individual variables, you may need to parse it. The current connection.ts uses individual variables, which is recommended for Railway.

---

## Security Best Practices

1. **Never commit `.env` files** - They're in .gitignore
2. **Use Railway's secret variables** - They're encrypted
3. **Generate strong JWT_SECRET** - Use: `openssl rand -base64 32`
4. **Rotate secrets regularly** - Especially in production
5. **Use Railway variable references** - More secure than copying values

