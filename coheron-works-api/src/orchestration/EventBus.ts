import { randomUUID } from 'crypto';
import { eventsQueue } from '../jobs/queues.js';
import { redisConnection } from '../jobs/connection.js';
import logger from '../shared/utils/logger.js';
import type { DomainEvent, EventHandler, EventMetadata } from './types.js';
import DomainEventLog from '../models/DomainEventLog.js';
import TenantOrchestrationConfigModel from '../models/TenantOrchestrationConfig.js';
import { recordMetric } from './metrics.js';

const DEDUP_TTL_SECONDS = 300; // 5 minutes
const DEFAULT_CONCURRENCY_LIMIT = 10;

/** Simple semaphore for concurrency limiting */
class Semaphore {
  private current = 0;
  private queue: (() => void)[] = [];

  constructor(private max: number) {}

  async acquire(): Promise<void> {
    if (this.current < this.max) {
      this.current++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve();
      });
    });
  }

  release(): void {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }
}

class EventBus {
  private handlers: Map<string, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];
  private concurrencyLimit: number = DEFAULT_CONCURRENCY_LIMIT;

  setConcurrencyLimit(limit: number): void {
    this.concurrencyLimit = limit;
  }

  publish<T = any>(
    type: string,
    tenantId: string,
    payload: T,
    metadata?: Partial<EventMetadata> & { version?: number; aggregate_id?: string; aggregate_version?: number },
  ): void {
    const event: DomainEvent<T> = {
      id: randomUUID(),
      type,
      version: metadata?.version || 1,
      tenant_id: tenantId,
      aggregate_id: (metadata as any)?.aggregate_id,
      aggregate_version: (metadata as any)?.aggregate_version,
      payload,
      metadata: {
        source: metadata?.source || 'api',
        correlation_id: metadata?.correlation_id || randomUUID(),
        user_id: metadata?.user_id,
        saga_id: metadata?.saga_id,
        trace_id: metadata?.trace_id || randomUUID(),
        timestamp: new Date(),
      },
    };

    recordMetric('events_published', 1, { type });

    eventsQueue
      .add(type, event, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: false,
      })
      .catch((err) => {
        logger.error({ err, eventType: type }, 'Failed to enqueue event');
      });
  }

  subscribe(eventType: string, handler: EventHandler): void {
    const existing = this.handlers.get(eventType) || [];
    existing.push(handler);
    this.handlers.set(eventType, existing);
  }

  subscribeAll(handler: EventHandler): void {
    this.globalHandlers.push(handler);
  }

  async dispatch(event: DomainEvent): Promise<void> {
    const dispatchStart = Date.now();

    // Ensure trace_id propagation
    if (!event.metadata.trace_id) {
      event.metadata.trace_id = randomUUID();
    }

    // Idempotency: deduplicate using Redis SETNX
    try {
      const dedupKey = `event:dedup:${event.id}`;
      const wasSet = await redisConnection.set(dedupKey, '1', 'EX', DEDUP_TTL_SECONDS, 'NX');
      if (!wasSet) {
        logger.warn({ eventId: event.id, eventType: event.type }, 'Duplicate event detected, skipping');
        return;
      }
    } catch (err) {
      // If Redis dedup fails, proceed anyway (best-effort dedup)
      logger.error({ err, eventId: event.id }, 'Event dedup check failed, proceeding');
    }

    // Tenant-aware routing: check if tenant has overrides
    let skipHandlers: string[] = [];
    try {
      if (event.tenant_id) {
        const tenantConfig = await TenantOrchestrationConfigModel.findOne({ tenant_id: event.tenant_id }).lean();
        if (tenantConfig) {
          const override = (tenantConfig.event_overrides as any)?.[event.type];
          if (override?.skip_handlers) {
            skipHandlers = override.skip_handlers;
          }
        }
      }
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to load tenant orchestration config');
    }

    const handlerResults: { handler: string; success: boolean; error?: string }[] = [];

    // Log event
    try {
      await DomainEventLog.create({
        event_id: event.id,
        event_type: event.type,
        tenant_id: event.tenant_id,
        payload: event.payload,
        metadata: event.metadata,
        status: 'processing',
        version: event.version,
        aggregate_id: event.aggregate_id,
      });
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to log event');
    }

    recordMetric('events_dispatched', 1, { type: event.type });

    // Collect all handlers to run
    const typeHandlers = this.handlers.get(event.type) || [];
    const allHandlers: { handler: EventHandler; label: string }[] = [];

    for (const handler of typeHandlers) {
      const name = handler.name || 'anonymous';
      if (skipHandlers.includes(name)) {
        handlerResults.push({ handler: name, success: true, error: 'skipped_by_tenant_config' });
        continue;
      }
      allHandlers.push({ handler, label: name });
    }

    for (const handler of this.globalHandlers) {
      const name = handler.name || 'global';
      if (skipHandlers.includes(name)) {
        handlerResults.push({ handler: name, success: true, error: 'skipped_by_tenant_config' });
        continue;
      }
      allHandlers.push({ handler, label: name });
    }

    // Run handlers concurrently with semaphore-based concurrency limit
    const semaphore = new Semaphore(this.concurrencyLimit);

    const promises = allHandlers.map(async ({ handler, label }) => {
      await semaphore.acquire();
      const start = Date.now();
      try {
        await handler(event);
        recordMetric('handler_duration_ms', Date.now() - start, { handler: label, type: event.type });
        return { handler: label, success: true };
      } catch (err: any) {
        logger.error({ err, eventType: event.type, eventId: event.id, handler: label }, 'Event handler failed');
        recordMetric('events_failed', 1, { handler: label, type: event.type });
        recordMetric('handler_duration_ms', Date.now() - start, { handler: label, type: event.type });
        return { handler: label, success: false, error: err.message };
      } finally {
        semaphore.release();
      }
    });

    const results = await Promise.allSettled(promises);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        handlerResults.push(result.value);
      } else {
        handlerResults.push({ handler: 'unknown', success: false, error: result.reason?.message });
      }
    }

    // Update log
    try {
      await DomainEventLog.updateOne(
        { event_id: event.id },
        { $set: { status: handlerResults.every((r) => r.success) ? 'completed' : 'partial_failure', handler_results: handlerResults } },
      );
    } catch (err) {
      logger.error({ err, eventId: event.id }, 'Failed to update event log');
    }
  }

  /**
   * Replay a previously logged event by re-dispatching it.
   */
  async replay(eventId: string): Promise<{ success: boolean; error?: string }> {
    const log = await DomainEventLog.findOne({ event_id: eventId }).lean();
    if (!log) {
      return { success: false, error: 'Event not found in log' };
    }

    // Clear dedup key so the event can be re-processed
    try {
      await redisConnection.del(`event:dedup:${eventId}`);
    } catch (_err) {
      // best effort
    }

    const event: DomainEvent = {
      id: randomUUID(), // New ID for the replay
      type: log.event_type,
      version: log.version || 1,
      tenant_id: log.tenant_id,
      aggregate_id: log.aggregate_id,
      payload: log.payload,
      metadata: {
        ...(log.metadata || {}),
        source: 'replay',
        trace_id: log.metadata?.trace_id || randomUUID(),
        correlation_id: log.metadata?.correlation_id || randomUUID(),
        timestamp: new Date(),
      },
    };

    await this.dispatch(event);
    return { success: true };
  }
}

export const eventBus = new EventBus();
export default eventBus;
