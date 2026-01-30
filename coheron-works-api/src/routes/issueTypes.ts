import express from 'express';
import IssueType from '../models/IssueType.js';
import Issue from '../models/Issue.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// ISSUE TYPES CRUD
// ============================================

// Get all issue types
router.get('/issue-types', asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) {
    filter.is_active = is_active === 'true';
  }

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    IssueType.find(filter).sort({ name: 1 }).lean(),
    pagination,
    filter,
    IssueType
  );
  res.json(result);
}));

// Get issue type by ID
router.get('/issue-types/:id', asyncHandler(async (req, res) => {
  const issueType = await IssueType.findById(req.params.id).lean();

  if (!issueType) {
    return res.status(404).json({ error: 'Issue type not found' });
  }

  res.json(issueType);
}));

// Create issue type
router.post('/issue-types', asyncHandler(async (req, res) => {
  const { name, icon, description, is_active } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const issueType = await IssueType.create({
    name,
    icon,
    description,
    is_active: is_active !== undefined ? is_active : true,
  });

  res.status(201).json(issueType);
}));

// Update issue type
router.put('/issue-types/:id', asyncHandler(async (req, res) => {
  const { name, icon, description, is_active } = req.body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (icon !== undefined) updateData.icon = icon;
  if (description !== undefined) updateData.description = description;
  if (is_active !== undefined) updateData.is_active = is_active;

  if (Object.keys(updateData).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const issueType = await IssueType.findByIdAndUpdate(req.params.id, updateData, { new: true });

  if (!issueType) {
    return res.status(404).json({ error: 'Issue type not found' });
  }

  res.json(issueType);
}));

// Delete issue type (soft delete by setting is_active to false)
router.delete('/issue-types/:id', asyncHandler(async (req, res) => {
  // Check if issue type is used by any issues
  const usageCount = await Issue.countDocuments({ issue_type_id: req.params.id });

  if (usageCount > 0) {
    // Soft delete
    const issueType = await IssueType.findByIdAndUpdate(
      req.params.id,
      { is_active: false },
      { new: true }
    );

    if (!issueType) {
      return res.status(404).json({ error: 'Issue type not found' });
    }

    return res.json({ message: 'Issue type deactivated (still in use)', data: issueType });
  }

  // Hard delete if not in use
  const issueType = await IssueType.findByIdAndDelete(req.params.id);

  if (!issueType) {
    return res.status(404).json({ error: 'Issue type not found' });
  }

  res.json({ message: 'Issue type deleted successfully' });
}));

export default router;
