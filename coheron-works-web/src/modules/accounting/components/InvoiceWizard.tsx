import React, { useState, useEffect } from 'react';
import { X, FileText, Plus, Trash2 } from 'lucide-react';
import { odooService } from '../../../services/odooService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import type { Invoice, Partner, Product, SaleOrder } from '../../../types/odoo';
import './InvoiceWizard.css';

interface InvoiceWizardProps {
  onClose: () => void;
  onSuccess: () => void;
  saleOrderId?: number;
}

interface InvoiceLine {
  product_id: number;
  product_name: string;
  quantity: number;
  price_unit: number;
  price_subtotal: number;
}

export const InvoiceWizard: React.FC<InvoiceWizardProps> = ({
  onClose,
  onSuccess,
  saleOrderId,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [formData, setFormData] = useState({
    partner_id: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    move_type: 'out_invoice' as 'out_invoice' | 'in_invoice',
    invoice_line_ids: [] as InvoiceLine[],
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [partnersData, productsData] = await Promise.all([
        odooService.search<Partner>('res.partner', [], ['id', 'name']),
        odooService.search<Product>('product.product', [], ['id', 'name', 'list_price']),
      ]);

      setPartners(partnersData);
      setProducts(productsData);

      if (saleOrderId) {
        const orders = await odooService.search<SaleOrder>(
          'sale.order',
          [['id', '=', saleOrderId]],
          ['id', 'name', 'partner_id', 'order_line']
        );
        if (orders.length > 0) {
          const order = orders[0];
          setFormData((prev) => ({
            ...prev,
            partner_id: order.partner_id,
            invoice_line_ids: order.order_line.map((line: any) => ({
              product_id: line.product_id,
              product_name: productsData.find((p) => p.id === line.product_id)?.name || '',
              quantity: line.product_uom_qty,
              price_unit: line.price_unit,
              price_subtotal: line.price_subtotal,
            })),
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      invoice_line_ids: [
        ...prev.invoice_line_ids,
        {
          product_id: 0,
          product_name: '',
          quantity: 1,
          price_unit: 0,
          price_subtotal: 0,
        },
      ],
    }));
  };

  const handleRemoveLine = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      invoice_line_ids: prev.invoice_line_ids.filter((_, i) => i !== index),
    }));
  };

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: any) => {
    setFormData((prev) => {
      const newLines = [...prev.invoice_line_ids];
      const line = { ...newLines[index] };

      if (field === 'product_id') {
        const product = products.find((p) => p.id === value);
        line.product_id = value;
        line.product_name = product?.name || '';
        line.price_unit = product?.list_price || 0;
        line.price_subtotal = line.quantity * line.price_unit;
      } else if (field === 'quantity' || field === 'price_unit') {
        line[field] = parseFloat(value) || 0;
        line.price_subtotal = line.quantity * line.price_unit;
      }

      newLines[index] = line;
      return { ...prev, invoice_line_ids: newLines };
    });
  };

  const handleSubmit = async () => {
    if (!formData.partner_id) {
      setError('Please select a customer');
      return;
    }

    if (formData.invoice_line_ids.length === 0) {
      setError('Please add at least one invoice line');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create invoice
      await odooService.create<Invoice>('account.move', {
        partner_id: formData.partner_id,
        invoice_date: formData.invoice_date,
        move_type: formData.move_type,
        invoice_line_ids: formData.invoice_line_ids.map((line) => ({
          product_id: line.product_id,
          quantity: line.quantity,
          price_unit: line.price_unit,
        })),
      } as any);

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create invoice');
      console.error('Invoice creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = formData.invoice_line_ids.reduce(
    (sum, line) => sum + line.price_subtotal,
    0
  );

  return (
    <div className="invoice-wizard-overlay" onClick={onClose}>
      <div className="invoice-wizard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-header">
          <div className="wizard-title">
            <FileText size={24} />
            <h2>Create Invoice</h2>
          </div>
          <button className="wizard-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="wizard-steps">
          <div className={`step ${step === 1 ? 'active' : step > 1 ? 'completed' : ''}`}>
            <span className="step-number">1</span>
            <span className="step-label">Basic Info</span>
          </div>
          <div className={`step ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <span className="step-number">2</span>
            <span className="step-label">Invoice Lines</span>
          </div>
          <div className={`step ${step === 3 ? 'active' : ''}`}>
            <span className="step-number">3</span>
            <span className="step-label">Review</span>
          </div>
        </div>

        <div className="wizard-content">
          {error && (
            <div className="wizard-error">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="wizard-step-content">
              <div className="form-field">
                <label>Customer *</label>
                <select
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: parseInt(e.target.value) })}
                  disabled={loading}
                >
                  <option value={0}>Select a customer</option>
                  {partners.map((partner, idx) => (
                    <option key={partner.id || (partner as any)._id || idx} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label>Invoice Type *</label>
                <select
                  value={formData.move_type}
                  onChange={(e) =>
                    setFormData({ ...formData, move_type: e.target.value as any })
                  }
                  disabled={loading}
                >
                  <option value="out_invoice">Customer Invoice</option>
                  <option value="in_invoice">Vendor Bill</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label>Invoice Date *</label>
                  <input
                    type="date"
                    value={formData.invoice_date}
                    onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="form-field">
                  <label>Due Date *</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={loading}
                    min={formData.invoice_date}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="wizard-step-content">
              <div className="invoice-lines-header">
                <h3>Invoice Lines</h3>
                <button className="btn-add-line" onClick={handleAddLine}>
                  <Plus size={16} />
                  Add Line
                </button>
              </div>

              <div className="invoice-lines">
                {formData.invoice_line_ids.map((line, index) => (
                  <div key={index} className="invoice-line">
                    <div className="line-field">
                      <label>Product</label>
                      <select
                        value={line.product_id}
                        onChange={(e) =>
                          handleLineChange(index, 'product_id', parseInt(e.target.value))
                        }
                      >
                        <option value={0}>Select product</option>
                        {products.map((product, idx) => (
                          <option key={product.id || (product as any)._id || idx} value={product.id}>
                            {product.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="line-field">
                      <label>Quantity</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(index, 'quantity', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div className="line-field">
                      <label>Unit Price</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.price_unit}
                        onChange={(e) =>
                          handleLineChange(index, 'price_unit', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div className="line-field">
                      <label>Subtotal</label>
                      <input type="text" value={`₹${line.price_subtotal.toLocaleString()}`} readOnly />
                    </div>

                    <button
                      className="btn-remove-line"
                      onClick={() => handleRemoveLine(index)}
                      title="Remove line"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}

                {formData.invoice_line_ids.length === 0 && (
                  <div className="empty-lines">
                    <p>No invoice lines. Click "Add Line" to add items.</p>
                  </div>
                )}
              </div>

              <div className="invoice-total">
                <strong>Total: ₹{totalAmount.toLocaleString()}</strong>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="wizard-step-content">
              <h3>Review Invoice</h3>
              <div className="review-section">
                <div className="review-item">
                  <strong>Customer:</strong>
                  <span>{partners.find((p) => p.id === formData.partner_id)?.name || 'N/A'}</span>
                </div>
                <div className="review-item">
                  <strong>Invoice Date:</strong>
                  <span>{new Date(formData.invoice_date).toLocaleDateString()}</span>
                </div>
                <div className="review-item">
                  <strong>Due Date:</strong>
                  <span>{new Date(formData.due_date).toLocaleDateString()}</span>
                </div>
                <div className="review-item">
                  <strong>Total Amount:</strong>
                  <span>₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="wizard-footer">
          <button className="btn-secondary" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <div className="wizard-nav-buttons">
            {step > 1 && (
              <button
                className="btn-secondary"
                onClick={() => setStep(step - 1)}
                disabled={loading}
              >
                Previous
              </button>
            )}
            {step < 3 ? (
              <button
                className="btn-primary"
                onClick={() => setStep(step + 1)}
                disabled={loading}
              >
                Next
              </button>
            ) : (
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <LoadingSpinner size="small" />
                    Creating...
                  </>
                ) : (
                  'Create Invoice'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceWizard;

