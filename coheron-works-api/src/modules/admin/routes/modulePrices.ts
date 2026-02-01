import express from 'express';
import { ModulePrice } from '../../../models/ModulePrice.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET /module-prices — list all module prices (public)
router.get('/', asyncHandler(async (_req, res) => {
  const prices = await ModulePrice.find({ is_active: true }).sort({ category: 1, display_name: 1 });
  res.json(prices);
}));

// PUT /module-prices/:moduleName — admin update price
router.put('/:moduleName', asyncHandler(async (req, res) => {
  const price = await ModulePrice.findOneAndUpdate(
    { module_name: req.params.moduleName },
    req.body,
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  res.json(price);
}));

// POST /module-prices/bulk — admin seed/update all
router.post('/bulk', asyncHandler(async (req, res) => {
  const { modules } = req.body;
  if (!Array.isArray(modules)) {
    return res.status(400).json({ error: 'modules must be an array' });
  }

  const ops = modules.map((m: any) => ({
    updateOne: {
      filter: { module_name: m.module_name },
      update: { $set: m },
      upsert: true,
    },
  }));

  await ModulePrice.bulkWrite(ops);
  const all = await ModulePrice.find({ is_active: true }).sort({ category: 1, display_name: 1 });
  res.json(all);
}));

export default router;
