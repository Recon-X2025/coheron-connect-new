import express from 'express';
import mongoose, { Schema, Document } from 'mongoose';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';

// ── AI Auto-Response Config Schema ──────────────────────────────────

export interface IAIAutoResponseConfig extends Document {
  tenant_id: mongoose.Types.ObjectId;
  enabled: boolean;
  confidence_threshold: number;
  response_delay_seconds: number;
  fallback_team_id?: mongoose.Types.ObjectId;
  tone: 'professional' | 'friendly' | 'concise' | 'empathetic';
  knowledge_base_enabled: boolean;
  auto_close_after_hours: number;
  excluded_categories: string[];
  stats: {
    total_responded: number;
    total_deflected: number;
    total_escalated: number;
    avg_confidence: number;
    last_reset_at: Date;
  };
  created_at: Date;
  updated_at: Date;
}

const aiAutoResponseConfigSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  confidence_threshold: { type: Number, default: 0.7, min: 0, max: 1 },
  response_delay_seconds: { type: Number, default: 30 },
  fallback_team_id: { type: Schema.Types.ObjectId },
  tone: { type: String, enum: ['professional', 'friendly', 'concise', 'empathetic'], default: 'professional' },
  knowledge_base_enabled: { type: Boolean, default: true },
  auto_close_after_hours: { type: Number, default: 48 },
  excluded_categories: [String],
  stats: {
    total_responded: { type: Number, default: 0 },
    total_deflected: { type: Number, default: 0 },
    total_escalated: { type: Number, default: 0 },
    avg_confidence: { type: Number, default: 0 },
    last_reset_at: { type: Date, default: Date.now },
  },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const AIAutoResponseConfig = mongoose.model<IAIAutoResponseConfig>('AIAutoResponseConfig', aiAutoResponseConfigSchema);

// ── Routes ──────────────────────────────────────────────────────────

const router = express.Router();

// Get config
router.get('/config', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  let config = await AIAutoResponseConfig.findOne({ tenant_id }).lean();
  if (!config) {
    config = await AIAutoResponseConfig.create({ tenant_id }) as any;
  }
  res.json(config);
}));

// Update config
router.put('/config', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { enabled, confidence_threshold, response_delay_seconds, fallback_team_id, tone, knowledge_base_enabled, auto_close_after_hours, excluded_categories } = req.body;
  const update: any = {};
  if (enabled !== undefined) update.enabled = enabled;
  if (confidence_threshold !== undefined) update.confidence_threshold = confidence_threshold;
  if (response_delay_seconds !== undefined) update.response_delay_seconds = response_delay_seconds;
  if (fallback_team_id !== undefined) update.fallback_team_id = fallback_team_id;
  if (tone !== undefined) update.tone = tone;
  if (knowledge_base_enabled !== undefined) update.knowledge_base_enabled = knowledge_base_enabled;
  if (auto_close_after_hours !== undefined) update.auto_close_after_hours = auto_close_after_hours;
  if (excluded_categories !== undefined) update.excluded_categories = excluded_categories;

  const config = await AIAutoResponseConfig.findOneAndUpdate(
    { tenant_id },
    { $set: update },
    { new: true, upsert: true },
  ).lean();
  res.json(config);
}));

// Suggest response for ticket content
router.post('/suggest', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { subject, description, category } = req.body;
  if (!subject && !description) return res.status(400).json({ error: 'subject or description is required' });

  const config = await AIAutoResponseConfig.findOne({ tenant_id }).lean();
  if (!config || !config.enabled) {
    return res.json({ suggestion: null, reason: 'AI auto-response is disabled' });
  }

  // Simulated AI response generation
  const keywords = ((subject || '') + ' ' + (description || '')).toLowerCase();
  let confidence = 0.5;
  let suggested_response = '';
  const sources: string[] = [];

  if (keywords.includes('password') || keywords.includes('reset') || keywords.includes('login')) {
    confidence = 0.92;
    suggested_response = 'To reset your password, please go to the login page and click "Forgot Password". You will receive an email with a reset link. If you do not receive the email within 5 minutes, please check your spam folder.';
    sources.push('KB: Account & Password Management');
  } else if (keywords.includes('invoice') || keywords.includes('billing') || keywords.includes('payment')) {
    confidence = 0.85;
    suggested_response = 'You can view and download your invoices from the Billing section in your account settings. If you have questions about a specific charge, please provide the invoice number and we will investigate.';
    sources.push('KB: Billing & Invoices');
  } else if (keywords.includes('bug') || keywords.includes('error') || keywords.includes('crash')) {
    confidence = 0.6;
    suggested_response = 'Thank you for reporting this issue. Could you please provide the following details so we can investigate: 1) Steps to reproduce, 2) Browser/device info, 3) Any error messages you see. Our team will look into this promptly.';
    sources.push('KB: Bug Report Template');
  } else {
    confidence = 0.4;
    suggested_response = 'Thank you for reaching out. We have received your request and a team member will review it shortly. In the meantime, you may find helpful information in our Knowledge Base.';
  }

  // Apply tone
  const tone = config.tone || 'professional';
  if (tone === 'friendly') {
    suggested_response = 'Hi there! ' + suggested_response + ' Let us know if there is anything else we can help with!';
  } else if (tone === 'empathetic') {
    suggested_response = 'We understand this can be frustrating. ' + suggested_response + ' We appreciate your patience.';
  } else if (tone === 'concise') {
    // keep as-is, already concise
  }

  const meetsThreshold = confidence >= (config.confidence_threshold || 0.7);

  // Update stats
  if (meetsThreshold) {
    await AIAutoResponseConfig.findByIdAndUpdate(config._id, {
      $inc: { 'stats.total_responded': 1 },
    });
  } else {
    await AIAutoResponseConfig.findByIdAndUpdate(config._id, {
      $inc: { 'stats.total_escalated': 1 },
    });
  }

  res.json({
    suggestion: meetsThreshold ? suggested_response : null,
    confidence,
    meets_threshold: meetsThreshold,
    sources,
    tone,
    fallback: meetsThreshold ? null : 'Ticket will be routed to support team',
  });
}));

// Stats
router.get('/stats', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const config = await AIAutoResponseConfig.findOne({ tenant_id }).lean();
  if (!config) return res.json({ total_responded: 0, total_deflected: 0, total_escalated: 0, avg_confidence: 0 });
  const { stats } = config;
  const total = (stats.total_responded || 0) + (stats.total_escalated || 0);
  res.json({
    total_responded: stats.total_responded || 0,
    total_deflected: stats.total_deflected || 0,
    total_escalated: stats.total_escalated || 0,
    avg_confidence: stats.avg_confidence || 0,
    deflection_rate: total > 0 ? Math.round(((stats.total_responded || 0) / total) * 100) : 0,
    total_interactions: total,
    last_reset_at: stats.last_reset_at,
  });
}));

export default router;
