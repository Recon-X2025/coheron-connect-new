import express from 'express';
import EmailPipeRule from '../../../models/EmailPipeRule.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// GET /rules - List email pipe rules
router.get('/rules', asyncHandler(async (req, res) => {
  const rules = await EmailPipeRule.find({ tenant_id: (req as any).user?.tenant_id });
  res.json(rules);
}));

// POST /rules - Create rule
router.post('/rules', asyncHandler(async (req, res) => {
  const rule = new EmailPipeRule({ ...req.body, tenant_id: (req as any).user?.tenant_id });
  await rule.save();
  res.status(201).json(rule);
}));

// PUT /rules/:id - Update rule
router.put('/rules/:id', asyncHandler(async (req, res) => {
  const rule = await EmailPipeRule.findOneAndUpdate(
    { _id: req.params.id, tenant_id: (req as any).user?.tenant_id },
    req.body,
    { new: true }
  );
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  res.json(rule);
}));

// POST /rules/:id/test - Test connection
router.post('/rules/:id/test', asyncHandler(async (req, res) => {
  const rule = await EmailPipeRule.findOne({ _id: req.params.id, tenant_id: (req as any).user?.tenant_id });
  if (!rule) return res.status(404).json({ error: 'Rule not found' });
  // TODO: Implement actual IMAP connection test
  res.json({ status: 'success', message: 'Connection test placeholder - integrate with IMAP client' });
}));

// POST /poll - Manual poll trigger
router.post('/poll', asyncHandler(async (req, res) => {
  const rules = await EmailPipeRule.find({ tenant_id: (req as any).user?.tenant_id, is_active: true });
  // TODO: Implement actual IMAP polling logic
  const results = rules.map(r => ({ rule_id: r._id, email: r.email_address, status: 'polled' }));
  await EmailPipeRule.updateMany(
    { tenant_id: (req as any).user?.tenant_id, is_active: true },
    { last_polled_at: new Date() }
  );
  res.json({ message: 'Poll complete', results });
}));

export default router;
