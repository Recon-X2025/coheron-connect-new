import mongoose from 'mongoose';
import AIQuery from '../models/AIQuery.js';
import AIInsight from '../models/AIInsight.js';

interface QueryContext {
  module?: string;
  entity_type?: string;
  entity_id?: string;
  date_range?: { start: Date; end: Date };
}

interface QueryResult {
  response_text: string;
  response_data: any;
  query_type: string;
}

export class AIService {

  // ---- helpers ----
  private static zScore(value: number, mean: number, stddev: number): number {
    if (stddev === 0) return 0;
    return (value - mean) / stddev;
  }

  private static mean(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private static stddev(arr: number[]): number {
    if (arr.length < 2) return 0;
    const m = AIService.mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  }

  private static exponentialSmoothing(data: number[], alpha = 0.3, periods = 3): number[] {
    if (!data.length) return Array(periods).fill(0);
    let level = data[0];
    for (let i = 1; i < data.length; i++) {
      level = alpha * data[i] + (1 - alpha) * level;
    }
    // simple trend from last few points
    const recent = data.slice(-Math.min(6, data.length));
    const trend = recent.length > 1 ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1) : 0;
    const forecast: number[] = [];
    for (let i = 1; i <= periods; i++) {
      forecast.push(Math.max(0, Math.round((level + trend * i) * 100) / 100));
    }
    return forecast;
  }

  // ---- Intent parsing ----
  private static parseIntent(text: string): { type: string; module?: string } {
    const lower = text.toLowerCase();
    if (lower.includes('anomal') || lower.includes('unusual') || lower.includes('suspicious'))
      return { type: 'anomaly_detection', module: AIService.detectModule(lower) };
    if (lower.includes('forecast') || lower.includes('predict') || lower.includes('project'))
      return { type: 'forecast', module: AIService.detectModule(lower) };
    if (lower.includes('recommend') || lower.includes('suggest') || lower.includes('should'))
      return { type: 'recommendation', module: AIService.detectModule(lower) };
    if (lower.includes('summar') || lower.includes('overview') || lower.includes('report'))
      return { type: 'summarize', module: AIService.detectModule(lower) };
    return { type: 'natural_language', module: AIService.detectModule(lower) };
  }

  private static detectModule(text: string): string {
    if (/sales|order|invoice|revenue/.test(text)) return 'sales';
    if (/account|journal|ledger|payable|receivable/.test(text)) return 'accounting';
    if (/inventory|stock|product|warehouse/.test(text)) return 'inventory';
    if (/hr|employee|payroll|attendance|leave/.test(text)) return 'hr';
    if (/crm|lead|deal|customer|contact/.test(text)) return 'crm';
    return 'sales'; // default
  }

  // ---- Main query processor ----
  static async processQuery(
    tenantId: string,
    userId: string,
    queryText: string,
    context?: QueryContext
  ): Promise<QueryResult> {
    const start = Date.now();
    const intent = AIService.parseIntent(queryText);
    const module = context?.module || intent.module || 'sales';
    let result: QueryResult;

    switch (intent.type) {
      case 'anomaly_detection':
        result = await AIService.detectAnomalies(tenantId, module);
        break;
      case 'forecast':
        result = { response_text: 'Forecast generated.', response_data: await AIService.generateSalesForecast(tenantId, undefined, 6), query_type: 'forecast' };
        break;
      case 'recommendation':
        result = await AIService.getSmartRecommendations(tenantId, module);
        break;
      case 'summarize':
        result = await AIService.summarizeModule(tenantId, module, context?.date_range);
        break;
      default: {
        // Delegate to LLM-based NL query engine if available
        try {
          const { NLQueryEngine } = await import('./ai/NLQueryEngine.js');
          const nlResult = await NLQueryEngine.executeNLQuery(tenantId, userId, queryText);
          result = { response_text: nlResult.explanation, response_data: nlResult.data, query_type: nlResult.query_type };
        } catch {
          result = { response_text: 'I understood your query about ' + module + '. Here is what I found.', response_data: { module, intent: intent.type }, query_type: 'natural_language' };
        }
        break;
      }
    }

    const elapsed = Date.now() - start;

    await AIQuery.create({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      user_id: new mongoose.Types.ObjectId(userId),
      query_text: queryText,
      query_type: result.query_type || intent.type,
      context: { module, ...context },
      response_text: result.response_text,
      response_data: result.response_data,
      model_used: 'rule-based',
      tokens_used: 0,
      response_time_ms: elapsed,
    });

    return result;
  }

