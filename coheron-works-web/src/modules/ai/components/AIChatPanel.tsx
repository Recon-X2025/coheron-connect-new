import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  timestamp: Date;
}

const sPanel: React.CSSProperties = { position: 'fixed', right: 0, top: 0, bottom: 0, width: 420, background: '#141414', borderLeft: '1px solid #222', zIndex: 1000, display: 'flex', flexDirection: 'column' };
const sOverlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 999 };
const sInput: React.CSSProperties = { flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '10px 14px', color: '#e0e0e0', fontSize: 14, outline: 'none' };
const sBtn: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 };
const sFab: React.CSSProperties = { position: 'fixed', bottom: 24, right: 24, width: 56, height: 56, borderRadius: '50%', background: '#00C971', color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 998, boxShadow: '0 4px 12px rgba(0,201,113,0.3)' };

export const AIChatPanel: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('authToken') || '';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/ai/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ query: input }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.explanation || data.response_text || 'No response.',
        data: data.data,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'Failed to get response. Please try again.', timestamp: new Date() }]);
    }
    setLoading(false);
  };

  if (!open) {
    return <button style={sFab} onClick={() => setOpen(true)} title="AI Assistant"><Sparkles size={24} /></button>;
  }

  return (
    <>
      <div style={sOverlay} onClick={() => setOpen(false)} />
      <div style={sPanel}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} style={{ color: '#00C971' }} />
            <span style={{ fontWeight: 600, fontSize: 16, color: '#fff' }}>AI Assistant</span>
          </div>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }} onClick={() => setOpen(false)}><X size={20} /></button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
              <Sparkles size={32} style={{ margin: '0 auto 12px', display: 'block', color: '#333' }} />
              <div style={{ fontSize: 14 }}>Ask anything about your business data</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 8 }}>Try: "Show overdue invoices" or "Sales forecast"</div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
              <div style={{ background: msg.role === 'user' ? '#00C971' : '#1a1a1a', color: msg.role === 'user' ? '#000' : '#e0e0e0', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.5 }}>
                {msg.content}
              </div>
              {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
                <div style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 8, marginTop: 4, fontSize: 12, maxHeight: 200, overflow: 'auto' }}>
                  <div style={{ color: '#888', marginBottom: 4 }}>{msg.data.length} result(s)</div>
                  <pre style={{ margin: 0, color: '#aaa', whiteSpace: 'pre-wrap' }}>{JSON.stringify(msg.data.slice(0, 5), null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: 'flex-start' }}>
              <div style={{ background: '#1a1a1a', padding: '10px 14px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
                <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 16, borderTop: '1px solid #222', display: 'flex', gap: 8 }}>
          <input
            style={sInput}
            placeholder="Ask about your data..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
          />
          <button style={sBtn} onClick={sendMessage} disabled={loading}>
            <Send size={16} />
          </button>
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    </>
  );
};

export default AIChatPanel;
