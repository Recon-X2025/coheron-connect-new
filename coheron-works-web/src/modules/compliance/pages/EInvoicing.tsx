import React, { useState } from 'react';
import { FileCheck, Loader2, CheckCircle, XCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const s = {
  page: { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14, width: '100%' } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnDanger: { background: '#1e1e1e', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
};

let _csrf: string | null = null;
const getCsrf = async () => { if (_csrf) return _csrf; try { const r = await fetch('/api/csrf-token', { credentials: 'include' }); if (r.ok) { _csrf = (await r.json()).token; } } catch {} return _csrf; };

export const EInvoicing: React.FC = () => {
  const [invoiceId, setInvoiceId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('authToken') || '';

  const generate = async () => {
    if (!invoiceId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/compliance/einvoice/generate/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-csrf-token': await getCsrf() || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const cancel = async () => {
    if (!invoiceId) return;
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/api/compliance/einvoice/cancel/${invoiceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'x-csrf-token': await getCsrf() || '' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult({ ...result, cancelled: true });
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileCheck size={28} style={{ color: '#00C971' }} /> E-Invoicing (IRN)
      </h1>

      <div style={s.card}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input style={{ ...s.input, width: 300 }} placeholder="Invoice ID" value={invoiceId} onChange={e => setInvoiceId(e.target.value)} />
          <button style={s.btn} onClick={generate} disabled={loading || !invoiceId}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
            Generate IRN
          </button>
          {result?.irn && !result.cancelled && (
            <button style={s.btnDanger} onClick={cancel} disabled={loading}>
              <XCircle size={14} /> Cancel IRN
            </button>
          )}
        </div>
      </div>

      {error && <div style={{ ...s.card, borderColor: '#ef4444', color: '#ef4444' }}>{error}</div>}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={s.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>IRN Details</h3>
            <div style={{ display: 'grid', gap: 8, fontSize: 13 }}>
              <div><span style={{ color: '#888' }}>IRN:</span> <span style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{result.irn}</span></div>
              <div><span style={{ color: '#888' }}>Generated:</span> {result.irn_date ? new Date(result.irn_date).toLocaleString() : '-'}</div>
              <div><span style={{ color: '#888' }}>Status:</span> <span style={{ color: result.cancelled ? '#ef4444' : '#00C971' }}>{result.cancelled ? 'Cancelled' : 'Active'}</span></div>
            </div>
          </div>
          <div style={s.card}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>QR Code</h3>
            {result.signed_qr_code ? (
              <div style={{ background: '#fff', padding: 16, borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontFamily: 'monospace', fontSize: 10, color: '#333', wordBreak: 'break-all' }}>{result.signed_qr_code.substring(0, 100)}...</div>
              </div>
            ) : (
              <div style={{ color: '#666' }}>No QR code available</div>
            )}
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EInvoicing;
