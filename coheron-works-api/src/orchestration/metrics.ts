import logger from '../shared/utils/logger.js';

interface MetricEntry {
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

interface MetricBucket {
  sum: number;
  count: number;
  entries: MetricEntry[];
}

const metrics: Map<string, MetricBucket> = new Map();

const METRIC_NAMES = [
  'events_published',
  'events_dispatched',
  'events_failed',
  'handler_duration_ms',
  'saga_started',
  'saga_completed',
  'saga_failed',
  'saga_step_duration_ms',
  'approvals_created',
  'approvals_decided',
] as const;

export function recordMetric(
  name: string,
  value: number = 1,
  labels: Record<string, string> = {},
): void {
  const bucket = metrics.get(name) || { sum: 0, count: 0, entries: [] };
  bucket.sum += value;
  bucket.count += 1;
  bucket.entries.push({ value, labels, timestamp: Date.now() });

  // Keep only last 1000 entries per metric to bound memory
  if (bucket.entries.length > 1000) {
    bucket.entries = bucket.entries.slice(-1000);
  }

  metrics.set(name, bucket);
}

export function getMetrics(): Record<string, { sum: number; count: number }> {
  const result: Record<string, { sum: number; count: number }> = {};
  for (const [name, bucket] of metrics) {
    result[name] = { sum: bucket.sum, count: bucket.count };
  }
  return result;
}

export function getPrometheusMetrics(): string {
  const lines: string[] = [];

  for (const [name, bucket] of metrics) {
    const metricName = `coheron_orchestration_${name}`;

    // Group entries by label combination for counters
    const labelGroups: Map<string, number> = new Map();
    for (const entry of bucket.entries) {
      const labelStr = Object.entries(entry.labels)
        .map(([k, v]) => `${k}="${v}"`)
        .join(',');
      const key = labelStr || '';
      labelGroups.set(key, (labelGroups.get(key) || 0) + entry.value);
    }

    if (name.endsWith('_ms')) {
      lines.push(`# HELP ${metricName} Duration histogram`);
      lines.push(`# TYPE ${metricName} summary`);
      for (const [labelStr, sum] of labelGroups) {
        const labels = labelStr ? `{${labelStr}}` : '';
        lines.push(`${metricName}_sum${labels} ${sum}`);
      }
      lines.push(`${metricName}_count ${bucket.count}`);
    } else {
      lines.push(`# HELP ${metricName} Counter`);
      lines.push(`# TYPE ${metricName} counter`);
      for (const [labelStr, sum] of labelGroups) {
        const labels = labelStr ? `{${labelStr}}` : '';
        lines.push(`${metricName}${labels} ${sum}`);
      }
    }
  }

  return lines.join('\n') + '\n';
}

export function resetMetrics(): void {
  metrics.clear();
}
