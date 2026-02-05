import express from 'express';
import Subcontract from '../../../models/Subcontract.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all subcontracts
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { status, vendor_id, search } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (vendor_id) filter.vendor_id = vendor_id;
  if (search) {
    filter.$or = [
      { subcontract_number: { $regex: search, $options: 'i' } },
      { operation_name: { $regex: search, $options: 'i' } },
    ];
  }
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    Subcontract.find(filter).populate('vendor_id', 'name').populate('product_id', 'name').sort({ created_at: -1 }).lean(),
    pagination, filter, Subcontract
  );
  res.json({ data: result.data, pagination: result.pagination });
}));

// Create subcontract
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.create(req.body);
  res.status(201).json({ data: subcontract });
}));

// Get subcontract by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findById(req.params.id)
    .populate('vendor_id', 'name')
    .populate('product_id', 'name')
    .populate('manufacturing_order_id', 'mo_number')
    .lean();
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  res.json({ data: subcontract });
}));

// Update subcontract
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  res.json({ data: subcontract });
}));

// Send materials
router.post('/:id/send-materials', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findById(req.params.id);
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  if (subcontract.status !== 'draft') return res.status(400).json({ error: 'Can only send materials from draft status' });
  subcontract.status = 'materials_sent';
  subcontract.sent_date = new Date();
  if (req.body.materials_sent) subcontract.materials_sent = req.body.materials_sent;
  await subcontract.save();
  res.json({ data: subcontract });
}));

// Receive goods
router.post('/:id/receive', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findById(req.params.id);
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  if (!['materials_sent', 'in_progress'].includes(subcontract.status)) {
    return res.status(400).json({ error: 'Invalid status for receiving' });
  }
  subcontract.status = 'received';
  subcontract.received_quantity = req.body.received_quantity || subcontract.expected_quantity;
  subcontract.actual_return_date = new Date();
  await subcontract.save();
  res.json({ data: subcontract });
}));

// Quality check
router.post('/:id/quality-check', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findById(req.params.id);
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  if (subcontract.status !== 'received') return res.status(400).json({ error: 'Must be in received status' });
  subcontract.status = 'quality_check';
  subcontract.quality_status = req.body.quality_status || 'pending';
  await subcontract.save();
  res.json({ data: subcontract });
}));

// Complete
router.post('/:id/complete', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findById(req.params.id);
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  if (!['received', 'quality_check'].includes(subcontract.status)) {
    return res.status(400).json({ error: 'Invalid status for completion' });
  }
  subcontract.status = 'completed';
  subcontract.total_cost = subcontract.received_quantity * subcontract.unit_cost;
  await subcontract.save();
  res.json({ data: subcontract });
}));

// Cancel
router.post('/:id/cancel', authenticate, asyncHandler(async (req, res) => {
  const subcontract = await Subcontract.findById(req.params.id);
  if (!subcontract) return res.status(404).json({ error: 'Subcontract not found' });
  if (subcontract.status === 'completed') return res.status(400).json({ error: 'Cannot cancel completed subcontract' });
  subcontract.status = 'cancelled';
  await subcontract.save();
  res.json({ data: subcontract });
}));

export default router;
