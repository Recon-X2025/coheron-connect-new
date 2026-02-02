import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import ScheduledReport from '../../../models/ScheduledReport.js';
import mongoose from 'mongoose';

const router = Router();

// GET / - list scheduled reports
router.get('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const reports = await ScheduledReport.find({ tenant_id: tenantId }).sort({ created_at: -1 }).lean();
  res.json(reports);
}));

// POST / - create scheduled report
router.post('/', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const userId = (req as any).userId;
  const { name, module, collection, columns, filters, cron_expression, recipients, format } = req.body;

  if (!name || !collection || !cron_expression) {
    return res.status(400).json({ error: 'name, collection, and cron_expression are required' });
  }

  // Calculate initial next_run
  const now = new Date();
  const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); // default: tomorrow

  const report = await ScheduledReport.create({
    tenant_id: new mongoose.Types.ObjectId(tenantId),
    report_id: 'RPT-' + Date.now(),
    name,
    module: module || 'general',
    collection,
    columns: columns || [],
    filters: filters || {},
    cron_expression,
    recipients: recipients || [],
    format: format || 'xlsx',
    next_run: nextRun,
    created_by: userId ? new mongoose.Types.ObjectId(userId) : undefined,
  });

  res.status(201).json(report);
}));

// PUT /:id - update
router.put('/:id', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  const report = await ScheduledReport.findOneAndUpdate(
    { _id: req.params.id, tenant_id: tenantId },
    { $set: req.body },
    { new: true }
  );
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
}));

// DELETE /:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const tenantId = (req as any).tenantId;
  await ScheduledReport.deleteOne({ _id: req.params.id, tenant_id: tenantId });
  res.json({ success: true });
}));

export default router;
