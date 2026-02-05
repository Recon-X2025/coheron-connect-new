import express from 'express';
import KnowledgeSpace from '../../../models/KnowledgeSpace.js';
import WikiPage from '../../../models/WikiPage.js';
import WikiPageVersion from '../../../models/WikiPageVersion.js';
import WikiPageLabel from '../../../models/WikiPageLabel.js';
import WikiPageComment from '../../../models/WikiPageComment.js';
import WikiPageAttachment from '../../../models/WikiPageAttachment.js';
import WikiPagePermission from '../../../models/WikiPagePermission.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();
router.use(authenticate);

// ============================================
// KNOWLEDGE SPACES
// ============================================

router.get('/spaces', asyncHandler(async (req, res) => {
  const { project_id, is_public } = req.query;
  const filter: any = {};
  if (project_id) filter.$or = [{ project_id }, { project_id: null }];
  if (is_public !== undefined) filter.is_public = is_public === 'true';

  const spaces = await KnowledgeSpace.find(filter)
    .populate('project_id', 'name')
    .populate('created_by', 'name')
    .sort({ created_at: -1 })
    .lean();

  const result = await Promise.all(spaces.map(async (ks: any) => {
    const obj: any = { ...ks };
    if (obj.project_id) obj.project_name = obj.project_id.name;
    if (obj.created_by) obj.created_by_name = obj.created_by.name;
    obj.page_count = await WikiPage.countDocuments({ space_id: ks._id });
    return obj;
  }));

  res.json(result);
}));

router.get('/spaces/:id', asyncHandler(async (req, res) => {
  const space = await KnowledgeSpace.findById(req.params.id)
    .populate('project_id', 'name')
    .populate('created_by', 'name')
    .lean();

  if (!space) {
    return res.status(404).json({ error: 'Space not found' });
  }

  const obj: any = { ...space };
  if (obj.project_id) obj.project_name = obj.project_id.name;
  if (obj.created_by) obj.created_by_name = obj.created_by.name;

  res.json(obj);
}));

router.post('/spaces', asyncHandler(async (req, res) => {
  const { project_id, space_key, name, description, is_public, created_by } = req.body;

  if (!space_key || !name) {
    return res.status(400).json({ error: 'Space key and name are required' });
  }

  const space = await KnowledgeSpace.create({
    project_id, space_key, name, description,
    is_public: is_public !== undefined ? is_public : false,
    created_by,
  });

  res.status(201).json(space);
}));

router.put('/spaces/:id', asyncHandler(async (req, res) => {
  const { name, description, is_public } = req.body;
  const fields: Record<string, any> = { name, description, is_public };
  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const space = await KnowledgeSpace.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!space) return res.status(404).json({ error: 'Space not found' });
  res.json(space);
}));

router.delete('/spaces/:id', asyncHandler(async (req, res) => {
  const space = await KnowledgeSpace.findByIdAndDelete(req.params.id);
  if (!space) return res.status(404).json({ error: 'Space not found' });
  res.json({ message: 'Space deleted successfully' });
}));

// ============================================
// WIKI PAGES
// ============================================

router.get('/spaces/:spaceId/pages', asyncHandler(async (req, res) => {
  const { parent_page_id, page_type, is_published } = req.query;
  const filter: any = { space_id: req.params.spaceId };

  if (parent_page_id !== undefined) {
    filter.parent_page_id = (parent_page_id === null || parent_page_id === 'null') ? null : parent_page_id;
  }
  if (page_type) filter.page_type = page_type;
  if (is_published !== undefined) filter.is_published = is_published === 'true';

  const pages = await WikiPage.find(filter)
    .populate('created_by', 'name')
    .populate('updated_by', 'name')
    .sort({ created_at: -1 })
    .lean();

  const result = await Promise.all(pages.map(async (wp: any) => {
    const obj: any = { ...wp };
    if (obj.created_by) obj.created_by_name = obj.created_by.name;
    if (obj.updated_by) obj.updated_by_name = obj.updated_by.name;
    obj.comment_count = await WikiPageComment.countDocuments({ page_id: wp._id });
    return obj;
  }));

  res.json(result);
}));

