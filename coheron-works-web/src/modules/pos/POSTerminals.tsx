import { useState, useEffect } from 'react';
import { Monitor, Plus, Edit, Trash2, Settings, Printer, Barcode, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { posService, type POSTerminal } from '../../services/posService';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './POSTerminals.css';

export const POSTerminals = () => {
  const [terminals, setTerminals] = useState<POSTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTerminal, setSelectedTerminal] = useState<POSTerminal | null>(null);
  const [stores, setStores] = useState<any[]>([]);

  useEffect(() => {
    loadTerminals();
    loadStores();
  }, []);

  const loadTerminals = async () => {
    try {
      setLoading(true);
      const data = await posService.getTerminals();
      setTerminals(data);
    } catch (error) {
      console.error('Failed to load terminals:', error);
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

  const handleSaveTerminal = async (terminal: Partial<POSTerminal>) => {
    try {
      if (terminal.id) {
        await posService.updateTerminal(terminal.id, terminal);
      } else {
        await posService.createTerminal(terminal);
      }
      loadTerminals();
      setShowForm(false);
      setSelectedTerminal(null);
    } catch (error) {
      console.error('Failed to save terminal:', error);
      showToast('Failed to save terminal', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this terminal?')) return;
    try {
      await apiService.getAxiosInstance().delete(`/pos/terminals/${id}`);
      loadTerminals();
    } catch (error) {
      console.error('Failed to delete terminal:', error);
      showToast('Failed to delete terminal', 'error');
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="pos-terminals">
      <div className="terminals-header">
        <h2>POS Terminals</h2>
        <Button
          size="sm"
          onClick={() => {
            setSelectedTerminal(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} /> New Terminal
        </Button>
      </div>

      <div className="terminals-grid">
        {terminals.length === 0 ? (
          <div className="empty-state">
            <Monitor size={64} />
            <p>No terminals configured</p>
            <Button onClick={() => setShowForm(true)}>Create First Terminal</Button>
          </div>
        ) : (
          terminals.map((terminal) => (
            <div key={terminal.id} className="terminal-card">
              <div className="terminal-card-header">
                <div className="terminal-icon">
                  <Monitor size={32} />
                </div>
                <div className="terminal-info">
                  <h3>{terminal.name}</h3>
                  <span className="terminal-code">{terminal.code}</span>
                </div>
                <div className="terminal-status">
                  {terminal.is_active ? (
                    <CheckCircle size={24} className="status-icon enabled" />
                  ) : (
                    <XCircle size={24} className="status-icon disabled" />
                  )}
                </div>
              </div>

              <div className="terminal-details">
                <div className="detail-item">
                  <span className="detail-label">Store:</span>
                  <span className="detail-value">{terminal.store_name || '-'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${terminal.is_active ? 'active' : 'inactive'}`}>
                    {terminal.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="terminal-hardware">
                <h4>Hardware Configuration</h4>
                <div className="hardware-items">
                  <div className="hardware-item">
                    <Printer size={18} />
                    <span>Printer: {terminal.printer_id ? `#${terminal.printer_id}` : 'Not configured'}</span>
                  </div>
                  <div className="hardware-item">
                    <Barcode size={18} />
                    <span>Scanner: {terminal.barcode_scanner_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                  <div className="hardware-item">
                    <Settings size={18} />
                    <span>Cash Drawer: {terminal.cash_drawer_enabled ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              </div>

              <div className="terminal-actions">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedTerminal(terminal);
                    setShowForm(true);
                  }}
                >
                  <Edit size={16} /> Edit
                </Button>
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleDelete(terminal.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <TerminalForm
          terminal={selectedTerminal || undefined}
          stores={stores}
          onClose={() => {
            setShowForm(false);
            setSelectedTerminal(null);
          }}
          onSave={handleSaveTerminal}
        />
      )}
    </div>
  );
};

// Terminal Form Component
interface TerminalFormProps {
  terminal?: POSTerminal;
  stores: any[];
  onClose: () => void;
  onSave: (terminal: Partial<POSTerminal>) => void;
}

const TerminalForm = ({ terminal, stores, onClose, onSave }: TerminalFormProps) => {
  const [formData, setFormData] = useState({
    name: terminal?.name || '',
    code: terminal?.code || '',
    store_id: terminal?.store_id?.toString() || '',
    is_active: terminal?.is_active ?? true,
    printer_id: terminal?.printer_id?.toString() || '',
    cash_drawer_enabled: terminal?.cash_drawer_enabled ?? true,
    barcode_scanner_enabled: terminal?.barcode_scanner_enabled ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: terminal?.id,
      name: formData.name,
      code: formData.code,
      store_id: parseInt(formData.store_id),
      is_active: formData.is_active,
      printer_id: formData.printer_id ? parseInt(formData.printer_id) : undefined,
      cash_drawer_enabled: formData.cash_drawer_enabled,
      barcode_scanner_enabled: formData.barcode_scanner_enabled,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{terminal ? 'Edit Terminal' : 'Create Terminal'}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Terminal Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Terminal Code *</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
              placeholder="e.g., TERM-001"
            />
          </div>
          <div className="form-group">
            <label>Store *</label>
            <select
              value={formData.store_id}
              onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
              required
            >
              <option value="">Select Store</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Printer ID</label>
            <input
              type="number"
              value={formData.printer_id}
              onChange={(e) => setFormData({ ...formData, printer_id: e.target.value })}
              placeholder="Printer device ID"
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.cash_drawer_enabled}
                onChange={(e) => setFormData({ ...formData, cash_drawer_enabled: e.target.checked })}
              />
              Enable Cash Drawer
            </label>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.barcode_scanner_enabled}
                onChange={(e) => setFormData({ ...formData, barcode_scanner_enabled: e.target.checked })}
              />
              Enable Barcode Scanner
            </label>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{terminal ? 'Update' : 'Create'} Terminal</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

