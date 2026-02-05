import express from "express";
import { SMSCampaign } from "../../../models/SMSCampaign.js";
import { SMSLog } from "../../../models/SMSLog.js";
import { asyncHandler } from "../../../shared/middleware/asyncHandler.js";
import { getPaginationParams, paginateQuery } from "../../../shared/utils/pagination.js";
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /campaigns - List SMS campaigns
router.get("/campaigns", authenticate, asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (status) filter.status = status;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SMSCampaign.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, SMSCampaign);
  res.json(result);
}));

// POST /campaigns - Create SMS campaign
router.post("/campaigns", authenticate, asyncHandler(async (req, res) => {
  const data = { ...req.body, tenant_id: (req as any).tenantId,
    created_by: (req as any).userId,
    total_recipients: req.body.recipients?.length || 0 };
  const campaign = await SMSCampaign.create(data);
  res.status(201).json(campaign);
}));

// GET /campaigns/:id - Get campaign detail
router.get("/campaigns/:id", authenticate, asyncHandler(async (req, res) => {
  const campaign = await SMSCampaign.findById(req.params.id).lean();
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  res.json(campaign);
}));

// PUT /campaigns/:id - Update campaign
router.put("/campaigns/:id", authenticate, asyncHandler(async (req, res) => {
  const campaign = await SMSCampaign.findByIdAndUpdate(
    req.params.id, req.body, { new: true });
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  res.json(campaign);
}));

// POST /campaigns/:id/send - Start sending
router.post("/campaigns/:id/send", authenticate, asyncHandler(async (req, res) => {
  const campaign = await SMSCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  if (campaign.status !== "draft" && campaign.status !== "scheduled")
    return res.status(400).json({ error: "Campaign cannot be sent" });
  campaign.status = "sending";
  campaign.started_at = new Date();
  await campaign.save();
  // TODO: Queue actual SMS sending via provider
  res.json(campaign);
}));

// POST /campaigns/:id/cancel - Cancel campaign
router.post("/campaigns/:id/cancel", authenticate, asyncHandler(async (req, res) => {
  const campaign = await SMSCampaign.findByIdAndUpdate(
    req.params.id, { status: "cancelled" }, { new: true });
  if (!campaign) return res.status(404).json({ error: "Campaign not found" });
  res.json(campaign);
}));

// GET /campaigns/:id/logs - Get SMS delivery logs
router.get("/campaigns/:id/logs", authenticate, asyncHandler(async (req, res) => {
  const pagination = getPaginationParams(req);
  const filter = { tenant_id: (req as any).tenantId,
    campaign_id: req.params.id };
  const result = await paginateQuery(
    SMSLog.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, SMSLog);
  res.json(result);
}));

// POST /send-single - Send single SMS
router.post("/send-single", authenticate, asyncHandler(async (req, res) => {
  const { phone, message } = req.body;
  const log = await SMSLog.create({
    tenant_id: (req as any).tenantId,
    phone, message, status: "queued" });
  // TODO: Send via provider
  res.status(201).json(log);
}));

// GET /logs - Get all SMS logs with filters
router.get("/logs", authenticate, asyncHandler(async (req, res) => {
  const { status, phone } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (status) filter.status = status;
  if (phone) filter.phone = phone;
  const pagination = getPaginationParams(req);
  const result = await paginateQuery(
    SMSLog.find(filter).sort({ created_at: -1 }).lean(), pagination, filter, SMSLog);
  res.json(result);
}));

export default router;
