import mongoose from 'mongoose';
import logger from '../../shared/utils/logger.js';
import axios from 'axios';

export class EInvoiceService {
  private static NIC_BASE = process.env.EINVOICE_API_URL || 'https://einv-apisandbox.nic.in';

  static async generateIRN(tenantId: string, invoiceId: string): Promise<any> {
    const AccountMove = mongoose.models.AccountMove || mongoose.model('AccountMove');
    const invoice = await AccountMove.findOne({ _id: invoiceId, tenant_id: tenantId }).populate('partner_id').lean() as any;
    if (!invoice) throw new Error('Invoice not found');
    if (invoice.irn) throw new Error('IRN already generated for this invoice');

    const partner = invoice.partner_id || {};
    const taxableValue = invoice.amount_untaxed || (invoice.amount_total - (invoice.amount_tax || 0));

    // Build NIC-compliant e-invoice JSON
    const einvoiceJson = {
      Version: '1.1',
      TranDtls: {
        TaxSch: 'GST',
        SupTyp: 'B2B',
        RegRev: 'N',
        IgstOnIntra: 'N',
      },
      DocDtls: {
        Typ: invoice.move_type === 'out_refund' ? 'CRN' : 'INV',
        No: invoice.name || invoice.number,
        Dt: new Date(invoice.invoice_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      },
      SellerDtls: {
        Gstin: process.env.COMPANY_GSTIN || '',
        LglNm: process.env.COMPANY_NAME || 'Coheron ERP User',
        Addr1: process.env.COMPANY_ADDRESS || '',
        Loc: process.env.COMPANY_CITY || '',
        Pin: parseInt(process.env.COMPANY_PIN || '560001'),
        Stcd: process.env.COMPANY_STATE_CODE || '29',
      },
      BuyerDtls: {
        Gstin: partner.gstin || partner.vat || 'URP',
        LglNm: partner.name || '',
        Addr1: partner.street || partner.address || '',
        Loc: partner.city || '',
        Pin: parseInt(partner.zip || partner.pincode || '0'),
        Stcd: partner.state_code || '',
        Pos: partner.state_code || '',
      },
      ItemList: (invoice.invoice_line_ids || []).map((line: any, idx: number) => ({
        SlNo: String(idx + 1),
        PrdDesc: line.name || line.product_name || 'Item',
        IsServc: 'N',
        HsnCd: line.hsn_code || '99',
        Qty: line.quantity || 1,
        Unit: line.uom || 'NOS',
        UnitPrice: line.price_unit || 0,
        TotAmt: (line.quantity || 1) * (line.price_unit || 0),
        Discount: line.discount || 0,
        AssAmt: line.price_subtotal || (line.quantity || 1) * (line.price_unit || 0),
        GstRt: line.tax_rate || 18,
        CgstAmt: (line.tax_amount || 0) / 2,
        SgstAmt: (line.tax_amount || 0) / 2,
        IgstAmt: 0,
        CesRt: 0,
        CesAmt: 0,
        TotItemVal: line.price_total || line.price_subtotal || 0,
      })),
      ValDtls: {
        AssVal: Math.round(taxableValue * 100) / 100,
        CgstVal: Math.round((invoice.amount_tax || 0) / 2 * 100) / 100,
        SgstVal: Math.round((invoice.amount_tax || 0) / 2 * 100) / 100,
        IgstVal: 0,
        CesVal: 0,
        Discount: 0,
        TotInvVal: Math.round(invoice.amount_total * 100) / 100,
      },
    };

    // Call NIC IRP API (sandbox or production)
    let irn = '';
    let signedQr = '';
    try {
      const authToken = process.env.EINVOICE_AUTH_TOKEN || '';
      if (authToken) {
        const resp = await axios.post(`${EInvoiceService.NIC_BASE}/eicore/v1.03/Invoice`, einvoiceJson, {
          headers: {
            'Content-Type': 'application/json',
            'gstin': process.env.COMPANY_GSTIN || '',
            'Authorization': `Bearer ${authToken}`,
          },
        });
        irn = resp.data?.Irn || resp.data?.irn || '';
        signedQr = resp.data?.SignedQRCode || resp.data?.signed_qr_code || '';
      } else {
        // Generate local reference for testing
        irn = `IRN-${Date.now()}-${invoiceId.toString().slice(-6)}`;
        signedQr = `QR-${irn}`;
        logger.warn('EINVOICE_AUTH_TOKEN not set, using test IRN');
      }
    } catch (err: any) {
      logger.error({ err: err.message, invoiceId }, 'NIC IRP API call failed');
      throw new Error(`E-invoice generation failed: ${err.response?.data?.message || err.message}`);
    }

    // Store IRN on invoice
    await AccountMove.updateOne({ _id: invoiceId }, {
      irn,
      irn_date: new Date(),
      signed_qr_code: signedQr,
      einvoice_json: einvoiceJson,
    });

    logger.info({ invoiceId, irn }, 'E-invoice IRN generated');
    return { irn, irn_date: new Date(), signed_qr_code: signedQr, einvoice_json: einvoiceJson };
  }

  static async cancelIRN(tenantId: string, invoiceId: string, reason: string): Promise<any> {
    const AccountMove = mongoose.models.AccountMove || mongoose.model('AccountMove');
    const invoice = await AccountMove.findOne({ _id: invoiceId, tenant_id: tenantId }).lean() as any;
    if (!invoice?.irn) throw new Error('No IRN found on this invoice');

    // In production: call NIC cancel API
    await AccountMove.updateOne({ _id: invoiceId }, {
      irn_cancelled: true,
      irn_cancel_date: new Date(),
      irn_cancel_reason: reason,
    });

    logger.info({ invoiceId, irn: invoice.irn }, 'IRN cancelled');
    return { success: true, irn: invoice.irn, cancelled_at: new Date() };
  }
}
