import { useState, useEffect } from 'react';
import { Eye, Edit, CheckCircle, Package, RefreshCw, Trash2, X } from 'lucide-react';
import { inventoryService, type StockReturn } from '../../../services/inventoryService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { StockReturnForm } from './StockReturnForm';
import { showToast } from '../../../components/Toast';
import { confirmAction } from '../../../components/ConfirmDialog';
import './StockReturnList.css';

interface StockReturnListProps {
  onRefresh?: () => void;
}

export const StockReturnList = ({ onRefresh }: StockReturnListProps) => {
  const [returns, setReturns] = useState<StockReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReturn, setSelectedReturn] = useState<StockReturn | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    state: '',
    return_type: '',
  });

  useEffect(() => {
    loadReturns();
  }, [filters]);

  const loadReturns = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getStockReturns(filters);
      setReturns(data);
    } catch (error) {
      console.error('Failed to load stock returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (return_transaction: StockReturn) => {
    setSelectedReturn(return_transaction);
    setShowDetails(true);
  };

  const handleEdit = (return_transaction: StockReturn) => {
    setSelectedReturn(return_transaction);
    setShowForm(true);
  };

  const handleApprove = async (id: number) => {
    const ok = await confirmAction({
      title: 'Approve Stock Return',
      message: 'Approve this stock return?',
      confirmLabel: 'Approve',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await inventoryService.approveStockReturn(id);
      loadReturns();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to approve:', error);
      showToast('Failed to approve stock return', 'error');
    }
  };

  const handleReceive = async (id: number) => {
    const ok = await confirmAction({
      title: 'Receive Stock Return',
      message: 'Receive this stock return?',
      confirmLabel: 'Receive',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await inventoryService.receiveStockReturn(id);
      loadReturns();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to receive:', error);
      showToast('Failed to receive stock return', 'error');
    }
  };

  const handleRestock = async (id: number) => {
    const ok = await confirmAction({
      title: 'Restock Return',
      message: 'Restock this return? This will add inventory back.',
      confirmLabel: 'Restock',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await inventoryService.restockStockReturn(id);
      loadReturns();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to restock:', error);
      showToast('Failed to restock', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Stock Return',
      message: 'Are you sure you want to delete this stock return? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await inventoryService.deleteStockReturn(id);
      loadReturns();
      onRefresh?.();
      showToast('Stock return deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete stock return:', error);
      showToast('Failed to delete stock return. Please try again.', 'error');
    }
  };

  const handleCancel = async (id: number) => {
    const ok = await confirmAction({
      title: 'Cancel Stock Return',
      message: 'Cancel this stock return?',
      confirmLabel: 'Cancel Return',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await inventoryService.updateStockReturn(id, { state: 'cancel' });
      loadReturns();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cancel:', error);
      showToast('Failed to cancel stock return', 'error');
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      draft: { label: 'Draft', class: 'badge-gray' },
      pending_approval: { label: 'Pending Approval', class: 'badge-yellow' },
      approved: { label: 'Approved', class: 'badge-blue' },
      received: { label: 'Received', class: 'badge-green' },
      qc_pending: { label: 'QC Pending', class: 'badge-yellow' },
      qc_passed: { label: 'QC Passed', class: 'badge-green' },
      qc_failed: { label: 'QC Failed', class: 'badge-red' },
      restocked: { label: 'Restocked', class: 'badge-green' },
      done: { label: 'Done', class: 'badge-green' },
      cancel: { label: 'Cancelled', class: 'badge-red' },
    };
    return badges[state] || { label: state, class: 'badge-gray' };
  };

  const getReturnTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      purchase_return: 'Purchase Return',
      sales_return: 'Sales Return',
      internal_return: 'Internal Return',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="stock-return-list">
      <div className="list-header">
        <div className="filters">
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
          >
            <option value="">All States</option>
            <option value="draft">Draft</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="received">Received</option>
            <option value="qc_pending">QC Pending</option>
            <option value="restocked">Restocked</option>
            <option value="done">Done</option>
          </select>
          <select
            value={filters.return_type}
            onChange={(e) => setFilters({ ...filters, return_type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="purchase_return">Purchase Return</option>
            <option value="sales_return">Sales Return</option>
            <option value="internal_return">Internal Return</option>
          </select>
        </div>
      </div>

      <div className="returns-table">
        <table>
          <thead>
            <tr>
              <th>Return Number</th>
              <th>Type</th>
              <th>Original Transaction</th>
              <th>Warehouse</th>
              <th>Date</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {returns.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  <Package size={48} />
                  <p>No stock returns found</p>
                </td>
              </tr>
            ) : (
              returns.map((return_transaction, idx) => {
                const badge = getStateBadge(return_transaction.state);
                return (
                  <tr key={return_transaction.id || (return_transaction as any)._id || idx}>
                    <td>{return_transaction.return_number}</td>
                    <td>{getReturnTypeLabel(return_transaction.return_type)}</td>
                    <td>{return_transaction.original_transaction_ref || `#${return_transaction.original_transaction_id}`}</td>
                    <td>{return_transaction.warehouse_name}</td>
                    <td>{new Date(return_transaction.return_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="action-btn"
                          title="View"
                          onClick={() => handleView(return_transaction)}
                        >
                          <Eye size={16} />
                        </button>
                        {return_transaction.state === 'draft' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Edit"
                            onClick={() => handleEdit(return_transaction)}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {return_transaction.state === 'draft' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Approve"
                            onClick={() => handleApprove(return_transaction.id)}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {return_transaction.state === 'approved' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Receive"
                            onClick={() => handleReceive(return_transaction.id)}
                          >
                            <Package size={16} />
                          </button>
                        )}
                        {return_transaction.state === 'qc_passed' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Restock"
                            onClick={() => handleRestock(return_transaction.id)}
                          >
                            <RefreshCw size={16} />
                          </button>
                        )}
                        {return_transaction.state === 'draft' && (
                          <button
                            type="button"
                            className="action-btn delete"
                            title="Delete"
                            onClick={() => handleDelete(return_transaction.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {return_transaction.state !== 'done' && return_transaction.state !== 'cancel' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Cancel"
                            onClick={() => handleCancel(return_transaction.id)}
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <StockReturnForm
          return_transaction={selectedReturn || undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedReturn(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedReturn(null);
            loadReturns();
            onRefresh?.();
          }}
        />
      )}

      {showDetails && selectedReturn && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Stock Return Details</h2>
              <button type="button" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Return Number:</span>
                <span className="detail-value">{selectedReturn.return_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{getReturnTypeLabel(selectedReturn.return_type)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Original Transaction:</span>
                <span className="detail-value">{selectedReturn.original_transaction_ref || `#${selectedReturn.original_transaction_id}`}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Warehouse:</span>
                <span className="detail-value">{selectedReturn.warehouse_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Return Reason:</span>
                <span className="detail-value">{selectedReturn.return_reason}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">State:</span>
                <span className="detail-value">
                  <span className={`state-badge ${getStateBadge(selectedReturn.state).class}`}>
                    {getStateBadge(selectedReturn.state).label}
                  </span>
                </span>
              </div>
              {selectedReturn.lines && selectedReturn.lines.length > 0 && (
                <div className="detail-section">
                  <h3>Items</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Lot</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedReturn.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>{line.product_name || line.product_code}</td>
                          <td>{line.quantity}</td>
                          <td>{line.lot_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

