import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './ForecastForm.css';

interface ForecastFormProps {
  onClose: () => void;
  onSave: () => void;
  type: 'forecast' | 'target';
  initialData?: any;
}

export const ForecastForm = ({ onClose, onSave, type, initialData }: ForecastFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    period_start: '',
    period_end: '',
    revenue_forecast: '',
    revenue_target: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        period_start: formData.period_start,
        period_end: formData.period_end,
        revenue_forecast: formData.revenue_forecast ? parseFloat(formData.revenue_forecast) : null,
        revenue_target: formData.revenue_target ? parseFloat(formData.revenue_target) : null,
        description: formData.description || null,
      };

      if (initialData?.id) {
        await apiService.update(`sales/forecasting/${type}s`, initialData.id, submitData);
        showToast(`${type === 'forecast' ? 'Forecast' : 'Target'} updated successfully`, 'success');
      } else {
        await apiService.create(`sales/forecasting/${type}s`, submitData);
        showToast(`${type === 'forecast' ? 'Forecast' : 'Target'} created successfully`, 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error(`Error saving ${type}:`, error);
      showToast(error?.userMessage || error?.message || `Failed to save ${type}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content forecast-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit' : 'Create'} {type === 'forecast' ? 'Forecast' : 'Target'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="period_start">Period Start *</label>
              <input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="period_end">Period End *</label>
              <input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
                required
              />
            </div>
          </div>

          {type === 'forecast' ? (
            <div className="form-group">
              <label htmlFor="revenue_forecast">Revenue Forecast *</label>
              <input
                id="revenue_forecast"
                type="number"
                step="0.01"
                value={formData.revenue_forecast}
                onChange={(e) => setFormData({ ...formData, revenue_forecast: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          ) : (
            <div className="form-group">
              <label htmlFor="revenue_target">Revenue Target *</label>
              <input
                id="revenue_target"
                type="number"
                step="0.01"
                value={formData.revenue_target}
                onChange={(e) => setFormData({ ...formData, revenue_target: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Optional description"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update' : 'Create'} {type === 'forecast' ? 'Forecast' : 'Target'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

