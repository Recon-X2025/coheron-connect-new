import React, { useState } from 'react';
import { FileText, Download } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const s = {
  page: { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  tab: (active: boolean) => ({ padding: '10px 20px', cursor: 'pointer', borderBottom: active ? '2px solid #00C971' : '2px solid transparent', color: active ? '#00C971' : '#888', fontWeight: active ? 600 : 400, background: 'none', border: 'none' }) as React.CSSProperties,
};

let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };

export const GSTFiling: React.FC = () => {
  const [tab, setTab] = useState<'gstr1' | 'gstr3b'>('gstr1');
  const [period, setPeriod] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('authToken') || '';

  const generate = async () => {
    setLoading(true);
    try {
      const endpoint = tab === 'gstr1' ? '/api/compliance/gst/gstr1/generate' : '/api/compliance/gst/gstr3b/generate';
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-csrf-token': await getCsrf() || '' },
        body: JSON.stringify({ period }),
      });
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const downloadJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${tab}-${period}.json`; a.click();
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={28} style={{ color: '#00C971' }} /> GST Filing
      </h1>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #222', marginBottom: 24 }}>
        <button style={s.tab(tab === 'gstr1')} onClick={() => { setTab('gstr1'); setData(null); }}>GSTR-1</button>
        <button style={s.tab(tab === 'gstr3b')} onClick={() => { setTab('gstr3b'); setData(null); }}>GSTR-3B</button>
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: '#888' }}>Period:</label>
          <input type="month" style={s.input} value={period} onChange={e => setPeriod(e.target.value)} />
          <button style={s.btn} onClick={generate} disabled={loading}>
            {loading ? 'Generating...' : `Generate ${tab.toUpperCase()}`}
          </button>
          {data && <button style={s.btnSec} onClick={downloadJSON}><Download size={14} /> Download JSON</button>}
        </div>
      </div>

      {data && tab === 'gstr1' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 16 }}>
          <div style={s.card}>
            <div style={{ fontSize: 13, color: '#888' }}>B2B Invoices</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#00C971' }}>{data.b2b?.length || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Registered customers</div>
          </div>
          <div style={s.card}>
            <div style={{ fontSize: 13, color: '#888' }}>B2C Supplies</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#3b82f6' }}>{data.b2cs?.length || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Unregistered / consumer</div>
          </div>
          <div style={s.card}>
            <div style={{ fontSize: 13, color: '#888' }}>Credit/Debit Notes</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{data.cdnr?.length || 0}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Adjustments</div>
          </div>
        </div>
      )}

      {data && tab === 'gstr3b' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={s.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Outward Supplies</h3>
            <div style={{ fontSize: 13, color: '#888' }}>
              <div>Taxable Value: ₹{data.sup_details?.osup_det?.txval?.toLocaleString('en-IN') || 0}</div>
              <div>CGST: ₹{data.sup_details?.osup_det?.camt?.toLocaleString('en-IN') || 0}</div>
              <div>SGST: ₹{data.sup_details?.osup_det?.samt?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>
          <div style={s.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Tax Payable</h3>
            <div style={{ fontSize: 13, color: '#888' }}>
              <div>IGST: ₹{data.tax_pmt?.igst?.toLocaleString('en-IN') || 0}</div>
              <div>CGST: ₹{data.tax_pmt?.cgst?.toLocaleString('en-IN') || 0}</div>
              <div>SGST: ₹{data.tax_pmt?.sgst?.toLocaleString('en-IN') || 0}</div>
            </div>
          </div>
        </div>
      )}

      {data && (
        <div style={s.card}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Raw JSON Preview</h3>
          <pre style={{ background: '#0a0a0a', padding: 16, borderRadius: 8, fontSize: 12, maxHeight: 300, overflow: 'auto', color: '#888' }}>
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default GSTFiling;
