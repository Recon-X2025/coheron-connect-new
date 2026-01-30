import express from 'express';
import { SupportTicket } from '../models/SupportTicket.js';
import { SupportAgent } from '../models/SupportTeam.js';
import { SurveyResponse } from '../models/SupportSurvey.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = express.Router();

// ============================================
// SUPPORT DESK REPORTS & ANALYTICS
// ============================================

// Dashboard overview
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const dateFilter: any = {};
  if (start_date && end_date) {
    dateFilter.created_at = { $gte: new Date(start_date as string), $lte: new Date(end_date as string) };
  }

  const totalTickets = await SupportTicket.countDocuments(dateFilter);

  const ticketsByStatus = await SupportTicket.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  const ticketsByPriority = await SupportTicket.aggregate([
    { $match: dateFilter },
    { $group: { _id: '$priority', count: { $sum: 1 } } },
  ]);

  const ticketsByChannel = await SupportTicket.aggregate([
    { $match: dateFilter },
    { $lookup: { from: 'ticketchannels', localField: 'channel_id', foreignField: '_id', as: 'channel' } },
    { $unwind: { path: '$channel', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$channel.name', count: { $sum: 1 } } },
  ]);

  const slaMetrics = await SupportTicket.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: null,
        total_tickets: { $sum: 1 },
        breached_count: { $sum: { $cond: ['$is_sla_breached', 1, 0] } },
        met_count: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$resolved_at', null] }, { $lte: ['$resolved_at', '$sla_resolution_deadline'] }] },
              1, 0
            ]
          }
        },
      },
    },
  ]);

  const avgResponseTime = await SupportTicket.aggregate([
    { $match: { ...dateFilter, first_response_at: { $ne: null } } },
    {
      $group: {
        _id: null,
        avg_minutes: { $avg: { $divide: [{ $subtract: ['$first_response_at', '$created_at'] }, 60000] } },
      },
    },
  ]);

  const avgResolutionTime = await SupportTicket.aggregate([
    { $match: { ...dateFilter, resolved_at: { $ne: null } } },
    {
      $group: {
        _id: null,
        avg_minutes: { $avg: { $divide: [{ $subtract: ['$resolved_at', '$created_at'] }, 60000] } },
      },
    },
  ]);

  const sla = slaMetrics[0] || { total_tickets: 0, breached_count: 0, met_count: 0 };

  res.json({
    total_tickets: totalTickets,
    tickets_by_status: ticketsByStatus.map((s) => ({ status: s._id, count: s.count })),
    tickets_by_priority: ticketsByPriority.map((p) => ({ priority: p._id, count: p.count })),
    tickets_by_channel: ticketsByChannel.map((c) => ({ channel_name: c._id, count: c.count })),
    sla_metrics: {
      ...sla,
      breach_rate: sla.total_tickets > 0 ? (sla.breached_count / sla.total_tickets) * 100 : 0,
    },
    avg_response_time_minutes: avgResponseTime[0]?.avg_minutes || 0,
    avg_resolution_time_minutes: avgResolutionTime[0]?.avg_minutes || 0,
  });
}));

// Agent performance report
router.get('/agents/performance', asyncHandler(async (req, res) => {
  const { start_date, end_date, agent_id } = req.query;

  const matchStage: any = { is_active: true };
  if (agent_id) matchStage._id = agent_id;

  const ticketMatch: any = {};
  if (start_date && end_date) {
    ticketMatch['tickets.created_at'] = { $gte: new Date(start_date as string), $lte: new Date(end_date as string) };
  }

  const agents = await SupportAgent.aggregate([
    { $match: matchStage },
    { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'supporttickets', localField: '_id', foreignField: 'assigned_agent_id', as: 'tickets' } },
    {
      $project: {
        agent_id: '$_id',
        agent_name: '$user.name',
        tickets_assigned: { $size: '$tickets' },
        tickets_resolved: {
          $size: { $filter: { input: '$tickets', as: 't', cond: { $eq: ['$$t.status', 'resolved'] } } },
        },
        tickets_closed: {
          $size: { $filter: { input: '$tickets', as: 't', cond: { $eq: ['$$t.status', 'closed'] } } },
        },
        avg_first_response_minutes: {
          $avg: {
            $map: {
              input: { $filter: { input: '$tickets', as: 't', cond: { $ne: ['$$t.first_response_at', null] } } },
              as: 't',
              in: { $divide: [{ $subtract: ['$$t.first_response_at', '$$t.created_at'] }, 60000] },
            },
          },
        },
        avg_resolution_minutes: {
          $avg: {
            $map: {
              input: { $filter: { input: '$tickets', as: 't', cond: { $ne: ['$$t.resolved_at', null] } } },
              as: 't',
              in: { $divide: [{ $subtract: ['$$t.resolved_at', '$$t.created_at'] }, 60000] },
            },
          },
        },
        sla_met_count: {
          $size: {
            $filter: {
              input: '$tickets', as: 't',
              cond: { $and: [{ $eq: ['$$t.is_sla_breached', false] }, { $ne: ['$$t.resolved_at', null] }] },
            },
          },
        },
        sla_breached_count: {
          $size: { $filter: { input: '$tickets', as: 't', cond: { $eq: ['$$t.is_sla_breached', true] } } },
        },
      },
    },
    { $sort: { tickets_resolved: -1 } },
  ]);

  res.json(agents);
}));

