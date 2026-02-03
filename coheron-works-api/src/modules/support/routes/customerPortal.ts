import express from 'express';
import crypto from 'crypto';
import SupportPortalUser from '../../../models/SupportPortalUser.js';
import { SupportTicket } from '../../../models/SupportTicket.js';
import { KbArticle } from '../../../models/KbArticle.js';
import { ChatSession, ChatMessage } from '../../../models/ChatMessage.js';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

const PORTAL_SECRET = process.env.PORTAL_JWT_SECRET || 'portal-secret';

// POST /register - Customer self-registration
router.post('/register', asyncHandler(async (req, res) => {
  const { tenant_id, partner_id, email, password, name } = req.body;
  const existing = await SupportPortalUser.findOne({ tenant_id, email });
  if (existing) return res.status(400).json({ error: 'Email already registered' });
  const password_hash = await bcrypt.hash(password, 10);
  const user = new SupportPortalUser({ tenant_id, partner_id, email, password_hash, name });
  await user.save();
  res.status(201).json({ message: 'Registration successful', user_id: user._id });
}));

// POST /login - Customer portal login
router.post('/login', asyncHandler(async (req, res) => {
  const { tenant_id, email, password } = req.body;
  const user = await SupportPortalUser.findOne({ tenant_id, email, is_active: true });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  user.last_login = new Date();
  await user.save();
  const token = jwt.sign({ portal_user_id: user._id, tenant_id, partner_id: user.partner_id }, PORTAL_SECRET, { expiresIn: '8h' });
  res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
}));

// Middleware: verify portal token for protected routes
const portalAuth = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, PORTAL_SECRET) as any;
    req.portalUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /tickets - List own tickets
router.get('/tickets', portalAuth, asyncHandler(async (req: any, res) => {
  const tickets = await SupportTicket.find({ tenant_id: req.portalUser.tenant_id, partner_id: req.portalUser.partner_id }).sort({ created_at: -1 });
  res.json(tickets);
}));

// POST /tickets - Create ticket from portal
router.post('/tickets', portalAuth, asyncHandler(async (req: any, res) => {
  const ticket = new SupportTicket({
    ...req.body,
    tenant_id: req.portalUser.tenant_id,
    partner_id: req.portalUser.partner_id,
    source: 'portal',
    status: 'open',
  });
  await ticket.save();
  res.status(201).json(ticket);
}));

// GET /tickets/:id - View own ticket detail
router.get('/tickets/:id', portalAuth, asyncHandler(async (req: any, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, tenant_id: req.portalUser.tenant_id, partner_id: req.portalUser.partner_id });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
}));

// POST /tickets/:id/reply - Add reply to ticket
router.post('/tickets/:id/reply', portalAuth, asyncHandler(async (req: any, res) => {
  const ticket = await SupportTicket.findOne({ _id: req.params.id, tenant_id: req.portalUser.tenant_id, partner_id: req.portalUser.partner_id });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const reply = { message: req.body.message, from: 'customer', created_at: new Date() };
  (ticket as any).replies = [...((ticket as any).replies || []), reply];
  await ticket.save();
  res.json(reply);
}));

// GET /knowledge-base - Search public KB articles
router.get('/knowledge-base', asyncHandler(async (req, res) => {
  const { q, tenant_id } = req.query;
  const filter: any = { tenant_id, is_published: true };
  if (q) filter.$text = { $search: q as string };
  const articles = await KbArticle.find(filter).select('title slug category excerpt created_at').limit(20);
  res.json(articles);
}));

// ── Public Live Chat endpoints ──

// POST /chat/sessions - Create a chat session (public, no auth required)
router.post('/chat/sessions', asyncHandler(async (req, res) => {
  const { visitor_name, visitor_email, channel } = req.body;
  const session = new ChatSession({
    session_id: crypto.randomUUID(),
    visitor_name: visitor_name || 'Visitor',
    visitor_email,
    channel: channel || 'web',
    status: 'waiting',
  });
  await session.save();
  res.status(201).json(session);
}));

// GET /chat/sessions/:sessionId - Get chat session with messages
router.get('/chat/sessions/:sessionId', asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ session_id: req.params.sessionId });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const messages = await ChatMessage.find({ session_id: req.params.sessionId }).sort({ created_at: 1 });
  res.json({ ...session.toJSON(), messages });
}));

// POST /chat/sessions/:sessionId/messages - Send a message (public)
router.post('/chat/sessions/:sessionId/messages', asyncHandler(async (req, res) => {
  const session = await ChatSession.findOne({ session_id: req.params.sessionId });
  if (!session) return res.status(404).json({ error: 'Session not found' });
  const message = new ChatMessage({
    session_id: req.params.sessionId,
    content: req.body.content,
    message_type: req.body.message_type || 'user',
  });
  await message.save();
  res.status(201).json(message);
}));

export default router;
