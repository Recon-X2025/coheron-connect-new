import { useState, useEffect } from 'react';
import { Plus, FileText, Calendar, DollarSign, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type Contract, type Subscription } from '../../services/salesService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './ContractsManagement.css';

export const ContractsManagement = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contracts' | 'subscriptions'>('contracts');
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'contracts') {
        const data = await salesService.contracts.getContracts(
          statusFilter !== 'all' ? { status: statusFilter } : {}
        );
        setContracts(data);
      } else {
        const data = await salesService.contracts.getSubscriptions(
          statusFilter !== 'all' ? { status: statusFilter } : {}
        );
        setSubscriptions(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={16} className="status-icon active" />;
      case 'expired': return <XCircle size={16} className="status-icon expired" />;
      case 'cancelled': return <XCircle size={16} className="status-icon cancelled" />;
      default: return <Clock size={16} className="status-icon draft" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'expired': return '#ef4444';
      case 'cancelled': return '#94a3b8';
      case 'draft': return '#64748b';
      default: return '#64748b';
    }
  };

  const filteredContracts = contracts.filter(contract =>
    contract.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contract.partner_id.toString().includes(searchTerm)
  );

  const filteredSubscriptions = subscriptions.filter(sub =>
    sub.subscription_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.partner_id.toString().includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="contracts-management">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading contracts..." />
        </div>
      </div>
    );
  }

  return (
    <div className="contracts-management">
      <div className="container">
        <div className="contracts-header">
          <div>
            <h1>Contracts & Subscriptions</h1>
            <p className="contracts-subtitle">Manage contracts, SLAs, and subscriptions</p>
          </div>
          <Button icon={<Plus size={20} />}>New {activeTab === 'contracts' ? 'Contract' : 'Subscription'}</Button>
        </div>

        <div className="contracts-tabs">
          <button
            className={`tab ${activeTab === 'contracts' ? 'active' : ''}`}
            onClick={() => setActiveTab('contracts')}
          >
            <FileText size={18} />
            Contracts
          </button>
          <button
            className={`tab ${activeTab === 'subscriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('subscriptions')}
          >
            <RefreshCw size={18} />
            Subscriptions
          </button>
        </div>

        <div className="contracts-filters">
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {activeTab === 'contracts' && (
          <div className="contracts-grid">
            {filteredContracts.map((contract) => (
              <div
                key={contract.id}
                className="contract-card"
                onClick={() => setSelectedContract(contract)}
              >
                <div className="card-header">
                  <div>
                    <h3>{contract.contract_number}</h3>
                    <p className="contract-type">{contract.contract_type}</p>
                  </div>
                  <span
                    className="status-badge"
                    style={{ color: getStatusColor(contract.status) }}
                  >
                    {getStatusIcon(contract.status)}
                    {contract.status}
                  </span>
                </div>
                <div className="card-body">
                  <div className="contract-detail">
                    <Calendar size={16} />
                    <span>
                      {new Date(contract.start_date).toLocaleDateString()} -{' '}
                      {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Ongoing'}
                    </span>
                  </div>
                  <div className="contract-detail">
                    <DollarSign size={16} />
                    <span>{formatInLakhsCompact(contract.contract_value)} {contract.currency}</span>
                  </div>
                  {contract.auto_renew && (
                    <div className="contract-detail">
                      <RefreshCw size={16} />
                      <span>Auto-renewal enabled</span>
                    </div>
                  )}
                </div>
                {contract.slas && contract.slas.length > 0 && (
                  <div className="card-footer">
                    <span className="sla-count">{contract.slas.length} SLA(s)</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="subscriptions-list">
            {filteredSubscriptions.map((subscription) => (
              <div key={subscription.id} className="subscription-card">
                <div className="subscription-header">
                  <div>
                    <h3>{subscription.subscription_number}</h3>
                    <p className="subscription-plan">{subscription.subscription_plan || 'Standard Plan'}</p>
                  </div>
                  <span
                    className="status-badge"
                    style={{ color: getStatusColor(subscription.status) }}
                  >
                    {getStatusIcon(subscription.status)}
                    {subscription.status}
                  </span>
                </div>
                <div className="subscription-body">
                  <div className="subscription-detail">
                    <span className="detail-label">Billing Cycle:</span>
                    <span className="detail-value">{subscription.billing_cycle}</span>
                  </div>
                  <div className="subscription-detail">
                    <span className="detail-label">Amount:</span>
                    <span className="detail-value">{formatInLakhsCompact(subscription.total_price)}</span>
                  </div>
                  {subscription.next_billing_date && (
                    <div className="subscription-detail">
                      <span className="detail-label">Next Billing:</span>
                      <span className="detail-value">
                        {new Date(subscription.next_billing_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedContract && (
          <div className="modal-overlay" onClick={() => setSelectedContract(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedContract.contract_number}</h2>
                <button onClick={() => setSelectedContract(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="contract-details">
                  <div className="detail-section">
                    <h3>Contract Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Type:</span>
                        <span>{selectedContract.contract_type}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Status:</span>
                        <span>{selectedContract.status}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Value:</span>
                        <span>{formatInLakhsCompact(selectedContract.contract_value)} {selectedContract.currency}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Billing Cycle:</span>
                        <span>{selectedContract.billing_cycle}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Start Date:</span>
                        <span>{new Date(selectedContract.start_date).toLocaleDateString()}</span>
                      </div>
                      {selectedContract.end_date && (
                        <div className="detail-item">
                          <span className="label">End Date:</span>
                          <span>{new Date(selectedContract.end_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      {selectedContract.auto_renew && (
                        <div className="detail-item">
                          <span className="label">Auto Renewal:</span>
                          <span>Enabled</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedContract.contract_lines && selectedContract.contract_lines.length > 0 && (
                    <div className="detail-section">
                      <h3>Contract Lines</h3>
                      <table className="contract-lines-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedContract.contract_lines.map((line) => (
                            <tr key={line.id}>
                              <td>{line.product_name}</td>
                              <td>{line.quantity}</td>
                              <td>{formatInLakhsCompact(line.unit_price)}</td>
                              <td>{formatInLakhsCompact(line.total_price)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedContract.slas && selectedContract.slas.length > 0 && (
                    <div className="detail-section">
                      <h3>Service Level Agreements</h3>
                      <div className="slas-list">
                        {selectedContract.slas.map((sla) => (
                          <div key={sla.id} className="sla-item">
                            <div className="sla-header">
                              <h4>{sla.name}</h4>
                              <span className="sla-type">{sla.sla_type}</span>
                            </div>
                            <div className="sla-details">
                              <span>Target: {sla.target_value} {sla.unit || ''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

