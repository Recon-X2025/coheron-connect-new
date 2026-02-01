import React, { useState, useEffect, FC } from 'react';
import { CreditCard, Plus, Settings, ToggleLeft, ToggleRight, RefreshCw, Search, Download, X } from 'lucide-react';

const API = '/api/pos/payment-gateways';
const PROVIDERS = ['stripe', 'razorpay', 'square', 'paypal', 'adyen', 'worldpay', 'custom'] as const;
const METHODS = ['card', 'upi', 'wallet', 'bank_transfer', 'cash', 'check'] as const;
const PROVIDER_COLORS: Record<string, string> = { stripe: '#635BFF', razorpay: '#0C84EE', square: '#00D632', paypal: '#003087', adyen: '#0ABF53', worldpay: '#E4002B', custom: '#888' };

const sCard: React.CSSProperties = { background: '#141414', borderRadius: 12, border: '1px solid #222', padding: 24 };
const sBtn: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const sBtnSm: React.CSSProperties = { ...sBtn, padding: '6px 14px', fontSize: 13 };
const sInput: React.CSSProperties = { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#fff', fontSize: 14, width: '100%' };
const sBadge = (color: string): React.CSSProperties => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: color + '22', color });

type Gateway = any;
type Transaction = any;

export const PaymentSettings: FC = () => {
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txTotal, setTxTotal] = useState(0);
  const [settlement, setSettlement] = useState<any[]>([]);
  const [reconciliation, setRecon] = useState<any>(null);
  const [tab, setTab] = useState<'gateways' | 'transactions' | 'settlement' | 'reconciliation'>('gateways');
  const [showForm, setShowForm] = useState(false);
  const [editGw, setEditGw] = useState<Gateway | null>(null);
  const [form, setForm] = useState<any>({ name: '', provider: 'stripe', config: { sandbox_mode: true }, supported_methods: ['card'], supported_currencies: ['USD'], is_active: true, is_default: false, processing_fee_pct: 2.9, fixed_fee: 0.30, settlement_days: 2 });
  const [txFilter, setTxFilter] = useState({ status: '', method: '' });

  const fetchGateways = () => fetch(API).then(r => r.json()).then(setGateways).catch(() => {});
  const fetchTransactions = () => {
    const params = new URLSearchParams();
    if (txFilter.status) params.set('status', txFilter.status);
    if (txFilter.method) params.set('method', txFilter.method);
    fetch(`${API}/transactions?${params}`).then(r => r.json()).then(d => { setTransactions(d.transactions || []); setTxTotal(d.total || 0); }).catch(() => {});
  };
  const fetchSettlement = () => fetch(`${API}/settlement-report`).then(r => r.json()).then(setSettlement).catch(() => {});
  const fetchRecon = () => fetch(`${API}/reconciliation`).then(r => r.json()).then(setRecon).catch(() => {});

  useEffect(() => { fetchGateways(); }, []);
  useEffect(() => { if (tab === 'transactions') fetchTransactions(); }, [tab, txFilter]);
  useEffect(() => { if (tab === 'settlement') fetchSettlement(); }, [tab]);
  useEffect(() => { if (tab === 'reconciliation') fetchRecon(); }, [tab]);

  const saveGateway = async () => {
    const method = editGw ? 'PUT' : 'POST';
    const url = editGw ? `${API}/${editGw.id || editGw._id}` : API;
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowForm(false); setEditGw(null); fetchGateways();
  };

  const toggleGateway = async (gw: Gateway) => {
    await fetch(`${API}/${gw.id || gw._id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: !gw.is_active }) });
    fetchGateways();
  };

  const deleteGateway = async (gw: Gateway) => {
    if (!confirm('Delete this gateway?')) return;
    await fetch(`${API}/${gw.id || gw._id}`, { method: 'DELETE' });
    fetchGateways();
  };

  const openEdit = (gw: Gateway) => {
    setEditGw(gw);
    setForm({ name: gw.name, provider: gw.provider, config: gw.config || {}, supported_methods: gw.supported_methods || [], supported_currencies: gw.supported_currencies || [], is_active: gw.is_active, is_default: gw.is_default, processing_fee_pct: gw.processing_fee_pct, fixed_fee: gw.fixed_fee, settlement_days: gw.settlement_days });
    setShowForm(true);
  };

  const statusColor = (s: string) => ({ completed: '#00C971', pending: '#f59e0b', processing: '#3b82f6', failed: '#ef4444', refunded: '#a855f7', partially_refunded: '#f97316', voided: '#6b7280' }[s] || '#888');

  const tabs = [
    { key: 'gateways', label: 'Gateways' },
    { key: 'transactions', label: 'Transactions' },
    { key: 'settlement', label: 'Settlement' },
    { key: 'reconciliation', label: 'Reconciliation' },
  ] as const;

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}><CreditCard size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: '#00C971' }} />Payment Settings</h1>
        {tab === 'gateways' && <button style={sBtn} onClick={() => { setEditGw(null); setForm({ name: '', provider: 'stripe', config: { sandbox_mode: true }, supported_methods: ['card'], supported_currencies: ['USD'], is_active: true, is_default: false, processing_fee_pct: 2.9, fixed_fee: 0.30, settlement_days: 2 }); setShowForm(true); }}><Plus size={16} style={{ marginRight: 6 }} />Add Gateway</button>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ background: tab === t.key ? '#00C971' : '#1a1a1a', color: tab === t.key ? '#000' : '#aaa', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>{t.label}</button>
        ))}
      </div>

      {tab === 'gateways' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {gateways.map((gw: any) => (
            <div key={gw.id || gw._id} style={{ ...sCard, borderLeft: `4px solid ${PROVIDER_COLORS[gw.provider] || '#888'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18 }}>{gw.name}</h3>
                  <span style={{ color: '#888', fontSize: 13, textTransform: 'uppercase' }}>{gw.provider}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {gw.is_default && <span style={sBadge('#00C971')}>Default</span>}
                  <button onClick={() => toggleGateway(gw)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: gw.is_active ? '#00C971' : '#666' }}>
                    {gw.is_active ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 8 }}>
                Methods: {(gw.supported_methods || []).join(', ')} | Fee: {gw.processing_fee_pct}% + ${gw.fixed_fee}
              </div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 12 }}>
                Currencies: {(gw.supported_currencies || []).join(', ')} | Settlement: {gw.settlement_days}d
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={sBtnSm} onClick={() => openEdit(gw)}><Settings size={14} style={{ marginRight: 4 }} />Configure</button>
                <button style={{ ...sBtnSm, background: '#ef4444' }} onClick={() => deleteGateway(gw)}><X size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'transactions' && (
        <div style={sCard}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <select style={{ ...sInput, width: 'auto' }} value={txFilter.status} onChange={e => setTxFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {['pending', 'processing', 'completed', 'failed', 'refunded', 'voided'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select style={{ ...sInput, width: 'auto' }} value={txFilter.method} onChange={e => setTxFilter(f => ({ ...f, method: e.target.value }))}>
              <option value="">All Methods</option>
              {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <span style={{ color: '#888', alignSelf: 'center', marginLeft: 'auto' }}>{txTotal} transactions</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>
                <th style={{ padding: 8, textAlign: 'left' }}>Order</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Amount</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Method</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Reference</th>
                <th style={{ padding: 8, textAlign: 'left' }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx: any) => (
                <tr key={tx.id || tx._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={{ padding: 8 }}>{tx.order_id || '--'}</td>
                  <td style={{ padding: 8, fontWeight: 600 }}>${tx.amount?.toFixed(2)}{tx.tip_amount > 0 && <span style={{ color: '#888', fontSize: 12 }}> +${tx.tip_amount.toFixed(2)} tip</span>}</td>
                  <td style={{ padding: 8, textTransform: 'capitalize' }}>{tx.method}</td>
                  <td style={{ padding: 8 }}><span style={sBadge(statusColor(tx.status))}>{tx.status}</span></td>
                  <td style={{ padding: 8, color: '#888', fontSize: 12 }}>{tx.gateway_reference || '--'}</td>
                  <td style={{ padding: 8, color: '#888', fontSize: 12 }}>{tx.processed_at ? new Date(tx.processed_at).toLocaleString() : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'settlement' && (
        <div style={sCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Settlement Report</h3>
          {settlement.length === 0 ? <p style={{ color: '#888' }}>No settlement data.</p> : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>
                  <th style={{ padding: 8, textAlign: 'left' }}>Gateway</th>
                  <th style={{ padding: 8, textAlign: 'left' }}>Status</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Amount</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Tips</th>
                  <th style={{ padding: 8, textAlign: 'right' }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {settlement.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={{ padding: 8 }}>{row._id?.gateway_id || 'N/A'}</td>
                    <td style={{ padding: 8 }}><span style={sBadge(row._id?.settled === 'settled' ? '#00C971' : '#f59e0b')}>{row._id?.settled}</span></td>
                    <td style={{ padding: 8, textAlign: 'right', fontWeight: 600 }}>${row.total_amount?.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>${row.total_tips?.toFixed(2)}</td>
                    <td style={{ padding: 8, textAlign: 'right' }}>{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'reconciliation' && reconciliation && (
        <div style={sCard}>
          <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Reconciliation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 20 }}>
            {(reconciliation.summary || []).map((s: any) => (
              <div key={s._id} style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>{s._id}</div>
                <div style={{ fontSize: 22, fontWeight: 700 }}>${s.total_amount?.toFixed(2)}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{s.count} txns</div>
              </div>
            ))}
          </div>
          {(reconciliation.unmatched || []).length > 0 && (
            <>
              <h4 style={{ color: '#ef4444', marginBottom: 8 }}>Unmatched Transactions ({reconciliation.unmatched.length})</h4>
              {reconciliation.unmatched.map((tx: any) => (
                <div key={tx.id || tx._id} style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                  <span>${tx.amount?.toFixed(2)} - {tx.method}</span>
                  <span style={{ color: '#888' }}>{tx.gateway_reference}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {showForm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...sCard, width: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>{editGw ? 'Edit Gateway' : 'Add Gateway'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <input style={sInput} placeholder="Gateway Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <select style={sInput} value={form.provider} onChange={e => setForm({ ...form, provider: e.target.value })}>
                {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <input style={sInput} placeholder="API Key" value={form.config?.api_key || ''} onChange={e => setForm({ ...form, config: { ...form.config, api_key: e.target.value } })} />
              <input style={sInput} placeholder="API Secret" value={form.config?.api_secret || ''} onChange={e => setForm({ ...form, config: { ...form.config, api_secret: e.target.value } })} />
              <input style={sInput} placeholder="Merchant ID" value={form.config?.merchant_id || ''} onChange={e => setForm({ ...form, config: { ...form.config, merchant_id: e.target.value } })} />
              <div>
                <label style={{ fontSize: 13, color: '#888', marginBottom: 6, display: 'block' }}>Supported Methods</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {METHODS.map(m => (
                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#ccc', fontSize: 13 }}>
                      <input type="checkbox" checked={form.supported_methods.includes(m)} onChange={() => {
                        const methods = form.supported_methods.includes(m) ? form.supported_methods.filter((x: string) => x !== m) : [...form.supported_methods, m];
                        setForm({ ...form, supported_methods: methods });
                      }} />{m}
                    </label>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <div><label style={{ fontSize: 12, color: '#888' }}>Fee %</label><input style={sInput} type="number" step="0.1" value={form.processing_fee_pct} onChange={e => setForm({ ...form, processing_fee_pct: parseFloat(e.target.value) })} /></div>
                <div><label style={{ fontSize: 12, color: '#888' }}>Fixed Fee</label><input style={sInput} type="number" step="0.01" value={form.fixed_fee} onChange={e => setForm({ ...form, fixed_fee: parseFloat(e.target.value) })} /></div>
                <div><label style={{ fontSize: 12, color: '#888' }}>Settlement Days</label><input style={sInput} type="number" value={form.settlement_days} onChange={e => setForm({ ...form, settlement_days: parseInt(e.target.value) })} /></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked })} />Default Gateway
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ccc', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.config?.sandbox_mode} onChange={e => setForm({ ...form, config: { ...form.config, sandbox_mode: e.target.checked } })} />Sandbox Mode
                </label>
              </div>
              <button style={sBtn} onClick={saveGateway}>{editGw ? 'Update Gateway' : 'Create Gateway'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSettings;
