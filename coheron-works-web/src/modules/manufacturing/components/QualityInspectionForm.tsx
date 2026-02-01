import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './QualityInspectionForm.css';

interface QualityInspectionFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

export const QualityInspectionForm = ({ onClose, onSave, initialData }: QualityInspectionFormProps) => {
  const [loading, setLoading] = useState(false);
  const [manufacturingOrders, setManufacturingOrders] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    mo_id: '',
    inspection_type: 'incoming',
    qty_to_inspect: '',
    qty_inspected: '0',
    qty_passed: '0',
    qty_failed: '0',
    inspector_name: '',
    inspection_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  useEffect(() => {
    loadManufacturingOrders();
    if (initialData) {
      setFormData({
        mo_id: initialData.mo_id?.toString() || '',
        inspection_type: initialData.inspection_type || 'incoming',
        qty_to_inspect: initialData.qty_to_inspect?.toString() || '',
        qty_inspected: initialData.qty_inspected?.toString() || '0',
        qty_passed: initialData.qty_passed?.toString() || '0',
        qty_failed: initialData.qty_failed?.toString() || '0',
        inspector_name: initialData.inspector_name || '',
        inspection_date: initialData.inspection_date ? initialData.inspection_date.split('T')[0] : new Date().toISOString().split('T')[0],
        notes: initialData.notes || '',
      });
    }
  }, [initialData]);

  const loadManufacturingOrders = async () => {
    try {
      const data = await apiService.get<any[]>('manufacturing').catch((err) => { console.error('Failed to load manufacturing orders:', err.userMessage || err.message); return []; });
      setManufacturingOrders(data);
    } catch (error: any) {
      console.error('Error loading manufacturing orders:', error);
      showToast(error.userMessage || 'Failed to load manufacturing orders', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitData = {
        mo_id: formData.mo_id ? parseInt(formData.mo_id) : null,
        inspection_type: formData.inspection_type,
        qty_to_inspect: parseFloat(formData.qty_to_inspect) || 0,
        qty_inspected: parseFloat(formData.qty_inspected) || 0,
        qty_passed: parseFloat(formData.qty_passed) || 0,
        qty_failed: parseFloat(formData.qty_failed) || 0,
        inspector_name: formData.inspector_name || null,
        inspection_date: formData.inspection_date,
        notes: formData.notes || null,
      };

      if (initialData?.id) {
        await apiService.update('manufacturing/quality/inspections', initialData.id, submitData);
        showToast('Quality inspection updated successfully', 'success');
      } else {
        await apiService.create('manufacturing/quality/inspections', submitData);
        showToast('Quality inspection created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving quality inspection:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save quality inspection', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content quality-inspection-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Quality Inspection' : 'Create New Quality Inspection'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mo_id">Manufacturing Order</label>
              <select
                id="mo_id"
                value={formData.mo_id}
                onChange={(e) => setFormData({ ...formData, mo_id: e.target.value })}
              >
                <option value="">Select MO</option>
                {manufacturingOrders.map((mo, idx) => (
                  <option key={mo.id || (mo as any)._id || idx} value={mo.id}>
                    {mo.name} ({mo.product_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="inspection_type">Inspection Type *</label>
              <select
                id="inspection_type"
                value={formData.inspection_type}
                onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
                required
              >
                <option value="incoming">Incoming</option>
                <option value="in_process">In Process</option>
                <option value="final">Final</option>
                <option value="outgoing">Outgoing</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="qty_to_inspect">Quantity to Inspect *</label>
              <input
                id="qty_to_inspect"
                type="number"
                step="0.01"
                value={formData.qty_to_inspect}
                onChange={(e) => setFormData({ ...formData, qty_to_inspect: e.target.value })}
                required
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="inspection_date">Inspection Date *</label>
              <input
                id="inspection_date"
                type="date"
                value={formData.inspection_date}
                onChange={(e) => setFormData({ ...formData, inspection_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="qty_inspected">Quantity Inspected</label>
              <input
                id="qty_inspected"
                type="number"
                step="0.01"
                value={formData.qty_inspected}
                onChange={(e) => setFormData({ ...formData, qty_inspected: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="inspector_name">Inspector Name</label>
              <input
                id="inspector_name"
                type="text"
                value={formData.inspector_name}
                onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })}
                placeholder="Inspector name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="qty_passed">Quantity Passed</label>
              <input
                id="qty_passed"
                type="number"
                step="0.01"
                value={formData.qty_passed}
                onChange={(e) => setFormData({ ...formData, qty_passed: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label htmlFor="qty_failed">Quantity Failed</label>
              <input
                id="qty_failed"
                type="number"
                step="0.01"
                value={formData.qty_failed}
                onChange={(e) => setFormData({ ...formData, qty_failed: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Notes</label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Inspection notes and observations"
            />
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : initialData ? 'Update Inspection' : 'Create Inspection'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

