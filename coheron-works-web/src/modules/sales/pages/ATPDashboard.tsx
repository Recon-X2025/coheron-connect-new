import { useState, useEffect } from 'react';
import { Package, Search, Calendar, Warehouse, TrendingUp, Clock, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const API_BASE = '/api/sales/atp';
const getToken = () => localStorage.getItem('token') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const cardStyle: React.CSSProperties = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };
const inputStyle: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', width: '100%', fontSize: 14 };
const btnPrimary: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 };

export const ATPDashboard: React.FC = () => {
  const [checkForm, setCheckForm] = useState({ product_id: '', quantity: 1, requested_date: new Date().toISOString().split('T')[0] });
  const [result, setResult] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecords = async () => {
    try {
      const data = await apiFetch('?limit=50');
      setRecords(data.items || []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadRecords(); }, []);

  const handleCheck = async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/check', { method: 'POST', body: JSON.stringify(checkForm) });
      setResult(data);
      // Load timeline for this product
      const tl = await apiFetch(`/timeline/${checkForm.product_id}?days=60`);
      setTimeline(tl || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleReserve = async (warehouseId: string) => {
    try {
      await apiFetch('/reserve', { method: 'POST', body: JSON.stringify({ product_id: checkForm.product_id, warehouse_id: warehouseId, quantity: checkForm.quantity }) });
      handleCheck();
      loadRecords();
    } catch (e) { console.error(e); }
  };

  const maxAvail = Math.max(...timeline.map(t => t.total_available || 0), 1);

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Package size={28} color="#00C971" /> Available-to-Promise (ATP)
        </h1>
        <p style={{ color: '#888', margin: '4px 0 0' }}>Real-time stock availability checks, reservations, and future availability planning</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, marginBottom: 24 }}>
        {/* Check Form */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Search size={18} color="#00C971" /> ATP Check
          </h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Product ID</label>
            <input style={inputStyle} value={checkForm.product_id} onChange={e => setCheckForm({ ...checkForm, product_id: e.target.value })} placeholder="Enter product ID" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Quantity</label>
            <input style={inputStyle} type="number" value={checkForm.quantity} onChange={e => setCheckForm({ ...checkForm, quantity: Number(e.target.value) })} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: '#888', fontSize: 12, display: 'block', marginBottom: 4 }}>Requested Date</label>
            <input style={inputStyle} type="date" value={checkForm.requested_date} onChange={e => setCheckForm({ ...checkForm, requested_date: e.target.value })} />
          </div>
          <button onClick={handleCheck} disabled={loading || !checkForm.product_id} style={{ ...btnPrimary, width: '100%', justifyContent: 'center', opacity: loading || !checkForm.product_id ? 0.5 : 1 }}>
            <Search size={16} /> {loading ? 'Checking...' : 'Check Availability'}
          </button>
        </div>

        {/* Results */}
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600 }}>Availability Result</h3>
          {!result ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#555' }}>Run an ATP check to see results</div>
          ) : (
            <>
              {/* Status Banner */}
              <div style={{
                padding: 16, borderRadius: 8, marginBottom: 16,
                background: result.available ? 'rgba(0,201,113,0.1)' : 'rgba(239,68,68,0.1)',
                border: `1px solid ${result.available ? '#00C971' : '#ef4444'}`,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                {result.available ? <CheckCircle size={24} color="#00C971" /> : <XCircle size={24} color="#ef4444" />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{result.available ? 'Available' : 'Insufficient Stock'}</div>
                  <div style={{ color: '#aaa', fontSize: 13 }}>
                    {result.total_available} units available | {result.requested_quantity} requested
                    {!result.available && result.earliest_date && (
                      <span> | Earliest: {new Date(result.earliest_date).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Warehouse Breakdown */}
              <h4 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: '#aaa' }}>Warehouse Breakdown</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Warehouse', 'On Hand', 'Allocated', 'Incoming', 'Available', 'Action'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '8px', color: '#888', fontSize: 12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(result.warehouse_breakdown || []).map((w: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={{ padding: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Warehouse size={14} color="#888" /> {String(w.warehouse_id).substring(0, 8)}...</td>
                      <td style={{ padding: 8 }}>{w.on_hand}</td>
                      <td style={{ padding: 8, color: '#f59e0b' }}>{w.allocated}</td>
                      <td style={{ padding: 8, color: '#3b82f6' }}>{w.incoming}</td>
                      <td style={{ padding: 8, fontWeight: 700, color: w.available > 0 ? '#00C971' : '#ef4444' }}>{w.available}</td>
                      <td style={{ padding: 8 }}>
                        {w.available >= checkForm.quantity && (
                          <button onClick={() => handleReserve(w.warehouse_id)} style={{ background: '#00C971', color: '#000', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Reserve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>

      {/* Timeline Chart */}
      {timeline.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <TrendingUp size={18} color="#00C971" /> Future Availability Timeline
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <svg width={Math.max(timeline.length * 50, 600)} height={200} style={{ display: 'block' }}>
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                <g key={pct}>
                  <line x1={40} y1={10 + (1 - pct) * 160} x2={Math.max(timeline.length * 50, 600)} y2={10 + (1 - pct) * 160} stroke="#222" />
                  <text x={2} y={14 + (1 - pct) * 160} fill="#555" fontSize={10}>{Math.round(maxAvail * pct)}</text>
                </g>
              ))}
              {/* Bars */}
              {timeline.map((t: any, i: number) => {
                const barH = (t.total_available / maxAvail) * 160;
                const color = t.total_available >= checkForm.quantity ? '#00C971' : '#ef4444';
                return (
                  <g key={i}>
                    <rect x={50 + i * 48} y={170 - barH} width={36} height={barH} rx={4} fill={color} opacity={0.8} />
                    <text x={50 + i * 48 + 18} y={190} fill="#555" fontSize={9} textAnchor="middle">
                      {new Date(t._id).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </text>
                    <text x={50 + i * 48 + 18} y={166 - barH} fill="#aaa" fontSize={10} textAnchor="middle">{t.total_available}</text>
                  </g>
                );
              })}
              {/* Requested quantity line */}
              <line x1={40} y1={170 - (checkForm.quantity / maxAvail) * 160} x2={Math.max(timeline.length * 50, 600)} y2={170 - (checkForm.quantity / maxAvail) * 160} stroke="#f59e0b" strokeDasharray="5,5" />
              <text x={Math.max(timeline.length * 50, 600) - 80} y={166 - (checkForm.quantity / maxAvail) * 160} fill="#f59e0b" fontSize={10}>Requested: {checkForm.quantity}</text>
            </svg>
          </div>
        </div>
      )}

      {/* Reservation Records */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={18} color="#00C971" /> ATP Records
        </h3>
        {records.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#555' }}>No ATP records found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222' }}>
                {['Product', 'Warehouse', 'Date', 'On Hand', 'Allocated', 'Incoming', 'Available'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#888', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r._id || r.id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{String(r.product_id).substring(0, 12)}...</td>
                  <td style={{ padding: '10px 8px', fontFamily: 'monospace', fontSize: 12 }}>{String(r.warehouse_id).substring(0, 12)}...</td>
                  <td style={{ padding: '10px 8px' }}>{new Date(r.date).toLocaleDateString()}</td>
                  <td style={{ padding: '10px 8px' }}>{r.on_hand}</td>
                  <td style={{ padding: '10px 8px', color: '#f59e0b' }}>{r.allocated}</td>
                  <td style={{ padding: '10px 8px', color: '#3b82f6' }}>{r.incoming}</td>
                  <td style={{ padding: '10px 8px', fontWeight: 700, color: r.available > 0 ? '#00C971' : '#ef4444' }}>{r.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ATPDashboard;