  // ---- Anomaly Detection (z-score based) ----
  static async detectAnomalies(tenantId: string, module: string): Promise<QueryResult> {
    const anomalies: any[] = [];

    if (module === 'sales' || module === 'accounting') {
      const Invoice = mongoose.models.AccountMove || mongoose.model('AccountMove');
      const invoices = await Invoice.find({ tenant_id: tenantId, move_type: { $in: ['out_invoice', 'in_invoice'] } })
        .sort({ created_at: -1 }).limit(200).lean() as any[];
      const amounts = invoices.map((i: any) => i.amount_total || 0).filter((a: number) => a > 0);
      if (amounts.length > 5) {
        const m = AIService.mean(amounts);
        const s = AIService.stddev(amounts);
        invoices.forEach((inv: any) => {
          const z = AIService.zScore(inv.amount_total || 0, m, s);
          if (Math.abs(z) > 2.5) {
            anomalies.push({ type: 'invoice_amount', entity_id: inv._id, name: inv.name || inv.number, amount: inv.amount_total, z_score: Math.round(z * 100) / 100, severity: Math.abs(z) > 3 ? 'critical' : 'warning' });
          }
        });
      }
    }

    if (module === 'inventory') {
      const Product = mongoose.models.Product || mongoose.model('Product');
      const products = await Product.find({ tenant_id: tenantId }).lean() as any[];
      products.forEach((prod: any) => {
        const qty = prod.qty_on_hand ?? prod.quantity_on_hand ?? 0;
        const reorder = prod.reorder_point ?? prod.reorder_level ?? 0;
        if (reorder > 0 && qty < reorder * 0.5) {
          anomalies.push({ type: 'low_stock', entity_id: prod._id, name: prod.name, qty_on_hand: qty, reorder_point: reorder, severity: qty === 0 ? 'critical' : 'warning' });
        }
      });
    }

    const text = anomalies.length > 0
      ? `Found ${anomalies.length} anomalies in ${module}.`
      : `No anomalies detected in ${module}.`;

    return { response_text: text, response_data: { anomalies, module }, query_type: 'anomaly_detection' };
  }

  // ---- Forecast (exponential smoothing) ----
  static async generateSalesForecast(tenantId: string, productId?: string, periods = 6): Promise<any> {
    const Invoice = mongoose.models.AccountMove || mongoose.model('AccountMove');
    const match: any = { tenant_id: new mongoose.Types.ObjectId(tenantId), move_type: 'out_invoice' };
    if (productId) match['invoice_line_ids.product_id'] = new mongoose.Types.ObjectId(productId);

    const pipeline: any[] = [
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$invoice_date' } }, total: { $sum: '$amount_total' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: 24 },
    ];

    let monthly: any[];
    try {
      monthly = await Invoice.aggregate(pipeline);
    } catch {
      monthly = [];
    }

    const values = monthly.map((m: any) => m.total);
    const forecast = AIService.exponentialSmoothing(values, 0.3, periods);

    return { historical: monthly, forecast, periods, method: 'exponential_smoothing' };
  }

  // ---- Smart Recommendations ----
  static async getSmartRecommendations(tenantId: string, module: string): Promise<QueryResult> {
    const recommendations: any[] = [];

    if (module === 'sales') {
      const Invoice = mongoose.models.AccountMove || mongoose.model('AccountMove');
      const overdue = await Invoice.countDocuments({ tenant_id: tenantId, move_type: 'out_invoice', payment_state: { $in: ['not_paid', 'partial'] }, invoice_date_due: { $lt: new Date() } });
      if (overdue > 0) {
        recommendations.push({ priority: 'high', title: 'Follow up overdue invoices', description: `You have ${overdue} overdue invoices. Consider sending payment reminders.`, action: 'navigate', action_target: '/accounting/accounts-receivable' });
      }
    }

    if (module === 'inventory') {
      const Product = mongoose.models.Product || mongoose.model('Product');
      const lowStock = await Product.find({ tenant_id: tenantId, $expr: { $lt: [{ $ifNull: ['$qty_on_hand', '$quantity_on_hand'] }, { $ifNull: ['$reorder_point', '$reorder_level'] }] } }).limit(10).lean() as any[];
      if (lowStock.length > 0) {
        recommendations.push({ priority: 'high', title: 'Reorder low-stock products', description: `${lowStock.length} products are below reorder point.`, action: 'navigate', action_target: '/inventory/reorder', items: lowStock.map((p: any) => ({ id: p._id, name: p.name })) });
      }
    }

    if (module === 'crm') {
      const Lead = mongoose.models.Lead || mongoose.model('Lead');
      const stale = await Lead.countDocuments({ tenant_id: tenantId, status: { $nin: ['won', 'lost', 'converted'] }, updated_at: { $lt: new Date(Date.now() - 14 * 86400000) } });
      if (stale > 0) {
        recommendations.push({ priority: 'medium', title: 'Follow up stale leads', description: `${stale} leads have not been updated in 14+ days.`, action: 'navigate', action_target: '/leads' });
      }
    }

    if (module === 'hr') {
      recommendations.push({ priority: 'info', title: 'Review upcoming leave requests', description: 'Check pending leave approvals to ensure adequate staffing.', action: 'navigate', action_target: '/leave' });
    }

    if (!recommendations.length) {
      recommendations.push({ priority: 'info', title: 'All good!', description: `No urgent recommendations for ${module} at this time.` });
    }

    return { response_text: `${recommendations.length} recommendation(s) for ${module}.`, response_data: { recommendations, module }, query_type: 'recommendation' };
  }

