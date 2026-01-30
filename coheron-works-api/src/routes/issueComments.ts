import express from 'express';
import IssueComment from '../models/IssueComment.js';
import Issue from '../models/Issue.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// ISSUE COMMENTS CRUD
// ============================================

// Get comments for an issue
router.get('/issues/:issueId/comments', asyncHandler(async (req, res) => {
  const filter = { issue_id: req.params.issueId };
  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    IssueComment.find(filter)
      .populate('user_id', 'name email image_url')
      .sort({ created_at: 1 })
      .lean(),
    pagination, filter, IssueComment
  );

  const data = paginatedResult.data.map((c: any) => ({
    ...c,
    user_name: c.user_id?.name,
    user_email: c.user_id?.email,
    user_avatar: c.user_id?.image_url,
  }));

  res.json({ data, pagination: paginatedResult.pagination });
}));

// Get comment by ID
router.get('/comments/:id', asyncHandler(async (req, res) => {
  const comment = await IssueComment.findById(req.params.id)
    .populate('user_id', 'name email')
    .lean();

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  const result = {
    ...comment,
    user_name: (comment.user_id as any)?.name,
    user_email: (comment.user_id as any)?.email,
  };

  res.json(result);
}));

// Create comment
router.post('/issues/:issueId/comments', asyncHandler(async (req, res) => {
  const { user_id, body } = req.body;

  if (!body || !user_id) {
    return res.status(400).json({ error: 'Body and user_id are required' });
  }

  // Verify issue exists
  const issue = await Issue.findById(req.params.issueId);
  if (!issue) {
    return res.status(404).json({ error: 'Issue not found' });
  }

  const comment = await IssueComment.create({
    issue_id: req.params.issueId,
    user_id,
    body,
  });

  res.status(201).json(comment);
}));

// Update comment
router.put('/comments/:id', asyncHandler(async (req, res) => {
  const { body } = req.body;

  if (!body) {
    return res.status(400).json({ error: 'Body is required' });
  }

  const comment = await IssueComment.findByIdAndUpdate(
    req.params.id,
    { body },
    { new: true }
  );

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  res.json(comment);
}));

// Delete comment
router.delete('/comments/:id', asyncHandler(async (req, res) => {
  const comment = await IssueComment.findByIdAndDelete(req.params.id);

  if (!comment) {
    return res.status(404).json({ error: 'Comment not found' });
  }

  res.json({ message: 'Comment deleted successfully' });
}));

export default router;
