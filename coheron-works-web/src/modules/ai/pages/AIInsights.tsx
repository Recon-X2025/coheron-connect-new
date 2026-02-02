import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X,
  BarChart3,
  ShieldAlert,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';

// ── Types ──────────────────────────────────────────────────────────────

interface Insight {
  _id: string;
  type: string;
  module: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data?: any;
  created_at: string;
  dismissed?: boolean;
}

interface Anomaly {
  metric: string;
  current: number;
  expected: number;
  deviation: number;
  severity: string;
  description?: string;
}

interface ForecastPoint {
  period: string;
  predicted: number;
  lower?: number;
  upper?: number;
}

interface Recommendation {
  title: string;
  description: string;
  impact: string;
  priority: 'high' | 'medium' | 'low';
  module?: string;
}

// ── Styles ─────────────────────────────────────────────────────────────

const page: React.CSSProperties = { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' };
const card: React.CSSProperties = { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24 };
const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 };
const badge = (color: string): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px',
  borderRadius: 20, fontSize: 11, fontWeight: 600, background: `${color}18`, color,
});
const btnIcon: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: 4, borderRadius: 4,
};
const pillBtn = (active: boolean): React.CSSProperties => ({
  padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? '#00C971' : '#333'}`,
  background: active ? '#00C97118' : 'transparent', color: active ? '#00C971' : '#999',
  fontSize: 12, fontWeight: 500, cursor: 'pointer',
});

// ── Helpers ─────────────────────────────────────────────────────────────

const severityColor: Record<string, string> = { critical: '#ef4444', warning: '#f59e0b', info: '#3b82f6' };
const priorityColor: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#3b82f6' };

const formatCurrency = (n: number) =>
  `₹${Math.abs(n) >= 1e5 ? `${(n / 1e5).toFixed(1)}L` : n.toLocaleString('en-IN')}`;

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

// ── Sparkline ───────────────────────────────────────────────────────────

const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data, color, width = 200, height = 48,
}) => {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={parseFloat(points.split(' ').pop()!.split(',')[0])} cy={parseFloat(points.split(' ').pop()!.split(',')[1])} r={3} fill={color} />
    </svg>
  );
};

// ── Bar chart ───────────────────────────────────────────────────────────

const ForecastChart: React.FC<{ data: ForecastPoint[] }> = ({ data }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.upper ?? d.predicted));
  const barWidth = Math.min(48, Math.floor(600 / data.length) - 8);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 180, minWidth: data.length * (barWidth + 8) }}>
        {data.map((d, i) => {
          const h = (d.predicted / (maxVal || 1)) * 160;
          const upperH = d.upper ? ((d.upper - d.predicted) / (maxVal || 1)) * 160 : 0;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, color: '#888' }}>{formatCurrency(d.predicted)}</div>
              <div style={{ position: 'relative', width: barWidth }}>
                {upperH > 0 && (
                  <div style={{
                    position: 'absolute', bottom: h, width: '100%', height: upperH,
                    background: '#00C97110', border: '1px dashed #00C97140', borderRadius: '4px 4px 0 0',
                  }} />
                )}
                <div style={{
                  width: '100%', height: h, borderRadius: '4px 4px 0 0',
                  background: `linear-gradient(180deg, #00C971 0%, #00C97160 100%)`,
                }} />
              </div>
              <div style={{ fontSize: 10, color: '#666', whiteSpace: 'nowrap' }}>{d.period}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Anomaly Card ────────────────────────────────────────────────────────

