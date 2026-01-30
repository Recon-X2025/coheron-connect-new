import express from 'express';
import IssueAttachment from '../models/IssueAttachment.js';
import Issue from '../models/Issue.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// ISSUE ATTACHMENTS CRUD
// ============================================

// Get attachments for an issue
router.get('/issues/:issueId/attachments', asyncHandler(async (req, res) => {
  const filter = { issue_id: req.params.issueId };
  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    IssueAttachment.find(filter)
      .populate('uploaded_by', 'name')
      .sort({ created_at: -1 })
      .lean(),
    pagination, filter, IssueAttachment
  );

  const data = paginatedResult.data.map((a: any) => ({
    ...a,
    uploaded_by_name: a.uploaded_by?.name,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get attachment by ID
router.get('/attachments/:id', asyncHandler(async (req, res) => {
  const attachment = await IssueAttachment.findById(req.params.id)
    .populate('uploaded_by', 'name')
    .lean();

  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  const result = {
    ...attachment,
    uploaded_by_name: (attachment.uploaded_by as any)?.name,
  };

  res.json(result);
}));

// Create attachment (file upload handled by multer or similar middleware)
router.post('/issues/:issueId/attachments', asyncHandler(async (req, res) => {
  const { filename, file_path, file_size, mime_type, uploaded_by } = req.body;

  if (!filename || !file_path || !uploaded_by) {
    return res.status(400).json({ error: 'Filename, file_path, and uploaded_by are required' });
  }

  // Verify issue exists
  const issue = await Issue.findById(req.params.issueId);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const attachment = await IssueAttachment.create({
    issue_id: req.params.issueId,
    filename,
    file_path,
    file_size,
    mime_type,
    uploaded_by,
  });

  res.status(201).json(attachment);
}));

// Delete attachment
router.delete('/attachments/:id', asyncHandler(async (req, res) => {
  const attachment = await IssueAttachment.findByIdAndDelete(req.params.id);

  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  res.json({ message: 'Attachment deleted successfully' });
}));

export default router;
