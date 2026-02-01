import { useState, useEffect } from 'react';
import { TrendingUp, Plus, BarChart3, Target } from 'lucide-react';

const API_BASE = '/api/crm/forecasting';
const getToken = () => localStorage.getItem('token') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const CRMForecasting: React.FC = () => {
  const [forecasts, setForecasts] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any>(null);
  const [accuracy, setAccuracy] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [tab, setTab] = useState<'forecasts' | 'pipeline' | 'accuracy'>('forecasts');
  const [form, setForm] = useState({ forecast_name: '', forecast_type: 'revenue', period_type: 'monthly', period_start: '', period_end: '', forecasted_amount: 0, notes: '' });

  const loadData = async () => {
    setLoading(true);
    try {
      const [f, p, a] = await Promise.all([apiFetch('/'), apiFetch('/pipeline-analysis'), apiFetch('/accuracy')]);
      setForecasts(f.data || []);
      setPipeline(p);
      setAccuracy(a);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const createForecast = async () => {
    try {
      await apiFetch('/', { method: 'POST', body: JSON.stringify(form) });
      setShowModal(false);
      setForm({ forecast_name: '', forecast_type: 'revenue', period_type: 'monthly', period_start: '', period_end: '', forecasted_amount: 0, notes: '' });
      await loadData();
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <TrendingUp size={28} color="#10b981" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>CRM Forecasting</h1>
        </div>
        <button onClick={() => setShowModal(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#10b981', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
          <Plus size={16} /> New Forecast
        </button>
      </div>

      {pipeline && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#1e3a5f', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><BarChart3 size={20} color="#60a5fa" /><span style={{ color: '#94a3b8', fontSize: 13 }}>Total Pipeline</span></div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>${(pipeline.total_pipeline || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: '#14532d', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><Target size={20} color="#22c55e" /><span style={{ color: '#94a3b8', fontSize: 13 }}>Weighted Pipeline</span></div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>${(pipeline.total_weighted || 0).toLocaleString()}</div>
          </div>
          <div style={{ background: '#3b1f6e', borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}><TrendingUp size={20} color="#a78bfa" /><span style={{ color: '#94a3b8', fontSize: 13 }}>Avg Accuracy</span></div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{accuracy?.avg_accuracy || 0}%</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['forecasts', 'pipeline', 'accuracy'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '8px 20px', background: tab === t ? '#10b981' : '#1f2937', color: tab === t ? '#000' : '#94a3b8', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div> : tab === 'forecasts' ? (
        <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                {['Forecast', 'Type', 'Period', 'Forecasted', 'Actual', 'Confidence', 'Method'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forecasts.map(f => (
                <tr key={f._id} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{f.forecast_name || 'Unnamed'}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{f.forecast_type}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{f.period_type}</td>
                  <td style={{ padding: '12px 16px', color: '#60a5fa', fontWeight: 600 }}>${(f.forecasted_amount || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 600 }}>{f.actual_amount != null ? `$${f.actual_amount.toLocaleString()}` : '-'}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{f.confidence_level != null ? `${f.confidence_level}%` : '-'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: '#1f2937', color: '#94a3b8' }}>{f.forecast_method || 'manual'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!forecasts.length && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No forecasts yet</div>}
        </div>
      ) : tab === 'pipeline' && pipeline ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {Object.entries(pipeline.stages || {}).map(([stage, data]: [string, any]) => (
            <div key={stage} style={{ background: '#111827', borderRadius: 12, padding: 20 }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12, textTransform: 'capitalize' }}>{stage}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div><span style={{ color: '#64748b' }}>Deals:</span> <span style={{ fontWeight: 600 }}>{data.count}</span></div>
                <div><span style={{ color: '#64748b' }}>Revenue:</span> <span style={{ color: '#22c55e', fontWeight: 600 }}>${(data.total_revenue || 0).toLocaleString()}</span></div>
                <div><span style={{ color: '#64748b' }}>Avg Prob:</span> <span>{Math.round(data.avg_probability || 0)}%</span></div>
                <div><span style={{ color: '#64748b' }}>Weighted:</span> <span style={{ color: '#60a5fa' }}>${Math.round(data.weighted_revenue || 0).toLocaleString()}</span></div>
              </div>
            </div>
          ))}
        </div>
      ) : tab === 'accuracy' && accuracy ? (
        <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                {['Forecast', 'Forecasted', 'Actual', 'Variance', 'Accuracy'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(accuracy.results || []).map((r: any) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{r.forecast_name}</td>
                  <td style={{ padding: '12px 16px', color: '#60a5fa' }}>${(r.forecasted || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#22c55e' }}>${(r.actual || 0).toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: r.variance >= 0 ? '#22c55e' : '#ef4444' }}>${r.variance?.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: r.accuracy_pct >= 80 ? '#14532d' : r.accuracy_pct >= 50 ? '#78350f' : '#7f1d1d', color: '#fff' }}>{r.accuracy_pct}%</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!(accuracy.results || []).length && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No accuracy data</div>}
        </div>
      ) : null}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 32, width: 480 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 20 }}>New Forecast</h2>
            {[
              { label: 'Name', key: 'forecast_name', type: 'text' },
              { label: 'Period Start', key: 'period_start', type: 'date' },
              { label: 'Period End', key: 'period_end', type: 'date' },
              { label: 'Forecasted Amount', key: 'forecasted_amount', type: 'number' },
              { label: 'Notes', key: 'notes', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#94a3b8', marginBottom: 4 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? +e.target.value : e.target.value })} style={{ width: '100%', padding: '8px 12px', background: '#0a0a0a', border: '1px solid #334155', borderRadius: 6, color: '#fff', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#374151', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
              <button onClick={createForecast} style={{ padding: '10px 20px', background: '#10b981', color: '#000', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMForecasting;
