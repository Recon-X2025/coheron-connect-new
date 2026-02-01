import React, { useState } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { useModalDismiss } from '../../../hooks/useModalDismiss';
import './OrderConfirmation.css';

interface OrderConfirmationProps {
  order: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface ConfirmationData {
  paymentTerms: string;
  deliveryDate: string;
  notes?: string;
}

export const OrderConfirmation: React.FC<OrderConfirmationProps> = ({
  order,
  onClose,
  onSuccess,
}) => {
  useModalDismiss(true, onClose);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ConfirmationData>({
    paymentTerms: 'immediate',
    deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
  });

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);

    try {
      // Update order with confirmation data
      await apiService.update('/sale-orders', order.id, {
        payment_term_id: data.paymentTerms,
        commitment_date: data.deliveryDate,
        note: data.notes,
      });

      // Confirm the order (transition to 'sale' state)
      await apiService.update('/sale-orders', order.id, { state: 'sale' });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm order');
      console.error('Order confirmation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="order-confirmation-overlay" onClick={onClose}>
      <div className="order-confirmation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="confirmation-header">
          <div className="confirmation-title">
            <CheckCircle size={24} />
            <h2>Confirm Sales Order</h2>
          </div>
          <button className="confirmation-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="confirmation-content">
          <div className="order-summary">
            <h3>{order.name}</h3>
            <p className="order-amount">Total: ₹{order.amount_total.toLocaleString()}</p>
          </div>

          {error && (
            <div className="confirmation-error">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="confirmation-form">
            <div className="form-field">
              <label>Payment Terms</label>
              <select
                value={data.paymentTerms}
                onChange={(e) => setData({ ...data, paymentTerms: e.target.value })}
                disabled={loading}
              >
                <option value="immediate">Immediate Payment</option>
                <option value="15_days">15 Days</option>
                <option value="30_days">30 Days</option>
                <option value="45_days">45 Days</option>
                <option value="60_days">60 Days</option>
              </select>
            </div>

            <div className="form-field">
              <label>Expected Delivery Date</label>
              <input
                type="date"
                value={data.deliveryDate}
                onChange={(e) => setData({ ...data, deliveryDate: e.target.value })}
                disabled={loading}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-field">
              <label>Internal Notes (Optional)</label>
              <textarea
                value={data.notes}
                onChange={(e) => setData({ ...data, notes: e.target.value })}
                placeholder="Add any internal notes about this order..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <div className="confirmation-warning">
            <AlertCircle size={18} />
            <p>
              Once confirmed, this order will be locked and cannot be modified without proper
              authorization.
            </p>
          </div>
        </div>

        <div className="confirmation-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                Confirming...
              </>
            ) : (
              'Confirm Order'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

