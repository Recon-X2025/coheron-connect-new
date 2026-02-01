import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import dataImportExportService from '../../../services/dataImportExportService.js';

const router = Router();

router.post('/import/:entity', asyncHandler(async (req: any, res: any) => {
  const { csv_data } = req.body;
  if (!csv_data) return res.status(400).json({ error: 'csv_data is required' });
  const result = await dataImportExportService.importCSV(req.user.tenant_id.toString(), req.params.entity, csv_data);
  res.json(result);
}));

router.get('/export/:entity', asyncHandler(async (req: any, res: any) => {
  const csv = await dataImportExportService.exportCSV(req.user.tenant_id.toString(), req.params.entity, req.query);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="' + req.params.entity + '.csv"');
  res.send(csv);
}));

export default router;
