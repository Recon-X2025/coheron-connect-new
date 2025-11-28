import { useState } from 'react';
import { Package, Plus, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Button } from '../../../components/Button';
import { inventoryService, type GRN } from '../../../services/inventoryService';
import { GRNForm } from './GRNForm';
import './GRNList.css';

interface GRNListProps {
  grns: GRN[];
  onRefresh: () => void;
}

export const GRNList = ({ grns, onRefresh }: GRNListProps) => {
  const [selectedGRN, setSelectedGRN] = useState<GRN | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingGRN, setEditingGRN] = useState<GRN | undefined>(undefined);

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
                  <button className="icon-button" onClick={() => setSelectedGRN(grn)}>
                    <Eye size={18} />
                  </button>
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
    </div>
  );
};

