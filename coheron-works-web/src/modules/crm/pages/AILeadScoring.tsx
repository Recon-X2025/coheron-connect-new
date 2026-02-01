import { useState, useEffect } from 'react';
import { Brain, RefreshCw, Trophy, BarChart3, Search } from 'lucide-react';

const API_BASE = '/api/crm/ai-scoring';
const getToken = () => localStorage.getItem('token') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

const gradeColors: Record<string, string> = { A: '#22c55e', B: '#3b82f6', C: '#eab308', D: '#f97316', F: '#ef4444' };

export const AILeadScoring: React.FC = () => {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [_config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [scoring, setScoring] = useState(false);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [lb, cfg] = await Promise.all([apiFetch('/leaderboard?limit=50'), apiFetch('/')]);
      setLeaderboard(lb);
      setConfig(cfg);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const scoreBatch = async () => {
    setScoring(true);
    try {
      await apiFetch('/score-batch', { method: 'POST', body: JSON.stringify({}) });
      await loadData();
    } catch (e) { console.error(e); }
    setScoring(false);
  };

  const filtered = leaderboard.filter(l =>
    !search || (l.name || '').toLowerCase().includes(search.toLowerCase()) || (l.company_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: leaderboard.length,
    avgScore: leaderboard.length ? Math.round(leaderboard.reduce((s, l) => s + (l.score || 0), 0) / leaderboard.length) : 0,
    gradeA: leaderboard.filter(l => l.score_grade === 'A').length,
    gradeB: leaderboard.filter(l => l.score_grade === 'B').length,
  };

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Brain size={28} color="#a78bfa" />
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>AI Lead Scoring</h1>
        </div>
        <button onClick={scoreBatch} disabled={scoring} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', opacity: scoring ? 0.6 : 1 }}>
          <RefreshCw size={16} className={scoring ? 'animate-spin' : ''} />
          {scoring ? 'Scoring...' : 'Score All Leads'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Scored', value: stats.total, icon: <BarChart3 size={20} color="#60a5fa" />, bg: '#1e3a5f' },
          { label: 'Avg Score', value: stats.avgScore, icon: <Brain size={20} color="#a78bfa" />, bg: '#3b1f6e' },
          { label: 'Grade A', value: stats.gradeA, icon: <Trophy size={20} color="#22c55e" />, bg: '#14532d' },
          { label: 'Grade B', value: stats.gradeB, icon: <Trophy size={20} color="#3b82f6" />, bg: '#1e3a5f' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, borderRadius: 12, padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>{s.icon}<span style={{ color: '#94a3b8', fontSize: 13 }}>{s.label}</span></div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 400 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: 12, color: '#64748b' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..." style={{ width: '100%', padding: '10px 10px 10px 36px', background: '#1a1a2e', border: '1px solid #334155', borderRadius: 8, color: '#fff', fontSize: 14 }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>
      ) : (
        <div style={{ background: '#111827', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1f2937' }}>
                {['Rank', 'Lead', 'Score', 'Grade', 'Demographic', 'Behavioral', 'Engagement', 'Recency', 'Stage', 'Revenue'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#94a3b8', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr key={lead._id || i} style={{ borderBottom: '1px solid #1f2937' }}>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>{i + 1}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{lead.name || 'Unnamed'}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{lead.email}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 60, height: 6, background: '#1f2937', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${lead.score || 0}%`, height: '100%', background: gradeColors[lead.score_grade] || '#64748b', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontWeight: 600 }}>{lead.score || 0}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 700, background: gradeColors[lead.score_grade] || '#374151', color: '#fff' }}>{lead.score_grade || '-'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{lead.score_breakdown?.demographic || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{lead.score_breakdown?.behavioral || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{lead.score_breakdown?.engagement || 0}</td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>{lead.score_breakdown?.recency || 0}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: '#1f2937', color: '#94a3b8' }}>{lead.stage || '-'}</span>
                  </td>
                  <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 600 }}>{lead.expected_revenue ? `$${lead.expected_revenue.toLocaleString()}` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!filtered.length && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No scored leads found</div>}
        </div>
      )}
    </div>
  );
};

export default AILeadScoring;
