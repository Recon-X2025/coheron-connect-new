import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { inventoryService, type StockTransfer, type StockTransferLine } from '../../../services/inventoryService';
import { apiService } from '../../../services/apiService';
import './TransferForm.css';

interface TransferFormProps {
  transfer?: StockTransfer;
  onClose: () => void;
  onSuccess: () => void;
}

export const TransferForm = ({ transfer, onClose, onSuccess }: TransferFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    from_warehouse_id: transfer?.from_warehouse_id?.toString() || '',
    to_warehouse_id: transfer?.to_warehouse_id?.toString() || '',
    transfer_date: transfer?.transfer_date || new Date().toISOString().split('T')[0],
    expected_delivery_date: transfer?.expected_delivery_date || '',
    transfer_type: transfer?.transfer_type || 'warehouse_to_warehouse',
    notes: transfer?.notes || '',
  });
  const [lines, setLines] = useState<Partial<StockTransferLine>[]>(
    transfer?.lines || [{ product_id: '', quantity: 0 }]
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
    setLines([...lines, { product_id: '', quantity: 0 }]);
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
      const transferData = {
        ...formData,
        from_warehouse_id: parseInt(formData.from_warehouse_id),
        to_warehouse_id: parseInt(formData.to_warehouse_id),
        lines: lines.map(line => ({
          product_id: parseInt(line.product_id as any),
          quantity: parseFloat(line.quantity as any),
        })),
      };

      await inventoryService.createTransfer(transferData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save transfer:', error);
      alert('Failed to save transfer. Please check all fields and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="transfer-form-modal">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="transfer-form-modal">
      <div className="form-header">
        <h2>New Stock Transfer</h2>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="transfer-form">
        <div className="form-section">
          <h3>Transfer Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>From Warehouse *</label>
              <select
                value={formData.from_warehouse_id}
                onChange={(e) => setFormData({ ...formData, from_warehouse_id: e.target.value })}
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
              <label>To Warehouse *</label>
              <select
                value={formData.to_warehouse_id}
                onChange={(e) => setFormData({ ...formData, to_warehouse_id: e.target.value })}
                required
              >
                <option value="">Select Warehouse</option>
                {warehouses
                  .filter(w => w.id !== parseInt(formData.from_warehouse_id || '0'))
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Transfer Date *</label>
              <input
                type="date"
                value={formData.transfer_date}
                onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Expected Delivery Date</label>
              <input
                type="date"
                value={formData.expected_delivery_date}
                onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Transfer Type</label>
            <select
              value={formData.transfer_type}
              onChange={(e) => setFormData({ ...formData, transfer_type: e.target.value as any })}
            >
              <option value="warehouse_to_warehouse">Warehouse to Warehouse</option>
              <option value="bin_to_bin">Bin to Bin</option>
              <option value="inter_company">Inter Company</option>
              <option value="branch">Branch</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Items to Transfer</h3>
            <Button type="button" variant="secondary" size="small" icon={<Plus size={16} />} onClick={handleAddLine}>
              Add Item
            </Button>
          </div>

          <div className="lines-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
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
                        value={line.quantity || 0}
                        onChange={(e) => handleLineChange(index, 'quantity', e.target.value)}
                        required
                        min="0.01"
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
            {loading ? 'Creating...' : 'Create Transfer'}
          </Button>
        </div>
      </form>
    </div>
  );
};

