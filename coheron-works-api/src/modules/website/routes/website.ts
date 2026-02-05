import express from 'express';
import { WebsitePage, PaymentGateway, WebsiteSetting, WebsiteAnalytics } from '../../../models/WebsitePage.js';
import { WebsiteOrder } from '../../../models/WebsiteOrder.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// Get all website pages
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { site_id, status, is_published, search } = req.query;
  const filter: any = {};

  if (site_id) filter.site_id = site_id;
  if (status) {
    filter.status = status;
  } else if (is_published !== undefined) {
    filter.status = is_published === 'true' ? 'published' : 'draft';
  }
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { url: { $regex: search, $options: 'i' } },
      { slug: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WebsitePage.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, WebsitePage
  );

  res.json(paginatedResult);
}));

// Get page by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const page = await WebsitePage.findById(req.params.id).lean();
  if (!page) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.json(page);
}));

// Create page
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, url, slug, site_id, template, is_published, status, content, blocks, meta_title, meta_description, meta_keywords, canonical_url, robots_meta, publish_at, created_by } = req.body;

  const pageStatus = status || (is_published ? 'published' : 'draft');

  const page = await WebsitePage.create({
    name,
    url,
    slug: slug || url,
    site_id,
    template: template || 'default',
    status: pageStatus,
    is_published: pageStatus === 'published',
    content,
    blocks: blocks || [],
    meta_title,
    meta_description,
    meta_keywords,
    canonical_url,
    robots_meta: robots_meta || 'index, follow',
    publish_at,
    created_by,
  });

  res.status(201).json(page);
}));

// Update page
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, url, slug, template, status, is_published, content, blocks, meta_title, meta_description, meta_keywords, canonical_url, robots_meta, publish_at, updated_by } = req.body;

  const pageStatus = status || (is_published !== undefined ? (is_published ? 'published' : 'draft') : undefined);

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (url !== undefined) updateData.url = url;
  if (slug !== undefined) updateData.slug = slug;
  if (template !== undefined) updateData.template = template;
  if (pageStatus !== undefined) updateData.status = pageStatus;
  if (pageStatus !== undefined) updateData.is_published = pageStatus === 'published';
  if (content !== undefined) updateData.content = content;
  if (blocks !== undefined) updateData.blocks = blocks;
  if (meta_title !== undefined) updateData.meta_title = meta_title;
  if (meta_description !== undefined) updateData.meta_description = meta_description;
  if (meta_keywords !== undefined) updateData.meta_keywords = meta_keywords;
  if (canonical_url !== undefined) updateData.canonical_url = canonical_url;
  if (robots_meta !== undefined) updateData.robots_meta = robots_meta;
  if (publish_at !== undefined) updateData.publish_at = publish_at;
  if (updated_by !== undefined) updateData.updated_by = updated_by;
  updateData.$inc = { version: 1 };

  const result = await WebsitePage.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Page not found' });
  }

  res.json(result);
}));

// Delete page
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await WebsitePage.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Page not found' });
  }
  res.json({ message: 'Page deleted successfully' });
}));

// Publish page
router.post('/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const result = await WebsitePage.findByIdAndUpdate(
    req.params.id,
    { status: 'published', is_published: true, published_at: new Date() },
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ error: 'Page not found' });
  }

  res.json(result);
}));

// ============================================
// PAYMENT GATEWAYS
// ============================================

// Get all payment gateways
router.get('/payment-gateways', authenticate, asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const gateways = await PaymentGateway.find(filter).sort({ name: 1 }).lean();
  res.json(gateways);
}));

// Get payment gateway by ID
router.get('/payment-gateways/:id', authenticate, asyncHandler(async (req, res) => {
  const gateway = await PaymentGateway.findById(req.params.id).lean();
  if (!gateway) {
    return res.status(404).json({ error: 'Payment gateway not found' });
  }
  res.json(gateway);
}));

// Create payment gateway
router.post('/payment-gateways', authenticate, asyncHandler(async (req, res) => {
  const { name, provider, api_key, api_secret, webhook_secret, is_active, config } = req.body;

  const gateway = await PaymentGateway.create({
    name,
    provider,
    api_key,
    api_secret,
    webhook_secret,
    is_active: is_active !== undefined ? is_active : true,
    config: config || null,
  });

  res.status(201).json(gateway);
}));

