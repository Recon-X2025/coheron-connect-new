import express from 'express';
import { ComplianceControl } from '../../../models/ComplianceControl.js';
import { ComplianceAudit } from '../../../models/ComplianceAudit.js';
import { complianceFrameworks } from '../../../data/complianceFrameworks.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET /controls
router.get('/controls', asyncHandler(async (req: any, res) => {
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.framework) filter.framework = req.query.framework;
  if (req.query.status) filter.status = req.query.status;
  const controls = await ComplianceControl.find(filter).sort({ framework: 1, control_id: 1 }).lean();
  res.json(controls);
}));

// POST /controls
router.post('/controls', asyncHandler(async (req: any, res) => {
  const control = await ComplianceControl.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(control);
}));

// PUT /controls/:id
router.put('/controls/:id', asyncHandler(async (req: any, res) => {
  const control = await ComplianceControl.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!control) return res.status(404).json({ error: 'Control not found' });
  res.json(control);
}));

// POST /controls/seed
router.post('/controls/seed', asyncHandler(async (req: any, res) => {
  const { framework } = req.body;
  const templates = complianceFrameworks[framework as string];
  if (!templates) return res.status(400).json({ error: 'Unknown framework' });
  const controls = templates.map((t: any) => ({ ...t, framework, tenant_id: req.user.tenant_id, status: 'not_started' }));
  await ComplianceControl.insertMany(controls, { ordered: false }).catch(() => {});
  res.status(201).json({ seeded: templates.length });
}));

// GET /audits
router.get('/audits', asyncHandler(async (req: any, res) => {
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.framework) filter.framework = req.query.framework;
  if (req.query.status) filter.status = req.query.status;
  const audits = await ComplianceAudit.find(filter).sort({ start_date: -1 }).lean();
  res.json(audits);
}));

// POST /audits
router.post('/audits', asyncHandler(async (req: any, res) => {
  const audit = await ComplianceAudit.create({ ...req.body, tenant_id: req.user.tenant_id, created_by: req.user._id });
  res.status(201).json(audit);
}));

// GET /audits/:id
router.get('/audits/:id', asyncHandler(async (req: any, res) => {
  const audit = await ComplianceAudit.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).lean();
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
}));

// PUT /audits/:id
router.put('/audits/:id', asyncHandler(async (req: any, res) => {
  const audit = await ComplianceAudit.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body, { new: true }
  );
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
}));

// POST /audits/:id/findings
router.post('/audits/:id/findings', asyncHandler(async (req: any, res) => {
  const audit = await ComplianceAudit.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  audit.findings.push(req.body);
  await audit.save();
  res.status(201).json(audit);
}));

// PUT /audits/:id/findings/:findingIndex/remediate
router.put('/audits/:id/findings/:findingIndex/remediate', asyncHandler(async (req: any, res) => {
  const audit = await ComplianceAudit.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  const idx = parseInt(req.params.findingIndex, 10);
  if (!audit.findings[idx]) return res.status(404).json({ error: 'Finding not found' });
  Object.assign(audit.findings[idx], req.body);
  if (req.body.remediation_status === 'closed') (audit.findings[idx] as any).closed_at = new Date();
  await audit.save();
  res.json(audit);
}));

// GET /dashboard
router.get('/dashboard', asyncHandler(async (req: any, res) => {
  const tid = req.user.tenant_id;
  const controls = await ComplianceControl.find({ tenant_id: tid }).lean();
  const byFramework: any = {};
  controls.forEach((c: any) => {
    if (!byFramework[c.framework]) byFramework[c.framework] = { total: 0, by_status: {} };
    byFramework[c.framework].total++;
    byFramework[c.framework].by_status[c.status] = (byFramework[c.framework].by_status[c.status] || 0) + 1;
  });
  const upcoming = controls.filter((c: any) => c.next_review_at && new Date(c.next_review_at) < new Date(Date.now() + 30*86400000));
  const openFindings = await ComplianceAudit.aggregate([
    { $match: { tenant_id: tid } },
    { $unwind: "$findings" },
    { $match: { "findings.remediation_status": { $ne: "closed" } } },
    { $count: "count" }
  ]);
  res.json({ controls_by_framework: byFramework, upcoming_reviews: upcoming.length, open_findings: openFindings[0]?.count || 0 });
}));

// GET /readiness/:framework
router.get('/readiness/:framework', asyncHandler(async (req: any, res) => {
  const controls = await ComplianceControl.find({ tenant_id: req.user.tenant_id, framework: req.params.framework }).lean();
  const total = controls.length;
  const implemented = controls.filter((c: any) => ['implemented', 'verified'].includes(c.status)).length;
  const gaps = controls.filter((c: any) => ['not_started', 'non_compliant'].includes(c.status));
  res.json({ framework: req.params.framework, total, implemented, pct: total ? Math.round((implemented / total) * 100) : 0, gaps });
}));

export default router;
