import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, MessageSquare, FileText, TrendingUp } from 'lucide-react';

const sCard: React.CSSProperties = { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, cursor: 'pointer', transition: 'border-color 0.2s' };
const sStatCard: React.CSSProperties = { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20 };

const AIDashboard: React.FC = () => {
  const navigate = useNavigate();

  const quickActions = [
    { icon: MessageSquare, label: 'AI Chat', description: 'Ask questions about your business data', path: '/ai/chat', color: '#00C971' },
    { icon: FileText, label: 'Document Analysis', description: 'Extract data from invoices, POs, and receipts', path: '/ai/documents', color: '#3b82f6' },
    { icon: TrendingUp, label: 'Insights', description: 'AI-powered analytics and forecasting', path: '/ai/insights', color: '#f59e0b' },
  ];

  const stats = [
    { label: 'Queries Today', value: '--', color: '#00C971' },
    { label: 'Documents Processed', value: '--', color: '#3b82f6' },
    { label: 'Insights Generated', value: '--', color: '#f59e0b' },
    { label: 'Avg Response Time', value: '--', color: '#8b5cf6' },
  ];

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>
        <Sparkles size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: '#00C971' }} />
        AI Assistant
      </h1>
      <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>Intelligent tools to help you work faster</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {stats.map(s => (
          <div key={s.label} style={sStatCard}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Quick Actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {quickActions.map(a => (
          <div
            key={a.path}
            style={sCard}
            onClick={() => navigate(a.path)}
            onMouseEnter={e => (e.currentTarget.style.borderColor = a.color)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}
          >
            <a.icon size={24} style={{ color: a.color, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{a.label}</div>
            <div style={{ fontSize: 13, color: '#888' }}>{a.description}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIDashboard;
