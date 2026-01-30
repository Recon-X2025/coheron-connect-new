import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';
import { requirePermission } from '../middleware/permissions.js';
import { logPermissionChange } from '../utils/permissions.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import RolePermission from '../models/RolePermission.js';
import UserRole from '../models/UserRole.js';
import UserPermissionOverride from '../models/UserPermissionOverride.js';
import RbacAuditLog from '../models/RbacAuditLog.js';

const router = express.Router();

// ============================================
// ROLES MANAGEMENT
// ============================================

// Get all roles
router.get('/roles', requirePermission('system.roles.view'), asyncHandler(async (req, res) => {
  const { module, level, is_active } = req.query;
  const filter: any = {};

  if (module) filter.module = module;
  if (level) filter.level = parseInt(level as string);
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const params = getPaginationParams(req);
  const result = await paginateQuery(Role.find(filter).sort({ module: 1, level: 1, name: 1 }).lean(), params, filter, Role);
  res.json(result);
}));

// Get role by ID
router.get('/roles/:id', requirePermission('system.roles.view'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await Role.findById(id).lean();
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  // Get permissions for this role
  const rolePermissions = await RolePermission.find({ role_id: id }).populate('permission_id').lean();
  const permissions = rolePermissions.map((rp: any) => ({
    ...rp.permission_id,
    granted: rp.granted,
    conditions: rp.conditions,
  }));

  res.json({
    ...role,
    permissions,
  });
}));

// Create role
router.post('/roles', requirePermission('system.roles.create'), asyncHandler(async (req, res) => {
  const { name, code, description, module, level, parent_role_id, is_system_role, priority } = req.body;

  if (!name || !code || !module) {
    return res.status(400).json({ error: 'Name, code, and module are required' });
  }

  const role = await Role.create({
    name,
    code,
    description,
    module,
    level: level || 1,
    parent_role_id: parent_role_id || null,
    is_system_role: is_system_role || false,
    priority: priority || 0,
  });

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'role_created',
      'role',
      role._id.toString(),
      null,
      role.toObject(),
      req.ip,
      req.get('user-agent')
    );
  }

  res.status(201).json(role);
}));

// Update role
router.put('/roles/:id', requirePermission('system.roles.edit'), asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, level, parent_role_id, is_active, priority } = req.body;

  const oldRole = await Role.findById(id).lean();
  if (!oldRole) {
    return res.status(404).json({ error: 'Role not found' });
  }

  // Check if it's a system role
  if (oldRole.is_system_role && (name || level || parent_role_id)) {
    return res.status(403).json({ error: 'Cannot modify system role properties' });
  }

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (level !== undefined) updateData.level = level;
  if (parent_role_id !== undefined) updateData.parent_role_id = parent_role_id;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (priority !== undefined) updateData.priority = priority;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const role = await Role.findByIdAndUpdate(id, updateData, { new: true }).lean();

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'role_updated',
      'role',
      id,
      oldRole,
      role!,
      req.ip,
      req.get('user-agent')
    );
  }

  res.json(role);
}));

// Delete role
router.delete('/roles/:id', requirePermission('system.roles.delete'), asyncHandler(async (req, res) => {
  const { id } = req.params;

  const role = await Role.findById(id).lean();
  if (!role) {
    return res.status(404).json({ error: 'Role not found' });
  }

  if (role.is_system_role) {
    return res.status(403).json({ error: 'Cannot delete system role' });
  }

  await Role.findByIdAndDelete(id);

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'role_deleted',
      'role',
      id,
      role,
      null,
      req.ip,
      req.get('user-agent')
    );
  }

  res.json({ message: 'Role deleted successfully' });
}));

// ============================================
// PERMISSIONS MANAGEMENT
// ============================================

// Get all permissions
router.get('/permissions', requirePermission('system.permissions.view'), asyncHandler(async (req, res) => {
  const { module, feature, action } = req.query;
  const filter: any = {};

  if (module) filter.module = module;
  if (feature) filter.feature = feature;
  if (action) filter.action = action;

  const params = getPaginationParams(req);
  const result = await paginateQuery(Permission.find(filter).sort({ module: 1, feature: 1, action: 1 }).lean(), params, filter, Permission);
  res.json(result);
}));

// Create permission
router.post('/permissions', requirePermission('system.permissions.create'), asyncHandler(async (req, res) => {
  const { name, code, description, module, feature, action, resource_type, field_restrictions, record_access_level, conditions } = req.body;

  if (!name || !code || !module || !action) {
    return res.status(400).json({ error: 'Name, code, module, and action are required' });
  }

  const permission = await Permission.create({
    name,
    code,
    description,
    module,
    feature: feature || null,
    action,
    resource_type: resource_type || null,
    field_restrictions: field_restrictions || {},
    record_access_level: record_access_level || 'own',
    conditions: conditions || {},
  });

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'permission_created',
      'permission',
      permission._id.toString(),
      null,
      permission.toObject(),
      req.ip,
      req.get('user-agent')
    );
  }

  res.status(201).json(permission);
}));

