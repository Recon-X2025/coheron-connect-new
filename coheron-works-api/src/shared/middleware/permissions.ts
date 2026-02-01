import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserPermissions, getUserRoles, getUserRecordAccessLevel } from '../utils/permissions.js';
import { getJwtSecret } from '../utils/auth-config.js';
import { TokenBlacklist } from '../models/TokenBlacklist.js';
import AccessAttempt from '../models/AccessAttempt.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        uid: number;
        email: string;
        tenant_id?: string;
        roles?: string[];
        permissions?: string[];
      };
      recordFilter?: Record<string, any>;
    }
  }
}

export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const decoded = jwt.verify(token, getJwtSecret()) as any;

      // Check if token has been revoked
      if (decoded.jti) {
        const blacklisted = await TokenBlacklist.exists({ jti: decoded.jti });
        if (blacklisted) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }
      }

      // Check if token was issued before password change
      if (decoded.iat && decoded.userId) {
        const user = await User.findById(decoded.userId).select('password_changed_at').lean();
        if (user?.password_changed_at) {
          const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
          if (decoded.iat < changedAt) {
            return res.status(401).json({ error: 'Token issued before password change' });
          }
        }
      }

      const userPermissions = await getUserPermissions(decoded.userId);

      if (!userPermissions.includes(permissionCode)) {
        await AccessAttempt.create({
          user_id: decoded.userId,
          resource_type: req.route?.path || 'unknown',
          action: req.method,
          permission_required: permissionCode,
          granted: false,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });
        return res.status(403).json({ error: 'Insufficient permissions', required: permissionCode });
      }

      req.user = { userId: decoded.userId, uid: decoded.uid, email: decoded.email, tenant_id: decoded.tenant_id, permissions: userPermissions };
      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
      logger.error({ err: error }, 'Permission check error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function requireAnyPermission(permissionCodes: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const decoded = jwt.verify(token, getJwtSecret()) as any;

      // Check if token has been revoked
      if (decoded.jti) {
        const blacklisted = await TokenBlacklist.exists({ jti: decoded.jti });
        if (blacklisted) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }
      }

      // Check if token was issued before password change
      if (decoded.iat && decoded.userId) {
        const user = await User.findById(decoded.userId).select('password_changed_at').lean();
        if (user?.password_changed_at) {
          const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
          if (decoded.iat < changedAt) {
            return res.status(401).json({ error: 'Token issued before password change' });
          }
        }
      }

      const userPermissions = await getUserPermissions(decoded.userId);
      const hasPermission = permissionCodes.some(code => userPermissions.includes(code));

      if (!hasPermission) {
        await AccessAttempt.create({
          user_id: decoded.userId,
          resource_type: req.route?.path || 'unknown',
          action: req.method,
          permission_required: permissionCodes.join(' OR '),
          granted: false,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });
        return res.status(403).json({ error: 'Insufficient permissions', required: permissionCodes });
      }

      req.user = { userId: decoded.userId, uid: decoded.uid, email: decoded.email, tenant_id: decoded.tenant_id, permissions: userPermissions };
      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
      logger.error({ err: error }, 'Permission check error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function requireRole(roleCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const decoded = jwt.verify(token, getJwtSecret()) as any;

      // Check if token has been revoked
      if (decoded.jti) {
        const blacklisted = await TokenBlacklist.exists({ jti: decoded.jti });
        if (blacklisted) {
          return res.status(401).json({ error: 'Token has been revoked' });
        }
      }

      // Check if token was issued before password change
      if (decoded.iat && decoded.userId) {
        const user = await User.findById(decoded.userId).select('password_changed_at').lean();
        if (user?.password_changed_at) {
          const changedAt = Math.floor(new Date(user.password_changed_at).getTime() / 1000);
          if (decoded.iat < changedAt) {
            return res.status(401).json({ error: 'Token issued before password change' });
          }
        }
      }

      const userRoles = await getUserRoles(decoded.userId);

      if (!userRoles.includes(roleCode)) {
        return res.status(403).json({ error: 'Insufficient role', required: roleCode, userRoles });
      }

      req.user = { userId: decoded.userId, uid: decoded.uid, email: decoded.email, tenant_id: decoded.tenant_id, roles: userRoles };
      next();
    } catch (error: any) {
      if (error.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
      logger.error({ err: error }, 'Role check error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export function checkRecordAccess(resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });

      const accessLevel = await getUserRecordAccessLevel(req.user.userId, resourceType);

      if (accessLevel === 'all') {
        req.recordFilter = {};
        return next();
      }

      if (accessLevel === 'own') {
        req.recordFilter = { created_by: req.user.userId };
        return next();
      }

      if (accessLevel === 'team') {
        // Find all users in the same team
        const currentUser = await User.findById(req.user.userId).select('team_id').lean();
        if (!currentUser?.team_id) {
          req.recordFilter = { created_by: req.user.userId };
          return next();
        }
        const teamMembers = await User.find({ team_id: currentUser.team_id, active: true }).select('_id').lean();
        const teamMemberIds = teamMembers.map(u => u._id);
        req.recordFilter = { created_by: { $in: teamMemberIds } };
        return next();
      }

      if (accessLevel === 'department') {
        // Find all users in the same department
        const currentUser = await User.findById(req.user.userId).select('department_id').lean();
        if (!currentUser?.department_id) {
          req.recordFilter = { created_by: req.user.userId };
          return next();
        }
        const deptMembers = await User.find({ department_id: currentUser.department_id, active: true }).select('_id').lean();
        const deptMemberIds = deptMembers.map(u => u._id);
        req.recordFilter = { created_by: { $in: deptMemberIds } };
        return next();
      }

      // Default to own
      req.recordFilter = { created_by: req.user.userId };
      next();
    } catch (error) {
      logger.error({ err: error }, 'Record access check error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
