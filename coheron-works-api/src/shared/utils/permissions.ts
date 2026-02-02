import UserRole from '../models/UserRole.js';
import RolePermission from '../models/RolePermission.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import UserPermissionOverride from '../models/UserPermissionOverride.js';
import RbacAuditLog from '../models/RbacAuditLog.js';

// In-memory permission cache with 5-min TTL
const permissionCache = new Map<string, { permissions: string[]; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = permissionCache.get(userId);
  if (cached && cached.expiry > Date.now()) {
    return cached.permissions;
  }

  const now = new Date();

  const userRoles = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }]
  }).lean();

  const activeRoleIds = userRoles.map(ur => ur.role_id);
  const activeRoles = await Role.find({ _id: { $in: activeRoleIds }, is_active: true }).lean();
  const activeRoleIdStrings = activeRoles.map(r => r._id);

  const rolePerms = await RolePermission.find({
    role_id: { $in: activeRoleIdStrings },
    granted: true
  }).lean();
  const permIds = rolePerms.map(rp => rp.permission_id);

  const overrides = await UserPermissionOverride.find({
    user_id: userId,
    granted: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }]
  }).lean();
  const overridePermIds = overrides.map(o => o.permission_id);

  const allPermIds = [...permIds, ...overridePermIds];
  const permissions = await Permission.find({ _id: { $in: allPermIds } }).lean();

  const result = [...new Set(permissions.map(p => p.code))];

  permissionCache.set(userId, { permissions: result, expiry: Date.now() + CACHE_TTL_MS });

  return result;
}

export async function getUserRoles(userId: string): Promise<string[]> {
  const now = new Date();

  const userRoles = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }]
  }).lean();

  const roleIds = userRoles.map(ur => ur.role_id);
  const roles = await Role.find({ _id: { $in: roleIds }, is_active: true }).lean();

  return roles.map(r => r.code);
}

export async function hasPermission(userId: string, permissionCode: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode);
}

export async function hasAnyPermission(userId: string, permissionCodes: string[]): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionCodes.some(code => permissions.includes(code));
}

export async function hasAllPermissions(userId: string, permissionCodes: string[]): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionCodes.every(code => permissions.includes(code));
}

export async function hasRole(userId: string, roleCode: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(roleCode);
}

export async function canAccessResource(
  userId: string,
  _resourceType: string,
  _resourceId: string,
  accessLevel: 'own' | 'team' | 'department' | 'all'
): Promise<boolean> {
  if (accessLevel === 'all') return true;
  return true;
}

export async function logPermissionChange(
  userId: string,
  action: string,
  resourceType: string,
  resourceId: string | null,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await RbacAuditLog.create({
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    old_value: oldValue,
    new_value: newValue,
    ip_address: ipAddress,
    user_agent: userAgent,
  });
}

export async function getUserRecordAccessLevel(
  userId: string,
  resourceType: string
): Promise<'own' | 'team' | 'department' | 'all'> {
  const now = new Date();

  // Get user's active roles
  const userRoles = await UserRole.find({
    user_id: userId,
    is_active: true,
    $or: [{ expires_at: null }, { expires_at: { $gt: now } }],
  }).lean();

  const activeRoleIds = userRoles.map(ur => ur.role_id);
  const activeRoles = await Role.find({ _id: { $in: activeRoleIds }, is_active: true }).lean();
  const activeRoleIdStrings = activeRoles.map(r => r._id);

  // Find role permissions that match the resource type
  const rolePerms = await RolePermission.find({
    role_id: { $in: activeRoleIdStrings },
    granted: true,
    resource_type: resourceType,
  }).lean();

  if (rolePerms.length === 0) {
    // If no RBAC roles are configured for this user, grant full access
    // (RBAC restrictions only apply when explicitly configured)
    if (activeRoleIds.length === 0) return 'all';
    return 'own';
  }

  // Return the highest access level across all roles
  const levelPriority: Record<string, number> = { own: 0, team: 1, department: 2, all: 3 };
  let highest: 'own' | 'team' | 'department' | 'all' = 'own';

  for (const rp of rolePerms) {
    const level = (rp as any).access_level || 'own';
    if ((levelPriority[level] ?? 0) > (levelPriority[highest] ?? 0)) {
      highest = level;
    }
  }

  return highest;
}

export async function checkSodViolations(userId: string): Promise<any[]> {
  return [];
}
