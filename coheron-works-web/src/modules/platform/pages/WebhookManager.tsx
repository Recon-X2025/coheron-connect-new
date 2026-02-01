import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Play, Pause, Send, X, Save, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';

const API = '/api/platform/webhooks';

interface Subscription { _id: string; name: string; url: string; events: string[]; secret: string; headers: any; is_active: boolean; retry_policy: { max_retries: number; backoff_seconds: number }; last_triggered_at: string; success_count: number; failure_count: number; }

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  input: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties,
  badge: (color: string) => ({ background: color + '22', color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }) as React.CSSProperties,
};

const WebhookManager: React.FC = () => {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [_health, setHealth] = useState<any[]>([]);
  const [view, setView] = useState<'list' | 'editor' | 'logs'>('list');
  const [current, setCurrent] = useState<Partial<Subscription>>({});
  const [logs, setLogs] = useState<any[]>([]);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [sRes, eRes, hRes] = await Promise.all([fetch(API), fetch(API + '/events'), fetch(API + '/health')]);
    setSubs(await sRes.json());
    setEvents(await eRes.json());
    setHealth(await hRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveSub = async () => {
    if (current._id) {
      await fetch(API + '/' + current._id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
    } else {
      await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
    }
    load(); setView('list');
  };

  const deleteSub = async (id: string) => { await fetch(API + '/' + id, { method: 'DELETE' }); load(); };
  const toggleSub = async (id: string) => { await fetch(API + '/' + id + '/toggle', { method: 'POST' }); load(); };
  const testSub = async (id: string) => { await fetch(API + '/' + id + '/test', { method: 'POST' }); load(); };
  const loadLogs = async (id: string) => {
    const r = await fetch(API + '/' + id + '/logs');
    setLogs(await r.json());
    setCurrent(subs.find(s => s._id === id) || {});
    setView('logs');
  };

  const toggleModule = (mod: string) => {
    const s = new Set(expandedModules);
    s.has(mod) ? s.delete(mod) : s.add(mod);
    setExpandedModules(s);
  };

  const toggleEvent = (event: string) => {
    const evts = current.events || [];
    setCurrent({ ...current, events: evts.includes(event) ? evts.filter(e => e !== event) : [...evts, event] });
  };


  if (view === 'logs') return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Delivery Logs: {current.name}</h1>
        <button style={s.btnSec} onClick={() => setView('list')}><X size={16} /> Back</button>
      </div>
      {logs.map((log: any) => (
        <div key={log._id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {log.status === 'success' ? <CheckCircle size={18} style={{ color: '#00C971' }} /> : log.status === 'retrying' ? <Clock size={18} style={{ color: '#F59E0B' }} /> : <XCircle size={18} style={{ color: '#EF4444' }} />}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{log.event}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Attempt {log.attempt} | {log.duration_ms}ms | Status {log.response_status}</div>
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#888' }}>{new Date(log.sent_at).toLocaleString()}</span>
        </div>
      ))}
      {logs.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: '#888' }}>No delivery logs yet.</div>}
    </div>
  );

  if (view === 'editor') return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{current._id ? 'Edit' : 'New'} Webhook Subscription</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn} onClick={saveSub}><Save size={14} /> Save</button>
          <button style={s.btnSec} onClick={() => setView('list')}><X size={14} /> Cancel</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Configuration</h3>
          <label style={{ fontSize: 12, color: '#888' }}>Name</label>
          <input style={{ ...s.input, marginBottom: 12 }} value={current.name || ''} onChange={e => setCurrent({ ...current, name: e.target.value })} />
          <label style={{ fontSize: 12, color: '#888' }}>URL</label>
          <input style={{ ...s.input, marginBottom: 12 }} placeholder="https://example.com/webhook" value={current.url || ''} onChange={e => setCurrent({ ...current, url: e.target.value })} />
          <label style={{ fontSize: 12, color: '#888' }}>Secret</label>
          <input style={{ ...s.input, marginBottom: 12 }} value={current.secret || ''} onChange={e => setCurrent({ ...current, secret: e.target.value })} />
          <div style={{ display: 'flex', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888' }}>Max Retries</label>
              <input style={s.input} type="number" value={current.retry_policy?.max_retries ?? 3} onChange={e => setCurrent({ ...current, retry_policy: { ...current.retry_policy!, max_retries: +e.target.value, backoff_seconds: current.retry_policy?.backoff_seconds ?? 30 } })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888' }}>Backoff (sec)</label>
              <input style={s.input} type="number" value={current.retry_policy?.backoff_seconds ?? 30} onChange={e => setCurrent({ ...current, retry_policy: { max_retries: current.retry_policy?.max_retries ?? 3, backoff_seconds: +e.target.value } })} />
            </div>
          </div>
        </div>
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Events</h3>
          {events.map(group => (
            <div key={group.module} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', padding: '6px 0' }} onClick={() => toggleModule(group.module)}>
                {expandedModules.has(group.module) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span style={{ fontSize: 14, fontWeight: 600 }}>{group.module}</span>
                <span style={{ fontSize: 11, color: '#888' }}>({group.events.filter((e: string) => (current.events || []).includes(e)).length}/{group.events.length})</span>
              </div>
              {expandedModules.has(group.module) && (
                <div style={{ paddingLeft: 20 }}>
                  {group.events.map((event: string) => (
                    <label key={event} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={(current.events || []).includes(event)} onChange={() => toggleEvent(event)} />
                      {event}
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>Webhook Manager</h1>
        <button style={s.btn} onClick={() => { setCurrent({ events: [], retry_policy: { max_retries: 3, backoff_seconds: 30 } }); setView('editor'); }}>
          <Plus size={16} /> New Subscription
        </button>
      </div>
      {subs.map(sub => {
        
        const total = (sub.success_count || 0) + (sub.failure_count || 0);
        const rate = total > 0 ? (sub.success_count / total * 100) : 100;
        return (
          <div key={sub._id} style={s.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{sub.name}</span>
                <span style={s.badge(sub.is_active ? '#00C971' : '#888')}>{sub.is_active ? 'Active' : 'Inactive'}</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={s.btnSec} onClick={() => testSub(sub._id)} title="Test"><Send size={14} /></button>
                <button style={s.btnSec} onClick={() => loadLogs(sub._id)} title="Logs"><Clock size={14} /></button>
                <button style={s.btnSec} onClick={() => { setCurrent(sub); setView('editor'); }} title="Edit"><Plus size={14} /></button>
                <button style={s.btnSec} onClick={() => toggleSub(sub._id)} title="Toggle">{sub.is_active ? <Pause size={14} /> : <Play size={14} />}</button>
                <button style={{ ...s.btnSec, color: '#EF4444' }} onClick={() => deleteSub(sub._id)}><Trash2 size={14} /></button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 8, fontFamily: 'monospace' }}>{sub.url}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
              {sub.events.map(e => <span key={e} style={s.badge('#3B82F6')}>{e}</span>)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, background: '#222', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <div style={{ width: rate + '%', height: '100%', background: rate > 90 ? '#00C971' : rate > 70 ? '#F59E0B' : '#EF4444', borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{rate.toFixed(0)}% success ({total} deliveries)</span>
            </div>
          </div>
        );
      })}
      {subs.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: '#888', padding: 40 }}>No webhook subscriptions yet.</div>}
    </div>
  );
};

export { WebhookManager };
export default WebhookManager;