const AnomalyCard: React.FC<{ anomaly: Anomaly }> = ({ anomaly }) => {
  const isUp = anomaly.current > anomaly.expected;
  const pct = anomaly.expected ? Math.abs(((anomaly.current - anomaly.expected) / anomaly.expected) * 100) : 0;
  const color = anomaly.severity === 'critical' ? '#ef4444' : anomaly.severity === 'warning' ? '#f59e0b' : '#3b82f6';

  return (
    <div style={{ ...card, padding: 16, borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{anomaly.metric}</div>
        <span style={badge(color)}>
          <AlertTriangle size={10} />
          {anomaly.severity}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 10, color: '#888' }}>Actual</div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(anomaly.current)}</div>
        </div>
        <div style={{ color: '#555' }}>vs</div>
        <div>
          <div style={{ fontSize: 10, color: '#888' }}>Expected</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: '#888' }}>{formatCurrency(anomaly.expected)}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2, color: isUp ? '#10b981' : '#ef4444', fontWeight: 600, fontSize: 14 }}>
          {isUp ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {pct.toFixed(1)}%
        </div>
      </div>
      {anomaly.description && <div style={{ fontSize: 12, color: '#888' }}>{anomaly.description}</div>}
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────

const AIInsights: React.FC = () => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [forecast, setForecast] = useState<ForecastPoint[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModule, setActiveModule] = useState('sales');
  const [insightFilter, setInsightFilter] = useState<string>('all');

  const modules = ['sales', 'inventory', 'accounting', 'crm', 'hr'];

  const fetchAll = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [insightsRes, anomaliesRes, forecastRes, recsRes] = await Promise.allSettled([
        apiService.getRaw<any>(`/admin/ai/insights?module=${activeModule}&limit=20`),
        apiService.getRaw<any>(`/admin/ai/anomalies?module=${activeModule}`),
        apiService.getRaw<any>(`/admin/ai/forecast/${activeModule}?periods=6`),
        apiService.getRaw<any>(`/admin/ai/recommendations/${activeModule}`),
      ]);

      if (insightsRes.status === 'fulfilled') {
        const data = insightsRes.value;
        setInsights(Array.isArray(data) ? data : data?.data || data?.insights || []);
      }
      if (anomaliesRes.status === 'fulfilled') {
        const data = anomaliesRes.value;
        setAnomalies(Array.isArray(data) ? data : data?.anomalies || data?.data || []);
      }
      if (forecastRes.status === 'fulfilled') {
        const data = forecastRes.value;
        setForecast(Array.isArray(data) ? data : data?.forecast || data?.data || []);
      }
      if (recsRes.status === 'fulfilled') {
        const data = recsRes.value;
        setRecommendations(Array.isArray(data) ? data : data?.recommendations || data?.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch AI insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeModule]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDismiss = async (id: string) => {
    try {
      await apiService.create(`/admin/ai/insights/${id}/dismiss`, {});
      setInsights(prev => prev.filter(i => i._id !== id));
    } catch { /* ignore */ }
  };

  const handleFeedback = async (id: string, helpful: boolean) => {
    try {
      await apiService.create(`/admin/ai/insights/${id}/feedback`, { rating: helpful ? 'helpful' : 'not_helpful' });
    } catch { /* ignore */ }
  };

  const handleGenerate = async () => {
    setRefreshing(true);
    try {
      await apiService.create('/admin/ai/generate-insights', { module: activeModule });
      await fetchAll();
    } catch {
      setRefreshing(false);
    }
  };

  const filteredInsights = insightFilter === 'all'
    ? insights
    : insights.filter(i => i.severity === insightFilter);

  const forecastValues = forecast.map(f => f.predicted);
  const forecastTrend = forecastValues.length >= 2
    ? forecastValues[forecastValues.length - 1] - forecastValues[0]
    : 0;

  // ── Stat Cards ──────────────────────────────────────────────────

  const statCards = [
    {
      label: 'Active Insights', value: insights.length,
      icon: <Lightbulb size={18} />, color: '#f59e0b',
      sub: `${insights.filter(i => i.severity === 'critical').length} critical`,
    },
    {
      label: 'Anomalies Detected', value: anomalies.length,
      icon: <ShieldAlert size={18} />, color: '#ef4444',
      sub: anomalies.length > 0 ? `${anomalies.filter(a => a.severity === 'critical').length} critical` : 'All clear',
    },
    {
      label: 'Forecast Trend', value: forecastTrend !== 0 ? formatCurrency(Math.abs(forecastTrend)) : '--',
      icon: forecastTrend >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />,
      color: forecastTrend >= 0 ? '#10b981' : '#ef4444',
      sub: forecastTrend >= 0 ? 'Upward trend' : 'Downward trend',
    },
    {
      label: 'Recommendations', value: recommendations.length,
      icon: <Zap size={18} />, color: '#8b5cf6',
      sub: `${recommendations.filter(r => r.priority === 'high').length} high priority`,
    },
  ];

  // ── Render ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <LoadingSpinner size="large" message="Analyzing your data..." />
      </div>
    );
  }

  return (
    <div style={page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <TrendingUp size={28} style={{ color: '#f59e0b' }} />
            AI Insights
          </h1>
          <p style={{ color: '#888', fontSize: 14 }}>AI-powered analytics, forecasting, and anomaly detection</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleGenerate}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
              border: '1px solid #333', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            <Sparkles size={14} style={{ color: '#f59e0b' }} />
            Generate Insights
          </button>
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8,
              border: '1px solid #333', background: '#1a1a1a', color: '#fff', cursor: 'pointer', fontSize: 13,
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Module Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {modules.map(m => (
          <button key={m} onClick={() => setActiveModule(m)} style={pillBtn(activeModule === m)}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(s => (
          <div key={s.label} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 12, color: '#888' }}>{s.label}</span>
              <span style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color, marginBottom: 2 }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#666' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Main Grid: Forecast + Anomalies */}
      <div style={{ ...grid2, marginBottom: 24 }}>
        {/* Forecast */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                <BarChart3 size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#00C971' }} />
                Sales Forecast
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>Next 6 periods predicted revenue</div>
            </div>
            {forecastValues.length > 0 && (
              <Sparkline data={forecastValues} color="#00C971" width={80} height={32} />
            )}
          </div>
          {forecast.length > 0 ? (
            <ForecastChart data={forecast} />
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: '#555' }}>
              <TrendingUp size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: 13 }}>Not enough data to generate forecast</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Add more sales data to enable predictions</div>
            </div>
          )}
        </div>

        {/* Anomalies */}
        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
              <ShieldAlert size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#ef4444' }} />
              Anomaly Detection
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>Unusual patterns in {activeModule} data</div>
          </div>
          {anomalies.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 320, overflowY: 'auto' }}>
              {anomalies.map((a, i) => <AnomalyCard key={i} anomaly={a} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: 32, color: '#555' }}>
              <ShieldAlert size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: 13, color: '#10b981' }}>No anomalies detected</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>All metrics are within expected ranges</div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Grid: Insights + Recommendations */}
      <div style={{ ...grid2 }}>
        {/* Insights Feed */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
                <Lightbulb size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#f59e0b' }} />
                Insights
              </div>
              <div style={{ fontSize: 12, color: '#888' }}>AI-generated observations</div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['all', 'critical', 'warning', 'info'].map(f => (
                <button key={f} onClick={() => setInsightFilter(f)} style={{
                  ...pillBtn(insightFilter === f),
                  padding: '4px 10px', fontSize: 11,
                  borderColor: insightFilter === f ? (severityColor[f] || '#00C971') : '#333',
                  background: insightFilter === f ? `${severityColor[f] || '#00C971'}18` : 'transparent',
                  color: insightFilter === f ? (severityColor[f] || '#00C971') : '#999',
                }}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
            {filteredInsights.length > 0 ? filteredInsights.map(insight => (
              <div key={insight._id} style={{
                padding: 14, borderRadius: 8, background: '#0f0f0f', border: '1px solid #1e1e1e',
                borderLeft: `3px solid ${severityColor[insight.severity] || '#3b82f6'}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{insight.title}</div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={() => handleFeedback(insight._id, true)} style={btnIcon} title="Helpful">
                      <ThumbsUp size={12} />
                    </button>
                    <button onClick={() => handleFeedback(insight._id, false)} style={btnIcon} title="Not helpful">
                      <ThumbsDown size={12} />
                    </button>
                    <button onClick={() => handleDismiss(insight._id)} style={btnIcon} title="Dismiss">
                      <X size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 6 }}>
                  {insight.description}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={badge(severityColor[insight.severity] || '#3b82f6')}>{insight.severity}</span>
                  <span style={{ fontSize: 10, color: '#666' }}>{insight.module}</span>
                  <span style={{ fontSize: 10, color: '#555', marginLeft: 'auto' }}>{relativeTime(insight.created_at)}</span>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: 32, color: '#555' }}>
                <Lightbulb size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>No insights yet</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  Click "Generate Insights" to analyze your {activeModule} data
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div style={card}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>
              <Zap size={16} style={{ marginRight: 6, verticalAlign: 'middle', color: '#8b5cf6' }} />
              Smart Recommendations
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>Actionable suggestions for {activeModule}</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
            {recommendations.length > 0 ? recommendations.map((rec, i) => (
              <div key={i} style={{
                padding: 14, borderRadius: 8, background: '#0f0f0f', border: '1px solid #1e1e1e',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 6 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{rec.title}</div>
                  <span style={badge(priorityColor[rec.priority] || '#3b82f6')}>
                    {rec.priority}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#999', lineHeight: 1.5, marginBottom: 8 }}>
                  {rec.description}
                </div>
                {rec.impact && (
                  <div style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ArrowUpRight size={12} />
                    Expected impact: {rec.impact}
                  </div>
                )}
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: 32, color: '#555' }}>
                <Zap size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>No recommendations available</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>
                  Recommendations will appear as more data is collected
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
