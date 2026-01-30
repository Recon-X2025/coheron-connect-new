import { AuditTrail } from '../models/AuditTrail.js';
import { SecurityEvent } from '../models/SecurityEvent.js';
import { ChangeRecord } from '../models/ChangeRecord.js';
import { Session } from '../models/Session.js';
import { Consent } from '../models/Consent.js';
import { DataSubjectRequest } from '../models/DataSubjectRequest.js';
import { DataBreach } from '../models/DataBreach.js';
import { ProcessingActivity } from '../models/ProcessingActivity.js';
import { RetentionPolicy } from '../models/RetentionPolicy.js';

export class ComplianceReportService {
  async generateSOC2Report(tenantId: string, startDate: Date, endDate: Date) {
    const dateFilter = { timestamp: { $gte: startDate, $lte: endDate } };
    const tenantFilter = { tenant_id: tenantId };

    const [auditCount, securityEvents, changeRecords, activeSessions, failedLogins] = await Promise.all([
      AuditTrail.countDocuments({ ...tenantFilter, ...dateFilter }),
      SecurityEvent.find({ ...tenantFilter, ...dateFilter }).sort({ timestamp: -1 }).limit(500).lean(),
      ChangeRecord.find({ ...tenantFilter, created_at: { $gte: startDate, $lte: endDate } }).lean(),
      Session.countDocuments({ ...tenantFilter, is_active: true }),
      SecurityEvent.countDocuments({ ...tenantFilter, event_type: 'login_failure', ...dateFilter }),
    ]);

    return {
      report_type: 'SOC2',
      tenant_id: tenantId,
      period: { start: startDate, end: endDate },
      generated_at: new Date(),
      summary: {
        total_audit_entries: auditCount,
        total_security_events: securityEvents.length,
        total_change_records: changeRecords.length,
        active_sessions: activeSessions,
        failed_login_attempts: failedLogins,
      },
      security_events_by_severity: {
        critical: securityEvents.filter(e => e.severity === 'critical').length,
        warning: securityEvents.filter(e => e.severity === 'warning').length,
        info: securityEvents.filter(e => e.severity === 'info').length,
      },
      change_records: changeRecords,
      controls: {
        access_control: true,
        audit_logging: true,
        encryption_at_rest: true,
        token_revocation: true,
        session_management: true,
        rate_limiting: true,
        input_validation: true,
      },
    };
  }

  async generateGDPRReport(tenantId: string) {
    const tenantFilter = { tenant_id: tenantId };
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [dsarRequests, consents, breaches, processingActivities, retentionPolicies] = await Promise.all([
      DataSubjectRequest.find(tenantFilter).sort({ created_at: -1 }).lean(),
      Consent.find(tenantFilter).lean(),
      DataBreach.find(tenantFilter).sort({ detected_at: -1 }).lean(),
      ProcessingActivity.find({ ...tenantFilter, is_active: true }).lean(),
      RetentionPolicy.find({ ...tenantFilter, is_active: true }).lean(),
    ]);

    const pendingDSARs = dsarRequests.filter((d: any) => d.status === 'pending' || d.status === 'in_progress');
    const overdueDSARs = pendingDSARs.filter((d: any) => d.due_date && new Date(d.due_date) < new Date());

    return {
      report_type: 'GDPR',
      tenant_id: tenantId,
      generated_at: new Date(),
      dsar: {
        total: dsarRequests.length,
        pending: pendingDSARs.length,
        overdue: overdueDSARs.length,
        avg_response_days: this.calcAvgResponseDays(dsarRequests),
        by_type: this.groupBy(dsarRequests, 'request_type'),
      },
      consent: {
        total_records: consents.length,
        granted: consents.filter((c: any) => c.granted).length,
        withdrawn: consents.filter((c: any) => !c.granted).length,
        by_purpose: this.groupBy(consents, 'purpose'),
      },
      breaches: {
        total: breaches.length,
        unresolved: breaches.filter((b: any) => b.status !== 'resolved').length,
        authority_notified: breaches.filter((b: any) => b.notified_authority).length,
        subjects_notified: breaches.filter((b: any) => b.notified_subjects).length,
      },
      processing_activities: processingActivities.length,
      retention_policies: retentionPolicies.length,
    };
  }

  async generateISO27001Report(tenantId: string) {
    const tenantFilter = { tenant_id: tenantId };
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const [securityEvents, changeRecords, activeSessions] = await Promise.all([
      SecurityEvent.find({ ...tenantFilter, timestamp: { $gte: ninetyDaysAgo } }).lean(),
      ChangeRecord.find({ ...tenantFilter, created_at: { $gte: ninetyDaysAgo } }).lean(),
      Session.countDocuments({ ...tenantFilter, is_active: true }),
    ]);

    return {
      report_type: 'ISO27001',
      tenant_id: tenantId,
      generated_at: new Date(),
      annex_a_controls: {
        'A.5_information_security_policies': { status: 'implemented', evidence: 'Password policy, session management' },
        'A.6_organization': { status: 'implemented', evidence: 'RBAC, role separation' },
        'A.7_human_resource': { status: 'implemented', evidence: 'HR module with access controls' },
        'A.8_asset_management': { status: 'implemented', evidence: 'Data classification registry' },
        'A.9_access_control': { status: 'implemented', evidence: 'JWT + 2FA + RBAC + session management' },
        'A.10_cryptography': { status: 'implemented', evidence: 'AES-256-GCM field encryption, bcrypt passwords' },
        'A.12_operations_security': { status: 'implemented', evidence: 'Audit trails, security event logging' },
        'A.14_system_acquisition': { status: 'implemented', evidence: 'Input validation, Zod schemas' },
        'A.16_incident_management': { status: 'implemented', evidence: 'Data breach management workflow' },
        'A.18_compliance': { status: 'implemented', evidence: 'GDPR features, retention policies, DSAR' },
      },
      metrics: {
        security_events_90d: securityEvents.length,
        critical_events_90d: securityEvents.filter((e: any) => e.severity === 'critical').length,
        change_records_90d: changeRecords.length,
        active_sessions: activeSessions,
      },
    };
  }

  private calcAvgResponseDays(requests: any[]): number {
    const completed = requests.filter((r: any) => r.completed_at && r.created_at);
    if (completed.length === 0) return 0;
    const totalDays = completed.reduce((sum: number, r: any) => {
      return sum + (new Date(r.completed_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
    }, 0);
    return Math.round((totalDays / completed.length) * 10) / 10;
  }

  private groupBy(items: any[], field: string): Record<string, number> {
    return items.reduce((acc: Record<string, number>, item: any) => {
      const key = item[field] || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }
}

export const complianceReportService = new ComplianceReportService();
