import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, DollarSign, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface ConsignmentAgreement {
  _id: string;
  agreement_number: string;
  type: string;
  partner_id: any;
  warehouse_id: any;
  status: string;
  items: any[];
  start_date: string;
  end_date: string;
  settlement_frequency: string;
  auto_replenish: boolean;
  terms?: string;
  created_at: string;
}

interface ConsignmentStock {
  _id: string;
  agreement_id: any;
  product_id: any;
  warehouse_id: any;
  quantity_on_hand: number;
  quantity_sold: number;
  quantity_returned: number;
  last_reconciled_at?: string;
}

type TabView = 'agreements' | 'stock' | 'settlement';

const API = '/api/inventory/consignment';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#1a1a2e', text: '#8888aa' },
  active: { bg: '#1a2a1a', text: '#00C971' },
  expired: { bg: '#2a2a1a', text: '#bbbb44' },
  terminated: { bg: '#2a1a1a', text: '#bb4444' },
};

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const ConsignmentManagement: React.FC = () => {
  const [tab, setTab] = useState<TabView>('agreements');
  const [agreements, setAgreements] = useState<ConsignmentAgreement[]>([]);
  const [stock, setStock] = useState<ConsignmentStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAgreement, _setSelectedAgreement] = useState<ConsignmentAgreement | null>(null);
  const [settlementData, setSettlementData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formData, setFormData] = useState({
    type: 'vendor_consignment',
    partner_id: '',
    warehouse_id: '',
    start_date: '',
    end_date: '',
    settlement_frequency: 'monthly',
    auto_replenish: false,
    terms: '',
  });

  const fetchAgreements = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);
      const res = await fetch(`${API}/agreements?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAgreements(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, statusFilter, typeFilter]);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAgreement) params.set('agreement_id', selectedAgreement._id);
      const res = await fetch(`${API}/stock?${params}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch stock');
      setStock(await res.json());
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [selectedAgreement]);

  useEffect(() => {
    if (tab === 'agreements') fetchAgreements();
    else if (tab === 'stock') fetchStock();
  }, [tab, fetchAgreements, fetchStock]);

  const createAgreement = async () => {
    try {
      const res = await fetch(`${API}/agreements`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(formData) });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreate(false);
      setFormData({ type: 'vendor_consignment', partner_id: '', warehouse_id: '', start_date: '', end_date: '', settlement_frequency: 'monthly', auto_replenish: false, terms: '' });
      fetchAgreements();
    } catch (e: any) { setError(e.message); }
  };

  const activateAgreement = async (id: string) => {
    try {
      const res = await fetch(`${API}/agreements/${id}/activate`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      fetchAgreements();
    } catch (e: any) { setError(e.message); }
  };

  const terminateAgreement = async (id: string) => {
    try {
      const res = await fetch(`${API}/agreements/${id}/terminate`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      fetchAgreements();
    } catch (e: any) { setError(e.message); }
  };

  const generateSettlement = async (id: string) => {
    try {
      const res = await fetch(`${API}/agreements/${id}/settle`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) throw new Error('Failed');
      setSettlementData(await res.json());
      setTab('settlement');
    } catch (e: any) { setError(e.message); }
  };

  const reconcileStock = async (stockId: string) => {
    try {
      const res = await fetch(`${API}/stock/${stockId}/reconcile`, { method: 'POST', headers: getHeaders(), body: JSON.stringify({}) });
      if (!res.ok) throw new Error('Failed');
      fetchStock();
    } catch (e: any) { setError(e.message); }
  };

  const filtered = agreements.filter(a => a.agreement_number.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Consignment Management</h1>
        {tab === 'agreements' && (
          <button onClick={() => setShowCreate(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>
            <Plus size={16} /> New Agreement
          </button>
        )}
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, backgroundColor: '#141414', borderRadius: 8, padding: 4 }}>
        {(['agreements', 'stock', 'settlement'] as TabView[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '10px 16px', backgroundColor: tab === t ? '#1a1a1a' : 'transparent',
            color: tab === t ? '#fff' : '#6e6e6e', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: tab === t ? 500 : 400, textTransform: 'capitalize',
          }}>{t}</button>
        ))}
      </div>

      {/* Agreements Tab */}
      {tab === 'agreements' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 10, top: 10, color: '#6e6e6e' }} />
              <input type="text" placeholder="Search agreements..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '8px 8px 8px 34px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="terminated">Terminated</option>
            </select>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={selectStyle}>
              <option value="">All Types</option>
              <option value="vendor_consignment">Vendor</option>
              <option value="customer_consignment">Customer</option>
            </select>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No agreements found</div>
          ) : (
            <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #222' }}>
                    {['Agreement #', 'Type', 'Partner', 'Warehouse', 'Status', 'Period', 'Settlement', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                      <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 500 }}>{a.agreement_number}</span></td>
                      <td style={cellStyle}>{a.type === 'vendor_consignment' ? 'Vendor' : 'Customer'}</td>
                      <td style={cellStyle}>{a.partner_id?.name || '-'}</td>
                      <td style={cellStyle}>{a.warehouse_id?.name || '-'}</td>
                      <td style={cellStyle}>
                        <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[a.status]?.bg, color: statusColors[a.status]?.text }}>{a.status}</span>
                      </td>
                      <td style={cellStyle}>{new Date(a.start_date).toLocaleDateString()} - {new Date(a.end_date).toLocaleDateString()}</td>
                      <td style={cellStyle}>{a.settlement_frequency}</td>
                      <td style={cellStyle}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {a.status === 'draft' && (
                            <button onClick={() => activateAgreement(a._id)} style={smallBtnStyle} title="Activate">
                              <CheckCircle size={13} />
                            </button>
                          )}
                          {a.status === 'active' && (
                            <>
                              <button onClick={() => generateSettlement(a._id)} style={smallBtnStyle} title="Settlement">
                                <DollarSign size={13} />
                              </button>
                              <button onClick={() => terminateAgreement(a._id)} style={{ ...smallBtnStyle, color: '#bb4444' }} title="Terminate">
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={pageBtnStyle}>Prev</button>
              <span style={{ padding: '8px 12px', color: '#939393', fontSize: 14 }}>Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={pageBtnStyle}>Next</button>
            </div>
          )}
        </>
      )}

      {/* Stock Tab */}
      {tab === 'stock' && (
        <>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
          ) : stock.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>No consignment stock records. Activate an agreement first.</div>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {stock.map(s => (
                <div key={s._id} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <span style={{ fontWeight: 500, fontSize: 15 }}>{s.product_id?.name || s.product_id}</span>
                      <span style={{ color: '#6e6e6e', fontSize: 13, marginLeft: 12 }}>{s.agreement_id?.agreement_number || ''}</span>
                    </div>
                    <button onClick={() => reconcileStock(s._id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#00C971', cursor: 'pointer', fontSize: 12 }}>
                      <RefreshCw size={12} /> Reconcile
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {[
                      { label: 'On Hand', value: s.quantity_on_hand, color: '#fff' },
                      { label: 'Sold', value: s.quantity_sold, color: '#00C971' },
                      { label: 'Returned', value: s.quantity_returned, color: '#ee8833' },
                      { label: 'Last Reconciled', value: s.last_reconciled_at ? new Date(s.last_reconciled_at).toLocaleDateString() : 'Never', color: '#6e6e6e' },
                    ].map((m, i) => (
                      <div key={i}>
                        <div style={{ color: '#6e6e6e', fontSize: 12, marginBottom: 4 }}>{m.label}</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: m.color }}>{m.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Settlement Tab */}
      {tab === 'settlement' && (
        <>
          {!settlementData ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>
              Generate a settlement from an active agreement to view details here.
            </div>
          ) : (
            <div style={{ backgroundColor: '#141414', borderRadius: 8, padding: 24, border: '1px solid #222' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>Settlement: {settlementData.agreement_number}</h2>
                  <span style={{ color: '#6e6e6e', fontSize: 13 }}>Date: {new Date(settlementData.settlement_date).toLocaleDateString()}</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>
                  ${settlementData.total_amount?.toFixed(2)}
                </div>
              </div>

              {settlementData.lines?.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #222' }}>
                      {['Product', 'Qty Sold', 'Price', 'Amount', 'Commission %', 'Commission', 'Net'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#6e6e6e', fontSize: 12, fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {settlementData.lines.map((l: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={cellStyle}>{l.product_id?.name || l.product_id}</td>
                        <td style={cellStyle}>{l.quantity_sold}</td>
                        <td style={cellStyle}>${l.price?.toFixed(2)}</td>
                        <td style={cellStyle}>${l.line_amount?.toFixed(2)}</td>
                        <td style={cellStyle}>{l.commission_rate}%</td>
                        <td style={cellStyle}>${l.commission_amount?.toFixed(2)}</td>
                        <td style={{ ...cellStyle, color: '#00C971', fontWeight: 500 }}>${l.net_amount?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>New Consignment Agreement</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Type
                <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={inputStyle}>
                  <option value="vendor_consignment">Vendor Consignment</option>
                  <option value="customer_consignment">Customer Consignment</option>
                </select>
              </label>
              <label style={labelStyle}>Partner ID<input value={formData.partner_id} onChange={e => setFormData({ ...formData, partner_id: e.target.value })} style={inputStyle} /></label>
              <label style={labelStyle}>Warehouse ID<input value={formData.warehouse_id} onChange={e => setFormData({ ...formData, warehouse_id: e.target.value })} style={inputStyle} /></label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <label style={labelStyle}>Start Date<input type="date" value={formData.start_date} onChange={e => setFormData({ ...formData, start_date: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>End Date<input type="date" value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} style={inputStyle} /></label>
              </div>
              <label style={labelStyle}>Settlement Frequency
                <select value={formData.settlement_frequency} onChange={e => setFormData({ ...formData, settlement_frequency: e.target.value })} style={inputStyle}>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Biweekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                </select>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#939393' }}>
                <input type="checkbox" checked={formData.auto_replenish} onChange={e => setFormData({ ...formData, auto_replenish: e.target.checked })} />
                Auto-replenish
              </label>
              <label style={labelStyle}>Terms<textarea value={formData.terms} onChange={e => setFormData({ ...formData, terms: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={{ padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 }}>Cancel</button>
              <button onClick={createAgreement} style={{ padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '12px 16px', fontSize: 14, color: '#ccc' };
const selectStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const smallBtnStyle: React.CSSProperties = { padding: 6, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 520, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };

export default ConsignmentManagement;
