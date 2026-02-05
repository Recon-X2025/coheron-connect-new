import { useState, useEffect } from 'react';
import {
  Clock, AlertTriangle, TrendingUp, Users, Settings, Shield,
} from 'lucide-react';

const TOKEN = localStorage.getItem('authToken') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
const apiFetch = (url: string, opts?: any) => fetch(url, { headers, ...opts });

interface Prediction { ticket_id: string; subject: string; priority: string; agent: string; breach_probability: number; remaining_ms: number; percent_elapsed: number; risk_level: string; }
interface Trend { date: string; total_tickets: number; compliant: number; breached: number; compliance_rate: number; }
interface TeamPerf { team: string; total_tickets: number; compliant: number; breached: number; avg_resolution_hours: number; compliance_rate: number; }
interface AgentPerf { agent: string; total_tickets: number; compliant: number; breached: number; avg_resolution_hours: number; compliance_rate: number; }
interface AlertConfig { warning_threshold_percent: number; critical_threshold_percent: number; notify_agents: boolean; notify_managers: boolean; email_enabled: boolean; }

type Tab = 'at-risk' | 'predictions' | 'trends' | 'performance' | 'settings';

const riskColor: Record<string, string> = { critical: '#f44336', high: '#ff9800', medium: '#2196f3', low: '#4caf50' };

