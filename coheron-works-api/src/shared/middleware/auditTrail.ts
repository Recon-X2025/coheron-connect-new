import { Request, Response, NextFunction } from 'express';
import { AuditTrail } from '../models/AuditTrail.js';
import crypto from 'node:crypto';

export function auditTrailMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only audit mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const requestId = crypto.randomUUID();
    (req as any).requestId = requestId;

    // Capture original json method to intercept response
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      // Log audit asynchronously (don't block response)
      const user = (req as any).user;
      if (user) {
        const pathParts = req.path.split('/').filter(Boolean);
        const entityType = pathParts[0] || 'unknown';
        const entityId = pathParts[1] || body?._id || body?.id;

        const actionMap: Record<string, string> = {
          POST: 'create',
          PUT: 'update',
          PATCH: 'update',
          DELETE: 'delete',
        };

        AuditTrail.create({
          tenant_id: user.tenant_id,
          user_id: user._id || user.id,
          action: actionMap[req.method] || req.method.toLowerCase(),
          entity_type: entityType,
          entity_id: entityId?.toString(),
          metadata: { status_code: res.statusCode, path: req.originalUrl },
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.get('User-Agent'),
          request_id: requestId,
        }).catch(() => {}); // Silent fail — don't break app for audit
      }

      return originalJson(body);
    } as any;

    next();
  };
}
