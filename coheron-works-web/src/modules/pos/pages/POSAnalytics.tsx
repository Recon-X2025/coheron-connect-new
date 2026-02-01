import React, { useState, useEffect, FC } from 'react';
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Users, Store } from 'lucide-react';

const API = '/api/pos/analytics';

const sCard: React.CSSProperties = { background: '#141414', borderRadius: 12, border: '1px solid #222', padding: 24 };
const sKpi: React.CSSProperties = { ...sCard, textAlign: 'center' as const };

const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(2)}`;

export const POSAnalytics: FC = () => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [productMix, setProductMix] = useState<any[]>([]);
  const [cashierPerf, setCashierPerf] = useState<any[]>([]);
  const [comparison, setComparison] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'products' | 'cashiers' | 'stores'>('overview');

  useEffect(() => { fetch(`${API}/dashboard`).then(r => r.json()).then(setDashboard).catch(() => {}); }, []);
  useEffect(() => { if (tab === 'products') fetch(`${API}/product-mix`).then(r => r.json()).then(setProductMix).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'cashiers') fetch(`${API}/cashier-performance`).then(r => r.json()).then(setCashierPerf).catch(() => {}); }, [tab]);
  useEffect(() => { if (tab === 'stores') fetch(`${API}/comparison`).then(r => r.json()).then(setComparison).catch(() => {}); }, [tab]);

  const maxHourly = dashboard ? Math.max(...(dashboard.sales_by_hour || []).map((h: any) => h.amount), 1) : 1;
  const maxMethod = dashboard ? Math.max(...(dashboard.payment_method_breakdown || []).map((m: any) => m.amount), 1) : 1;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'products', label: 'Product Mix', icon: ShoppingCart },
    { key: 'cashiers', label: 'Cashier Performance', icon: Users },
    { key: 'stores', label: 'Store Comparison', icon: Store },
  ] as const;

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}><BarChart3 size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: '#00C971' }} />POS Analytics</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: tab === t.key ? '#00C971' : '#1a1a1a', color: tab === t.key ? '#000' : '#aaa', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <t.icon size={16} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && dashboard && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={sKpi}>
              <DollarSign size={24} color="#00C971" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(dashboard.total_sales)}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Today's Sales</div>
            </div>
            <div style={sKpi}>
              <ShoppingCart size={24} color="#3b82f6" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>{dashboard.total_transactions}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Transactions</div>
            </div>
            <div style={sKpi}>
              <TrendingUp size={24} color="#f59e0b" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(dashboard.avg_transaction_value)}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Avg Value</div>
            </div>
            <div style={sKpi}>
              <DollarSign size={24} color="#a855f7" style={{ marginBottom: 8 }} />
              <div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(dashboard.total_tips)}</div>
              <div style={{ fontSize: 13, color: '#888' }}>Tips</div>
            </div>
          </div>

          {/* Hourly Sales Bar Chart */}
          <div style={{ ...sCard, marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Sales by Hour</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 160 }}>
              {(dashboard.sales_by_hour || []).map((h: any) => (
                <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: '100%', background: h.amount > 0 ? '#00C971' : '#222', borderRadius: '4px 4px 0 0', height: Math.max(2, (h.amount / maxHourly) * 140), transition: 'height 0.3s' }} />
                  <span style={{ fontSize: 9, color: '#666', marginTop: 4 }}>{h.hour}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment Method Breakdown */}
          <div style={sCard}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Payment Methods</h3>
            {(dashboard.payment_method_breakdown || []).map((m: any) => (
              <div key={m.method} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ textTransform: 'capitalize', fontSize: 14 }}>{m.method}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>{fmt(m.amount)} ({m.count} txns)</span>
                </div>
                <div style={{ background: '#222', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                  <div style={{ background: '#00C971', height: '100%', width: `${(m.amount / maxMethod) * 100}%`, borderRadius: 4, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'products' && (
        <div style={sCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Top Products</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>
                <th style={{ padding: 8, textAlign: 'left' }}>#</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Product</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Qty Sold</th>
                <th style={{ padding: 8, textAlign: 'right' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {productMix.slice(0, 20).map((p: any, i: number) => (
                <tr key={p.product_id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: 8, color: '#888' }}>{i + 1}</td>
                  <td style={{ padding: 8 }}>{p.name}</td>
                  <td style={{ padding: 8, textAlign: 'right' }}>{p.quantity}</td>
                  <td style={{ padding: 8, textAlign: 'right', fontWeight: 600, color: '#00C971' }}>{fmt(p.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'cashiers' && (
        <div style={sCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Cashier Leaderboard</h3>
          {cashierPerf.map((c: any, i: number) => (
            <div key={c._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: i < 3 ? '#00C971' : '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: i < 3 ? '#000' : '#888' }}>{i + 1}</span>
                <span>{c._id || 'Unknown'}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 600 }}>{fmt(c.total_sales)}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{c.transactions} txns | {fmt(c.total_tips)} tips</div>
              </div>
            </div>
          ))}
          {cashierPerf.length === 0 && <p style={{ color: '#888' }}>No cashier data available.</p>}
        </div>
      )}

      {tab === 'stores' && (
        <div style={sCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Store Comparison</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
            {comparison.map((s: any) => (
              <div key={s._id} style={{ background: '#1a1a1a', borderRadius: 8, padding: 20, textAlign: 'center' }}>
                <Store size={24} color="#00C971" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, color: '#888', marginBottom: 8 }}>{s._id || 'All Stores'}</div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>{fmt(s.total_sales)}</div>
                <div style={{ fontSize: 13, color: '#888' }}>{s.total_transactions} txns | {s.items_sold} items | {s.days} days</div>
              </div>
            ))}
          </div>
          {comparison.length === 0 && <p style={{ color: '#888' }}>No store data available.</p>}
        </div>
      )}
    </div>
  );
};

export default POSAnalytics;
