import mongoose from 'mongoose';

interface AgingBucket { current: number; days_1_30: number; days_31_60: number; days_61_90: number; days_91_120: number; days_120_plus: number; total: number; }

export class AgingReportService {
  async getARAgingReport(tenantId: string): Promise<Array<{ partner_id: string; partner_name: string; buckets: AgingBucket }>> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const invoices = await db.collection('invoices').find({ tenant_id: tid, status: { $nin: ['paid', 'cancelled'] } }).toArray();
    const now = Date.now();
    const partnerMap = new Map<string, AgingBucket & { name: string }>();
    for (const inv of invoices) {
      const residual = (inv.amount_total || 0) - (inv.amount_paid || 0);
      if (residual <= 0) continue;
      const pid = inv.partner_id?.toString() || 'unknown';
      if (!partnerMap.has(pid)) partnerMap.set(pid, { name: '', current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_91_120: 0, days_120_plus: 0, total: 0 });
      const b = partnerMap.get(pid)!;
      const dueDate = inv.due_date ? new Date(inv.due_date).getTime() : new Date(inv.date).getTime() + 30*86400000;
      const overdueDays = Math.max(0, Math.floor((now - dueDate) / 86400000));
      if (overdueDays <= 0) b.current += residual;
      else if (overdueDays <= 30) b.days_1_30 += residual;
      else if (overdueDays <= 60) b.days_31_60 += residual;
      else if (overdueDays <= 90) b.days_61_90 += residual;
      else if (overdueDays <= 120) b.days_91_120 += residual;
      else b.days_120_plus += residual;
      b.total += residual;
    }
    // Resolve partner names
    const partnerIds = Array.from(partnerMap.keys()).filter(id => id !== 'unknown').map(id => new mongoose.Types.ObjectId(id));
    const partners = await db.collection('partners').find({ _id: { $in: partnerIds } }).toArray();
    const nameMap = new Map(partners.map(p => [p._id.toString(), p.name]));
    return Array.from(partnerMap.entries()).map(([pid, b]) => ({ partner_id: pid, partner_name: nameMap.get(pid) || 'Unknown', buckets: { current: b.current, days_1_30: b.days_1_30, days_31_60: b.days_31_60, days_61_90: b.days_61_90, days_91_120: b.days_91_120, days_120_plus: b.days_120_plus, total: b.total } }));
  }

  async getAPAgingReport(tenantId: string): Promise<any[]> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const bills = await db.collection('vendor_bills').find({ tenant_id: tid, status: { $nin: ['paid', 'cancelled'] } }).toArray();
    const now = Date.now();
    const vendorMap = new Map<string, AgingBucket>();
    for (const bill of bills) {
      const residual = (bill.amount_total || 0) - (bill.amount_paid || 0);
      if (residual <= 0) continue;
      const vid = bill.vendor_id?.toString() || 'unknown';
      if (!vendorMap.has(vid)) vendorMap.set(vid, { current: 0, days_1_30: 0, days_31_60: 0, days_61_90: 0, days_91_120: 0, days_120_plus: 0, total: 0 });
      const b = vendorMap.get(vid)!;
      const dueDate = bill.due_date ? new Date(bill.due_date).getTime() : new Date(bill.date).getTime() + 30*86400000;
      const days = Math.max(0, Math.floor((now - dueDate) / 86400000));
      if (days <= 0) b.current += residual;
      else if (days <= 30) b.days_1_30 += residual;
      else if (days <= 60) b.days_31_60 += residual;
      else if (days <= 90) b.days_61_90 += residual;
      else if (days <= 120) b.days_91_120 += residual;
      else b.days_120_plus += residual;
      b.total += residual;
    }
    return Array.from(vendorMap.entries()).map(([vid, b]) => ({ vendor_id: vid, buckets: b }));
  }
}
export const agingReportService = new AgingReportService();
export default agingReportService;
