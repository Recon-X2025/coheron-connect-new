# CRM RBAC Usage Guide

This guide shows you how to use the CRM RBAC system in your application.

---

## 📋 Table of Contents

1. [Assigning Roles to Users](#assigning-roles-to-users)
2. [Using RBAC Utilities](#using-rbac-utilities)
3. [Testing API Endpoints](#testing-api-endpoints)
4. [Using Permission Middleware](#using-permission-middleware)
5. [Field-Level Security](#field-level-security)
6. [Approval Workflows](#approval-workflows)

---

## 1. Assigning Roles to Users

### Option A: Using SQL

```sql
-- Assign a role to a user
INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
SELECT u.id, r.id, 1, true
FROM users u, roles r
WHERE u.email = 'user@example.com' AND r.code = 'sales_rep'
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;

-- Assign multiple roles
INSERT INTO user_roles (user_id, role_id, assigned_by, is_active)
SELECT u.id, r.id, 1, true
FROM users u
CROSS JOIN roles r
WHERE u.email = 'user@example.com' 
  AND r.code IN ('sales_rep', 'marketing_specialist')
ON CONFLICT (user_id, role_id) DO UPDATE SET is_active = true;

-- View user's roles
SELECT r.code, r.name, ur.is_active, ur.assigned_at
FROM user_roles ur
INNER JOIN roles r ON ur.role_id = r.id
INNER JOIN users u ON ur.user_id = u.id
WHERE u.email = 'user@example.com';
```

### Option B: Using the Script

```bash
cd coheron-works-api
npx tsx src/database/assign-roles-example.ts
```

### Option C: Using the API

```bash
# Get JWT token first (login)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Assign role to user (requires system.rbac.manage permission)
curl -X POST http://localhost:3000/api/rbac/users/1/roles \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": 5,
    "expires_at": null,
    "notes": "Assigned for CRM access"
  }'
```

---

## 2. Using RBAC Utilities

### Import the utilities

```typescript
import {
  createDiscountApproval,
  processDiscountApproval,
  assignToTerritory,
  canAccessField,
  canExport,
  canPartnerAccess
} from './utils/crm-rbac.js';
import { hasPermission, getUserPermissions } from './utils/permissions.js';
```

### Check User Permissions

```typescript
// Check if user has a specific permission
const canCreateLeads = await hasPermission(userId, 'crm.leads.create');
if (canCreateLeads) {
  // Allow creating leads
}

// Get all user permissions
const permissions = await getUserPermissions(userId);
console.log('User has permissions:', permissions);
```

### Discount Approval Workflow

```typescript
// When creating a quote with discount
const approvalId = await createDiscountApproval(
  quoteId,
  userId,
  18.5,        // discount percentage
  10000,       // original amount
  8150,        // discounted amount
  'Bulk order discount'
);

if (approvalId === 0) {
  // Auto-approved, proceed
} else {
  // Pending approval, wait for manager
}

// Manager approves
await processDiscountApproval(approvalId, managerId, true, 'Approved');
```

### Territory Assignment

```typescript
// Auto-assign lead to territory
const territoryId = await assignToTerritory(
  leadId,
  '560001',      // ZIP code
  'Karnataka',   // State
  'India',       // Country
  'IT',          // Industry
  'Large'        // Company size
);
```

### Field-Level Security

```typescript
// Check if user can edit sensitive field
const canEdit = await canAccessField(userId, 'quote', 'discount_percentage', 'edit');

if (canEdit) {
  // Update the field
  await updateQuote(quoteId, { discount_percentage: 15 });
  
  // Log the access
  await logFieldAccess(userId, 'quote', quoteId, 'discount_percentage', 'edit', 10, 15);
} else {
  throw new Error('Insufficient permissions');
}
```

See `src/utils/rbac-usage-examples.ts` for more examples.

---

## 3. Testing API Endpoints

### Using the Test File

1. Install REST Client extension in VS Code (or use similar tool)
2. Open `test-crm-rbac-api.http`
3. Set your JWT token in the `@token` variable
4. Click "Send Request" on any endpoint

### Using cURL

```bash
# Get JWT token
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}' \
  | jq -r '.token')

# Request discount approval
curl -X POST http://localhost:3000/api/crm-rbac/discount-approvals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "quote_id": 1,
    "discount_percentage": 18.5,
    "original_amount": 10000,
    "discounted_amount": 8150,
    "justification": "Bulk order discount"
  }'

# Get pending approvals
curl -X GET http://localhost:3000/api/crm-rbac/discount-approvals/pending \
  -H "Authorization: Bearer $TOKEN"

# Simulate user permissions
curl -X GET "http://localhost:3000/api/crm-rbac/simulate/1?resource_type=quote&action=approve" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 4. Using Permission Middleware

### Protect Routes with Permissions

```typescript
import { requirePermission, requireRole } from '../middleware/permissions.js';

// Require specific permission
router.post('/leads', 
  requirePermission('crm.leads.create'),
  async (req, res) => {
    // Create lead
  }
);

// Require any of multiple permissions
router.put('/leads/:id',
  requireAnyPermission(['crm.leads.update', 'crm.leads.edit']),
  async (req, res) => {
    // Update lead
  }
);

// Require specific role
router.get('/admin/dashboard',
  requireRole('system_admin'),
  async (req, res) => {
    // Admin dashboard
  }
);
```

### Access User Info in Routes

```typescript
router.get('/my-permissions', async (req, res) => {
  const userId = req.user?.userId;
  const permissions = req.user?.permissions;
  const roles = req.user?.roles;
  
  res.json({
    userId,
    permissions,
    roles
  });
});
```

---

## 5. Field-Level Security

### Check Field Access Before Updating

```typescript
router.put('/quotes/:id/discount', 
  requirePermission('crm.quotes.update'),
  async (req, res) => {
    const userId = req.user?.userId;
    const quoteId = parseInt(req.params.id);
    const { discount_percentage } = req.body;
    
    // Check field-level access
    const canEdit = await canAccessField(
      userId,
      'quote',
      'discount_percentage',
      'edit'
    );
    
    if (!canEdit) {
      return res.status(403).json({ 
        error: 'Insufficient permissions to edit discount_percentage' 
      });
    }
    
    // Update the field
    // ... update logic ...
    
    // Log access
    await logFieldAccess(
      userId,
      'quote',
      quoteId,
      'discount_percentage',
      'edit',
      oldValue,
      discount_percentage
    );
    
    res.json({ success: true });
  }
);
```

---

## 6. Approval Workflows

### Discount Approval

```typescript
// 1. Sales Rep requests discount
router.post('/quotes/:id/request-discount',
  requirePermission('crm.quotes.update'),
  async (req, res) => {
    const approvalId = await createDiscountApproval(
      quoteId,
      userId,
      discountPercentage,
      originalAmount,
      discountedAmount,
      justification
    );
    
    res.json({ approval_id: approvalId, status: 'pending' });
  }
);

// 2. Manager approves/rejects
router.post('/discount-approvals/:id/approve',
  requirePermission('crm.opportunities.approve_discount'),
  async (req, res) => {
    await processDiscountApproval(approvalId, managerId, true, reason);
    res.json({ message: 'Approved' });
  }
);
```

### Export Approval

```typescript
router.post('/export',
  requirePermission('crm.export'),
  async (req, res) => {
    const exportCheck = await canExport(userId, resourceType, recordCount);
    
    if (exportCheck.allowed && !exportCheck.requiresApproval) {
      // Direct export
      const data = await exportData(filters);
      res.json(data);
    } else if (exportCheck.requiresApproval) {
      // Request approval
      const approvalId = await createExportApproval(
        userId,
        resourceType,
        recordCount,
        filters,
        justification
      );
      res.json({ approval_id: approvalId, status: 'pending' });
    } else {
      res.status(403).json({ error: exportCheck.reason });
    }
  }
);
```

---

## 📚 Additional Resources

- **Complete Examples:** `src/utils/rbac-usage-examples.ts`
- **API Test File:** `test-crm-rbac-api.http`
- **Specification:** `CRM_MODULE_COMPLETE_SPECIFICATION.md`
- **Implementation:** `CRM_RBAC_IMPLEMENTATION_COMPLETE.md`

---

## 🔍 Troubleshooting

### Permission Denied Errors

1. Check if user has the role assigned:
   ```sql
   SELECT r.code FROM user_roles ur
   INNER JOIN roles r ON ur.role_id = r.id
   WHERE ur.user_id = 1 AND ur.is_active = true;
   ```

2. Check if role has the permission:
   ```sql
   SELECT p.code FROM role_permissions rp
   INNER JOIN permissions p ON rp.permission_id = p.id
   INNER JOIN roles r ON rp.role_id = r.id
   WHERE r.code = 'sales_rep' AND rp.granted = true;
   ```

3. Use role simulation to debug:
   ```bash
   GET /api/crm-rbac/simulate/USER_ID?resource_type=quote&action=approve
   ```

### Field Access Issues

- Check field-level permissions in the database
- Verify role has field-level permission assigned
- Check audit logs: `SELECT * FROM field_access_logs WHERE user_id = ?`

---

**Need Help?** Check the examples in `src/utils/rbac-usage-examples.ts` or refer to the API documentation.

