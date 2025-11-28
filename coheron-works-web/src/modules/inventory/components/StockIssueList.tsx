import { useState, useEffect } from 'react';
import { Eye, Edit, CheckCircle, Package, Trash2, X } from 'lucide-react';
import { inventoryService, type StockIssue } from '../../../services/inventoryService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { StockIssueForm } from './StockIssueForm';
import { showToast } from '../../../components/Toast';
import './StockIssueList.css';

interface StockIssueListProps {
  onRefresh?: () => void;
}

export const StockIssueList = ({ onRefresh }: StockIssueListProps) => {
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIssue, setSelectedIssue] = useState<StockIssue | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [filters, setFilters] = useState({
    state: '',
    issue_type: '',
  });

  useEffect(() => {
    loadIssues();
  }, [filters]);

  const loadIssues = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getStockIssues(filters);
      setIssues(data);
    } catch (error) {
      console.error('Failed to load stock issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (issue: StockIssue) => {
    setSelectedIssue(issue);
    setShowDetails(true);
  };

  const handleEdit = (issue: StockIssue) => {
    setSelectedIssue(issue);
    setShowForm(true);
  };

  const handleApprove = async (id: number) => {
    if (!confirm('Approve this stock issue?')) return;
    try {
      await inventoryService.approveStockIssue(id);
      loadIssues();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to approve:', error);
      showToast('Failed to approve stock issue', 'error');
    }
  };

  const handleIssue = async (id: number) => {
    if (!confirm('Issue this stock? This will reduce inventory.')) return;
    try {
      await inventoryService.issueStockIssue(id);
      loadIssues();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to issue:', error);
      showToast('Failed to issue stock', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this stock issue? This action cannot be undone.')) {
      return;
    }

    try {
      await inventoryService.deleteStockIssue(id);
      loadIssues();
      onRefresh?.();
      showToast('Stock issue deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete stock issue:', error);
      showToast('Failed to delete stock issue. Please try again.', 'error');
    }
  };

  const handleCancel = async (id: number) => {
    if (!window.confirm('Cancel this stock issue?')) return;
    try {
      await inventoryService.updateStockIssue(id, { state: 'cancel' });
      loadIssues();
      onRefresh?.();
    } catch (error) {
      console.error('Failed to cancel:', error);
      showToast('Failed to cancel stock issue', 'error');
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      draft: { label: 'Draft', class: 'badge-gray' },
      pending_approval: { label: 'Pending Approval', class: 'badge-yellow' },
      approved: { label: 'Approved', class: 'badge-blue' },
      issued: { label: 'Issued', class: 'badge-green' },
      done: { label: 'Done', class: 'badge-green' },
      cancel: { label: 'Cancelled', class: 'badge-red' },
    };
    return badges[state] || { label: state, class: 'badge-gray' };
  };

  const getIssueTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      production: 'Production',
      project: 'Project',
      job: 'Job',
      work_order: 'Work Order',
      ad_hoc: 'Ad-hoc',
      sample: 'Sample',
      internal_consumption: 'Internal',
    };
    return labels[type] || type;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="stock-issue-list">
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
            <option value="issued">Issued</option>
            <option value="done">Done</option>
          </select>
          <select
            value={filters.issue_type}
            onChange={(e) => setFilters({ ...filters, issue_type: e.target.value })}
          >
            <option value="">All Types</option>
            <option value="production">Production</option>
            <option value="project">Project</option>
            <option value="work_order">Work Order</option>
            <option value="ad_hoc">Ad-hoc</option>
            <option value="sample">Sample</option>
            <option value="internal_consumption">Internal</option>
          </select>
        </div>
      </div>

      <div className="issues-table">
        <table>
          <thead>
            <tr>
              <th>Issue Number</th>
              <th>Type</th>
              <th>From Warehouse</th>
              <th>To</th>
              <th>Date</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {issues.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  <Package size={48} />
                  <p>No stock issues found</p>
                </td>
              </tr>
            ) : (
              issues.map((issue) => {
                const badge = getStateBadge(issue.state);
                return (
                  <tr key={issue.id}>
                    <td>{issue.issue_number}</td>
                    <td>{getIssueTypeLabel(issue.issue_type)}</td>
                    <td>{issue.from_warehouse_name}</td>
                    <td>
                      {issue.to_production_id && `MO-${issue.to_production_id}`}
                      {issue.to_project_id && `Project-${issue.to_project_id}`}
                      {issue.to_work_order_id && `WO-${issue.to_work_order_id}`}
                      {issue.to_reference && issue.to_reference}
                    </td>
                    <td>{new Date(issue.issue_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          type="button"
                          className="action-btn"
                          title="View"
                          onClick={() => handleView(issue)}
                        >
                          <Eye size={16} />
                        </button>
                        {issue.state === 'draft' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Edit"
                            onClick={() => handleEdit(issue)}
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {issue.state === 'draft' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Approve"
                            onClick={() => handleApprove(issue.id)}
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                        {issue.state === 'approved' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Issue"
                            onClick={() => handleIssue(issue.id)}
                          >
                            <Package size={16} />
                          </button>
                        )}
                        {issue.state === 'draft' && (
                          <button
                            type="button"
                            className="action-btn delete"
                            title="Delete"
                            onClick={() => handleDelete(issue.id)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                        {issue.state !== 'done' && issue.state !== 'cancel' && (
                          <button
                            type="button"
                            className="action-btn"
                            title="Cancel"
                            onClick={() => handleCancel(issue.id)}
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
        <StockIssueForm
          issue={selectedIssue || undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedIssue(null);
          }}
          onSuccess={() => {
            setShowForm(false);
            setSelectedIssue(null);
            loadIssues();
            onRefresh?.();
          }}
        />
      )}

      {showDetails && selectedIssue && (
        <div className="modal-overlay" onClick={() => setShowDetails(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Stock Issue Details</h2>
              <button type="button" onClick={() => setShowDetails(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Issue Number:</span>
                <span className="detail-value">{selectedIssue.issue_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{getIssueTypeLabel(selectedIssue.issue_type)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">From Warehouse:</span>
                <span className="detail-value">{selectedIssue.from_warehouse_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">State:</span>
                <span className="detail-value">
                  <span className={`state-badge ${getStateBadge(selectedIssue.state).class}`}>
                    {getStateBadge(selectedIssue.state).label}
                  </span>
                </span>
              </div>
              {selectedIssue.lines && selectedIssue.lines.length > 0 && (
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
                      {selectedIssue.lines.map((line, idx) => (
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

