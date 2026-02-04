import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import AIAddonConfig from '../../../models/AIAddonConfig.js';
import { LLMClient } from '../../../shared/ai/llmClient.js';

const router = express.Router();

// GET / - Get AI addon config
router.get("/", authenticate, asyncHandler(async (req: any, res) => {
  const config = await AIAddonConfig.findOne({ tenant_id: req.user.tenant_id });
  if (!config) return res.json({ success: true, data: null });
  res.json({ success: true, data: config });
}));

// PUT / - Update config
router.put("/", authenticate, asyncHandler(async (req: any, res) => {
  const { provider, api_key, model_name, base_url, max_tokens_per_request, monthly_token_limit, is_enabled, features_enabled } = req.body;
  const update: any = {};
  if (provider !== undefined) update.provider = provider;
  if (api_key !== undefined) update.api_key = api_key;
  if (model_name !== undefined) update.model_name = model_name;
  if (base_url !== undefined) update.base_url = base_url;
  if (max_tokens_per_request !== undefined) update.max_tokens_per_request = max_tokens_per_request;
  if (monthly_token_limit !== undefined) update.monthly_token_limit = monthly_token_limit;
  if (is_enabled !== undefined) update.is_enabled = is_enabled;
  if (features_enabled !== undefined) update.features_enabled = features_enabled;
  const config = await AIAddonConfig.findOneAndUpdate({ tenant_id: req.user.tenant_id }, { ["$set"]: update }, { new: true, upsert: true });
  res.json({ success: true, data: config });
}));

// GET /usage
router.get("/usage", authenticate, asyncHandler(async (req: any, res) => {
  const config = await AIAddonConfig.findOne({ tenant_id: req.user.tenant_id });
  if (!config) return res.status(404).json({ error: "AI not configured" });
  res.json({ success: true, data: { tokens_used: config.tokens_used_this_month, token_limit: config.monthly_token_limit, billing_cycle_start: config.billing_cycle_start, usage_pct: Math.round((config.tokens_used_this_month / config.monthly_token_limit) * 100) } });
}));

// POST /test
router.post("/test", authenticate, asyncHandler(async (req: any, res) => {
  const config = await AIAddonConfig.findOne({ tenant_id: req.user.tenant_id });
  if (!config) return res.status(404).json({ error: "AI not configured" });
  try {
    const client = new LLMClient(config);
    const result = await client.chat([{ role: "user", content: "Say hello in one word." }], { max_tokens: 10 });
    res.json({ success: true, data: { status: "connected", response: result.content, provider: config.provider, model: config.model_name } });
  } catch (err: any) {
    res.json({ success: false, data: { status: "failed", error: err.message, provider: config.provider, model: config.model_name } });
  }
}));

export default router;
