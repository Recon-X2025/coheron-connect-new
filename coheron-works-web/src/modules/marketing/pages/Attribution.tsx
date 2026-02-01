import { useState, useEffect } from 'react';
import { GitBranch, BarChart3, DollarSign, MousePointer, Plus, Zap, TrendingUp } from 'lucide-react';

interface Model { _id: string; name: string; type: string; config: any; is_default: boolean; created_at: string; }
interface ChannelPerf { channel: string; touchpoints: number; total_revenue: number; unique_contacts: number; }
interface CampaignROI { campaign: string; touchpoints: number; total_revenue: number; unique_contacts: number; }

const API = '/api/marketing/attribution';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

export const Attribution = () => {
  const [tab, setTab] = useState<'models' | 'channels' | 'campaigns'>('models');
  const [models, setModels] = useState<Model[]>([]);
  const [channels, setChannels] = useState<ChannelPerf[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignROI[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'linear', is_default: false, config: { lookback_window_days: 30 } });

  useEffect(() => { loadModels(); loadChannels(); loadCampaigns(); }, []);

  const loadModels = async () => { try { const r = await fetch(`${API}/models`, { headers: headers() }); if (r.ok) setModels(await r.json()); } catch (e) { console.error(e); } };
  const loadChannels = async () => { try { const r = await fetch(`${API}/channel-performance`, { headers: headers() }); if (r.ok) setChannels(await r.json()); } catch (e) { console.error(e); } };
  const loadCampaigns = async () => { try { const r = await fetch(`${API}/campaign-roi`, { headers: headers() }); if (r.ok) setCampaigns(await r.json()); } catch (e) { console.error(e); } };

  const createModel = async () => { setLoading(true); try { const r = await fetch(`${API}/models`, { method: 'POST', headers: headers(), body: JSON.stringify(form) }); if (r.ok) { setShowCreate(false); loadModels(); } } catch (e) { console.error(e); } setLoading(false); };
  const deleteModel = async (id: string) => { if (!confirm('Delete?')) return; try { await fetch(`${API}/models/${id}`, { method: 'DELETE', headers: headers() }); loadModels(); } catch (e) { console.error(e); } };
  const runCalculation = async (modelId: string) => { try { const r = await fetch(`${API}/calculate`, { method: 'POST', headers: headers(), body: JSON.stringify({ model_id: modelId }) }); if (r.ok) { const result = await r.json(); alert(`Attribution calculated: ${result.touchpoints_updated} touchpoints updated`); loadChannels(); loadCampaigns(); } } catch (e) { console.error(e); } };

  const typeLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const maxRevenue = Math.max(...channels.map(c => c.total_revenue), 1);

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Multi-Touch Attribution</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Understand which channels and campaigns drive revenue</p>
          </div>
          {tab === 'models' && <button onClick={() => setShowCreate(true)} style={btnPrimary}><Plus size={16} /> New Model</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Attribution Models', value: models.length, icon: <GitBranch size={20} />, color: '#3b82f6' },
            { label: 'Channels Tracked', value: channels.length, icon: <MousePointer size={20} />, color: '#00C971' },
            { label: 'Total Revenue', value: `$${channels.reduce((s, c) => s + c.total_revenue, 0).toLocaleString()}`, icon: <DollarSign size={20} />, color: '#f59e0b' },
            { label: 'Campaigns', value: campaigns.length, icon: <TrendingUp size={20} />, color: '#8b5cf6' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ color: s.color }}>{s.icon}</div>
                <div><div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div><div style={{ color: '#939393', fontSize: 13 }}>{s.label}</div></div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #262626' }}>
          {(['models', 'channels', 'campaigns'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: tab === t ? '#00C971' : '#939393', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', textTransform: 'capitalize' }}>{t === 'channels' ? 'Channel Performance' : t === 'campaigns' ? 'Campaign ROI' : t}</button>
          ))}
        </div>

        {tab === 'models' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {models.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No attribution models yet.</div>}
            {models.map(m => (
              <div key={m._id} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: 15 }}>{m.name}</span>
                    {m.is_default && <span style={{ ...tagStyle, background: '#052e16', color: '#00C971' }}>Default</span>}
                  </div>
                  <div style={{ color: '#939393', fontSize: 13, marginTop: 4 }}>Type: {typeLabel(m.type)} | Lookback: {m.config?.lookback_window_days || 30} days</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => runCalculation(m._id)} style={{ ...smallBtn, color: '#00C971' }}><Zap size={12} /> Calculate</button>
                  <button onClick={() => deleteModel(m._id)} style={{ ...smallBtn, color: '#ef4444' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'channels' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {channels.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No channel data yet.</div>}
            {channels.map(c => (
              <div key={c.channel} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 600 }}>{c.channel || 'Direct'}</span>
                  <span style={{ color: '#00C971', fontWeight: 600 }}>${c.total_revenue.toLocaleString()}</span>
                </div>
                <div style={{ background: '#262626', borderRadius: 4, height: 8, marginBottom: 8 }}>
                  <div style={{ background: '#00C971', borderRadius: 4, height: 8, width: `${(c.total_revenue / maxRevenue) * 100}%` }} />
                </div>
                <div style={{ display: 'flex', gap: 24, color: '#939393', fontSize: 13 }}>
                  <span>Touchpoints: {c.touchpoints}</span>
                  <span>Contacts: {c.unique_contacts}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'campaigns' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Campaign', 'Touchpoints', 'Contacts', 'Revenue'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {campaigns.length === 0 && <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No campaign data yet.</td></tr>}
                {campaigns.map(c => (
                  <tr key={c.campaign} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}>{c.campaign}</td>
                    <td style={cellStyle}>{c.touchpoints}</td>
                    <td style={cellStyle}>{c.unique_contacts}</td>
                    <td style={cellStyle}><span style={{ color: '#00C971', fontWeight: 600 }}>${c.total_revenue.toLocaleString()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div style={overlayStyle} onClick={() => setShowCreate(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New Attribution Model</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Name *</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Type</label><select style={inputStyle} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>{['first_touch', 'last_touch', 'linear', 'time_decay', 'u_shaped', 'w_shaped', 'custom'].map(o => <option key={o} value={o}>{typeLabel(o)}</option>)}</select></div>
                <div style={fieldStyle}><label style={labelStyle}>Lookback Window (days)</label><input style={inputStyle} type="number" value={form.config.lookback_window_days} onChange={e => setForm({ ...form, config: { ...form.config, lookback_window_days: parseInt(e.target.value) || 30 } })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Default Model</label><select style={inputStyle} value={form.is_default ? 'yes' : 'no'} onChange={e => setForm({ ...form, is_default: e.target.value === 'yes' })}><option value="no">No</option><option value="yes">Yes</option></select></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createModel} disabled={loading || !form.name} style={btnPrimary}>{loading ? 'Creating...' : 'Create'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const cellStyle: React.CSSProperties = { padding: '10px 16px', fontSize: 13, color: '#e5e5e5' };
const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#939393', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' };
const tagStyle: React.CSSProperties = { borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 500 };
const btnPrimary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#00C971', color: '#000', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const btnSecondary: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#1a1a1a', color: '#fff', border: '1px solid #333', borderRadius: 6, cursor: 'pointer', fontSize: 14 };
const smallBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #333', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', color: '#939393', fontSize: 12 };
const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const dialogStyle: React.CSSProperties = { background: '#141414', border: '1px solid #262626', borderRadius: 12, padding: 32, width: 600, maxHeight: '90vh', overflowY: 'auto' };
const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
const labelStyle: React.CSSProperties = { color: '#939393', fontSize: 13, fontWeight: 500 };
const inputStyle: React.CSSProperties = { background: '#0a0a0a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' };

export default Attribution;
