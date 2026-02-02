import express from 'express';
import { Report } from '../../../models/Report.js';
import { ReportOutput } from '../../../models/ReportOutput.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const CONTENT_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { module, tenant_id } = req.query;
  const filter: any = {};
  if (module) filter.module = module;
  if (tenant_id) filter.tenant_id = tenant_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Report.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, Report
  );
  res.json(result);
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findById(req.params.id).lean();
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
}));

router.post('/', asyncHandler(async (req, res) => {
  const report = await Report.create(req.body);
  res.status(201).json(report);
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json(report);
}));

// Download generated report output by report_id
router.get('/:id/download', asyncHandler(async (req, res) => {
  const reportOutput: any = await ReportOutput.findOne({ report_id: req.params.id }).lean();
  if (!reportOutput) {
    return res.status(404).json({ error: 'Report output not found' });
  }

  const fileBuffer = Buffer.from(reportOutput.buffer, 'base64');
  const contentType = CONTENT_TYPES[reportOutput.format] || 'application/octet-stream';
  const extension = reportOutput.format || 'bin';
  const filename = `${reportOutput.name || 'report'}.${extension}`;

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', fileBuffer.length);
  res.send(fileBuffer);
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const report = await Report.findByIdAndDelete(req.params.id);
  if (!report) return res.status(404).json({ error: 'Report not found' });
  res.json({ message: 'Report deleted successfully' });
}));

export default router;
