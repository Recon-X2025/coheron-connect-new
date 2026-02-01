import express from 'express';
import mongoose, { Schema } from 'mongoose';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { defaultSchemaOptions } from '../../../shared/utils/mongoose-helpers.js';

// SLA Alert Config (inline model)
const slaAlertConfigSchema = new Schema({
  tenant_id: { type: Schema.Types.ObjectId, required: true, unique: true, index: true },
  warning_threshold_percent: { type: Number, default: 75 },
  critical_threshold_percent: { type: Number, default: 90 },
  notify_agents: { type: Boolean, default: true },
  notify_managers: { type: Boolean, default: true },
  email_enabled: { type: Boolean, default: true },
}, defaultSchemaOptions);

const SLAAlertConfig = mongoose.model('SLAAlertConfig', slaAlertConfigSchema);

const router = express.Router();

// Simulated ticket data helper (in production, would query actual Ticket model)
function generateSimulatedTickets(tenant_id: any) {
  const now = Date.now();
  const hour = 3600000;
  const statuses = ['open', 'in_progress', 'waiting'];
  const priorities = ['critical', 'high', 'medium', 'low'];
  const agents = ['Agent A', 'Agent B', 'Agent C', 'Agent D'];
  const teams = ['Tier 1', 'Tier 2', 'Tier 3'];
  const slaTargets: Record<string, number> = { critical: 4 * hour, high: 8 * hour, medium: 24 * hour, low: 48 * hour };

  return Array.from({ length: 25 }, (_, i) => {
    const priority = priorities[i % 4];
    const elapsed = Math.random() * slaTargets[priority] * 1.2;
    const target = slaTargets[priority];
    const remaining = target - elapsed;
    return {
      _id: `ticket_${i + 1}`,
      subject: `Support ticket #${1000 + i}`,
      status: statuses[i % 3],
      priority,
      agent: agents[i % 4],
      team: teams[i % 3],
      created_at: new Date(now - elapsed),
      sla_target_ms: target,
      elapsed_ms: elapsed,
      remaining_ms: remaining,
      percent_elapsed: Math.round((elapsed / target) * 100),
      breach_probability: Math.min(100, Math.round(Math.max(0, (elapsed / target) * 100))),
    };
  });
}

// GET /at-risk
router.get('/at-risk', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { threshold = '75' } = req.query;
  const tickets = generateSimulatedTickets(tenant_id);
  const atRisk = tickets.filter(t => t.percent_elapsed >= Number(threshold) && t.remaining_ms > 0)
    .sort((a, b) => b.percent_elapsed - a.percent_elapsed);
  res.json({ tickets: atRisk, total: atRisk.length, threshold: Number(threshold) });
}));

// GET /predictions
router.get('/predictions', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const tickets = generateSimulatedTickets(tenant_id);
  const predictions = tickets.map(t => ({
    ticket_id: t._id,
    subject: t.subject,
    priority: t.priority,
    agent: t.agent,
    breach_probability: t.breach_probability,
    remaining_ms: t.remaining_ms,
    percent_elapsed: t.percent_elapsed,
    risk_level: t.breach_probability >= 90 ? 'critical' : t.breach_probability >= 75 ? 'high' : t.breach_probability >= 50 ? 'medium' : 'low',
  })).sort((a, b) => b.breach_probability - a.breach_probability);
  res.json(predictions);
}));

// GET /trends
router.get('/trends', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const { period = '30' } = req.query;
  const days = Number(period);
  const trends = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const compliance = 70 + Math.random() * 25;
    const total = 10 + Math.floor(Math.random() * 20);
    const breached = Math.floor(total * (1 - compliance / 100));
    return {
      date: date.toISOString().split('T')[0],
      total_tickets: total,
      compliant: total - breached,
      breached,
      compliance_rate: Math.round(compliance),
    };
  });
  res.json(trends);
}));

// GET /team-performance
router.get('/team-performance', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const teams = ['Tier 1', 'Tier 2', 'Tier 3'];
  const agents = ['Agent A', 'Agent B', 'Agent C', 'Agent D'];
  const teamPerf = teams.map(team => ({
    team,
    total_tickets: 30 + Math.floor(Math.random() * 50),
    compliant: 25 + Math.floor(Math.random() * 40),
    breached: Math.floor(Math.random() * 10),
    avg_resolution_hours: Math.round((4 + Math.random() * 20) * 10) / 10,
    compliance_rate: 75 + Math.round(Math.random() * 20),
  }));
  const agentPerf = agents.map(agent => ({
    agent,
    total_tickets: 10 + Math.floor(Math.random() * 30),
    compliant: 8 + Math.floor(Math.random() * 25),
    breached: Math.floor(Math.random() * 5),
    avg_resolution_hours: Math.round((2 + Math.random() * 16) * 10) / 10,
    compliance_rate: 70 + Math.round(Math.random() * 25),
  }));
  res.json({ teams: teamPerf, agents: agentPerf });
}));

// POST /alerts/configure
router.post('/alerts/configure', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  const config = await SLAAlertConfig.findOneAndUpdate(
    { tenant_id },
    { $set: { ...req.body, tenant_id } },
    { new: true, upsert: true },
  ).lean();
  res.json(config);
}));

router.get('/alerts/config', asyncHandler(async (req, res) => {
  const tenant_id = (req as any).user?.tenant_id;
  let config = await SLAAlertConfig.findOne({ tenant_id }).lean();
  if (!config) config = { warning_threshold_percent: 75, critical_threshold_percent: 90, notify_agents: true, notify_managers: true, email_enabled: true } as any;
  res.json(config);
}));

export default router;
