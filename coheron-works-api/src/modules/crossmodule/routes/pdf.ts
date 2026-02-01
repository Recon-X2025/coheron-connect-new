import { Router } from 'express';
import { asyncHandler } from '../../../shared/middleware/asyncHandler.js';
import pdfService from '../../../services/pdfService.js';
import { renderInvoice } from '../../../services/pdfTemplates/invoiceTemplate.js';
import { renderQuotation } from '../../../services/pdfTemplates/quotationTemplate.js';
import { renderPurchaseOrder } from '../../../services/pdfTemplates/purchaseOrderTemplate.js';
import { renderPayslip } from '../../../services/pdfTemplates/payslipTemplate.js';
import { renderDeliveryNote } from '../../../services/pdfTemplates/deliveryNoteTemplate.js';
import Invoice from '../../../models/Invoice.js';
import Quotation from '../../../models/Quotation.js';
import PurchaseOrder from '../../../models/PurchaseOrder.js';

const router = Router();

function getCompanyOptions(req: any) {
  return { companyName: req.user?.company_name || 'Company', companyAddress: '', companyGST: '', companyPhone: '', companyEmail: '' };
}

router.get('/invoice/:id', asyncHandler(async (req: any, res) => {
  const invoice = await Invoice.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('partner_id');
  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
  const inv: any = invoice.toObject();
  const data = {
    invoice_number: inv.invoice_number || inv.name || '',
    date: inv.date ? new Date(inv.date).toLocaleDateString() : '',
    customer: { name: inv.partner_id?.name || '', address: inv.partner_id?.address || '', gst: inv.partner_id?.gst_number || '' },
    lines: (inv.line_items || []).map((l: any) => ({ description: l.description || l.product_name || '', hsn_code: l.hsn_code || '', quantity: l.quantity, rate: l.unit_price || l.rate, amount: l.total || l.amount })),
    subtotal: inv.subtotal || inv.amount_untaxed || 0,
    cgst: inv.cgst_amount, cgst_rate: inv.cgst_rate, sgst: inv.sgst_amount, sgst_rate: inv.sgst_rate, igst: inv.igst_amount, igst_rate: inv.igst_rate,
    total: inv.total || inv.amount_total || 0,
  };
  const options = getCompanyOptions(req);
  const buffer = await pdfService.generatePDF((doc) => renderInvoice(doc, data, options), options);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="' + (data.invoice_number || 'invoice') + '.pdf"');
  res.send(buffer);
}));

router.get('/quotation/:id', asyncHandler(async (req: any, res) => {
  const quotation = await Quotation.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('partner_id');
  if (!quotation) return res.status(404).json({ error: 'Quotation not found' });
  const q: any = quotation.toObject();
  const data = {
    quotation_number: q.quotation_number || '',
    date: q.date ? new Date(q.date).toLocaleDateString() : '',
    validity_date: q.validity_date ? new Date(q.validity_date).toLocaleDateString() : '',
    customer: { name: q.partner_id?.name || '' },
    lines: (q.lines || []).map((l: any) => ({ description: l.description || l.product_name || '', hsn_code: l.hsn_code || '', quantity: l.quantity, rate: l.unit_price, amount: l.subtotal })),
    subtotal: q.amount_untaxed || 0, tax: q.amount_tax || 0, total: q.amount_total || 0,
    terms: q.terms || '',
  };
  const options = getCompanyOptions(req);
  const buffer = await pdfService.generatePDF((doc) => renderQuotation(doc, data, options), options);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="' + (data.quotation_number || 'quotation') + '.pdf"');
  res.send(buffer);
}));

router.get('/purchase-order/:id', asyncHandler(async (req: any, res) => {
  const po = await PurchaseOrder.findOne({ _id: req.params.id, tenant_id: req.user.tenant_id }).populate('vendor_id');
  if (!po) return res.status(404).json({ error: 'PO not found' });
  const p: any = po.toObject();
  const data = {
    po_number: p.po_number || '',
    date: p.date ? new Date(p.date).toLocaleDateString() : '',
    vendor: { name: p.vendor_id?.name || '' },
    lines: (p.lines || []).map((l: any) => ({ description: l.description || l.product_name || '', hsn_code: l.hsn_code || '', quantity: l.quantity, rate: l.unit_price, amount: l.subtotal })),
    subtotal: p.amount_untaxed || 0, tax: p.amount_tax || 0, total: p.amount_total || 0,
  };
  const options = getCompanyOptions(req);
  const buffer = await pdfService.generatePDF((doc) => renderPurchaseOrder(doc, data, options), options);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="' + (data.po_number || 'po') + '.pdf"');
  res.send(buffer);
}));

export default router;