  // ---- Module Summary ----
  static async summarizeModule(tenantId: string, module: string, dateRange?: { start: Date; end: Date }): Promise<QueryResult> {
    const start = dateRange?.start || new Date(Date.now() - 30 * 86400000);
    const end = dateRange?.end || new Date();
    const metrics: any = { module, period: { start, end } };

    try {
      if (module === 'sales') {
        const Invoice = mongoose.models.AccountMove || mongoose.model('AccountMove');
        const result = await Invoice.aggregate([
          { $match: { tenant_id: new mongoose.Types.ObjectId(tenantId), move_type: 'out_invoice', invoice_date: { $gte: start, $lte: end } } },
          { $group: { _id: null, total_revenue: { $sum: '$amount_total' }, count: { $sum: 1 }, avg_value: { $avg: '$amount_total' } } },
        ]);
        metrics.summary = result[0] || { total_revenue: 0, count: 0, avg_value: 0 };
      } else if (module === 'inventory') {
        const Product = mongoose.models.Product || mongoose.model('Product');
        const total = await Product.countDocuments({ tenant_id: tenantId });
        const lowStock = await Product.countDocuments({ tenant_id: tenantId, $expr: { $lt: [{ $ifNull: ['$qty_on_hand', 0] }, { $ifNull: ['$reorder_point', 0] }] } });
        metrics.summary = { total_products: total, low_stock: lowStock };
      } else if (module === 'crm') {
        const Lead = mongoose.models.Lead || mongoose.model('Lead');
        const total = await Lead.countDocuments({ tenant_id: tenantId, created_at: { $gte: start, $lte: end } });
        const won = await Lead.countDocuments({ tenant_id: tenantId, status: 'won', created_at: { $gte: start, $lte: end } });
        metrics.summary = { new_leads: total, won, conversion_rate: total > 0 ? Math.round((won / total) * 10000) / 100 : 0 };
      } else if (module === 'hr') {
        const Employee = mongoose.models.Employee || mongoose.model('Employee');
        const count = await Employee.countDocuments({ tenant_id: tenantId, status: 'active' });
        metrics.summary = { active_employees: count };
      } else {
        metrics.summary = { message: 'Summary not yet implemented for ' + module };
      }
    } catch (err: any) {
      metrics.summary = { error: 'Could not generate summary', detail: err.message };
    }

    return { response_text: `Summary for ${module} (${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}).`, response_data: metrics, query_type: 'summarize' };
  }

  // ---- Generate Insights (batch) ----
  static async generateInsights(tenantId: string): Promise<number> {
    let created = 0;
    const modules: Array<'sales' | 'accounting' | 'inventory' | 'hr' | 'crm'> = ['sales', 'inventory', 'crm'];

    for (const mod of modules) {
      const { response_data } = await AIService.detectAnomalies(tenantId, mod);
      for (const anomaly of (response_data.anomalies || [])) {
        await AIInsight.create({
          tenant_id: new mongoose.Types.ObjectId(tenantId),
          insight_type: 'anomaly',
          module: mod,
          title: `Anomaly: ${anomaly.type}`,
          description: `Detected unusual ${anomaly.type} for ${anomaly.name || anomaly.entity_id}.`,
          severity: anomaly.severity || 'warning',
          data: anomaly,
          related_entities: [{ type: anomaly.type, id: String(anomaly.entity_id), name: anomaly.name || 'Unknown' }],
        });
        created++;
      }

      const { response_data: recData } = await AIService.getSmartRecommendations(tenantId, mod);
      for (const rec of (recData.recommendations || []).filter((r: any) => r.priority === 'high')) {
        await AIInsight.create({
          tenant_id: new mongoose.Types.ObjectId(tenantId),
          insight_type: 'recommendation',
          module: mod,
          title: rec.title,
          description: rec.description,
          severity: 'warning',
          data: rec,
          related_entities: (rec.items || []).map((i: any) => ({ type: 'product', id: String(i.id), name: i.name })),
        });
        created++;
      }
    }

    return created;
  }
}

export default AIService;
