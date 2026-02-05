import express from 'express';
import { CPQTemplate } from '../models/CPQTemplate.js';
import { CPQQuote } from '../models/CPQQuote.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// ===== TEMPLATES =====

router.get('/templates', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.is_active !== undefined) filter.is_active = req.query.is_active === 'true';
  const templates = await CPQTemplate.find(filter).sort({ created_at: -1 }).lean();
  res.json(templates);
}));

router.get('/templates/:id', authenticate, asyncHandler(async (req, res) => {
  const template = await CPQTemplate.findById(req.params.id).lean();
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

router.post('/templates', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const template = await CPQTemplate.create({ ...req.body, tenant_id: tenantId, created_by: userId });
  res.status(201).json(template);
}));

router.put('/templates/:id', authenticate, asyncHandler(async (req, res) => {
  const template = await CPQTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

router.delete('/templates/:id', authenticate, asyncHandler(async (req, res) => {
  await CPQTemplate.findByIdAndDelete(req.params.id);
  res.json({ success: true });
}));

// ===== QUOTES =====

router.get('/quotes', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const filter: any = tenantId ? { tenant_id: tenantId } : {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.lead_id) filter.lead_id = req.query.lead_id;
  const quotes = await CPQQuote.find(filter).sort({ created_at: -1 }).populate('lead_id', 'name email').lean();
  res.json(quotes);
}));

router.get('/quotes/:id', authenticate, asyncHandler(async (req, res) => {
  const quote = await CPQQuote.findById(req.params.id).populate('lead_id', 'name email').populate('template_id', 'name').lean();
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  res.json(quote);
}));

router.post('/quotes', authenticate, asyncHandler(async (req, res) => {
  const tenantId = (req as any).user?.tenant_id;
  const userId = (req as any).user?.userId;
  const quoteNumber = `CPQ-${Date.now().toString(36).toUpperCase()}`;
  // Calculate totals
  const lines = (req.body.lines || []).map((l: any) => {
    const total = (l.quantity || 1) * (l.unit_price || 0) * (1 - (l.discount_pct || 0) / 100);
    return { ...l, total };
  });
  const subtotal = lines.reduce((s: number, l: any) => s + l.total, 0);
  const discount_total = lines.reduce((s: number, l: any) => s + ((l.quantity || 1) * (l.unit_price || 0) * (l.discount_pct || 0) / 100), 0);
  const tax_total = req.body.tax_total || 0;
  const grand_total = subtotal + tax_total;
  const quote = await CPQQuote.create({
    ...req.body, lines, subtotal, discount_total, tax_total, grand_total,
    quote_number: quoteNumber, tenant_id: tenantId, created_by: userId,
  });
  res.status(201).json(quote);
}));

router.put('/quotes/:id', authenticate, asyncHandler(async (req, res) => {
  const quote = await CPQQuote.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  res.json(quote);
}));

router.post('/quotes/:id/send', authenticate, asyncHandler(async (req, res) => {
  const quote = await CPQQuote.findByIdAndUpdate(req.params.id, { status: 'sent' }, { new: true });
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  res.json(quote);
}));

router.post('/quotes/:id/accept', authenticate, asyncHandler(async (req, res) => {
  const quote = await CPQQuote.findByIdAndUpdate(req.params.id, { status: 'accepted' }, { new: true });
  if (!quote) return res.status(404).json({ error: 'Quote not found' });
  res.json(quote);
}));

export default router;
