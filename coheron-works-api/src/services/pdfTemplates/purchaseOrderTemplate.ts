import { PDFService } from '../pdfService.js';

export function renderPurchaseOrder(doc: PDFKit.PDFDocument, data: any, options: any) {
  let y = PDFService.drawHeader(doc, options);
  y = PDFService.drawDocTitle(doc, 'PURCHASE ORDER', data.po_number || '', data.date || '', y);
  PDFService.drawPartyInfo(doc, 'Vendor:', data.vendor || {}, 50, y + 5);
  y += 100;
  const columns = ['#', 'Description', 'HSN', 'Qty', 'Rate', 'Amount'];
  const rows = (data.lines || []).map((l: any, i: number) => [String(i + 1), l.description || '', l.hsn_code || '', String(l.quantity || 0), Number(l.rate || 0).toFixed(2), Number(l.amount || 0).toFixed(2)]);
  y = PDFService.drawLineItems(doc, columns, rows, y);
  const totals = [{ label: 'Subtotal:', value: Number(data.subtotal || 0).toFixed(2) }, { label: 'Tax:', value: Number(data.tax || 0).toFixed(2) }, { label: 'Total:', value: Number(data.total || 0).toFixed(2), bold: true }];
  PDFService.drawTotals(doc, totals, y + 10);
}
