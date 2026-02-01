import React, { useState, useEffect, useCallback } from 'react';
import { Key, Plus, Trash2, Copy, ChevronDown, ChevronRight, Clock, Shield, Code, Book } from 'lucide-react';

const API = '/api/platform/developer';

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  input: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties,
  badge: (color: string) => ({ background: color + '22', color, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }) as React.CSSProperties,
  tab: (active: boolean) => ({ padding: '10px 20px', cursor: 'pointer', borderBottom: active ? '2px solid #00C971' : '2px solid transparent', color: active ? '#00C971' : '#888', fontWeight: active ? 600 : 400, fontSize: 14, background: 'none', border: 'none', borderBottomStyle: 'solid' as const, borderBottomWidth: 2 }) as React.CSSProperties,
  code: { background: '#1a1a1a', borderRadius: 8, padding: 16, fontSize: 13, fontFamily: 'monospace', overflow: 'auto', color: '#e0e0e0', whiteSpace: 'pre-wrap' as const } as React.CSSProperties,
};

const METHOD_COLORS: Record<string, string> = { GET: '#00C971', POST: '#3B82F6', PUT: '#F59E0B', DELETE: '#EF4444' };

const DeveloperPortal: React.FC = () => {
  const [tab, setTab] = useState<'keys' | 'reference' | 'sdks' | 'limits' | 'changelog'>('reference');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiRef, setApiRef] = useState<any[]>([]);
  const [sdks, setSdks] = useState<any[]>([]);
  const [rateLimits, setRateLimits] = useState<any>(null);
  const [changelog, setChangelog] = useState<any[]>([]);
  const [expandedMods, setExpandedMods] = useState<Set<string>>(new Set());
  const [newKeyName, setNewKeyName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);
  const [selectedSdk, setSelectedSdk] = useState(0);

  const load = useCallback(async () => {
    const [kRes, rRes, sRes, lRes, cRes] = await Promise.all([
      fetch(API + '/api-keys'), fetch(API + '/api-reference'), fetch(API + '/sdks'),
      fetch(API + '/rate-limits'), fetch(API + '/changelog'),
    ]);
    setApiKeys(await kRes.json());
    setApiRef(await rRes.json());
    setSdks(await sRes.json());
    setRateLimits(await lRes.json());
    setChangelog(await cRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    const r = await fetch(API + '/api-keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newKeyName, permissions: ['read', 'write'] }) });
    const data = await r.json();
    setNewKey(data.key);
    setNewKeyName('');
    load();
  };

  const deleteKey = async (id: string) => { await fetch(API + '/api-keys/' + id, { method: 'DELETE' }); load(); };

  const toggleMod = (mod: string) => {
    const s = new Set(expandedMods);
    s.has(mod) ? s.delete(mod) : s.add(mod);
    setExpandedMods(s);
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 24px' }}>Developer Portal</h1>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #222', marginBottom: 24 }}>
        {[
          { key: 'reference', label: 'API Reference', icon: Book },
          { key: 'keys', label: 'API Keys', icon: Key },
          { key: 'sdks', label: 'SDKs', icon: Code },
          { key: 'limits', label: 'Rate Limits', icon: Shield },
          { key: 'changelog', label: 'Changelog', icon: Clock },
        ].map(t => (
          <button key={t.key} style={s.tab(tab === t.key)} onClick={() => setTab(t.key as any)}>
            <t.icon size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> {t.label}
          </button>
        ))}
      </div>

      {/* API Reference */}
      {tab === 'reference' && (
        <div>
          {apiRef.map(mod => (
            <div key={mod.module} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} onClick={() => toggleMod(mod.module)}>
                {expandedMods.has(mod.module) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <h3 style={{ margin: 0, fontSize: 16 }}>{mod.module}</h3>
                <span style={{ fontSize: 12, color: '#888' }}>{mod.endpoints.length} endpoints</span>
              </div>
              {expandedMods.has(mod.module) && (
                <div style={{ marginTop: 12 }}>
                  {mod.endpoints.map((ep: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderTop: i > 0 ? '1px solid #222' : 'none' }}>
                      <span style={{ ...s.badge(METHOD_COLORS[ep.method] || '#888'), minWidth: 50, textAlign: 'center' }}>{ep.method}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{ep.path}</span>
                      <span style={{ fontSize: 13, color: '#888' }}>{ep.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* API Keys */}
      {tab === 'keys' && (
        <div>
          <div style={{ ...s.card, display: 'flex', gap: 12, alignItems: 'center' }}>
            <input style={{ ...s.input, flex: 1 }} placeholder="Key name (e.g. Production Key)" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} />
            <button style={s.btn} onClick={createKey}><Plus size={14} /> Generate Key</button>
          </div>
          {newKey && (
            <div style={{ ...s.card, background: '#0a1a0a', border: '1px solid #00C971' }}>
              <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, color: '#00C971' }}>New API Key Created - Copy it now, it won't be shown again!</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <code style={{ flex: 1, background: '#141414', padding: '8px 12px', borderRadius: 6, fontSize: 13, wordBreak: 'break-all' }}>{newKey}</code>
                <button style={s.btnSec} onClick={() => { navigator.clipboard.writeText(newKey); }}><Copy size={14} /></button>
              </div>
            </div>
          )}
          {apiKeys.map(k => (
            <div key={k._id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Key size={14} style={{ color: '#00C971' }} />
                  <span style={{ fontWeight: 600 }}>{k.name}</span>
                  <span style={s.badge(k.is_active ? '#00C971' : '#888')}>{k.is_active ? 'Active' : 'Revoked'}</span>
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {k.prefix}... | {k.rate_limit_per_minute}/min | Last used: {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                  {k.expires_at && <> | Expires: {new Date(k.expires_at).toLocaleDateString()}</>}
                </div>
              </div>
              <button style={{ ...s.btnSec, color: '#EF4444' }} onClick={() => deleteKey(k._id)}><Trash2 size={14} /> Revoke</button>
            </div>
          ))}
        </div>
      )}

      {/* SDKs */}
      {tab === 'sdks' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            {sdks.map((sdk, i) => (
              <button key={sdk.language} style={{ ...s.btnSec, ...(selectedSdk === i ? { borderColor: '#00C971', color: '#00C971' } : {}) }} onClick={() => setSelectedSdk(i)}>
                {sdk.language}
              </button>
            ))}
          </div>
          {sdks[selectedSdk] && (
            <div style={s.card}>
              <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>{sdks[selectedSdk].language}</h3>
              {sdks[selectedSdk].install && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Installation</div>
                  <div style={{ ...s.code, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <code>{sdks[selectedSdk].install}</code>
                    <button style={{ ...s.btnSec, padding: '4px 8px' }} onClick={() => navigator.clipboard.writeText(sdks[selectedSdk].install)}><Copy size={12} /></button>
                  </div>
                </div>
              )}
              <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>Code Sample</div>
              <pre style={s.code}>{sdks[selectedSdk].sample}</pre>
            </div>
          )}
        </div>
      )}

      {/* Rate Limits */}
      {tab === 'limits' && rateLimits && (
        <div>
          <div style={s.card}>
            <div style={{ fontSize: 13, color: '#888' }}>Default Rate Limit</div>
            <div style={{ fontSize: 28, fontWeight: 700 }}>{rateLimits.default_limit} requests/min</div>
          </div>
          {(rateLimits.keys || []).map((k: any, i: number) => (
            <div key={i} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600 }}>{k.name}</span>
                <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>{k.prefix}...</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#00C971' }}>{k.rate_limit}/min</div>
                  <div style={{ fontSize: 11, color: '#888' }}>Last used: {k.last_used ? new Date(k.last_used).toLocaleDateString() : 'Never'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Changelog */}
      {tab === 'changelog' && (
        <div>
          {changelog.map((entry, i) => (
            <div key={i} style={{ ...s.card, display: 'flex', gap: 20 }}>
              <div style={{ width: 80, flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#00C971' }}>{entry.version}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{entry.date}</div>
              </div>
              <div style={{ borderLeft: '2px solid #222', paddingLeft: 20 }}>
                <ul style={{ margin: 0, paddingLeft: 16 }}>
                  {entry.changes.map((c: string, j: number) => <li key={j} style={{ fontSize: 14, marginBottom: 4 }}>{c}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export { DeveloperPortal };
export default DeveloperPortal;
