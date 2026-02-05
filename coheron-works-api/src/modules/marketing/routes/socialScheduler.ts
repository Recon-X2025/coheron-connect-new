import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { SocialPost } from '../models/SocialPost.js';
import { SocialAccount } from '../models/SocialAccount.js';
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// --- Posts ---

// List posts
router.get('/posts', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { status, platform, page = 1, limit = 20 } = req.query;
  const filter: any = { tenant_id };
  if (status) filter.status = status;
  if (platform) filter['platforms.platform'] = platform;
  const posts = await SocialPost.find(filter).sort({ scheduled_at: -1 }).limit(Number(limit)).skip((Number(page) - 1) * Number(limit)).lean();
  const total = await SocialPost.countDocuments(filter);
  res.json({ posts, total, page: Number(page), limit: Number(limit) });
}));

// Calendar view
router.get('/calendar', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const { start, end } = req.query;
  const filter: any = { tenant_id };
  if (start || end) {
    filter.scheduled_at = {};
    if (start) filter.scheduled_at.$gte = new Date(start as string);
    if (end) filter.scheduled_at.$lte = new Date(end as string);
  }
  const posts = await SocialPost.find(filter).sort({ scheduled_at: 1 }).lean();
  res.json({ posts });
}));

// Queue
router.get('/queue', authenticate, asyncHandler(async (req, res) => {
  const posts = await SocialPost.find({
    tenant_id: req.user?.tenant_id, status: 'scheduled', scheduled_at: { $gte: new Date() },
  }).sort({ scheduled_at: 1 }).limit(50).lean();
  res.json({ posts });
}));

// Get post
router.get('/posts/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id }).lean();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
}));

// Create post
router.post('/posts', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.create({ ...req.body, tenant_id: req.user?.tenant_id, created_by: req.user?.userId });
  res.status(201).json(post);
}));

// Update post
router.put('/posts/:id', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, req.body, { new: true }).lean();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
}));

// Delete post
router.delete('/posts/:id', authenticate, asyncHandler(async (req, res) => {
  await SocialPost.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// Publish now
router.post('/posts/:id/publish', authenticate, asyncHandler(async (req, res) => {
  const post = await SocialPost.findOneAndUpdate(
    { _id: req.params.id, tenant_id: req.user?.tenant_id },
    { status: 'published', published_at: new Date(), 'platforms.$[].status': 'published', 'platforms.$[].published_at': new Date() },
    { new: true }
  ).lean();
  if (!post) return res.status(404).json({ error: 'Post not found' });
  res.json(post);
}));

// --- Accounts ---

// List accounts
router.get('/accounts', authenticate, asyncHandler(async (req, res) => {
  const accounts = await SocialAccount.find({ tenant_id: req.user?.tenant_id }).select('-access_token -refresh_token').lean();
  res.json({ accounts });
}));

// Create account
router.post('/accounts', authenticate, asyncHandler(async (req, res) => {
  const account = await SocialAccount.create({ ...req.body, tenant_id: req.user?.tenant_id });
  res.status(201).json(account);
}));

// Update account
router.put('/accounts/:id', authenticate, asyncHandler(async (req, res) => {
  const account = await SocialAccount.findOneAndUpdate({ _id: req.params.id, tenant_id: req.user?.tenant_id }, req.body, { new: true }).lean();
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
}));

// Delete account
router.delete('/accounts/:id', authenticate, asyncHandler(async (req, res) => {
  await SocialAccount.findOneAndDelete({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  res.json({ success: true });
}));

// Refresh account token
router.post('/accounts/:id/refresh', authenticate, asyncHandler(async (req, res) => {
  const account = await SocialAccount.findOne({ _id: req.params.id, tenant_id: req.user?.tenant_id });
  if (!account) return res.status(404).json({ error: 'Account not found' });
  // In production, refresh OAuth token
  account.expires_at = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
  await account.save();
  res.json({ success: true, expires_at: account.expires_at });
}));

// Analytics
router.get('/analytics', authenticate, asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const platformStats = await SocialPost.aggregate([
    { $match: { tenant_id, status: 'published' } },
    { $unwind: '$platforms' },
    { $group: {
      _id: '$platforms.platform',
      total_posts: { $sum: 1 },
      total_likes: { $sum: '$platforms.engagement.likes' },
      total_comments: { $sum: '$platforms.engagement.comments' },
      total_shares: { $sum: '$platforms.engagement.shares' },
      total_clicks: { $sum: '$platforms.engagement.clicks' },
      total_impressions: { $sum: '$platforms.engagement.impressions' },
      total_reach: { $sum: '$platforms.engagement.reach' },
    }},
  ]);
  // Best posting times (by hour)
  const bestTimes = await SocialPost.aggregate([
    { $match: { tenant_id, status: 'published', published_at: { $exists: true } } },
    { $unwind: '$platforms' },
    { $group: {
      _id: { $hour: '$published_at' },
      avg_engagement: { $avg: { $add: ['$platforms.engagement.likes', '$platforms.engagement.comments', '$platforms.engagement.shares'] } },
      count: { $sum: 1 },
    }},
    { $sort: { avg_engagement: -1 } },
    { $limit: 5 },
  ]);
  // Top performing
  const topPosts = await SocialPost.find({ tenant_id, status: 'published' }).sort({ 'platforms.engagement.likes': -1 }).limit(5).lean();
  res.json({ platform_stats: platformStats, best_posting_times: bestTimes, top_posts: topPosts });
}));

export default router;
