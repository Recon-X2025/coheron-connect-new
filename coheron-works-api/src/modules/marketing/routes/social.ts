import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { SocialAccount } from '../../../models/SocialAccount.js';
import { SocialPost } from '../../../models/SocialPost.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// List connected social accounts
router.get('/accounts', authenticate, asyncHandler(async (req, res) => {
  const { platform } = req.query;
  const filter: any = {};
  if (platform) filter.platform = platform;
  const accounts = await SocialAccount.find(filter).select('-access_token -refresh_token').sort({ created_at: -1 }).lean();
  res.json(accounts);
}));

// Connect social account
router.post('/accounts', authenticate, asyncHandler(async (req, res) => {
  const account = new SocialAccount(req.body);
  await account.save();
  res.status(201).json(account);
}));

// Disconnect social account
router.delete('/accounts/:id', authenticate, asyncHandler(async (req, res) => {
  const account = await SocialAccount.findByIdAndDelete(req.params.id);
  if (!account) return res.status(404).json({ message: 'Social account not found' });
  res.json({ message: 'Account disconnected' });
}));

// List social posts
router.get('/posts', authenticate, asyncHandler(async (req, res) => {
  const { status, campaign_id } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (campaign_id) filter.campaign_id = campaign_id;
  const params = getPaginationParams(req);
  const result = await paginateQuery(SocialPost.find(filter).sort({ created_at: -1 }).lean(), params, filter, SocialPost);
  res.json(result);
}));

// Create/schedule social post
router.post('/posts', authenticate, asyncHandler(async (req, res) => {
  const post = new SocialPost({ ...req.body, created_by: (req as any).user?.id });
  if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) {
    post.status = 'scheduled';
  }
  await post.save();
  res.status(201).json(post);
}));

// Update social post
router.put('/posts/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!post) return res.status(404).json({ message: 'Social post not found' });
  res.json(post);
}));

// Publish post immediately
router.post('/posts/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.findById(req.params.id);
  if (!post) return res.status(404).json({ message: 'Social post not found' });
  (post as any).status = 'published';
  (post as any).published_at = new Date();
  for (const platform of (post as any).platforms || []) {
    platform.status = 'published';
    platform.published_at = new Date();
  }
  await post.save();
  res.json(post);
}));

// Get engagement metrics
router.get('/posts/:id/engagement', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.findById(req.params.id).select('engagement platforms content status').lean();
  if (!post) return res.status(404).json({ message: 'Social post not found' });
  res.json(post);
}));

// Publishing calendar view
router.get('/calendar', authenticate, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const filter: any = { status: { $in: ['scheduled', 'published'] } };
  if (start_date) filter.scheduled_at = { ...filter.scheduled_at, $gte: new Date(start_date as string) };
  if (end_date) filter.scheduled_at = { ...filter.scheduled_at, $lte: new Date(end_date as string) };
  const posts = await SocialPost.find(filter).select('content status scheduled_at published_at platforms.platform platforms.status').sort({ scheduled_at: 1 }).lean();
  res.json(posts);
}));

export default router;
