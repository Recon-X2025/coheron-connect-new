import User from '../models/User.js';
import { AuditTrail } from '../models/AuditTrail.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { Consent } from '../models/Consent.js';
import { securityEventService } from './securityEventService.js';
import crypto from 'node:crypto';

type ErasureHandler = (userId: string, tenantId: string) => Promise<{ module: string; recordsAffected: number }>;

const erasureHandlers: ErasureHandler[] = [];

// Legal hold entities that cannot be erased
const LEGAL_HOLD_ENTITIES = ['Invoice', 'JournalEntry', 'Payroll', 'TaxReturn'];

export function registerErasureHandler(handler: ErasureHandler): void {
  erasureHandlers.push(handler);
}

function anonymize(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
}

export async function eraseUserData(userId: string, tenantId: string, requestedBy: string): Promise<{
  success: boolean;
  anonymized: boolean;
  modulesProcessed: string[];
  recordsAffected: number;
  legalHolds: string[];
}> {
  const result = {
    success: true,
    anonymized: true,
    modulesProcessed: [] as string[],
    recordsAffected: 0,
    legalHolds: [] as string[],
  };

  // Anonymize user record (don't delete — preserve structure)
  const user = await User.findOne({ _id: userId, tenant_id: tenantId });
  if (user) {
    const anonId = anonymize(user.email);
    user.name = `Anonymized User ${anonId}`;
    user.email = `anon_${anonId}@erased.local`;
    user.password_hash = '';
    user.active = false;
    user.avatar_url = '';
    user.password_history = [];
    await user.save();
    result.recordsAffected++;
  }

  // Delete consent records
  const consentResult = await Consent.deleteMany({ user_id: userId, tenant_id: tenantId });
  result.recordsAffected += consentResult.deletedCount || 0;

  // Run module-specific erasure handlers
  for (const handler of erasureHandlers) {
    try {
      const { module: moduleName, recordsAffected } = await handler(userId, tenantId);
      result.modulesProcessed.push(moduleName);
      result.recordsAffected += recordsAffected;
    } catch {
      result.success = false;
    }
  }

  // Check legal holds
  for (const entity of LEGAL_HOLD_ENTITIES) {
    const Model = (await import('mongoose')).default.models[entity];
    if (Model) {
      const count = await Model.countDocuments({ user_id: userId, tenant_id: tenantId });
      if (count > 0) {
        result.legalHolds.push(`${entity}: ${count} records retained (legal obligation)`);
      }
    }
  }

  // Log the erasure
  await securityEventService.log({
    tenant_id: tenantId,
    user_id: requestedBy,
    event_type: 'data_deletion',
    severity: 'warning',
    description: `User data erased for user ${userId}`,
    details: result,
  });

  // Log in audit trail
  await AuditTrail.create({
    tenant_id: tenantId,
    user_id: requestedBy,
    action: 'delete',
    entity_type: 'User',
    entity_id: userId,
    metadata: { type: 'gdpr_erasure', result },
  });

  return result;
}
