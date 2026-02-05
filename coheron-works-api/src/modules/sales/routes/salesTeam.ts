import express from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import { getPaginationParams, paginateQuery } from '../../../shared/utils/pagination.js';
import { SalesTeam, SalesIncentive, SalesIncentivePayment, SalesActivityKpi } from '../../../models/SalesTeam.js';
import { SaleOrder } from '../../../models/SaleOrder.js';

const router = express.Router();

// ============================================
// SALES TEAMS
// ============================================

// Get all sales teams
router.get('/teams', asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const params = getPaginationParams(req);
  const result = await paginateQuery(SalesTeam.find(filter).sort({ created_at: -1 }).lean(), params, filter, SalesTeam);
  res.json(result);
}));

// Create sales team
router.post('/teams', asyncHandler(async (req, res) => {
  const { name, code, manager_id, description, members } = req.body;

  const teamMembers = (members || []).map((member: any) => ({
    user_id: member.user_id,
    role: member.role || 'rep',
  }));

  const team = await SalesTeam.create({
    name,
    code,
    manager_id,
    description,
    team_members: teamMembers,
  });

  res.status(201).json(team);
}));

// Add member to team
router.post('/teams/:id/members', asyncHandler(async (req, res) => {
  const { user_id, role } = req.body;

  const team = await SalesTeam.findById(req.params.id);
  if (!team) {
    return res.status(404).json({ error: 'Sales team not found' });
  }

  // Check if member already exists
  const existingMember = team.team_members.find((m: any) => m.user_id?.toString() === user_id);
  if (existingMember) {
    existingMember.role = role || 'rep';
    existingMember.is_active = true;
    existingMember.joined_date = new Date();
  } else {
    team.team_members.push({ user_id, role: role || 'rep' });
  }

  await team.save();

  const member = team.team_members.find((m: any) => m.user_id?.toString() === user_id);
  res.status(201).json(member);
}));

// ============================================
// SALES INCENTIVES
// ============================================

// Get all incentives
router.get('/incentives', asyncHandler(async (req, res) => {
  const { is_active } = req.query;
  const filter: any = {};

  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const params = getPaginationParams(req);
  const result = await paginateQuery(SalesIncentive.find(filter).sort({ created_at: -1 }).lean(), params, filter, SalesIncentive);
  res.json(result);
}));

// Create incentive
router.post('/incentives', asyncHandler(async (req, res) => {
  const {
    name, incentive_type, calculation_method, calculation_formula,
    conditions, amount_percentage, fixed_amount, tier_rules, valid_from, valid_until,
  } = req.body;

  const incentive = await SalesIncentive.create({
    name,
    incentive_type,
    calculation_method,
    calculation_formula,
    conditions,
    amount_percentage,
    fixed_amount,
    tier_rules,
    valid_from,
    valid_until,
  });

  res.status(201).json(incentive);
}));

