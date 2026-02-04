import { Router } from 'express';
import DocumentSequence from '../../../models/DocumentSequence.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = Router();

// List all sequences for tenant
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const sequences = await DocumentSequence.find({ tenant_id: req.user.tenant_id }).sort({ document_type: 1 });
  res.json(sequences);
}));

// Get single sequence
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const seq = await DocumentSequence.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json(seq);
}));

// Create sequence
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const seq = await DocumentSequence.create({ ...req.body, tenant_id: req.user.tenant_id });
  res.status(201).json(seq);
}));

// Update sequence
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const seq = await DocumentSequence.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true, runValidators: true }
  );
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json(seq);
}));

// Delete sequence
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const seq = await DocumentSequence.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!seq) return res.status(404).json({ error: 'Sequence not found' });
  res.json({ message: 'Deleted' });
}));

export default router;
