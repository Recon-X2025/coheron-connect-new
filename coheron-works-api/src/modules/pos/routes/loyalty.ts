import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { LoyaltyProgram } from '../models/LoyaltyProgram.js';
import { LoyaltyTier } from '../models/LoyaltyTier.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// --- Programs ---
router.get('/programs', authenticate, asyncHandler(async (req, res) => {
  const items = await LoyaltyProgram.find({ tenant_id: req.user?.tenant_id }).sort({ created_at: -1 }).lean();
  res.json(items);
}));

router.get('/programs/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await LoyaltyProgram.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!item) return res.status(404).json({ error: 'Program not found' });
  res.json(item);
}));

router.post('/programs', authenticate, asyncHandler(async (req, res) => {
  const item = await LoyaltyProgram.create({ ...req.body, tenant_id: req.user?.tenant_id, created_by: req.user?.userId });
  res.status(201).json(item);
}));

router.put('/programs/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await LoyaltyProgram.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { $set: req.body }, { new: true });
  if (!item) return res.status(404).json({ error: 'Program not found' });
  res.json(item);
}));

router.delete('/programs/:id', authenticate, asyncHandler(async (req, res) => {
  await LoyaltyProgram.deleteOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// --- Tiers ---
router.get('/tiers', authenticate, asyncHandler(async (req, res) => {
  const { program_id } = req.query;
  const filter: any = { tenant_id: req.user?.tenant_id };
  if (program_id) filter.program_id = program_id;
  const items = await LoyaltyTier.find(filter).sort({ min_points: 1 }).lean();
  res.json(items);
}));

router.post('/tiers', authenticate, asyncHandler(async (req, res) => {
  const item = await LoyaltyTier.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(item);
}));

router.put('/tiers/:id', authenticate, asyncHandler(async (req, res) => {
  const item = await LoyaltyTier.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { $set: req.body }, { new: true });
  if (!item) return res.status(404).json({ error: 'Tier not found' });
  res.json(item);
}));

router.delete('/tiers/:id', authenticate, asyncHandler(async (req, res) => {
  await LoyaltyTier.deleteOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// --- Transactions ---
router.post('/transactions/earn', authenticate, asyncHandler(async (req, res) => {
  const { program_id, customer_id, points, reference_type, reference_id, description } = req.body;
  // Get current balance
  const lastTx = await LoyaltyTransaction.findOne({ program_id, customer_id, tenant_id: req.user?.tenant_id }).sort({ created_at: -1 });
  const currentBalance = lastTx ? lastTx.balance_after : 0;
  const tx = await LoyaltyTransaction.create({
    tenant_id: req.user?.tenant_id,
    program_id, customer_id, type: 'earn', points,
    balance_after: currentBalance + points,
    reference_type, reference_id, description,
    created_by: req.user?.userId,
  });
  res.status(201).json(tx);
}));

router.post('/transactions/redeem', authenticate, asyncHandler(async (req, res) => {
  const { program_id, customer_id, points, reference_type, reference_id, description } = req.body;
  const lastTx = await LoyaltyTransaction.findOne({ program_id, customer_id, tenant_id: req.user?.tenant_id }).sort({ created_at: -1 });
  const currentBalance = lastTx ? lastTx.balance_after : 0;
  if (points > currentBalance) return res.status(400).json({ error: 'Insufficient points' });
  const tx = await LoyaltyTransaction.create({
    tenant_id: req.user?.tenant_id,
    program_id, customer_id, type: 'redeem', points: -points,
    balance_after: currentBalance - points,
    reference_type, reference_id, description,
    created_by: req.user?.userId,
  });
  res.status(201).json(tx);
}));

router.get('/customers/:customerId/balance', authenticate, asyncHandler(async (req, res) => {
  const lastTx = await LoyaltyTransaction.findOne({ customer_id: req.params.customerId, tenant_id: req.user?.tenant_id }).sort({ created_at: -1 });
  res.json({ balance: lastTx ? lastTx.balance_after : 0 });
}));

router.get('/customers/:customerId/history', authenticate, asyncHandler(async (req, res) => {
  const { page = '1', limit = '20' } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
  const items = await LoyaltyTransaction.find({ customer_id: req.params.customerId, tenant_id: req.user?.tenant_id })
    .sort({ created_at: -1 }).skip(skip).limit(parseInt(limit as string)).lean();
  res.json(items);
}));

export default router;
