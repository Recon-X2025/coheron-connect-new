import { PDFService } from '../pdfService.js';

export function renderQuotation(doc: PDFKit.PDFDocument, data: any, options: any) {
  let y = PDFService.drawHeader(doc, options);
  y = PDFService.drawDocTitle(doc, 'QUOTATION', data.quotation_number || '', data.date || '', y);
  PDFService.drawPartyInfo(doc, 'To:', data.customer || {}, 50, y + 5);
  if (data.validity_date) doc.fontSize(9).text('Valid Until: ' + data.validity_date, 400, y + 5);
  y += 100;
  const columns = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount'];
  const rows = (data.lines || []).map((l: any, i: number) => [String(i + 1), l.description || '', l.hsn_code || '', String(l.quantity || 0), Number(l.rate || 0).toFixed(2), Number(l.amount || 0).toFixed(2)]);
  y = PDFService.drawLineItems(doc, columns, rows, y);
  const totals = [{ label: 'Subtotal:', value: Number(data.subtotal || 0).toFixed(2) }, { label: 'Tax:', value: Number(data.tax || 0).toFixed(2) }, { label: 'Total:', value: Number(data.total || 0).toFixed(2), bold: true }];
  y = PDFService.drawTotals(doc, totals, y + 10);
  if (data.terms) { y += 20; doc.fontSize(9).font('Helvetica-Bold').text('Terms & Conditions:', 50, y); doc.font('Helvetica').text(data.terms, 50, y + 14, { width: 495 }); }
}
