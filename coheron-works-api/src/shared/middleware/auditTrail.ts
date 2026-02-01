import { Request, Response, NextFunction } from 'express';
import { AuditTrail } from '../models/AuditTrail.js';
import mongoose from 'mongoose';
import crypto from 'node:crypto';

// Fields to skip when computing diffs
const SKIP_FIELDS = new Set(['updated_at', 'updatedAt', '__v', 'created_at', 'createdAt']);

/**
 * Map the first segment of the API path to a Mongoose model name.
 * Falls back to searching registered models by lowercase match.
 */
function resolveModel(entityType: string): mongoose.Model<any> | null {
  // Direct mapping for known route prefixes -> model names
  const routeModelMap: Record<string, string> = {
    partners: 'Partner',
    products: 'Product',
    leads: 'Lead',
    deals: 'Deal',
    pipelines: 'Pipeline',
    'sale-orders': 'SaleOrder',
    invoices: 'Invoice',
    employees: 'Employee',
    attendance: 'Attendance',
    leave: 'Leave',
    payroll: 'Payroll',
    appraisals: 'Appraisal',
    goals: 'Goal',
    courses: 'Course',
    applicants: 'Applicant',
    policies: 'Policy',
    campaigns: 'Campaign',
    projects: 'Project',
    'support-tickets': 'SupportTicket',
    workflows: 'Workflow',
    quotations: 'Quotation',
    'purchase-orders': 'PurchaseOrder',
    payments: 'Payment',
    users: 'User',
    roles: 'Role',
  };

  const mapped = routeModelMap[entityType];
  if (mapped) {
    try {
      return mongoose.model(mapped);
    } catch {
      return null;
    }
  }

  // Fallback: try to find a model whose name matches (case-insensitive)
  const modelNames = mongoose.modelNames();
  const lower = entityType.replace(/-/g, '').toLowerCase();
  for (const name of modelNames) {
    if (name.toLowerCase() === lower) {
      try {
        return mongoose.model(name);
      } catch {
        return null;
      }
    }
  }

  return null;
}

/**
 * Extract the entity id from the request path.
 * Looks for a segment that is a valid 24-char hex ObjectId after the entity type segment.
 */
function extractEntityId(pathParts: string[]): string | null {
  for (const part of pathParts.slice(1)) {
    if (/^[0-9a-fA-F]{24}$/.test(part)) {
      return part;
    }
  }
  return null;
}

/**
 * Compute field-level diff between two plain objects.
 * Returns an array of { field, old_value, new_value } for changed fields.
 */
function diffObjects(
  before: Record<string, any>,
  after: Record<string, any>,
): Array<{ field: string; old_value: any; new_value: any }> {
  const changes: Array<{ field: string; old_value: any; new_value: any }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of allKeys) {
    if (SKIP_FIELDS.has(key) || key.startsWith('_')) continue;

    const oldVal = before[key];
    const newVal = after[key];

    // Use JSON serialization for deep comparison
    const oldStr = JSON.stringify(oldVal ?? null);
    const newStr = JSON.stringify(newVal ?? null);

    if (oldStr !== newStr) {
      changes.push({
        field: key,
        old_value: oldVal ?? null,
        new_value: newVal ?? null,
      });
    }
  }

  return changes;
}

export function auditTrailMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only audit mutating methods
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      return next();
    }

    const requestId = crypto.randomUUID();
    (req as any).requestId = requestId;

    // --- Capture before-state for PUT/PATCH ---
    const pathParts = req.path.split('/').filter(Boolean);
    const entityType = pathParts[0] || 'unknown';

    if (['PUT', 'PATCH'].includes(req.method)) {
      const entityId = extractEntityId(pathParts);
      if (entityId) {
        try {
          const Model = resolveModel(entityType);
          if (Model) {
            const doc = await Model.findById(entityId).lean();
            if (doc) {
              (req as any)._auditBeforeState = doc as Record<string, any>;
              (req as any)._auditEntityId = entityId;
              (req as any)._auditModel = Model;
            }
          }
        } catch {
          // Don't block the request if snapshot fails
        }
      }
    }

    // --- Intercept response to log audit ---
    const originalJson = res.json.bind(res);
    let responseBody: any = undefined;

    res.json = function (body: any) {
      responseBody = body;
      return originalJson(body);
    } as any;

    res.on('finish', async () => {
      try {
        const user = (req as any).user;
        if (!user) return;

        const actionMap: Record<string, string> = {
          POST: 'create',
          PUT: 'update',
          PATCH: 'update',
          DELETE: 'delete',
        };

        const entityId =
          (req as any)._auditEntityId ||
          extractEntityId(pathParts) ||
          responseBody?._id ||
          responseBody?.id;

        // Compute changes for update operations
        let changes: Array<{ field: string; old_value: any; new_value: any }> = [];

        if (['PUT', 'PATCH'].includes(req.method) && (req as any)._auditBeforeState && entityId) {
          try {
            const Model: mongoose.Model<any> | null = (req as any)._auditModel || null;
            if (Model && res.statusCode >= 200 && res.statusCode < 300) {
              const afterDoc = await Model.findById(entityId).lean();
              if (afterDoc) {
                changes = diffObjects(
                  (req as any)._auditBeforeState,
                  afterDoc as Record<string, any>,
                );
              }
            }
          } catch {
            // Silent — don't break for diff failures
          }
        }

        await AuditTrail.create({
          tenant_id: user.tenant_id,
          user_id: user._id || user.id,
          action: actionMap[req.method] || req.method.toLowerCase(),
          entity_type: entityType,
          entity_id: entityId?.toString(),
          changes: changes.length > 0 ? changes : undefined,
          metadata: { status_code: res.statusCode, path: req.originalUrl },
          ip_address: req.ip || req.socket.remoteAddress,
          user_agent: req.get('User-Agent'),
          request_id: requestId,
        }).catch(() => {}); // Silent fail — don't break app for audit
      } catch {
        // Silent fail
      }
    });

    next();
  };
}
