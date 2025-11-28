import { Request, Response, NextFunction } from 'express';
import pool from '../database/connection.js';
import jwt from 'jsonwebtoken';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        uid: number;
        email: string;
        roles?: string[];
        permissions?: string[];
      };
    }
  }
}

/**
 * Middleware to check if user has a specific permission
 * Usage: requirePermission('crm.leads.create')
 */
export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Get user permissions from database
      const permissionsResult = await pool.query(
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
        [decoded.userId]
      );

      const userPermissions = permissionsResult.rows.map((row: any) => row.code);
      
      // Check if user has the required permission
      if (!userPermissions.includes(permissionCode)) {
        // Log access attempt
        await pool.query(
          `INSERT INTO access_attempts (user_id, resource_type, resource_id, action, permission_required, granted, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            decoded.userId,
            req.route?.path || 'unknown',
            null,
            req.method,
            permissionCode,
            false,
            req.ip,
            req.get('user-agent')
          ]
        );

        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionCode
        });
      }

      // Log successful access
      await pool.query(
        `INSERT INTO access_attempts (user_id, resource_type, resource_id, action, permission_required, granted, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          decoded.userId,
          req.route?.path || 'unknown',
          null,
          req.method,
          permissionCode,
          true,
          req.ip,
          req.get('user-agent')
        ]
      );

      // Attach user info to request
      req.user = {
        userId: decoded.userId,
        uid: decoded.uid,
        email: decoded.email,
        permissions: userPermissions
      };

      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to check if user has any of the specified permissions
 * Usage: requireAnyPermission(['crm.leads.view', 'crm.leads.create'])
 */
export function requireAnyPermission(permissionCodes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      const permissionsResult = await pool.query(
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
        [decoded.userId]
      );

      const userPermissions = permissionsResult.rows.map((row: any) => row.code);
      
      // Check if user has any of the required permissions
      const hasPermission = permissionCodes.some(code => userPermissions.includes(code));
      
      if (!hasPermission) {
        await pool.query(
          `INSERT INTO access_attempts (user_id, resource_type, resource_id, action, permission_required, granted, ip_address, user_agent)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            decoded.userId,
            req.route?.path || 'unknown',
            null,
            req.method,
            permissionCodes.join(' OR '),
            false,
            req.ip,
            req.get('user-agent')
          ]
        );

        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissionCodes
        });
      }

      req.user = {
        userId: decoded.userId,
        uid: decoded.uid,
        email: decoded.email,
        permissions: userPermissions
      };

      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Permission check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to check if user has a specific role
 * Usage: requireRole('crm_manager')
 */
export function requireRole(roleCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      const rolesResult = await pool.query(
        `SELECT r.code
         FROM roles r
         INNER JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1 
           AND ur.is_active = true
           AND r.is_active = true
           AND (ur.expires_at IS NULL OR ur.expires_at > NOW())`,
        [decoded.userId]
      );

      const userRoles = rolesResult.rows.map((row: any) => row.code);
      
      if (!userRoles.includes(roleCode)) {
        return res.status(403).json({ 
          error: 'Insufficient role',
          required: roleCode,
          userRoles
        });
      }

      req.user = {
        userId: decoded.userId,
        uid: decoded.uid,
        email: decoded.email,
        roles: userRoles
      };

      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
      }
      console.error('Role check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Middleware to check record-level access (own, team, department, all)
 */
export function checkRecordAccess(
  resourceType: string,
  resourceId: number,
  accessLevel: 'own' | 'team' | 'department' | 'all'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const userId = req.user.userId;

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

      let hasAccess = false;

      switch (accessLevel) {
        case 'own':
          // Check if user owns the resource
          const ownResult = await pool.query(
            `SELECT user_id FROM ${resourceType} WHERE id = $1 AND user_id = $2`,
            [resourceId, userId]
          );
          hasAccess = ownResult.rows.length > 0;
          break;

        case 'team':
          // Check if resource belongs to user's team
          const teamResult = await pool.query(
            `SELECT team_id FROM ${resourceType} WHERE id = $1 AND team_id = ANY($2::int[])`,
            [resourceId, teams]
          );
          hasAccess = teamResult.rows.length > 0;
          break;

        case 'department':
          // Check if resource belongs to user's department
          const deptResult = await pool.query(
            `SELECT department_id FROM ${resourceType} WHERE id = $1 AND department_id = ANY($2::int[])`,
            [resourceId, departments]
          );
          hasAccess = deptResult.rows.length > 0;
          break;

        case 'all':
          hasAccess = true;
          break;
      }

      if (!hasAccess) {
        return res.status(403).json({ 
          error: 'Access denied',
          resourceType,
          resourceId,
          requiredAccessLevel: accessLevel
        });
      }

      next();
    } catch (error) {
      console.error('Record access check error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

