import { PDFService } from '../pdfService.js';

export function renderInvoice(doc: PDFKit.PDFDocument, data: any, options: any) {
  let y = PDFService.drawHeader(doc, options);
  y = PDFService.drawDocTitle(doc, 'TAX INVOICE', data.invoice_number || '', data.date || '', y);
  const partyY = y + 5;
  PDFService.drawPartyInfo(doc, 'Bill To:', data.customer || {}, 50, partyY);
  if (data.ship_to) PDFService.drawPartyInfo(doc, 'Ship To:', data.ship_to, 300, partyY);
  y = partyY + 95;
  const columns = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount'];
  const rows = (data.lines || []).map((l: any, i: number) => [String(i + 1), l.description || '', l.hsn_code || '', String(l.quantity || 0), Number(l.rate || 0).toFixed(2), Number(l.amount || 0).toFixed(2)]);
  y = PDFService.drawLineItems(doc, columns, rows, y);
  const totals: any[] = [{ label: 'Subtotal:', value: Number(data.subtotal || 0).toFixed(2) }];
  if (data.cgst) totals.push({ label: 'CGST (' + (data.cgst_rate || '') + '%):', value: Number(data.cgst).toFixed(2) });
  if (data.sgst) totals.push({ label: 'SGST (' + (data.sgst_rate || '') + '%):', value: Number(data.sgst).toFixed(2) });
  if (data.igst) totals.push({ label: 'IGST (' + (data.igst_rate || '') + '%):', value: Number(data.igst).toFixed(2) });
  totals.push({ label: 'Total:', value: Number(data.total || 0).toFixed(2), bold: true });
  y = PDFService.drawTotals(doc, totals, y + 10);
  if (data.total) {
    doc.fontSize(9).font('Helvetica-Bold').text('Amount in Words:', 50, y + 10);
    doc.font('Helvetica').text(PDFService.numberToWords(data.total), 50, y + 24);
  }
  if (data.bank) {
    y += 50;
    doc.fontSize(9).font('Helvetica-Bold').text('Bank Details:', 50, y);
    doc.font('Helvetica');
    doc.text('Bank: ' + (data.bank.name || ''), 50, y + 14);
    doc.text('A/C No: ' + (data.bank.account || ''), 50, y + 28);
    doc.text('IFSC: ' + (data.bank.ifsc || ''), 50, y + 42);
  }
}
