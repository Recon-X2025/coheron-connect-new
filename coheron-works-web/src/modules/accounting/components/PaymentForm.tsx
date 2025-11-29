import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './PaymentForm.css';

interface PaymentFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const PaymentForm = ({ onClose, onSave, initialData }: PaymentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [bills, setBills] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    bill_id: '',
    vendor_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_method: 'bank_transfer',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
    if (initialData) {
      setFormData({
        bill_id: initialData.bill_id?.toString() || '',
        vendor_id: initialData.vendor_id?.toString() || '',
        payment_date: initialData.payment_date ? initialData.payment_date.split('T')[0] : new Date().toISOString().split('T')[0],
        amount: initialData.amount?.toString() || '',
        payment_method: initialData.payment_method || 'bank_transfer',
        reference: initialData.reference || '',
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const loadData = async () => {
    try {
      const [billsData, vendorsData] = await Promise.all([
        apiService.get<any[]>('accounting/accounts-payable/bills').catch(() => []),
        apiService.get<any[]>('accounting/accounts-payable/vendors').catch(() => []),
      ]);
      setBills(billsData);
      setVendors(vendorsData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        bill_id: formData.bill_id ? parseInt(formData.bill_id) : null,
        vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
        payment_date: formData.payment_date,
        amount: parseFloat(formData.amount) || 0,
        payment_method: formData.payment_method,
        reference: formData.reference || null,
        notes: formData.notes || null,
      };

      if (initialData?.id) {
        await apiService.update('accounting/accounts-payable/payments', initialData.id, submitData);
        showToast('Payment updated successfully', 'success');
      } else {
        await apiService.create('accounting/accounts-payable/payments', submitData);
        showToast('Payment created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save payment', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content payment-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Payment' : 'Create New Payment'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="vendor_id">Vendor *</label>
            <select
              id="vendor_id"
              value={formData.vendor_id}
              onChange={(e) => setFormData({ ...formData, vendor_id: e.target.value })}
              required
            >
              <option value="">Select Vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.name} ({vendor.code})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="bill_id">Bill (Optional)</label>
            <select
              id="bill_id"
              value={formData.bill_id}
              onChange={(e) => setFormData({ ...formData, bill_id: e.target.value })}
            >
              <option value="">Select Bill</option>
              {bills
                .filter(bill => !formData.vendor_id || bill.vendor_id?.toString() === formData.vendor_id)
                .map((bill) => (
                  <option key={bill.id} value={bill.id}>
                    {bill.name} - {bill.amount_total}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="payment_date">Payment Date *</label>
              <input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="amount">Amount *</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="payment_method">Payment Method *</label>
            <select
              id="payment_method"
              value={formData.payment_method}
              onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
              required
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="check">Check</option>
              <option value="cash">Cash</option>
              <option value="credit_card">Credit Card</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reference">Reference</label>
            <input
              id="reference"
              type="text"
              value={formData.reference}
              onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
              placeholder="Payment reference number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Optional notes"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Payment' : 'Create Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

