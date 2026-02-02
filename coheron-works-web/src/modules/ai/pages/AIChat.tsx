import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';
import { apiService } from '../../../services/apiService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  data?: any;
  timestamp: Date;
}

const sInput: React.CSSProperties = { flex: 1, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '12px 16px', color: '#e0e0e0', fontSize: 14, outline: 'none' };
const sBtn: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '12px 16px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 };

const AIChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const data = await apiService.create<any>('/ai/query', { query: input });

      // Handle nested response shapes
      const result = data.data || data;
      const text = result.explanation || result.response_text || result.summary || data.explanation || data.response_text;
      const items = result.results || result.data;

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: text || 'I processed your query but found no matching results. Try rephrasing your question.',
        data: Array.isArray(items) ? items : undefined,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorText = err?.response?.data?.error || err?.message || 'Failed to get response. Please try again.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: errorText, timestamp: new Date() }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      <div style={{ padding: '16px 32px', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Sparkles size={20} style={{ color: '#00C971' }} />
        <span style={{ fontWeight: 600, fontSize: 18 }}>AI Chat</span>
        <span style={{ fontSize: 13, color: '#888', marginLeft: 8 }}>Ask anything about your business data</span>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 32, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#666', padding: 60 }}>
            <Sparkles size={40} style={{ margin: '0 auto 16px', display: 'block', color: '#333' }} />
            <div style={{ fontSize: 16, marginBottom: 8 }}>Ask anything about your business data</div>
            <div style={{ fontSize: 13, color: '#444' }}>Try: "Show overdue invoices" or "Sales forecast for next quarter"</div>
          </div>
        )}
        {messages.map(msg => (
          <div key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '70%' }}>
            <div style={{ background: msg.role === 'user' ? '#00C971' : '#141414', color: msg.role === 'user' ? '#000' : '#e0e0e0', padding: '12px 16px', borderRadius: 12, fontSize: 14, lineHeight: 1.6 }}>
              {msg.content}
            </div>
            {msg.data && Array.isArray(msg.data) && msg.data.length > 0 && (
              <div style={{ background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 12, marginTop: 6, fontSize: 12, maxHeight: 300, overflow: 'auto' }}>
                <div style={{ color: '#888', marginBottom: 6 }}>{msg.data.length} result(s)</div>
                <pre style={{ margin: 0, color: '#aaa', whiteSpace: 'pre-wrap' }}>{JSON.stringify(msg.data.slice(0, 10), null, 2)}</pre>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' }}>
            <div style={{ background: '#141414', padding: '12px 16px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#888' }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: 20, borderTop: '1px solid #222', display: 'flex', gap: 8 }}>
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
  );
};

export default AIChat;
