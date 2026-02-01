import { useState, useEffect } from 'react';
import { Search, Globe, TrendingUp, TrendingDown, AlertTriangle, Plus, BarChart3, Zap, ArrowUp, ArrowDown } from 'lucide-react';

interface Audit { _id: string; url: string; audit_date: string; scores: any; issues: any[]; page_speed: any; status: string; }
interface Keyword { _id: string; keyword: string; search_volume: number; difficulty: number; current_position: number; previous_position: number; position_change: number; target_url: string; status: string; cpc: number; competition: string; }
interface Dashboard { keywords: { total: number; ranking: number; top_10: number; top_3: number }; avg_seo_score: number; recent_audits: Audit[]; }

const API = '/api/marketing/seo';
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token') || ''}` });

export const SEOTools = () => {
  const [tab, setTab] = useState<'dashboard' | 'audits' | 'keywords'>('dashboard');
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [showAudit, setShowAudit] = useState(false);
  const [showKeyword, setShowKeyword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [auditForm, setAuditForm] = useState({ url: '' });
  const [kwForm, setKwForm] = useState({ keyword: '', search_volume: 0, difficulty: 50, target_url: '', cpc: 0, competition: 'medium' });

  useEffect(() => { loadDash(); loadAudits(); loadKeywords(); }, []);

  const loadDash = async () => { try { const r = await fetch(`${API}/dashboard`, { headers: headers() }); if (r.ok) setDash(await r.json()); } catch (e) { console.error(e); } };
  const loadAudits = async () => { try { const r = await fetch(`${API}/audits`, { headers: headers() }); if (r.ok) setAudits(await r.json()); } catch (e) { console.error(e); } };
  const loadKeywords = async () => { try { const r = await fetch(`${API}/keywords`, { headers: headers() }); if (r.ok) setKeywords(await r.json()); } catch (e) { console.error(e); } };

  const createAudit = async () => { setLoading(true); try { const r = await fetch(`${API}/audits`, { method: 'POST', headers: headers(), body: JSON.stringify(auditForm) }); if (r.ok) { setShowAudit(false); loadAudits(); loadDash(); } } catch (e) { console.error(e); } setLoading(false); };
  const runAudit = async (id: string) => { try { await fetch(`${API}/audits/${id}/run`, { method: 'POST', headers: headers() }); loadAudits(); loadDash(); } catch (e) { console.error(e); } };
  const createKeyword = async () => { setLoading(true); try { const r = await fetch(`${API}/keywords`, { method: 'POST', headers: headers(), body: JSON.stringify(kwForm) }); if (r.ok) { setShowKeyword(false); loadKeywords(); loadDash(); } } catch (e) { console.error(e); } setLoading(false); };
  const deleteKeyword = async (id: string) => { if (!confirm('Delete?')) return; try { await fetch(`${API}/keywords/${id}`, { method: 'DELETE', headers: headers() }); loadKeywords(); } catch (e) { console.error(e); } };

  const scoreColor = (s: number) => s >= 80 ? '#00C971' : s >= 60 ? '#f59e0b' : '#ef4444';
  const diffColor = (d: number) => d >= 70 ? '#ef4444' : d >= 40 ? '#f59e0b' : '#00C971';

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>SEO Tools</h1>
            <p style={{ color: '#939393', margin: '4px 0 0' }}>Site audits, keyword tracking, and search performance</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {tab === 'audits' && <button onClick={() => setShowAudit(true)} style={btnPrimary}><Plus size={16} /> New Audit</button>}
            {tab === 'keywords' && <button onClick={() => setShowKeyword(true)} style={btnPrimary}><Plus size={16} /> Add Keyword</button>}
          </div>
        </div>

        {dash && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Avg SEO Score', value: dash.avg_seo_score, icon: <BarChart3 size={20} />, color: scoreColor(dash.avg_seo_score) },
              { label: 'Keywords Tracked', value: dash.keywords.total, icon: <Search size={20} />, color: '#3b82f6' },
              { label: 'Ranking', value: dash.keywords.ranking, icon: <TrendingUp size={20} />, color: '#00C971' },
              { label: 'Top 10', value: dash.keywords.top_10, icon: <Globe size={20} />, color: '#8b5cf6' },
              { label: 'Top 3', value: dash.keywords.top_3, icon: <Zap size={20} />, color: '#f59e0b' },
            ].map((s, i) => (
              <div key={i} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: s.color }}>{s.icon}</div>
                  <div><div style={{ fontSize: 24, fontWeight: 700 }}>{s.value}</div><div style={{ color: '#939393', fontSize: 13 }}>{s.label}</div></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #262626' }}>
          {(['dashboard', 'audits', 'keywords'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 16px', background: 'transparent', border: 'none', color: tab === t ? '#00C971' : '#939393', cursor: 'pointer', fontSize: 14, fontWeight: 500, borderBottom: tab === t ? '2px solid #00C971' : '2px solid transparent', textTransform: 'capitalize' }}>{t === 'dashboard' ? 'Overview' : t}</button>
          ))}
        </div>

        {tab === 'dashboard' && dash && (
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Recent Audits</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {dash.recent_audits.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No audits yet. Create one to get started.</div>}
              {dash.recent_audits.map(a => (
                <div key={a._id} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{a.url}</div>
                    <div style={{ color: '#939393', fontSize: 13 }}>{new Date(a.audit_date).toLocaleDateString()} | {a.status}</div>
                  </div>
                  {a.scores && (
                    <div style={{ display: 'flex', gap: 16 }}>
                      {Object.entries(a.scores).map(([k, v]) => (
                        <div key={k} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(v as number) }}>{v as number}</div>
                          <div style={{ color: '#939393', fontSize: 11, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'audits' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {audits.length === 0 && <div style={{ background: '#141414', borderRadius: 8, padding: 40, border: '1px solid #262626', textAlign: 'center', color: '#939393' }}>No audits yet.</div>}
            {audits.map(a => (
              <div key={a._id} style={{ background: '#141414', borderRadius: 8, padding: 20, border: '1px solid #262626' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{a.url}</div>
                    <div style={{ color: '#939393', fontSize: 13 }}>{new Date(a.audit_date).toLocaleDateString()} | Status: {a.status}</div>
                  </div>
                  <button onClick={() => runAudit(a._id)} style={{ ...smallBtn, color: '#00C971' }}><Zap size={12} /> Run Audit</button>
                </div>
                {a.scores && a.status === 'completed' && (
                  <>
                    <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                      {Object.entries(a.scores).map(([k, v]) => (
                        <div key={k} style={{ background: '#0a0a0a', borderRadius: 6, padding: '8px 16px', textAlign: 'center', flex: 1 }}>
                          <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor(v as number) }}>{v as number}</div>
                          <div style={{ color: '#939393', fontSize: 11, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                        </div>
                      ))}
                    </div>
                    {a.issues?.length > 0 && (
                      <div>
                        <div style={{ color: '#939393', fontSize: 12, marginBottom: 8, fontWeight: 600 }}>Issues ({a.issues.length})</div>
                        {a.issues.slice(0, 3).map((issue: any, i: number) => (
                          <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 0', borderTop: '1px solid #1a1a1a' }}>
                            <AlertTriangle size={14} style={{ color: issue.type === 'error' ? '#ef4444' : issue.type === 'warning' ? '#f59e0b' : '#3b82f6' }} />
                            <span style={{ fontSize: 13 }}>{issue.description}</span>
                            <span style={{ ...tagStyle, background: '#1e1b4b', color: '#8b5cf6', marginLeft: 'auto' }}>{issue.category}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'keywords' && (
          <div style={{ background: '#141414', borderRadius: 8, border: '1px solid #262626', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ borderBottom: '1px solid #262626' }}>
                {['Keyword', 'Volume', 'Difficulty', 'Position', 'Change', 'CPC', 'Competition', 'Actions'].map(h => <th key={h} style={thStyle}>{h}</th>)}
              </tr></thead>
              <tbody>
                {keywords.length === 0 && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#939393' }}>No keywords tracked yet.</td></tr>}
                {keywords.map(kw => (
                  <tr key={kw._id} style={{ borderBottom: '1px solid #1a1a1a' }}>
                    <td style={cellStyle}><span style={{ fontWeight: 500 }}>{kw.keyword}</span></td>
                    <td style={cellStyle}>{kw.search_volume.toLocaleString()}</td>
                    <td style={cellStyle}><span style={{ color: diffColor(kw.difficulty), fontWeight: 500 }}>{kw.difficulty}</span></td>
                    <td style={cellStyle}>{kw.current_position || '-'}</td>
                    <td style={cellStyle}>
                      {kw.position_change !== 0 && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, color: kw.position_change > 0 ? '#00C971' : '#ef4444' }}>
                          {kw.position_change > 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                          {Math.abs(kw.position_change)}
                        </span>
                      )}
                      {kw.position_change === 0 && <span style={{ color: '#939393' }}>-</span>}
                    </td>
                    <td style={cellStyle}>${kw.cpc.toFixed(2)}</td>
                    <td style={cellStyle}><span style={{ ...tagStyle, background: kw.competition === 'low' ? '#052e16' : kw.competition === 'high' ? '#450a0a' : '#1e1b4b', color: kw.competition === 'low' ? '#00C971' : kw.competition === 'high' ? '#ef4444' : '#8b5cf6' }}>{kw.competition}</span></td>
                    <td style={cellStyle}><button onClick={() => deleteKeyword(kw._id)} style={{ ...smallBtn, color: '#ef4444' }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showAudit && (
          <div style={overlayStyle} onClick={() => setShowAudit(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>New SEO Audit</h2>
              <div style={fieldStyle}><label style={labelStyle}>URL *</label><input style={inputStyle} value={auditForm.url} onChange={e => setAuditForm({ url: e.target.value })} placeholder="https://example.com" /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowAudit(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createAudit} disabled={loading || !auditForm.url} style={btnPrimary}>{loading ? 'Creating...' : 'Create & Run'}</button>
              </div>
            </div>
          </div>
        )}

        {showKeyword && (
          <div style={overlayStyle} onClick={() => setShowKeyword(false)}>
            <div style={dialogStyle} onClick={e => e.stopPropagation()}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>Add Keyword</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={fieldStyle}><label style={labelStyle}>Keyword *</label><input style={inputStyle} value={kwForm.keyword} onChange={e => setKwForm({ ...kwForm, keyword: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Search Volume</label><input style={inputStyle} type="number" value={kwForm.search_volume} onChange={e => setKwForm({ ...kwForm, search_volume: parseInt(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Difficulty (0-100)</label><input style={inputStyle} type="number" min={0} max={100} value={kwForm.difficulty} onChange={e => setKwForm({ ...kwForm, difficulty: parseInt(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>CPC ($)</label><input style={inputStyle} type="number" step="0.01" value={kwForm.cpc} onChange={e => setKwForm({ ...kwForm, cpc: parseFloat(e.target.value) || 0 })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Target URL</label><input style={inputStyle} value={kwForm.target_url} onChange={e => setKwForm({ ...kwForm, target_url: e.target.value })} /></div>
                <div style={fieldStyle}><label style={labelStyle}>Competition</label><select style={inputStyle} value={kwForm.competition} onChange={e => setKwForm({ ...kwForm, competition: e.target.value })}>{['low', 'medium', 'high'].map(o => <option key={o} value={o}>{o}</option>)}</select></div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24 }}>
                <button onClick={() => setShowKeyword(false)} style={btnSecondary}>Cancel</button>
                <button onClick={createKeyword} disabled={loading || !kwForm.keyword} style={btnPrimary}>{loading ? 'Adding...' : 'Add'}</button>
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

export default SEOTools;
