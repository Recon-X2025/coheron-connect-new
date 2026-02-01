import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import APIKey from '../models/APIKey.js';

const router = Router();

// API Reference
router.get('/api-reference', asyncHandler(async (_req: Request, res: Response) => {
  const modules = [
    { module: 'CRM', endpoints: [
      { method: 'GET', path: '/api/crm/leads', description: 'List leads' },
      { method: 'POST', path: '/api/crm/leads', description: 'Create lead' },
      { method: 'GET', path: '/api/crm/contacts', description: 'List contacts' },
      { method: 'GET', path: '/api/crm/deals', description: 'List deals' },
      { method: 'POST', path: '/api/crm/deals', description: 'Create deal' },
    ]},
    { module: 'Sales', endpoints: [
      { method: 'GET', path: '/api/sales/quotes', description: 'List quotes' },
      { method: 'GET', path: '/api/sales/orders', description: 'List orders' },
      { method: 'GET', path: '/api/sales/invoices', description: 'List invoices' },
    ]},
    { module: 'Inventory', endpoints: [
      { method: 'GET', path: '/api/inventory/items', description: 'List items' },
      { method: 'GET', path: '/api/inventory/warehouses', description: 'List warehouses' },
      { method: 'POST', path: '/api/inventory/stock-adjustments', description: 'Adjust stock' },
    ]},
    { module: 'HR', endpoints: [
      { method: 'GET', path: '/api/hr/employees', description: 'List employees' },
      { method: 'GET', path: '/api/hr/attendance', description: 'Get attendance records' },
      { method: 'GET', path: '/api/hr/leaves', description: 'List leave requests' },
    ]},
    { module: 'Accounting', endpoints: [
      { method: 'GET', path: '/api/accounting/accounts', description: 'List chart of accounts' },
      { method: 'GET', path: '/api/accounting/journal-entries', description: 'List journal entries' },
      { method: 'GET', path: '/api/accounting/payments', description: 'List payments' },
    ]},
    { module: 'Support', endpoints: [
      { method: 'GET', path: '/api/support/tickets', description: 'List tickets' },
      { method: 'POST', path: '/api/support/tickets', description: 'Create ticket' },
    ]},
    { module: 'Projects', endpoints: [
      { method: 'GET', path: '/api/projects', description: 'List projects' },
      { method: 'GET', path: '/api/projects/tasks', description: 'List tasks' },
    ]},
    { module: 'Platform', endpoints: [
      { method: 'GET', path: '/api/platform/workflows', description: 'List workflows' },
      { method: 'GET', path: '/api/platform/visual-workflows', description: 'List visual workflows' },
      { method: 'GET', path: '/api/platform/webhooks', description: 'List webhook subscriptions' },
      { method: 'GET', path: '/api/platform/api-builder', description: 'List custom APIs' },
    ]},
  ];
  res.json(modules);
}));

// SDKs
router.get('/sdks', asyncHandler(async (_req: Request, res: Response) => {
  res.json([
    { language: 'JavaScript', install: 'npm install @coheron/sdk', repo: 'https://github.com/coheron/js-sdk', sample: "const Coheron = require('@coheron/sdk');\nconst client = new Coheron({ apiKey: 'YOUR_KEY' });\nconst leads = await client.crm.leads.list();" },
    { language: 'Python', install: 'pip install coheron-sdk', repo: 'https://github.com/coheron/python-sdk', sample: "from coheron import Coheron\nclient = Coheron(api_key='YOUR_KEY')\nleads = client.crm.leads.list()" },
    { language: 'cURL', install: null, repo: null, sample: "curl -H 'Authorization: Bearer YOUR_KEY' \\\n  https://api.coheron.works/api/crm/leads" },
  ]);
}));

// Create API Key
router.post('/api-keys', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const rawKey = 'ck_' + crypto.randomBytes(32).toString('hex');
  const key_hash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const prefix = rawKey.substring(0, 11);
  const apiKey = await APIKey.create({
    ...req.body, tenant_id, key_hash, prefix,
    created_by: (req as any).user?.userId,
  });
  res.status(201).json({ ...apiKey.toJSON(), key: rawKey });
}));

// List API Keys
router.get('/api-keys', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const keys = await APIKey.find({ tenant_id }).select('-key_hash').sort({ created_at: -1 });
  res.json(keys);
}));

// Delete API Key
router.delete('/api-keys/:id', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  await APIKey.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// Rate limits
router.get('/rate-limits', asyncHandler(async (req: Request, res: Response) => {
  const tenant_id = (req as any).user?.tenant_id;
  const keys = await APIKey.find({ tenant_id, is_active: true }).select('name prefix rate_limit_per_minute last_used_at');
  res.json({ default_limit: 60, keys: keys.map(k => ({ name: k.name, prefix: k.prefix, rate_limit: k.rate_limit_per_minute, last_used: k.last_used_at })) });
}));

// Changelog
router.get('/changelog', asyncHandler(async (_req: Request, res: Response) => {
  res.json([
    { version: '2.5.0', date: '2026-02-01', changes: ['Added Visual Workflow Builder with drag-and-drop canvas', 'Added API Builder for custom endpoints', 'Added Webhook Manager with retry policies', 'Added Developer Portal with SDK docs'] },
    { version: '2.4.0', date: '2026-01-15', changes: ['Marketplace app installation flow', 'Workflow Designer improvements', 'Localization support for 40+ languages'] },
    { version: '2.3.0', date: '2026-01-01', changes: ['AI module with assistant and predictions', 'No-code form builder', 'Security dashboard enhancements'] },
  ]);
}));

export default router;
