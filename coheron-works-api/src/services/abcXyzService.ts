import mongoose from 'mongoose';

export class ABCXYZService {
  async analyze(tenantId: string, months: number = 12): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Database not connected');
    const tid = new mongoose.Types.ObjectId(tenantId);
    const since = new Date(Date.now() - months * 30 * 86400000);
    // Get consumption data from sale order lines
    const consumption = await db.collection('sale_orders').aggregate([
      { $match: { tenant_id: tid, date_order: { $gte: since }, state: { $in: ['sale', 'done'] } } },
      { $unwind: '$order_line' },
      { $group: { _id: '$order_line.product_id', total_value: { $sum: '$order_line.price_subtotal' }, total_qty: { $sum: '$order_line.product_uom_qty' }, order_count: { $sum: 1 } } },
      { $sort: { total_value: -1 } },
    ]).toArray();
    const totalValue = consumption.reduce((s, c) => s + c.total_value, 0);
    // ABC classification
    let cumValue = 0;
    const classified = consumption.map(c => {
      cumValue += c.total_value;
      const cumPercent = totalValue > 0 ? (cumValue / totalValue) * 100 : 0;
      let abc: string;
      if (cumPercent <= 80) abc = 'A';
      else if (cumPercent <= 95) abc = 'B';
      else abc = 'C';
      return { product_id: c._id, total_value: Math.round(c.total_value * 100) / 100, total_qty: c.total_qty, order_count: c.order_count, abc_class: abc, value_percent: totalValue > 0 ? Math.round((c.total_value / totalValue) * 10000) / 100 : 0 };
    });
    // XYZ: get monthly data for coefficient of variation
    const monthlyData = await db.collection('sale_orders').aggregate([
      { $match: { tenant_id: tid, date_order: { $gte: since }, state: { $in: ['sale', 'done'] } } },
      { $unwind: '$order_line' },
      { $group: { _id: { product_id: '$order_line.product_id', month: { $dateToString: { format: '%Y-%m', date: '$date_order' } } }, qty: { $sum: '$order_line.product_uom_qty' } } },
    ]).toArray();
    const productMonthly = new Map<string, number[]>();
    for (const m of monthlyData) {
      const pid = m._id.product_id?.toString();
      if (!pid) continue;
      if (!productMonthly.has(pid)) productMonthly.set(pid, []);
      productMonthly.get(pid)!.push(m.qty);
    }
    return classified.map(c => {
      const monthly = productMonthly.get(c.product_id?.toString()) || [];
      const mean = monthly.length > 0 ? monthly.reduce((a, b) => a + b, 0) / monthly.length : 0;
      const variance = monthly.length > 1 ? monthly.reduce((s, v) => s + (v - mean) ** 2, 0) / (monthly.length - 1) : 0;
      const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
      let xyz: string;
      if (cv <= 0.5) xyz = 'X';
      else if (cv <= 1.0) xyz = 'Y';
      else xyz = 'Z';
      return { ...c, xyz_class: xyz, coefficient_of_variation: Math.round(cv * 100) / 100, combined_class: c.abc_class + xyz };
    });
  }
}
export const abcXyzService = new ABCXYZService();
export default abcXyzService;
