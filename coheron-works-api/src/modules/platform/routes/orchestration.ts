import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import DomainEventLog from '../../../models/DomainEventLog.js';
import SagaInstance from '../../../models/SagaInstance.js';
import SagaApprovalGate from '../../../models/SagaApprovalGate.js';
import WebhookEndpoint from '../../../models/WebhookEndpoint.js';
import WebhookDeliveryLog from '../../../models/WebhookDeliveryLog.js';
import TenantOrchestrationConfigModel from '../../../models/TenantOrchestrationConfig.js';
import { eventsQueue, dlqQueue, sagaQueue } from '../../../jobs/queues.js';
import { approvalService } from '../../../orchestration/ApprovalService.js';
import { getWebhookBreakerStats } from '../../../orchestration/gateway/WebhookDispatcher.js';
import { inboundWebhookRouter, listPollers, stopPolling } from '../../../orchestration/gateway/index.js';
import { eventBus } from '../../../orchestration/EventBus.js';
import { sagaOrchestrator } from '../../../orchestration/SagaOrchestrator.js';
import { recoverStuckSagas } from '../../../orchestration/SagaRecovery.js';
import { getMetrics, getPrometheusMetrics } from '../../../orchestration/metrics.js';
import { randomBytes } from 'crypto';

const router = express.Router();

// ============================================
// EVENTS
// ============================================

// GET /orchestration/events — recent events (paginated)
router.get('/events', asyncHandler(async (req, res) => {
  const { event_type, tenant_id, status, correlation_id } = req.query;
  const filter: any = {};
  if (event_type) filter.event_type = event_type;
  if (tenant_id) filter.tenant_id = tenant_id;
  if (status) filter.status = status;
  if (correlation_id) filter['metadata.correlation_id'] = correlation_id;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    DomainEventLog.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    DomainEventLog,
  );
  res.json(result);
}));

// GET /orchestration/events/stats — counts by type
router.get('/events/stats', asyncHandler(async (_req, res) => {
  const stats = await DomainEventLog.aggregate([
    { $group: { _id: '$event_type', count: { $sum: 1 }, last_at: { $max: '$created_at' } } },
    { $sort: { count: -1 } },
  ]);
  res.json(stats);
}));

