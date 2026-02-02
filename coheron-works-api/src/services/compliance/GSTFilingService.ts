import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';

interface GSTR1Invoice {
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: 'Y' | 'N';
  inv_typ: 'R' | 'SEZWP' | 'SEZWOP' | 'DE' | 'CBW';
  itms: Array<{
    num: number;
    itm_det: { txval: number; rt: number; camt: number; samt: number; iamt: number; csamt: number };
  }>;
}

export class GSTFilingService {
  static async generateGSTR1(tenantId: string, period: string): Promise<any> {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const AccountMove = mongoose.models.AccountMove || mongoose.model('AccountMove');
    const invoices = await AccountMove.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      move_type: 'out_invoice',
      state: 'posted',
      invoice_date: { $gte: startDate, $lte: endDate },
    }).populate('partner_id').lean() as any[];

    const b2b: any[] = [];
    const b2cs: any[] = [];
    const cdnr: any[] = [];

    for (const inv of invoices) {
      const partner = inv.partner_id || {};
      const gstin = partner.gstin || partner.vat;
      const stateCode = partner.state_code || (gstin ? gstin.substring(0, 2) : '');

      const taxableValue = inv.amount_untaxed || (inv.amount_total - (inv.amount_tax || 0));
      const cgst = (inv.amount_tax || 0) / 2;
      const sgst = (inv.amount_tax || 0) / 2;
      const igst = stateCode && stateCode !== (inv.company_state_code || '') ? (inv.amount_tax || 0) : 0;

      const invItem: GSTR1Invoice = {
        inum: inv.name || inv.number,
        idt: new Date(inv.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        val: inv.amount_total,
        pos: stateCode || '29',
        rchrg: 'N',
        inv_typ: 'R',
        itms: [{
          num: 1,
          itm_det: {
            txval: Math.round(taxableValue * 100) / 100,
            rt: inv.tax_rate || 18,
            camt: igst ? 0 : Math.round(cgst * 100) / 100,
            samt: igst ? 0 : Math.round(sgst * 100) / 100,
            iamt: Math.round(igst * 100) / 100,
            csamt: 0,
          },
        }],
      };

      if (gstin && gstin.length === 15) {
        // B2B: registered businesses
        let existing = b2b.find(b => b.ctin === gstin);
        if (!existing) {
          existing = { ctin: gstin, inv: [] };
          b2b.push(existing);
        }
        existing.inv.push(invItem);
      } else {
        // B2CS: unregistered consumers
        const key = `${stateCode || '29'}_${inv.tax_rate || 18}`;
        let existing = b2cs.find(b => b._key === key);
        if (!existing) {
          existing = { _key: key, pos: stateCode || '29', rt: inv.tax_rate || 18, typ: 'OE', txval: 0, camt: 0, samt: 0, iamt: 0, csamt: 0 };
          b2cs.push(existing);
        }
        existing.txval += taxableValue;
        existing.camt += igst ? 0 : cgst;
        existing.samt += igst ? 0 : sgst;
        existing.iamt += igst;
      }
    }

    // Handle credit notes
    const creditNotes = await AccountMove.find({
      tenant_id: new mongoose.Types.ObjectId(tenantId),
      move_type: 'out_refund',
      state: 'posted',
      invoice_date: { $gte: startDate, $lte: endDate },
    }).populate('partner_id').lean() as any[];

    for (const cn of creditNotes) {
      const partner = cn.partner_id || {};
      const gstin = partner.gstin || partner.vat;
      if (gstin && gstin.length === 15) {
        let existing = cdnr.find(c => c.ctin === gstin);
        if (!existing) {
          existing = { ctin: gstin, nt: [] };
          cdnr.push(existing);
        }
        existing.nt.push({
          ntty: 'C',
          nt_num: cn.name || cn.number,
          nt_dt: new Date(cn.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
          val: cn.amount_total,
          itms: [{
            num: 1,
            itm_det: {
              txval: cn.amount_untaxed || (cn.amount_total - (cn.amount_tax || 0)),
              rt: cn.tax_rate || 18,
              camt: (cn.amount_tax || 0) / 2,
              samt: (cn.amount_tax || 0) / 2,
              iamt: 0,
              csamt: 0,
            },
          }],
        });
      }
    }

    // Clean up b2cs _key
    b2cs.forEach(b => { delete b._key; b.txval = Math.round(b.txval * 100) / 100; b.camt = Math.round(b.camt * 100) / 100; b.samt = Math.round(b.samt * 100) / 100; });

    const gstr1 = {
      gstin: '', // Tenant's GSTIN - to be filled from tenant config
      fp: `${String(month).padStart(2, '0')}${year}`,
      b2b,
      b2cs,
      cdnr,
      doc_issue: { doc_num: 1, docs: [{ num: 1, from: invoices[0]?.name || '', to: invoices[invoices.length - 1]?.name || '', totnum: invoices.length, cancel: 0, net_issue: invoices.length }] },
    };

    logger.info({ tenantId, period, b2b: b2b.length, b2cs: b2cs.length, cdnr: cdnr.length }, 'GSTR-1 generated');
    return gstr1;
  }

  static async generateGSTR3B(tenantId: string, period: string): Promise<any> {
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const tenantOid = new mongoose.Types.ObjectId(tenantId);

    const AccountMove = mongoose.models.AccountMove || mongoose.model('AccountMove');

    // Outward supplies
    const outward = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'out_invoice', state: 'posted', invoice_date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, taxable: { $sum: '$amount_untaxed' }, igst: { $sum: 0 }, cgst: { $sum: { $divide: ['$amount_tax', 2] } }, sgst: { $sum: { $divide: ['$amount_tax', 2] } }, cess: { $sum: 0 } } },
    ]);

    // Inward supplies (ITC)
    const inward = await AccountMove.aggregate([
      { $match: { tenant_id: tenantOid, move_type: 'in_invoice', state: 'posted', invoice_date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, taxable: { $sum: '$amount_untaxed' }, igst: { $sum: 0 }, cgst: { $sum: { $divide: ['$amount_tax', 2] } }, sgst: { $sum: { $divide: ['$amount_tax', 2] } }, cess: { $sum: 0 } } },
    ]);

    const out = outward[0] || { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };
    const inp = inward[0] || { taxable: 0, igst: 0, cgst: 0, sgst: 0, cess: 0 };

    return {
      gstin: '',
      ret_period: `${String(month).padStart(2, '0')}${year}`,
      sup_details: {
        osup_det: { txval: Math.round(out.taxable * 100) / 100, iamt: Math.round(out.igst * 100) / 100, camt: Math.round(out.cgst * 100) / 100, samt: Math.round(out.sgst * 100) / 100, csamt: 0 },
        osup_zero: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_nil_exmp: { txval: 0 },
        isup_rev: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
        osup_nongst: { txval: 0 },
      },
      itc_elg: {
        itc_avl: [
          { ty: 'IMPG', iamt: 0, camt: 0, samt: 0, csamt: 0 },
          { ty: 'IMPS', iamt: 0, camt: 0, samt: 0, csamt: 0 },
          { ty: 'ISRC', iamt: 0, camt: 0, samt: 0, csamt: 0 },
          { ty: 'ISD', iamt: 0, camt: 0, samt: 0, csamt: 0 },
          { ty: 'OTH', iamt: Math.round(inp.igst * 100) / 100, camt: Math.round(inp.cgst * 100) / 100, samt: Math.round(inp.sgst * 100) / 100, csamt: 0 },
        ],
        itc_rev: [{ ty: 'RUL', iamt: 0, camt: 0, samt: 0, csamt: 0 }],
        itc_net: { iamt: Math.round(inp.igst * 100) / 100, camt: Math.round(inp.cgst * 100) / 100, samt: Math.round(inp.sgst * 100) / 100, csamt: 0 },
        itc_inelg: [{ ty: 'RUL', iamt: 0, camt: 0, samt: 0, csamt: 0 }],
      },
      intr_ltfee: { intr_details: { iamt: 0, camt: 0, samt: 0, csamt: 0 } },
      tax_pmt: {
        igst: Math.round(Math.max(0, out.igst - inp.igst) * 100) / 100,
        cgst: Math.round(Math.max(0, out.cgst - inp.cgst) * 100) / 100,
        sgst: Math.round(Math.max(0, out.sgst - inp.sgst) * 100) / 100,
        cess: 0,
      },
    };
  }
}
