import express from 'express';
import { ChatWidgetConfig, ChatSession, ChatMessage } from '../models/LiveChat.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// --- Widget Config ---
router.get('/config', asyncHandler(async (req, res) => {
  const config = await ChatWidgetConfig.findOne({ tenant_id: req.query.tenant_id }).lean();
  res.json(config || {});
}));

router.put('/config', asyncHandler(async (req, res) => {
  const config = await ChatWidgetConfig.findOneAndUpdate(
    { tenant_id: req.body.tenant_id },
    req.body,
    { new: true, upsert: true }
  );
  res.json(config);
}));

// --- Sessions ---
router.get('/sessions', asyncHandler(async (req, res) => {
  const { status, agent_id, channel } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (agent_id) filter.agent_id = agent_id;
  if (channel) filter.channel = channel;

  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    ChatSession.find(filter).sort({ created_at: -1 }).lean(),
    pagination, filter, ChatSession
  );
  res.json(result);
}));

router.get('/sessions/:id', asyncHandler(async (req, res) => {
  const session = await ChatSession.findById(req.params.id).lean();
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
}));

router.post('/sessions', asyncHandler(async (req, res) => {
  const session = await ChatSession.create(req.body);
  res.status(201).json(session);
}));

router.put('/sessions/:id', asyncHandler(async (req, res) => {
  const session = await ChatSession.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
}));

// --- Messages ---
router.get('/sessions/:sessionId/messages', asyncHandler(async (req, res) => {
  const messages = await ChatMessage.find({ session_id: req.params.sessionId })
    .sort({ created_at: 1 }).lean();
  res.json(messages);
}));

router.post('/sessions/:sessionId/messages', asyncHandler(async (req, res) => {
  const message = await ChatMessage.create({
    ...req.body,
    session_id: req.params.sessionId,
  });
  res.status(201).json(message);
}));

export default router;
