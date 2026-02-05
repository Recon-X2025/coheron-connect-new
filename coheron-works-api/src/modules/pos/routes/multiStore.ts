import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { Store } from '../models/Store.js';
import { StoreConfig } from '../models/StoreConfig.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// --- Stores ---
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { is_active, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id: req.user?.tenant_id };
  if (is_active !== undefined) filter.is_active = is_active === 'true';
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const [items, total] = await Promise.all([
    Store.find(filter).sort({ name: 1 }).skip(skip).limit(parseInt(limit as string)).populate('manager_id', 'name email').lean(),
    Store.countDocuments(filter),
  ]);
  res.json({ items, total, page: parseInt(page as string), limit: parseInt(limit as string) });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Store.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).populate('manager_id').lean();
  if (!item) return res.status(404).json({ error: 'Store not found' });
  res.json(item);
}));

router.post('/', authenticate, asyncHandler(async (req, res) => {
  const item = await Store.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(item);
}));

router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await Store.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { $set: req.body }, { new: true });
  if (!item) return res.status(404).json({ error: 'Store not found' });
  res.json(item);
}));

router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await Store.deleteOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// --- Configs ---
router.get('/:id/config', authenticate, asyncHandler(async (req, res) => {
  const config = await StoreConfig.findOne({ store_id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!config) return res.status(404).json({ error: 'Config not found' });
  res.json(config);
}));

router.put('/:id/config', authenticate, asyncHandler(async (req, res) => {
  const config = await StoreConfig.findOneAndUpdate(
    { store_id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: { ...req.body, store_id: req.params.id, tenant_id: req.user?.tenant_id } },
    { new: true, upsert: true }
  );
  res.json(config);
}));

// Performance for a store (placeholder aggregation)
router.get('/:id/performance', authenticate, asyncHandler(async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!store) return res.status(404).json({ error: 'Store not found' });
  res.json({ store_id: req.params.id, store_name: store.name, total_sales: 0, order_count: 0, avg_order_value: 0 });
}));

// Compare stores
router.get('/comparison', authenticate, asyncHandler(async (req, res) => {
  const stores = await Store.find({ tenant_id: req.user?.tenant_id, is_active: true }).lean();
  const comparison = stores.map(s => ({
    store_id: s._id, name: s.name, code: s.code, total_sales: 0, order_count: 0,
  }));
  res.json(comparison);
}));

export default router;