// ============================================
// ROLE-PERMISSION ASSIGNMENTS
// ============================================

// Assign permission to role
router.post('/roles/:roleId/permissions', requirePermission('system.roles.edit'), asyncHandler(async (req, res) => {
  const { roleId } = req.params;
  const { permission_id, granted, conditions } = req.body;

  if (!permission_id) {
    return res.status(400).json({ error: 'permission_id is required' });
  }

  const rp = await RolePermission.findOneAndUpdate(
    { role_id: roleId, permission_id },
    { role_id: roleId, permission_id, granted: granted !== false, conditions: conditions || {} },
    { upsert: true, new: true }
  );

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'permission_assigned_to_role',
      'role_permission',
      rp._id.toString(),
      null,
      rp.toObject(),
      req.ip,
      req.get('user-agent')
    );
  }

  res.status(201).json(rp);
}));

// Remove permission from role
router.delete('/roles/:roleId/permissions/:permissionId', requirePermission('system.roles.edit'), asyncHandler(async (req, res) => {
  const { roleId, permissionId } = req.params;

  await RolePermission.deleteOne({ role_id: roleId, permission_id: permissionId });

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
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
}));

// ============================================
// USER-ROLE ASSIGNMENTS
// ============================================

// Assign role to user
router.post('/users/:userId/roles', requirePermission('system.users.manage'), asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role_id, expires_at, notes } = req.body;

  if (!role_id) {
    return res.status(400).json({ error: 'role_id is required' });
  }

  const ur = await UserRole.findOneAndUpdate(
    { user_id: userId, role_id },
    {
      user_id: userId,
      role_id,
      is_active: true,
      assigned_by: req.user?.userId || null,
      assigned_at: new Date(),
      expires_at: expires_at || null,
      notes: notes || null,
    },
    { upsert: true, new: true }
  );

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'role_assigned_to_user',
      'user_role',
      ur._id.toString(),
      null,
      ur.toObject(),
      req.ip,
      req.get('user-agent')
    );
  }

  res.status(201).json(ur);
}));

// Remove role from user
router.delete('/users/:userId/roles/:roleId', requirePermission('system.users.manage'), asyncHandler(async (req, res) => {
  const { userId, roleId } = req.params;

  const ur = await UserRole.findOneAndUpdate(
    { user_id: userId, role_id: roleId },
    { is_active: false },
    { new: true }
  );

  if (!ur) {
    return res.status(404).json({ error: 'User role assignment not found' });
  }

  // Log the change
  if (req.user) {
    await logPermissionChange(
      req.user.userId.toString(),
      'role_removed_from_user',
      'user_role',
      ur._id.toString(),
      ur.toObject(),
      { ...ur.toObject(), is_active: false },
      req.ip,
      req.get('user-agent')
    );
  }

  res.json({ message: 'Role removed from user' });
}));

// Get user's roles and permissions
router.get('/users/:userId/permissions', requirePermission('system.users.view'), asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Get user roles
  const userRoles = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).populate('role_id').lean();

  const activeRoles = userRoles.filter((ur: any) => ur.role_id && ur.role_id.is_active);
  const roles = activeRoles.map((ur: any) => ({
    ...ur.role_id,
    assigned_at: ur.assigned_at || ur.created_at,
    expires_at: ur.expires_at,
  }));

  // Get role IDs
  const roleIds = activeRoles.map((ur: any) => ur.role_id._id);

  // Get permissions from roles
  const rolePerms = await RolePermission.find({
    role_id: { $in: roleIds },
    granted: true,
  }).populate('permission_id').lean();

  // Get user permission overrides
  const overrides = await UserPermissionOverride.find({
    user_id: userId,
    granted: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: new Date() } }],
  }).populate('permission_id').lean();

  // Combine and deduplicate permissions
  const permMap = new Map();
  for (const rp of rolePerms) {
    if (rp.permission_id) {
      permMap.set((rp.permission_id as any)._id.toString(), (rp.permission_id as any));
    }
  }
  for (const upo of overrides) {
    if (upo.permission_id) {
      permMap.set((upo.permission_id as any)._id.toString(), (upo.permission_id as any));
    }
  }

  res.json({
    roles,
    permissions: Array.from(permMap.values()),
  });
}));

// ============================================
// AUDIT LOGS
// ============================================

// Get audit logs
router.get('/audit-logs', requirePermission('system.audit.view'), asyncHandler(async (req, res) => {
  const { user_id, action, resource_type } = req.query;
  const filter: any = {};

  if (user_id) filter.user_id = user_id;
  if (action) filter.action = action;
  if (resource_type) filter.resource_type = resource_type;

  const params = getPaginationParams(req);
  const result = await paginateQuery(RbacAuditLog.find(filter).sort({ created_at: -1 }).lean(), params, filter, RbacAuditLog);
  res.json(result);
}));

export default router;
