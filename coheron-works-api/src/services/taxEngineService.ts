import TaxRule from '../models/TaxRule.js';
import mongoose from 'mongoose';
import { NotFoundError, ValidationError, ConflictError } from '../shared/errors.js';

interface TaxLineInput {
  product_id?: string;
  hsn_code?: string;
  amount: number;
  quantity: number;
}

interface TaxBreakdown {
  tax_rule_id?: string;
  tax_type: string;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  cess_rate: number;
  cess_amount: number;
  vat_rate: number;
  vat_amount: number;
  total_tax: number;
}

interface TaxResult {
  lines: Array<TaxLineInput & { tax: TaxBreakdown }>;
  summary: {
    subtotal: number;
    total_cgst: number;
    total_sgst: number;
    total_igst: number;
    total_cess: number;
    total_vat: number;
    total_tax: number;
    grand_total: number;
  };
}

export class TaxEngineService {
  async calculateTax(
    tenantId: string,
    lines: TaxLineInput[],
    sellerState: string,
    buyerState: string,
    country: string = 'IN',
    isExport: boolean = false
  ): Promise<TaxResult> {
    if (isExport) {
      return this.zeroRatedResult(lines);
    }

    const now = new Date();
    const taxRules = await TaxRule.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      country_code: country,
      is_active: true,
      $and: [
        { $or: [{ valid_from: null }, { valid_from: { $exists: false } }, { valid_from: { $lte: now } }] },
        { $or: [{ valid_until: null }, { valid_until: { $exists: false } }, { valid_until: { $gte: now } }] },
      ],
    });

    const resultLines: Array<TaxLineInput & { tax: TaxBreakdown }> = [];
    let totalCgst = 0, totalSgst = 0, totalIgst = 0, totalCess = 0, totalVat = 0;
    let subtotal = 0;

    for (const line of lines) {
      const rule = this.findMatchingRule(taxRules, line.hsn_code, sellerState, buyerState);
      const tax = this.computeLineTax(line.amount, rule, sellerState, buyerState, country);
      
      resultLines.push({ ...line, tax });
      subtotal += line.amount;
      totalCgst += tax.cgst_amount;
      totalSgst += tax.sgst_amount;
      totalIgst += tax.igst_amount;
      totalCess += tax.cess_amount;
      totalVat += tax.vat_amount;
    }

    const totalTax = totalCgst + totalSgst + totalIgst + totalCess + totalVat;

    return {
      lines: resultLines,
      summary: {
        subtotal,
        total_cgst: totalCgst,
        total_sgst: totalSgst,
        total_igst: totalIgst,
        total_cess: totalCess,
        total_vat: totalVat,
        total_tax: totalTax,
        grand_total: subtotal + totalTax,
      },
    };
  }

  private findMatchingRule(rules: any[], hsnCode?: string, sellerState?: string, buyerState?: string): any | null {
    // Priority: exact HSN + state match > HSN pattern match > state match > default
    let bestMatch: any = null;
    let bestScore = -1;

    for (const rule of rules) {
      let score = 0;
      
      if (rule.hsn_code_pattern) {
        if (!hsnCode) {
          continue; // Rule requires HSN but line has none — skip
        }
        if (hsnCode.startsWith(rule.hsn_code_pattern.replace('*', ''))) {
          score += 10;
        } else {
          continue; // HSN pattern specified but doesn't match
        }
      }

      if (rule.state_code) {
        if (rule.state_code === sellerState || rule.state_code === buyerState) {
          score += 5;
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestMatch = rule;
      }
    }

    return bestMatch;
  }

  private computeLineTax(
    amount: number,
    rule: any | null,
    sellerState: string,
    buyerState: string,
    country: string
  ): TaxBreakdown {
    const breakdown: TaxBreakdown = {
      tax_type: 'none',
      cgst_rate: 0, cgst_amount: 0,
      sgst_rate: 0, sgst_amount: 0,
      igst_rate: 0, igst_amount: 0,
      cess_rate: 0, cess_amount: 0,
      vat_rate: 0, vat_amount: 0,
      total_tax: 0,
    };

    if (!rule) return breakdown;

    breakdown.tax_rule_id = rule._id.toString();
    breakdown.tax_type = rule.tax_type;

    if (rule.tax_type === 'gst') {
      const isSameState = sellerState && buyerState && sellerState === buyerState;
      if (isSameState) {
        breakdown.cgst_rate = rule.rates?.cgst ?? rule.cgst_rate ?? 0;
        breakdown.sgst_rate = rule.rates?.sgst ?? rule.sgst_rate ?? 0;
        breakdown.cgst_amount = this.round(amount * breakdown.cgst_rate / 100);
        breakdown.sgst_amount = this.round(amount * breakdown.sgst_rate / 100);
      } else {
        breakdown.igst_rate = rule.rates?.igst ?? rule.igst_rate ?? 0;
        breakdown.igst_amount = this.round(amount * breakdown.igst_rate / 100);
      }
      breakdown.cess_rate = rule.rates?.cess ?? rule.cess_rate ?? 0;
      breakdown.cess_amount = this.round(amount * breakdown.cess_rate / 100);
    } else if (rule.tax_type === 'vat') {
      breakdown.vat_rate = rule.rates?.vat ?? rule.vat_rate ?? 0;
      breakdown.vat_amount = this.round(amount * breakdown.vat_rate / 100);
    } else if (rule.tax_type === 'sales_tax') {
      breakdown.vat_rate = rule.rates?.vat ?? rule.vat_rate ?? 0;
      breakdown.vat_amount = this.round(amount * breakdown.vat_rate / 100);
    }

    breakdown.total_tax = breakdown.cgst_amount + breakdown.sgst_amount + 
      breakdown.igst_amount + breakdown.cess_amount + breakdown.vat_amount;

    return breakdown;
  }

  private zeroRatedResult(lines: TaxLineInput[]): TaxResult {
    const zero: TaxBreakdown = {
      tax_type: 'zero_rated', cgst_rate: 0, cgst_amount: 0,
      sgst_rate: 0, sgst_amount: 0, igst_rate: 0, igst_amount: 0,
      cess_rate: 0, cess_amount: 0, vat_rate: 0, vat_amount: 0, total_tax: 0,
    };
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    return {
      lines: lines.map(l => ({ ...l, tax: zero })),
      summary: { subtotal, total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0, total_vat: 0, total_tax: 0, grand_total: subtotal },
    };
  }

  private round(n: number): number {
    return Math.round(n * 100) / 100;
  }
}

export const taxEngineService = new TaxEngineService();
export default taxEngineService;
