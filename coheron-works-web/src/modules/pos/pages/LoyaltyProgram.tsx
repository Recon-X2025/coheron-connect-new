import { useState, useEffect } from 'react';
import { Gift, Plus, Star, Trophy, Coins } from 'lucide-react';

const API_BASE = '/api/pos/loyalty';
const getToken = () => localStorage.getItem('authToken') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) } });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

export const LoyaltyProgram: React.FC = () => {
  const [programs, setPrograms] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [tab, setTab] = useState<'programs' | 'tiers'>('programs');
  const [showModal, setShowModal] = useState(false);
  const [showTierModal, setShowTierModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', points_per_currency: 1, currency: 'USD' });
  const [tierForm, setTierForm] = useState({ program_id: '', name: '', min_points: 0, multiplier: 1, color: '#00C971' });

  const loadPrograms = async () => {
    try { setPrograms(await apiFetch('/programs')); } catch (e) { console.error(e); }
  };
  const loadTiers = async () => {
    try { setTiers(await apiFetch('/tiers')); } catch (e) { console.error(e); }
  };

  useEffect(() => { loadPrograms(); loadTiers(); }, []);

  const handleCreateProgram = async () => {
    try { await apiFetch('/programs', { method: 'POST', body: JSON.stringify(form) }); setShowModal(false); loadPrograms(); } catch (e) { console.error(e); }
  };
  const handleCreateTier = async () => {
    try { await apiFetch('/tiers', { method: 'POST', body: JSON.stringify(tierForm) }); setShowTierModal(false); loadTiers(); } catch (e) { console.error(e); }
  };

  const cardStyle = { background: '#141414', borderRadius: 12, padding: 20, border: '1px solid #222' };
  const tabStyle = (active: boolean) => ({ padding: '10px 20px', background: active ? '#00C971' : '#222', color: active ? '#000' : '#aaa', border: 'none', borderRadius: 8, fontWeight: 600 as const, cursor: 'pointer' as const, fontSize: 14 });

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gift size={28} color="#00C971" /> Loyalty & Rewards
          </h1>
          <p style={{ color: '#888', margin: '4px 0 0' }}>Manage loyalty programs, tiers, and customer rewards</p>
        </div>
        <button onClick={() => tab === 'programs' ? setShowModal(true) : setShowTierModal(true)} style={{ background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={18} /> {tab === 'programs' ? 'New Program' : 'New Tier'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Programs', value: programs.length, icon: <Star size={20} color="#00C971" /> },
          { label: 'Active Programs', value: programs.filter(p => p.is_active).length, icon: <Trophy size={20} color="#f59e0b" /> },
          { label: 'Tiers', value: tiers.length, icon: <Coins size={20} color="#3b82f6" /> },
        ].map((s, i) => (
          <div key={i} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ color: '#888', fontSize: 13 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
              </div>
              {s.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button onClick={() => setTab('programs')} style={tabStyle(tab === 'programs')}>Programs</button>
        <button onClick={() => setTab('tiers')} style={tabStyle(tab === 'tiers')}>Tiers</button>
      </div>

      {tab === 'programs' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {programs.map((p: any) => (
            <div key={p._id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 18 }}>{p.name}</h3>
                <span style={{ background: p.is_active ? '#00C97122' : '#66666622', color: p.is_active ? '#00C971' : '#666', padding: '3px 10px', borderRadius: 6, fontSize: 12 }}>{p.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <p style={{ color: '#888', fontSize: 13, margin: '0 0 10px' }}>{p.description || 'No description'}</p>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <span style={{ color: '#aaa' }}>{p.points_per_currency} pts/{p.currency}</span>
              </div>
            </div>
          ))}
          {programs.length === 0 && <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>No programs yet</div>}
        </div>
      )}

      {tab === 'tiers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {tiers.map((t: any) => (
            <div key={t._id} style={{ ...cardStyle, borderLeft: `4px solid ${t.color || '#00C971'}` }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{t.name}</h3>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>Min Points: {t.min_points}</div>
              <div style={{ fontSize: 13, color: '#aaa', marginBottom: 6 }}>Multiplier: {t.multiplier}x</div>
              {t.benefits?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {t.benefits.map((b: any, i: number) => (
                    <div key={i} style={{ fontSize: 12, color: '#888', marginTop: 2 }}>-- {b.description}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {tiers.length === 0 && <div style={{ color: '#666', padding: 40, textAlign: 'center' }}>No tiers yet</div>}
        </div>
      )}

      {/* Program Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 24, width: 420, border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>New Loyalty Program</h2>
            {[
              { label: 'Name', key: 'name', type: 'text' },
              { label: 'Description', key: 'description', type: 'text' },
              { label: 'Points per Currency Unit', key: 'points_per_currency', type: 'number' },
              { label: 'Currency', key: 'currency', type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>{f.label}</label>
                <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '8px 18px', background: '#333', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateProgram} style={{ padding: '8px 18px', background: '#00C971', border: 'none', borderRadius: 6, color: '#000', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 24, width: 420, border: '1px solid #333' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>New Tier</h2>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>Program</label>
              <select value={tierForm.program_id} onChange={e => setTierForm({ ...tierForm, program_id: e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }}>
                <option value="">Select...</option>
                {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
            </div>
            {[
              { label: 'Tier Name', key: 'name', type: 'text' },
              { label: 'Min Points', key: 'min_points', type: 'number' },
              { label: 'Multiplier', key: 'multiplier', type: 'number' },
              { label: 'Color', key: 'color', type: 'color' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 4, color: '#aaa', fontSize: 13 }}>{f.label}</label>
                <input type={f.type} value={(tierForm as any)[f.key]} onChange={e => setTierForm({ ...tierForm, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })} style={{ width: '100%', padding: 8, background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, color: '#fff' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTierModal(false)} style={{ padding: '8px 18px', background: '#333', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCreateTier} style={{ padding: '8px 18px', background: '#00C971', border: 'none', borderRadius: 6, color: '#000', fontWeight: 600, cursor: 'pointer' }}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoyaltyProgram;
