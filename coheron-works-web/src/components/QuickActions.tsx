import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  X,
  ShoppingCart,
  FileText,
  UserPlus,
  Headphones,
  Users,
} from 'lucide-react';
import { useModalDismiss } from '../hooks/useModalDismiss';
import './QuickActions.css';

interface QuickAction {
  label: string;
  path: string;
  icon: React.ReactNode;
  color: string;
}

const actions: QuickAction[] = [
  { label: 'New Sales Order', path: '/sales/orders', icon: <ShoppingCart size={18} />, color: 'var(--primary)' },
  { label: 'New Invoice', path: '/accounting/invoices', icon: <FileText size={18} />, color: 'var(--accent)' },
  { label: 'New Lead', path: '/crm/leads', icon: <UserPlus size={18} />, color: 'var(--success)' },
  { label: 'New Ticket', path: '/support/tickets', icon: <Headphones size={18} />, color: 'var(--warning)' },
  { label: 'New Employee', path: '/hr/employees', icon: <Users size={18} />, color: 'var(--danger)' },
];

export const QuickActions = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const close = useCallback(() => setIsOpen(false), []);
  useModalDismiss(isOpen, close);

  const handleAction = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="quick-actions">
      {isOpen && (
        <div className="quick-actions-backdrop" onClick={close} />
      )}

      <div className={`quick-actions-menu ${isOpen ? 'open' : ''}`}>
        {actions.map((action, index) => (
          <button
            key={action.path}
            className="quick-action-item"
            onClick={() => handleAction(action.path)}
            style={{
              transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
              '--action-color': action.color,
            } as React.CSSProperties}
          >
            <span className="quick-action-icon">{action.icon}</span>
            <span className="quick-action-label">{action.label}</span>
          </button>
        ))}
      </div>

      <button
        className={`quick-actions-fab ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close quick actions' : 'Open quick actions'}
      >
        {isOpen ? <X size={24} /> : <Zap size={24} />}
      </button>
    </div>
  );
};