export const SLAPrediction: React.FC = () => {
  const [tab, setTab] = useState<Tab>('at-risk');
  const [atRisk, setAtRisk] = useState<Prediction[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [teamPerf, setTeamPerf] = useState<TeamPerf[]>([]);
  const [agentPerf, setAgentPerf] = useState<AgentPerf[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({ warning_threshold_percent: 75, critical_threshold_percent: 90, notify_agents: true, notify_managers: true, email_enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadTab(tab); }, [tab]);

  const loadTab = async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'at-risk') {
        const res = await apiFetch('/api/support/sla-prediction/at-risk');
        if (res.ok) { const d = await res.json(); setAtRisk(d.tickets || []); }
      } else if (t === 'predictions') {
        const res = await apiFetch('/api/support/sla-prediction/predictions');
        if (res.ok) setPredictions(await res.json());
      } else if (t === 'trends') {
        const res = await apiFetch('/api/support/sla-prediction/trends');
        if (res.ok) setTrends(await res.json());
      } else if (t === 'performance') {
        const res = await apiFetch('/api/support/sla-prediction/team-performance');
        if (res.ok) { const d = await res.json(); setTeamPerf(d.teams || []); setAgentPerf(d.agents || []); }
      } else if (t === 'settings') {
        const res = await apiFetch('/api/support/sla-prediction/alerts/config');
        if (res.ok) setAlertConfig(await res.json());
      }
    } catch {}
    setLoading(false);
  };

  const saveAlertConfig = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/support/sla-prediction/alerts/configure', { method: 'POST', body: JSON.stringify(alertConfig) });
      if (res.ok) setAlertConfig(await res.json());
    } catch {}
    setSaving(false);
  };

  const formatTime = (ms: number) => {
    if (ms <= 0) return 'Breached';
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  };

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 } as React.CSSProperties,
    card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 12 } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    tab: (active: boolean) => ({ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: active ? 600 : 400, background: active ? '#00C971' : '#1e1e1e', color: active ? '#000' : '#fff', border: active ? '1px solid #00C971' : '1px solid #333' }) as React.CSSProperties,
    badge: (color: string) => ({ background: color + '22', color, borderRadius: 12, padding: '2px 8px', fontSize: 11, fontWeight: 600 }) as React.CSSProperties,
    th: { textAlign: 'left' as const, padding: '8px 12px', fontSize: 12, color: '#939393', borderBottom: '1px solid #222' },
    td: { padding: '8px 12px', fontSize: 13, borderBottom: '1px solid #1a1a1a' },
    progressBar: (_pct: number) => ({ width: '100%', height: 6, background: '#222', borderRadius: 3, overflow: 'hidden' as const }),
    progressFill: (pct: number) => ({ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 3, background: pct >= 90 ? '#f44336' : pct >= 75 ? '#ff9800' : pct >= 50 ? '#2196f3' : '#00C971' }),
  };

  return (
    <div style={S.page}>
      <h1 style={{ fontSize: 22, fontWeight: 600, margin: '0 0 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Shield size={24} /> SLA Breach Prediction
      </h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {([['at-risk', AlertTriangle, 'At Risk'], ['predictions', Clock, 'Predictions'], ['trends', TrendingUp, 'Trends'], ['performance', Users, 'Performance'], ['settings', Settings, 'Settings']] as const).map(([key, Icon, label]) => (
          <button key={key} style={S.tab(tab === key)} onClick={() => setTab(key as Tab)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon size={14} /> {label}</span>
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', color: '#939393', padding: 40 }}>Loading...</div>}

      {/* At Risk */}
      {tab === 'at-risk' && !loading && (
        <div>
          <div style={{ fontSize: 13, color: '#939393', marginBottom: 12 }}>{atRisk.length} tickets at risk of SLA breach</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Ticket</th><th style={S.th}>Priority</th><th style={S.th}>Agent</th><th style={S.th}>Elapsed</th><th style={S.th}>Remaining</th><th style={S.th}>Risk</th>
            </tr></thead>
            <tbody>
              {atRisk.map(t => (
                <tr key={t.ticket_id}>
                  <td style={S.td}>{t.subject}</td>
                  <td style={S.td}><span style={S.badge(riskColor[t.priority] || '#666')}>{t.priority}</span></td>
                  <td style={S.td}>{t.agent}</td>
                  <td style={S.td}>
                    <div style={S.progressBar(t.percent_elapsed)}><div style={S.progressFill(t.percent_elapsed)} /></div>
                    <div style={{ fontSize: 11, color: '#939393', marginTop: 2 }}>{t.percent_elapsed}%</div>
                  </td>
                  <td style={S.td}>{formatTime(t.remaining_ms)}</td>
                  <td style={S.td}><span style={S.badge(riskColor[t.risk_level] || '#666')}>{t.risk_level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Predictions */}
      {tab === 'predictions' && !loading && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Ticket</th><th style={S.th}>Priority</th><th style={S.th}>Agent</th><th style={S.th}>Breach Probability</th><th style={S.th}>Risk Level</th>
            </tr></thead>
            <tbody>
              {predictions.map(p => (
                <tr key={p.ticket_id}>
                  <td style={S.td}>{p.subject}</td>
                  <td style={S.td}><span style={S.badge(riskColor[p.priority] || '#666')}>{p.priority}</span></td>
                  <td style={S.td}>{p.agent}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ ...S.progressBar(p.breach_probability), width: 100 }}><div style={S.progressFill(p.breach_probability)} /></div>
                      <span style={{ fontSize: 12 }}>{p.breach_probability}%</span>
                    </div>
                  </td>
                  <td style={S.td}><span style={S.badge(riskColor[p.risk_level] || '#666')}>{p.risk_level}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Trends */}
      {tab === 'trends' && !loading && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            {trends.length > 0 && (() => {
              const avg = Math.round(trends.reduce((s, t) => s + t.compliance_rate, 0) / trends.length);
              const totalBreached = trends.reduce((s, t) => s + t.breached, 0);
              const totalTickets = trends.reduce((s, t) => s + t.total_tickets, 0);
              return <>
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>{avg}%</div><div style={{ fontSize: 12, color: '#939393' }}>Avg Compliance</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700 }}>{totalTickets}</div><div style={{ fontSize: 12, color: '#939393' }}>Total Tickets</div>
                </div>
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f44336' }}>{totalBreached}</div><div style={{ fontSize: 12, color: '#939393' }}>Total Breached</div>
                </div>
              </>;
            })()}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Date</th><th style={S.th}>Total</th><th style={S.th}>Compliant</th><th style={S.th}>Breached</th><th style={S.th}>Compliance Rate</th>
            </tr></thead>
            <tbody>
              {trends.slice(-14).map(t => (
                <tr key={t.date}>
                  <td style={S.td}>{t.date}</td>
                  <td style={S.td}>{t.total_tickets}</td>
                  <td style={{ ...S.td, color: '#00C971' }}>{t.compliant}</td>
                  <td style={{ ...S.td, color: '#f44336' }}>{t.breached}</td>
                  <td style={S.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ ...S.progressBar(t.compliance_rate), width: 80 }}><div style={S.progressFill(100 - t.compliance_rate)} /></div>
                      <span>{t.compliance_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Performance */}
      {tab === 'performance' && !loading && (
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Team Performance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead><tr>
              <th style={S.th}>Team</th><th style={S.th}>Tickets</th><th style={S.th}>Compliant</th><th style={S.th}>Breached</th><th style={S.th}>Avg Resolution</th><th style={S.th}>Compliance</th>
            </tr></thead>
            <tbody>
              {teamPerf.map(t => (
                <tr key={t.team}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{t.team}</td>
                  <td style={S.td}>{t.total_tickets}</td>
                  <td style={{ ...S.td, color: '#00C971' }}>{t.compliant}</td>
                  <td style={{ ...S.td, color: '#f44336' }}>{t.breached}</td>
                  <td style={S.td}>{t.avg_resolution_hours}h</td>
                  <td style={S.td}><span style={S.badge(t.compliance_rate >= 90 ? '#00C971' : t.compliance_rate >= 75 ? '#ff9800' : '#f44336')}>{t.compliance_rate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Agent Performance</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={S.th}>Agent</th><th style={S.th}>Tickets</th><th style={S.th}>Compliant</th><th style={S.th}>Breached</th><th style={S.th}>Avg Resolution</th><th style={S.th}>Compliance</th>
            </tr></thead>
            <tbody>
              {agentPerf.map(a => (
                <tr key={a.agent}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{a.agent}</td>
                  <td style={S.td}>{a.total_tickets}</td>
                  <td style={{ ...S.td, color: '#00C971' }}>{a.compliant}</td>
                  <td style={{ ...S.td, color: '#f44336' }}>{a.breached}</td>
                  <td style={S.td}>{a.avg_resolution_hours}h</td>
                  <td style={S.td}><span style={S.badge(a.compliance_rate >= 90 ? '#00C971' : a.compliance_rate >= 75 ? '#ff9800' : '#f44336')}>{a.compliance_rate}%</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settings */}
      {tab === 'settings' && !loading && (
        <div style={S.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}><Settings size={16} /> Alert Configuration</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 13, color: '#939393', display: 'block', marginBottom: 6 }}>Warning Threshold (%)</label>
              <input type="number" style={S.input} value={alertConfig.warning_threshold_percent} onChange={e => setAlertConfig({ ...alertConfig, warning_threshold_percent: Number(e.target.value) })} />
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#939393', display: 'block', marginBottom: 6 }}>Critical Threshold (%)</label>
              <input type="number" style={S.input} value={alertConfig.critical_threshold_percent} onChange={e => setAlertConfig({ ...alertConfig, critical_threshold_percent: Number(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {(['notify_agents', 'notify_managers', 'email_enabled'] as const).map(key => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                <input type="checkbox" checked={(alertConfig as any)[key]} onChange={e => setAlertConfig({ ...alertConfig, [key]: e.target.checked })} style={{ accentColor: '#00C971' }} />
                {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </label>
            ))}
          </div>
          <button style={S.btnPrimary} onClick={saveAlertConfig} disabled={saving}>{saving ? 'Saving...' : 'Save Configuration'}</button>
        </div>
      )}
    </div>
  );
};

export default SLAPrediction;
