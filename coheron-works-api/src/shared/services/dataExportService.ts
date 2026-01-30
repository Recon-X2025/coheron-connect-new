import User from '../models/User.js';
import { AuditTrail } from '../models/AuditTrail.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { Consent } from '../models/Consent.js';
import mongoose from 'mongoose';

type ExportHandler = (userId: string, tenantId: string) => Promise<{ module: string; data: any[] }>;

const exportHandlers: ExportHandler[] = [];

export function registerExportHandler(handler: ExportHandler): void {
  exportHandlers.push(handler);
}

export async function exportUserData(userId: string, tenantId: string): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  // Core user data
  const user = await User.findOne({ _id: userId, tenant_id: tenantId }).select('-password_hash -password_history -two_factor_secret').lean();
  result.user_profile = user;

  // Consent records
  result.consent_records = await Consent.find({ user_id: userId, tenant_id: tenantId }).lean();

  // Audit trail (user's own actions)
  result.audit_trail = await AuditTrail.find({ user_id: userId, tenant_id: tenantId }).sort({ timestamp: -1 }).limit(1000).lean();

  // Security events
  result.security_events = await SecurityEvent.find({ user_id: userId, tenant_id: tenantId }).sort({ timestamp: -1 }).limit(500).lean();

  // Module-specific data
  for (const handler of exportHandlers) {
    try {
      const { module: moduleName, data } = await handler(userId, tenantId);
      result[moduleName] = data;
    } catch (error) {
      result[`error_${exportHandlers.indexOf(handler)}`] = 'Failed to export module data';
    }
  }

  return result;
}

export function formatAsCSV(data: Record<string, any>): string {
  const lines: string[] = [];
  for (const [section, records] of Object.entries(data)) {
    lines.push(`\n=== ${section.toUpperCase()} ===`);
    if (Array.isArray(records) && records.length > 0) {
      const headers = Object.keys(records[0]);
      lines.push(headers.join(','));
      for (const record of records) {
        lines.push(headers.map(h => JSON.stringify(record[h] ?? '')).join(','));
      }
    } else if (records && typeof records === 'object') {
      for (const [key, value] of Object.entries(records)) {
        lines.push(`${key},${JSON.stringify(value ?? '')}`);
      }
    }
  }
  return lines.join('\n');
}
