import React, { useState } from 'react';
import { X, CreditCard, CircleDollarSign, Smartphone, Wallet } from 'lucide-react';
import { odooService } from '../../../services/odooService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { Partner } from '../../../types/odoo';
import './PaymentDialog.css';

interface CartItem {
  product: {
    id: number;
    name: string;
  };
  quantity: number;
  price: number;
}

interface PaymentDialogProps {
  cart: CartItem[];
  customer: Partner | null;
  total: number;
  onClose: () => void;
  onSuccess: () => void;
}

type PaymentMethod = 'cash' | 'card' | 'mobile' | 'split';

export const PaymentDialog: React.FC<PaymentDialogProps> = ({
  cart,
  customer,
  total,
  onClose,
  onSuccess,
}) => {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState(total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const change = amountPaid - total;

  const handlePayment = async () => {
    if (amountPaid < total) {
      setError('Amount paid must be greater than or equal to total');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create POS order in Odoo
      const orderData = {
        partner_id: customer?.id,
        lines: cart.map((item) => ({
          product_id: item.product.id,
          qty: item.quantity,
          price_unit: item.price,
        })),
        amount_total: total,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
      };

      await odooService.create('pos.order', orderData as any);

      // Generate receipt would go here
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Payment failed');
      console.error('Payment error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="payment-dialog-overlay" onClick={onClose}>
      <div className="payment-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="payment-header">
          <h2>Payment</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="payment-content">
          <div className="payment-summary">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{total.toLocaleString()}</span>
            </div>
          </div>

          {error && (
            <div className="payment-error">
              {error}
            </div>
          )}

          <div className="payment-methods">
            <h3>Payment Method</h3>
            <div className="method-grid">
              <button
                className={`method-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('cash')}
              >
                <CircleDollarSign size={24} />
                <span>Cash</span>
              </button>
              <button
                className={`method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('card')}
              >
                <CreditCard size={24} />
                <span>Card</span>
              </button>
              <button
                className={`method-btn ${paymentMethod === 'mobile' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('mobile')}
              >
                <Smartphone size={24} />
                <span>Mobile</span>
              </button>
              <button
                className={`method-btn ${paymentMethod === 'split' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('split')}
              >
                <Wallet size={24} />
                <span>Split</span>
              </button>
            </div>
          </div>

          {paymentMethod !== 'split' && (
            <div className="amount-section">
              <label>Amount Paid</label>
              <input
                type="number"
                value={amountPaid}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                min={total}
                step="0.01"
              />
              {change > 0 && (
                <div className="change-amount">
                  Change: ₹{change.toLocaleString()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="payment-footer">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button className="btn-pay" onClick={handlePayment} disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="small" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Pay ₹{total.toLocaleString()}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentDialog;

