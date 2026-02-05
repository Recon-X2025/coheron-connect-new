import express from 'express';
import MasterProductionSchedule from '../../../models/MasterProductionSchedule.js';
import ManufacturingOrder from '../../../models/ManufacturingOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get MPS grid
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { product_ids, period_type, start, end } = req.query;
  const filter: any = {};
  if (product_ids) {
    const ids = (product_ids as string).split(',');
    filter.product_id = { $in: ids };
  }
  if (period_type) filter.period_type = period_type;
  if (start) filter.period_start = { $gte: new Date(start as string) };
  if (end) filter.period_end = { $lte: new Date(end as string) };
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    MasterProductionSchedule.find(filter).populate('product_id', 'name').sort({ product_id: 1, period_start: 1 }).lean(),
    pagination, filter, MasterProductionSchedule
  );
  res.json({ data: result.data, pagination: result.pagination });
}));

// Create/update MPS entries
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  const results = [];
  for (const entry of entries) {
    if (entry._id) {
      const updated = await MasterProductionSchedule.findByIdAndUpdate(entry._id, entry, { new: true });
      if (updated) results.push(updated);
    } else {
      const created = await MasterProductionSchedule.create(entry);
      results.push(created);
    }
  }
  res.status(201).json({ data: results });
}));

// Freeze MPS for a period
router.post('/freeze', authenticate, asyncHandler(async (req, res) => {
  const { product_id, period_start, period_end } = req.body;
  const filter: any = { status: 'confirmed' };
  if (product_id) filter.product_id = product_id;
  if (period_start) filter.period_start = { $gte: new Date(period_start) };
  if (period_end) filter.period_end = { $lte: new Date(period_end) };
  const result = await MasterProductionSchedule.updateMany(filter, { status: 'frozen' });
  res.json({ data: { modifiedCount: result.modifiedCount } });
}));

// Generate manufacturing orders from confirmed MPS
router.post('/generate-mo', authenticate, asyncHandler(async (req, res) => {
  const { product_id, period_start, period_end } = req.body;
  const filter: any = { status: 'confirmed', planned_production: { $gt: 0 } };
  if (product_id) filter.product_id = product_id;
  if (period_start) filter.period_start = { $gte: new Date(period_start) };
  if (period_end) filter.period_end = { $lte: new Date(period_end) };
  const mpsEntries = await MasterProductionSchedule.find(filter).lean();
  const createdMos = [];
  for (const entry of mpsEntries) {
    const mo = await ManufacturingOrder.create({
      mo_number: "MO-MPS-" + Date.now(),
      product_id: (entry as any).product_id,
      product_qty: (entry as any).planned_production,
      date_planned_start: (entry as any).period_start,
      date_planned_finished: (entry as any).period_end,
      origin: 'mps',
      state: 'draft',
    });
    createdMos.push(mo);
  }
  res.status(201).json({ data: createdMos, count: createdMos.length });
}));

export default router;
