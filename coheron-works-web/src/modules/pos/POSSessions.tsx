import { useState, useEffect } from 'react';
import { Plus, Play, Square, DollarSign, Calculator, Clock, CheckCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { posService, type POSSession } from '../../services/posService';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './POSSessions.css';

export const POSSessions = () => {
  const [sessions, setSessions] = useState<POSSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOpenDialog, setShowOpenDialog] = useState(false);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState<POSSession | null>(null);
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [stores, setStores] = useState<any[]>([]);
  const [terminals, setTerminals] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    state: '',
    store_id: '',
  });

  useEffect(() => {
    loadSessions();
    loadStores();
  }, [filters]);

  useEffect(() => {
    if (filters.store_id) {
      loadTerminals();
    }
  }, [filters.store_id]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filters.state) params.state = filters.state;
      if (filters.store_id) params.store_id = parseInt(filters.store_id);
      const data = await posService.getSessions(params);
      setSessions(data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStores = async () => {
    try {
      const data = await apiService.get<any>('/stores');
      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    }
  };

  const loadTerminals = async () => {
    try {
      const data = await posService.getTerminals({ store_id: parseInt(filters.store_id) });
      setTerminals(data);
    } catch (error) {
      console.error('Failed to load terminals:', error);
    }
  };

  const handleOpenSession = async () => {
    if (!selectedSession || !openingBalance) {
      showToast('Please enter opening balance', 'error');
      return;
    }
    try {
      await posService.openSession(selectedSession.id, parseFloat(openingBalance));
      setShowOpenDialog(false);
      setSelectedSession(null);
      setOpeningBalance('');
      loadSessions();
    } catch (error) {
      console.error('Failed to open session:', error);
      showToast('Failed to open session', 'error');
    }
  };

  const handleCloseSession = async () => {
    if (!selectedSession || !closingBalance) {
      showToast('Please enter closing balance', 'error');
      return;
    }
    try {
      await posService.closeSession(selectedSession.id, parseFloat(closingBalance));
      setShowCloseDialog(false);
      setSelectedSession(null);
      setClosingBalance('');
      loadSessions();
    } catch (error) {
      console.error('Failed to close session:', error);
      showToast('Failed to close session', 'error');
    }
  };

  const handleCreateSession = async () => {
    if (!filters.store_id) {
      showToast('Please select a store', 'error');
      return;
    }
    if (terminals.length === 0) {
      showToast('No terminals available for this store', 'error');
      return;
    }
    try {
      await posService.createSession({
        store_id: parseInt(filters.store_id),
        terminal_id: terminals[0].id,
        opening_balance: 0,
        state: 'opening',
      });
      loadSessions();
    } catch (error) {
      console.error('Failed to create session:', error);
      showToast('Failed to create session', 'error');
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string; icon: any }> = {
      opening: { label: 'Opening', class: 'badge-yellow', icon: Clock },
      opened: { label: 'Open', class: 'badge-green', icon: Play },
      closing: { label: 'Closing', class: 'badge-orange', icon: Square },
      closed: { label: 'Closed', class: 'badge-gray', icon: CheckCircle },
    };
    return badges[state] || { label: state, class: 'badge-gray', icon: Clock };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="pos-sessions">
      <div className="sessions-header">
        <h2>POS Sessions</h2>
        <div className="header-actions">
          <div className="filters">
            <select
              value={filters.store_id}
              onChange={(e) => setFilters({ ...filters, store_id: e.target.value })}
            >
              <option value="">All Stores</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            <select
              value={filters.state}
              onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            >
              <option value="">All States</option>
              <option value="opening">Opening</option>
              <option value="opened">Open</option>
              <option value="closing">Closing</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <Button onClick={handleCreateSession} size="sm">
            <Plus size={16} /> New Session
          </Button>
        </div>
      </div>

      <div className="sessions-grid">
        {sessions.map((session) => {
          const badge = getStateBadge(session.state);
          const Icon = badge.icon;
          const difference = session.difference || 0;
          return (
            <div key={session.id} className="session-card">
              <div className="session-card-header">
                <div className="session-info">
                  <h3>{session.name}</h3>
                  <span className="session-number">{session.session_number}</span>
                </div>
                <span className={`state-badge ${badge.class}`}>
                  <Icon size={16} />
                  {badge.label}
                </span>
              </div>

              <div className="session-details">
                <div className="detail-item">
                  <span className="detail-label">Store:</span>
                  <span className="detail-value">{session.store_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Terminal:</span>
                  <span className="detail-value">{session.terminal_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Cashier:</span>
                  <span className="detail-value">{session.user_name}</span>
                </div>
              </div>

              <div className="session-financials">
                <div className="financial-row">
                  <span>Opening Balance:</span>
                  <strong>{formatCurrency(session.opening_balance)}</strong>
                </div>
                {session.closing_balance !== undefined && (
                  <div className="financial-row">
                    <span>Closing Balance:</span>
                    <strong>{formatCurrency(session.closing_balance)}</strong>
                  </div>
                )}
                <div className="financial-row">
                  <span>Expected Balance:</span>
                  <strong>{formatCurrency(session.expected_balance || session.opening_balance + session.total_sales)}</strong>
                </div>
                {session.difference !== undefined && (
                  <div className={`financial-row ${difference !== 0 ? 'difference' : ''}`}>
                    <span>Difference:</span>
                    <strong>{formatCurrency(difference)}</strong>
                  </div>
                )}
              </div>

              <div className="session-stats">
                <div className="stat-item">
                  <DollarSign size={18} />
                  <div>
                    <div className="stat-value">{formatCurrency(session.total_sales)}</div>
                    <div className="stat-label">Total Sales</div>
                  </div>
                </div>
                <div className="stat-item">
                  <Calculator size={18} />
                  <div>
                    <div className="stat-value">{session.total_orders}</div>
                    <div className="stat-label">Orders</div>
                  </div>
                </div>
              </div>

              <div className="session-payments">
                <div className="payment-breakdown">
                  <div className="payment-item">
                    <span>Cash:</span>
                    <span>{formatCurrency(session.total_cash)}</span>
                  </div>
                  <div className="payment-item">
                    <span>Card:</span>
                    <span>{formatCurrency(session.total_card)}</span>
                  </div>
                  <div className="payment-item">
                    <span>UPI:</span>
                    <span>{formatCurrency(session.total_upi)}</span>
                  </div>
                  <div className="payment-item">
                    <span>Other:</span>
                    <span>{formatCurrency(session.total_other)}</span>
                  </div>
                </div>
              </div>

              <div className="session-actions">
                {session.state === 'opening' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowOpenDialog(true);
                    }}
                  >
                    <Play size={16} /> Open Session
                  </Button>
                )}
                {session.state === 'opened' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setSelectedSession(session);
                      setShowCloseDialog(true);
                    }}
                  >
                    <Square size={16} /> Close Session
                  </Button>
                )}
                <Button size="sm" variant="secondary">
                  View Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {showOpenDialog && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowOpenDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Open Session</h3>
              <button type="button" onClick={() => setShowOpenDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Opening Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                  placeholder="Enter opening cash balance"
                  autoFocus
                />
              </div>
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowOpenDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleOpenSession}>Open Session</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCloseDialog && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowCloseDialog(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Close Session</h3>
              <button type="button" onClick={() => setShowCloseDialog(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="session-summary">
                <div className="summary-row">
                  <span>Opening Balance:</span>
                  <strong>{formatCurrency(selectedSession.opening_balance)}</strong>
                </div>
                <div className="summary-row">
                  <span>Total Sales:</span>
                  <strong>{formatCurrency(selectedSession.total_sales)}</strong>
                </div>
                <div className="summary-row">
                  <span>Expected Balance:</span>
                  <strong>{formatCurrency(selectedSession.opening_balance + selectedSession.total_sales)}</strong>
                </div>
              </div>
              <div className="form-group">
                <label>Closing Balance (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={closingBalance}
                  onChange={(e) => setClosingBalance(e.target.value)}
                  placeholder="Enter actual closing cash balance"
                  autoFocus
                />
              </div>
              {closingBalance && (
                <div className="difference-display">
                  <span>Difference:</span>
                  <strong className={parseFloat(closingBalance) - (selectedSession.opening_balance + selectedSession.total_sales) !== 0 ? 'difference-warning' : ''}>
                    {formatCurrency(parseFloat(closingBalance) - (selectedSession.opening_balance + selectedSession.total_sales))}
                  </strong>
                </div>
              )}
              <div className="modal-actions">
                <Button variant="secondary" onClick={() => setShowCloseDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCloseSession}>Close Session</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

