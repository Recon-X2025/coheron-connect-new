import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { authenticate } from '../../../shared/middleware/permissions.js';
import { requireAIAddon } from '../../../shared/middleware/aiAddon.js';
import { getLLMClient } from '../../../shared/ai/llmClient.js';

const router = express.Router();
const sessions = new Map<string, any>();

router.post("/init", authenticate, requireAIAddon("chatbot"), asyncHandler(async (req: any, res) => {
  const sid = "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  sessions.set(sid, { id: sid, tenant_id: String(req.user.tenant_id), messages: [{ role: "system", content: "You are a CoheronERP support chatbot." }], created_at: new Date() });
  res.json({ success: true, data: { session_id: sid } });
}));

router.post("/message", authenticate, requireAIAddon("chatbot"), asyncHandler(async (req: any, res) => {
  const { session_id, message, kb_context } = req.body;
  if (!session_id || !message) return res.status(400).json({ error: "session_id and message required" });
  const s = sessions.get(session_id);
  if (!s) return res.status(404).json({ error: "Session not found" });
  if (kb_context) s.messages.push({ role: "system", content: "KB: " + JSON.stringify(kb_context) });
  s.messages.push({ role: "user", content: message });
  const client = await getLLMClient(String(req.user.tenant_id));
  const r = await client.chat(s.messages);
  s.messages.push({ role: "assistant", content: r.content });
  res.json({ success: true, data: { response: r.content, session_id, tokens_used: r.tokens_used } });
}));

router.get("/sessions", authenticate, requireAIAddon("chatbot"), asyncHandler(async (req: any, res) => {
  const tid = String(req.user.tenant_id);
  const list = Array.from(sessions.values()).filter((s: any) => s.tenant_id === tid).map((s: any) => ({ id: s.id, created_at: s.created_at, message_count: s.messages.length }));
  res.json({ success: true, data: list });
}));

router.get("/sessions/:id", authenticate, requireAIAddon("chatbot"), asyncHandler(async (req: any, res) => {
  const s = sessions.get(req.params.id);
  if (!s || s.tenant_id !== String(req.user.tenant_id)) return res.status(404).json({ error: "Not found" });
  res.json({ success: true, data: { id: s.id, messages: s.messages.filter((m: any) => m.role !== "system"), created_at: s.created_at } });
}));

export default router;
