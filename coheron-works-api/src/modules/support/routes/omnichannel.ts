import express from 'express';
import { VoiceCall } from '../../../models/VoiceCall.js';
import { ChannelSession } from '../../../models/ChannelSession.js';
import { AgentStatus } from '../../../models/AgentStatus.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';

const router = express.Router();

// POST /voice/inbound
router.post('/voice/inbound', asyncHandler(async (req, res) => {
  const call = await VoiceCall.create({ ...req.body, direction: 'inbound', started_at: new Date() });
  res.status(201).json(call);
}));

// POST /voice/outbound
router.post('/voice/outbound', asyncHandler(async (req, res) => {
  const call = await VoiceCall.create({ ...req.body, direction: 'outbound', started_at: new Date() });
  res.status(201).json(call);
}));

// PUT /voice/:callId/status
router.put('/voice/:callId/status', asyncHandler(async (req, res) => {
  const call = await VoiceCall.findByIdAndUpdate(req.params.callId, req.body, { new: true });
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
}));

// POST /voice/:callId/transcription
router.post('/voice/:callId/transcription', asyncHandler(async (req, res) => {
  const { transcription_text, transcription_summary, sentiment, intent_detected } = req.body;
  const call = await VoiceCall.findByIdAndUpdate(req.params.callId,
    { transcription_text, transcription_summary, sentiment, intent_detected }, { new: true });
  if (!call) return res.status(404).json({ error: 'Call not found' });
  res.json(call);
}));

// GET /sessions
router.get('/sessions', asyncHandler(async (req, res) => {
  const { status, current_agent_id } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (current_agent_id) filter.current_agent_id = current_agent_id;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    ChannelSession.find(filter).sort({ started_at: -1 }).lean(),
    pagination, filter, ChannelSession);
  res.json(result);
}));

// POST /sessions
router.post('/sessions', asyncHandler(async (req, res) => {
  const session = await ChannelSession.create({ ...req.body, started_at: new Date() });
  res.status(201).json(session);
}));

// PUT /sessions/:id/switch-channel
router.put('/sessions/:id/switch-channel', asyncHandler(async (req, res) => {
  const { channel, agent_id } = req.body;
  const session = await ChannelSession.findById(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const last = session.channels_used[session.channels_used.length - 1];
  if (last && !last.ended_at) last.ended_at = new Date();
  session.channels_used.push({ channel, started_at: new Date(), agent_id });
  session.current_channel = channel;
  if (agent_id) session.current_agent_id = agent_id;
  await session.save();
  res.json(session);
}));

// PUT /sessions/:id/transfer
router.put('/sessions/:id/transfer', asyncHandler(async (req, res) => {
  const { agent_id } = req.body;
  const session = await ChannelSession.findByIdAndUpdate(req.params.id,
    { current_agent_id: agent_id }, { new: true });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
}));

// PUT /sessions/:id/resolve
router.put('/sessions/:id/resolve', asyncHandler(async (req, res) => {
  const session = await ChannelSession.findByIdAndUpdate(req.params.id,
    { status: 'resolved', ended_at: new Date(), ...req.body }, { new: true });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
}));

// GET /agents
router.get('/agents', asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  const agents = await AgentStatus.find(filter).populate('agent_id').lean();
  res.json(agents);
}));

// PUT /agents/:id/status
router.put('/agents/:id/status', asyncHandler(async (req, res) => {
  const agent = await AgentStatus.findByIdAndUpdate(req.params.id,
    { ...req.body, last_activity_at: new Date() }, { new: true, upsert: true });
  res.json(agent);
}));

// GET /supervisor/dashboard
router.get('/supervisor/dashboard', asyncHandler(async (req, res) => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [activeSessions, agentCounts, resolvedToday, waitingSessions] = await Promise.all([
    ChannelSession.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: "$current_channel", count: { $sum: 1 } } }
    ]),
    AgentStatus.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    ChannelSession.countDocuments({ status: "resolved", ended_at: { $gte: today } }),
    ChannelSession.find({ status: "waiting" }).sort({ started_at: 1 }).limit(1).lean(),
  ]);
  const activeByChannel: any = {};
  activeSessions.forEach((s: any) => { activeByChannel[s._id] = s.count; });
  const agentsByStatus: any = {};
  agentCounts.forEach((a: any) => { agentsByStatus[a._id] = a.count; });
  const longestWaiting = waitingSessions[0] || null;
  const avgHandleTime = await AgentStatus.aggregate([
    { $group: { _id: null, avg: { $avg: "$avg_handle_time_today" } } }]);
  const avgCsat = await AgentStatus.aggregate([
    { $match: { csat_today: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: "$csat_today" } } }]);
  const queueDepth = await ChannelSession.countDocuments({ status: "waiting" });
  res.json({
    active_sessions_by_channel: activeByChannel,
    agents_by_status: agentsByStatus,
    avg_handle_time: avgHandleTime[0]?.avg || 0,
    csat_today: avgCsat[0]?.avg || 0,
    queue_depth: queueDepth,
    sessions_resolved_today: resolvedToday,
    longest_waiting_session: longestWaiting,
  });
}));

export default router;
