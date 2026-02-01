import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { inventoryService, type StockReturn, type StockReturnLine } from '../../../services/inventoryService';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './StockReturnForm.css';

interface StockReturnFormProps {
  return_transaction?: StockReturn;
  onClose: () => void;
  onSuccess: () => void;
}

export const StockReturnForm = ({ return_transaction, onClose, onSuccess }: StockReturnFormProps) => {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [lots, setLots] = useState<any[]>([]);
  const [originalTransactions, setOriginalTransactions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    return_type: return_transaction?.return_type || 'purchase_return',
    original_transaction_type: return_transaction?.original_transaction_type || 'grn',
    original_transaction_id: return_transaction?.original_transaction_id?.toString() || '',
    warehouse_id: return_transaction?.warehouse_id?.toString() || '',
    return_date: return_transaction?.return_date || new Date().toISOString().split('T')[0],
    return_reason: return_transaction?.return_reason || '',
    restocking_rule: return_transaction?.restocking_rule || 'original_location',
    notes: return_transaction?.notes || '',
  });

  const [lines, setLines] = useState<Array<Partial<StockReturnLine> & { 
    product_id?: string | number; 
    quantity?: number; 
    lot_id?: string | number;
    serial_numbers?: string;
  }>>(
    return_transaction?.lines || [{ product_id: '', quantity: 0, lot_id: '', serial_numbers: '' }] as any
  );

  useEffect(() => {
    loadFormData();
  }, [formData.original_transaction_type]);

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

      // Load original transactions based on type
      if (formData.original_transaction_type === 'grn') {
        const grnData = await inventoryService.getGRNs();
        setOriginalTransactions(grnData);
      } else if (formData.original_transaction_type === 'sale') {
        const saleData = await apiService.get<any>('/sale-orders');
        setOriginalTransactions(Array.isArray(saleData) ? saleData : []);
      } else if (formData.original_transaction_type === 'transfer') {
        const transferData = await inventoryService.getTransfers();
        setOriginalTransactions(transferData);
      } else if (formData.original_transaction_type === 'issue') {
        const issueData = await inventoryService.getStockIssues();
        setOriginalTransactions(issueData);
      }
    } catch (error) {
      console.error('Failed to load form data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleOriginalTransactionChange = async (transactionId: string) => {
    if (!transactionId) return;
    
    setFormData({ ...formData, original_transaction_id: transactionId });
    
    try {
      let transactionData;
      if (formData.original_transaction_type === 'grn') {
        transactionData = await inventoryService.getGRN(parseInt(transactionId));
      } else if (formData.original_transaction_type === 'transfer') {
        transactionData = await inventoryService.getTransfers().then(transfers => 
          transfers.find(t => t.id === parseInt(transactionId))
        );
      } else if (formData.original_transaction_type === 'issue') {
        transactionData = await inventoryService.getStockIssue(parseInt(transactionId));
      }
      
      if (transactionData && (transactionData as any).lines) {
        setLines((transactionData as any).lines.map((line: any) => ({
          product_id: line.product_id,
          quantity: line.quantity || line.received_qty || line.quantity_done || 0,
          lot_id: line.lot_id || '',
          serial_numbers: line.serial_numbers ? line.serial_numbers.join(', ') : '',
        })));
      }
    } catch (error) {
      console.error('Failed to load transaction details:', error);
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
      const returnData = {
        ...formData,
        warehouse_id: parseInt(formData.warehouse_id),
        original_transaction_id: parseInt(formData.original_transaction_id),
        lines: lines.map(line => ({
          product_id: parseInt(line.product_id as any),
          quantity: parseFloat(line.quantity as any) || 0,
          lot_id: line.lot_id ? parseInt(line.lot_id as any) : undefined,
          serial_numbers: line.serial_numbers ? line.serial_numbers.split(',').map(s => s.trim()) : undefined,
        })),
      };

      if (return_transaction) {
        await inventoryService.updateStockReturn(return_transaction.id, returnData as any);
      } else {
        await inventoryService.createStockReturn(returnData as any);
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save stock return:', error);
      showToast('Failed to save stock return. Please check all fields and try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="stock-return-form-modal">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="stock-return-form-modal">
      <div className="stock-return-form-content">
        <div className="stock-return-form-header">
          <h2>{return_transaction ? 'Edit Stock Return' : 'Create Stock Return'}</h2>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Return Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="return_type">Return Type *</label>
                <select
                  id="return_type"
                  name="return_type"
                  value={formData.return_type}
                  onChange={(e) => setFormData({ ...formData, return_type: e.target.value as any })}
                  required
                >
                  <option value="purchase_return">Purchase Return</option>
                  <option value="sales_return">Sales Return</option>
                  <option value="internal_return">Internal Return</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="return_date">Return Date *</label>
                <input
                  id="return_date"
                  name="return_date"
                  type="date"
                  value={formData.return_date}
                  onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="original_transaction_type">Original Transaction Type *</label>
                <select
                  id="original_transaction_type"
                  name="original_transaction_type"
                  value={formData.original_transaction_type}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      original_transaction_type: e.target.value as any,
                      original_transaction_id: '',
                    });
                    setLines([{ product_id: '', quantity: 0, lot_id: '', serial_numbers: '' } as any]);
                  }}
                  required
                >
                  <option value="grn">GRN (Goods Receipt)</option>
                  <option value="sale">Sale Order</option>
                  <option value="transfer">Stock Transfer</option>
                  <option value="issue">Stock Issue</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="original_transaction_id">Original Transaction *</label>
                <select
                  id="original_transaction_id"
                  name="original_transaction_id"
                  value={formData.original_transaction_id}
                  onChange={(e) => handleOriginalTransactionChange(e.target.value)}
                  required
                >
                  <option value="">Select Transaction</option>
                  {originalTransactions.map((txn, idx) => (
                    <option key={txn.id || (txn as any)._id || idx} value={txn.id}>
                      {txn.name || txn.grn_number || txn.transfer_number || txn.issue_number || `#${txn.id}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="warehouse_id">Warehouse *</label>
                <select
                  id="warehouse_id"
                  name="warehouse_id"
                  value={formData.warehouse_id}
                  onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
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
                <label htmlFor="restocking_rule">Restocking Rule</label>
                <select
                  id="restocking_rule"
                  name="restocking_rule"
                  value={formData.restocking_rule}
                  onChange={(e) => setFormData({ ...formData, restocking_rule: e.target.value as any })}
                >
                  <option value="original_location">Original Location</option>
                  <option value="quarantine">Quarantine Area</option>
                  <option value="damage_area">Damage Area</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="return_reason">Return Reason *</label>
              <input
                id="return_reason"
                name="return_reason"
                type="text"
                value={formData.return_reason}
                onChange={(e) => setFormData({ ...formData, return_reason: e.target.value })}
                placeholder="Enter return reason"
                required
              />
            </div>

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
              <h3>Items to Return</h3>
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
              {loading ? 'Saving...' : return_transaction ? 'Update' : 'Create'} Stock Return
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

