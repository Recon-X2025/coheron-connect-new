import { llmGateway } from './LLMGateway.js';
import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

export class SmartAutomation {
  static async suggestRules(tenantId: string): Promise<any[]> {
    const tenantOid = new mongoose.Types.ObjectId(tenantId);
    const suggestions: any[] = [];

    // Gather patterns from historical data
    const AccountMove = mongoose.models.AccountMove || mongoose.model('AccountMove');

    // Check for repeated late payments from specific customers
    const latePayments = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'out_invoice', payment_state: { $in: ['not_paid', 'partial'] }, invoice_date_due: { $lt: new Date() } } },
      { $group: { _id: '$partner_id', count: { $sum: 1 }, total_overdue: { $sum: '$amount_residual' } } },
      { $match: { count: { $gte: 3 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    if (latePayments.length > 0) {
      suggestions.push({
        type: 'payment_reminder',
        title: 'Auto-send payment reminders for repeat late payers',
        description: `${latePayments.length} customers have 3+ overdue invoices. Set up automatic reminder emails when invoices are 7 days overdue.`,
        trigger: 'invoice_overdue_7_days',
        action: 'send_payment_reminder_email',
        affected_entities: latePayments.length,
        priority: 'high',
      });
    }

    // Check for low stock patterns
    try {
      const Product = mongoose.models.Product || mongoose.model('Product');
      const lowStockCount = await Product.countDocuments({
        tenant_id: tenantOid,
        $expr: { $lt: [{ $ifNull: ['$qty_on_hand', 0] }, { $ifNull: ['$reorder_point', 0] }] },
      });
      if (lowStockCount > 0) {
        suggestions.push({
          type: 'auto_reorder',
          title: 'Auto-create purchase orders for low-stock items',
          description: `${lowStockCount} products are below reorder point. Automate purchase order creation when stock drops below threshold.`,
          trigger: 'stock_below_reorder_point',
          action: 'create_purchase_order',
          affected_entities: lowStockCount,
          priority: 'high',
        });
      }
    } catch { /* collection may not exist */ }

    // Check for stale leads
    try {
      const Lead = mongoose.models.Lead || mongoose.model('Lead');
      const staleLeads = await Lead.countDocuments({
        tenant_id: tenantOid,
        status: { $nin: ['won', 'lost', 'converted'] },
        updated_at: { $lt: new Date(Date.now() - 7 * 86400000) },
      });
      if (staleLeads > 5) {
        suggestions.push({
          type: 'lead_followup',
          title: 'Auto-assign follow-up tasks for stale leads',
          description: `${staleLeads} leads haven't been updated in 7+ days. Create automatic follow-up tasks for assigned sales reps.`,
          trigger: 'lead_no_activity_7_days',
          action: 'create_followup_task',
          affected_entities: staleLeads,
          priority: 'medium',
        });
      }
    } catch { /* collection may not exist */ }

    // Try LLM for additional suggestions
    try {
      const response = await llmGateway.sendMessage(
        `Based on these detected patterns in an ERP system, suggest 1-2 additional automation rules (JSON array):\n${JSON.stringify(suggestions)}`,
        { tenantId, systemPrompt: 'You are an ERP automation consultant. Suggest practical automation rules. Respond with a JSON array of objects with fields: type, title, description, trigger, action, priority.', maxTokens: 512, temperature: 0.5 }
      );
      const additional = JSON.parse(response.content);
      if (Array.isArray(additional)) {
        suggestions.push(...additional.slice(0, 2).map((s: any) => ({ ...s, source: 'ai_suggested' })));
      }
    } catch { /* LLM unavailable, return rule-based suggestions only */ }

    return suggestions;
  }
}
