import React, { useState } from 'react';
import { Truck, Loader2, Clock } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const s = {
  page: { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
};

export const EWayBill: React.FC = () => {
  const [deliveryId, setDeliveryId] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const token = localStorage.getItem('authToken') || '';

  const generate = async () => {
    if (!deliveryId) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/compliance/eway-bill/generate/${deliveryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Truck size={28} style={{ color: '#00C971' }} /> E-Way Bill
      </h1>

      <div style={s.card}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input style={{ ...s.input, width: 300 }} placeholder="Delivery ID" value={deliveryId} onChange={e => setDeliveryId(e.target.value)} />
          <button style={s.btn} onClick={generate} disabled={loading || !deliveryId}>
            {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Truck size={16} />}
            Generate E-Way Bill
          </button>
        </div>
      </div>

      {error && <div style={{ ...s.card, borderColor: '#ef4444', color: '#ef4444' }}>{error}</div>}

      {result && (
        <div style={s.card}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, color: '#888' }}>E-Way Bill No.</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#00C971' }}>{result.eway_bill_no}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#888' }}>Generated</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date(result.eway_bill_date).toLocaleString()}</div>
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#888' }}>Valid Until</div>
              <div style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={14} /> {new Date(result.valid_upto).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default EWayBill;