// GET /orchestration/events/metrics — throughput, latency, failure rates
router.get('/events/metrics', asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h

  const [totalEvents, statusBreakdown, hourlyThroughput, topFailures] = await Promise.all([
    DomainEventLog.countDocuments({ created_at: { $gte: since } }),
    DomainEventLog.aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    DomainEventLog.aggregate([
      { $match: { created_at: { $gte: since } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%dT%H:00:00Z', date: '$created_at' } },
        count: { $sum: 1 },
      } },
      { $sort: { _id: 1 } },
    ]),
    DomainEventLog.aggregate([
      { $match: { created_at: { $gte: since }, status: 'partial_failure' } },
      { $unwind: '$handler_results' },
      { $match: { 'handler_results.success': false } },
      { $group: { _id: { event_type: '$event_type', handler: '$handler_results.handler' }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
  ]);

  res.json({
    period: '24h',
    total_events: totalEvents,
    status_breakdown: statusBreakdown,
    hourly_throughput: hourlyThroughput,
    top_failures: topFailures,
  });
}));

// GET /orchestration/events/:id/trace — trace all events in a correlation chain
router.get('/events/:id/trace', asyncHandler(async (req, res) => {
  const event = await DomainEventLog.findOne({ event_id: req.params.id }).lean();
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const correlationId = (event.metadata as any)?.correlation_id;
  if (!correlationId) return res.json({ event, related: [] });

  const related = await DomainEventLog.find({
    'metadata.correlation_id': correlationId,
  }).sort({ created_at: 1 }).lean();

  res.json({ event, correlation_id: correlationId, trace: related });
}));

// POST /orchestration/events/:id/replay — replay a single event
router.post('/events/:id/replay', asyncHandler(async (req, res) => {
  const result = await eventBus.replay(req.params.id);
  if (!result.success) {
    return res.status(404).json({ error: result.error });
  }
  res.json({ message: 'Event replayed successfully' });
}));

// POST /orchestration/events/replay-range — replay events matching a filter
router.post('/events/replay-range', asyncHandler(async (req, res) => {
  const { event_type, tenant_id, from, to, limit: maxLimit } = req.body;
  const filter: any = {};
  if (event_type) filter.event_type = event_type;
  if (tenant_id) filter.tenant_id = tenant_id;
  if (from || to) {
    filter.created_at = {};
    if (from) filter.created_at.$gte = new Date(from);
    if (to) filter.created_at.$lte = new Date(to);
  }

  const replayLimit = Math.min(maxLimit || 100, 500);
  const events = await DomainEventLog.find(filter)
    .sort({ created_at: 1 })
    .limit(replayLimit)
    .lean();

  let replayed = 0;
  let failed = 0;

  // Rate limit: process sequentially with small delay
  for (const evt of events) {
    try {
      const result = await eventBus.replay(evt.event_id);
      if (result.success) replayed++;
      else failed++;
    } catch {
      failed++;
    }
    // Small delay between replays to avoid overwhelming the system
    if (replayed % 10 === 0 && replayed > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  res.json({ total_found: events.length, replayed, failed });
}));

// ============================================
// DEAD LETTER QUEUE
// ============================================

router.get('/dlq', asyncHandler(async (_req, res) => {
  const jobs = await dlqQueue.getJobs(['completed', 'waiting', 'active', 'delayed', 'failed'], 0, 50);
  const items = jobs.map((j) => ({
    id: j.id,
    data: j.data,
    timestamp: j.timestamp,
    attemptsMade: j.attemptsMade,
  }));
  res.json(items);
}));

router.post('/dlq/:id/retry', asyncHandler(async (req, res) => {
  const job = await dlqQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'DLQ item not found' });

  const eventData = job.data?.event;
  if (!eventData) return res.status(400).json({ error: 'No event data to retry' });

  await eventsQueue.add(eventData.type, eventData, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
  });
  await job.remove();
  res.json({ message: 'Event re-queued for processing' });
}));

router.delete('/dlq/:id', asyncHandler(async (req, res) => {
  const job = await dlqQueue.getJob(req.params.id);
  if (!job) return res.status(404).json({ error: 'DLQ item not found' });
  await job.remove();
  res.json({ message: 'DLQ item discarded' });
}));

// ============================================
// SAGAS
// ============================================

router.get('/sagas', asyncHandler(async (req, res) => {
  const { status, saga_name } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (saga_name) filter.saga_name = saga_name;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SagaInstance.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    SagaInstance,
  );
  res.json(result);
}));

router.get('/sagas/definitions', asyncHandler(async (_req, res) => {
  const definitions = sagaOrchestrator.listDefinitions();
  res.json(definitions);
}));

router.get('/sagas/:id', asyncHandler(async (req, res) => {
  const saga = await SagaInstance.findById(req.params.id).lean();
  if (!saga) return res.status(404).json({ error: 'Saga not found' });
  res.json(saga);
}));

// GET /orchestration/sagas/:id/flow — visual flow representation
router.get('/sagas/:id/flow', asyncHandler(async (req, res) => {
  const saga = await SagaInstance.findById(req.params.id).lean();
  if (!saga) return res.status(404).json({ error: 'Saga not found' });

  const stepMap = new Map((saga.step_results || []).map((s) => [s.step_name, s]));
  const steps = (saga.step_results || []).map((s, i) => {
    let icon = '⏳';
    if (s.status === 'completed') icon = '✓';
    else if (s.status === 'failed') icon = '✗';
    else if (s.step_name?.includes(':compensate')) icon = '↩';

    return {
      index: i,
      name: s.step_name,
      status: s.status,
      icon,
      completed_at: s.completed_at,
      error: s.error || null,
    };
  });

  // Check for pending approval
  const pendingApproval = await SagaApprovalGate.findOne({
    saga_instance_id: saga._id?.toString(),
    status: 'pending',
  }).lean();

  res.json({
    saga_name: saga.saga_name,
    status: saga.status,
    correlation_id: saga.correlation_id,
    current_step: saga.current_step,
    steps,
    pending_approval: pendingApproval ? {
      id: pendingApproval._id,
      title: pendingApproval.title,
      step_name: pendingApproval.step_name,
      timeout_at: pendingApproval.timeout_at,
    } : null,
    created_at: saga.created_at,
    updated_at: saga.updated_at,
  });
}));

