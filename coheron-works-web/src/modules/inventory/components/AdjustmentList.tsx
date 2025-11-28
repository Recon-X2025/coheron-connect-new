import { useState } from 'react';
import { FileText, Eye, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';
import { type StockAdjustment } from '../../../services/inventoryService';
import { AdjustmentForm } from './AdjustmentForm';
import './AdjustmentList.css';

interface AdjustmentListProps {
  adjustments: StockAdjustment[];
  onRefresh: () => void;
}

export const AdjustmentList = ({ adjustments, onRefresh }: AdjustmentListProps) => {
  const [showForm, setShowForm] = useState(false);
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
                  <button className="icon-button">
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
    </div>
  );
};

