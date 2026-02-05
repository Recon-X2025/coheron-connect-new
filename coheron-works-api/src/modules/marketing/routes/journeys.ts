import express from "express";
import { MarketingJourney } from "../../../models/MarketingJourney.js";
import { JourneyEnrollment } from "../../../models/JourneyEnrollment.js";
import { asyncHandler } from "../../../shared/middleware/asyncHandler.js";
import { getPaginationParams, paginateQuery } from "../../../shared/utils/pagination.js";
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// List journeys
router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { status, search } = req.query;
  const filter: any = {};
  if (status) filter.status = status;
  if (search) filter.name = { $regex: search as string, $options: "i" };
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(MarketingJourney.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, MarketingJourney);
  res.json(result);
}));

// Create journey
router.post("/", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.create(req.body);
  res.status(201).json(journey);
}));

// Get journey by ID
router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findById(req.params.id).lean();
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  res.json(journey);
}));

// Update journey
router.put("/:id", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  res.json(journey);
}));

// Activate journey
router.post("/:id/activate", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findByIdAndUpdate(req.params.id, { status: "active", started_at: new Date() }, { new: true });
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  res.json(journey);
}));

// Pause journey
router.post("/:id/pause", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findByIdAndUpdate(req.params.id, { status: "paused" }, { new: true });
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  res.json(journey);
}));

// Archive journey
router.post("/:id/archive", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findByIdAndUpdate(req.params.id, { status: "archived", ended_at: new Date() }, { new: true });
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  res.json(journey);
}));

// Journey analytics
router.get("/:id/analytics", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findById(req.params.id).lean();
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  const enrollments = await JourneyEnrollment.find({ journey_id: req.params.id }).lean();
  const nodeStats: any = {};
  for (const node of (journey as any).nodes || []) {
    nodeStats[node.id] = { entered: 0, exited: 0, active: 0 };
  }
  for (const e of enrollments) {
    for (const h of e.node_history || []) {
      if (nodeStats[h.node_id]) {
        nodeStats[h.node_id].entered++;
        if (h.exited_at) nodeStats[h.node_id].exited++;
      }
    }
  }
  res.json({ journey_id: req.params.id, enrollment_count: enrollments.length, status_breakdown: { active: enrollments.filter(e => e.status === "active").length, completed: enrollments.filter(e => e.status === "completed").length, exited: enrollments.filter(e => e.status === "exited").length, goal_reached: enrollments.filter(e => e.status === "goal_reached").length }, node_stats: nodeStats });
}));

// List enrollments
router.get("/:id/enrollments", authenticate, asyncHandler(async (req, res) => {
  const filter: any = { journey_id: req.params.id };
  if (req.query.status) filter.status = req.query.status;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(JourneyEnrollment.find(filter).sort({ entered_at: -1 }).lean(), pagination, filter, JourneyEnrollment);
  res.json(result);
}));

// Manually enroll contacts
router.post("/:id/enroll", authenticate, asyncHandler(async (req, res) => {
  const journey = await MarketingJourney.findById(req.params.id);
  if (!journey) return res.status(404).json({ error: "Journey not found" });
  const { contacts } = req.body;
  const enrollments = await JourneyEnrollment.insertMany((contacts || []).map((c: any) => ({
    tenant_id: journey.tenant_id, journey_id: journey._id, contact_id: c.contact_id, contact_email: c.email,
    current_node_id: (journey.nodes && journey.nodes[0]) ? journey.nodes[0].id : undefined, status: "active",
  })));
  await MarketingJourney.findByIdAndUpdate(req.params.id, { $inc: { enrollment_count: enrollments.length, active_count: enrollments.length } });
  res.status(201).json(enrollments);
}));

// Exit enrollment
router.post("/:id/enrollments/:enrollmentId/exit", authenticate, asyncHandler(async (req, res) => {
  const enrollment = await JourneyEnrollment.findByIdAndUpdate(req.params.enrollmentId, { status: "exited", completed_at: new Date() }, { new: true });
  if (!enrollment) return res.status(404).json({ error: "Enrollment not found" });
  await MarketingJourney.findByIdAndUpdate(req.params.id, { $inc: { active_count: -1 } });
  res.json(enrollment);
}));

export default router;