router.get('/pages/:id', asyncHandler(async (req, res) => {
  const page = await WikiPage.findById(req.params.id)
    .populate('created_by', 'name')
    .populate('updated_by', 'name')
    .populate('space_id', 'name space_key')
    .lean();

  if (!page) return res.status(404).json({ error: 'Page not found' });

  const obj: any = { ...page };
  if (obj.created_by) obj.created_by_name = obj.created_by.name;
  if (obj.updated_by) obj.updated_by_name = obj.updated_by.name;
  if (obj.space_id) { obj.space_name = obj.space_id.name; obj.space_key = obj.space_id.space_key; }

  const children = await WikiPage.find({ parent_page_id: page._id }).sort({ title: 1 }).lean();
  const labels = await WikiPageLabel.find({ page_id: page._id }).lean();
  const attachments = await WikiPageAttachment.find({ page_id: page._id })
    .populate('uploaded_by', 'name').sort({ created_at: 1 }).lean();
  const comments = await WikiPageComment.find({ page_id: page._id })
    .populate('user_id', 'name email').sort({ created_at: 1 }).lean();
  const versions = await WikiPageVersion.find({ page_id: page._id })
    .populate('created_by', 'name').sort({ version: -1 }).lean();

  res.json({
    ...obj,
    children,
    labels: labels.map((l: any) => l.label),
    attachments: attachments.map((a: any) => {
      const aObj: any = { ...a };
      if (aObj.uploaded_by) aObj.uploaded_by_name = aObj.uploaded_by.name;
      return aObj;
    }),
    comments: comments.map((c: any) => {
      const cObj: any = { ...c };
      if (cObj.user_id) { cObj.user_name = cObj.user_id.name; cObj.user_email = cObj.user_id.email; }
      return cObj;
    }),
    versions: versions.map((v: any) => {
      const vObj: any = { ...v };
      if (vObj.created_by) vObj.created_by_name = vObj.created_by.name;
      return vObj;
    }),
  });
}));

router.post('/spaces/:spaceId/pages', asyncHandler(async (req, res) => {
  const { parent_page_id, title, content, page_type, template_id, is_published, created_by, updated_by } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  const page = await WikiPage.create({
    space_id: req.params.spaceId,
    parent_page_id, title, content,
    page_type: page_type || 'page',
    template_id,
    is_published: is_published !== undefined ? is_published : true,
    created_by,
    updated_by: updated_by || created_by,
  });

  await WikiPageVersion.create({
    page_id: page._id, version: 1, title, content, created_by,
  });

  res.status(201).json(page);
}));

router.put('/pages/:id', asyncHandler(async (req, res) => {
  const { parent_page_id, title, content, page_type, is_published, updated_by } = req.body;

  const currentPage = await WikiPage.findById(req.params.id);
  if (!currentPage) return res.status(404).json({ error: 'Page not found' });

  const fields: Record<string, any> = { parent_page_id, title, content, page_type, is_published, updated_by };
  const updateData: any = {};
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) updateData[key] = value;
  });

  if (content !== undefined || title !== undefined) {
    updateData.version = (currentPage.version || 1) + 1;
  }

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const page = await WikiPage.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if ((content !== undefined || title !== undefined) && updated_by) {
    const newVersion = (currentPage.version || 1) + 1;
    await WikiPageVersion.create({
      page_id: req.params.id,
      version: newVersion,
      title: title !== undefined ? title : currentPage.title,
      content: content !== undefined ? content : currentPage.content,
      created_by: updated_by,
    });
  }

  res.json(page);
}));

router.delete('/pages/:id', asyncHandler(async (req, res) => {
  const page = await WikiPage.findByIdAndDelete(req.params.id);
  if (!page) return res.status(404).json({ error: 'Page not found' });
  res.json({ message: 'Page deleted successfully' });
}));

