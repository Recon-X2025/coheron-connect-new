import mongoose from 'mongoose';
import FinancialReportTemplate from '../models/FinancialReportTemplate.js';
import AccountMove from '../models/AccountMove.js';
import AccountAccount from '../models/AccountAccount.js';

interface GenerateParams {
  start_date: string;
  end_date: string;
  compare_period?: boolean;
  entity_id?: string;
}

interface RowResult {
  label: string;
  current_value: number;
  prior_value: number | null;
  variance: number | null;
  variance_pct: number | null;
  row_type: string;
  indent_level: number;
  is_bold: boolean;
}

interface SectionResult { name: string; rows: RowResult[]; }

export async function generateReport(tenantId: string, templateId: string, params: GenerateParams) {
  const template = await FinancialReportTemplate.findOne({ _id: templateId, tenant_id: tenantId });
  if (!template) throw new Error('Report template not found');

  const startDate = new Date(params.start_date);
  const endDate = new Date(params.end_date);
  const periodMs = endDate.getTime() - startDate.getTime();
  const priorStart = new Date(startDate.getTime() - periodMs);
  const priorEnd = new Date(startDate.getTime() - 1);

  const allCodes: string[] = [];
  for (const section of template.sections) {
    for (const row of section.rows) {
      if (row.account_codes?.length) allCodes.push(...row.account_codes);
    }
  }
  const uniqueCodes = [...new Set(allCodes)];
  const accounts = await AccountAccount.find({ code: { $in: uniqueCodes } }).lean();
  const codeToIds: Record<string, mongoose.Types.ObjectId[]> = {};
  for (const acc of accounts as any[]) {
    if (!codeToIds[acc.code]) codeToIds[acc.code] = [];
    codeToIds[acc.code].push(acc._id);
  }

  async function aggregateAmounts(codes: string[], start: Date, end: Date): Promise<number> {
    const accountIds: mongoose.Types.ObjectId[] = [];
    for (const code of codes) { if (codeToIds[code]) accountIds.push(...codeToIds[code]); }
    if (accountIds.length === 0) return 0;
    const matchFilter: any = { date: { $gte: start, $lte: end }, state: 'posted' };
    if (params.entity_id) matchFilter.partner_id = new mongoose.Types.ObjectId(params.entity_id);
    const result = await AccountMove.aggregate([
      { $match: matchFilter },
      { $unwind: '$lines' },
      { $match: { 'lines.account_id': { $in: accountIds } } },
      { $group: { _id: null, total_debit: { $sum: "$lines.debit" }, total_credit: { $sum: "$lines.credit" } } },
    ]);
    if (!result.length) return 0;
    return result[0].total_credit - result[0].total_debit;
  }

  const sections: SectionResult[] = [];
  for (const section of template.sections) {
    const rowValues: Record<number, number> = {};
    const rowResults: RowResult[] = [];
    for (let i = 0; i < section.rows.length; i++) {
      const row = section.rows[i];
      let currentValue = 0;
      let priorValue: number | null = null;
      if (row.row_type === 'header' || row.row_type === 'separator') {
        rowResults.push({ label: row.label, current_value: 0, prior_value: null, variance: null, variance_pct: null, row_type: row.row_type, indent_level: row.indent_level, is_bold: row.is_bold });
        rowValues[i] = 0;
        continue;
      }
      if (row.account_codes?.length) {
        currentValue = await aggregateAmounts(row.account_codes, startDate, endDate);
        if (params.compare_period) priorValue = await aggregateAmounts(row.account_codes, priorStart, priorEnd);
      } else if (row.formula) {
        let expr = row.formula;
        const rowRefRegex = /row(\d+)/g;
        let match: RegExpExecArray | null;
        while ((match = rowRefRegex.exec(row.formula)) !== null) {
          const refIdx = parseInt(match[1], 10);
          expr = expr.replace(match[0], String(rowValues[refIdx] || 0));
        }
        try { currentValue = Function('"use strict"; return (' + expr + ');')(); } catch { currentValue = 0; }
        if (params.compare_period) priorValue = null;
      }
      rowValues[i] = currentValue;
      const variance = priorValue !== null ? currentValue - priorValue : null;
      const variance_pct = priorValue !== null && priorValue !== 0
        ? Math.round(((currentValue - priorValue) / Math.abs(priorValue)) * 10000) / 100 : null;
      rowResults.push({
        label: row.label, current_value: Math.round(currentValue * 100) / 100,
        prior_value: priorValue !== null ? Math.round(priorValue * 100) / 100 : null,
        variance: variance !== null ? Math.round(variance * 100) / 100 : null,
        variance_pct, row_type: row.row_type, indent_level: row.indent_level, is_bold: row.is_bold,
      });
    }
    sections.push({ name: section.name, rows: rowResults });
  }
  return {
    template_name: template.name,
    period: { start_date: params.start_date, end_date: params.end_date },
    sections,
    generated_at: new Date().toISOString(),
  };
}
