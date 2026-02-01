import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Play, Code, BarChart3, X, Save, FileJson, Copy } from 'lucide-react';

const API = '/api/platform/api-builder';

interface CustomAPI { _id: string; name: string; slug: string; description: string; method: string; path_template: string; authentication: string; rate_limit_per_minute: number; request_schema: any; response_mapping: any; middleware: any[]; is_active: boolean; call_count: number; }

const METHOD_COLORS: Record<string, string> = { GET: '#00C971', POST: '#3B82F6', PUT: '#F59E0B', DELETE: '#EF4444' };

const s = {
  page: { background: '#0a0a0a', color: '#e0e0e0', minHeight: '100vh', padding: 24, fontFamily: 'Inter, system-ui, sans-serif' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, marginBottom: 16 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  input: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', width: '100%', fontSize: 14, boxSizing: 'border-box' as const } as React.CSSProperties,
  select: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', fontSize: 14 } as React.CSSProperties,
  badge: (color: string) => ({ background: color + '22', color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700 }) as React.CSSProperties,
  textarea: { background: '#1a1a1a', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: 12, width: '100%', fontSize: 13, fontFamily: 'monospace', minHeight: 100, boxSizing: 'border-box' as const } as React.CSSProperties,
};

const APIBuilder: React.FC = () => {
  const [apis, setApis] = useState<CustomAPI[]>([]);
  const [usage, setUsage] = useState<any>(null);
  const [view, setView] = useState<'list' | 'editor' | 'test'>('list');
  const [current, setCurrent] = useState<Partial<CustomAPI>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [testBody, setTestBody] = useState('{}');
  const [openApiSpec, setOpenApiSpec] = useState<any>(null);

  const load = useCallback(async () => {
    const [aRes, uRes] = await Promise.all([fetch(API), fetch(API + '/usage')]);
    setApis(await aRes.json());
    setUsage(await uRes.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveAPI = async () => {
    if (current._id) {
      await fetch(API + '/' + current._id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
    } else {
      await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(current) });
    }
    load();
    setView('list');
  };

  const deleteAPI = async (id: string) => {
    await fetch(API + '/' + id, { method: 'DELETE' });
    load();
  };

  const testAPI = async () => {
    if (!current._id) return;
    const r = await fetch(API + '/' + current._id + '/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: testBody });
    setTestResult(await r.json());
  };

  const generateDocs = async (id: string) => {
    const r = await fetch(API + '/' + id + '/generate-docs', { method: 'POST' });
    setOpenApiSpec(await r.json());
  };

  if (view === 'editor') return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{current._id ? 'Edit' : 'New'} Custom API</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={s.btn} onClick={saveAPI}><Save size={14} /> Save</button>
          <button style={s.btnSec} onClick={() => setView('list')}><X size={14} /> Cancel</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Endpoint Configuration</h3>
          <label style={{ fontSize: 12, color: '#888' }}>Name</label>
          <input style={{ ...s.input, marginBottom: 12 }} value={current.name || ''} onChange={e => setCurrent({ ...current, name: e.target.value })} />
          <label style={{ fontSize: 12, color: '#888' }}>Slug</label>
          <input style={{ ...s.input, marginBottom: 12 }} value={current.slug || ''} onChange={e => setCurrent({ ...current, slug: e.target.value })} />
          <label style={{ fontSize: 12, color: '#888' }}>Description</label>
          <input style={{ ...s.input, marginBottom: 12 }} value={current.description || ''} onChange={e => setCurrent({ ...current, description: e.target.value })} />
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888' }}>Method</label>
              <select style={s.select} value={current.method || 'GET'} onChange={e => setCurrent({ ...current, method: e.target.value })}>
                {['GET', 'POST', 'PUT', 'DELETE'].map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: '#888' }}>Path Template</label>
              <input style={s.input} placeholder="/custom/:param" value={current.path_template || ''} onChange={e => setCurrent({ ...current, path_template: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: '#888' }}>Authentication</label>
              <select style={s.select} value={current.authentication || 'api_key'} onChange={e => setCurrent({ ...current, authentication: e.target.value })}>
                <option value="none">None</option><option value="api_key">API Key</option><option value="oauth">OAuth</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#888' }}>Rate Limit / min</label>
              <input style={s.input} type="number" value={current.rate_limit_per_minute || 60} onChange={e => setCurrent({ ...current, rate_limit_per_minute: +e.target.value })} />
            </div>
          </div>
        </div>
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Request Schema (JSON)</h3>
          <textarea style={s.textarea} value={typeof current.request_schema === 'string' ? current.request_schema : JSON.stringify(current.request_schema || {}, null, 2)}
            onChange={e => { try { setCurrent({ ...current, request_schema: JSON.parse(e.target.value) }); } catch {} }} />
          <h3 style={{ margin: '16px 0 16px', fontSize: 16 }}>Response Mapping</h3>
          <label style={{ fontSize: 12, color: '#888' }}>Source Model</label>
          <input style={{ ...s.input, marginBottom: 8 }} value={current.response_mapping?.source_model || ''} onChange={e => setCurrent({ ...current, response_mapping: { ...current.response_mapping, source_model: e.target.value } })} />
          <label style={{ fontSize: 12, color: '#888' }}>Query (JSON)</label>
          <textarea style={{ ...s.textarea, minHeight: 60 }} value={JSON.stringify(current.response_mapping?.query || {}, null, 2)}
            onChange={e => { try { setCurrent({ ...current, response_mapping: { ...current.response_mapping, query: JSON.parse(e.target.value) } }); } catch {} }} />
        </div>
      </div>
      {current._id && (
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Test Endpoint</h3>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
            <textarea style={{ ...s.textarea, flex: 1 }} value={testBody} onChange={e => setTestBody(e.target.value)} />
            <button style={{ ...s.btn, alignSelf: 'flex-start' }} onClick={testAPI}><Play size={14} /> Send</button>
          </div>
          {testResult && <pre style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, fontSize: 13, overflow: 'auto', color: '#00C971' }}>{JSON.stringify(testResult, null, 2)}</pre>}
        </div>
      )}
    </div>
  );

  return (
    <div style={s.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>API Builder</h1>
        <button style={s.btn} onClick={() => { setCurrent({ method: 'GET', authentication: 'api_key', rate_limit_per_minute: 60, middleware: [] }); setView('editor'); }}>
          <Plus size={16} /> New API Endpoint
        </button>
      </div>
      {usage && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <div style={s.card}><div style={{ fontSize: 13, color: '#888' }}>Total Endpoints</div><div style={{ fontSize: 28, fontWeight: 700 }}>{usage.total_apis}</div></div>
          <div style={s.card}><div style={{ fontSize: 13, color: '#888' }}>Total API Calls</div><div style={{ fontSize: 28, fontWeight: 700, color: '#00C971' }}>{usage.total_calls}</div></div>
          <div style={s.card}><div style={{ fontSize: 13, color: '#888' }}>Active Endpoints</div><div style={{ fontSize: 28, fontWeight: 700 }}>{apis.filter(a => a.is_active).length}</div></div>
        </div>
      )}
      {apis.map(api => (
        <div key={api._id} style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={s.badge(METHOD_COLORS[api.method] || '#888')}>{api.method}</span>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{api.name}</span>
              {!api.is_active && <span style={s.badge('#888')}>Inactive</span>}
            </div>
            <div style={{ fontSize: 13, color: '#888', fontFamily: 'monospace' }}>{api.path_template} | {api.authentication} auth | {api.call_count} calls | {api.rate_limit_per_minute}/min</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={s.btnSec} onClick={() => { setCurrent(api); setView('editor'); }} title="Edit"><Code size={14} /></button>
            <button style={s.btnSec} onClick={() => generateDocs(api._id)} title="OpenAPI Docs"><FileJson size={14} /></button>
            <button style={{ ...s.btnSec, color: '#EF4444' }} onClick={() => deleteAPI(api._id)}><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
      {openApiSpec && (
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>OpenAPI Specification</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={s.btnSec} onClick={() => navigator.clipboard.writeText(JSON.stringify(openApiSpec, null, 2))}><Copy size={14} /> Copy</button>
              <button style={s.btnSec} onClick={() => setOpenApiSpec(null)}><X size={14} /></button>
            </div>
          </div>
          <pre style={{ background: '#1a1a1a', borderRadius: 8, padding: 12, fontSize: 12, overflow: 'auto', color: '#e0e0e0', maxHeight: 400 }}>{JSON.stringify(openApiSpec, null, 2)}</pre>
        </div>
      )}
      {apis.length === 0 && <div style={{ ...s.card, textAlign: 'center', color: '#888', padding: 40 }}>No custom APIs yet. Create your first endpoint.</div>}
    </div>
  );
};

export { APIBuilder };
export default APIBuilder;
