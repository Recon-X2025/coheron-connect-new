import { AIService } from '../aiService.js';
import { llmGateway } from './LLMGateway.js';
import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

export class PredictiveAnalytics {
  static async demandForecast(tenantId: string, productId?: string, periods = 6): Promise<any> {
    const forecast = await AIService.generateSalesForecast(tenantId, productId, periods);

    // Try to add LLM narrative
    try {
      const response = await llmGateway.sendMessage(
        `Analyze this sales forecast data and provide a brief narrative (2-3 sentences) with actionable insights:\n${JSON.stringify(forecast)}`,
        { tenantId, systemPrompt: 'You are a business analyst. Provide concise, actionable insights.', maxTokens: 256 }
      );
      forecast.narrative = response.content;
    } catch {
      forecast.narrative = forecast.historical.length > 0
        ? `Based on ${forecast.historical.length} months of data, the forecast shows ${forecast.forecast[0] > (forecast.historical[forecast.historical.length - 1]?.total || 0) ? 'growth' : 'decline'} in the coming period.`
        : 'Insufficient historical data for meaningful narrative.';
    }

    return forecast;
  }

  static async cashFlowProjection(tenantId: string, months = 3): Promise<any> {
    const AccountMove = mongoose.models.AccountMove || mongoose.model('AccountMove');
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const now = new Date();

    // Get receivables (outstanding customer invoices)
    const receivables = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'out_invoice', payment_state: { $in: ['not_paid', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$amount_residual' }, count: { $sum: 1 } } },
    ]);

    // Get payables (outstanding vendor bills)
    const payables = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'in_invoice', payment_state: { $in: ['not_paid', 'partial'] } } },
      { $group: { _id: null, total: { $sum: '$amount_residual' }, count: { $sum: 1 } } },
    ]);

    // Monthly revenue trend
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const revenueByMonth = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'out_invoice', state: 'posted', invoice_date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$invoice_date' } }, revenue: { $sum: '$amount_total' }, collected: { $sum: { $subtract: ['$amount_total', '$amount_residual'] } } } },
      { $sort: { _id: 1 } },
    ]);

    const expenseByMonth = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'in_invoice', state: 'posted', invoice_date: { $gte: sixMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$invoice_date' } }, expense: { $sum: '$amount_total' } } },
      { $sort: { _id: 1 } },
    ]);

    const revValues = revenueByMonth.map((r: any) => r.revenue);
    const expValues = expenseByMonth.map((e: any) => e.expense);

    // Simple projection using exponential smoothing
    const alpha = 0.3;
    const projectRevenue = (data: number[]) => {
      if (!data.length) return Array(months).fill(0);
      let level = data[0];
      for (let i = 1; i < data.length; i++) level = alpha * data[i] + (1 - alpha) * level;
      return Array(months).fill(0).map((_, i) => Math.round(level * 100) / 100);
    };

    const projection = {
      current: {
        receivables: receivables[0]?.total || 0,
        receivables_count: receivables[0]?.count || 0,
        payables: payables[0]?.total || 0,
        payables_count: payables[0]?.count || 0,
        net_position: (receivables[0]?.total || 0) - (payables[0]?.total || 0),
      },
      historical: { revenue_by_month: revenueByMonth, expense_by_month: expenseByMonth },
      projected_revenue: projectRevenue(revValues),
      projected_expenses: projectRevenue(expValues),
      months,
    };

    // Add LLM narrative
    try {
      const resp = await llmGateway.sendMessage(
        `Analyze this cash flow projection and provide 2-3 actionable insights:\n${JSON.stringify(projection)}`,
        { tenantId, systemPrompt: 'You are a CFO advisor. Be concise and actionable.', maxTokens: 256 }
      );
      (projection as any).narrative = resp.content;
    } catch {
      (projection as any).narrative = `Net position: ₹${(projection.current.net_position).toLocaleString()}. ${projection.current.receivables > projection.current.payables ? 'Positive' : 'Negative'} cash flow position.`;
    }

    return projection;
  }
}
