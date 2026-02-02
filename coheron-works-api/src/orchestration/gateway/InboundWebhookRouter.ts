import crypto from 'crypto';
import express from 'express';
import { eventBus } from '../EventBus.js';
import logger from '../../shared/utils/logger.js';

const router = express.Router();

// Registry of known inbound webhook providers and their event mapping
interface InboundProviderConfig {
  signatureHeader: string;
  signatureAlgo: 'sha256' | 'sha512';
  eventTypeField: string;
  payloadMapper: (body: any, eventType: string) => { eventType: string; payload: any; tenantId: string };
}

const providerConfigs: Record<string, InboundProviderConfig> = {
  razorpay: {
    signatureHeader: 'x-razorpay-signature',
    signatureAlgo: 'sha256',
    eventTypeField: 'event',
    payloadMapper: (body, _eventType) => ({
      eventType: `razorpay.${body.event}`,
      payload: body.payload,
      tenantId: body.account_id || '',
    }),
  },
  shiprocket: {
    signatureHeader: 'x-shiprocket-signature',
    signatureAlgo: 'sha256',
    eventTypeField: 'event',
    payloadMapper: (body, _eventType) => ({
      eventType: `shiprocket.${body.event}`,
      payload: body,
      tenantId: body.tenant_id || '',
    }),
  },
  cashfree: {
    signatureHeader: 'x-cashfree-signature',
    signatureAlgo: 'sha256',
    eventTypeField: 'type',
    payloadMapper: (body, _eventType) => ({
      eventType: `cashfree.${body.type}`,
      payload: body.data || body,
      tenantId: body.data?.order?.order_tags?.tenant_id || '',
    }),
  },
  delhivery: {
    signatureHeader: 'x-delhivery-signature',
    signatureAlgo: 'sha256',
    eventTypeField: 'event',
    payloadMapper: (body, _eventType) => ({
      eventType: `delhivery.${body.event || 'status_update'}`,
      payload: body,
      tenantId: body.tenant_id || '',
    }),
  },
  gst_portal: {
    signatureHeader: 'x-gst-signature',
    signatureAlgo: 'sha256',
    eventTypeField: 'event_type',
    payloadMapper: (body, _eventType) => ({
      eventType: `gst.${body.event_type || 'notification'}`,
      payload: body,
      tenantId: body.gstin || '',
    }),
  },
  generic: {
    signatureHeader: 'x-webhook-signature',
    signatureAlgo: 'sha256',
    eventTypeField: 'event_type',
    payloadMapper: (body, _eventType) => ({
      eventType: body.event_type || 'external.generic',
      payload: body.payload || body,
      tenantId: body.tenant_id || '',
    }),
  },
};

function verifySignature(payload: string, signature: string, secret: string, algo: string): boolean {
  const expected = crypto.createHmac(algo, secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

// POST /api/platform/orchestration/webhooks/inbound/:provider
router.post('/inbound/:provider', express.raw({ type: '*/*' }), async (req, res) => {
  const { provider } = req.params;
  const config = providerConfigs[provider];
  if (!config) {
    return res.status(400).json({ error: `Unknown webhook provider: ${provider}` });
  }

  const secret = process.env[`WEBHOOK_SECRET_${provider.toUpperCase()}`];
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  const signature = req.headers[config.signatureHeader] as string;

  // Verify signature if secret is configured
  if (secret && signature) {
    try {
      if (!verifySignature(rawBody, signature, secret, config.signatureAlgo)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    } catch {
      return res.status(401).json({ error: 'Signature verification failed' });
    }
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { eventType, payload, tenantId } = config.payloadMapper(body, body[config.eventTypeField]);

    eventBus.publish(eventType, tenantId, payload, {
      source: `webhook:${provider}`,
    });

    logger.info({ provider, eventType }, 'Inbound webhook processed');
    res.json({ received: true, event_type: eventType });
  } catch (err: any) {
    logger.error({ err, provider }, 'Failed to process inbound webhook');
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

export default router;
