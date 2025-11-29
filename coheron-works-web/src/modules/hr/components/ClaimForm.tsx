import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './ClaimForm.css';

interface ClaimFormProps {
  onClose: () => void;
  onSave: () => void;
  employeeId?: number;
}

export const ClaimForm = ({ onClose, onSave, employeeId }: ClaimFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    claim_type: 'expense',
    amount: '',
    claim_date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_number: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiService.create('payroll/claims', {
        employee_id: employeeId || 1,
        ...formData,
        amount: parseFloat(formData.amount) || 0,
      });
      showToast('Claim submitted successfully', 'success');
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error submitting claim:', error);
      showToast(error?.userMessage || error?.message || 'Failed to submit claim', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content claim-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Submit New Claim</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="claim_type">Claim Type *</label>
            <select
              id="claim_type"
              value={formData.claim_type}
              onChange={(e) => setFormData({ ...formData, claim_type: e.target.value })}
              required
            >
              <option value="expense">Expense</option>
              <option value="travel">Travel</option>
              <option value="medical">Medical</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-row">
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

            <div className="form-group">
              <label htmlFor="claim_date">Claim Date *</label>
              <input
                id="claim_date"
                type="date"
                value={formData.claim_date}
                onChange={(e) => setFormData({ ...formData, claim_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="receipt_number">Receipt Number</label>
            <input
              id="receipt_number"
              type="text"
              value={formData.receipt_number}
              onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
              placeholder="Receipt number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={4}
              placeholder="Describe your claim"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Claim'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

