import express from "express";
import { CampaignAnalytics } from "../../../models/CampaignAnalytics.js";
import { asyncHandler } from "../../../shared/middleware/asyncHandler.js";
import { authenticate } from '../../../shared/middleware/permissions.js';

const router = express.Router();

// GET /summary - Aggregate analytics
router.get("/summary", authenticate, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  if (start_date || end_date) {
    filter.date = {};
    if (start_date) filter.date.$gte = new Date(start_date as string);
    if (end_date) filter.date.$lte = new Date(end_date as string);
  }
  const result = await CampaignAnalytics.aggregate([
    { $match: filter },
    { $group: {
      _id: null,
      emails_sent: { $sum: "$emails_sent" },
      emails_delivered: { $sum: "$emails_delivered" },
      emails_opened: { $sum: "$emails_opened" },
      emails_clicked: { $sum: "$emails_clicked" },
      emails_bounced: { $sum: "$emails_bounced" },
      sms_sent: { $sum: "$sms_sent" },
      sms_delivered: { $sum: "$sms_delivered" },
      leads_generated: { $sum: "$leads_generated" },
      revenue_attributed: { $sum: "$revenue_attributed" },
      cost: { $sum: "$cost" },
      conversions: { $sum: "$conversions" },
    }}
  ]);
  res.json(result[0] || {});
}));

// GET /top-performing
router.get("/top-performing", authenticate, asyncHandler(async (req, res) => {
  const { metric = "emails_opened", limit = "10" } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId };
  const result = await CampaignAnalytics.aggregate([
    { $match: filter },
    { $group: { _id: "$campaign_id",
      total: { $sum: "$" + (metric as string) } } },
    { $sort: { total: -1 } },
    { $limit: parseInt(limit as string) }
  ]);
  res.json(result);
}));

// GET /:campaignId
router.get("/:campaignId", authenticate, asyncHandler(async (req, res) => {
  const filter = { tenant_id: (req as any).tenantId,
    campaign_id: req.params.campaignId };
  const data = await CampaignAnalytics.find(filter).sort({ date: -1 }).lean();
  res.json(data);
}));

// GET /:campaignId/timeline
router.get("/:campaignId/timeline", authenticate, asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const filter: any = { tenant_id: (req as any).tenantId,
    campaign_id: req.params.campaignId };
  if (start_date || end_date) {
    filter.date = {};
    if (start_date) filter.date.$gte = new Date(start_date as string);
    if (end_date) filter.date.$lte = new Date(end_date as string);
  }
  const data = await CampaignAnalytics.find(filter).sort({ date: 1 }).lean();
  res.json(data);
}));

// POST /:campaignId/record
router.post("/:campaignId/record", authenticate, asyncHandler(async (req, res) => {
  const { date, ...metrics } = req.body;
  const filter = { tenant_id: (req as any).tenantId,
    campaign_id: req.params.campaignId, date: new Date(date) };
  const result = await CampaignAnalytics.findOneAndUpdate(
    filter, { $inc: metrics }, { upsert: true, new: true });
  res.json(result);
}));

export default router;
