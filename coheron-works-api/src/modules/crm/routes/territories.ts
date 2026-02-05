import express from 'express';
import Territory from '../../../models/Territory.js';
import TerritoryRule from '../../../models/TerritoryRule.js';
import UserTerritory from '../../../models/UserTerritory.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET / - list territories
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
  const territories = await Territory.find(filter).sort({ name: 1 }).lean();
  res.json(territories);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const territory = await Territory.findById(req.params.id).lean();
  if (!territory) return res.status(404).json({ error: 'Territory not found' });
  const rules = await TerritoryRule.find({ territory_id: req.params.id }).lean();
  const users = await UserTerritory.find({ territory_id: req.params.id }).populate('user_id', 'name email').lean();
  res.json({ ...territory, rules, users });
}));

// POST /
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const territory = await Territory.create(req.body);
  res.status(201).json(territory);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const territory = await Territory.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!territory) return res.status(404).json({ error: 'Territory not found' });
  res.json(territory);
}));

// DELETE /:id
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await Territory.findByIdAndDelete(req.params.id);
  await TerritoryRule.deleteMany({ territory_id: req.params.id });
  await UserTerritory.deleteMany({ territory_id: req.params.id });
  res.json({ success: true });
}));

// GET /:id/users
router.get('/:id/users', authenticate, asyncHandler(async (req, res) => {
  const users = await UserTerritory.find({ territory_id: req.params.id })
    .populate('user_id', 'name email')
    .populate('assigned_by', 'name')
    .lean();
  res.json(users);
}));

// POST /:id/assign-user
router.post('/:id/assign-user', authenticate, asyncHandler(async (req, res) => {
  const { user_id, is_primary } = req.body;
  const assignedBy = (req as any).user?.userId;
  const assignment = await UserTerritory.findOneAndUpdate(
    { territory_id: req.params.id, user_id },
    { territory_id: req.params.id, user_id, is_primary: is_primary || false, assigned_by: assignedBy, assigned_at: new Date() },
    { upsert: true, new: true }
  );
  res.status(201).json(assignment);
}));

export default router;
