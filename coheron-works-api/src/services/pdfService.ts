import PDFDocument from 'pdfkit';

interface PDFOptions {
  title?: string;
  companyName?: string;
  companyAddress?: string;
  companyGST?: string;
  companyPhone?: string;
  companyEmail?: string;
}

export class PDFService {
  generatePDF(renderFn: (doc: PDFKit.PDFDocument, options: PDFOptions) => void, options: PDFOptions = {}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      try { renderFn(doc, options); doc.end(); } catch (err) { reject(err); }
    });
  }

  static drawHeader(doc: PDFKit.PDFDocument, options: PDFOptions) {
    doc.fontSize(20).font('Helvetica-Bold').text(options.companyName || 'Company', 50, 50);
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    let y = 75;
    if (options.companyAddress) { doc.text(options.companyAddress, 50, y); y += 14; }
    if (options.companyGST) { doc.text('GSTIN: ' + options.companyGST, 50, y); y += 14; }
    if (options.companyPhone) { doc.text('Phone: ' + options.companyPhone, 50, y); y += 14; }
    if (options.companyEmail) { doc.text('Email: ' + options.companyEmail, 50, y); y += 14; }
    doc.fillColor('#000000');
    return y + 10;
  }

  static drawDocTitle(doc: PDFKit.PDFDocument, title: string, docNumber: string, date: string, y: number) {
    doc.fontSize(16).font('Helvetica-Bold').text(title, 50, y);
    doc.fontSize(10).font('Helvetica').text('No: ' + docNumber, 400, y);
    doc.text('Date: ' + date, 400, y + 15);
    doc.moveTo(50, y + 35).lineTo(545, y + 35).stroke('#cccccc');
    return y + 45;
  }

  static drawPartyInfo(doc: PDFKit.PDFDocument, label: string, party: any, x: number, y: number) {
    doc.fontSize(9).font('Helvetica-Bold').text(label, x, y);
    doc.font('Helvetica').fontSize(10).text(party.name || '', x, y + 15);
    doc.fontSize(9);
    if (party.address) doc.text(party.address, x, y + 30);
    if (party.gst) doc.text('GSTIN: ' + party.gst, x, y + 55);
    return y + 90;
  }

  static drawLineItems(doc: PDFKit.PDFDocument, columns: string[], rows: string[][], startY: number) {
    const colWidths = [30, 180, 50, 70, 70, 95];
    const tableWidth = 495;
    let y = startY;
    doc.rect(50, y, tableWidth, 22).fill('#f0f0f0');
    doc.fillColor('#000000').fontSize(8).font('Helvetica-Bold');
    let x = 55;
    columns.forEach((col, i) => { doc.text(col, x, y + 6, { width: colWidths[i], align: i > 1 ? 'right' : 'left' }); x += colWidths[i]; });
    y += 25;
    doc.font('Helvetica').fontSize(8);
    rows.forEach((row, ri) => {
      if (y > 720) { doc.addPage(); y = 50; }
      const bg = ri % 2 === 0 ? '#ffffff' : '#fafafa';
      doc.rect(50, y - 2, tableWidth, 18).fill(bg).fillColor('#000000');
      x = 55;
      row.forEach((cell, i) => { doc.text(cell, x, y + 2, { width: colWidths[i], align: i > 1 ? 'right' : 'left' }); x += colWidths[i]; });
      y += 18;
    });
    doc.moveTo(50, y).lineTo(545, y).stroke('#cccccc');
    return y + 5;
  }

  static drawTotals(doc: PDFKit.PDFDocument, totals: Array<{ label: string; value: string; bold?: boolean }>, y: number) {
    totals.forEach(t => {
      if (t.bold) doc.font('Helvetica-Bold').fontSize(11); else doc.font('Helvetica').fontSize(9);
      doc.text(t.label, 350, y, { width: 100, align: 'right' });
      doc.text(t.value, 460, y, { width: 85, align: 'right' });
      y += t.bold ? 20 : 16;
    });
    return y;
  }

  static numberToWords(num: number): string {
    if (num === 0) return 'Zero';
    const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
    const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
    const convert = (n: number): string => {
      if (n < 20) return ones[n];
      if (n < 100) return tens[Math.floor(n/10)] + (n%10 ? ' ' + ones[n%10] : '');
      if (n < 1000) return ones[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and ' + convert(n%100) : '');
      if (n < 100000) return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' ' + convert(n%1000) : '');
      if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' ' + convert(n%100000) : '');
      return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' ' + convert(n%10000000) : '');
    };
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let result = convert(rupees) + ' Rupees';
    if (paise > 0) result += ' and ' + convert(paise) + ' Paise';
    return result + ' Only';
  }
}

export const pdfService = new PDFService();
export default pdfService;
