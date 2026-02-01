import express from 'express';
import FinancialReportTemplate from '../../../models/FinancialReportTemplate.js';
import { generateReport } from '../../../services/financialReportService.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

router.get('/templates', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { report_type, is_active } = req.query;
  const filter: any = { tenant_id };
  if (report_type) filter.report_type = report_type;
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(FinancialReportTemplate.find(filter).sort({ report_type: 1, name: 1 }), pagination, filter, FinancialReportTemplate);
  res.json(result);
}));

router.post('/templates', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const userId = (req as any).user?._id;
  const template = await FinancialReportTemplate.create({ ...req.body, tenant_id, created_by: userId, is_system: false });
  res.status(201).json(template);
}));

router.get('/templates/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const template = await FinancialReportTemplate.findOne({ _id: req.params.id, tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

router.put('/templates/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const template = await FinancialReportTemplate.findOne({ _id: req.params.id, tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (template.is_system) return res.status(403).json({ error: 'Cannot modify system templates' });
  Object.assign(template, req.body);
  await template.save();
  res.json(template);
}));

router.delete('/templates/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const template = await FinancialReportTemplate.findOne({ _id: req.params.id, tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  if (template.is_system) return res.status(403).json({ error: 'Cannot delete system templates' });
  await template.deleteOne();
  res.json({ message: 'Template deleted' });
}));

router.post('/templates/:id/duplicate', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const userId = (req as any).user?._id;
  const source = await FinancialReportTemplate.findOne({ _id: req.params.id, tenant_id });
  if (!source) return res.status(404).json({ error: 'Template not found' });
  const obj = source.toObject();
  delete (obj as any)._id;
  delete (obj as any).id;
  const dup = await FinancialReportTemplate.create({ ...obj, name: source.name + ' (Copy)', is_system: false, created_by: userId });
  res.status(201).json(dup);
}));

router.post('/generate', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { template_id, start_date, end_date, compare_period, entity_id } = req.body;
  if (!template_id || !start_date || !end_date) return res.status(400).json({ error: 'template_id, start_date, and end_date required' });
  const report = await generateReport(tenant_id, template_id, { start_date, end_date, compare_period, entity_id });
  res.json(report);
}));

router.get('/saved', asyncHandler(async (_req, res) => {
  res.json({ data: [], total: 0, message: 'Saved reports feature placeholder' });
}));

router.post('/schedule', asyncHandler(async (req, res) => {
  const { template_id, frequency, recipients, format } = req.body;
  res.status(201).json({ message: 'Report schedule created', schedule: { template_id, frequency, recipients, format, is_active: true } });
}));

export default router;
