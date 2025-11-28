import { useState } from 'react';
import { ArrowLeftRight, Eye, CheckCircle, Clock, XCircle, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';
import { type StockTransfer } from '../../../services/inventoryService';
import { TransferForm } from './TransferForm';
import './TransferList.css';

interface TransferListProps {
  transfers: StockTransfer[];
  onRefresh: () => void;
}

export const TransferList = ({ transfers, onRefresh }: TransferListProps) => {
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
            {transfers.map((transfer) => (
              <tr key={transfer.id}>
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
    </div>
  );
};

