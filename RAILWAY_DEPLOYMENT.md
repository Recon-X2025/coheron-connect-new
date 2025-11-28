# Railway Deployment Guide for Coheron CRM/ERP

This guide explains how to deploy the Coheron CRM/ERP monorepo to Railway.

## Project Structure

This is a monorepo with two separate services:

1. **coheron-works-api** - Node.js/TypeScript backend API
2. **coheron-works-web** - React/Vite frontend application

## Railway Setup

Railway requires **separate services** for each application. Follow these steps:

### Step 1: Create Services in Railway

1. Go to your Railway project dashboard
2. Click "New Service" → "GitHub Repo" (or "Empty Service")
3. Connect your repository
4. Create **two separate services**:
   - Service 1: `coheron-works-api` (Backend API)
   - Service 2: `coheron-works-web` (Frontend)

### Step 2: Configure API Backend Service

**Service Name:** `coheron-works-api`

**Settings:**
- **Root Directory:** `coheron-works-api` ✅ (Already configured)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Port:** Railway will automatically assign (use `$PORT` env var)

**Environment Variables:**
```env
NODE_ENV=production
PORT=3000
DB_HOST=<Railway PostgreSQL service host>
DB_PORT=5432
DB_NAME=<your_database_name>
DB_USER=<your_database_user>
DB_PASSWORD=<your_database_password>
CORS_ORIGIN=https://your-frontend-service.railway.app
```

**Database Setup:**
1. Add a PostgreSQL service in Railway
2. Railway will provide connection details automatically
3. Use Railway's `$DATABASE_URL` or individual connection variables

### Step 3: Configure Web Frontend Service

**Service Name:** `coheron-works-web`

**Settings:**
- **Root Directory:** `coheron-works-web` ✅ (Already configured)
- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm run serve` (or `npx serve dist -s -l $PORT`)
- **Port:** Railway will automatically assign (use `$PORT` env var)

**Note:** If `serve` is not available, install it:
- Add to `package.json` devDependencies: `"serve": "^14.2.0"`
- Or use: `npm install -g serve && serve dist -s -l $PORT`

**Environment Variables:**
```env
NODE_ENV=production
VITE_ODOO_URL=<your_odoo_instance_url>
VITE_ODOO_DATABASE=<your_odoo_database>
VITE_ODOO_PROTOCOL=jsonrpc
VITE_ODOO_TIMEOUT=30000
```

**Alternative Start Command (if serve doesn't work):**
```bash
npm install -g serve && serve dist -s -l $PORT
```

Or add to `package.json`:
```json
{
  "scripts": {
    "serve": "serve dist -s -l $PORT"
  },
  "dependencies": {
    "serve": "^14.2.0"
  }
}
```

### Step 4: Database Migration

After deploying the API service, run migrations:

1. Open Railway CLI or use Railway's service shell
2. Navigate to the API service
3. Run: `npm run migrate`
4. (Optional) Run: `npm run seed` for sample data

### Step 5: Update CORS Settings

Make sure the API service's `CORS_ORIGIN` environment variable matches your frontend service URL.

## Troubleshooting

### Error: "Error creating build plan with Railway"

This error occurs when Railway cannot detect how to build your project. Solutions:

1. **Ensure Root Directory is Set:**
   - In Railway service settings, set the correct root directory
   - API: `coheron-works-api`
   - Web: `coheron-works-web`

2. **Check package.json exists:**
   - Each service directory must have a `package.json` file
   - Verify the root directory path is correct

3. **Verify Build Commands:**
   - Ensure `build` script exists in `package.json`
   - Test build commands locally before deploying

4. **Check railway.toml/railway.json:**
   - These files help Railway understand the project structure
   - They should be in the repository root

### Build Fails

1. **Check Node.js version:**
   - Railway auto-detects Node.js version from `package.json`
   - Or set `NODE_VERSION` environment variable

2. **Check dependencies:**
   - Ensure all dependencies are in `package.json`
   - Check for platform-specific dependencies

3. **Check build output:**
   - Review Railway build logs
   - Verify TypeScript compilation succeeds

### Service Won't Start

1. **Check PORT environment variable:**
   - Railway provides `$PORT` automatically
   - Ensure your app uses `process.env.PORT`

2. **Check database connection:**
   - Verify PostgreSQL service is running
   - Check connection environment variables

3. **Check logs:**
   - Review Railway service logs for errors
   - Check application startup messages

## Quick Start Commands

### Local Testing (Before Deploying)

**API:**
```bash
cd coheron-works-api
npm install
npm run build
npm start
```

**Web:**
```bash
cd coheron-works-web
npm install
npm run build
npx serve dist -s -l 5173
```

## Additional Resources

- [Railway Documentation](https://docs.railway.app/)
- [Railway Node.js Guide](https://docs.railway.app/guides/nodejs)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)

