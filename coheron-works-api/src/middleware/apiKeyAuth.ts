import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import APIKey from '../models/APIKey.js';
import logger from '../shared/utils/logger.js';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'Missing X-API-Key header' });
    return;
  }

  try {
    const keyHash = hashKey(apiKey);
    const keyDoc = await APIKey.findOne({ key_hash: keyHash, is_active: true }).lean();

    if (!keyDoc) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Check expiration
    if (keyDoc.expires_at && new Date(keyDoc.expires_at) < new Date()) {
      res.status(401).json({ error: 'API key has expired' });
      return;
    }

    // Simple rate limiting via usage_count (production would use Redis)
    // Update usage
    await APIKey.updateOne({ _id: keyDoc._id }, {
      $inc: { usage_count: 1 },
      $set: { last_used_at: new Date() },
    });

    // Attach tenant info to request
    (req as any).tenantId = keyDoc.tenant_id.toString();
    (req as any).apiKeyId = keyDoc._id.toString();
    (req as any).apiKeyScopes = keyDoc.scopes;

    next();
  } catch (err: any) {
    logger.error({ err: err.message }, 'API key auth error');
    res.status(500).json({ error: 'Authentication error' });
  }
}

export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = 'ck_' + crypto.randomBytes(32).toString('hex');
  const hash = hashKey(key);
  const prefix = key.substring(0, 10);
  return { key, hash, prefix };
}
