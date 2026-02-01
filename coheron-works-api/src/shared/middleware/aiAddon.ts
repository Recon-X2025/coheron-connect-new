import { Request, Response, NextFunction } from 'express';
import AIAddonConfig, { IAIFeaturesEnabled } from '../../models/AIAddonConfig.js';

export function requireAIAddon(featureName: keyof IAIFeaturesEnabled) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).user?.tenant_id;
      if (!tenantId) return res.status(401).json({ error: "Authentication required" });
      const config = await AIAddonConfig.findOne({ tenant_id: tenantId });
      if (!config || !config.is_enabled) return res.status(402).json({ error: "AI add-on not enabled" });
      if (!config.features_enabled?.[featureName]) return res.status(402).json({ error: "AI feature " + featureName + " not enabled" });
      const now = new Date();
      const days = (now.getTime() - new Date(config.billing_cycle_start).getTime()) / 86400000;
      if (days >= 30) { config.tokens_used_this_month = 0; config.billing_cycle_start = now; await config.save(); }
      if (config.tokens_used_this_month >= config.monthly_token_limit) return res.status(429).json({ error: "AI quota exceeded" });
      (req as any).aiConfig = config;
      next();
    } catch (err) { next(err); }
  };
}
