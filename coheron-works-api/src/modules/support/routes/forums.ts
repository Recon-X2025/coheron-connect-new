import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { ForumCategory } from '../models/ForumCategory.js';
import { ForumThread } from '../models/ForumThread.js';
import { ForumReply } from '../models/ForumReply.js';

const router = express.Router();

// ── Categories ─────────────────────────────────────────────────────

router.get('/categories', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const categories = await ForumCategory.find({ tenant_id }).sort({ sort_order: 1 }).lean();
  res.json(categories);
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const category = await ForumCategory.create({ ...req.body, tenant_id });
  res.status(201).json(category);
}));

router.put('/categories/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const category = await ForumCategory.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true },
  ).lean();
  if (!category) return res.status(404).json({ error: 'Category not found' });
  res.json(category);
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  await ForumCategory.findOneAndDelete({ _id: req.params.id, tenant_id });
  res.json({ success: true });
}));

// ── Threads ────────────────────────────────────────────────────────

router.get('/threads', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { category_id, status, tag, page = '1', limit = '20' } = req.query;
  const filter: any = { tenant_id };
  if (category_id) filter.category_id = category_id;
  if (status) filter.status = status;
  if (tag) filter.tags = tag;
  const skip = (Number(page) - 1) * Number(limit);
  const [threads, total] = await Promise.all([
    ForumThread.find(filter).sort({ is_pinned: -1, created_at: -1 }).skip(skip).limit(Number(limit)).populate('author_id', 'name email').lean(),
    ForumThread.countDocuments(filter),
  ]);
  res.json({ threads, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
}));

router.get('/threads/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const thread = await ForumThread.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $inc: { views: 1 } },
    { new: true },
  ).populate('author_id', 'name email').lean();
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  res.json(thread);
}));

router.post('/threads', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const author_id = (req as any).user?._id;
  const thread = await ForumThread.create({ ...req.body, tenant_id, author_id });
  await ForumCategory.findByIdAndUpdate(req.body.category_id, { $inc: { thread_count: 1 } });
  res.status(201).json(thread);
}));

router.put('/threads/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const thread = await ForumThread.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true },
  ).lean();
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  res.json(thread);
}));

router.delete('/threads/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const thread = await ForumThread.findOneAndDelete({ _id: req.params.id, tenant_id });
  if (thread) {
    await ForumCategory.findByIdAndUpdate(thread.category_id, { $inc: { thread_count: -1 } });
    await ForumReply.deleteMany({ thread_id: thread._id, tenant_id });
  }
  res.json({ success: true });
}));

// ── Replies ────────────────────────────────────────────────────────

router.get('/threads/:threadId/replies', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const replies = await ForumReply.find({ tenant_id, thread_id: req.params.threadId, status: 'active' })
    .sort({ created_at: 1 }).populate('author_id', 'name email').lean();
  res.json(replies);
}));

router.post('/threads/:threadId/replies', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const author_id = (req as any).user?._id;
  const reply = await ForumReply.create({ ...req.body, tenant_id, thread_id: req.params.threadId, author_id });
  await ForumThread.findByIdAndUpdate(req.params.threadId, {
    $inc: { reply_count: 1 },
    $set: { last_reply_at: new Date() },
  });
  const thread = await ForumThread.findById(req.params.threadId).lean();
  if (thread) {
    await ForumCategory.findByIdAndUpdate(thread.category_id, { $inc: { reply_count: 1 } });
  }
  res.status(201).json(reply);
}));

router.put('/replies/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const reply = await ForumReply.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: req.body },
    { new: true },
  ).lean();
  if (!reply) return res.status(404).json({ error: 'Reply not found' });
  res.json(reply);
}));

router.delete('/replies/:id', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const reply = await ForumReply.findOneAndDelete({ _id: req.params.id, tenant_id });
  if (reply) {
    await ForumThread.findByIdAndUpdate(reply.thread_id, { $inc: { reply_count: -1 } });
  }
  res.json({ success: true });
}));

// ── Solve & Vote ───────────────────────────────────────────────────

router.post('/threads/:id/solve', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { reply_id } = req.body;
  await ForumReply.updateMany({ thread_id: req.params.id, tenant_id }, { $set: { is_solution: false } });
  await ForumReply.findByIdAndUpdate(reply_id, { $set: { is_solution: true } });
  const thread = await ForumThread.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $set: { is_solved: true, solved_reply_id: reply_id } },
    { new: true },
  ).lean();
  res.json(thread);
}));

router.post('/replies/:id/vote', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { direction } = req.body; // 'up' or 'down'
  const inc = direction === 'up' ? { upvotes: 1 } : { downvotes: 1 };
  const reply = await ForumReply.findOneAndUpdate(
    { _id: req.params.id, tenant_id },
    { $inc: inc },
    { new: true },
  ).lean();
  if (!reply) return res.status(404).json({ error: 'Reply not found' });
  res.json(reply);
}));

// ── Stats & Search ─────────────────────────────────────────────────

router.get('/stats', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const [categories, threads, replies, solvedThreads] = await Promise.all([
    ForumCategory.countDocuments({ tenant_id }),
    ForumThread.countDocuments({ tenant_id }),
    ForumReply.countDocuments({ tenant_id }),
    ForumThread.countDocuments({ tenant_id, is_solved: true }),
  ]);
  res.json({ categories, threads, replies, solved_threads: solvedThreads, solve_rate: threads > 0 ? Math.round((solvedThreads / threads) * 100) : 0 });
}));

router.get('/search', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { q, page = '1', limit = '20' } = req.query;
  if (!q) return res.json({ threads: [], total: 0 });
  const filter = { tenant_id, $text: { $search: String(q) } };
  const skip = (Number(page) - 1) * Number(limit);
  const [threads, total] = await Promise.all([
    ForumThread.find(filter, { score: { $meta: 'textScore' } }).sort({ score: { $meta: 'textScore' } }).skip(skip).limit(Number(limit)).populate('author_id', 'name email').lean(),
    ForumThread.countDocuments(filter),
  ]);
  res.json({ threads, total });
}));

export default router;