// Calculate incentive for sale order
router.post('/incentives/calculate', asyncHandler(async (req, res) => {
  const { sale_order_id, user_id } = req.body;

  const order = await SaleOrder.findById(sale_order_id).lean() as any;
  if (!order) {
    return res.status(404).json({ error: 'Sale order not found' });
  }

  const incentives = await SalesIncentive.find({
    is_active: true,
    $or: [{ valid_from: null }, { valid_from: { $lte: new Date() } }],
  }).find({
    $or: [{ valid_until: null }, { valid_until: { $gte: new Date() } }],
  }).sort({ created_at: -1 }).lean();

  const applicableIncentives: any[] = [];

  for (const incentive of incentives) {
    let matches = true;
    const conditions = incentive.conditions as any;

    if (conditions) {
      if (conditions.min_order_amount && order.amount_total < conditions.min_order_amount) {
        matches = false;
      }
      if (conditions.product_ids && conditions.product_ids.length > 0) {
        const orderProductIds = order.order_line.map((l: any) => l.product_id?.toString());
        const hasProduct = conditions.product_ids.some((pid: string) => orderProductIds.includes(pid));
        if (!hasProduct) matches = false;
      }
    }

    if (matches) {
      let incentiveAmount = 0;

      if (incentive.calculation_method === 'percentage') {
        incentiveAmount = order.amount_total * ((incentive.amount_percentage || 0) / 100);
      } else if (incentive.calculation_method === 'fixed') {
        incentiveAmount = incentive.fixed_amount || 0;
      } else if (incentive.calculation_method === 'tiered' && incentive.tier_rules) {
        const tiers = incentive.tier_rules as any[];
        for (const tier of tiers) {
          if (order.amount_total >= tier.min_amount && (tier.max_amount === null || order.amount_total <= tier.max_amount)) {
            if (tier.type === 'percentage') {
              incentiveAmount = order.amount_total * (tier.value / 100);
            } else {
              incentiveAmount = tier.value;
            }
            break;
          }
        }
      }

      applicableIncentives.push({
        incentive_id: incentive._id,
        incentive_name: incentive.name,
        incentive_type: incentive.incentive_type,
        amount: incentiveAmount,
      });
    }
  }

  res.json({
    sale_order_id,
    order_amount: order.amount_total,
    applicable_incentives: applicableIncentives,
    total_incentive: applicableIncentives.reduce((sum, inc) => sum + inc.amount, 0),
  });
}));

// Record incentive payment
router.post('/incentive-payments', asyncHandler(async (req, res) => {
  const {
    incentive_id, user_id, sale_order_id, period_start,
    period_end, base_amount, incentive_amount, payment_status,
  } = req.body;

  const payment = await SalesIncentivePayment.create({
    incentive_id,
    user_id,
    sale_order_id,
    period_start,
    period_end,
    base_amount,
    incentive_amount,
    payment_status: payment_status || 'pending',
  });

  res.status(201).json(payment);
}));

// ============================================
// SALES ACTIVITY KPIs
// ============================================

// Get activity KPIs
router.get('/activity-kpis', asyncHandler(async (req, res) => {
  const { user_id, period_start, period_end } = req.query;

  if (!user_id || !period_start || !period_end) {
    return res.status(400).json({ error: 'user_id, period_start, and period_end are required' });
  }

  const kpi = await SalesActivityKpi.findOne({ user_id, period_start, period_end }).lean();

  if (!kpi) {
    return res.json({
      user_id,
      period_start,
      period_end,
      calls_made: 0,
      emails_sent: 0,
      meetings_held: 0,
      leads_created: 0,
      opportunities_created: 0,
      quotes_sent: 0,
      orders_won: 0,
      orders_lost: 0,
    });
  }

  res.json(kpi);
}));

// Update activity KPIs
router.post('/activity-kpis', asyncHandler(async (req, res) => {
  const {
    user_id, period_start, period_end, calls_made, emails_sent,
    meetings_held, leads_created, opportunities_created, quotes_sent,
    orders_won, orders_lost,
  } = req.body;

  const existing = await SalesActivityKpi.findOne({ user_id, period_start, period_end });

  if (existing) {
    existing.calls_made += calls_made || 0;
    existing.emails_sent += emails_sent || 0;
    existing.meetings_held += meetings_held || 0;
    existing.leads_created += leads_created || 0;
    existing.opportunities_created += opportunities_created || 0;
    existing.quotes_sent += quotes_sent || 0;
    existing.orders_won += orders_won || 0;
    existing.orders_lost += orders_lost || 0;
    await existing.save();
    return res.status(201).json(existing);
  }

  const kpi = await SalesActivityKpi.create({
    user_id,
    period_start,
    period_end,
    calls_made: calls_made || 0,
    emails_sent: emails_sent || 0,
    meetings_held: meetings_held || 0,
    leads_created: leads_created || 0,
    opportunities_created: opportunities_created || 0,
    quotes_sent: quotes_sent || 0,
    orders_won: orders_won || 0,
    orders_lost: orders_lost || 0,
  });

  res.status(201).json(kpi);
}));

export default router;