// Ticket volume trends
router.get('/tickets/trends', asyncHandler(async (req, res) => {
  const { period = 'day', start_date, end_date } = req.query;
  const dateFilter: any = {};
  if (start_date && end_date) {
    dateFilter.created_at = { $gte: new Date(start_date as string), $lte: new Date(end_date as string) };
  }

  let dateFormat: string;
  if (period === 'week') {
    dateFormat = '%Y-%U';
  } else if (period === 'month') {
    dateFormat = '%Y-%m';
  } else {
    dateFormat = '%Y-%m-%d';
  }

  const result = await SupportTicket.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: dateFormat, date: '$created_at' } },
        ticket_count: { $sum: 1 },
        open_count: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
        resolved_count: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { period: '$_id', ticket_count: 1, open_count: 1, resolved_count: 1, _id: 0 } },
  ]);

  res.json(result);
}));

// Category-wise tickets
router.get('/tickets/by-category', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const dateFilter: any = {};
  if (start_date && end_date) {
    dateFilter.created_at = { $gte: new Date(start_date as string), $lte: new Date(end_date as string) };
  }

  const result = await SupportTicket.aggregate([
    { $match: dateFilter },
    { $lookup: { from: 'ticketcategories', localField: 'category_id', foreignField: '_id', as: 'category' } },
    { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: { category_id: '$category_id', category_name: '$category.name' },
        ticket_count: { $sum: 1 },
        avg_resolution_minutes: {
          $avg: {
            $cond: [
              { $ne: ['$resolved_at', null] },
              { $divide: [{ $subtract: ['$resolved_at', '$created_at'] }, 60000] },
              null,
            ],
          },
        },
      },
    },
    { $sort: { ticket_count: -1 } },
    { $project: { category_id: '$_id.category_id', category_name: '$_id.category_name', ticket_count: 1, avg_resolution_minutes: 1, _id: 0 } },
  ]);

  res.json(result);
}));

// Backlog aging report
router.get('/tickets/backlog-aging', asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find({
    status: { $nin: ['resolved', 'closed', 'cancelled'] },
  })
    .sort({ created_at: 1 })
    .lean();

  const now = new Date();
  const result = tickets.map((t: any) => ({
    ...t,
    id: t._id,
    age_days: (now.getTime() - new Date(t.created_at).getTime()) / 86400000,
  }));

  res.json(result);
}));

// Customer satisfaction trends
router.get('/surveys/satisfaction-trends', asyncHandler(async (req, res) => {
  const { start_date, end_date } = req.query;
  const dateFilter: any = { score: { $ne: null } };
  if (start_date && end_date) {
    dateFilter.submitted_at = { $gte: new Date(start_date as string), $lte: new Date(end_date as string) };
  }

  const result = await SurveyResponse.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m', date: '$submitted_at' } },
        avg_score: { $avg: '$score' },
        response_count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { month: '$_id', avg_score: 1, response_count: 1, _id: 0 } },
  ]);

  res.json(result);
}));

// Top recurring issues
router.get('/tickets/recurring-issues', asyncHandler(async (req, res) => {
  const { limit = 10 } = req.query;

  const result = await SupportTicket.aggregate([
    {
      $group: {
        _id: { subject: '$subject', category_id: '$category_id' },
        occurrence_count: { $sum: 1 },
        affected_customers: { $addToSet: '$partner_id' },
      },
    },
    { $match: { occurrence_count: { $gt: 1 } } },
    { $sort: { occurrence_count: -1 } },
    { $limit: parseInt(limit as string) },
    {
      $project: {
        subject: '$_id.subject',
        category_id: '$_id.category_id',
        occurrence_count: 1,
        affected_customers: { $size: '$affected_customers' },
        _id: 0,
      },
    },
  ]);

  res.json(result);
}));

export default router;