// ============================================
// PAGE LABELS
// ============================================

router.post('/pages/:id/labels', asyncHandler(async (req, res) => {
  const { label } = req.body;
  const existing = await WikiPageLabel.findOne({ page_id: req.params.id, label });
  if (existing) return res.status(400).json({ error: 'Label already exists' });

  const result = await WikiPageLabel.create({ page_id: req.params.id, label });
  res.status(201).json(result);
}));

router.delete('/pages/:id/labels/:label', asyncHandler(async (req, res) => {
  const result = await WikiPageLabel.findOneAndDelete({ page_id: req.params.id, label: req.params.label });
  if (!result) return res.status(404).json({ error: 'Label not found' });
  res.json({ message: 'Label removed successfully' });
}));

// ============================================
// PAGE COMMENTS
// ============================================

router.post('/pages/:id/comments', asyncHandler(async (req, res) => {
  const { user_id, comment_text, parent_comment_id } = req.body;
  const comment = await WikiPageComment.create({
    page_id: req.params.id, user_id, comment_text, parent_comment_id,
  });
  res.status(201).json(comment);
}));

router.put('/page-comments/:id', asyncHandler(async (req, res) => {
  const { comment_text } = req.body;
  const comment = await WikiPageComment.findByIdAndUpdate(req.params.id, { comment_text }, { new: true });
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  res.json(comment);
}));

router.delete('/page-comments/:id', asyncHandler(async (req, res) => {
  const comment = await WikiPageComment.findByIdAndDelete(req.params.id);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  res.json({ message: 'Comment deleted successfully' });
}));

// ============================================
// PAGE PERMISSIONS
// ============================================

router.get('/pages/:id/permissions', asyncHandler(async (req, res) => {
  const perms = await WikiPagePermission.find({ page_id: req.params.id })
    .populate('user_id', 'name email').sort({ created_at: 1 }).lean();
  const rows = perms.map((p: any) => {
    const obj: any = { ...p };
    if (obj.user_id) { obj.user_name = obj.user_id.name; obj.user_email = obj.user_id.email; }
    return obj;
  });
  res.json(rows);
}));

router.post('/pages/:id/permissions', asyncHandler(async (req, res) => {
  const { user_id, permission_type } = req.body;
  const perm = await WikiPagePermission.findOneAndUpdate(
    { page_id: req.params.id, user_id },
    { page_id: req.params.id, user_id, permission_type: permission_type || 'read' },
    { upsert: true, new: true }
  );
  res.status(201).json(perm);
}));

router.delete('/pages/:id/permissions/:userId', asyncHandler(async (req, res) => {
  const result = await WikiPagePermission.findOneAndDelete({
    page_id: req.params.id, user_id: req.params.userId,
  });
  if (!result) return res.status(404).json({ error: 'Permission not found' });
  res.json({ message: 'Permission removed successfully' });
}));

// ============================================
// SEARCH
// ============================================

router.get('/pages/search', asyncHandler(async (req, res) => {
  const { q, space_id, label } = req.query;
  const filter: any = { is_published: true };

  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: 'i' } },
      { content: { $regex: q, $options: 'i' } },
    ];
  }
  if (space_id) filter.space_id = space_id;

  let pageIds: any = null;
  if (label) {
    const labelDocs = await WikiPageLabel.find({ label }).select('page_id').lean();
    pageIds = labelDocs.map((l: any) => l.page_id);
    filter._id = { $in: pageIds };
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WikiPage.find(filter)
      .populate('space_id', 'name')
      .populate('created_by', 'name')
      .sort({ updated_at: -1 })
      .lean(),
    pagination, filter, WikiPage
  );

  const data = paginatedResult.data.map((wp: any) => {
    const obj: any = { ...wp };
    if (obj.space_id) obj.space_name = obj.space_id.name;
    if (obj.created_by) obj.created_by_name = obj.created_by.name;
    return obj;
  });

  res.json({ data, pagination: paginatedResult.pagination });
}));

export default router;
