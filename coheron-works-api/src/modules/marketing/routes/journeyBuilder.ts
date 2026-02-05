import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { Journey } from '../models/Journey.js';
import { JourneyEnrollment } from '../models/JourneyEnrollment.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

const JOURNEY_TEMPLATES = [
  { name: 'Welcome Series', description: 'Onboard new contacts with a 5-step welcome sequence', trigger: { type: 'list_membership', config: { list: 'new_subscribers' } }, nodes: [
    { id: 'n1', type: 'email', position: { x: 250, y: 50 }, config: { template: 'welcome_email', subject: 'Welcome!' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n2', type: 'wait', position: { x: 250, y: 150 }, config: { duration: 2, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n3', type: 'email', position: { x: 250, y: 250 }, config: { template: 'getting_started', subject: 'Getting Started' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n4', type: 'wait', position: { x: 250, y: 350 }, config: { duration: 3, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n5', type: 'condition', position: { x: 250, y: 450 }, config: { field: 'email_opened', operator: 'eq', value: true }, stats: { entered: 0, completed: 0, failed: 0 } },
  ], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }, { source: 'n3', target: 'n4' }, { source: 'n4', target: 'n5' }] },
  { name: 'Re-engagement', description: 'Win back inactive contacts', trigger: { type: 'date_based', config: { inactive_days: 30 } }, nodes: [
    { id: 'n1', type: 'email', position: { x: 250, y: 50 }, config: { subject: 'We miss you!' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n2', type: 'wait', position: { x: 250, y: 150 }, config: { duration: 5, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n3', type: 'condition', position: { x: 250, y: 250 }, config: { field: 'email_opened', operator: 'eq', value: true }, stats: { entered: 0, completed: 0, failed: 0 } },
  ], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }] },
  { name: 'Abandoned Cart', description: 'Recover abandoned shopping carts', trigger: { type: 'api', config: { event: 'cart_abandoned' } }, nodes: [
    { id: 'n1', type: 'wait', position: { x: 250, y: 50 }, config: { duration: 1, unit: 'hours' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n2', type: 'email', position: { x: 250, y: 150 }, config: { subject: 'You left something behind' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n3', type: 'wait', position: { x: 250, y: 250 }, config: { duration: 24, unit: 'hours' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n4', type: 'sms', position: { x: 250, y: 350 }, config: { message: 'Complete your purchase!' }, stats: { entered: 0, completed: 0, failed: 0 } },
  ], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }, { source: 'n3', target: 'n4' }] },
  { name: 'Event Follow-up', description: 'Follow up after event attendance', trigger: { type: 'event_registration', config: {} }, nodes: [
    { id: 'n1', type: 'email', position: { x: 250, y: 50 }, config: { subject: 'Thanks for attending!' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n2', type: 'wait', position: { x: 250, y: 150 }, config: { duration: 2, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n3', type: 'add_to_list', position: { x: 250, y: 250 }, config: { list: 'event_attendees' }, stats: { entered: 0, completed: 0, failed: 0 } },
  ], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }] },
  { name: 'Lead Nurture', description: 'Nurture leads through the funnel', trigger: { type: 'form_submit', config: {} }, nodes: [
    { id: 'n1', type: 'email', position: { x: 250, y: 50 }, config: { subject: 'Your guide is ready' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n2', type: 'wait', position: { x: 250, y: 150 }, config: { duration: 3, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n3', type: 'email', position: { x: 250, y: 250 }, config: { subject: 'Case study' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n4', type: 'wait', position: { x: 250, y: 350 }, config: { duration: 4, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n5', type: 'internal_notification', position: { x: 250, y: 450 }, config: { message: 'Lead ready for sales' }, stats: { entered: 0, completed: 0, failed: 0 } },
  ], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }, { source: 'n3', target: 'n4' }, { source: 'n4', target: 'n5' }] },
  { name: 'Upsell', description: 'Cross-sell and upsell to existing customers', trigger: { type: 'tag_added', config: { tag: 'customer' } }, nodes: [
    { id: 'n1', type: 'wait', position: { x: 250, y: 50 }, config: { duration: 7, unit: 'days' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n2', type: 'email', position: { x: 250, y: 150 }, config: { subject: 'Unlock more features' }, stats: { entered: 0, completed: 0, failed: 0 } },
    { id: 'n3', type: 'condition', position: { x: 250, y: 250 }, config: { field: 'plan', operator: 'neq', value: 'enterprise' }, stats: { entered: 0, completed: 0, failed: 0 } },
  ], edges: [{ source: 'n1', target: 'n2' }, { source: 'n2', target: 'n3' }] },
];

// List journeys
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { status, search, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const journeys = await Journey.find(filter).sort({ updated_at: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).lean();
  const total = await Journey.countDocuments(filter);
  res.json({ journeys, total, page: Number(page), limit: Number(limit) });
}));

// Get templates
router.get('/templates', authenticate, asyncHandler(async (_req, res) => {
  res.json({ templates: JOURNEY_TEMPLATES });
}));

// Get journey by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const journey = await Journey.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json(journey);
}));

// Create journey
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const journey = await Journey.create({ ...req.body, tenant_id: req.user?.tenant_id, created_by: req.user?.userId });
  res.status(201).json(journey);
}));

// Update journey
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const journey = await Journey.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, req.body, { new: true }).lean();
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json(journey);
}));

// Delete journey
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await Journey.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// Activate journey
router.post('/:id/activate', authenticate, asyncHandler(async (req, res) => {
  const journey = await Journey.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { status: 'active' }, { new: true }).lean();
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json(journey);
}));

// Pause journey
router.post('/:id/pause', authenticate, asyncHandler(async (req, res) => {
  const journey = await Journey.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, { status: 'paused' }, { new: true }).lean();
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  res.json(journey);
}));

// Enroll contacts
router.post('/:id/enroll', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { contact_ids } = req.body;
  const journey = await Journey.findOne({ _id: req.params.id, tenant_id });
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  const enrollments = await JourneyEnrollment.insertMany(
    contact_ids.map((cid: string) => ({
      tenant_id, journey_id: req.params.id, contact_id: cid, status: 'active',
      current_node_id: journey.nodes?.[0]?.id, enrolled_at: new Date(),
    }))
  );
  await Journey.updateOne({ _id: req.params.id }, { $inc: { enrolled_count: contact_ids.length } });
  res.status(201).json({ enrolled: enrollments.length });
}));

// Get enrollments
router.get('/:id/enrollments', authenticate, asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 50 } = req.query;
  const filter: any = { tenant_id: req.user?.tenant_id, journey_id: req.params.id };
  if (status) filter.status = status;
  const enrollments = await JourneyEnrollment.find(filter).sort({ enrolled_at: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).lean();
  const total = await JourneyEnrollment.countDocuments(filter);
  res.json({ enrollments, total });
}));

// Analytics
router.get('/:id/analytics', authenticate, asyncHandler(async (req, res) => {
  const journey = await Journey.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!journey) return res.status(404).json({ error: 'Journey not found' });
  const statusCounts = await JourneyEnrollment.aggregate([
    { $match: { journey_id: req.params.id, tenant_id: req.user?.tenant_id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  res.json({
    enrolled_count: journey.enrolled_count,
    goal_achieved_count: journey.goal_achieved_count,
    conversion_rate: journey.conversion_rate,
    node_stats: journey.nodes?.map(n => ({ id: n.id, type: n.type, stats: n.stats })) || [],
    status_breakdown: statusCounts,
  });
}));

export default router;
