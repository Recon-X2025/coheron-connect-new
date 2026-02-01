import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Layout, ArrowRight, BarChart3, Clock, Activity } from 'lucide-react';

interface Board {
  _id: string;
  name: string;
  description: string;
  columns: { name: string; wip_limit: number; color: string; order: number }[];
  is_active: boolean;
  cards?: Card[];
  created_at: string;
}

interface Card {
  _id: string;
  board_id: string;
  column_name: string;
  product_id: any;
  quantity: number;
  priority: string;
  source_location: string;
  destination_location: string;
  status: string;
  signal_type: string;
  cycle_time_hours: number;
  created_at: string;
}

const API = '/api/manufacturing/kanban';

const priorityColors: Record<string, string> = { low: '#6e6e6e', medium: '#939393', high: '#ee8833', urgent: '#ee3333' };

function getHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` };
}

export const KanbanProduction: React.FC = () => {
  const [boards, setBoards] = useState<Board[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<Board | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showCreateCard, setShowCreateCard] = useState(false);

  const [boardForm, setBoardForm] = useState({ name: '', description: '', columns: 'Backlog,In Progress,Review,Done' });
  const [cardForm, setCardForm] = useState({ product_id: '', quantity: '', priority: 'medium', signal_type: 'production', source_location: '', destination_location: '' });

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/boards?limit=50`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setBoards(data.data || []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchBoard = async (id: string) => {
    try {
      const res = await fetch(`${API}/boards/${id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Failed to fetch board');
      setSelectedBoard(await res.json());

      const mRes = await fetch(`${API}/boards/${id}/metrics`, { headers: getHeaders() });
      if (mRes.ok) setMetrics(await mRes.json());
    } catch (e: any) { setError(e.message); }
  };

  useEffect(() => { fetchBoards(); }, [fetchBoards]);

  const createBoard = async () => {
    try {
      const cols = boardForm.columns.split(',').map((n, i) => ({ name: n.trim(), wip_limit: 0, color: '#00C971', order: i }));
      const res = await fetch(`${API}/boards`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ name: boardForm.name, description: boardForm.description, columns: cols }),
      });
      if (!res.ok) throw new Error('Failed to create');
      setShowCreateBoard(false);
      setBoardForm({ name: '', description: '', columns: 'Backlog,In Progress,Review,Done' });
      fetchBoards();
    } catch (e: any) { setError(e.message); }
  };

  const createCard = async () => {
    if (!selectedBoard) return;
    try {
      const firstCol = selectedBoard.columns[0]?.name || 'Backlog';
      const res = await fetch(`${API}/cards`, {
        method: 'POST', headers: getHeaders(),
        body: JSON.stringify({ ...cardForm, board_id: selectedBoard._id, column_name: firstCol, quantity: Number(cardForm.quantity) }),
      });
      if (!res.ok) throw new Error('Failed to create card');
      setShowCreateCard(false);
      setCardForm({ product_id: '', quantity: '', priority: 'medium', signal_type: 'production', source_location: '', destination_location: '' });
      fetchBoard(selectedBoard._id);
    } catch (e: any) { setError(e.message); }
  };

  const moveCard = async (cardId: string, columnName: string) => {
    try {
      const res = await fetch(`${API}/cards/${cardId}/move`, {
        method: 'PUT', headers: getHeaders(),
        body: JSON.stringify({ column_name: columnName }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Move failed'); }
      if (selectedBoard) fetchBoard(selectedBoard._id);
    } catch (e: any) { setError(e.message); }
  };

  // Board detail view
  if (selectedBoard) {
    const cardsByColumn: Record<string, Card[]> = {};
    for (const col of selectedBoard.columns) cardsByColumn[col.name] = [];
    for (const card of (selectedBoard.cards || [])) {
      if (cardsByColumn[card.column_name]) cardsByColumn[card.column_name].push(card);
    }

    return (
      <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <button onClick={() => setSelectedBoard(null)} style={{ background: 'none', border: 'none', color: '#939393', cursor: 'pointer', fontSize: 14, marginBottom: 8 }}>Back to Boards</button>
            <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>{selectedBoard.name}</h1>
          </div>
          <button onClick={() => setShowCreateCard(true)} style={greenBtnStyle}><Plus size={16} /> New Card</button>
        </div>

        {error && <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button></div>}

        {metrics && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Active Cards', value: metrics.total_active, icon: <Layout size={18} /> },
              { label: 'Completed', value: metrics.total_completed, icon: <Activity size={18} /> },
              { label: 'Avg Cycle Time', value: `${metrics.avg_cycle_time_hours}h`, icon: <Clock size={18} /> },
              { label: 'Throughput (7d)', value: metrics.throughput_last_7_days, icon: <BarChart3 size={18} /> },
            ].map((s, i) => (
              <div key={i} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 16, border: '1px solid #222' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6e6e6e', fontSize: 13, marginBottom: 8 }}>{s.label} {s.icon}</div>
                <div style={{ fontSize: 24, fontWeight: 600 }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
          {selectedBoard.columns.sort((a, b) => a.order - b.order).map(col => (
            <div key={col.name} style={{ minWidth: 280, backgroundColor: '#141414', borderRadius: 8, border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{col.name}</span>
                <span style={{ backgroundColor: '#222', padding: '2px 8px', borderRadius: 10, fontSize: 12, color: '#939393' }}>
                  {cardsByColumn[col.name]?.length || 0}{col.wip_limit > 0 ? `/${col.wip_limit}` : ''}
                </span>
              </div>
              <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minHeight: 100 }}>
                {(cardsByColumn[col.name] || []).map(card => {
                  const colIdx = selectedBoard.columns.findIndex(c => c.name === col.name);
                  const nextCol = selectedBoard.columns[colIdx + 1];
                  return (
                    <div key={card._id} style={{ backgroundColor: '#0a0a0a', borderRadius: 6, padding: 12, border: '1px solid #222' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ color: '#00C971', fontSize: 13, fontWeight: 500 }}>{card.product_id?.name || card.product_id}</span>
                        <span style={{ color: priorityColors[card.priority], fontSize: 11, textTransform: 'uppercase' }}>{card.priority}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#939393', marginBottom: 6 }}>
                        Qty: {card.quantity} | {card.signal_type}
                      </div>
                      {nextCol && (
                        <button onClick={() => moveCard(card._id, nextCol.name)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: 4, color: '#939393', cursor: 'pointer', fontSize: 11, width: '100%', justifyContent: 'center' }}>
                          Move to {nextCol.name} <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {showCreateCard && (
          <div style={overlayStyle}>
            <div style={modalStyle}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>New Kanban Card</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
                <label style={labelStyle}>Product ID<input value={cardForm.product_id} onChange={e => setCardForm({ ...cardForm, product_id: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Quantity<input type="number" value={cardForm.quantity} onChange={e => setCardForm({ ...cardForm, quantity: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Priority
                  <select value={cardForm.priority} onChange={e => setCardForm({ ...cardForm, priority: e.target.value })} style={inputStyle}>
                    <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </label>
                <label style={labelStyle}>Signal Type
                  <select value={cardForm.signal_type} onChange={e => setCardForm({ ...cardForm, signal_type: e.target.value })} style={inputStyle}>
                    <option value="production">Production</option><option value="withdrawal">Withdrawal</option><option value="supplier">Supplier</option>
                  </select>
                </label>
                <label style={labelStyle}>Source Location<input value={cardForm.source_location} onChange={e => setCardForm({ ...cardForm, source_location: e.target.value })} style={inputStyle} /></label>
                <label style={labelStyle}>Destination Location<input value={cardForm.destination_location} onChange={e => setCardForm({ ...cardForm, destination_location: e.target.value })} style={inputStyle} /></label>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
                <button onClick={() => setShowCreateCard(false)} style={cancelBtnStyle}>Cancel</button>
                <button onClick={createCard} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Boards list
  return (
    <div style={{ padding: 24, backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>Kanban Production</h1>
        <button onClick={() => setShowCreateBoard(true)} style={greenBtnStyle}><Plus size={16} /> New Board</button>
      </div>

      {error && <div style={{ backgroundColor: '#2a1a1a', color: '#ee4444', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}<button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#ee4444', cursor: 'pointer' }}>x</button></div>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320, 1fr))', gap: 16 }}>
          {boards.map(b => (
            <div key={b._id} onClick={() => fetchBoard(b._id)} style={{ backgroundColor: '#141414', borderRadius: 8, padding: 20, border: '1px solid #222', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{b.name}</h3>
                <span style={{ color: b.is_active ? '#00C971' : '#666', fontSize: 12 }}>{b.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              {b.description && <p style={{ margin: '0 0 12px', color: '#939393', fontSize: 13 }}>{b.description}</p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {b.columns?.map(c => (
                  <span key={c.name} style={{ padding: '2px 8px', backgroundColor: '#222', borderRadius: 4, fontSize: 11, color: '#939393' }}>{c.name}</span>
                ))}
              </div>
            </div>
          ))}
          {boards.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#6e6e6e', gridColumn: '1/-1' }}>No boards found. Create one to get started.</div>}
        </div>
      )}

      {showCreateBoard && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, paddingBottom: 16, borderBottom: '1px solid #222' }}>New Kanban Board</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 16 }}>
              <label style={labelStyle}>Name<input value={boardForm.name} onChange={e => setBoardForm({ ...boardForm, name: e.target.value })} style={inputStyle} placeholder="Production Line 1" /></label>
              <label style={labelStyle}>Description<textarea value={boardForm.description} onChange={e => setBoardForm({ ...boardForm, description: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} /></label>
              <label style={labelStyle}>Columns (comma-separated)<input value={boardForm.columns} onChange={e => setBoardForm({ ...boardForm, columns: e.target.value })} style={inputStyle} /></label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #222' }}>
              <button onClick={() => setShowCreateBoard(false)} style={cancelBtnStyle}>Cancel</button>
              <button onClick={createBoard} style={{ ...greenBtnStyle, padding: '8px 16px' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const greenBtnStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 500, fontSize: 14 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle: React.CSSProperties = { backgroundColor: '#141414', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflowY: 'auto', border: '1px solid #222' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, color: '#939393' };
const inputStyle: React.CSSProperties = { padding: '8px 12px', backgroundColor: '#0a0a0a', border: '1px solid #222', borderRadius: 6, color: '#fff', fontSize: 14, outline: 'none' };
const cancelBtnStyle: React.CSSProperties = { padding: '8px 16px', backgroundColor: '#1a1a1a', color: '#939393', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };

export default KanbanProduction;
