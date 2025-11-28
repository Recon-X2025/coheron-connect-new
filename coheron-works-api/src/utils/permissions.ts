import pool from '../database/connection.js';

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT DISTINCT p.code
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
     SELECT p.code
     FROM permissions p
     INNER JOIN user_permission_overrides upo ON p.id = upo.permission_id
     WHERE upo.user_id = $1
       AND upo.granted = true
       AND (upo.expires_at IS NULL OR upo.expires_at > NOW())`,
    [userId]
  );

  return result.rows.map((row: any) => row.code);
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: number): Promise<string[]> {
  const result = await pool.query(
    `SELECT r.code
     FROM roles r
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1 
       AND ur.is_active = true
       AND r.is_active = true
       AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
    [userId]
  );

  return result.rows.map((row: any) => row.code);
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(userId: number, permissionCode: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissions.includes(permissionCode);
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(userId: number, permissionCodes: string[]): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionCodes.some(code => permissions.includes(code));
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(userId: number, permissionCodes: string[]): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return permissionCodes.every(code => permissions.includes(code));
}

/**
 * Check if user has a specific role
 */
export async function hasRole(userId: number, roleCode: string): Promise<boolean> {
  const roles = await getUserRoles(userId);
  return roles.includes(roleCode);
}

/**
 * Check if user can perform action on resource based on record access level
 */
export async function canAccessResource(
  userId: number,
  resourceType: string,
  resourceId: number,
  accessLevel: 'own' | 'team' | 'department' | 'all'
): Promise<boolean> {
  // Get user's teams and departments
  const userContextResult = await pool.query(
    `SELECT 
       ut.team_id,
       ud.department_id
     FROM users u
     LEFT JOIN user_teams ut ON u.id = ut.user_id
     LEFT JOIN user_departments ud ON u.id = ud.user_id
     WHERE u.id = $1`,
    [userId]
  );

  const teams = userContextResult.rows.map((r: any) => r.team_id).filter(Boolean);
  const departments = userContextResult.rows.map((r: any) => r.department_id).filter(Boolean);

  switch (accessLevel) {
    case 'own':
      const ownResult = await pool.query(
        `SELECT user_id FROM ${resourceType} WHERE id = $1 AND user_id = $2`,
        [resourceId, userId]
      );
      return ownResult.rows.length > 0;

    case 'team':
      const teamResult = await pool.query(
        `SELECT team_id FROM ${resourceType} WHERE id = $1 AND team_id = ANY($2::int[])`,
        [resourceId, teams]
      );
      return teamResult.rows.length > 0;

    case 'department':
      const deptResult = await pool.query(
        `SELECT department_id FROM ${resourceType} WHERE id = $1 AND department_id = ANY($2::int[])`,
        [resourceId, departments]
      );
      return deptResult.rows.length > 0;

    case 'all':
      return true;

    default:
      return false;
  }
}

/**
 * Log permission change to audit log
 */
export async function logPermissionChange(
  userId: number,
  action: string,
  resourceType: string,
  resourceId: number | null,
  oldValue: any,
  newValue: any,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO rbac_audit_logs (user_id, action, resource_type, resource_id, old_value, new_value, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [userId, action, resourceType, resourceId, JSON.stringify(oldValue), JSON.stringify(newValue), ipAddress, userAgent]
  );
}

/**
 * Check for Segregation of Duties violations
 */
export async function checkSodViolations(userId: number): Promise<any[]> {
  const result = await pool.query(
    `SELECT 
       sod.id as rule_id,
       sod.name,
       sod.severity,
       sod.conflicting_role_ids,
       array_agg(r.code) as user_conflicting_roles
     FROM sod_rules sod
     CROSS JOIN LATERAL unnest(sod.conflicting_role_ids) as role_id
     INNER JOIN roles r ON r.id = role_id
     INNER JOIN user_roles ur ON r.id = ur.role_id
     WHERE ur.user_id = $1
       AND ur.is_active = true
       AND sod.is_active = true
     GROUP BY sod.id, sod.name, sod.severity, sod.conflicting_role_ids
     HAVING COUNT(DISTINCT r.id) > 1`,
    [userId]
  );

  return result.rows;
}

