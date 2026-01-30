import { CustomerRFM, RFMAnalysisRun } from '../models/RFMAnalysis.js';
import { SaleOrder } from '../models/SaleOrder.js';
import { Partner } from '../models/Partner.js';

const RFM_SEGMENTS: Record<string, { name: string; code: string; patterns: string[]; action: string; color: string }> = {
  champions:          { name: 'Champions',          code: 'CHMP', patterns: ['555','554','545','544','455','454','445'], action: 'Reward them. Early adopters for new products.', color: '#22c55e' },
  loyal:              { name: 'Loyal Customers',     code: 'LOYL', patterns: ['543','534','443','434','343','334','535','525','425'], action: 'Upsell higher value products. Ask for reviews.', color: '#3b82f6' },
  potential_loyalists: { name: 'Potential Loyalists', code: 'PLOY', patterns: ['553','552','551','542','541','533','532','531','452','451','442','441','353','352','351'], action: 'Offer loyalty program. Recommend products.', color: '#8b5cf6' },
  new_customers:      { name: 'New Customers',       code: 'NEW',  patterns: ['512','511','422','421','412','411','311','312'], action: 'Provide onboarding support.', color: '#06b6d4' },
  promising:          { name: 'Promising',           code: 'PROM', patterns: ['513','514','413','414','313','314','523','524','423','424'], action: 'Create brand awareness. Offer free trials.', color: '#f59e0b' },
  need_attention:     { name: 'Need Attention',      code: 'ATTN', patterns: ['333','332','323','322','233','232','223','222','334','324','234','224'], action: 'Make limited time offers. Reactivate them.', color: '#f97316' },
  about_to_sleep:     { name: 'About to Sleep',      code: 'SLIP', patterns: ['331','321','231','221','212','211'], action: 'Share valuable resources. Offer discounts.', color: '#ef4444' },
  at_risk:            { name: 'At Risk',             code: 'RISK', patterns: ['255','254','245','244','253','252','243','242','235','234','225','224','155','154','145','144'], action: 'Send personalized emails. Offer renewals.', color: '#dc2626' },
  cant_lose:          { name: "Can't Lose Them",     code: 'SAVE', patterns: ['153','152','143','142','135','134','125','124'], action: 'Win them back. Talk to them personally.', color: '#991b1b' },
  hibernating:        { name: 'Hibernating',         code: 'HBNT', patterns: ['132','131','122','121','112','141'], action: 'Offer special discounts. Recreate brand value.', color: '#6b7280' },
  lost:               { name: 'Lost',                code: 'LOST', patterns: ['111','113','123','133','213'], action: 'Revive interest with reach-out campaign.', color: '#374151' },
};

function getPercentile(arr: number[], p: number): number {
  const idx = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, idx)];
}

function assignSegment(rfmScore: string, rfmTotal: number): { segment: string; segment_code: string; segment_key: string } {
  for (const [key, def] of Object.entries(RFM_SEGMENTS)) {
    if (def.patterns.includes(rfmScore)) {
      return { segment: def.name, segment_code: def.code, segment_key: key };
    }
  }
  if (rfmTotal >= 12) return { segment: 'Champions', segment_code: 'CHMP', segment_key: 'champions' };
  if (rfmTotal >= 9) return { segment: 'Loyal Customers', segment_code: 'LOYL', segment_key: 'loyal' };
  if (rfmTotal >= 6) return { segment: 'Need Attention', segment_code: 'ATTN', segment_key: 'need_attention' };
  return { segment: 'Lost', segment_code: 'LOST', segment_key: 'lost' };
}

function getRecommendations(segmentKey: string) {
  const campaigns: Record<string, string> = {
    champions: 'VIP Rewards Program', loyal: 'Loyalty Points Campaign',
    potential_loyalists: 'Welcome Series + Upsell', new_customers: 'Onboarding Drip Campaign',
    promising: 'Educational Content Series', need_attention: 'Re-engagement Campaign',
    about_to_sleep: 'Win-back Offer', at_risk: 'Personal Outreach',
    cant_lose: 'Executive Outreach', hibernating: 'Reactivation Discount', lost: 'Final Attempt Campaign',
  };
  const offers: Record<string, string> = {
    champions: 'Early access to new products', loyal: '10% loyalty discount',
    potential_loyalists: 'Free upgrade/trial', new_customers: 'Welcome discount 15%',
    promising: 'Free consultation', need_attention: 'Limited time 20% off',
    about_to_sleep: '25% comeback discount', at_risk: 'Personal call + special offer',
    cant_lose: 'Whatever it takes', hibernating: '30% reactivation offer', lost: '50% or free trial',
  };
  const seg = RFM_SEGMENTS[segmentKey];
  return {
    action: seg?.action || '',
    priority: ['champions', 'cant_lose', 'at_risk'].includes(segmentKey) ? 'high' as const :
              ['loyal', 'potential_loyalists', 'need_attention'].includes(segmentKey) ? 'medium' as const : 'low' as const,
    suggested_campaign: campaigns[segmentKey] || 'General Campaign',
    suggested_offer: offers[segmentKey] || 'Standard Offer',
  };
}

