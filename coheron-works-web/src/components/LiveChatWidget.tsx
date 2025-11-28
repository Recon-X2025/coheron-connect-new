import { useState, useEffect, useRef } from 'react';
import { MessageSquare, X, Send, Minimize2, Maximize2, User, Bot } from 'lucide-react';
import { Button } from './Button';
import { supportDeskService, type ChatSession, type ChatMessage } from '../services/supportDeskService';
import './LiveChatWidget.css';

interface LiveChatWidgetProps {
  sessionId?: string;
  visitorName?: string;
  visitorEmail?: string;
  onTicketCreated?: (ticketId: number) => void;
}

export const LiveChatWidget: React.FC<LiveChatWidgetProps> = ({
  sessionId: initialSessionId,
  visitorName,
  visitorEmail,
  onTicketCreated,
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
    if (isOpen && !session) {
      initializeSession();
    }
  }, [isOpen]);

  useEffect(() => {
    if (session) {
      loadMessages();
      // Poll for new messages every 2 seconds
      const interval = setInterval(loadMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [session]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      setLoading(true);
      let chatSession: ChatSession;

      if (initialSessionId) {
        chatSession = await supportDeskService.getChatSession(initialSessionId);
      } else {
        chatSession = await supportDeskService.createChatSession({
          visitor_name: visitorName,
          visitor_email: visitorEmail,
          channel: 'web',
        });
      }

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
      const updatedSession = await supportDeskService.getChatSession(session.session_id);
      setMessages(updatedSession.messages || []);
      setWaitingForAgent(!updatedSession.assigned_agent_id && updatedSession.status === 'waiting');
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!session || !newMessage.trim()) return;

    try {
      const message = await supportDeskService.sendChatMessage(session.session_id, {
        content: newMessage,
        message_type: 'user',
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

  const createTicketFromChat = async () => {
    if (!session) return;

    try {
      const ticket = await supportDeskService.createTicketFromChat(session.session_id, {
        subject: `Chat: ${visitorName || 'Visitor'}`,
        description: messages.map((m) => `${m.message_type}: ${m.content}`).join('\n'),
      });

      if (onTicketCreated) {
        onTicketCreated(ticket.id);
      }

      // Add system message
      const systemMessage: ChatMessage = {
        id: Date.now(),
        session_id: session.session_id,
        message_type: 'system',
        content: `Ticket #${ticket.ticket_number} has been created from this chat.`,
        is_read: false,
        created_at: new Date().toISOString(),
      };

      setMessages([...messages, systemMessage]);
    } catch (error) {
      console.error('Error creating ticket:', error);
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
              messages.map((message) => (
                <div
                  key={message.id}
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

          {waitingForAgent && messages.length > 0 && (
            <div className="chat-waiting-notice">
              <p>An agent will be with you shortly. In the meantime, you can create a ticket.</p>
              <Button size="sm" onClick={createTicketFromChat}>
                Create Ticket
              </Button>
            </div>
          )}

          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={!session || waitingForAgent}
            />
            <Button
              size="sm"
              icon={<Send size={16} />}
              onClick={sendMessage}
              disabled={!newMessage.trim() || !session || waitingForAgent}
            >
              Send
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

