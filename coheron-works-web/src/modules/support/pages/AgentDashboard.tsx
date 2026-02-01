import React, { useState, useEffect, FC } from 'react';
import { Headphones, Users, AlertTriangle, Smile, Meh, Frown, Angry, Zap, Activity, Eye, ChevronRight, BarChart3, Shield, Clock, Star } from 'lucide-react';

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' } as React.CSSProperties,
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 } as React.CSSProperties,
  h1: { fontSize: 24, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 } as React.CSSProperties,
  layout: { display: 'grid', gridTemplateColumns: '260px 1fr 300px', gap: 20 } as React.CSSProperties,
  sidebar: { background: '#141414', borderRadius: 10, border: '1px solid #222', padding: 16 } as React.CSSProperties,
  card: { background: '#141414', borderRadius: 10, border: '1px solid #222', padding: 16, marginBottom: 12 } as React.CSSProperties,
  btn: (v: string = 'primary') => ({ padding: '8px 16px', borderRadius: 6, border: v === 'ghost' ? '1px solid #333' : 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: v === 'primary' ? '#00C971' : 'transparent', color: v === 'primary' ? '#000' : '#e0e0e0', display: 'inline-flex', alignItems: 'center', gap: 6 }) as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 13, width: '100%' } as React.CSSProperties,
  select: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px', color: '#e0e0e0', fontSize: 13 } as React.CSSProperties,
  label: { fontSize: 12, color: '#888', marginBottom: 4, display: 'block' } as React.CSSProperties,
  muted: { fontSize: 12, color: '#666' } as React.CSSProperties,
  dot: (color: string) => ({ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', marginRight: 6 }) as React.CSSProperties,
  meter: (pct: number) => ({ height: 6, borderRadius: 3, background: '#222', width: '100%', position: 'relative' as const, overflow: 'hidden' as const }),
  meterFill: (pct: number) => ({ height: '100%', borderRadius: 3, width: `${Math.min(100, pct)}%`, background: pct > 80 ? '#DC2626' : pct > 60 ? '#F59E0B' : '#00C971', transition: 'width 0.3s' }) as React.CSSProperties,
  sentimentIcon: (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <Smile size={16} color="#00C971" />;
      case 'neutral': return <Meh size={16} color="#F59E0B" />;
      case 'negative': return <Frown size={16} color="#EF4444" />;
      case 'frustrated': return <Angry size={16} color="#DC2626" />;
      default: return <Meh size={16} color="#666" />;
    }
  },
  riskBadge: (risk: string) => {
    const colors: Record<string, string> = { low: '#00C971', medium: '#F59E0B', high: '#EF4444', critical: '#DC2626' };
    const c = colors[risk] || '#666';
    return { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: c + '22', color: c, border: `1px solid ${c}44` } as React.CSSProperties;
  },
  csatBadge: (score: number) => {
    const c = score >= 4 ? '#00C971' : score >= 3 ? '#F59E0B' : '#DC2626';
    return { display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: c + '22', color: c } as React.CSSProperties;
  },
};

const statusColors: Record<string, string> = { online: '#00C971', away: '#F59E0B', busy: '#EF4444', offline: '#555' };

