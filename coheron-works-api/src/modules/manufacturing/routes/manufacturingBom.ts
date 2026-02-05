import express from 'express';
import Bom from '../../../models/Bom.js';
import BomLine from '../../../models/BomLine.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// BILL OF MATERIALS (BOM) - CRUD
// ============================================

// Get all BOMs
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { product_id, active, search } = req.query;
  const filter: any = {};

  if (product_id) filter.product_id = product_id;
  if (active !== undefined) filter.active = active === 'true';

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    Bom.find(filter)
      .populate('product_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, Bom
  );

  const data = paginatedResult.data.map((b: any) => ({
    ...b,
    product_name: b.product_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get BOM by ID with lines
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const bom = await Bom.findById(req.params.id)
    .populate('product_id', 'name')
    .lean();

  if (!bom) {
    return res.status(404).json({ error: 'BOM not found' });
  }

  const bomLines = await BomLine.find({ bom_id: req.params.id })
    .populate('product_id', 'name default_code')
    .sort({ sequence: 1 })
    .lean();

  const lines = bomLines.map((bl: any) => ({
    ...bl,
    product_name: bl.product_id?.name,
    default_code: bl.product_id?.default_code,
  }));

  res.json({
    ...bom,
    product_name: (bom as any).product_id?.name,
    lines,
  });
}));

// Create BOM
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const {
    name, code, product_id, product_qty, product_uom_id, type, active,
    version, date_start, date_stop, sequence, ready_to_produce, user_id, notes, lines,
  } = req.body;

  const bom = await Bom.create({
    name, code, product_id,
    product_qty: product_qty || 1,
    product_uom_id,
    type: type || 'normal',
    active: active !== false,
    version: version || 1,
    date_start, date_stop,
    sequence: sequence || 10,
    ready_to_produce: ready_to_produce || 'asap',
    user_id, notes,
  });

  if (lines && Array.isArray(lines)) {
    for (const line of lines) {
      await BomLine.create({
        bom_id: bom._id,
        product_id: line.product_id,
        product_qty: line.product_qty,
        product_uom_id: line.product_uom_id,
        sequence: line.sequence || 10,
        operation_id: line.operation_id,
        type: line.type || 'normal',
        date_start: line.date_start,
        date_stop: line.date_stop,
        notes: line.notes,
      });
    }
  }

  res.status(201).json(bom);
}));

// Update BOM
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'name', 'code', 'product_id', 'product_qty', 'product_uom_id', 'type',
    'active', 'version', 'date_start', 'date_stop', 'sequence', 'ready_to_produce', 'notes',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const bom = await Bom.findByIdAndUpdate(id, updateData, { new: true });

  if (!bom) {
    return res.status(404).json({ error: 'BOM not found' });
  }

  res.json(bom);
}));

// Delete BOM
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const bom = await Bom.findByIdAndDelete(req.params.id);
  if (!bom) {
    return res.status(404).json({ error: 'BOM not found' });
  }
  // Also delete lines
  await BomLine.deleteMany({ bom_id: req.params.id });
  res.json({ message: 'BOM deleted successfully' });
}));

// ============================================
// BOM LINES - CRUD
// ============================================

// Get BOM lines
router.get('/:bom_id/lines', authenticate, asyncHandler(async (req, res) => {
  const lines = await BomLine.find({ bom_id: req.params.bom_id })
    .populate('product_id', 'name default_code')
    .sort({ sequence: 1 })
    .lean();

  const result = lines.map((bl: any) => ({
    ...bl,
    product_name: bl.product_id?.name,
    default_code: bl.product_id?.default_code,
  }));

  res.json(result);
}));

// Add BOM line
router.post('/:bom_id/lines', authenticate, asyncHandler(async (req, res) => {
  const { bom_id } = req.params;
  const {
    product_id, product_qty, product_uom_id, sequence,
    operation_id, type, date_start, date_stop, notes,
  } = req.body;

  const line = await BomLine.create({
    bom_id,
    product_id, product_qty, product_uom_id,
    sequence: sequence || 10,
    operation_id,
    type: type || 'normal',
    date_start, date_stop, notes,
  });

  res.status(201).json(line);
}));

// Update BOM line
router.put('/lines/:id', authenticate, asyncHandler(async (req, res) => {
  const { id } = req.params;
  const allowedFields = [
    'product_id', 'product_qty', 'product_uom_id', 'sequence',
    'operation_id', 'type', 'date_start', 'date_stop', 'notes',
  ];

  const updateData: any = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const line = await BomLine.findByIdAndUpdate(id, updateData, { new: true });

  if (!line) {
    return res.status(404).json({ error: 'BOM line not found' });
  }

  res.json(line);
}));

// Delete BOM line
router.delete('/lines/:id', authenticate, asyncHandler(async (req, res) => {
  const line = await BomLine.findByIdAndDelete(req.params.id);
  if (!line) {
    return res.status(404).json({ error: 'BOM line not found' });
  }
  res.json({ message: 'BOM line deleted successfully' });
}));

export default router;
