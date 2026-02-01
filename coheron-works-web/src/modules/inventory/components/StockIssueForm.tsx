import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { inventoryService, type StockIssue, type StockIssueLine } from '../../../services/inventoryService';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './StockIssueForm.css';

interface StockIssueFormProps {
  issue?: StockIssue;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockIssueForm = ({ issue, onClose, onSuccess }: StockIssueFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [manufacturingOrders, setManufacturingOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    issue_type: issue?.issue_type || 'production',
    from_warehouse_id: issue?.from_warehouse_id?.toString() || '',
    from_location_id: issue?.from_location_id?.toString() || '',
    to_production_id: issue?.to_production_id?.toString() || '',
    to_project_id: issue?.to_project_id?.toString() || '',
    to_work_order_id: issue?.to_work_order_id?.toString() || '',
    to_reference: issue?.to_reference || '',
    issue_date: issue?.issue_date || new Date().toISOString().split('T')[0],
    picking_strategy: issue?.picking_strategy || 'fifo',
    notes: issue?.notes || '',
  });

  const [lines, setLines] = useState<Array<Partial<StockIssueLine> & { 
    product_id?: string | number; 
    quantity?: number; 
    lot_id?: string | number;
    serial_numbers?: string;
  }>>(
    issue?.lines || [{ product_id: '', quantity: 0, lot_id: '', serial_numbers: '' }] as any
  );

  useEffect(() => {
    loadFormData();
  }, [formData.issue_type]);

