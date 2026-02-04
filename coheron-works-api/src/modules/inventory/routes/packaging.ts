import express from 'express';
import { PackagingLevel } from '../models/PackagingLevel.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET / - list packaging levels
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const levels = await PackagingLevel.find({ tenant_id: req.user.tenant_id })
    .populate('parent_level_id', 'name level')
    .sort({ level: 1 })
    .lean();
  res.json(levels);
}));

// POST / - create packaging level
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const level = await PackagingLevel.create({
    ...req.body,
    tenant_id: req.user.tenant_id,
  });
  res.status(201).json(level);
}));

// GET /hierarchy - get full hierarchy tree
router.get('/hierarchy', authenticate, asyncHandler(async (req: any, res) => {
  const levels = await PackagingLevel.find({ tenant_id: req.user.tenant_id })
    .sort({ level: 1 })
    .lean();

  // Build tree structure
  const byId = new Map<string, any>();
  const roots: any[] = [];

  for (const l of levels) {
    byId.set(l._id.toString(), { ...l, children: [] });
  }

  for (const l of levels) {
    const node = byId.get(l._id.toString());
    if (l.parent_level_id) {
      const parent = byId.get(l.parent_level_id.toString());
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  res.json(roots);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const level = await PackagingLevel.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id })
    .populate('parent_level_id', 'name level')
    .lean();
  if (!level) return res.status(404).json({ error: 'Packaging level not found' });
  res.json(level);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const level = await PackagingLevel.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user.tenant_id },
    req.body,
    { new: true }
  );
  if (!level) return res.status(404).json({ error: 'Packaging level not found' });
  res.json(level);
}));

// DELETE /:id
router.delete('/:id', authenticate, asyncHandler(async (req: any, res) => {
  // Check if any children reference this level
  const children = await PackagingLevel.countDocuments({
    tenant_id: req.user.tenant_id,
    parent_level_id: req.params.id,
  });
  if (children > 0) {
    return res.status(400).json({ error: 'Cannot delete level with child levels' });
  }

  const level = await PackagingLevel.findOneAndDelete({ _id: req.params.id, tenant_id: req.user.tenant_id });
  if (!level) return res.status(404).json({ error: 'Packaging level not found' });
  res.json({ message: 'Packaging level deleted' });
}));

export default router;
