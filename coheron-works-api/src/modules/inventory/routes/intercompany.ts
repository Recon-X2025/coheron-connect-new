import express from 'express';
import { IntercompanyTransfer } from '../models/IntercompanyTransfer.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const { status, source_entity, destination_entity, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id: req.user.tenant_id };
  if (status) filter.status = status;
  if (source_entity) filter.source_entity = source_entity;
  if (destination_entity) filter.destination_entity = destination_entity;

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    IntercompanyTransfer.find(filter).sort({ created_at: -1 }).skip(skip).limit(Number(limit)).lean(),
    IntercompanyTransfer.countDocuments(filter),
  ]);
  res.json({ data, total, page: Number(page), limit: Number(limit) });
}));

// POST /
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const count = await IntercompanyTransfer.countDocuments({ tenant_id: req.user.tenant_id });
  const transfer_number = `ICT-${String(count + 1).padStart(5, '0')}`;
  const totalValue = (req.body.lines || []).reduce((s: number, l: any) => s + (l.total_cost || 0), 0);

  const transfer = await IntercompanyTransfer.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
    transfer_number,
    total_value: totalValue,
    created_by: req.user._id,
  });
  res.status(201).json(transfer);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const transfer = await IntercompanyTransfer.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).lean();
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  res.json(transfer);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const transfer = await IntercompanyTransfer.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  res.json(transfer);
}));

// DELETE /:id
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const transfer = await IntercompanyTransfer.findOneAndDelete({
    _id: req.params.id, tenant_id: req.user.tenant_id, status: 'draft',
  });
  if (!transfer) return res.status(404).json({ error: 'Transfer not found or cannot be deleted' });
  res.json({ message: 'Transfer deleted' });
}));

// POST /:id/approve
router.post('/:id/approve', authenticate, asyncHandler(async (req: any, res) => {
  const transfer = await IntercompanyTransfer.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.status !== 'pending_approval') return res.status(400).json({ error: 'Transfer must be pending approval' });
  transfer.status = 'approved';
  transfer.approved_by = req.user._id;
  await transfer.save();
  res.json(transfer);
}));

// POST /:id/ship
router.post('/:id/ship', authenticate, asyncHandler(async (req: any, res) => {
  const transfer = await IntercompanyTransfer.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.status !== 'approved') return res.status(400).json({ error: 'Transfer must be approved before shipping' });
  transfer.status = 'in_transit';
  transfer.transfer_date = new Date();
  await transfer.save();
  res.json(transfer);
}));

// POST /:id/receive
router.post('/:id/receive', authenticate, asyncHandler(async (req: any, res) => {
  const transfer = await IntercompanyTransfer.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!transfer) return res.status(404).json({ error: 'Transfer not found' });
  if (transfer.status !== 'in_transit') return res.status(400).json({ error: 'Transfer must be in transit' });
  transfer.status = 'received';
  transfer.actual_delivery = new Date();
  await transfer.save();
  res.json(transfer);
}));

// GET /in-transit
router.get('/in-transit', authenticate, asyncHandler(async (req: any, res) => {
  const transfers = await IntercompanyTransfer.find({
    tenant_id: req.user.tenant_id,
    status: 'in_transit',
  }).sort({ transfer_date: -1 }).lean();
  res.json(transfers);
}));

export default router;
