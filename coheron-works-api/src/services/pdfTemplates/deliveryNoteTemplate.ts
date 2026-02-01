import { PDFService } from '../pdfService.js';

export function renderDeliveryNote(doc: PDFKit.PDFDocument, data: any, options: any) {
  let y = PDFService.drawHeader(doc, options);
  y = PDFService.drawDocTitle(doc, 'DELIVERY NOTE', data.dn_number || '', data.date || '', y);
  PDFService.drawPartyInfo(doc, 'Deliver To:', data.customer || {}, 50, y + 5);
  if (data.sale_order) doc.fontSize(9).text('Sale Order: ' + data.sale_order, 400, y + 5);
  y += 100;
  const columns = ['#', 'Description', 'HSN', 'Qty', 'UoM', 'Remarks'];
  const rows = (data.lines || []).map((l: any, i: number) => [String(i + 1), l.description || '', l.hsn_code || '', String(l.quantity || 0), l.uom || '', l.remarks || '']);
  PDFService.drawLineItems(doc, columns, rows, y);
}
