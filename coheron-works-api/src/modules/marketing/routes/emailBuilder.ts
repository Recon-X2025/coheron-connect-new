import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { EmailTemplate } from '../models/EmailTemplate.js';

const router = express.Router();

// List templates
router.get('/templates', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenant_id;
  const { category, search, tag, page = 1, limit = 20 } = req.query;

  const filter: any = { tenant_id: tenantId };
  if (category) filter.category = category;
  if (tag) filter.tags = tag;
  if (search) filter.name = { $regex: search, $options: 'i' };

  const templates = await EmailTemplate.find(filter)
    .select('name subject category is_active tags thumbnail_url created_at updated_at')
    .sort({ updated_at: -1 })
    .limit(Number(limit))
    .skip((Number(page) - 1) * Number(limit))
    .lean();

  const total = await EmailTemplate.countDocuments(filter);
  res.json({ templates, total, page: Number(page), limit: Number(limit) });
}));

// Get template by ID
router.get('/templates/:id', asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

// Create template
router.post('/templates', asyncHandler(async (req, res) => {
  const { name, subject, category, blocks, html_preview, tags } = req.body;

  const template = await EmailTemplate.create({
    tenant_id: req.user?.tenant_id,
    name,
    subject,
    category: category || 'general',
    blocks: blocks || [],
    html_preview: html_preview || '',
    tags: tags || [],
    created_by: req.user?.userId,
  });

  res.status(201).json(template);
}));

// Update template
router.put('/templates/:id', asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { $set: req.body },
    { new: true },
  );
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json(template);
}));

// Delete template
router.delete('/templates/:id', asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });
  res.json({ message: 'Template deleted successfully' });
}));

// Render preview - converts blocks to HTML
router.post('/templates/:id/preview', asyncHandler(async (req, res) => {
  const template = await EmailTemplate.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });

  const blocks = req.body.blocks || template.blocks;
  const html = renderBlocksToHtml(blocks, template.subject);

  // Save preview
  template.html_preview = html;
  await template.save();

  res.json({ html, subject: template.subject });
}));

// Clone template
router.post('/templates/:id/clone', asyncHandler(async (req, res) => {
  const original = await EmailTemplate.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!original) return res.status(404).json({ error: 'Template not found' });

  const { _id, created_at, updated_at, ...data } = original as any;
  data.name = `${data.name} (Copy)`;
  data.created_by = req.user?.userId;

  const clone = await EmailTemplate.create(data);
  res.status(201).json(clone);
}));

// Send test email
router.post('/templates/:id/send-test', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required' });

  const template = await EmailTemplate.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!template) return res.status(404).json({ error: 'Template not found' });

  // TODO: Integrate with email service
  res.json({ message: `Test email queued for ${email}`, subject: template.subject });
}));

function renderBlocksToHtml(blocks: any[], subject: string): string {
  let body = '';
  const sorted = [...blocks].sort((a, b) => a.order - b.order);

  for (const block of sorted) {
    const s = block.styles || {};
    switch (block.type) {
      case 'header':
        body += `<h1 style="margin:0;padding:20px;font-size:${s.fontSize || '28px'};color:${s.color || '#333'};text-align:${s.textAlign || 'center'};background:${s.background || 'transparent'}">${block.content.text || ''}</h1>`;
        break;
      case 'text':
        body += `<div style="padding:16px 24px;font-size:${s.fontSize || '16px'};color:${s.color || '#555'};line-height:1.6">${block.content.text || ''}</div>`;
        break;
      case 'image':
        body += `<div style="text-align:center;padding:16px"><img src="${block.content.src || ''}" alt="${block.content.alt || ''}" style="max-width:100%;border-radius:${s.borderRadius || '0'}" /></div>`;
        break;
      case 'button':
        body += `<div style="text-align:center;padding:16px"><a href="${block.content.url || '#'}" style="display:inline-block;padding:12px 32px;background:${s.background || '#00C971'};color:${s.color || '#fff'};border-radius:${s.borderRadius || '6px'};text-decoration:none;font-weight:600">${block.content.text || 'Click Here'}</a></div>`;
        break;
      case 'divider':
        body += `<hr style="border:none;border-top:1px solid ${s.color || '#eee'};margin:16px 24px" />`;
        break;
      case 'social':
        body += `<div style="text-align:center;padding:16px">${(block.content.links || []).map((l: any) => `<a href="${l.url}" style="margin:0 8px;color:${s.color || '#555'}">${l.platform}</a>`).join('')}</div>`;
        break;
      case 'spacer':
        body += `<div style="height:${s.height || '24px'}"></div>`;
        break;
      default:
        body += `<div style="padding:16px">${block.content.html || ''}</div>`;
    }
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${subject}</title></head><body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4"><div style="max-width:600px;margin:0 auto;background:#fff">${body}</div></body></html>`;
}

export default router;