function getDefaultStartDate(periodType?: string): Date {
  const now = new Date();
  switch (periodType) {
    case 'monthly': return new Date(now.getFullYear(), now.getMonth() - 1, 1);
    case 'quarterly': return new Date(now.getFullYear(), now.getMonth() - 3, 1);
    case 'yearly': return new Date(now.getFullYear() - 1, now.getMonth(), 1);
    default: return new Date(2000, 0, 1);
  }
}

export async function runRFMAnalysis(
  tenantId: string,
  config: { period_type?: string; start_date?: Date; end_date?: Date; min_transactions?: number; exclude_refunds?: boolean },
  userId: string
) {
  const run = await RFMAnalysisRun.create({
    tenant_id: tenantId,
    config: {
      period_type: config.period_type || 'yearly',
      start_date: config.start_date || getDefaultStartDate(config.period_type),
      end_date: config.end_date || new Date(),
      min_transactions: config.min_transactions || 1,
      exclude_refunds: config.exclude_refunds !== false,
    },
    scoring: { method: 'quintile' },
    status: 'running',
    started_at: new Date(),
    created_by: userId,
  });

  try {
    const config = run.config!;
    const query: any = {
      state: { $in: ['sale', 'done'] },
      date_order: { $gte: config.start_date, $lte: config.end_date },
    };
    if (config.exclude_refunds) query.amount_total = { $gt: 0 };

    const transactions = await SaleOrder.find(query).select('partner_id date_order amount_total').lean();

    // Group by customer
    const customerMap = new Map<string, { customer_id: any; txns: { date: Date; amount: number }[]; total: number }>();
    for (const tx of transactions) {
      if (!tx.partner_id) continue;
      const cid = tx.partner_id.toString();
      if (!customerMap.has(cid)) customerMap.set(cid, { customer_id: tx.partner_id, txns: [], total: 0 });
      const c = customerMap.get(cid)!;
      c.txns.push({ date: tx.date_order, amount: tx.amount_total });
      c.total += tx.amount_total;
    }

    const analysisDate = config.end_date!;
    const customers = Array.from(customerMap.values()).filter(c => c.txns.length >= (config.min_transactions || 1));

    if (customers.length === 0) {
      run.status = 'completed' as any;
      run.completed_at = new Date();
      run.summary = { total_customers: 0, customers_analyzed: 0, customers_excluded: 0, segments: [], score_distribution: [], total_revenue: 0, avg_order_value: 0, avg_frequency: 0, avg_recency_days: 0 } as any;
      await run.save();
      return run;
    }

    // Calculate raw values
    const rfmData = customers.map(c => {
      const sorted = c.txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastPurchase = new Date(sorted[0].date);
      const firstPurchase = new Date(sorted[sorted.length - 1].date);
      const recencyDays = Math.max(0, Math.floor((analysisDate.getTime() - lastPurchase.getTime()) / 86400000));
      return {
        customer_id: c.customer_id,
        recency_days: recencyDays,
        frequency_count: c.txns.length,
        monetary_total: c.total,
        monetary_average: c.total / c.txns.length,
        first_purchase_date: firstPurchase,
        last_purchase_date: lastPurchase,
      };
    });

    // Quintile boundaries
    const recencies = rfmData.map(c => c.recency_days).sort((a, b) => a - b);
    const frequencies = rfmData.map(c => c.frequency_count).sort((a, b) => a - b);
    const monetaries = rfmData.map(c => c.monetary_total).sort((a, b) => a - b);

    const rBounds = [20, 40, 60, 80].map(p => getPercentile(recencies, p));
    const fBounds = [20, 40, 60, 80].map(p => getPercentile(frequencies, p));
    const mBounds = [20, 40, 60, 80].map(p => getPercentile(monetaries, p));

    // Score & segment
    const scored = rfmData.map(c => {
      let rs = 5;
      if (c.recency_days > rBounds[3]) rs = 1;
      else if (c.recency_days > rBounds[2]) rs = 2;
      else if (c.recency_days > rBounds[1]) rs = 3;
      else if (c.recency_days > rBounds[0]) rs = 4;

      let fs = 1;
      if (c.frequency_count > fBounds[3]) fs = 5;
      else if (c.frequency_count > fBounds[2]) fs = 4;
      else if (c.frequency_count > fBounds[1]) fs = 3;
      else if (c.frequency_count > fBounds[0]) fs = 2;

      let ms = 1;
      if (c.monetary_total > mBounds[3]) ms = 5;
      else if (c.monetary_total > mBounds[2]) ms = 4;
      else if (c.monetary_total > mBounds[1]) ms = 3;
      else if (c.monetary_total > mBounds[0]) ms = 2;

      const rfmScore = `${rs}${fs}${ms}`;
      const rfmTotal = rs + fs + ms;
      const seg = assignSegment(rfmScore, rfmTotal);

      return { ...c, recency_score: rs, frequency_score: fs, monetary_score: ms, rfm_score: rfmScore, rfm_total: rfmTotal, ...seg };
    });

    // Bulk upsert
    const ops = scored.map(c => ({
      updateOne: {
        filter: { tenant_id: tenantId, customer_id: c.customer_id },
        update: {
          $set: {
            tenant_id: tenantId, customer_id: c.customer_id, customer_type: 'partner',
            recency_days: c.recency_days, frequency_count: c.frequency_count,
            monetary_total: c.monetary_total, monetary_average: c.monetary_average,
            recency_score: c.recency_score, frequency_score: c.frequency_score, monetary_score: c.monetary_score,
            rfm_score: c.rfm_score, rfm_total: c.rfm_total,
            segment: c.segment, segment_code: c.segment_code,
            analysis_period: { start_date: config.start_date, end_date: config.end_date, period_type: config.period_type },
            transactions: { first_purchase_date: c.first_purchase_date, last_purchase_date: c.last_purchase_date, total_orders: c.frequency_count, total_revenue: c.monetary_total, average_order_value: c.monetary_average },
            predictions: { churn_risk: c.recency_score <= 2 ? 'high' : c.recency_score <= 3 ? 'medium' : 'low', churn_probability: Math.max(0, 100 - c.recency_score * 20) },
            recommendations: getRecommendations(c.segment_key),
            calculated_at: new Date(),
          },
        },
        upsert: true,
      },
    }));
    await CustomerRFM.bulkWrite(ops as any);

    // Summary
    const segCounts: Record<string, { count: number; revenue: number; rfm: number }> = {};
    let totalRev = 0, totalFreq = 0, totalRec = 0;
    const scoreDist: Record<string, number> = {};
    for (const c of scored) {
      if (!segCounts[c.segment]) segCounts[c.segment] = { count: 0, revenue: 0, rfm: 0 };
      segCounts[c.segment].count++;
      segCounts[c.segment].revenue += c.monetary_total;
      segCounts[c.segment].rfm += c.rfm_total;
      totalRev += c.monetary_total;
      totalFreq += c.frequency_count;
      totalRec += c.recency_days;
      scoreDist[c.rfm_score] = (scoreDist[c.rfm_score] || 0) + 1;
    }

    run.status = 'completed' as any;
    run.completed_at = new Date();
    run.summary = {
      total_customers: scored.length,
      customers_analyzed: scored.length,
      customers_excluded: 0,
      segments: Object.entries(segCounts).map(([seg, d]) => ({
        segment: seg, count: d.count,
        percentage: Math.round((d.count / scored.length) * 1000) / 10,
        total_revenue: d.revenue,
        avg_rfm_score: Math.round((d.rfm / d.count) * 10) / 10,
      })),
      score_distribution: Object.entries(scoreDist).map(([s, c]) => ({ rfm_score: s, count: c })).sort((a, b) => b.count - a.count),
      total_revenue: totalRev,
      avg_order_value: totalFreq > 0 ? totalRev / totalFreq : 0,
      avg_frequency: scored.length > 0 ? totalFreq / scored.length : 0,
      avg_recency_days: scored.length > 0 ? totalRec / scored.length : 0,
    } as any;
    await run.save();
    return run;
  } catch (err: any) {
    run.status = 'failed' as any;
    run.error = err.message;
    await run.save();
    throw err;
  }
}

export function getSegmentDefinitions() {
  return Object.entries(RFM_SEGMENTS).map(([key, val]) => ({ key, ...val }));
}
