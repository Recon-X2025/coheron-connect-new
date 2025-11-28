# Coheron ERP - Setup and Testing Guide

## ✅ Environment Setup Complete

### 1. Environment Variables
Created `.env` file with default Odoo configuration:
```env
VITE_ODOO_URL=http://localhost:8069
VITE_ODOO_DATABASE=odoo
VITE_ODOO_PROTOCOL=jsonrpc
VITE_ODOO_TIMEOUT=30000
VITE_ENV=development
```

**To customize:**
1. Edit `.env` file in `coheron-works-web/` directory
2. Update `VITE_ODOO_URL` to your Odoo instance URL
3. Update `VITE_ODOO_DATABASE` to your database name
4. Restart the development server

### 2. Testing Utilities
Created `src/utils/testOdooConnection.ts` with helper functions:
- `testConfiguration()` - Test Odoo config
- `testAuthentication()` - Test login
- `testAPIConnection()` - Test API calls
- `runFullConnectionTest()` - Run all tests

## 🧪 Testing with Real Odoo Instance

### Prerequisites
1. **Odoo Instance Running**
   - Local: `http://localhost:8069`
   - Remote: Your Odoo server URL
   - Database created and accessible

2. **Odoo User Credentials**
   - Username
   - Password
   - Database name

### Step 1: Update Configuration
Edit `.env` file:
```env
VITE_ODOO_URL=http://your-odoo-instance.com:8069
VITE_ODOO_DATABASE=your_database_name
```

### Step 2: Start Development Server
```bash
cd coheron-works-web
npm run dev
```

### Step 3: Test Connection
1. Navigate to login page
2. Enter credentials:
   - Database (optional, uses .env if not provided)
   - Username
   - Password
3. Click "Sign In"

### Step 4: Verify Connection
After login, you should be able to:
- View data from Odoo (not mock data)
- Create, update, delete records
- See real-time data from your Odoo instance

## 🔍 Testing in Browser Console

You can test the connection programmatically:

```javascript
// Import test utilities
import { 
  testConfiguration, 
  testAuthentication, 
  testAPIConnection,
  runFullConnectionTest,
  displayTestResults
} from './utils/testOdooConnection';

// Test configuration
const configResult = await testConfiguration();
console.log(configResult);

// Test authentication
const authResult = await testAuthentication('admin', 'admin', 'odoo');
console.log(authResult);

// Test API connection
const apiResult = await testAPIConnection('res.partner');
console.log(apiResult);

// Run full test suite
const results = await runFullConnectionTest({
  username: 'admin',
  password: 'admin',
  database: 'odoo'
});
displayTestResults(results);
```

## 📦 What's Been Built

### Sprint 1: Foundation ✅
- ✅ Odoo RPC Service (JSON-RPC)
- ✅ Authentication Service
- ✅ Session Management
- ✅ Error Handling
- ✅ Retry Logic
- ✅ Configuration Management
- ✅ Loading Components
- ✅ Error Boundary

### Sprint 2: Core Enhancements (In Progress)
- ✅ Advanced Filter Component
- ✅ Bulk Actions Component
- 🔄 CRM Module Enhancements (Next)
- 🔄 Sales Module Enhancements
- 🔄 Accounting Module Enhancements
- 🔄 Inventory Module Enhancements

## 🚀 Next Steps

1. **Test with Real Odoo**
   - Set up Odoo instance (if not already)
   - Update `.env` configuration
   - Test login and basic operations

2. **Continue Sprint 2**
   - Enhance CRM module (lead conversion, opportunities)
   - Enhance Sales module (workflow, quotations)
   - Enhance Accounting module (invoice wizard, payments)
   - Enhance Inventory module (stock management)

3. **Integration Testing**
   - Test all modules with real Odoo data
   - Verify CRUD operations
   - Test error scenarios

## 🐛 Troubleshooting

### Connection Issues
- **Error: "Network error"**
  - Check Odoo URL is correct
  - Verify Odoo instance is running
  - Check firewall/network settings

- **Error: "Authentication failed"**
  - Verify username/password
  - Check database name
  - Ensure user has proper permissions

- **Error: "CORS error"**
  - Odoo needs CORS headers configured
  - Or use a proxy in development

### Configuration Issues
- **Environment variables not loading**
  - Restart development server after changing `.env`
  - Ensure `.env` is in `coheron-works-web/` directory
  - Check variable names start with `VITE_`

## 📝 Notes

- The app falls back to mock data when not authenticated (for development)
- All existing code continues to work without changes
- Real Odoo integration is optional but recommended for full functionality
- Session persists across page refreshes (24-hour expiry)

## 🎯 Current Status

**Sprint 1**: ✅ 100% Complete  
**Sprint 2**: 🔄 20% Complete (Shared components done, module enhancements in progress)

Ready for testing and continued development!

