import express from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { SaleOrder } from '../models/SaleOrder.js';
import { Lead } from '../models/Lead.js';

const router = express.Router();

// ============================================
// SALES ANALYTICS & DASHBOARDS
// ============================================

// Get sales dashboard summary
router.get('/dashboard', asyncHandler(async (req, res) => {
  const { period_start, period_end, user_id, territory_id } = req.query;

  const periodStart = period_start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const periodEnd = period_end || new Date().toISOString().split('T')[0];

  const orderFilter: any = {
    date_order: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
    state: { $in: ['sale', 'done'] },
  };
  if (user_id) orderFilter.user_id = user_id;

  // Total Revenue
  const orders = await SaleOrder.find(orderFilter).lean();
  const total_revenue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
  const uniqueCustomers = new Set(orders.map(o => o.partner_id?.toString())).size;

  const revenue = {
    total_revenue,
    total_orders: orders.length,
    unique_customers: uniqueCustomers,
  };

  // Quote to Order Conversion
  const allOrdersInPeriod = await SaleOrder.find({
    date_order: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
    ...(user_id ? { user_id } : {}),
  }).lean();
  const quotesSent = allOrdersInPeriod.filter(o => o.state === 'sent').length;
  const quotesConverted = allOrdersInPeriod.filter(o => o.state === 'sale').length;
  const conversion = {
    quotes_sent: quotesSent,
    quotes_converted: quotesConverted,
    conversion_rate: quotesSent > 0 ? (quotesConverted / quotesSent * 100) : 0,
  };

  // Pipeline Value
  const opportunities = await Lead.find({
    type: 'opportunity',
    stage: { $nin: ['won', 'lost'] },
    date_deadline: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
  }).lean();
  const pipeline = {
    total_opportunities: opportunities.length,
    total_pipeline_value: opportunities.reduce((sum, o) => sum + (o.expected_revenue || 0), 0),
    weighted_pipeline_value: opportunities.reduce((sum, o) => sum + ((o.expected_revenue || 0) * (o.probability || 0) / 100), 0),
  };

  // Top Products (from embedded order lines)
  const productMap: Record<string, { id: string; name: string; quantity_sold: number; revenue: number }> = {};
  for (const order of orders) {
    for (const line of order.order_line) {
      const pid = line.product_id?.toString() || 'unknown';
      if (!productMap[pid]) {
        productMap[pid] = { id: pid, name: pid, quantity_sold: 0, revenue: 0 };
      }
      productMap[pid].quantity_sold += line.product_uom_qty || 0;
      productMap[pid].revenue += line.price_subtotal || 0;
    }
  }
  const top_products = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Top Customers
  const customerMap: Record<string, { id: string; name: string; order_count: number; total_revenue: number }> = {};
  for (const order of orders) {
    const cid = order.partner_id?.toString() || 'unknown';
    if (!customerMap[cid]) {
      customerMap[cid] = { id: cid, name: cid, order_count: 0, total_revenue: 0 };
    }
    customerMap[cid].order_count += 1;
    customerMap[cid].total_revenue += order.amount_total || 0;
  }
  const top_customers = Object.values(customerMap).sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 10);

  // Pipeline by Stage
  const stageMap: Record<string, { stage: string; count: number; total_value: number }> = {};
  for (const opp of opportunities) {
    const stage = opp.stage || 'unknown';
    if (!stageMap[stage]) {
      stageMap[stage] = { stage, count: 0, total_value: 0 };
    }
    stageMap[stage].count += 1;
    stageMap[stage].total_value += opp.expected_revenue || 0;
  }
  const stageOrder = ['new', 'qualified', 'proposition'];
  const pipeline_stages = Object.values(stageMap).sort((a, b) => {
    const ai = stageOrder.indexOf(a.stage);
    const bi = stageOrder.indexOf(b.stage);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  res.json({
    period: { start: periodStart, end: periodEnd },
    revenue,
    conversion,
    pipeline,
    top_products,
    top_customers,
    pipeline_stages,
  });
}));

// Get sales performance report
router.get('/performance', asyncHandler(async (req, res) => {
  const { period_start, period_end, user_id, group_by } = req.query;

  const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const periodEnd = period_end || new Date().toISOString().split('T')[0];
  const groupBy = (group_by as string) || 'month';

  const filter: any = {
    date_order: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
    state: { $in: ['sale', 'done'] },
  };
  if (user_id) filter.user_id = user_id;

  const orders = await SaleOrder.find(filter).sort({ date_order: 1 }).lean();

  const periodMap: Record<string, { period: string; order_count: number; total_revenue: number; customers: Set<string> }> = {};

  for (const order of orders) {
    const d = new Date(order.date_order);
    let period: string;
    if (groupBy === 'month') {
      period = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      const weekNum = Math.ceil((d.getDate()) / 7);
      period = `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
    } else if (groupBy === 'day') {
      period = d.toISOString().split('T')[0];
    } else {
      period = `${d.getFullYear()}`;
    }

    if (!periodMap[period]) {
      periodMap[period] = { period, order_count: 0, total_revenue: 0, customers: new Set() };
    }
    periodMap[period].order_count += 1;
    periodMap[period].total_revenue += order.amount_total || 0;
    if (order.partner_id) periodMap[period].customers.add(order.partner_id.toString());
  }

  const result = Object.values(periodMap)
    .sort((a, b) => a.period.localeCompare(b.period))
    .map(p => ({
      period: p.period,
      order_count: p.order_count,
      total_revenue: p.total_revenue,
      avg_order_value: p.order_count > 0 ? p.total_revenue / p.order_count : 0,
      unique_customers: p.customers.size,
    }));

  res.json(result);
}));

// Get product-wise sales report
router.get('/products', asyncHandler(async (req, res) => {
  const { period_start, period_end, product_id, category_id } = req.query;

  const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const periodEnd = period_end || new Date().toISOString().split('T')[0];

  const filter: any = {
    date_order: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
    state: { $in: ['sale', 'done'] },
  };

  const orders = await SaleOrder.find(filter).lean();

  const productMap: Record<string, any> = {};
  for (const order of orders) {
    for (const line of order.order_line) {
      const pid = line.product_id?.toString();
      if (!pid) continue;
      if (product_id && pid !== product_id) continue;

      if (!productMap[pid]) {
        productMap[pid] = {
          id: pid,
          order_count: new Set(),
          total_quantity: 0,
          total_revenue: 0,
          prices: [],
        };
      }
      productMap[pid].order_count.add(order._id.toString());
      productMap[pid].total_quantity += line.product_uom_qty || 0;
      productMap[pid].total_revenue += line.price_subtotal || 0;
      productMap[pid].prices.push(line.price_unit || 0);
    }
  }

  const result = Object.values(productMap).map((p: any) => ({
    id: p.id,
    order_count: p.order_count.size,
    total_quantity: p.total_quantity,
    total_revenue: p.total_revenue,
    avg_price: p.prices.length > 0 ? p.prices.reduce((a: number, b: number) => a + b, 0) / p.prices.length : 0,
    min_price: p.prices.length > 0 ? Math.min(...p.prices) : 0,
    max_price: p.prices.length > 0 ? Math.max(...p.prices) : 0,
  })).sort((a, b) => b.total_revenue - a.total_revenue);

  res.json(result);
}));

// Get customer-wise sales report
router.get('/customers', asyncHandler(async (req, res) => {
  const { period_start, period_end, partner_id } = req.query;

  const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const periodEnd = period_end || new Date().toISOString().split('T')[0];

  const filter: any = {
    date_order: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
    state: { $in: ['sale', 'done'] },
  };
  if (partner_id) filter.partner_id = partner_id;

  const orders = await SaleOrder.find(filter).populate('partner_id', 'name email').lean();

  const customerMap: Record<string, any> = {};
  for (const order of orders) {
    const cid = order.partner_id?.toString() || 'unknown';
    const partner = order.partner_id as any;
    if (!customerMap[cid]) {
      customerMap[cid] = {
        id: cid,
        name: partner?.name || cid,
        email: partner?.email,
        order_count: 0,
        total_revenue: 0,
        order_values: [],
        dates: [],
      };
    }
    customerMap[cid].order_count += 1;
    customerMap[cid].total_revenue += order.amount_total || 0;
    customerMap[cid].order_values.push(order.amount_total || 0);
    customerMap[cid].dates.push(order.date_order);
  }

  const result = Object.values(customerMap).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    order_count: c.order_count,
    total_revenue: c.total_revenue,
    avg_order_value: c.order_count > 0 ? c.total_revenue / c.order_count : 0,
    first_order_date: c.dates.length > 0 ? new Date(Math.min(...c.dates.map((d: Date) => d.getTime()))) : null,
    last_order_date: c.dates.length > 0 ? new Date(Math.max(...c.dates.map((d: Date) => d.getTime()))) : null,
  })).sort((a, b) => b.total_revenue - a.total_revenue);

  res.json(result);
}));

// Get sales cycle analysis
router.get('/sales-cycle', asyncHandler(async (req, res) => {
  const { period_start, period_end } = req.query;

  const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const periodEnd = period_end || new Date().toISOString().split('T')[0];

  const orders = await SaleOrder.find({
    date_order: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
    state: { $in: ['sale', 'done'] },
    opportunity_id: { $ne: null },
  }).populate('opportunity_id').lean();

  const cycleDays: number[] = [];
  for (const order of orders) {
    const lead = order.opportunity_id as any;
    if (lead?.created_at) {
      const days = (new Date(order.date_order).getTime() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24);
      cycleDays.push(days);
    }
  }

  const sorted = [...cycleDays].sort((a, b) => a - b);
  const overall = {
    avg_sales_cycle_days: cycleDays.length > 0 ? cycleDays.reduce((a, b) => a + b, 0) / cycleDays.length : null,
    min_sales_cycle_days: cycleDays.length > 0 ? Math.min(...cycleDays) : null,
    max_sales_cycle_days: cycleDays.length > 0 ? Math.max(...cycleDays) : null,
    median_sales_cycle_days: sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : null,
  };

  // By stage
  const activeOpps = await Lead.find({
    type: 'opportunity',
    stage: { $nin: ['won', 'lost'] },
  }).lean();

  const stageMap: Record<string, number[]> = {};
  for (const opp of activeOpps) {
    const stage = opp.stage || 'unknown';
    if (!stageMap[stage]) stageMap[stage] = [];
    const days = (Date.now() - new Date((opp as any).updated_at).getTime()) / (1000 * 60 * 60 * 24);
    stageMap[stage].push(days);
  }

  const by_stage = Object.entries(stageMap).map(([stage, days]) => ({
    stage,
    avg_days_in_stage: days.reduce((a, b) => a + b, 0) / days.length,
  }));

  res.json({ overall, by_stage });
}));

// Get win/loss analysis
router.get('/win-loss', asyncHandler(async (req, res) => {
  const { period_start, period_end, user_id } = req.query;

  const periodStart = period_start || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0];
  const periodEnd = period_end || new Date().toISOString().split('T')[0];

  const filter: any = {
    type: 'opportunity',
    updated_at: { $gte: new Date(periodStart as string), $lte: new Date(periodEnd as string) },
  };
  if (user_id) filter.user_id = user_id;

  const leads = await Lead.find(filter).lean();

  const won = leads.filter(l => l.stage === 'won');
  const lost = leads.filter(l => l.stage === 'lost');

  const summary = {
    won_count: won.length,
    lost_count: lost.length,
    won_value: won.reduce((sum, l) => sum + (l.expected_revenue || 0), 0),
    lost_value: lost.reduce((sum, l) => sum + (l.expected_revenue || 0), 0),
    win_rate: leads.length > 0 ? (won.length / leads.length * 100) : 0,
  };

  // By reason
  const reasonMap: Record<string, { lost_reason: string; count: number; total_value: number }> = {};
  for (const l of lost) {
    const reason = (l as any).lost_reason || 'Unknown';
    if (!reasonMap[reason]) {
      reasonMap[reason] = { lost_reason: reason, count: 0, total_value: 0 };
    }
    reasonMap[reason].count += 1;
    reasonMap[reason].total_value += l.expected_revenue || 0;
  }

  const by_reason = Object.values(reasonMap).sort((a, b) => b.count - a.count);

  res.json({ summary, by_reason });
}));

export default router;
