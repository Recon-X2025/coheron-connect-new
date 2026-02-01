import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, BarChart3, Play, RefreshCw, Target } from 'lucide-react';

interface Forecast {
  _id: string;
  product_id: any;
  warehouse_id: any;
  period_start: string;
  period_end: string;
  forecast_quantity: number;
  actual_quantity: number;
  method: string;
  confidence_level: number;
  planning_run_id: any;
  created_at: string;
}

interface PlanningRun {
  _id: string;
  name: string;
  status: string;
  method: string;
  products_count: number;
  started_at: string;
  completed_at: string;
  created_at: string;
}

const API = '/api/inventory/demand-planning';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#1a1a2e', text: '#8888aa' },
  running: { bg: '#2a2a1a', text: '#bbbb44' },
  completed: { bg: '#1a2a1a', text: '#00C971' },
  failed: { bg: '#2a1a1a', text: '#bb4444' },
};

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const DemandPlanning: React.FC = () => {
  const [tab, setTab] = useState<'forecasts' | 'runs'>('forecasts');
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [runs, setRuns] = useState<PlanningRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({ name: '', method: 'moving_average', parameters: '{}' });

  const fetchForecasts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/forecasts?page=${page}&limit=20`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setForecasts(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page]);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/runs?page=1&limit=50`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setRuns(data.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchAccuracy = async () => {
    try {
      const res = await fetch(`${API}/accuracy`, { headers: getHeaders() });
      if (res.ok) setAccuracy(await res.json());
    } catch (_) {}
  };

  useEffect(() => {
    if (tab === 'forecasts') fetchForecasts();
    else fetchRuns();
    fetchAccuracy();
  }, [tab, fetchForecasts, fetchRuns]);

  const createRun = async () => {
    try {
      const res = await fetch(`${API}/runs`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ name: formData.name, method: formData.method, parameters: JSON.parse(formData.parameters || '{}') }),
      });
      if (!res.ok) throw new Error('Failed to create run');
      setShowCreate(false);
      setFormData({ name: '', method: 'moving_average', parameters: '{}' });
      fetchRuns();
    } catch (e: any) { setError(e.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Demand Planning & Forecasting</h1>
        <button onClick={() => setShowCreate(true)} style={greenBtnStyle}>
          <Play size={16} /> New Planning Run
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {/* Accuracy Stats */}
      {accuracy && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Forecasts', value: accuracy.total_forecasts, icon: <BarChart3 size={18} /> },
            { label: 'With Actuals', value: accuracy.forecasts_with_actuals, icon: <Target size={18} /> },
            { label: 'MAPE', value: `${accuracy.mape}%`, icon: <TrendingUp size={18} /> },
            { label: 'Accuracy', value: `${accuracy.accuracy}%`, icon: <RefreshCw size={18} /> },
          ].map((s, i) => (
            <div key={i} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e6e', fontSize: 13, marginBottom: 8 }}>{s.label} {s.icon}</div>
              <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #222' }}>
        {(['forecasts', 'runs'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', color: tab === t ? '#fff' : '#6e6e6e', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            {t === 'forecasts' ? 'Forecasts' : 'Planning Runs'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : tab === 'forecasts' ? (
        <>
          <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #222' }}>
                  {['Product', 'Period', 'Forecast Qty', 'Actual Qty', 'Method', 'Confidence', 'Variance'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {forecasts.map(f => {
                  const variance = f.actual_quantity > 0 ? Math.round(((f.actual_quantity - f.forecast_quantity) / f.forecast_quantity) * 100) : null;
                  return (
                    <tr key={f._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={cellStyle}><span style={{ color: '#00C971' }}>{f.product_id?.name || f.product_id}</span></td>
                      <td style={cellStyle}>{new Date(f.period_start).toLocaleDateString()} - {new Date(f.period_end).toLocaleDateString()}</td>
                      <td style={cellStyle}>{f.forecast_quantity.toLocaleString()}</td>
                      <td style={cellStyle}>{f.actual_quantity > 0 ? f.actual_quantity.toLocaleString() : '-'}</td>
                      <td style={cellStyle}>{f.method.replace('_', ' ')}</td>
                      <td style={cellStyle}>{Math.round(f.confidence_level * 100)}%</td>
                      <td style={cellStyle}>{variance !== null ? <span style={{ color: variance >= 0 ? '#00C971' : '#ee4444' }}>{variance > 0 ? '+' : ''}{variance}%</span> : '-'}</td>
                    </tr>
                  );
                })}
                {forecasts.length === 0 && <tr><td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#6e6e6e' }}>No forecasts found</td></tr>}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Prev</button>
              <span style={{ padding: '8px 12px', color: '#939393', fontSize: 14 }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {runs.map(r => (
            <div key={r._id} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 500, fontSize: 15 }}>{r.name}</span>
                  <span style={{ marginLeft: 12, padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[r.status]?.bg, color: statusColors[r.status]?.text }}>{r.status}</span>
                </div>
                <span style={{ color: '#6e6e6e', fontSize: 13 }}>{new Date(r.created_at).toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 13, color: '#939393' }}>
                <span>Method: {r.method.replace('_', ' ')}</span>
                <span>Products: {r.products_count}</span>
                {r.completed_at && <span>Completed: {new Date(r.completed_at).toLocaleString()}</span>}
              </div>
            </div>
          ))}
          {runs.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No planning runs found</div>}
        </div>
      )}

      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>New Planning Run</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Name<input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} placeholder="Q1 2026 Forecast" /></label>
              <label style={labelStyle}>Method
                <select value={formData.method} onChange={e => setFormData({ ...formData, method: e.target.value })} style={inputStyle}>
                  <option value="moving_average">Moving Average</option>
                  <option value="exponential_smoothing">Exponential Smoothing</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label style={labelStyle}>Parameters (JSON)<textarea value={formData.parameters} onChange={e => setFormData({ ...formData, parameters: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={createRun} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Run Forecast</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' };
const greenBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

export default DemandPlanning;
