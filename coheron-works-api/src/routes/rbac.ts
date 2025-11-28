import express from 'express';
import pool from '../database/connection.js';
import { requirePermission } from '../middleware/permissions.js';
import { logPermissionChange } from '../utils/permissions.js';

const router = express.Router();

// ============================================
// ROLES MANAGEMENT
// ============================================

// Get all roles
router.get('/roles', requirePermission('system.roles.view'), async (req, res) => {
  try {
    const { module, level, is_active } = req.query;
    
    let query = 'SELECT * FROM roles WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (module) {
      paramCount++;
      query += ` AND module = $${paramCount}`;
      params.push(module);
    }

    if (level) {
      paramCount++;
      query += ` AND level = $${paramCount}`;
      params.push(parseInt(level as string));
    }

    if (is_active !== undefined) {
      paramCount++;
      query += ` AND is_active = $${paramCount}`;
      params.push(is_active === 'true');
    }

    query += ' ORDER BY module, level, name';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get role by ID
router.get('/roles/:id', requirePermission('system.roles.view'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    // Get permissions for this role
    const permissionsResult = await pool.query(
      `SELECT p.*, rp.granted, rp.conditions
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [id]
    );

    res.json({
      ...roleResult.rows[0],
      permissions: permissionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create role
router.post('/roles', requirePermission('system.roles.create'), async (req, res) => {
  try {
    const { name, code, description, module, level, parent_role_id, is_system_role, priority } = req.body;
    
    if (!name || !code || !module) {
      return res.status(400).json({ error: 'Name, code, and module are required' });
    }

    const result = await pool.query(
      `INSERT INTO roles (name, code, description, module, level, parent_role_id, is_system_role, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, code, description, module, level || 1, parent_role_id || null, is_system_role || false, priority || 0]
    );

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'role_created',
        'role',
        result.rows[0].id,
        null,
        result.rows[0],
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Role with this code already exists' });
    }
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update role
router.put('/roles/:id', requirePermission('system.roles.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, level, parent_role_id, is_active, priority } = req.body;

    // Get old value for audit
    const oldRoleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    
    if (oldRoleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const oldRole = oldRoleResult.rows[0];

    // Check if it's a system role
    if (oldRole.is_system_role && (name || level || parent_role_id)) {
      return res.status(403).json({ error: 'Cannot modify system role properties' });
    }

    const updateFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updateFields.push(`name = $${paramCount}`);
      params.push(name);
    }
    if (description !== undefined) {
      paramCount++;
      updateFields.push(`description = $${paramCount}`);
      params.push(description);
    }
    if (level !== undefined) {
      paramCount++;
      updateFields.push(`level = $${paramCount}`);
      params.push(level);
    }
    if (parent_role_id !== undefined) {
      paramCount++;
      updateFields.push(`parent_role_id = $${paramCount}`);
      params.push(parent_role_id);
    }
    if (is_active !== undefined) {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      params.push(is_active);
    }
    if (priority !== undefined) {
      paramCount++;
      updateFields.push(`priority = $${paramCount}`);
      params.push(priority);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id);
    paramCount++;
    
    const result = await pool.query(
      `UPDATE roles SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'role_updated',
        'role',
        parseInt(id),
        oldRole,
        result.rows[0],
        req.ip,
        req.get('user-agent')
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete role
router.delete('/roles/:id', requirePermission('system.roles.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const roleResult = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }

    if (roleResult.rows[0].is_system_role) {
      return res.status(403).json({ error: 'Cannot delete system role' });
    }

    await pool.query('DELETE FROM roles WHERE id = $1', [id]);

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'role_deleted',
        'role',
        parseInt(id),
        roleResult.rows[0],
        null,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// PERMISSIONS MANAGEMENT
// ============================================

// Get all permissions
router.get('/permissions', requirePermission('system.permissions.view'), async (req, res) => {
  try {
    const { module, feature, action } = req.query;
    
    let query = 'SELECT * FROM permissions WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (module) {
      paramCount++;
      query += ` AND module = $${paramCount}`;
      params.push(module);
    }

    if (feature) {
      paramCount++;
      query += ` AND feature = $${paramCount}`;
      params.push(feature);
    }

    if (action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      params.push(action);
    }

    query += ' ORDER BY module, feature, action';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create permission
router.post('/permissions', requirePermission('system.permissions.create'), async (req, res) => {
  try {
    const { name, code, description, module, feature, action, resource_type, field_restrictions, record_access_level, conditions } = req.body;
    
    if (!name || !code || !module || !action) {
      return res.status(400).json({ error: 'Name, code, module, and action are required' });
    }

    const result = await pool.query(
      `INSERT INTO permissions (name, code, description, module, feature, action, resource_type, field_restrictions, record_access_level, conditions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [name, code, description, module, feature || null, action, resource_type || null, JSON.stringify(field_restrictions || {}), record_access_level || 'own', JSON.stringify(conditions || {})]
    );

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'permission_created',
        'permission',
        result.rows[0].id,
        null,
        result.rows[0],
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Permission with this code already exists' });
    }
    console.error('Error creating permission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// ROLE-PERMISSION ASSIGNMENTS
// ============================================

// Assign permission to role
router.post('/roles/:roleId/permissions', requirePermission('system.roles.edit'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { permission_id, granted, conditions } = req.body;

    if (!permission_id) {
      return res.status(400).json({ error: 'permission_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO role_permissions (role_id, permission_id, granted, conditions)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (role_id, permission_id) 
       DO UPDATE SET granted = $3, conditions = $4
       RETURNING *`,
      [roleId, permission_id, granted !== false, JSON.stringify(conditions || {})]
    );

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'permission_assigned_to_role',
        'role_permission',
        result.rows[0].id,
        null,
        result.rows[0],
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning permission to role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove permission from role
router.delete('/roles/:roleId/permissions/:permissionId', requirePermission('system.roles.edit'), async (req, res) => {
  try {
    const { roleId, permissionId } = req.params;

    await pool.query(
      'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
      [roleId, permissionId]
    );

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'permission_removed_from_role',
        'role_permission',
        null,
        { role_id: roleId, permission_id: permissionId },
        null,
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ message: 'Permission removed from role' });
  } catch (error) {
    console.error('Error removing permission from role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// USER-ROLE ASSIGNMENTS
// ============================================

// Assign role to user
router.post('/users/:userId/roles', requirePermission('system.users.manage'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role_id, expires_at, notes } = req.body;

    if (!role_id) {
      return res.status(400).json({ error: 'role_id is required' });
    }

    const result = await pool.query(
      `INSERT INTO user_roles (user_id, role_id, assigned_by, expires_at, notes)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, role_id) 
       DO UPDATE SET is_active = true, expires_at = $4, notes = $5, assigned_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [userId, role_id, req.user?.userId || null, expires_at || null, notes || null]
    );

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'role_assigned_to_user',
        'user_role',
        result.rows[0].id,
        null,
        result.rows[0],
        req.ip,
        req.get('user-agent')
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning role to user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove role from user
router.delete('/users/:userId/roles/:roleId', requirePermission('system.users.manage'), async (req, res) => {
  try {
    const { userId, roleId } = req.params;

    // Soft delete (set is_active = false)
    const result = await pool.query(
      `UPDATE user_roles 
       SET is_active = false 
       WHERE user_id = $1 AND role_id = $2
       RETURNING *`,
      [userId, roleId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User role assignment not found' });
    }

    // Log the change
    if (req.user) {
      await logPermissionChange(
        req.user.userId,
        'role_removed_from_user',
        'user_role',
        result.rows[0].id,
        result.rows[0],
        { ...result.rows[0], is_active: false },
        req.ip,
        req.get('user-agent')
      );
    }

    res.json({ message: 'Role removed from user' });
  } catch (error) {
    console.error('Error removing role from user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's roles and permissions
router.get('/users/:userId/permissions', requirePermission('system.users.view'), async (req, res) => {
  try {
    const { userId } = req.params;

    // Get user roles
    const rolesResult = await pool.query(
      `SELECT r.*, ur.assigned_at, ur.expires_at
       FROM roles r
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 AND ur.is_active = true AND r.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       ORDER BY r.module, r.level`,
      [userId]
    );

    // Get user permissions
    const permissionsResult = await pool.query(
      `SELECT DISTINCT p.*
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       INNER JOIN roles r ON rp.role_id = r.id
       INNER JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1 
         AND ur.is_active = true
         AND r.is_active = true
         AND rp.granted = true
         AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
       UNION
       SELECT p.*
       FROM permissions p
       INNER JOIN user_permission_overrides upo ON p.id = upo.permission_id
       WHERE upo.user_id = $1
         AND upo.granted = true
         AND (upo.expires_at IS NULL OR upo.expires_at > NOW())`,
      [userId]
    );

    res.json({
      roles: rolesResult.rows,
      permissions: permissionsResult.rows
    });
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============================================
// AUDIT LOGS
// ============================================

// Get audit logs
router.get('/audit-logs', requirePermission('system.audit.view'), async (req, res) => {
  try {
    const { user_id, action, resource_type, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM rbac_audit_logs WHERE 1=1';
    const params: any[] = [];
    let paramCount = 0;

    if (user_id) {
      paramCount++;
      query += ` AND user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (action) {
      paramCount++;
      query += ` AND action = $${paramCount}`;
      params.push(action);
    }

    if (resource_type) {
      paramCount++;
      query += ` AND resource_type = $${paramCount}`;
      params.push(resource_type);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

