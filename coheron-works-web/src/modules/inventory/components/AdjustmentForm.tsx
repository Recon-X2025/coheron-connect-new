import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { inventoryService, type StockAdjustment, type StockAdjustmentLine } from '../../../services/inventoryService';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './AdjustmentForm.css';

interface AdjustmentFormProps {
  adjustment?: StockAdjustment;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdjustmentForm = ({ adjustment, onClose, onSuccess }: AdjustmentFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    warehouse_id: adjustment?.warehouse_id?.toString() || '',
    adjustment_date: adjustment?.adjustment_date || new Date().toISOString().split('T')[0],
    adjustment_type: adjustment?.adjustment_type || 'gain',
    reason_code: adjustment?.reason_code || '',
    reason_description: adjustment?.reason_description || '',
    notes: adjustment?.notes || '',
  });
  const [lines, setLines] = useState<Array<Partial<StockAdjustmentLine> & { product_id?: string | number; physical_qty?: number }>>(
    adjustment?.lines || [{ product_id: '', physical_qty: 0 }] as any
  );

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      const [warehousesData, productsData] = await Promise.all([
        inventoryService.getWarehouses(),
        apiService.get<any>('/products'),
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load form data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { product_id: '', physical_qty: 0 } as any]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: string, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const adjustmentData = {
        ...formData,
        warehouse_id: parseInt(formData.warehouse_id),
        lines: lines.map(line => ({
          product_id: parseInt(line.product_id as any),
          physical_qty: parseFloat(line.physical_qty as any),
          reason_code: line.reason_code || formData.reason_code,
        })),
      };

      await inventoryService.createAdjustment(adjustmentData as any);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save adjustment:', error);
      showToast('Failed to save adjustment. Please check all fields and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="adjustment-form-modal">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="adjustment-form-modal">
      <div className="form-header">
        <h2>New Stock Adjustment</h2>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="adjustment-form">
        <div className="form-section">
          <h3>Adjustment Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Warehouse *</label>
              <select
                value={formData.warehouse_id}
                onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Adjustment Date *</label>
              <input
                type="date"
                value={formData.adjustment_date}
                onChange={(e) => setFormData({ ...formData, adjustment_date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Adjustment Type *</label>
              <select
                value={formData.adjustment_type}
                onChange={(e) => setFormData({ ...formData, adjustment_type: e.target.value as any })}
                required
              >
                <option value="gain">Stock Gain</option>
                <option value="loss">Stock Loss</option>
                <option value="damage">Damage</option>
                <option value="expiry">Expiry</option>
                <option value="spoilage">Spoilage</option>
                <option value="theft">Theft</option>
                <option value="write_off">Write Off</option>
                <option value="revaluation">Revaluation</option>
              </select>
            </div>
            <div className="form-group">
              <label>Reason Code</label>
              <input
                type="text"
                value={formData.reason_code}
                onChange={(e) => setFormData({ ...formData, reason_code: e.target.value })}
                placeholder="e.g., DAM-001, EXP-001"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Reason Description</label>
            <textarea
              value={formData.reason_description}
              onChange={(e) => setFormData({ ...formData, reason_description: e.target.value })}
              rows={2}
              placeholder="Describe the reason for this adjustment..."
            />
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Items to Adjust</h3>
            <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={handleAddLine}>
              Add Item
            </Button>
          </div>

          <div className="lines-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Physical Qty</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        value={line.product_id || ''}
                        onChange={(e) => handleLineChange(index, 'product_id', e.target.value)}
                        required
                      >
                        <option value="">Select Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.default_code})
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        step="0.01"
                        value={line.physical_qty || 0}
                        onChange={(e) => handleLineChange(index, 'physical_qty', e.target.value)}
                        required
                        min="0"
                      />
                    </td>
                    <td>
                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="icon-button danger"
                          onClick={() => handleRemoveLine(index)}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="form-hint">
              * System will calculate the difference between physical quantity and system quantity
            </p>
          </div>
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Adjustment'}
          </Button>
        </div>
      </form>
    </div>
  );
};