export const AgentDashboard: FC = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [atRisk, setAtRisk] = useState<any[]>([]);
  const [macros, setMacros] = useState<any[]>([]);
  const [sentimentDash, setSentimentDash] = useState<any>(null);
  const [myStatus, setMyStatus] = useState('online');
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [viewers, setViewers] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/support/presence/agents/status').then(r => r.json()).then(d => setAgents(d.data || []));
    fetch('/api/support/presence/workload').then(r => r.json()).then(d => setWorkload(d.data || []));
    fetch('/api/support/sentiment/at-risk').then(r => r.json()).then(d => setAtRisk(d.data || []));
    fetch('/api/support/macros?limit=10').then(r => r.json()).then(d => setMacros(d.data || []));
    fetch('/api/support/sentiment/dashboard').then(r => r.json()).then(d => setSentimentDash(d.data));

    // Heartbeat interval
    const hb = setInterval(() => {
      fetch('/api/support/presence/heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currently_viewing_ticket_id: selectedTicket?._id }) });
    }, 30000);
    return () => clearInterval(hb);
  }, [selectedTicket]);

  const updateStatus = async (status: string) => {
    setMyStatus(status);
    await fetch('/api/support/presence/status', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  };

  const applyMacro = async (macroId: string, ticketId: string) => {
    await fetch(`/api/support/macros/${macroId}/apply/${ticketId}`, { method: 'POST' });
  };

  const viewTicket = async (ticketId: string) => {
    setSelectedTicket({ _id: ticketId });
    const r = await fetch(`/api/support/presence/ticket/${ticketId}/viewers`);
    const d = await r.json();
    setViewers(d.data || []);
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <h1 style={s.h1}><Headphones size={22} color="#00C971" /> Agent Dashboard</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={s.muted}>My Status:</span>
          <select style={s.select} value={myStatus} onChange={e => updateStatus(e.target.value)}>
            {['online', 'away', 'busy', 'offline'].map(st => <option key={st} value={st}>{st}</option>)}
          </select>
        </div>
      </div>

      <div style={s.layout}>
        {/* Left: Agent Presence */}
        <div style={s.sidebar}>
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={16} /> Team Presence</h3>
          {agents.map((a, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={s.dot(statusColors[a.status] || '#555')} />
                <span style={{ fontSize: 13, color: '#e0e0e0' }}>{a.agent_id?.name || 'Agent'}</span>
              </div>
              <span style={s.muted}>{a.current_load}/{a.capacity_limit}</span>
            </div>
          ))}
          {agents.length === 0 && <div style={s.muted}>No agents online</div>}

          <h3 style={{ color: '#fff', fontSize: 14, marginTop: 24, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><BarChart3 size={16} /> Workload</h3>
          {workload.map((w, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: '#ccc' }}>{w.agent?.name || 'Agent'}</span>
                <span style={{ fontSize: 11, color: '#888' }}>{w.utilization}%</span>
              </div>
              <div style={s.meter(w.utilization)}>
                <div style={s.meterFill(w.utilization)} />
              </div>
            </div>
          ))}
        </div>

        {/* Center: Active tickets with sentiment */}
        <div>
          {/* Sentiment Overview */}
          {sentimentDash && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <div style={{ ...s.card, textAlign: 'center' as const }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#00C971' }}>{sentimentDash.total_analyzed}</div>
                <div style={s.muted}>Analyzed</div>
              </div>
              <div style={{ ...s.card, textAlign: 'center' as const }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: '#F59E0B' }}>{sentimentDash.avg_predicted_csat?.toFixed(1) || '-'}</div>
                <div style={s.muted}>Avg CSAT</div>
              </div>
              {(sentimentDash.sentiment_distribution || []).slice(0, 2).map((sd: any, i: number) => (
                <div key={i} style={{ ...s.card, textAlign: 'center' as const }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#e0e0e0' }}>{sd.count}</div>
                  <div style={s.muted}>{sd._id}</div>
                </div>
              ))}
            </div>
          )}

          {/* Collision warning */}
          {viewers.length > 0 && selectedTicket && (
            <div style={{ ...s.card, background: '#2a1a00', borderColor: '#F59E0B44' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} color="#F59E0B" />
                <span style={{ color: '#F59E0B', fontWeight: 600, fontSize: 13 }}>
                  {viewers.map(v => v.agent_id?.name || 'Someone').join(', ')} {viewers.length === 1 ? 'is' : 'are'} also viewing this ticket
                </span>
              </div>
            </div>
          )}

          {/* At-risk tickets */}
          <div style={s.card}>
            <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle size={16} color="#EF4444" /> At-Risk Tickets
            </h3>
            {atRisk.length === 0 && <div style={s.muted}>No at-risk tickets. Looking good!</div>}
            {atRisk.map((t, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => viewTicket(t.ticket_id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {s.sentimentIcon(t.overall_sentiment)}
                  <div>
                    <div style={{ fontSize: 13, color: '#e0e0e0' }}>Ticket #{typeof t.ticket_id === 'string' ? t.ticket_id.slice(-6) : '...'}</div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                      {(t.risk_factors || []).slice(0, 2).map((rf: string, j: number) => (
                        <span key={j} style={{ fontSize: 10, color: '#888', background: '#1a1a1a', padding: '1px 6px', borderRadius: 3 }}>{rf}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={s.riskBadge(t.escalation_risk)}>{t.escalation_risk}</span>
                  <span style={s.csatBadge(t.predicted_csat)}><Star size={10} /> {t.predicted_csat}</span>
                  <ChevronRight size={14} color="#444" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Macros */}
        <div style={s.sidebar}>
          <h3 style={{ color: '#fff', fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} color="#00C971" /> Quick Macros</h3>
          {macros.map((m, i) => (
            <div key={i} style={{ ...s.card, background: '#1a1a1a', padding: 12, cursor: 'pointer' }} onClick={() => selectedTicket && applyMacro(m._id || m.id, selectedTicket._id)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e0e0e0' }}>{m.name}</div>
                  <div style={s.muted}>{m.actions?.length || 0} actions {m.keyboard_shortcut ? `(${m.keyboard_shortcut})` : ''}</div>
                </div>
                <span style={s.muted}>{m.usage_count || 0}x</span>
              </div>
            </div>
          ))}
          {macros.length === 0 && <div style={s.muted}>No macros available</div>}

          <div style={{ marginTop: 24, padding: 12, background: '#1a1a1a', borderRadius: 8 }}>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>TIP: Select a ticket, then click a macro to apply it instantly.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentDashboard;
