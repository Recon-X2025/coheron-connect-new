import mongoose from 'mongoose';

export class DataImportExportService {
  async importCSV(tenantId: string, entity: string, csvData: string): Promise<{ imported: number; errors: string[] }> {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new Error('CSV must have header + at least 1 row');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'));
    const rows: any[] = [];
    const errors: string[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) { errors.push('Row ' + (i+1) + ': column count mismatch'); continue; }
      const row: any = { tenant_id: new mongoose.Types.ObjectId(tenantId) };
      headers.forEach((h, j) => { if (values[j]) row[h] = values[j]; });
      row.created_at = new Date(); row.updated_at = new Date();
      rows.push(row);
    }
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    const collection = this.getCollectionName(entity);
    if (rows.length) await db.collection(collection).insertMany(rows);
    return { imported: rows.length, errors };
  }

  async exportCSV(tenantId: string, entity: string, filters?: Record<string, any>): Promise<string> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('DB not connected');
    const collection = this.getCollectionName(entity);
    const query: any = { tenant_id: new mongoose.Types.ObjectId(tenantId), ...filters };
    const docs = await db.collection(collection).find(query).limit(10000).toArray();
    if (!docs.length) return '';
    const exclude = new Set(['_id', 'tenant_id', '__v']);
    const keys = Object.keys(docs[0]).filter(k => !exclude.has(k));
    const header = keys.join(',');
    const rows = docs.map(d => keys.map(k => { const v = d[k]; if (v === null || v === undefined) return ''; const s = String(v); return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(','));
    return [header, ...rows].join('\n');
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []; let current = ''; let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
      else { current += ch; }
    }
    result.push(current.trim());
    return result;
  }

  private getCollectionName(entity: string): string {
    const map: Record<string, string> = { partners: 'partners', products: 'products', employees: 'employees', chart_of_accounts: 'chart_of_accounts', leads: 'leads', invoices: 'invoices' };
    return map[entity] || entity;
  }
}
export const dataImportExportService = new DataImportExportService();
export default dataImportExportService;