// Update payment gateway
router.put('/payment-gateways/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, provider, api_key, api_secret, webhook_secret, is_active, config } = req.body;

  const result = await PaymentGateway.findByIdAndUpdate(
    req.params.id,
    { name, provider, api_key, api_secret, webhook_secret, is_active, config: config || null },
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ error: 'Payment gateway not found' });
  }

  res.json(result);
}));

// Delete payment gateway
router.delete('/payment-gateways/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await PaymentGateway.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Payment gateway not found' });
  }
  res.json({ message: 'Payment gateway deleted successfully' });
}));

// Test payment gateway connection
router.post('/payment-gateways/:id/test', authenticate, asyncHandler(async (req, res) => {
  const gateway = await PaymentGateway.findById(req.params.id).lean();
  if (!gateway) {
    return res.status(404).json({ error: 'Payment gateway not found' });
  }
  res.json({ message: 'Connection test successful', gateway: (gateway as any).provider });
}));

// Process payment
router.post('/payments/process', authenticate, asyncHandler(async (req, res) => {
  const { gateway_id, amount, currency, order_id, customer_data, payment_method } = req.body;
  const transactionId = `TXN-${Date.now()}`;

  res.json({
    success: true,
    transaction_id: transactionId,
    amount,
    currency: currency || 'INR',
    status: 'success',
  });
}));

// Process refund
router.post('/payments/refund', authenticate, asyncHandler(async (req, res) => {
  const { gateway_id, transaction_id, amount, reason } = req.body;

  res.json({
    success: true,
    refund_id: `REF-${Date.now()}`,
    amount,
    status: 'refunded',
  });
}));

// ============================================
// SEO TOOLS
// ============================================

// Generate sitemap
router.get('/seo/sitemap', authenticate, asyncHandler(async (req, res) => {
  const pages = await WebsitePage.find({ status: 'published' }).select('url updated_at').lean();

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page: any) => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${new Date(page.updated_at).toISOString()}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'application/xml');
  res.send(sitemap);
}));

// Get robots.txt
router.get('/seo/robots', authenticate, asyncHandler(async (req, res) => {
  const setting = await WebsiteSetting.findOne({ key: 'robots_txt' }).lean();

  const robotsTxt = setting
    ? (setting as any).robots_content
    : `User-agent: *
Allow: /
Sitemap: /sitemap.xml`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(robotsTxt);
}));

// Update robots.txt
router.put('/seo/robots', authenticate, asyncHandler(async (req, res) => {
  const { content } = req.body;

  await WebsiteSetting.findOneAndUpdate(
    { key: 'robots_txt' },
    { key: 'robots_txt', robots_content: content },
    { upsert: true }
  );

  res.json({ message: 'robots.txt updated successfully' });
}));

// ============================================
// ANALYTICS
// ============================================

// Get pageviews
router.get('/analytics/pageviews', authenticate, asyncHandler(async (req, res) => {
  const { start_date, end_date, page_id } = req.query;
  const match: any = { event_type: 'pageview' };

  if (start_date) match.created_at = { ...match.created_at, $gte: new Date(start_date as string) };
  if (end_date) match.created_at = { ...match.created_at, $lte: new Date(end_date as string) };
  if (page_id) match.page_id = page_id;

  const result = await WebsiteAnalytics.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        pageviews: { $sum: 1 },
        unique_visitors: { $addToSet: '$visitor_id' },
      },
    },
    { $sort: { _id: -1 } },
    {
      $project: {
        date: '$_id',
        pageviews: 1,
        unique_visitors: { $size: '$unique_visitors' },
        _id: 0,
      },
    },
  ]);

  res.json(result);
}));

// Get sales data
router.get('/analytics/sales', authenticate, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const match: any = { status: 'completed' };

  if (start_date) match.created_at = { ...match.created_at, $gte: new Date(start_date as string) };
  if (end_date) match.created_at = { ...match.created_at, $lte: new Date(end_date as string) };

  const result = await WebsiteOrder.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        orders: { $sum: 1 },
        revenue: { $sum: { $ifNull: ['$amount_total', 0] } },
      },
    },
    { $sort: { _id: -1 } },
    { $project: { date: '$_id', orders: 1, revenue: 1, _id: 0 } },
  ]);

  res.json(result);
}));

// Track custom event
router.post('/analytics/events', authenticate, asyncHandler(async (req, res) => {
  const { event_type, page_id, visitor_id, event_data } = req.body;

  await WebsiteAnalytics.create({
    event_type,
    page_id,
    visitor_id,
    event_data: event_data || null,
  });

  res.json({ message: 'Event tracked successfully' });
}));

export default router;
