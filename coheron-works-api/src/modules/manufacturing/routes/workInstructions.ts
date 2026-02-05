import express from 'express';
import { WorkInstruction } from '../../../models/WorkInstruction.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// GET /
router.get('/', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, product_id, operation_id, status, search } = req.query;
  const filter: any = {};
  if (tenant_id) filter.tenant_id = tenant_id;
  if (product_id) filter.product_id = product_id;
  if (operation_id) filter.operation_id = operation_id;
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(WorkInstruction.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, WorkInstruction);
  res.json(result);
}));

// GET /for-operation
router.get('/for-operation', authenticate, asyncHandler(async (req: any, res: any) => {
  const { tenant_id, mo_id, operation } = req.query;
  const filter: any = { status: 'published' };
  if (tenant_id) filter.tenant_id = tenant_id;
  if (operation) filter.operation_id = operation;
  if (mo_id) {
    const mongoose = await import('mongoose');
    const MO = mongoose.default.model('ManufacturingOrder');
    const mo = await MO.findById(mo_id).lean() as any;
    if (mo?.product_id) { filter.$or = [{ operation_id: operation }, { product_id: mo.product_id }]; delete filter.operation_id; }
  }
  const instructions = await WorkInstruction.find(filter).sort({ version: -1 }).lean();
  res.json({ data: instructions });
}));

// POST /
router.post('/', authenticate, asyncHandler(async (req: any, res: any) => {
  const data = req.body;
  data.created_by = data.created_by || req.user?._id;
  if (data.steps?.length) data.total_duration_minutes = data.steps.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
  const instruction = await WorkInstruction.create(data);
  res.status(201).json(instruction);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const instruction = await WorkInstruction.findById(req.params.id).lean();
  if (!instruction) return res.status(404).json({ error: 'Work instruction not found' });
  res.json(instruction);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req: any, res: any) => {
  const data = req.body;
  if (data.steps?.length) data.total_duration_minutes = data.steps.reduce((sum: number, s: any) => sum + (s.duration_minutes || 0), 0);
  const instruction = await WorkInstruction.findByIdAndUpdate(req.params.id, data, { new: true }).lean();
  if (!instruction) return res.status(404).json({ error: 'Work instruction not found' });
  res.json(instruction);
}));

// POST /:id/publish
router.post('/:id/publish', authenticate, asyncHandler(async (req: any, res: any) => {
  const instruction = await WorkInstruction.findById(req.params.id);
  if (!instruction) return res.status(404).json({ error: 'Work instruction not found' });
  instruction.status = 'published'; instruction.approved_by = req.body.approved_by || req.user?._id; instruction.approved_at = new Date();
  await instruction.save(); res.json(instruction);
}));

// POST /:id/archive
router.post('/:id/archive', authenticate, asyncHandler(async (req: any, res: any) => {
  const instruction = await WorkInstruction.findByIdAndUpdate(req.params.id, { status: 'archived' }, { new: true }).lean();
  if (!instruction) return res.status(404).json({ error: 'Work instruction not found' });
  res.json(instruction);
}));

// POST /:id/duplicate
router.post('/:id/duplicate', authenticate, asyncHandler(async (req: any, res: any) => {
  const original = await WorkInstruction.findById(req.params.id).lean();
  if (!original) return res.status(404).json({ error: 'Work instruction not found' });
  const { _id, created_at, updated_at, approved_by, approved_at, ...rest } = original as any;
  const newInstruction = await WorkInstruction.create({ ...rest, version: (original.version || 1) + 1, status: 'draft', created_by: req.body.created_by || req.user?._id });
  res.status(201).json(newInstruction);
}));

export default router;
