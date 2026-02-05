import { useState, useEffect } from 'react';
import {
  Bot, ToggleLeft, ToggleRight, Sliders, MessageSquare, Send, AlertCircle, CheckCircle,
} from 'lucide-react';

const TOKEN = localStorage.getItem('authToken') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };

interface Config {
  enabled: boolean;
  confidence_threshold: number;
  response_delay_seconds: number;
  tone: string;
  knowledge_base_enabled: boolean;
  auto_close_after_hours: number;
  excluded_categories: string[];
}

interface Stats {
  total_responded: number;
  total_deflected: number;
  total_escalated: number;
  deflection_rate: number;
  total_interactions: number;
}

export const AIAutoResponseSettings: React.FC = () => {
  const [config, setConfig] = useState<Config>({
    enabled: false, confidence_threshold: 0.7, response_delay_seconds: 30,
    tone: 'professional', knowledge_base_enabled: true, auto_close_after_hours: 48, excluded_categories: [],
  });
  const [stats, setStats] = useState<Stats>({ total_responded: 0, total_deflected: 0, total_escalated: 0, deflection_rate: 0, total_interactions: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testSubject, setTestSubject] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [cfgRes, statsRes] = await Promise.all([
          fetch('/api/support/ai-auto-response/config', { headers }),
          fetch('/api/support/ai-auto-response/stats', { headers }),
        ]);
        if (cfgRes.ok) { const d = await cfgRes.json(); setConfig(d); }
        if (statsRes.ok) { const d = await statsRes.json(); setStats(d); }
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/support/ai-auto-response/config', {
        method: 'PUT', headers, body: JSON.stringify(config),
      });
      if (res.ok) { const d = await res.json(); setConfig(d); }
    } catch { /* empty */ }
    setSaving(false);
  };

  const runTest = async () => {
    if (!testSubject && !testDescription) return;
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/support/ai-auto-response/suggest', {
        method: 'POST', headers,
        body: JSON.stringify({ subject: testSubject, description: testDescription }),
      });
      if (res.ok) setTestResult(await res.json());
    } catch { /* empty */ }
    setTestLoading(false);
  };

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 } as React.CSSProperties,
    card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 20, marginBottom: 16 } as React.CSSProperties,
    label: { fontSize: 13, color: '#939393', marginBottom: 6, display: 'block' } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    statBox: { background: '#1a1a1a', borderRadius: 8, padding: 16, textAlign: 'center' as const, flex: 1 },
  };

  if (loading) return <div style={S.page}><div style={{ textAlign: 'center', padding: 60, color: '#939393' }}>Loading...</div></div>;

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={24} /> AI Auto-Response Settings
        </h1>
        <button style={S.btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={S.statBox}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>{stats.total_responded}</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Auto-Responded</div>
        </div>
        <div style={S.statBox}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#ff9800' }}>{stats.total_escalated}</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Escalated</div>
        </div>
        <div style={S.statBox}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#2196f3' }}>{stats.deflection_rate}%</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Deflection Rate</div>
        </div>
        <div style={S.statBox}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{stats.total_interactions}</div>
          <div style={{ fontSize: 12, color: '#939393' }}>Total Interactions</div>
        </div>
      </div>

      {/* Enable/Disable */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Enable AI Auto-Response</div>
            <div style={{ fontSize: 12, color: '#939393' }}>Automatically suggest and send AI-generated responses to support tickets</div>
          </div>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.enabled ? '#00C971' : '#666' }}
            onClick={() => setConfig({ ...config, enabled: !config.enabled })}>
            {config.enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div style={S.card}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sliders size={16} /> Configuration
        </h3>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Confidence Threshold: {Math.round(config.confidence_threshold * 100)}%</label>
          <input type="range" min={0} max={100} value={config.confidence_threshold * 100}
            onChange={e => setConfig({ ...config, confidence_threshold: Number(e.target.value) / 100 })}
            style={{ width: '100%', accentColor: '#00C971' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#666' }}>
            <span>More responses (lower quality)</span>
            <span>Fewer responses (higher quality)</span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Response Delay (seconds)</label>
          <input type="number" style={S.input} value={config.response_delay_seconds}
            onChange={e => setConfig({ ...config, response_delay_seconds: Number(e.target.value) })} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Tone</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['professional', 'friendly', 'concise', 'empathetic'].map(tone => (
              <button key={tone} onClick={() => setConfig({ ...config, tone })}
                style={{ ...S.btn, ...(config.tone === tone ? { background: '#00C971', color: '#000', borderColor: '#00C971' } : {}) }}>
                {tone.charAt(0).toUpperCase() + tone.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={S.label}>Auto-Close After (hours)</label>
          <input type="number" style={S.input} value={config.auto_close_after_hours}
            onChange={e => setConfig({ ...config, auto_close_after_hours: Number(e.target.value) })} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <label style={{ ...S.label, marginBottom: 0 }}>Knowledge Base Integration</label>
              <div style={{ fontSize: 11, color: '#666' }}>Use KB articles to generate responses</div>
            </div>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: config.knowledge_base_enabled ? '#00C971' : '#666' }}
              onClick={() => setConfig({ ...config, knowledge_base_enabled: !config.knowledge_base_enabled })}>
              {config.knowledge_base_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* Test */}
      <div style={S.card}>
        <h3 style={{ fontSize: 15, fontWeight: 600, marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={16} /> Test with Sample Ticket
        </h3>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Subject</label>
          <input style={S.input} value={testSubject} onChange={e => setTestSubject(e.target.value)}
            placeholder="e.g. Cannot reset my password" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={S.label}>Description</label>
          <textarea style={{ ...S.input, minHeight: 60, resize: 'vertical' }} value={testDescription}
            onChange={e => setTestDescription(e.target.value)}
            placeholder="Describe the issue..." />
        </div>
        <button style={S.btnPrimary} onClick={runTest} disabled={testLoading}>
          <Send size={14} /> {testLoading ? 'Testing...' : 'Test Response'}
        </button>

        {testResult && (
          <div style={{ marginTop: 16, background: '#1a1a1a', borderRadius: 8, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {testResult.meets_threshold ?
                <CheckCircle size={16} style={{ color: '#00C971' }} /> :
                <AlertCircle size={16} style={{ color: '#ff9800' }} />}
              <span style={{ fontWeight: 600, fontSize: 13 }}>
                Confidence: {Math.round(testResult.confidence * 100)}%
                {testResult.meets_threshold ? ' - Would auto-respond' : ' - Would escalate'}
              </span>
            </div>
            {testResult.suggestion && (
              <div style={{ background: '#222', borderRadius: 6, padding: 12, fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>
                {testResult.suggestion}
              </div>
            )}
            {testResult.sources?.length > 0 && (
              <div style={{ fontSize: 11, color: '#939393' }}>Sources: {testResult.sources.join(', ')}</div>
            )}
            {testResult.fallback && (
              <div style={{ fontSize: 12, color: '#ff9800', marginTop: 4 }}>{testResult.fallback}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AIAutoResponseSettings;
