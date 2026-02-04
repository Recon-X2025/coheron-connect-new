import express from 'express';
import Subscription from '../../../models/Subscription.js';
import SubscriptionLog from '../../../models/SubscriptionLog.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import subscriptionService from '../../../services/subscriptionService.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET / - List subscriptions
router.get('/', authenticate, asyncHandler(async (req: any, res) => {
  const pagination = getPaginationParams(req.query);
  const filter: any = { tenant_id: req.user.tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.customer_id) filter.customer_id = req.query.customer_id;
  const result = await paginateQuery(Subscription.find(filter).populate('customer_id').sort({ created_at: -1 }).lean(), pagination, filter, Subscription);
  res.json(result);
}));

// POST / - Create subscription
router.post('/', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await Subscription.create({ ...req.body, tenant_id: req.user.tenant_id, created_by: req.user._id });
  await SubscriptionLog.create({ tenant_id: req.user.tenant_id, subscription_id: sub._id, event_type: 'created', created_by: req.user._id });
  res.status(201).json(sub);
}));

// GET /:id
router.get('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await Subscription.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('customer_id');
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
}));

// PUT /:id
router.put('/:id', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await Subscription.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user.tenant_id }, req.body, { new: true });
  if (!sub) return res.status(404).json({ error: 'Not found' });
  res.json(sub);
}));

// POST /:id/activate
router.post('/:id/activate', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await subscriptionService.activateSubscription(req.params.id);
  res.json(sub);
}));

// POST /:id/pause
router.post('/:id/pause', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await subscriptionService.pauseSubscription(req.params.id);
  res.json(sub);
}));

// POST /:id/resume
router.post('/:id/resume', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await subscriptionService.resumeSubscription(req.params.id);
  res.json(sub);
}));

// POST /:id/cancel
router.post('/:id/cancel', authenticate, asyncHandler(async (req: any, res) => {
  const sub = await subscriptionService.cancelSubscription(req.params.id);
  res.json(sub);
}));

// POST /:id/generate-invoice
router.post('/:id/generate-invoice', authenticate, asyncHandler(async (req: any, res) => {
  const invoice = await subscriptionService.generateInvoice(req.params.id);
  res.status(201).json(invoice);
}));

// GET /:id/logs
router.get('/:id/logs', asyncHandler(async (req: any, res) => {
  const logs = await SubscriptionLog.find({ subscription_id: req.params.id }).sort({ created_at: -1 });
  res.json(logs);
}));

// POST /process-renewals
router.post('/process-renewals', authenticate, asyncHandler(async (req: any, res) => {
  const results = await subscriptionService.processRenewals(req.user.tenant_id);
  res.json({ processed: results.length, results });
}));

export default router;
