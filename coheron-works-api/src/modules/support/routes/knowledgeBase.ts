import express from 'express';
import { KbArticle, KbArticleRevision, KbArticleAttachment, TicketChannel, TicketCategory } from '../../../models/KbArticle.js';
import { SupportTicket } from '../../../models/SupportTicket.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// KNOWLEDGE BASE ARTICLES
// ============================================

// Get all articles
router.get('/articles', asyncHandler(async (req, res) => {
  const { status, category_id, is_public, search, article_type } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (category_id) filter.category_id = category_id;
  if (is_public !== undefined) filter.is_public = is_public === 'true';
  if (article_type) filter.article_type = article_type;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    KbArticle.find(filter)
      .populate('category_id', 'name')
      .populate('author_id', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, KbArticle
  );

  const data = await Promise.all(
    paginatedResult.data.map(async (a: any) => {
      const revision_count = await KbArticleRevision.countDocuments({ article_id: a._id });
      return {
        ...a,
        id: a._id,
        category_name: a.category_id?.name,
        author_name: a.author_id?.name,
        revision_count,
      };
    })
  );

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get article by ID or slug
router.get('/articles/:identifier', asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(identifier);

  const article = isObjectId
    ? await KbArticle.findById(identifier).lean()
    : await KbArticle.findOne({ slug: identifier }).lean();

  if (!article) {
    return res.status(404).json({ error: 'Article not found' });
  }

  const a: any = article;

  const [revisions, attachments] = await Promise.all([
    KbArticleRevision.find({ article_id: a._id })
      .populate('created_by', 'name')
      .sort({ revision_number: -1 })
      .lean(),
    KbArticleAttachment.find({ article_id: a._id })
      .populate('uploaded_by', 'name')
      .sort({ created_at: 1 })
      .lean(),
  ]);

  // Increment view count
  await KbArticle.findByIdAndUpdate(a._id, { $inc: { view_count: 1 } });

  res.json({
    ...a,
    id: a._id,
    revisions: revisions.map((r: any) => ({ ...r, id: r._id, created_by_name: r.created_by?.name })),
    attachments: attachments.map((att: any) => ({ ...att, id: att._id, uploaded_by_name: att.uploaded_by?.name })),
  });
}));

// Create article
router.post('/articles', asyncHandler(async (req, res) => {
  const { title, content, summary, category_id, parent_article_id, article_type, is_public, tags, meta_keywords, meta_description, author_id } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  const existingSlug = await KbArticle.findOne({ slug }).lean();
  if (existingSlug) {
    slug = `${slug}-${Date.now()}`;
  }

  const article = await KbArticle.create({
    title,
    slug,
    content,
    summary,
    category_id,
    parent_article_id,
    article_type: article_type || 'article',
    status: 'draft',
    is_public: is_public !== undefined ? is_public : true,
    tags: tags || [],
    meta_keywords,
    meta_description,
    author_id,
  });

  await KbArticleRevision.create({
    article_id: article._id,
    revision_number: 1,
    title,
    content,
    created_by: author_id,
  });

  res.status(201).json(article);
}));

// Update article
router.put('/articles/:id', asyncHandler(async (req, res) => {
  const { title, content, summary, category_id, status, is_public, tags, meta_keywords, meta_description } = req.body;
  const updateData: any = {};

  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (summary !== undefined) updateData.summary = summary;
  if (category_id !== undefined) updateData.category_id = category_id;
  if (status !== undefined) updateData.status = status;
  if (is_public !== undefined) updateData.is_public = is_public;
  if (tags !== undefined) updateData.tags = tags;
  if (meta_keywords !== undefined) updateData.meta_keywords = meta_keywords;
  if (meta_description !== undefined) updateData.meta_description = meta_description;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await KbArticle.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Article not found' });
  }

  if (content !== undefined || title !== undefined) {
    const maxRevision = await KbArticleRevision.findOne({ article_id: req.params.id }).sort({ revision_number: -1 }).lean();
    const nextRevision = (maxRevision?.revision_number || 0) + 1;

    await KbArticleRevision.create({
      article_id: req.params.id,
      revision_number: nextRevision,
      title: result.title,
      content: result.content,
      created_by: req.body.updated_by || null,
    });
  }

  res.json(result);
}));

// Rate article
router.post('/articles/:id/rate', asyncHandler(async (req, res) => {
  const { is_helpful } = req.body;

  if (is_helpful === true) {
    await KbArticle.findByIdAndUpdate(req.params.id, { $inc: { helpful_count: 1 } });
  } else if (is_helpful === false) {
    await KbArticle.findByIdAndUpdate(req.params.id, { $inc: { not_helpful_count: 1 } });
  }

  res.json({ message: 'Rating recorded' });
}));

// ============================================
// TICKET CHANNELS
// ============================================

// Get all channels
router.get('/channels', asyncHandler(async (req, res) => {
  const channels = await TicketChannel.find({ is_active: true }).sort({ name: 1 }).lean();
  res.json(channels);
}));

// Create channel
router.post('/channels', asyncHandler(async (req, res) => {
  const { name, channel_type, config } = req.body;

  if (!name || !channel_type) {
    return res.status(400).json({ error: 'Name and channel_type are required' });
  }

  const channel = await TicketChannel.create({
    name,
    channel_type,
    config: config || null,
  });

  res.status(201).json(channel);
}));

// ============================================
// TICKET CATEGORIES
// ============================================

// Get all categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await TicketCategory.find({ is_active: true }).lean();

  const categoriesWithCounts = await Promise.all(
    categories.map(async (cat: any) => {
      const [ticket_count, article_count] = await Promise.all([
        SupportTicket.countDocuments({ category_id: cat._id }),
        KbArticle.countDocuments({ category_id: cat._id }),
      ]);
      return { ...cat, id: cat._id, ticket_count, article_count };
    })
  );

  categoriesWithCounts.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  res.json(categoriesWithCounts);
}));

// Create category
router.post('/categories', asyncHandler(async (req, res) => {
  const { name, parent_id, description } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const category = await TicketCategory.create({ name, parent_id, description });
  res.status(201).json(category);
}));

export default router;
