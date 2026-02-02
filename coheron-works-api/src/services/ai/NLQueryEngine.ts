import { llmGateway } from './LLMGateway.js';
import { AIService } from '../aiService.js';
import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

const SYSTEM_PROMPT = `You are a MongoDB query generator for an ERP system. Given a natural language question, generate a MongoDB aggregation pipeline.

Available collections: accountmoves (invoices/bills), saleorders, products, partners (customers/vendors), employees, leads, deals, stockquants (inventory levels), attendances.

Key fields by collection:
- accountmoves: tenant_id, name, move_type (out_invoice|in_invoice|out_refund|in_refund), partner_id, amount_total, amount_residual, payment_state (not_paid|partial|in_payment|paid|reversed), invoice_date, invoice_date_due, state (draft|posted|cancel)
- saleorders: tenant_id, name, partner_id, amount_total, status (draft|confirmed|done|cancelled), order_date
- products: tenant_id, name, type, list_price, qty_on_hand, reorder_point, category
- partners: tenant_id, name, email, phone, partner_type (customer|vendor|both), city, state
- employees: tenant_id, name, department_id, status, hire_date, salary.ctc

Respond ONLY with a JSON object: { "collection": "...", "pipeline": [...], "explanation": "..." }
Do not include any other text. The pipeline must include a $match stage with tenant_id as the first stage (use TENANT_ID as placeholder).`;

export class NLQueryEngine {
  static async executeNLQuery(tenantId: string, userId: string, queryText: string): Promise<{ data: any[]; explanation: string; query_type: string; pipeline?: any[] }> {
    try {
      const response = await llmGateway.sendMessage(queryText, {
        tenantId,
        systemPrompt: SYSTEM_PROMPT,
        maxTokens: 1024,
        temperature: 0.1,
      });

      const parsed = JSON.parse(response.content);
      const { collection, pipeline, explanation } = parsed;

      if (!collection || !pipeline || !Array.isArray(pipeline)) {
        throw new Error('Invalid LLM response format');
      }

      // Replace TENANT_ID placeholder with actual tenant ID
      const resolvedPipeline = JSON.parse(
        JSON.stringify(pipeline).replace(/\"TENANT_ID\"/g, `"${tenantId}"`)
      );

      // Safety: ensure first stage is $match with tenant_id
      if (!resolvedPipeline[0]?.$match?.tenant_id) {
        resolvedPipeline.unshift({ $match: { tenant_id: new mongoose.Types.ObjectId(tenantId) } });
      } else {
        resolvedPipeline[0].$match.tenant_id = new mongoose.Types.ObjectId(tenantId);
      }

      // Add safety limit
      const hasLimit = resolvedPipeline.some((s: any) => s.$limit);
      if (!hasLimit) resolvedPipeline.push({ $limit: 100 });

      const db = mongoose.connection.db;
      const data = await db!.collection(collection).aggregate(resolvedPipeline).toArray();

      return {
        data,
        explanation: explanation || 'Query executed via LLM.',
        query_type: 'nl_query_llm',
        pipeline: resolvedPipeline,
      };
    } catch (err: any) {
      logger.warn({ err: err.message }, 'LLM query failed, falling back to rule-based AI');
      // Fall back to rule-based
      const result = await AIService.processQuery(tenantId, userId, queryText);
      return {
        data: result.response_data ? [result.response_data] : [],
        explanation: result.response_text,
        query_type: 'rule_based_fallback',
      };
    }
  }
}