  const loadFormData = async () => {
    try {
      setLoadingData(true);
      const [warehousesData, productsData, lotsData] = await Promise.all([
        inventoryService.getWarehouses(),
        apiService.get<any>('/products'),
        inventoryService.getLots(),
      ]);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setLots(lotsData);

      // Load related data based on issue type
      if (formData.issue_type === 'production') {
        const moData = await apiService.get<any>('/manufacturing');
        setManufacturingOrders(Array.isArray(moData) ? moData : []);
      } else if (formData.issue_type === 'project') {
        const projData = await apiService.get<any>('/projects');
        setProjects(Array.isArray(projData) ? projData : []);
      } else if (formData.issue_type === 'work_order') {
        const woData = await apiService.get<any>('/manufacturing/work-orders');
        setWorkOrders(Array.isArray(woData) ? woData : []);
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { product_id: '', quantity: 0, lot_id: '', serial_numbers: '' } as any]);
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
      const issueData = {
        ...formData,
        from_warehouse_id: parseInt(formData.from_warehouse_id),
        from_location_id: formData.from_location_id ? parseInt(formData.from_location_id) : undefined,
        to_production_id: formData.to_production_id ? parseInt(formData.to_production_id) : undefined,
        to_project_id: formData.to_project_id ? parseInt(formData.to_project_id) : undefined,
        to_work_order_id: formData.to_work_order_id ? parseInt(formData.to_work_order_id) : undefined,
        lines: lines.map(line => ({
          product_id: parseInt(line.product_id as any),
          quantity: parseFloat(line.quantity as any) || 0,
          lot_id: line.lot_id ? parseInt(line.lot_id as any) : undefined,
          serial_numbers: line.serial_numbers ? line.serial_numbers.split(',').map(s => s.trim()) : undefined,
        })),
      };

      if (issue) {
        await inventoryService.updateStockIssue(issue.id, issueData as any);
      } else {
        await inventoryService.createStockIssue(issueData as any);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save stock issue:', error);
      showToast('Failed to save stock issue. Please check all fields and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="stock-issue-form-modal">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="stock-issue-form-modal">
      <div className="stock-issue-form-content">
        <div className="stock-issue-form-header">
          <h2>{issue ? 'Edit Stock Issue' : 'Create Stock Issue'}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Issue Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="issue_type">Issue Type *</label>
                <select
                  id="issue_type"
                  name="issue_type"
                  value={formData.issue_type}
                  onChange={(e) => {
                    setFormData({ ...formData, issue_type: e.target.value as any });
                    // Reset related fields when type changes
                    setFormData(prev => ({
                      ...prev,
                      issue_type: e.target.value as any,
                      to_production_id: '',
                      to_project_id: '',
                      to_work_order_id: '',
                      to_reference: '',
                    }));
                  }}
                  required
                >
                  <option value="production">Issue to Production</option>
                  <option value="project">Issue to Project</option>
                  <option value="job">Issue to Job</option>
                  <option value="work_order">Issue to Work Order</option>
                  <option value="ad_hoc">Ad-hoc Issue</option>
                  <option value="sample">Sample/Display Issue</option>
                  <option value="internal_consumption">Internal Consumption</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="issue_date">Issue Date *</label>
                <input
                  id="issue_date"
                  name="issue_date"
                  type="date"
                  value={formData.issue_date}
                  onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="from_warehouse_id">From Warehouse *</label>
                <select
                  id="from_warehouse_id"
                  name="from_warehouse_id"
                  value={formData.from_warehouse_id}
                  onChange={(e) => setFormData({ ...formData, from_warehouse_id: e.target.value })}
                  required
                >
                  <option value="">Select Warehouse</option>
                  {warehouses.map((wh, idx) => (
                    <option key={wh.id || (wh as any)._id || idx} value={wh.id}>
                      {wh.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="picking_strategy">Picking Strategy</label>
                <select
                  id="picking_strategy"
                  name="picking_strategy"
                  value={formData.picking_strategy}
                  onChange={(e) => setFormData({ ...formData, picking_strategy: e.target.value as any })}
                >
                  <option value="fifo">FIFO (First In First Out)</option>
                  <option value="lifo">LIFO (Last In First Out)</option>
                  <option value="fefo">FEFO (First Expiry First Out)</option>
                  <option value="closest">Closest Location</option>
                  <option value="least_packages">Least Packages</option>
                </select>
              </div>
            </div>

            {/* Dynamic fields based on issue type */}
            {formData.issue_type === 'production' && (
              <div className="form-group">
                <label htmlFor="to_production_id">Manufacturing Order *</label>
                <select
                  id="to_production_id"
                  name="to_production_id"
                  value={formData.to_production_id}
                  onChange={(e) => setFormData({ ...formData, to_production_id: e.target.value })}
                  required
                >
                  <option value="">Select Manufacturing Order</option>
                  {manufacturingOrders.map((mo, idx) => (
                    <option key={mo.id || (mo as any)._id || idx} value={mo.id}>
                      {mo.name || `MO-${mo.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.issue_type === 'project' && (
              <div className="form-group">
                <label htmlFor="to_project_id">Project *</label>
                <select
                  id="to_project_id"
                  name="to_project_id"
                  value={formData.to_project_id}
                  onChange={(e) => setFormData({ ...formData, to_project_id: e.target.value })}
                  required
                >
                  <option value="">Select Project</option>
                  {projects.map((proj, idx) => (
                    <option key={proj.id || (proj as any)._id || idx} value={proj.id}>
                      {proj.name || `Project-${proj.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {formData.issue_type === 'work_order' && (
              <div className="form-group">
                <label htmlFor="to_work_order_id">Work Order *</label>
                <select
                  id="to_work_order_id"
                  name="to_work_order_id"
                  value={formData.to_work_order_id}
                  onChange={(e) => setFormData({ ...formData, to_work_order_id: e.target.value })}
                  required
                >
                  <option value="">Select Work Order</option>
                  {workOrders.map((wo, idx) => (
                    <option key={wo.id || (wo as any)._id || idx} value={wo.id}>
                      {wo.name || `WO-${wo.id}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {(formData.issue_type === 'ad_hoc' || formData.issue_type === 'sample' || formData.issue_type === 'internal_consumption') && (
              <div className="form-group">
                <label htmlFor="to_reference">Reference/Description</label>
                <input
                  id="to_reference"
                  name="to_reference"
                  type="text"
                  value={formData.to_reference}
                  onChange={(e) => setFormData({ ...formData, to_reference: e.target.value })}
                  placeholder="Enter reference or description"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </div>

          <div className="form-section">
            <div className="section-header">
              <h3>Items to Issue</h3>
              <Button type="button" onClick={handleAddLine} variant="secondary" size="sm">
                <Plus size={16} /> Add Item
              </Button>
            </div>

            <div className="items-table">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Lot/Batch</th>
                    <th>Serial Numbers</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={line.product_id?.toString() || ''}
                          onChange={(e) => handleLineChange(index, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">Select Product</option>
                          {products.map((prod, idx) => (
                            <option key={prod.id || (prod as any)._id || idx} value={prod.id}>
                              {prod.name || prod.code}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.quantity || 0}
                          onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                          required
                        />
                      </td>
                      <td>
                        <select
                          value={line.lot_id?.toString() || ''}
                          onChange={(e) => handleLineChange(index, 'lot_id', e.target.value || undefined)}
                        >
                          <option value="">No Lot</option>
                          {lots.filter(lot => lot.product_id === parseInt(line.product_id as any)).map((lot, idx) => (
                            <option key={lot.id || (lot as any)._id || idx} value={lot.id}>
                              {lot.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={line.serial_numbers || ''}
                          onChange={(e) => handleLineChange(index, 'serial_numbers', e.target.value)}
                          placeholder="Comma-separated serial numbers"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="remove-btn"
                          disabled={lines.length === 1}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="form-actions">
            <Button type="button" onClick={onClose} variant="secondary">
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : issue ? 'Update' : 'Create'} Stock Issue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

