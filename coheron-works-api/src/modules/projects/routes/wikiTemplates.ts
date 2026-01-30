import express from 'express';
import WikiTemplate from '../../../models/WikiTemplate.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// ============================================
// WIKI PAGE TEMPLATES CRUD
// ============================================

// Get all templates
router.get('/wiki/templates', asyncHandler(async (req, res) => {
  const { space_id, template_type, is_system } = req.query;
  const filter: any = {};

  if (space_id) {
    filter.$or = [{ space_id }, { space_id: null }];
  }
  if (template_type) filter.template_type = template_type;
  if (is_system !== undefined) filter.is_system = is_system === 'true';

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    WikiTemplate.find(filter)
      .populate('created_by', 'name')
      .populate('space_id', 'name')
      .sort({ is_system: -1, created_at: -1 })
      .lean(),
    pagination, filter, WikiTemplate
  );

  const data = paginatedResult.data.map((t: any) => ({
    ...t,
    created_by_name: t.created_by?.name,
    space_name: t.space_id?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get template by ID
router.get('/wiki/templates/:id', asyncHandler(async (req, res) => {
  const template = await WikiTemplate.findById(req.params.id)
    .populate('created_by', 'name')
    .populate('space_id', 'name')
    .lean();

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const result = {
    ...template,
    created_by_name: (template.created_by as any)?.name,
    space_name: (template.space_id as any)?.name,
  };

  res.json(result);
}));

// Create template
router.post('/wiki/templates', asyncHandler(async (req, res) => {
  const { space_id, name, description, template_content, template_type, is_system, created_by } = req.body;

  if (!name || !template_content) {
    return res.status(400).json({ error: 'Name and template_content are required' });
  }

  const template = await WikiTemplate.create({
    space_id,
    name,
    description,
    template_content,
    template_type,
    is_system: is_system !== undefined ? is_system : false,
    created_by,
  });

  res.status(201).json(template);
}));

// Update template
router.put('/wiki/templates/:id', asyncHandler(async (req, res) => {
  const { name, description, template_content, template_type, is_system } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (template_content !== undefined) updateData.template_content = template_content;
  if (template_type !== undefined) updateData.template_type = template_type;
  if (is_system !== undefined) updateData.is_system = is_system;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const template = await WikiTemplate.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  res.json(template);
}));

// Delete template
router.delete('/wiki/templates/:id', asyncHandler(async (req, res) => {
  const template = await WikiTemplate.findById(req.params.id).lean();

  if (!template) {
    return res.status(404).json({ error: 'Template not found' });
  }

  if ((template as any).is_system) {
    return res.status(400).json({ error: 'Cannot delete system template' });
  }

  await WikiTemplate.findByIdAndDelete(req.params.id);
  res.json({ message: 'Template deleted successfully' });
}));

// Get template types (for dropdowns)
router.get('/wiki/templates/types', asyncHandler(async (req, res) => {
  const result = await WikiTemplate.aggregate([
    { $match: { template_type: { $ne: null } } },
    { $group: { _id: '$template_type', count: { $sum: 1 } } },
    { $project: { template_type: '$_id', count: 1, _id: 0 } },
    { $sort: { template_type: 1 } },
  ]);

  res.json(result);
}));

export default router;
