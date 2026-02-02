import { describe, it, expect, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { TaxEngineService } from '../src/services/taxEngineService.js';
import TaxRule from '../src/models/TaxRule.js';

describe('Tax Engine Service', () => {
  const tenantId = new mongoose.Types.ObjectId();
  let taxEngine: TaxEngineService;

  beforeEach(async () => {
    taxEngine = new TaxEngineService();

    // Insert tax rules using the Mongoose model (flat rate fields)
    await TaxRule.create([
      {
        tenant_id: tenantId,
        name: 'GST 18%',
        tax_type: 'gst',
        country_code: 'IN',
        state_code: '',
        hsn_code_pattern: '',
        is_active: true,
        cgst_rate: 9,
        sgst_rate: 9,
        igst_rate: 18,
        cess_rate: 0,
      },
      {
        tenant_id: tenantId,
        name: 'GST 12% Electronics',
        tax_type: 'gst',
        country_code: 'IN',
        state_code: '',
        hsn_code_pattern: '8471*',
        is_active: true,
        cgst_rate: 6,
        sgst_rate: 6,
        igst_rate: 12,
        cess_rate: 0,
      },
      {
        tenant_id: tenantId,
        name: 'GST 28% with Cess',
        tax_type: 'gst',
        country_code: 'IN',
        state_code: '',
        hsn_code_pattern: '8703*',
        is_active: true,
        cgst_rate: 14,
        sgst_rate: 14,
        igst_rate: 28,
        cess_rate: 15,
      },
    ]);
  });

  describe('Intra-state GST (same state → CGST + SGST split)', () => {
    it('should split tax into CGST and SGST for same-state transactions', async () => {
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [{ amount: 10000, quantity: 1 }],
        'KA',  // seller state
        'KA',  // buyer state (same)
        'IN'
      );

      expect(result.summary.subtotal).toBe(10000);
      expect(result.summary.total_cgst).toBe(900);   // 9% of 10000
      expect(result.summary.total_sgst).toBe(900);   // 9% of 10000
      expect(result.summary.total_igst).toBe(0);
      expect(result.summary.total_tax).toBe(1800);
      expect(result.summary.grand_total).toBe(11800);

      // Line-level check
      const lineTax = result.lines[0].tax;
      expect(lineTax.tax_type).toBe('gst');
      expect(lineTax.cgst_rate).toBe(9);
      expect(lineTax.sgst_rate).toBe(9);
      expect(lineTax.igst_rate).toBe(0);
    });
  });

  describe('Inter-state GST (different states → IGST)', () => {
    it('should apply IGST for different-state transactions', async () => {
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [{ amount: 10000, quantity: 1 }],
        'KA',  // seller state
        'MH',  // buyer state (different)
        'IN'
      );

      expect(result.summary.subtotal).toBe(10000);
      expect(result.summary.total_cgst).toBe(0);
      expect(result.summary.total_sgst).toBe(0);
      expect(result.summary.total_igst).toBe(1800);  // 18% of 10000
      expect(result.summary.total_tax).toBe(1800);
      expect(result.summary.grand_total).toBe(11800);

      const lineTax = result.lines[0].tax;
      expect(lineTax.igst_rate).toBe(18);
      expect(lineTax.cgst_rate).toBe(0);
      expect(lineTax.sgst_rate).toBe(0);
    });
  });

  describe('Export transactions (zero-rated)', () => {
    it('should apply zero tax for exports', async () => {
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [{ amount: 10000, quantity: 1 }, { amount: 5000, quantity: 2 }],
        'KA',
        'US-NY',
        'IN',
        true  // isExport flag
      );

      expect(result.summary.subtotal).toBe(15000);
      expect(result.summary.total_cgst).toBe(0);
      expect(result.summary.total_sgst).toBe(0);
      expect(result.summary.total_igst).toBe(0);
      expect(result.summary.total_cess).toBe(0);
      expect(result.summary.total_tax).toBe(0);
      expect(result.summary.grand_total).toBe(15000);

      for (const line of result.lines) {
        expect(line.tax.tax_type).toBe('zero_rated');
        expect(line.tax.total_tax).toBe(0);
      }
    });
  });

  describe('HSN-based tax matching', () => {
    it('should match HSN-specific rate for electronics', async () => {
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [{ amount: 5000, quantity: 1, hsn_code: '84713010' }],
        'KA',
        'MH',
        'IN'
      );

      // Should match the 8471* pattern → 12% IGST (inter-state)
      expect(result.lines[0].tax.igst_rate).toBe(12);
      expect(result.lines[0].tax.igst_amount).toBe(600);
      expect(result.summary.total_igst).toBe(600);
    });

    it('should apply cess when applicable (luxury goods)', async () => {
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [{ amount: 100000, quantity: 1, hsn_code: '87032110' }],
        'KA',
        'KA',
        'IN'
      );

      // Should match 8703* pattern → CGST 14% + SGST 14% + Cess 15%
      expect(result.lines[0].tax.cgst_rate).toBe(14);
      expect(result.lines[0].tax.sgst_rate).toBe(14);
      expect(result.lines[0].tax.cess_rate).toBe(15);
      expect(result.lines[0].tax.cgst_amount).toBe(14000);
      expect(result.lines[0].tax.sgst_amount).toBe(14000);
      expect(result.lines[0].tax.cess_amount).toBe(15000);
      expect(result.summary.total_tax).toBe(43000);
    });
  });

  describe('Multiple line items', () => {
    it('should compute tax for each line and summarize correctly', async () => {
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [
          { amount: 1000, quantity: 1 },
          { amount: 2000, quantity: 2 },
        ],
        'TN',
        'TN',
        'IN'
      );

      expect(result.lines).toHaveLength(2);
      expect(result.summary.subtotal).toBe(3000);
      // Both lines match default 18% GST → CGST 9% + SGST 9%
      expect(result.summary.total_cgst).toBe(270);  // 90 + 180
      expect(result.summary.total_sgst).toBe(270);
      expect(result.summary.total_tax).toBe(540);
      expect(result.summary.grand_total).toBe(3540);
    });
  });

  describe('No matching rule', () => {
    it('should return zero tax when no tax rules match', async () => {
      // Use a different country with no rules
      const result = await taxEngine.calculateTax(
        tenantId.toString(),
        [{ amount: 1000, quantity: 1 }],
        'CA-ON',
        'CA-BC',
        'CA'  // No rules for Canada
      );

      expect(result.summary.total_tax).toBe(0);
      expect(result.summary.grand_total).toBe(1000);
      expect(result.lines[0].tax.tax_type).toBe('none');
    });
  });
});
