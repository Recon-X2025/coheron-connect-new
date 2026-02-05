import express from 'express';
import { CannedResponse } from '../../../models/CannedResponse.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// ============================================
// CANNED RESPONSES / MACROS
// ============================================

// Get all canned responses
router.get('/', authenticate, asyncHandler(async (req, res) => {
  const { category, is_public, search, created_by } = req.query;
  const filter: any = {};

  if (category) filter.category = category;
  if (is_public !== undefined) filter.is_public = is_public === 'true';
  if (created_by) filter.created_by = created_by;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { content: { $regex: search, $options: 'i' } },
    ];
  }

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    CannedResponse.find(filter)
      .populate('created_by', 'name')
      .sort({ usage_count: -1, name: 1 })
      .lean(),
    pagination, filter, CannedResponse
  );

  const data = paginatedResult.data.map((r: any) => ({
    ...r,
    id: r._id,
    created_by_name: r.created_by?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get canned response by ID
router.get('/:id', authenticate, asyncHandler(async (req, res) => {
  const response = await CannedResponse.findById(req.params.id)
    .populate('created_by', 'name')
    .lean();

  if (!response) {
    return res.status(404).json({ error: 'Canned response not found' });
  }

  const r: any = response;
  res.json({ ...r, id: r._id, created_by_name: r.created_by?.name });
}));

// Create canned response
router.post('/', authenticate, asyncHandler(async (req, res) => {
  const { name, shortcut, content, category, is_public, created_by } = req.body;

  if (!name || !content) {
    return res.status(400).json({ error: 'Name and content are required' });
  }

  const response = await CannedResponse.create({
    name,
    shortcut,
    content,
    category,
    is_public: is_public !== undefined ? is_public : false,
    created_by,
  });

  res.status(201).json(response);
}));

// Update canned response
router.put('/:id', authenticate, asyncHandler(async (req, res) => {
  const { name, shortcut, content, category, is_public } = req.body;
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (shortcut !== undefined) updateData.shortcut = shortcut;
  if (content !== undefined) updateData.content = content;
  if (category !== undefined) updateData.category = category;
  if (is_public !== undefined) updateData.is_public = is_public;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const result = await CannedResponse.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!result) {
    return res.status(404).json({ error: 'Canned response not found' });
  }

  res.json(result);
}));

// Increment usage count
router.post('/:id/use', authenticate, asyncHandler(async (req, res) => {
  const result = await CannedResponse.findByIdAndUpdate(
    req.params.id,
    { $inc: { usage_count: 1 } },
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ error: 'Canned response not found' });
  }

  res.json(result);
}));

// Delete canned response
router.delete('/:id', authenticate, asyncHandler(async (req, res) => {
  const result = await CannedResponse.findByIdAndDelete(req.params.id);
  if (!result) {
    return res.status(404).json({ error: 'Canned response not found' });
  }
  res.json({ message: 'Canned response deleted successfully' });
}));

export default router;
