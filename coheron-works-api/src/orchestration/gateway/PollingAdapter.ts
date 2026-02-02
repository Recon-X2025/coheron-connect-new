import { eventBus } from '../EventBus.js';
import { CircuitBreaker } from './CircuitBreaker.js';
import logger from '../../shared/utils/logger.js';

export interface PollingSourceConfig {
  name: string;
  /** Polling interval in ms */
  interval_ms: number;
  /** Function that fetches data from the external source */
  fetcher: () => Promise<any[]>;
  /** Maps each fetched item to an event */
  mapper: (item: any) => { eventType: string; tenantId: string; payload: any } | null;
  /** Dedup key extractor — return a unique key per item to avoid re-processing */
  dedupKey?: (item: any) => string;
  /** Circuit breaker config */
  circuit_breaker?: { failure_threshold: number; reset_timeout_ms: number };
}

const pollers: Map<string, NodeJS.Timeout> = new Map();
const processedKeys: Map<string, Set<string>> = new Map();
const breakers: Map<string, CircuitBreaker> = new Map();

const MAX_DEDUP_KEYS = 10000;

export function startPolling(config: PollingSourceConfig): void {
  if (pollers.has(config.name)) {
    logger.warn({ poller: config.name }, 'Poller already running');
    return;
  }

  const breaker = new CircuitBreaker(
    `poller:${config.name}`,
    config.circuit_breaker?.failure_threshold || 5,
    config.circuit_breaker?.reset_timeout_ms || 60000,
  );
  breakers.set(config.name, breaker);
  processedKeys.set(config.name, new Set());

  const poll = async () => {
    if (!breaker.canExecute()) {
      logger.warn({ poller: config.name }, 'Poller circuit breaker open, skipping');
      return;
    }

    try {
      const items = await config.fetcher();
      breaker.recordSuccess();

      const dedupSet = processedKeys.get(config.name)!;

      for (const item of items) {
        // Dedup
        if (config.dedupKey) {
          const key = config.dedupKey(item);
          if (dedupSet.has(key)) continue;
          dedupSet.add(key);
          // Prevent memory leak
          if (dedupSet.size > MAX_DEDUP_KEYS) {
            const entries = Array.from(dedupSet);
            for (let i = 0; i < entries.length - MAX_DEDUP_KEYS / 2; i++) {
              dedupSet.delete(entries[i]);
            }
          }
        }

        const mapped = config.mapper(item);
        if (mapped) {
          eventBus.publish(mapped.eventType, mapped.tenantId, mapped.payload, {
            source: `poller:${config.name}`,
          });
        }
      }

      if (items.length > 0) {
        logger.info({ poller: config.name, items: items.length }, 'Polling cycle completed');
      }
    } catch (err) {
      breaker.recordFailure();
      logger.error({ err, poller: config.name }, 'Polling cycle failed');
    }
  };

  // Run immediately, then on interval
  poll();
  const timer = setInterval(poll, config.interval_ms);
  pollers.set(config.name, timer);
  logger.info({ poller: config.name, interval: config.interval_ms }, 'Polling adapter started');
}

export function stopPolling(name: string): boolean {
  const timer = pollers.get(name);
  if (!timer) return false;
  clearInterval(timer);
  pollers.delete(name);
  processedKeys.delete(name);
  breakers.delete(name);
  logger.info({ poller: name }, 'Polling adapter stopped');
  return true;
}

export function listPollers(): { name: string; circuitBreaker: any }[] {
  return Array.from(pollers.keys()).map((name) => ({
    name,
    circuitBreaker: breakers.get(name)?.getStats() || null,
  }));
}
