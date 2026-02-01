import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Beaker, Play, CheckCircle, BarChart3, FlaskConical } from 'lucide-react';

interface FormulaItem {
  _id: string;
  name: string;
  formula_number: string;
  version: number;
  output_product_id: any;
  output_quantity: number;
  output_uom: string;
  ingredients: any[];
  yield_percentage: number;
  status: string;
  created_at: string;
}

interface BatchItem {
  _id: string;
  formula_id: any;
  batch_number: string;
  planned_quantity: number;
  actual_quantity: number;
  yield_percentage: number;
  status: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

const API = '/api/manufacturing/process';

const statusColors: Record<string, { bg: string; text: string }> = {
  draft: { bg: '#1a1a2e', text: '#8888aa' },
  approved: { bg: '#1a2a1a', text: '#00C971' },
  obsolete: { bg: '#2a1a1a', text: '#bb4444' },
  planned: { bg: '#1a1a2e', text: '#8888aa' },
  in_progress: { bg: '#2a2a1a', text: '#bbbb44' },
  completed: { bg: '#1a2a1a', text: '#00C971' },
  failed: { bg: '#2a1a1a', text: '#bb4444' },
  quarantine: { bg: '#2a1a2a', text: '#bb44bb' },
};

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const ProcessManufacturing: React.FC = () => {
  const [tab, setTab] = useState<'formulas' | 'batches'>('formulas');
  const [formulas, setFormulas] = useState<FormulaItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [formulaForm, setFormulaForm] = useState({ name: '', output_product_id: '', output_quantity: '', output_uom: 'kg', yield_percentage: '100' });
  const [batchForm, setBatchForm] = useState({ formula_id: '', planned_quantity: '' });

  const fetchFormulas = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/formulas?page=${page}&limit=20`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFormulas(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page]);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/batches?page=${page}&limit=20`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBatches(data.data || []);
      setTotal(data.total || 0);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => {
    if (tab === 'formulas') fetchFormulas();
    else fetchBatches();
  }, [tab, fetchFormulas, fetchBatches]);

  const createFormula = async () => {
    try {
      const res = await fetch(`${API}/formulas`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...formulaForm, output_quantity: Number(formulaForm.output_quantity), yield_percentage: Number(formulaForm.yield_percentage) }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreate(false);
      setFormulaForm({ name: '', output_product_id: '', output_quantity: '', output_uom: 'kg', yield_percentage: '100' });
      fetchFormulas();
    } catch (e: any) { setError(e.message); }
  };

  const createBatch = async () => {
    try {
      const res = await fetch(`${API}/batches`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ formula_id: batchForm.formula_id, planned_quantity: Number(batchForm.planned_quantity) }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreate(false);
      setBatchForm({ formula_id: '', planned_quantity: '' });
      fetchBatches();
    } catch (e: any) { setError(e.message); }
  };

  const batchAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`${API}/batches/${id}/${action}`, { method: 'POST', headers: getHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      fetchBatches();
    } catch (e: any) { setError(e.message); }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Process Manufacturing</h1>
        <button onClick={() => setShowCreate(true)} style={greenBtnStyle}><Plus size={16} /> {tab === 'formulas' ? 'New Formula' : 'New Batch'}</button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>
          {error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid #222' }}>
        {(['formulas', 'batches'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setPage(1); }} style={{ padding: '10px 20px', backgroundColor: 'transparent', border: 'none', borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', color: tab === t ? '#fff' : '#6e6e6e', cursor: 'pointer', fontSize: 14, fontWeight: 500 }}>
            {t === 'formulas' ? 'Formulas' : 'Batch Records'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : tab === 'formulas' ? (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #222' }}>
              {['Formula #', 'Name', 'Output', 'Qty', 'UOM', 'Yield %', 'Ingredients', 'Status'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {formulas.map(f => (
                <tr key={f._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 500 }}>{f.formula_number}</span></td>
                  <td style={cellStyle}>{f.name}</td>
                  <td style={cellStyle}>{f.output_product_id?.name || '-'}</td>
                  <td style={cellStyle}>{f.output_quantity}</td>
                  <td style={cellStyle}>{f.output_uom}</td>
                  <td style={cellStyle}>{f.yield_percentage}%</td>
                  <td style={cellStyle}>{f.ingredients?.length || 0}</td>
                  <td style={cellStyle}><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[f.status]?.bg, color: statusColors[f.status]?.text }}>{f.status}</span></td>
                </tr>
              ))}
              {formulas.length === 0 && <tr><td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#6e6e6e' }}>No formulas found</td></tr>}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ borderBottom: '1px solid #222' }}>
              {['Batch #', 'Formula', 'Planned', 'Actual', 'Yield %', 'Status', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {batches.map(b => (
                <tr key={b._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                  <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 500 }}>{b.batch_number}</span></td>
                  <td style={cellStyle}>{b.formula_id?.name || b.formula_id?.formula_number || '-'}</td>
                  <td style={cellStyle}>{b.planned_quantity}</td>
                  <td style={cellStyle}>{b.actual_quantity || '-'}</td>
                  <td style={cellStyle}>{b.yield_percentage > 0 ? `${b.yield_percentage.toFixed(1)}%` : '-'}</td>
                  <td style={cellStyle}><span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, backgroundColor: statusColors[b.status]?.bg, color: statusColors[b.status]?.text }}>{b.status.replace('_', ' ')}</span></td>
                  <td style={cellStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {b.status === 'planned' && <button onClick={() => batchAction(b._id, 'start')} style={smallBtnStyle} title="Start"><Play size={13} /></button>}
                      {b.status === 'in_progress' && <button onClick={() => batchAction(b._id, 'complete')} style={smallBtnStyle} title="Complete"><CheckCircle size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && <tr><td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#6e6e6e' }}>No batch records found</td></tr>}
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

      {showCreate && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>
              {tab === 'formulas' ? 'New Formula' : 'New Batch Record'}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              {tab === 'formulas' ? (<>
                <label style={labelStyle}>Name<input value={formulaForm.name} onChange={e => setFormulaForm({ ...formulaForm, name: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Output Product ID<input value={formulaForm.output_product_id} onChange={e => setFormulaForm({ ...formulaForm, output_product_id: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Output Quantity<input type="number" value={formulaForm.output_quantity} onChange={e => setFormulaForm({ ...formulaForm, output_quantity: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Output UOM<input value={formulaForm.output_uom} onChange={e => setFormulaForm({ ...formulaForm, output_uom: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Expected Yield %<input type="number" value={formulaForm.yield_percentage} onChange={e => setFormulaForm({ ...formulaForm, yield_percentage: e.target.value })} style={inputStyle} /></label>
              </>) : (<>
                <label style={labelStyle}>Formula ID<input value={batchForm.formula_id} onChange={e => setBatchForm({ ...batchForm, formula_id: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Planned Quantity<input type="number" value={batchForm.planned_quantity} onChange={e => setBatchForm({ ...batchForm, planned_quantity: e.target.value })} style={inputStyle} /></label>
              </>)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreate(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={tab === 'formulas' ? createFormula : createBatch} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Create</button>
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
const smallBtnStyle: React.CSSProperties = { padding: 6, backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', display: 'flex', alignItems: 'center' };
const pageBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#141414', border: '1px solid #222', borderRadius: 6, color: '#939393', cursor: 'pointer', fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

export default ProcessManufacturing;
