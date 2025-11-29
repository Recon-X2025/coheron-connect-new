import { useState, useEffect } from 'react';
import { RotateCcw, Shield, Wrench, Search, Plus, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type RMA } from '../../services/salesService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { RMAForm } from './components/RMAForm';
import './ReturnsManagement.css';

export const ReturnsManagement = () => {
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rmas' | 'warranties' | 'repairs'>('rmas');
  const [selectedRMA, setSelectedRMA] = useState<RMA | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRMAForm, setShowRMAForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'rmas') {
        const data = await salesService.returns.getRMAs(
          statusFilter !== 'all' ? { status: statusFilter } : {}
        );
        setRmas(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="status-icon completed" />;
      case 'approved': return <CheckCircle size={16} className="status-icon approved" />;
      case 'rejected': return <XCircle size={16} className="status-icon rejected" />;
      default: return <Clock size={16} className="status-icon pending" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'approved': return '#3b82f6';
      case 'rejected': return '#ef4444';
      case 'processed': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const filteredRMAs = rmas.filter(rma =>
    (rma.rma_number?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (rma.partner_id?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="returns-management">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading returns..." />
        </div>
      </div>
    );
  }

  return (
    <div className="returns-management">
      <div className="container">
        <div className="returns-header">
          <div>
            <h1>Returns & After-Sales</h1>
            <p className="returns-subtitle">Manage RMAs, warranties, and repairs</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowRMAForm(true)}>New RMA</Button>
        </div>

        <div className="returns-tabs">
          <button
            className={`tab ${activeTab === 'rmas' ? 'active' : ''}`}
            onClick={() => setActiveTab('rmas')}
          >
            <RotateCcw size={18} />
            RMAs
          </button>
          <button
            className={`tab ${activeTab === 'warranties' ? 'active' : ''}`}
            onClick={() => setActiveTab('warranties')}
          >
            <Shield size={18} />
            Warranties
          </button>
          <button
            className={`tab ${activeTab === 'repairs' ? 'active' : ''}`}
            onClick={() => setActiveTab('repairs')}
          >
            <Wrench size={18} />
            Repairs
          </button>
        </div>

        <div className="returns-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="received">Received</option>
            <option value="processed">Processed</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {activeTab === 'rmas' && (
          <div className="rmas-list">
            {filteredRMAs.map((rma) => (
              <div
                key={rma.id}
                className="rma-card"
                onClick={() => setSelectedRMA(rma)}
              >
                <div className="rma-header">
                  <div>
                    <h3>{rma.rma_number}</h3>
                    <p className="customer-name">{rma.partner_id || 'Unknown Customer'}</p>
                  </div>
                  <span
                    className="status-badge"
                    style={{ color: getStatusColor(rma.status) }}
                  >
                    {getStatusIcon(rma.status)}
                    {rma.status}
                  </span>
                </div>
                <div className="rma-body">
                  <div className="rma-detail">
                    <span className="detail-label">Reason:</span>
                    <span className="detail-value">{rma.reason.replace('_', ' ')}</span>
                  </div>
                  <div className="rma-detail">
                    <span className="detail-label">Requested:</span>
                    <span className="detail-value">
                      {new Date(rma.requested_date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="rma-detail">
                    <span className="detail-label">Refund Amount:</span>
                    <span className="detail-value">{formatInLakhsCompact(rma.refund_amount)}</span>
                  </div>
                </div>
                {rma.rma_lines && rma.rma_lines.length > 0 && (
                  <div className="rma-footer">
                    <span>{rma.rma_lines.length} item(s) to return</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'warranties' && (
          <div className="empty-state">
            <Shield size={48} />
            <h3>Warranty Management</h3>
            <p>Warranty tracking will be available here</p>
          </div>
        )}

        {activeTab === 'repairs' && (
          <div className="empty-state">
            <Wrench size={48} />
            <h3>Repair Requests</h3>
            <p>Repair request management will be available here</p>
          </div>
        )}

        {selectedRMA && (
          <div className="modal-overlay" onClick={() => setSelectedRMA(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedRMA.rma_number}</h2>
                <button onClick={() => setSelectedRMA(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="rma-details">
                  <div className="detail-section">
                    <h3>RMA Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Status:</span>
                        <span>{selectedRMA.status}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Reason:</span>
                        <span>{selectedRMA.reason.replace('_', ' ')}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Requested Date:</span>
                        <span>{new Date(selectedRMA.requested_date).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Refund Amount:</span>
                        <span>{formatInLakhsCompact(selectedRMA.refund_amount)}</span>
                      </div>
                      {(selectedRMA as any).refund_method && (
                        <div className="detail-item">
                          <span className="label">Refund Method:</span>
                          <span>{(selectedRMA as any).refund_method}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedRMA.rma_lines && selectedRMA.rma_lines.length > 0 && (
                    <div className="detail-section">
                      <h3>Return Items</h3>
                      <table className="rma-lines-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Condition</th>
                            <th>Refund Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRMA.rma_lines.map((line) => (
                            <tr key={line.id}>
                              <td>{line.product_name || `Product ${line.product_id}`}</td>
                              <td>{line.quantity_returned}</td>
                              <td>{line.condition}</td>
                              <td>{formatInLakhsCompact(line.refund_amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showRMAForm && (
          <RMAForm
            onClose={() => setShowRMAForm(false)}
            onSave={() => {
              setShowRMAForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

