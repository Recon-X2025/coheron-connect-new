import { useState } from 'react';
import { Plus, Eye, Edit, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../../components/Button';
import { type GRN } from '../../../services/inventoryService';
import { GRNForm } from './GRNForm';
import './GRNList.css';

interface GRNListProps {
  grns: GRN[];
  onRefresh: () => void;
}

export const GRNList = ({ grns, onRefresh }: GRNListProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingGRN, setEditingGRN] = useState<GRN | undefined>(undefined);
  const [viewingGRN, setViewingGRN] = useState<GRN | undefined>(undefined);

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'done':
        return <CheckCircle size={18} className="state-icon done" />;
      case 'cancel':
        return <XCircle size={18} className="state-icon cancel" />;
      default:
        return <Clock size={18} className="state-icon pending" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'done':
        return 'done';
      case 'cancel':
        return 'cancel';
      case 'qc_passed':
        return 'passed';
      case 'qc_failed':
        return 'failed';
      default:
        return 'pending';
    }
  };

  return (
    <div className="grn-list">
      <div className="list-header">
        <h3>Goods Receipt Notes ({grns.length})</h3>
        <Button icon={<Plus size={18} />} onClick={() => {
          setEditingGRN(undefined);
          setShowForm(true);
        }}>New GRN</Button>
      </div>

      <div className="list-table">
        <table>
          <thead>
            <tr>
              <th>GRN Number</th>
              <th>Date</th>
              <th>Supplier</th>
              <th>Warehouse</th>
              <th>QC Status</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {grns.map((grn) => (
              <tr key={grn.id}>
                <td className="grn-number">{grn.grn_number}</td>
                <td>{new Date(grn.grn_date).toLocaleDateString()}</td>
                <td>{grn.partner_name}</td>
                <td>{grn.warehouse_name}</td>
                <td>
                  <span className={`qc-status ${grn.qc_status || 'pending'}`}>
                    {grn.qc_status || 'Pending'}
                  </span>
                </td>
                <td>
                  <span className={`state-badge ${getStateColor(grn.state)}`}>
                    {getStateIcon(grn.state)}
                    {grn.state}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      type="button"
                      className="icon-button"
                      title="View"
                      onClick={() => setViewingGRN(grn)}
                    >
                      <Eye size={18} />
                    </button>
                    {grn.state === 'draft' && (
                      <button
                        type="button"
                        className="icon-button"
                        title="Edit"
                        onClick={() => {
                          setEditingGRN(grn);
                          setShowForm(true);
                        }}
                      >
                        <Edit size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => {
          setShowForm(false);
          setEditingGRN(undefined);
        }}>
          <div onClick={(e) => e.stopPropagation()}>
            <GRNForm
              grn={editingGRN}
              onClose={() => {
                setShowForm(false);
                setEditingGRN(undefined);
              }}
              onSuccess={() => {
                onRefresh();
                setShowForm(false);
                setEditingGRN(undefined);
              }}
            />
          </div>
        </div>
      )}

      {viewingGRN && (
        <div className="modal-overlay" onClick={() => setViewingGRN(undefined)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>GRN Details: {viewingGRN.grn_number}</h2>
              <button type="button" onClick={() => setViewingGRN(undefined)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">GRN Number:</span>
                <span className="detail-value">{viewingGRN.grn_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{new Date(viewingGRN.grn_date).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Supplier:</span>
                <span className="detail-value">{viewingGRN.partner_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Warehouse:</span>
                <span className="detail-value">{viewingGRN.warehouse_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">State:</span>
                <span className="detail-value">{viewingGRN.state}</span>
              </div>
              {viewingGRN.lines && viewingGRN.lines.length > 0 && (
                <div className="detail-section">
                  <h3>Items</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Ordered</th>
                        <th>Received</th>
                        <th>Accepted</th>
                        <th>Rejected</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingGRN.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>{line.product_name || line.product_code}</td>
                          <td>{line.ordered_qty}</td>
                          <td>{line.received_qty}</td>
                          <td>{line.accepted_qty}</td>
                          <td>{line.rejected_qty}</td>
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

