import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import { parse as json2csv } from 'json2csv';
import PDFDocument from 'pdfkit';
import logger from '../shared/utils/logger.js';

interface ReportConfig {
  title: string;
  module: string;
  collection: string;
  columns: Array<{ field: string; label: string; type?: 'string' | 'number' | 'date' | 'currency' }>;
  filters?: Record<string, any>;
  sort?: Record<string, 1 | -1>;
  limit?: number;
  tenantId: string;
}

export class ReportGenerationService {
  static async generateReport(config: ReportConfig, format: 'csv' | 'xlsx' | 'pdf'): Promise<Buffer> {
    const data = await ReportGenerationService.queryData(config);

    switch (format) {
      case 'csv': return ReportGenerationService.toCSV(data, config);
      case 'xlsx': return ReportGenerationService.toXLSX(data, config);
      case 'pdf': return ReportGenerationService.toPDF(data, config);
      default: throw new Error(`Unsupported format: ${format}`);
    }
  }

  private static async queryData(config: ReportConfig): Promise<any[]> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');

    const match: Record<string, any> = { tenant_id: new mongoose.Types.ObjectId(config.tenantId) };

    if (config.filters) {
      for (const [key, value] of Object.entries(config.filters)) {
        if (value === undefined || value === null || value === '') continue;
        if (key.endsWith('_from')) {
          const field = key.replace('_from', '');
          match[field] = { ...match[field], $gte: new Date(value) };
        } else if (key.endsWith('_to')) {
          const field = key.replace('_to', '');
          match[field] = { ...match[field], $lte: new Date(value) };
        } else {
          match[key] = value;
        }
      }
    }

    const projection: Record<string, 1> = {};
    config.columns.forEach(c => { projection[c.field] = 1; });

    return db.collection(config.collection)
      .find(match)
      .project(projection)
      .sort(config.sort || { created_at: -1 })
      .limit(config.limit || 10000)
      .toArray();
  }

  private static toCSV(data: any[], config: ReportConfig): Buffer {
    const fields = config.columns.map(c => ({ label: c.label, value: c.field }));
    const csv = json2csv(data, { fields });
    return Buffer.from(csv, 'utf-8');
  }

  private static async toXLSX(data: any[], config: ReportConfig): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(config.title || 'Report');

    // Header row
    sheet.columns = config.columns.map(c => ({
      header: c.label,
      key: c.field,
      width: c.type === 'date' ? 14 : c.type === 'currency' ? 16 : 20,
    }));

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00C971' } };

    // Data rows
    for (const row of data) {
      const rowData: Record<string, any> = {};
      for (const col of config.columns) {
        let val = col.field.split('.').reduce((o: any, k: string) => o?.[k], row);
        if (col.type === 'date' && val) val = new Date(val);
        if (col.type === 'currency' && typeof val === 'number') val = Math.round(val * 100) / 100;
        rowData[col.field] = val;
      }
      sheet.addRow(rowData);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private static toPDF(data: any[], config: ReportConfig): Buffer {
    return new Promise<Buffer>((resolve) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      // Title
      doc.fontSize(16).font('Helvetica-Bold').text(config.title || 'Report', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()} | Rows: ${data.length}`, { align: 'center' });
      doc.moveDown();

      // Table header
      const colWidth = (doc.page.width - 60) / config.columns.length;
      let x = 30;
      doc.fontSize(8).font('Helvetica-Bold');
      for (const col of config.columns) {
        doc.text(col.label, x, doc.y, { width: colWidth, continued: false });
        x += colWidth;
      }
      doc.moveDown(0.5);

      // Table rows
      doc.font('Helvetica').fontSize(7);
      for (const row of data.slice(0, 500)) { // Limit PDF rows
        x = 30;
        const y = doc.y;
        if (y > doc.page.height - 50) { doc.addPage(); }
        for (const col of config.columns) {
          let val = col.field.split('.').reduce((o: any, k: string) => o?.[k], row);
          if (col.type === 'date' && val) val = new Date(val).toLocaleDateString();
          if (col.type === 'currency' && typeof val === 'number') val = '\u20B9' + val.toLocaleString('en-IN');
          doc.text(String(val ?? ''), x, y, { width: colWidth });
          x += colWidth;
        }
        doc.moveDown(0.3);
      }

      doc.end();
    }) as any;
  }
}