// POST /orchestration/sagas/recover — manual saga recovery trigger
router.post('/sagas/recover', asyncHandler(async (_req, res) => {
  const result = await recoverStuckSagas();
  res.json(result);
}));

// ============================================
// APPROVAL GATES
// ============================================

// GET /orchestration/approvals — list pending approvals
router.get('/approvals', asyncHandler(async (req, res) => {
  const { status, tenant_id, saga_name } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (tenant_id) filter.tenant_id = tenant_id;
  if (saga_name) filter.saga_name = saga_name;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SagaApprovalGate.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    SagaApprovalGate,
  );
  res.json(result);
}));

// GET /orchestration/approvals/:id
router.get('/approvals/:id', asyncHandler(async (req, res) => {
  const gate = await SagaApprovalGate.findById(req.params.id).lean();
  if (!gate) return res.status(404).json({ error: 'Approval gate not found' });
  res.json(gate);
}));

// POST /orchestration/approvals/:id/decide
router.post('/approvals/:id/decide', asyncHandler(async (req, res) => {
  const { decision, decided_by, note } = req.body;
  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Decision must be "approved" or "rejected"' });
  }
  const gate = await approvalService.decide(req.params.id, decision, decided_by, note);
  res.json(gate);
}));

// ============================================
// WEBHOOKS (Outbound)
// ============================================

// GET /orchestration/webhooks — list webhook endpoints
router.get('/webhooks', asyncHandler(async (req, res) => {
  const filter: any = {};
  if (req.query.tenant_id) filter.tenant_id = req.query.tenant_id;

  const endpoints = await WebhookEndpoint.find(filter).sort({ created_at: -1 }).lean();
  // Mask secrets
  const masked = endpoints.map((e: any) => ({ ...e, secret: '***' }));
  res.json(masked);
}));

// POST /orchestration/webhooks — create webhook endpoint
router.post('/webhooks', asyncHandler(async (req, res) => {
  const { tenant_id, name, url, events, headers } = req.body;
  if (!tenant_id || !name || !url || !events?.length) {
    return res.status(400).json({ error: 'tenant_id, name, url, and events are required' });
  }

  const secret = randomBytes(32).toString('hex');
  const endpoint = await WebhookEndpoint.create({
    tenant_id, name, url, secret, events, headers: headers || {}, active: true,
  });

  res.status(201).json({ ...endpoint.toObject(), secret }); // Show secret only on creation
}));

// PUT /orchestration/webhooks/:id
router.put('/webhooks/:id', asyncHandler(async (req, res) => {
  const { name, url, events, headers, active } = req.body;
  const update: any = {};
  if (name !== undefined) update.name = name;
  if (url !== undefined) update.url = url;
  if (events !== undefined) update.events = events;
  if (headers !== undefined) update.headers = headers;
  if (active !== undefined) update.active = active;

  const endpoint = await WebhookEndpoint.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!endpoint) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ ...endpoint.toObject(), secret: '***' });
}));

// DELETE /orchestration/webhooks/:id
router.delete('/webhooks/:id', asyncHandler(async (req, res) => {
  const endpoint = await WebhookEndpoint.findByIdAndDelete(req.params.id);
  if (!endpoint) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ message: 'Webhook deleted' });
}));

// POST /orchestration/webhooks/:id/rotate-secret
router.post('/webhooks/:id/rotate-secret', asyncHandler(async (req, res) => {
  const newSecret = randomBytes(32).toString('hex');
  const endpoint = await WebhookEndpoint.findByIdAndUpdate(
    req.params.id,
    { secret: newSecret },
    { new: true },
  );
  if (!endpoint) return res.status(404).json({ error: 'Webhook not found' });
  res.json({ secret: newSecret });
}));

// GET /orchestration/webhooks/:id/deliveries — delivery log for a webhook
router.get('/webhooks/:id/deliveries', asyncHandler(async (req, res) => {
  const pagination = getPaginationParams(req);
  const filter = { webhook_id: req.params.id };
  const result = await paginateQuery(
    WebhookDeliveryLog.find(filter).sort({ created_at: -1 }).lean(),
    pagination,
    filter,
    WebhookDeliveryLog,
  );
  res.json(result);
}));

