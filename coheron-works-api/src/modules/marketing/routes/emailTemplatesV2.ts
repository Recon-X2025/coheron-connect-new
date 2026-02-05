import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { EmailTemplateV2 } from '../models/EmailTemplateV2.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

const STARTER_TEMPLATES = [
  { name: 'Minimal Newsletter', category: 'newsletter', blocks: [
    { id: 's1', type: 'header', content: { text: 'Your Newsletter', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 's2', type: 'divider', content: {}, styles: {}, order: 1 },
    { id: 's3', type: 'text', content: { html: '<p>Your content here...</p>' }, styles: {}, order: 2 },
    { id: 's4', type: 'button', content: { text: 'Read More', url: '#' }, styles: { backgroundColor: '#00C971' }, order: 3 },
  ]},
  { name: 'Product Launch', category: 'promotional', blocks: [
    { id: 's1', type: 'image', content: { src: '', alt: 'Hero Image' }, styles: { width: '100%' }, order: 0 },
    { id: 's2', type: 'header', content: { text: 'Introducing Our New Product', level: 'h1' }, styles: { textAlign: 'center' }, order: 1 },
    { id: 's3', type: 'text', content: { html: '<p>Describe your product...</p>' }, styles: {}, order: 2 },
    { id: 's4', type: 'product_card', content: { name: 'Product Name', price: '$99', image: '' }, styles: {}, order: 3 },
    { id: 's5', type: 'button', content: { text: 'Shop Now', url: '#' }, styles: { backgroundColor: '#00C971' }, order: 4 },
  ]},
  { name: 'Event Invitation', category: 'event', blocks: [
    { id: 's1', type: 'header', content: { text: 'You\'re Invited!', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 's2', type: 'image', content: { src: '', alt: 'Event' }, styles: { width: '100%' }, order: 1 },
    { id: 's3', type: 'text', content: { html: '<p>Event details...</p>' }, styles: {}, order: 2 },
    { id: 's4', type: 'countdown', content: { targetDate: '' }, styles: {}, order: 3 },
    { id: 's5', type: 'button', content: { text: 'Register Now', url: '#' }, styles: { backgroundColor: '#00C971' }, order: 4 },
  ]},
  { name: 'Welcome Email', category: 'automated', blocks: [
    { id: 's1', type: 'header', content: { text: 'Welcome to {{company}}!', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 's2', type: 'text', content: { html: '<p>Hi {{first_name}}, thanks for signing up.</p>' }, styles: {}, order: 1 },
    { id: 's3', type: 'columns', content: { columns: [{ html: 'Feature 1' }, { html: 'Feature 2' }] }, styles: {}, order: 2 },
    { id: 's4', type: 'button', content: { text: 'Get Started', url: '#' }, styles: { backgroundColor: '#00C971' }, order: 3 },
  ]},
  { name: 'Order Confirmation', category: 'transactional', blocks: [
    { id: 's1', type: 'header', content: { text: 'Order Confirmed', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 's2', type: 'text', content: { html: '<p>Order #{{order_id}}</p>' }, styles: {}, order: 1 },
    { id: 's3', type: 'divider', content: {}, styles: {}, order: 2 },
    { id: 's4', type: 'text', content: { html: '<p>Your items will be shipped shortly.</p>' }, styles: {}, order: 3 },
  ]},
  { name: 'Weekly Digest', category: 'newsletter', blocks: [
    { id: 's1', type: 'header', content: { text: 'Weekly Digest', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 's2', type: 'text', content: { html: '<p>This week\'s highlights</p>' }, styles: {}, order: 1 },
    { id: 's3', type: 'columns', content: { columns: [{ html: 'Article 1' }, { html: 'Article 2' }] }, styles: {}, order: 2 },
    { id: 's4', type: 'social', content: { links: { twitter: '#', linkedin: '#', facebook: '#' } }, styles: {}, order: 3 },
  ]},
  { name: 'Sale Announcement', category: 'promotional', blocks: [
    { id: 's1', type: 'header', content: { text: 'SALE: Up to 50% Off!', level: 'h1' }, styles: { textAlign: 'center', color: '#ff4444' }, order: 0 },
    { id: 's2', type: 'countdown', content: { targetDate: '' }, styles: {}, order: 1 },
    { id: 's3', type: 'columns', content: { columns: [{ html: 'Deal 1' }, { html: 'Deal 2' }] }, styles: {}, order: 2 },
    { id: 's4', type: 'button', content: { text: 'Shop the Sale', url: '#' }, styles: { backgroundColor: '#ff4444' }, order: 3 },
  ]},
  { name: 'Re-engagement', category: 'automated', blocks: [
    { id: 's1', type: 'header', content: { text: 'We Miss You!', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 's2', type: 'text', content: { html: '<p>It\'s been a while since we\'ve heard from you.</p>' }, styles: {}, order: 1 },
    { id: 's3', type: 'button', content: { text: 'Come Back', url: '#' }, styles: { backgroundColor: '#00C971' }, order: 2 },
  ]},
];

// List templates
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { category, search, tag, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (search) filter.name = { $regex: search, $options: 'i' };
  const templates = await EmailTemplateV2.find(filter).sort({ updated_at: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).lean();
  const total = await EmailTemplateV2.countDocuments(filter);
  res.json({ templates, total, page: Number(page), limit: Number(limit) });
}));

// Categories
router.get('/categories', authenticate, asyncHandler(async (_req, res) => {
  res.json({ categories: ['newsletter', 'promotional', 'transactional', 'automated', 'event'] });
}));

// Starter templates
router.get('/starter-templates', authenticate, asyncHandler(async (_req, res) => {
  res.json({ templates: STARTER_TEMPLATES });
}));

// Get template by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const template = await EmailTemplateV2.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

// Create template
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const template = await EmailTemplateV2.create({ ...req.body, tenant_id: req.user?.tenant_id, created_by: req.user?.userId });
  res.status(201).json(template);
}));

// Update template
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const template = await EmailTemplateV2.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, req.body, { new: true }).lean();
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

// Delete template
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  await EmailTemplateV2.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// Duplicate template
router.post('/:id/duplicate', authenticate, asyncHandler(async (req, res) => {
  const original = await EmailTemplateV2.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!original) return res.status(404).json({ error: 'Template not found' });
  const { _id, id, created_at, updated_at, ...rest } = original as any;
  const duplicate = await EmailTemplateV2.create({ ...rest, name: `${rest.name} (Copy)`, is_published: false, open_rate: 0, click_rate: 0, usage_count: 0 });
  res.status(201).json(duplicate);
}));

// Send test email
router.post('/:id/send-test', authenticate, asyncHandler(async (req, res) => {
  const template = await EmailTemplateV2.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  // In production, integrate with email service
  res.json({ success: true, message: `Test email queued for ${req.body.email || 'default recipient'}` });
}));

export default router;
