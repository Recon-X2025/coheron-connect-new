import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserPermissions, getUserRoles } from '../utils/permissions.js';
import AccessAttempt from '../models/AccessAttempt.js';
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
    }
  }
}

export function requirePermission(permissionCode: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ error: 'No token provided' });

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as any;

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

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as any;

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

      const jwtSecret = process.env.JWT_SECRET || 'secret';
      const decoded = jwt.verify(token, jwtSecret) as any;

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

export function checkRecordAccess(
  resourceType: string,
  resourceId: string,
  accessLevel: 'own' | 'team' | 'department' | 'all'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'User not authenticated' });
      if (accessLevel === 'all') return next();
      // Simplified: allow all for now
      next();
    } catch (error) {
      logger.error({ err: error }, 'Record access check error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
