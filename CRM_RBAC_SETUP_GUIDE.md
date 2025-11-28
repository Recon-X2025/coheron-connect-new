# CRM RBAC Setup Guide

## ✅ Status

- ✅ CRM RBAC migration script created: `run-crm-rbac-migration.ts`
- ✅ CRM RBAC seed script created: `seed-crm-rbac.ts`
- ✅ Migration SQL file created: `migrations/crm_rbac_enhancements.sql`
- ✅ API routes created: `routes/crm-rbac.ts`
- ✅ Utility functions created: `utils/crm-rbac.ts`

## 📋 Setup Steps

### Step 1: Ensure Base RBAC Tables Exist

The CRM RBAC seed script requires the base RBAC tables (`roles`, `permissions`, `role_permissions`, `user_roles`) to exist. These are created by the main schema.

**Option A: Run the full schema migration (recommended)**
```bash
cd coheron-works-api
npm run migrate
```

**Option B: If base schema already exists, verify RBAC tables:**
```sql
-- Connect to your database and check:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('roles', 'permissions', 'role_permissions', 'user_roles');
```

### Step 2: Run CRM RBAC Migration

This creates the CRM-specific tables (territories, discount_approvals, etc.):

```bash
cd coheron-works-api
npm run migrate-crm-rbac
```

**Expected output:**
```
🔄 Running CRM RBAC enhancements migration...
✅ CRM RBAC migration completed!
   Successfully executed: X statements
   Skipped (already exists): Y statements
```

### Step 3: Seed CRM Roles and Permissions

This populates the CRM-specific roles and permissions:

```bash
cd coheron-works-api
npm run seed-crm-rbac
```

**Expected output:**
```
🌱 Seeding CRM RBAC roles and permissions...
✅ Created/Updated role: System Admin (system_admin)
✅ Created/Updated role: Sales Director (sales_director)
✅ Created/Updated role: Sales Manager (sales_manager)
... (and so on for all 12 roles)
✅ Created/Updated permission: View Leads (crm.leads.view)
... (and so on for all 50+ permissions)
✅ Assigned X permissions to role: system_admin
... (and so on for all roles)
✅ CRM RBAC seeding completed successfully!
✅ Seed script completed
```

### Step 4: Verify Setup

**Check roles:**
```sql
SELECT code, name, module, level FROM roles WHERE module = 'crm' OR code IN ('system_admin', 'finance', 'auditor', 'data_steward', 'integrator') ORDER BY module, level;
```

**Check permissions:**
```sql
SELECT code, name, module, feature, action FROM permissions WHERE module = 'crm' ORDER BY feature, action;
```

**Check role-permission assignments:**
```sql
SELECT r.code as role, COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.granted = true
WHERE r.code IN ('system_admin', 'sales_director', 'sales_manager', 'sales_rep', 'marketing_manager', 'marketing_specialist', 'support_agent', 'finance', 'partner', 'auditor', 'data_steward', 'integrator')
GROUP BY r.code
ORDER BY r.code;
```

## 🔧 Troubleshooting

### Issue: "relation 'roles' does not exist"

**Solution:** The base RBAC tables haven't been created. Run:
```bash
npm run migrate
```

This will create all base tables including the RBAC tables.

### Issue: Migration fails with constraint errors

**Solution:** Some tables might already exist. The migration uses `IF NOT EXISTS` so it should be safe to run multiple times. If you see specific constraint errors, you may need to:

1. Check if the tables exist:
```sql
\dt -- List all tables
```

2. If tables exist but migration fails, you can manually verify the structure matches the migration file.

### Issue: Seed script runs but no output

**Solution:** The seed script might have an execution check issue. Try running directly:
```bash
npx tsx src/database/seed-crm-rbac.ts
```

Or check the database directly:
```sql
SELECT COUNT(*) FROM roles WHERE code IN ('system_admin', 'sales_rep', 'sales_manager');
```

### Issue: Permission denied errors

**Solution:** Ensure your database user has the necessary privileges:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;
```

## 📊 Verification Checklist

After setup, verify:

- [ ] Base RBAC tables exist (`roles`, `permissions`, `role_permissions`, `user_roles`)
- [ ] CRM RBAC tables exist (`territories`, `discount_approvals`, `quote_approvals`, `field_access_logs`, `export_approvals`, etc.)
- [ ] 12 CRM roles created (system_admin, sales_director, sales_manager, sales_rep, marketing_manager, marketing_specialist, support_agent, finance, partner, auditor, data_steward, integrator)
- [ ] 50+ CRM permissions created
- [ ] Role-permission mappings assigned correctly
- [ ] Default discount thresholds created

## 🚀 Next Steps

Once setup is complete:

1. **Assign roles to users:**
   ```sql
   INSERT INTO user_roles (user_id, role_id, assigned_by)
   SELECT u.id, r.id, 1
   FROM users u, roles r
   WHERE u.email = 'user@example.com' AND r.code = 'sales_rep';
   ```

2. **Test API endpoints:**
   ```bash
   # Start the server
   npm run dev
   
   # Test discount approval endpoint (requires auth token)
   curl -X POST http://localhost:3000/api/crm-rbac/discount-approvals \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"quote_id": 1, "discount_percentage": 15, "original_amount": 10000, "discounted_amount": 8500}'
   ```

3. **Use in your application:**
   - Import utility functions from `utils/crm-rbac.ts`
   - Use API endpoints from `routes/crm-rbac.ts`
   - Apply permission middleware to protect routes

## 📚 Documentation

- **Complete Specification:** `CRM_MODULE_COMPLETE_SPECIFICATION.md`
- **Implementation Details:** `CRM_RBAC_IMPLEMENTATION_COMPLETE.md`
- **API Routes:** See `routes/crm-rbac.ts` for endpoint documentation

---

**Need Help?** Check the error messages and refer to the troubleshooting section above.

