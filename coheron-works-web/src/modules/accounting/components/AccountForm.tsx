import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './AccountForm.css';

interface AccountFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const AccountForm = ({ onClose, onSave, initialData }: AccountFormProps) => {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    account_type: '',
    parent_id: '',
    reconcile: false,
    deprecated: false,
  });

  useEffect(() => {
    loadAccounts();
    if (initialData) {
      setFormData({
        code: initialData.code || '',
        name: initialData.name || '',
        account_type: initialData.account_type || '',
        parent_id: initialData.parent_id?.toString() || '',
        reconcile: initialData.reconcile || false,
        deprecated: initialData.deprecated || false,
      });
    }
  }, [initialData]);

  const loadAccounts = async () => {
    try {
      const data = await apiService.get<any[]>('accounting/chart-of-accounts');
      setAccounts(data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        ...formData,
        parent_id: formData.parent_id ? parseInt(formData.parent_id) : null,
      };

      if (initialData?.id) {
        await apiService.update('accounting/chart-of-accounts', initialData.id, submitData);
        showToast('Account updated successfully', 'success');
      } else {
        await apiService.create('accounting/chart-of-accounts', submitData);
        showToast('Account created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving account:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save account', 'error');
    } finally {
      setLoading(false);
    }
  };

  const accountTypes = [
    { value: 'asset_receivable', label: 'Asset - Receivable' },
    { value: 'asset_cash', label: 'Asset - Cash' },
    { value: 'asset_current', label: 'Asset - Current' },
    { value: 'asset_non_current', label: 'Asset - Non-Current' },
    { value: 'asset_fixed', label: 'Asset - Fixed' },
    { value: 'asset_prepayments', label: 'Asset - Prepayments' },
    { value: 'liability_payable', label: 'Liability - Payable' },
    { value: 'liability_credit_card', label: 'Liability - Credit Card' },
    { value: 'liability_current', label: 'Liability - Current' },
    { value: 'liability_non_current', label: 'Liability - Non-Current' },
    { value: 'equity', label: 'Equity' },
    { value: 'equity_unaffected', label: 'Equity - Unaffected' },
    { value: 'income', label: 'Income' },
    { value: 'income_other', label: 'Income - Other' },
    { value: 'expense', label: 'Expense' },
    { value: 'expense_depreciation', label: 'Expense - Depreciation' },
    { value: 'expense_direct_cost', label: 'Expense - Direct Cost' },
    { value: 'off_balance', label: 'Off Balance' },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content account-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Account' : 'Create New Account'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="code">Account Code *</label>
              <input
                id="code"
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                placeholder="e.g., 1000, 2000"
              />
            </div>

            <div className="form-group">
              <label htmlFor="account_type">Account Type *</label>
              <select
                id="account_type"
                value={formData.account_type}
                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                required
              >
                <option value="">Select Type</option>
                {accountTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="name">Account Name *</label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="Enter account name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="parent_id">Parent Account</label>
            <select
              id="parent_id"
              value={formData.parent_id}
              onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
            >
              <option value="">None (Top Level)</option>
              {accounts
                .filter((acc) => !acc.deprecated && (!initialData || acc.id !== initialData.id))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.reconcile}
                  onChange={(e) => setFormData({ ...formData, reconcile: e.target.checked })}
                />
                Allow Reconciliation
              </label>
            </div>

            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={formData.deprecated}
                  onChange={(e) => setFormData({ ...formData, deprecated: e.target.checked })}
                />
                Deprecated
              </label>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

