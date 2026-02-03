import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minimize2, Maximize2, User, Bot } from 'lucide-react';
import { Button } from './Button';
import './LiveChatWidget.css';

const PORTAL_API = import.meta.env.PROD ? '/api/support/portal' : 'http://localhost:3000/api/support/portal';

interface ChatSession {
  session_id: string;
  visitor_name: string;
  assigned_agent_id?: string;
  status: string;
  messages?: ChatMessage[];
}

interface ChatMessage {
  _id?: string;
  id?: number;
  session_id: string;
  message_type: string;
  content: string;
  is_read?: boolean;
  created_at: string;
}

interface LiveChatWidgetProps {
  visitorName?: string;
  visitorEmail?: string;
  onTicketCreated?: (ticketId: number) => void;
  openRef?: React.MutableRefObject<(() => void) | null>;
}

const chatFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${PORTAL_API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
};

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  visitorName,
  visitorEmail,
  openRef,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (openRef) {
      openRef.current = () => setIsOpen(true);
    }
  }, [openRef]);

  useEffect(() => {
    if (isOpen && !session) {
      initializeSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (session) {
      loadMessages();
      const interval = setInterval(loadMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      const chatSession = await chatFetch('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({
          visitor_name: visitorName || 'Visitor',
          visitor_email: visitorEmail,
          channel: 'web',
        }),
      });
      setSession(chatSession);
      setWaitingForAgent(!chatSession.assigned_agent_id);
    } catch (error) {
      console.error('Error initializing chat session:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!session) return;
    try {
      const data = await chatFetch(`/chat/sessions/${session.session_id}`);
      setMessages(data.messages || []);
      setWaitingForAgent(!data.assigned_agent_id && data.status === 'waiting');
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!session || !newMessage.trim()) return;
    try {
      const message = await chatFetch(`/chat/sessions/${session.session_id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage, message_type: 'user' }),
      });
      setMessages([...messages, message]);
      setNewMessage('');
      inputRef.current?.focus();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) {
    return (
      <button className="chat-widget-button" onClick={() => setIsOpen(true)}>
        <MessageSquare size={24} />
        <span>Chat with us</span>
      </button>
    );
  }

  return (
    <div className={`chat-widget ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-widget-header">
        <div className="chat-header-info">
          <MessageSquare size={20} />
          <div>
            <h4>Support Chat</h4>
            {session?.assigned_agent_id ? (
              <span className="agent-status">Agent connected</span>
            ) : waitingForAgent ? (
              <span className="agent-status waiting">Waiting for agent...</span>
            ) : (
              <span className="agent-status">Connecting...</span>
            )}
          </div>
        </div>
        <div className="chat-header-actions">
          <button
            className="icon-button"
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Maximize' : 'Minimize'}
          >
            {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
          </button>
          <button className="icon-button" onClick={() => setIsOpen(false)} title="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="chat-messages">
            {loading ? (
              <div className="chat-loading">Connecting to support...</div>
            ) : messages.length === 0 ? (
              <div className="chat-welcome">
                <p>Welcome! How can we help you today?</p>
              </div>
            ) : (
              messages.map((message, idx) => (
                <div
                  key={message._id || message.id || idx}
                  className={`chat-message chat-message-${message.message_type}`}
                >
                  <div className="message-avatar">
                    {message.message_type === 'bot' ? (
                      <Bot size={16} />
                    ) : message.message_type === 'user' ? (
                      <User size={16} />
                    ) : (
                      <MessageSquare size={16} />
                    )}
                  </div>
                  <div className="message-content">
                    <div className="message-bubble">{message.content}</div>
                    <div className="message-time">
                      {new Date(message.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!session}
            />
            <Button
              size="sm"
              icon={<Send size={16} />}
              onClick={sendMessage}
              disabled={!newMessage.trim() || !session}
            >
              Send
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
