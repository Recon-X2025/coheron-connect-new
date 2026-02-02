import crypto from 'crypto';
import logger from '../../shared/utils/logger.js';
import WebhookEndpoint from '../../models/WebhookEndpoint.js';
import WebhookDeliveryLog from '../../models/WebhookDeliveryLog.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import type { DomainEvent } from '../types.js';

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(webhookId: string): CircuitBreaker {
  if (!breakers.has(webhookId)) {
    breakers.set(webhookId, new CircuitBreaker(`webhook:${webhookId}`, 5, 60000));
  }
  return breakers.get(webhookId)!;
}

function signPayload(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export async function dispatchWebhooks(event: DomainEvent): Promise<void> {
  const endpoints = await WebhookEndpoint.find({
    tenant_id: event.tenant_id,
    active: true,
    events: event.type,
  }).lean();

  for (const endpoint of endpoints) {
    const breaker = getBreaker(endpoint._id.toString());
    if (!breaker.canExecute()) {
      logger.warn({ webhookId: endpoint._id, url: endpoint.url }, 'Webhook circuit breaker open, skipping');
      continue;
    }

    const body = JSON.stringify({
      event_id: event.id,
      event_type: event.type,
      tenant_id: event.tenant_id,
      timestamp: event.metadata.timestamp,
      payload: event.payload,
    });

    const signature = signPayload(body, endpoint.secret);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Event-Type': event.type,
      ...(endpoint.headers || {}),
    };

    const startTime = Date.now();
    let success = false;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMsg: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      responseStatus = response.status;
      responseBody = await response.text().catch(() => null);
      success = response.ok;

      if (success) {
        breaker.recordSuccess();
      } else {
        breaker.recordFailure();
      }
    } catch (err: any) {
      errorMsg = err.message;
      breaker.recordFailure();
      logger.error({ err, webhookId: endpoint._id, url: endpoint.url }, 'Webhook dispatch failed');
    }

    const durationMs = Date.now() - startTime;

    // Log delivery
    await WebhookDeliveryLog.create({
      webhook_id: endpoint._id.toString(),
      event_id: event.id,
      event_type: event.type,
      tenant_id: event.tenant_id,
      url: endpoint.url,
      request_body: event.payload,
      response_status: responseStatus,
      response_body: responseBody?.substring(0, 2000) || null,
      success,
      duration_ms: durationMs,
      attempt: 1,
      error: errorMsg,
    }).catch((e) => logger.error({ e }, 'Failed to log webhook delivery'));

    // Update endpoint stats
    const updateData: any = { last_triggered_at: new Date() };
    if (!success) {
      updateData.$inc = { failure_count: 1 };
    } else {
      updateData.failure_count = 0;
    }
    await WebhookEndpoint.updateOne({ _id: endpoint._id }, updateData).catch(() => {});
  }
}

export function getWebhookBreakerStats(): any[] {
  return Array.from(breakers.values()).map((b) => b.getStats());
}
