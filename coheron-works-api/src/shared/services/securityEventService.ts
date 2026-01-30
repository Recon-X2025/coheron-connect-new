import { SecurityEvent } from '../models/SecurityEvent.js';

interface LogEventParams {
  tenant_id: string;
  user_id?: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  ip_address?: string;
  user_agent?: string;
  details?: Record<string, any>;
}

class SecurityEventService {
  async log(params: LogEventParams): Promise<void> {
    try {
      await SecurityEvent.create(params);
    } catch {
      // Silent fail — security logging should never break the app
      console.error('[SecurityEvent] Failed to log event:', params.event_type);
    }
  }

  async logLogin(success: boolean, params: { tenant_id: string; user_id?: string; ip_address?: string; user_agent?: string; details?: any }) {
    await this.log({
      ...params,
      event_type: success ? 'login_success' : 'login_failure',
      severity: success ? 'info' : 'warning',
      description: success ? 'User logged in successfully' : 'Failed login attempt',
    });
  }

  async logPasswordChange(params: { tenant_id: string; user_id: string; ip_address?: string }) {
    await this.log({
      ...params,
      event_type: 'password_change',
      severity: 'info',
      description: 'User changed their password',
    });
  }

  async logAccountLocked(params: { tenant_id: string; user_id: string; ip_address?: string; details?: any }) {
    await this.log({
      ...params,
      event_type: 'account_locked',
      severity: 'critical',
      description: 'Account locked due to excessive failed login attempts',
    });
  }

  async logDataExport(params: { tenant_id: string; user_id: string; details: any }) {
    await this.log({
      ...params,
      event_type: 'data_export',
      severity: 'warning',
      description: 'User exported data',
    });
  }

  async logPermissionChange(params: { tenant_id: string; user_id: string; details: any }) {
    await this.log({
      ...params,
      event_type: 'permission_escalation',
      severity: 'warning',
      description: 'User permissions were modified',
    });
  }

  async getRecentEvents(tenant_id: string, limit = 50) {
    return SecurityEvent.find({ tenant_id }).sort({ timestamp: -1 }).limit(limit).lean();
  }

  async getEventsByType(tenant_id: string, event_type: string, since: Date) {
    return SecurityEvent.find({ tenant_id, event_type, timestamp: { $gte: since } }).sort({ timestamp: -1 }).lean();
  }

  async getCriticalEvents(tenant_id: string, since: Date) {
    return SecurityEvent.find({ tenant_id, severity: 'critical', timestamp: { $gte: since } }).sort({ timestamp: -1 }).lean();
  }
}

export const securityEventService = new SecurityEventService();
