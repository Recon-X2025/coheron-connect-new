import { useState } from 'react';
import { Eye, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';
import { type StockTransfer } from '../../../services/inventoryService';
import { TransferForm } from './TransferForm';
import './TransferList.css';
import './GRNList.css';

interface TransferListProps {
  transfers: StockTransfer[];
  onRefresh: () => void;
}

export const TransferList = ({ transfers, onRefresh }: TransferListProps) => {
  const [showForm, setShowForm] = useState(false);
  const [viewingTransfer, setViewingTransfer] = useState<StockTransfer | undefined>(undefined);
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
      case 'received':
        return 'received';
      default:
        return 'pending';
    }
  };

  return (
    <div className="transfer-list">
      <div className="list-header">
        <h3>Stock Transfers ({transfers.length})</h3>
        <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>New Transfer</Button>
      </div>

      <div className="list-table">
        <table>
          <thead>
            <tr>
              <th>Transfer Number</th>
              <th>Date</th>
              <th>From</th>
              <th>To</th>
              <th>Type</th>
              <th>State</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((transfer, idx) => (
              <tr key={transfer.id || (transfer as any)._id || idx}>
                <td className="transfer-number">{transfer.transfer_number}</td>
                <td>{new Date(transfer.transfer_date).toLocaleDateString()}</td>
                <td>{transfer.from_warehouse_name}</td>
                <td>{transfer.to_warehouse_name}</td>
                <td>
                  <span className="transfer-type">{transfer.transfer_type}</span>
                </td>
                <td>
                  <span className={`state-badge ${getStateColor(transfer.state)}`}>
                    {getStateIcon(transfer.state)}
                    {transfer.state}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="icon-button"
                    title="View"
                    onClick={() => setViewingTransfer(transfer)}
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
            <TransferForm
              onClose={() => setShowForm(false)}
              onSuccess={() => {
                onRefresh();
                setShowForm(false);
              }}
            />
          </div>
        </div>
      )}

      {viewingTransfer && (
        <div className="modal-overlay" onClick={() => setViewingTransfer(undefined)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transfer Details: {viewingTransfer.transfer_number}</h2>
              <button type="button" onClick={() => setViewingTransfer(undefined)}>×</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="detail-label">Transfer Number:</span>
                <span className="detail-value">{viewingTransfer.transfer_number}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">From:</span>
                <span className="detail-value">{viewingTransfer.from_warehouse_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">To:</span>
                <span className="detail-value">{viewingTransfer.to_warehouse_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{new Date(viewingTransfer.transfer_date).toLocaleDateString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">State:</span>
                <span className="detail-value">{viewingTransfer.state}</span>
              </div>
              {viewingTransfer.lines && viewingTransfer.lines.length > 0 && (
                <div className="detail-section">
                  <h3>Items</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Done</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingTransfer.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>{line.product_name || line.product_code}</td>
                          <td>{line.quantity}</td>
                          <td>{line.quantity_done}</td>
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