// GET /orchestration/webhooks/breakers — circuit breaker states
router.get('/webhooks/breakers', asyncHandler(async (_req, res) => {
  res.json(getWebhookBreakerStats());
}));

// ============================================
// INBOUND WEBHOOKS
// ============================================
router.use('/webhooks', inboundWebhookRouter);

// ============================================
// POLLERS
// ============================================

// GET /orchestration/pollers — list active pollers
router.get('/pollers', asyncHandler(async (_req, res) => {
  res.json(listPollers());
}));

// POST /orchestration/pollers/:name/stop — stop a poller
router.post('/pollers/:name/stop', asyncHandler(async (req, res) => {
  const stopped = stopPolling(req.params.name);
  if (!stopped) {
    return res.status(404).json({ error: `Poller "${req.params.name}" not found` });
  }
  res.json({ message: `Poller "${req.params.name}" stopped` });
}));

// ============================================
// TENANT CONFIG
// ============================================

// GET /orchestration/tenant-config/:tenant_id
router.get('/tenant-config/:tenant_id', asyncHandler(async (req, res) => {
  const config = await TenantOrchestrationConfigModel.findOne({ tenant_id: req.params.tenant_id }).lean();
  if (!config) {
    return res.json({
      tenant_id: req.params.tenant_id,
      enabled_modules: [],
      event_overrides: {},
      enabled_sagas: [],
      escalation_chain: {},
    });
  }
  res.json(config);
}));

// PUT /orchestration/tenant-config/:tenant_id
router.put('/tenant-config/:tenant_id', asyncHandler(async (req, res) => {
  const { enabled_modules, event_overrides, enabled_sagas, escalation_chain } = req.body;
  const update: any = {};
  if (enabled_modules !== undefined) update.enabled_modules = enabled_modules;
  if (event_overrides !== undefined) update.event_overrides = event_overrides;
  if (enabled_sagas !== undefined) update.enabled_sagas = enabled_sagas;
  if (escalation_chain !== undefined) update.escalation_chain = escalation_chain;

  const config = await TenantOrchestrationConfigModel.findOneAndUpdate(
    { tenant_id: req.params.tenant_id },
    { $set: update, $setOnInsert: { tenant_id: req.params.tenant_id } },
    { new: true, upsert: true },
  );
  res.json(config);
}));

// ============================================
// METRICS & OBSERVABILITY
// ============================================

// GET /orchestration/metrics — JSON metrics
router.get('/metrics', asyncHandler(async (_req, res) => {
  res.json(getMetrics());
}));

// GET /orchestration/metrics/prometheus — Prometheus text format
router.get('/metrics/prometheus', asyncHandler(async (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(getPrometheusMetrics());
}));

// ============================================
// HEALTH & MONITORING
// ============================================

router.get('/health', asyncHandler(async (_req, res) => {
  const [eventsWaiting, eventsActive, eventsDelayed, dlqWaiting, sagaWaiting] = await Promise.all([
    eventsQueue.getWaitingCount(),
    eventsQueue.getActiveCount(),
    eventsQueue.getDelayedCount(),
    dlqQueue.getWaitingCount(),
    sagaQueue.getWaitingCount(),
  ]);

  const [runningSagas, failedSagas, pendingApprovals] = await Promise.all([
    SagaInstance.countDocuments({ status: 'running' }),
    SagaInstance.countDocuments({ status: 'failed' }),
    SagaApprovalGate.countDocuments({ status: 'pending' }),
  ]);

  const webhookBreakers = getWebhookBreakerStats();
  const openBreakers = webhookBreakers.filter((b) => b.state === 'open').length;

  res.json({
    queues: {
      events: { waiting: eventsWaiting, active: eventsActive, delayed: eventsDelayed },
      dlq: { waiting: dlqWaiting },
      saga: { waiting: sagaWaiting },
    },
    sagas: { running: runningSagas, failed: failedSagas },
    approvals: { pending: pendingApprovals },
    webhooks: { circuit_breakers_open: openBreakers, total_breakers: webhookBreakers.length },
    status: 'ok',
  });
}));

export default router;
