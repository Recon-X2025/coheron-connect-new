import { PDFService } from '../pdfService.js';

export function renderPayslip(doc: PDFKit.PDFDocument, data: any, options: any) {
  let y = PDFService.drawHeader(doc, options);
  y = PDFService.drawDocTitle(doc, 'PAYSLIP', data.payslip_number || '', data.month || '', y);
  doc.fontSize(10).font('Helvetica-Bold').text('Employee Details', 50, y);
  y += 18;
  doc.font('Helvetica').fontSize(9);
  const info: [string, any][] = [['Name', data.employee_name], ['Employee ID', data.employee_id], ['Department', data.department], ['Designation', data.designation], ['PAN', data.pan], ['Bank A/C', data.bank_account]];
  info.forEach(([label, value]) => { if (value) { doc.text(label + ': ' + value, 50, y); y += 14; } });
  y += 10;
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Earnings', 50, y); doc.text('Deductions', 300, y);
  y += 18;
  doc.font('Helvetica').fontSize(9);
  const maxLen = Math.max((data.earnings || []).length, (data.deductions || []).length);
  for (let i = 0; i < maxLen; i++) {
    const e = (data.earnings || [])[i];
    const d = (data.deductions || [])[i];
    if (e) { doc.text(e.label, 50, y); doc.text(Number(e.amount).toFixed(2), 200, y, { width: 80, align: 'right' }); }
    if (d) { doc.text(d.label, 300, y); doc.text(Number(d.amount).toFixed(2), 450, y, { width: 80, align: 'right' }); }
    y += 16;
  }
  y += 5;
  doc.moveTo(50, y).lineTo(545, y).stroke('#cccccc');
  y += 8;
  doc.font('Helvetica-Bold');
  doc.text('Gross Earnings', 50, y); doc.text(Number(data.gross || 0).toFixed(2), 200, y, { width: 80, align: 'right' });
  doc.text('Total Deductions', 300, y); doc.text(Number(data.total_deductions || 0).toFixed(2), 450, y, { width: 80, align: 'right' });
  y += 25;
  doc.fontSize(12).text('Net Pay:', 300, y);
  doc.text(Number(data.net_pay || 0).toFixed(2), 450, y, { width: 80, align: 'right' });
  if (data.net_pay) { y += 30; doc.fontSize(9).font('Helvetica').text('Amount in Words: ' + PDFService.numberToWords(data.net_pay), 50, y); }
}
