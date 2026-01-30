import express from 'express';
import { ChatSession, ChatMessage } from '../models/ChatMessage.js';
import { SupportTicket } from '../models/SupportTicket.js';
import { TicketChannel } from '../models/KbArticle.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../utils/pagination.js';

const router = express.Router();

// ============================================
// LIVE CHAT SESSIONS
// ============================================

// Get all chat sessions
router.get('/sessions', asyncHandler(async (req, res) => {
  const { status, assigned_agent_id, channel } = req.query;
  const filter: any = {};

  if (status) filter.status = status;
  if (assigned_agent_id) filter.assigned_agent_id = assigned_agent_id;
  if (channel) filter.channel = channel;

  const pagination = getPaginationParams(req);
  const paginatedResult = await paginateQuery(
    ChatSession.find(filter)
      .populate('partner_id', 'name email')
      .populate({ path: 'assigned_agent_id', populate: { path: 'user_id', select: 'name' } })
      .sort({ created_at: -1 })
      .lean(),
    pagination,
    filter,
    ChatSession
  );

  const sessionsWithCounts = await Promise.all(
    paginatedResult.data.map(async (s: any) => {
      const message_count = await ChatMessage.countDocuments({ session_id: s.session_id });
      return {
        ...s,
        id: s._id,
        partner_name: s.partner_id?.name,
        partner_email: s.partner_id?.email,
        agent_name: s.assigned_agent_id?.user_id?.name,
        message_count,
      };
    })
  );

  res.json({ data: sessionsWithCounts, pagination: paginatedResult.pagination });
}));

// Get chat session by ID
router.get('/sessions/:sessionId', asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ session_id: req.params.sessionId })
    .populate('partner_id', 'name email')
    .populate({ path: 'assigned_agent_id', populate: { path: 'user_id', select: 'name' } })
    .lean();

  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  const messages = await ChatMessage.find({ session_id: req.params.sessionId })
    .populate('sender_id', 'name')
    .sort({ created_at: 1 })
    .lean();

  const s: any = session;
  res.json({
    ...s,
    id: s._id,
    partner_name: s.partner_id?.name,
    partner_email: s.partner_id?.email,
    agent_name: s.assigned_agent_id?.user_id?.name,
    messages: messages.map((m: any) => ({ ...m, id: m._id, sender_name: m.sender_id?.name })),
  });
}));

// Create chat session
router.post('/sessions', asyncHandler(async (req, res) => {
  const { visitor_name, visitor_email, visitor_phone, partner_id, channel } = req.body;
  const sessionId = `CHAT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const session = await ChatSession.create({
    session_id: sessionId,
    visitor_name,
    visitor_email,
    visitor_phone,
    partner_id,
    channel: channel || 'web',
  });

  res.status(201).json(session);
}));

// Send message
router.post('/sessions/:sessionId/messages', asyncHandler(async (req, res) => {
  const { content, message_type, sender_id } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Message content is required' });
  }

  const message = await ChatMessage.create({
    session_id: req.params.sessionId,
    message_type: message_type || 'user',
    content,
    sender_id,
  });

  await ChatSession.findOneAndUpdate(
    { session_id: req.params.sessionId },
    { status: 'active' }
  );

  res.status(201).json(message);
}));

// Assign agent to chat
router.post('/sessions/:sessionId/assign', asyncHandler(async (req, res) => {
  const { assigned_agent_id } = req.body;
  if (!assigned_agent_id) {
    return res.status(400).json({ error: 'Agent ID is required' });
  }

  const result = await ChatSession.findOneAndUpdate(
    { session_id: req.params.sessionId },
    { assigned_agent_id, status: 'active' },
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  res.json(result);
}));

// End chat session
router.post('/sessions/:sessionId/end', asyncHandler(async (req, res) => {
  const result = await ChatSession.findOneAndUpdate(
    { session_id: req.params.sessionId },
    { status: 'ended', ended_at: new Date() },
    { new: true }
  );

  if (!result) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  res.json(result);
}));

// Create ticket from chat
router.post('/sessions/:sessionId/create-ticket', asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ session_id: req.params.sessionId });
  if (!session) {
    return res.status(404).json({ error: 'Chat session not found' });
  }

  const { subject, description, priority, category_id } = req.body;

  const count = await SupportTicket.countDocuments();
  const num = count + 1;
  const ticketNumber = `TKT-${Date.now()}-${num.toString().padStart(6, '0')}`;

  // Try to find chat channel
  const chatChannel = await TicketChannel.findOne({ channel_type: 'chat' });

  const ticket = await SupportTicket.create({
    ticket_number: ticketNumber,
    subject: subject || `Chat: ${session.visitor_name || 'Visitor'}`,
    description: description || 'Created from live chat session',
    priority: priority || 'medium',
    category_id,
    partner_id: session.partner_id,
    channel_id: chatChannel?._id || null,
    source: `chat-${req.params.sessionId}`,
    ticket_type: 'issue',
  });

  res.status(201).json(ticket);
}));

export default router;
