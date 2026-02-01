import { useState, useEffect } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, Eye, Edit, Send, DollarSign, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { accountsPayableService } from '../../services/accountingService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import { BillForm } from './components/BillForm';
import { PaymentForm } from './components/PaymentForm';
import { VendorForm } from './components/VendorForm';
import { confirmAction } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import './AccountsPayable.css';

interface Bill {
  id: number;
  name: string;
  vendor_code: string;
  vendor_name: string;
  invoice_date: string;
  due_date: string;
  amount_total: number;
  amount_residual: number;
  state: string;
  payment_state: string;
}

export const AccountsPayable = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'bills' | 'payments' | 'vendors'>('bills');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showBillForm, setShowBillForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);

  useEffect(() => {
    loadBills();
    loadPayments();
    loadVendors();
  }, []);

  const loadBills = async () => {
    try {
      const data = await accountsPayableService.getBills() as Bill[];
      setBills(data || []);
    } catch (error) {
      console.error('Error loading bills:', error);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPayments = async () => {
    try {
      const data = await accountsPayableService.getPayments() as any[];
      setPayments(data || []);
    } catch {
      setPayments([]);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await accountsPayableService.getVendors() as any[];
      setVendors(data || []);
    } catch {
      setVendors([]);
    }
  };

  const filteredBills = bills.filter(bill =>
    bill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bill.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = filteredBills
    .filter(b => b.payment_state !== 'paid')
    .reduce((sum, b) => sum + b.amount_residual, 0);

  const handleViewBill = async (billId: number) => {
    try {
      const bill = bills.find(b => b.id === billId);
      if (bill) {
        setSelectedBill(bill);
        setShowViewModal(true);
      } else {
        showToast('Bill not found', 'error');
      }
    } catch (error: any) {
      console.error('Failed to load bill:', error);
      showToast(error?.userMessage || error?.message || 'Failed to load bill details', 'error');
    }
  };

  const handleEditBill = (billId: number) => {
    const bill = bills.find(b => b.id === billId);
    if (bill) {
      setEditingBill(bill);
      setShowEditModal(true);
    } else {
      showToast('Bill not found', 'error');
    }
  };

  const handlePostBill = async (billId: number) => {
    const ok = await confirmAction({
      title: 'Post Bill',
      message: 'Are you sure you want to post this bill? This action cannot be undone.',
      confirmLabel: 'Post',
      variant: 'warning',
    });
    if (!ok) return;

    try {
      await accountsPayableService.postBill(billId);
      await loadBills();
      showToast('Bill posted successfully', 'success');
    } catch (error: any) {
      console.error('Failed to post bill:', error);
      showToast(error?.userMessage || error?.message || 'Failed to post bill. Please try again.', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingBill) return;

    try {
      await accountsPayableService.updateBill(editingBill.id, editingBill);
      await loadBills();
      setShowEditModal(false);
      setEditingBill(null);
      showToast('Bill updated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to update bill:', error);
      showToast(error?.userMessage || error?.message || 'Failed to update bill. Please try again.', 'error');
    }
  };

  if (loading) {
    return <div className="ap-page"><div className="container"><h1>Loading...</h1></div></div>;
  }

  return (
    <div className="ap-page">
      <div className="container">
        <div className="ap-header">
          <div>
            <h1>Accounts Payable</h1>
            <p className="ap-subtitle">
              {filteredBills.length} bills · {formatInLakhsCompact(totalOutstanding)} outstanding
            </p>
          </div>
          <div className="ap-actions">
            {activeTab === 'bills' && <Button icon={<Plus size={20} />} onClick={() => setShowBillForm(true)}>New Bill</Button>}
            {activeTab === 'payments' && <Button icon={<DollarSign size={20} />} onClick={() => setShowPaymentForm(true)}>New Payment</Button>}
            {activeTab === 'vendors' && <Button icon={<Plus size={20} />} onClick={() => setShowVendorForm(true)}>New Vendor</Button>}
          </div>
        </div>

        <div className="ap-tabs">
          <button
            className={`ap-tab ${activeTab === 'bills' ? 'active' : ''}`}
            onClick={() => setActiveTab('bills')}
          >
            Bills
          </button>
          <button
            className={`ap-tab ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
          >
            Payments
          </button>
          <button
            className={`ap-tab ${activeTab === 'vendors' ? 'active' : ''}`}
            onClick={() => setActiveTab('vendors')}
          >
            Vendors
          </button>
        </div>

        <div className="ap-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              id="bill-search"
              name="bill-search"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {activeTab === 'bills' && filteredBills.length === 0 && (
          <EmptyState
            icon={<FileText size={48} />}
            title="No bills yet"
            description="Record your first vendor bill to track accounts payable"
            actionLabel="New Bill"
            onAction={() => setShowBillForm(true)}
          />
        )}

        {activeTab === 'bills' && filteredBills.length > 0 && (
          <div className="ap-table-container">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Vendor</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th className="amount-col">Amount</th>
                  <th className="amount-col">Outstanding</th>
                  <th>Status</th>
                  <th className="actions-col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map((bill, idx) => (
                  <tr key={bill.id || (bill as any)._id || idx}>
                    <td className="bill-number">
                      <FileText size={16} />
                      {bill.name}
                    </td>
                    <td>{bill.vendor_name}</td>
                    <td>{new Date(bill.invoice_date).toLocaleDateString()}</td>
                    <td>{bill.due_date ? new Date(bill.due_date).toLocaleDateString() : '-'}</td>
                    <td className="amount">{formatInLakhsCompact(bill.amount_total)}</td>
                    <td className="amount">{formatInLakhsCompact(bill.amount_residual)}</td>
                    <td>
                      <span className={`payment-badge ${bill.payment_state}`}>
                        {bill.payment_state === 'paid' ? <CheckCircle size={14} /> : <Clock size={14} />}
                        {bill.payment_state.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          type="button"
                          className="action-btn" 
                          title="View" 
                          onClick={() => handleViewBill(bill.id)}
                        >
                          <Eye size={16} />
                        </button>
                        {bill.state === 'draft' && (
                          <>
                            <button 
                              type="button"
                              className="action-btn" 
                              title="Edit" 
                              onClick={() => handleEditBill(bill.id)}
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              type="button"
                              className="action-btn post" 
                              title="Post" 
                              onClick={() => handlePostBill(bill.id)}
                            >
                              <Send size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'payments' && (
          payments.length === 0 ? (
            <EmptyState
              icon={<DollarSign size={48} />}
              title="No payments yet"
              description="Record your first payment to track vendor disbursements"
              actionLabel="New Payment"
              onAction={() => setShowPaymentForm(true)}
            />
          ) : (
            <div className="ap-table-container">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Payment #</th>
                    <th>Vendor</th>
                    <th>Date</th>
                    <th>Method</th>
                    <th className="amount-col">Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.filter(p =>
                    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (p.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((pmt: any) => (
                    <tr key={pmt.id || pmt._id}>
                      <td className="bill-number"><DollarSign size={16} /> {pmt.name || pmt.reference || '-'}</td>
                      <td>{pmt.vendor_name || pmt.partner_name || '-'}</td>
                      <td>{pmt.date ? new Date(pmt.date).toLocaleDateString() : '-'}</td>
                      <td>{pmt.payment_method || pmt.journal_name || '-'}</td>
                      <td className="amount">{formatInLakhsCompact(pmt.amount || 0)}</td>
                      <td>
                        <span className={`payment-badge ${pmt.state || 'draft'}`}>
                          {pmt.state === 'posted' ? <CheckCircle size={14} /> : <Clock size={14} />}
                          {(pmt.state || 'draft').replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {activeTab === 'vendors' && (
          vendors.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} />}
              title="No vendors yet"
              description="Add your first vendor to manage supplier relationships"
              actionLabel="New Vendor"
              onAction={() => setShowVendorForm(true)}
            />
          ) : (
            <div className="ap-table-container">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>Vendor Name</th>
                    <th>Code</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th className="amount-col">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.filter(v =>
                    (v.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (v.code || '').toLowerCase().includes(searchTerm.toLowerCase())
                  ).map((vendor: any) => (
                    <tr key={vendor.id || vendor._id}>
                      <td className="bill-number"><FileText size={16} /> {vendor.name || '-'}</td>
                      <td>{vendor.code || vendor.ref || '-'}</td>
                      <td>{vendor.email || '-'}</td>
                      <td>{vendor.phone || '-'}</td>
                      <td className="amount">{formatInLakhsCompact(vendor.total_due || vendor.amount_residual || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* View Bill Modal */}
        {showViewModal && selectedBill && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Bill Details</h2>
                <button 
                  type="button"
                  className="modal-close" 
                  onClick={() => setShowViewModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="bill-details">
                <div className="detail-row">
                  <span className="detail-label">Bill Number:</span>
                  <span className="detail-value">{selectedBill.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Vendor:</span>
                  <span className="detail-value">{selectedBill.vendor_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{new Date(selectedBill.invoice_date).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Due Date:</span>
                  <span className="detail-value">{selectedBill.due_date ? new Date(selectedBill.due_date).toLocaleDateString() : 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Total Amount:</span>
                  <span className="detail-value">{formatInLakhsCompact(selectedBill.amount_total)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Outstanding:</span>
                  <span className="detail-value">{formatInLakhsCompact(selectedBill.amount_residual)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`payment-badge ${selectedBill.payment_state}`}>
                    {selectedBill.payment_state.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <div className="modal-actions">
                <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Bill Modal */}
        {showEditModal && editingBill && (
          <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingBill(null); }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Bill</h2>
                <button 
                  type="button"
                  className="modal-close" 
                  onClick={() => { setShowEditModal(false); setEditingBill(null); }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="form-group">
                <label htmlFor="edit-bill-name">Bill Number</label>
                <input
                  type="text"
                  id="edit-bill-name"
                  name="bill-name"
                  value={editingBill.name}
                  onChange={(e) => setEditingBill({ ...editingBill, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-bill-invoice-date">Invoice Date</label>
                <input
                  type="date"
                  id="edit-bill-invoice-date"
                  name="bill-invoice-date"
                  value={editingBill.invoice_date ? editingBill.invoice_date.split('T')[0] : ''}
                  onChange={(e) => setEditingBill({ ...editingBill, invoice_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="edit-bill-due-date">Due Date</label>
                <input
                  type="date"
                  id="edit-bill-due-date"
                  name="bill-due-date"
                  value={editingBill.due_date ? editingBill.due_date.split('T')[0] : ''}
                  onChange={(e) => setEditingBill({ ...editingBill, due_date: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingBill(null); }}>Cancel</Button>
                <Button onClick={handleSaveEdit}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}

        {showBillForm && (
          <BillForm
            onClose={() => setShowBillForm(false)}
            onSave={() => {
              setShowBillForm(false);
              loadBills();
            }}
          />
        )}

        {showPaymentForm && (
          <PaymentForm
            onClose={() => setShowPaymentForm(false)}
            onSave={() => {
              setShowPaymentForm(false);
              loadBills();
            }}
          />
        )}

        {showVendorForm && (
          <VendorForm
            onClose={() => setShowVendorForm(false)}
            onSave={() => {
              setShowVendorForm(false);
              loadBills();
            }}
          />
        )}
      </div>
    </div>
  );
};

