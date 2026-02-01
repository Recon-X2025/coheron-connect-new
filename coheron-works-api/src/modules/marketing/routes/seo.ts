import express from 'express';
import { SEOAudit } from '../models/SEOAudit.js';
import { SEOKeyword } from '../models/SEOKeyword.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// SEO AUDITS
// ============================================

router.get('/audits', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.url) filter.url = { $regex: req.query.url, $options: 'i' };
  const audits = await SEOAudit.find(filter).sort({ audit_date: -1 }).lean();
  res.json(audits);
}));

router.get('/audits/:id', asyncHandler(async (req, res) => {
  const audit = await SEOAudit.findById(req.params.id).lean();
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
}));

router.post('/audits', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const audit = await SEOAudit.create({ ...req.body, tenant_id, created_by: req.user?.userId });
  res.status(201).json(audit);
}));

router.put('/audits/:id', asyncHandler(async (req, res) => {
  const audit = await SEOAudit.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json(audit);
}));

router.delete('/audits/:id', asyncHandler(async (req, res) => {
  const audit = await SEOAudit.findByIdAndDelete(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });
  res.json({ message: 'Audit deleted successfully' });
}));

// Run audit (simulated)
router.post('/audits/:id/run', asyncHandler(async (req, res) => {
  const audit = await SEOAudit.findById(req.params.id);
  if (!audit) return res.status(404).json({ error: 'Audit not found' });

  // Simulated audit scores
  audit.scores = {
    overall: Math.floor(Math.random() * 40) + 60,
    performance: Math.floor(Math.random() * 40) + 60,
    seo: Math.floor(Math.random() * 30) + 70,
    accessibility: Math.floor(Math.random() * 30) + 70,
    best_practices: Math.floor(Math.random() * 30) + 70,
  };
  audit.page_speed = { mobile: Math.floor(Math.random() * 40) + 50, desktop: Math.floor(Math.random() * 30) + 70 };
  audit.issues = [
    { type: 'warning', category: 'meta', description: 'Meta description is too short', element: '<meta name="description">', recommendation: 'Write a meta description between 150-160 characters' },
    { type: 'info', category: 'images', description: 'Images missing alt text', element: '<img>', recommendation: 'Add descriptive alt text to all images' },
  ];
  audit.status = 'completed';
  audit.audit_date = new Date();
  await audit.save();
  res.json(audit);
}));

// ============================================
// SEO KEYWORDS
// ============================================

router.get('/keywords', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const filter: any = { tenant_id };
  if (req.query.status) filter.status = req.query.status;
  if (req.query.competition) filter.competition = req.query.competition;
  if (req.query.search) filter.keyword = { $regex: req.query.search, $options: 'i' };
  const keywords = await SEOKeyword.find(filter).sort({ search_volume: -1 }).lean();
  res.json(keywords);
}));

router.get('/keywords/:id', asyncHandler(async (req, res) => {
  const keyword = await SEOKeyword.findById(req.params.id).lean();
  if (!keyword) return res.status(404).json({ error: 'Keyword not found' });
  res.json(keyword);
}));

router.post('/keywords', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const keyword = await SEOKeyword.create({ ...req.body, tenant_id });
  res.status(201).json(keyword);
}));

router.put('/keywords/:id', asyncHandler(async (req, res) => {
  const keyword = await SEOKeyword.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!keyword) return res.status(404).json({ error: 'Keyword not found' });
  res.json(keyword);
}));

router.delete('/keywords/:id', asyncHandler(async (req, res) => {
  const keyword = await SEOKeyword.findByIdAndDelete(req.params.id);
  if (!keyword) return res.status(404).json({ error: 'Keyword not found' });
  res.json({ message: 'Keyword deleted successfully' });
}));

// Rankings
router.get('/keywords/rankings', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const keywords = await SEOKeyword.find({ tenant_id, status: 'tracking', current_position: { $gt: 0 } }).sort({ current_position: 1 }).lean();
  res.json(keywords);
}));

// Opportunities (high volume, low difficulty, not ranking yet)
router.get('/keywords/opportunities', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const keywords = await SEOKeyword.find({ tenant_id, status: 'tracking', difficulty: { $lt: 50 }, current_position: { $in: [0, null] } }).sort({ search_volume: -1 }).limit(50).lean();
  res.json(keywords);
}));

// Dashboard
router.get('/dashboard', asyncHandler(async (req, res) => {
  const tenant_id = req.user?.tenant_id;
  const totalKeywords = await SEOKeyword.countDocuments({ tenant_id, status: 'tracking' });
  const ranking = await SEOKeyword.countDocuments({ tenant_id, status: 'tracking', current_position: { $gt: 0, $lte: 100 } });
  const top10 = await SEOKeyword.countDocuments({ tenant_id, status: 'tracking', current_position: { $gt: 0, $lte: 10 } });
  const top3 = await SEOKeyword.countDocuments({ tenant_id, status: 'tracking', current_position: { $gt: 0, $lte: 3 } });
  const audits = await SEOAudit.find({ tenant_id }).sort({ audit_date: -1 }).limit(5).lean();
  const avgScore = audits.length ? Math.round(audits.reduce((s, a) => s + (a.scores?.overall || 0), 0) / audits.length) : 0;

  res.json({
    keywords: { total: totalKeywords, ranking, top_10: top10, top_3: top3 },
    avg_seo_score: avgScore,
    recent_audits: audits,
  });
}));

export default router;
