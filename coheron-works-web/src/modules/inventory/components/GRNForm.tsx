import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { inventoryService, type GRN, type GRNLine } from '../../../services/inventoryService';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './GRNForm.css';

interface GRNFormProps {
  grn?: GRN;
  onClose: () => void;
  onSuccess: () => void;
}

export const GRNForm = ({ grn, onClose, onSuccess }: GRNFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [partners, setPartners] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    partner_id: grn?.partner_id?.toString() || '',
    warehouse_id: grn?.warehouse_id?.toString() || '',
    grn_date: grn?.grn_date || new Date().toISOString().split('T')[0],
    expected_date: grn?.expected_date || '',
    delivery_challan_number: grn?.delivery_challan_number || '',
    supplier_invoice_number: grn?.supplier_invoice_number || '',
    notes: grn?.notes || '',
  });
  const [lines, setLines] = useState<Array<Partial<GRNLine> & { product_id?: string | number; ordered_qty?: number; received_qty?: number; unit_price?: number }>>(
    grn?.lines || [{ product_id: '', ordered_qty: 0, received_qty: 0, unit_price: 0 }] as any
  );

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      const [partnersData, warehousesData, productsData] = await Promise.all([
        apiService.get<any>('/partners'),
        inventoryService.getWarehouses(),
        apiService.get<any>('/products'),
      ]);
      setPartners(partnersData);
      setWarehouses(warehousesData);
      setProducts(productsData);
    } catch (error) {
      console.error('Failed to load form data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { product_id: '', ordered_qty: 0, received_qty: 0, unit_price: 0 } as any]);
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
      const grnData = {
        ...formData,
        partner_id: parseInt(formData.partner_id),
        warehouse_id: parseInt(formData.warehouse_id),
        lines: lines.map(line => ({
          product_id: parseInt(line.product_id as any),
          ordered_qty: parseFloat(line.ordered_qty as any),
          received_qty: parseFloat(line.received_qty as any) || 0,
          unit_price: parseFloat(line.unit_price as any) || 0,
        })),
      };

      if (grn) {
        await inventoryService.updateGRN(grn.id, grnData as any);
      } else {
        await inventoryService.createGRN(grnData as any);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save GRN:', error);
      showToast('Failed to save GRN. Please check all fields and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="grn-form-modal">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="grn-form-modal">
      <div className="form-header">
        <h2>{grn ? 'Edit GRN' : 'New Goods Receipt Note'}</h2>
        <button className="close-button" onClick={onClose}>
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grn-form">
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Supplier *</label>
              <select
                value={formData.partner_id}
                onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                required
              >
                <option value="">Select Supplier</option>
                {partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>GRN Date *</label>
              <input
                type="date"
                value={formData.grn_date}
                onChange={(e) => setFormData({ ...formData, grn_date: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Expected Date</label>
              <input
                type="date"
                value={formData.expected_date}
                onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Delivery Challan Number</label>
              <input
                type="text"
                value={formData.delivery_challan_number}
                onChange={(e) => setFormData({ ...formData, delivery_challan_number: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Supplier Invoice Number</label>
              <input
                type="text"
                value={formData.supplier_invoice_number}
                onChange={(e) => setFormData({ ...formData, supplier_invoice_number: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-header">
            <h3>Items Received</h3>
            <Button type="button" variant="secondary" size="sm" icon={<Plus size={16} />} onClick={handleAddLine}>
              Add Item
            </Button>
          </div>

          <div className="lines-table">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Ordered Qty</th>
                  <th>Received Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => {
                  const total = (parseFloat(line.received_qty as any) || 0) * (parseFloat(line.unit_price as any) || 0);
                  return (
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
                          value={line.ordered_qty || 0}
                          onChange={(e) => handleLineChange(index, 'ordered_qty', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.received_qty || 0}
                          onChange={(e) => handleLineChange(index, 'received_qty', e.target.value)}
                          required
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.unit_price || 0}
                          onChange={(e) => handleLineChange(index, 'unit_price', e.target.value)}
                        />
                      </td>
                      <td>₹{total.toFixed(2)}</td>
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
                  );
                })}
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
            {loading ? 'Saving...' : grn ? 'Update' : 'Create'} GRN
          </Button>
        </div>
      </form>
    </div>
  );
};

