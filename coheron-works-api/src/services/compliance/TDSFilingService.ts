import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

export class TDSFilingService {
  static async generateForm26Q(tenantId: string, quarter: string, financialYear: string): Promise<any> {
    // Quarter: Q1(Apr-Jun), Q2(Jul-Sep), Q3(Oct-Dec), Q4(Jan-Mar)
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const quarterMap: Record<string, [number, number]> = {
      Q1: [3, 5], Q2: [6, 8], Q3: [9, 11], Q4: [0, 2],
    };

    const [startMonth, endMonth] = quarterMap[quarter] || [0, 2];
    const [startYear] = financialYear.split('-').map(Number);
    const yearOffset = quarter === 'Q4' ? 1 : 0;

    const startDate = new Date(startYear + yearOffset, startMonth, 1);
    const endDate = new Date(startYear + yearOffset, endMonth + 1, 0, 23, 59, 59);

    // Get TDS deductions from payments/journal entries
    const tdsEntries = await db.collection('accountmoves').find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      state: 'posted',
      invoice_date: { $gte: startDate, $lte: endDate },
      'tds_section': { $exists: true, $ne: null },
    }).toArray();

    const deductees = tdsEntries.map((entry: any) => ({
      deductee_pan: entry.partner_pan || '',
      deductee_name: entry.partner_name || '',
      section: entry.tds_section || '194C',
      payment_date: entry.invoice_date,
      amount_paid: entry.amount_total || 0,
      tds_rate: entry.tds_rate || 10,
      tds_amount: entry.tds_amount || 0,
      challan_no: entry.challan_no || '',
      bsr_code: entry.bsr_code || '',
    }));

    const summary = {
      form: '26Q',
      quarter,
      financial_year: financialYear,
      deductor_tan: process.env.COMPANY_TAN || '',
      deductor_name: process.env.COMPANY_NAME || '',
      total_deductees: deductees.length,
      total_amount_paid: deductees.reduce((s: number, d: any) => s + d.amount_paid, 0),
      total_tds_deducted: deductees.reduce((s: number, d: any) => s + d.tds_amount, 0),
      deductees,
    };

    logger.info({ tenantId, quarter, financialYear, deductees: deductees.length }, 'Form 26Q generated');
    return summary;
  }

  static async generateFVUFile(data: any): Promise<string> {
    // Generate NSDL FVU-format text file for TRACES upload
    const lines: string[] = [];
    lines.push(`^FH^1^TDS^${data.form}^${data.financial_year}^${data.quarter}^${data.deductor_tan}^`);
    lines.push(`^BH^1^${data.deductor_name}^${data.deductor_tan}^^^`);

    for (const d of data.deductees) {
      lines.push(`^DD^${d.deductee_pan}^${d.deductee_name}^${d.section}^${d.amount_paid}^${d.tds_amount}^${d.tds_rate}^`);
    }

    return lines.join('\n');
  }
}
