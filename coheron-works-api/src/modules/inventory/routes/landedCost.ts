import express from 'express';
import { LandedCost } from '../../../models/LandedCost.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// List landed costs
router.get('/', asyncHandler(async (req, res) => {
  const { status, purchase_order_id } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (status) filter.status = status;
  if (purchase_order_id) filter.purchase_order_id = purchase_order_id;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    LandedCost.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, LandedCost
  );
  res.json(result);
}));

// Create landed cost
router.post('/', asyncHandler(async (req, res) => {
  const data = { ...req.body, tenant_id: (req as any).tenantId, created_by: (req as any).userId };
  const lc = await LandedCost.create(data);
  res.status(201).json(lc);
}));

// Get detail
router.get('/:id', asyncHandler(async (req, res) => {
  const lc = await LandedCost.findById(req.params.id).lean();
  if (!lc) return res.status(404).json({ error: 'Landed cost not found' });
  res.json(lc);
}));

// Update (draft only)
router.put('/:id', asyncHandler(async (req, res) => {
  const lc = await LandedCost.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'Landed cost not found' });
  if (lc.status !== 'draft') return res.status(400).json({ error: 'Can only update draft entries' });
  Object.assign(lc, req.body);
  await lc.save();
  res.json(lc);
}));

// Allocate costs to items
router.post('/:id/allocate', asyncHandler(async (req, res) => {
  const lc = await LandedCost.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'Landed cost not found' });
  if (lc.status !== 'draft') return res.status(400).json({ error: 'Already allocated' });
  const totalCost = lc.cost_items.reduce((s, i) => s + i.amount, 0);
  lc.total_additional_cost = totalCost;
  const lines = lc.allocated_lines;
  if (!lines.length) return res.status(400).json({ error: 'No lines to allocate' });
  let totalBasis = 0;
  if (lc.allocation_method === 'by_value') {
    totalBasis = lines.reduce((s, l) => s + l.original_cost * l.quantity, 0);
  } else if (lc.allocation_method === 'by_quantity') {
    totalBasis = lines.reduce((s, l) => s + l.quantity, 0);
  } else { totalBasis = lines.length; }
  for (const line of lines) {
    let basis = 0;
    if (lc.allocation_method === 'by_value') basis = line.original_cost * line.quantity;
    else if (lc.allocation_method === 'by_quantity') basis = line.quantity;
    else basis = 1;
    line.allocated_cost = totalBasis ? (basis / totalBasis) * totalCost : 0;
    line.new_unit_cost = line.quantity ? (line.original_cost * line.quantity + line.allocated_cost) / line.quantity : 0;
  }
  lc.status = 'allocated';
  await lc.save();
  res.json(lc);
}));

// Post allocation
router.post('/:id/post', asyncHandler(async (req, res) => {
  const lc = await LandedCost.findById(req.params.id);
  if (!lc) return res.status(404).json({ error: 'Landed cost not found' });
  if (lc.status !== 'allocated') return res.status(400).json({ error: 'Must allocate before posting' });
  lc.status = 'posted';
  if (req.body.journal_entry_id) lc.journal_entry_id = req.body.journal_entry_id;
  await lc.save();
  res.json(lc);
}));

export default router;
