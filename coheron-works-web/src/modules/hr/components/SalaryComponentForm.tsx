import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './SalaryComponentForm.css';

interface SalaryComponentFormProps {
  onClose: () => void;
  onSave: () => void;
  employeeId: number;
  componentType: 'earning' | 'deduction';
  initialData?: any;
}

export const SalaryComponentForm = ({ 
  onClose, 
  onSave, 
  employeeId, 
  componentType,
  initialData 
}: SalaryComponentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    component_name: '',
    amount: '',
    calculation_type: 'fixed',
    percentage: '',
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        component_name: initialData.component_name || '',
        amount: initialData.amount?.toString() || '',
        calculation_type: initialData.calculation_type || 'fixed',
        percentage: initialData.percentage?.toString() || '',
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        employee_id: employeeId,
        component_type: componentType,
        component_name: formData.component_name,
        amount: formData.calculation_type === 'fixed' ? parseFloat(formData.amount) : null,
        calculation_type: formData.calculation_type,
        percentage: formData.calculation_type === 'percentage' ? parseFloat(formData.percentage) : null,
      };

      if (initialData?.id) {
        await apiService.update('payroll/salary-structure', initialData.id, submitData);
        showToast('Salary component updated successfully', 'success');
      } else {
        await apiService.create('payroll/salary-structure', submitData);
        showToast('Salary component created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving salary component:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save salary component', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content salary-component-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit' : 'Add'} {componentType === 'earning' ? 'Earning' : 'Deduction'} Component</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="component_name">Component Name *</label>
            <input
              id="component_name"
              type="text"
              value={formData.component_name}
              onChange={(e) => setFormData({ ...formData, component_name: e.target.value })}
              required
              placeholder="e.g., Basic Salary, HRA, PF"
            />
          </div>

          <div className="form-group">
            <label htmlFor="calculation_type">Calculation Type *</label>
            <select
              id="calculation_type"
              value={formData.calculation_type}
              onChange={(e) => setFormData({ ...formData, calculation_type: e.target.value })}
              required
            >
              <option value="fixed">Fixed Amount</option>
              <option value="percentage">Percentage</option>
              <option value="calculated">Calculated</option>
            </select>
          </div>

          {formData.calculation_type === 'fixed' && (
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
          )}

          {formData.calculation_type === 'percentage' && (
            <div className="form-group">
              <label htmlFor="percentage">Percentage *</label>
              <input
                id="percentage"
                type="number"
                step="0.01"
                value={formData.percentage}
                onChange={(e) => setFormData({ ...formData, percentage: e.target.value })}
                required
                placeholder="0.00"
                min="0"
                max="100"
              />
            </div>
          )}

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Add'} Component
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

