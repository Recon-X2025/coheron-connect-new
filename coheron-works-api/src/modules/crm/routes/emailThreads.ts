import express from "express";
import { EmailThread } from "../../../models/EmailThread.js";
import { asyncHandler } from "../../../shared/middleware/asyncHandler.js";
import { authenticate } from "../../../shared/middleware/permissions.js";
import { getPaginationParams, paginateQuery } from "../../../shared/utils/pagination.js";

const router = express.Router();

// GET / - List email threads
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { related_type, related_id, archived } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (related_type) filter.related_type = related_type;
  if (related_id) filter.related_id = related_id;
  if (archived === "true") filter.is_archived = true;
  else filter.is_archived = false;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    EmailThread.find(filter).sort({ last_message_at: -1 }).lean(),
    pagination, filter, EmailThread
  );
  res.json(result);
}));

// GET /:id - Get thread with messages
router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const thread = await EmailThread.findById(req.params.id).lean();
  if (!thread) return res.status(404).json({ error: "Thread not found" });
  res.json(thread);
}));

// POST / - Create thread
router.post("/", authenticate, asyncHandler(async (req, res) => {
  const data = { ...req.body, tenant_id: (req as any).tenantId,
    created_by: (req as any).userId, message_count: 1,
    last_message_at: new Date() };
  const thread = await EmailThread.create(data);
  res.status(201).json(thread);
}));

// POST /:id/reply - Reply to thread
router.post("/:id/reply", authenticate, asyncHandler(async (req, res) => {
  const thread = await EmailThread.findByIdAndUpdate(req.params.id, {
    $push: { messages: req.body },
    $inc: { message_count: 1 },
    $set: { last_message_at: new Date() }
  }, { new: true });
  if (!thread) return res.status(404).json({ error: "Thread not found" });
  res.json(thread);
}));

// POST /:id/archive - Archive thread
router.post("/:id/archive", authenticate, asyncHandler(async (req, res) => {
  const thread = await EmailThread.findByIdAndUpdate(req.params.id,
    { is_archived: true }, { new: true });
  if (!thread) return res.status(404).json({ error: "Thread not found" });
  res.json(thread);
}));

// POST /incoming - Webhook for incoming email
router.post("/incoming", authenticate, asyncHandler(async (req, res) => {
  const { thread_id, message } = req.body;
  if (thread_id) {
    await EmailThread.findByIdAndUpdate(thread_id, {
      $push: { messages: { ...message, direction: "inbound" } },
      $inc: { message_count: 1 },
      $set: { last_message_at: new Date() }
    });
  } else {
    await EmailThread.create({ ...req.body,
      messages: [{ ...message, direction: "inbound" }],
      message_count: 1, last_message_at: new Date() });
  }
  res.json({ success: true });
}));

export default router;
