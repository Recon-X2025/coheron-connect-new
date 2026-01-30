import { Router, Request, Response } from 'express';
import { SecurityEvent } from '../../../shared/models/SecurityEvent.js';
import { Session } from '../../../shared/models/Session.js';
import { AuditTrail } from '../../../shared/models/AuditTrail.js';
import { ChangeRecord } from '../../../shared/models/ChangeRecord.js';
import { DataSubjectRequest } from '../../../shared/models/DataSubjectRequest.js';
import { complianceReportService } from '../../../shared/services/complianceReportService.js';

const router = Router();

// GET / — Security overview dashboard
router.get('/', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const tenantId = user.tenant_id;
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      failedLogins24h,
      successfulLogins24h,
      activeSessions,
      criticalEvents7d,
      recentSecurityEvents,
      pendingDSARs,
      recentChanges,
    ] = await Promise.all([
      SecurityEvent.countDocuments({ tenant_id: tenantId, event_type: 'login_failure', timestamp: { $gte: last24h } }),
      SecurityEvent.countDocuments({ tenant_id: tenantId, event_type: 'login_success', timestamp: { $gte: last24h } }),
      Session.countDocuments({ tenant_id: tenantId, is_active: true }),
      SecurityEvent.countDocuments({ tenant_id: tenantId, severity: 'critical', timestamp: { $gte: last7d } }),
      SecurityEvent.find({ tenant_id: tenantId }).sort({ timestamp: -1 }).limit(20).lean(),
      DataSubjectRequest.countDocuments({ tenant_id: tenantId, status: { $in: ['pending', 'in_progress'] } }),
      ChangeRecord.find({ tenant_id: tenantId }).sort({ created_at: -1 }).limit(10).lean(),
    ]);

    res.json({
      overview: {
        failed_logins_24h: failedLogins24h,
        successful_logins_24h: successfulLogins24h,
        active_sessions: activeSessions,
        critical_events_7d: criticalEvents7d,
        pending_dsars: pendingDSARs,
      },
      recent_security_events: recentSecurityEvents,
      recent_changes: recentChanges,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /events — paginated security events
router.get('/events', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { event_type, severity, page = '1', limit = '50' } = req.query;
    const filter: any = { tenant_id: user.tenant_id };
    if (event_type) filter.event_type = event_type;
    if (severity) filter.severity = severity;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [events, total] = await Promise.all([
      SecurityEvent.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit as string)).lean(),
      SecurityEvent.countDocuments(filter),
    ]);

    res.json({ events, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /audit-log — paginated audit trail
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { entity_type, action, user_id, page = '1', limit = '50' } = req.query;
    const filter: any = { tenant_id: user.tenant_id };
    if (entity_type) filter.entity_type = entity_type;
    if (action) filter.action = action;
    if (user_id) filter.user_id = user_id;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const [entries, total] = await Promise.all([
      AuditTrail.find(filter).sort({ timestamp: -1 }).skip(skip).limit(parseInt(limit as string)).lean(),
      AuditTrail.countDocuments(filter),
    ]);

    res.json({ entries, total, page: parseInt(page as string), limit: parseInt(limit as string) });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /reports/:type — generate compliance report
router.get('/reports/:type', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { type } = req.params;
    const { start_date, end_date } = req.query;

    const startDate = start_date ? new Date(start_date as string) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = end_date ? new Date(end_date as string) : new Date();

    let report;
    switch (type) {
      case 'soc2':
        report = await complianceReportService.generateSOC2Report(user.tenant_id, startDate, endDate);
        break;
      case 'gdpr':
        report = await complianceReportService.generateGDPRReport(user.tenant_id);
        break;
      case 'iso27001':
        report = await complianceReportService.generateISO27001Report(user.tenant_id);
        break;
      default:
        return res.status(400).json({ error: 'Invalid report type. Use: soc2, gdpr, iso27001' });
    }

    res.json(report);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
