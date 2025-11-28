import { useState } from 'react';
import { Eye, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';
import { type StockAdjustment } from '../../../services/inventoryService';
import { AdjustmentForm } from './AdjustmentForm';
import './AdjustmentList.css';
import './GRNList.css';

interface AdjustmentListProps {
  adjustments: StockAdjustment[];
  onRefresh: () => void;
}

export const AdjustmentList = ({ adjustments, onRefresh }: AdjustmentListProps) => {
  const [showForm, setShowForm] = useState(false);
  const [viewingAdjustment, setViewingAdjustment] = useState<StockAdjustment | undefined>(undefined);
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
      case 'approved':
        return 'approved';
      default:
        return 'pending';
    }
  };

  const getTypeColor = (type: string) => {
    if (type === 'gain' || type === 'revaluation') return 'positive';
    return 'negative';
  };

  return (
    <div className="adjustment-list">
      <div className="list-header">
        <h3>Stock Adjustments ({adjustments.length})</h3>
        <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>New Adjustment</Button>
      </div>

      <div className="list-table">
        <table>
          <thead>
            <tr>
              <th>Adjustment Number</th>
              <th>Date</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Value</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((adjustment) => (
              <tr key={adjustment.id}>
                <td className="adjustment-number">{adjustment.adjustment_number}</td>
                <td>{new Date(adjustment.adjustment_date).toLocaleDateString()}</td>
                <td>{adjustment.warehouse_name}</td>
                <td>
                  <span className={`adjustment-type ${getTypeColor(adjustment.adjustment_type)}`}>
                    {adjustment.adjustment_type}
                  </span>
                </td>
                <td>₹{adjustment.total_value.toFixed(2)}</td>
                <td>
                  <span className={`state-badge ${getStateColor(adjustment.state)}`}>
                    {getStateIcon(adjustment.state)}
                    {adjustment.state}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    title="View"
                    onClick={() => setViewingAdjustment(adjustment)}
                  >
                    <Eye size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <AdjustmentForm
              onClose={() => setShowForm(false)}
              onSuccess={() => {
                onRefresh();
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}

      {viewingAdjustment && (
        <div className="modal-overlay" onClick={() => setViewingAdjustment(undefined)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Adjustment Details: {viewingAdjustment.adjustment_number}</h2>
              <button type="button" onClick={() => setViewingAdjustment(undefined)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Adjustment Number:</span>
                <span className="detail-value">{viewingAdjustment.adjustment_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{viewingAdjustment.adjustment_type}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Warehouse:</span>
                <span className="detail-value">{viewingAdjustment.warehouse_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{new Date(viewingAdjustment.adjustment_date).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Total Value:</span>
                <span className="detail-value">₹{viewingAdjustment.total_value.toFixed(2)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">State:</span>
                <span className="detail-value">{viewingAdjustment.state}</span>
              </div>
              {viewingAdjustment.lines && viewingAdjustment.lines.length > 0 && (
                <div className="detail-section">
                  <h3>Items</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>System Qty</th>
                        <th>Physical Qty</th>
                        <th>Adjustment</th>
                        <th>Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingAdjustment.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>{line.product_name || line.product_code}</td>
                          <td>{line.system_qty}</td>
                          <td>{line.physical_qty}</td>
                          <td>{line.adjustment_qty}</td>
                          <td>₹{line.adjustment_value.toFixed(2)}</td>
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

