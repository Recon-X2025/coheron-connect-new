import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Plus, CheckCircle, Clock, Eye, Edit, Trash2, Download, X } from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { usePagination } from '../../hooks/usePagination';
import { Button } from '../../components/Button';
import { invoiceService, partnerService } from '../../services/odooService';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import type { Invoice, Partner } from '../../types/odoo';
import { confirmAction } from '../../components/ConfirmDialog';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import './Invoices.css';

export const Invoices = () => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

    const closeViewModal = useCallback(() => setShowViewModal(false), []);
    const closeEditModal = useCallback(() => { setShowEditModal(false); setEditingInvoice(null); }, []);
    useModalDismiss(showViewModal, closeViewModal);
    useModalDismiss(showEditModal, closeEditModal);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [invoicesData, partnersData] = await Promise.all([
                invoiceService.getAll(),
                partnerService.getAll(),
            ]);
            setInvoices(invoicesData);
            setPartners(partnersData);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getPartnerName = (partnerId: number) => {
        return partners.find(p => p.id === partnerId)?.name || 'Unknown';
    };

    // Simple, direct handlers
    const handleViewInvoice = async (invoiceId: number) => {
        try {
            const invoiceData = await invoiceService.getById(invoiceId);
            if (invoiceData && invoiceData.length > 0) {
                setSelectedInvoice(invoiceData[0]);
                setShowViewModal(true);
            } else {
                const invoice = invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    setSelectedInvoice(invoice);
                    setShowViewModal(true);
                }
            }
        } catch (error: any) {
            console.error('Failed to load invoice:', error);
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                setSelectedInvoice(invoice);
                setShowViewModal(true);
            } else {
                showToast(error?.userMessage || error?.message || 'Failed to load invoice details', 'error');
            }
        }
    };

    const handleEditInvoice = async (invoiceId: number) => {
        try {
            const invoiceData = await invoiceService.getById(invoiceId);
            if (invoiceData && invoiceData.length > 0) {
                setEditingInvoice(invoiceData[0]);
                setShowEditModal(true);
            } else {
                const invoice = invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    setEditingInvoice(invoice);
                    setShowEditModal(true);
                }
            }
        } catch (error: any) {
            console.error('Failed to load invoice:', error);
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                setEditingInvoice(invoice);
                setShowEditModal(true);
            } else {
                showToast(error?.userMessage || error?.message || 'Failed to load invoice for editing', 'error');
            }
        }
    };

    const handleDownloadPDF = async (invoiceId: number) => {
        try {
            const pdfUrl = `/report/pdf/account.move/${invoiceId}`;
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `invoice-${invoiceId}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => {
                window.open(pdfUrl, '_blank');
            }, 100);
        } catch (error: any) {
            console.error('Failed to download PDF:', error);
            showToast(error?.userMessage || error?.message || 'Failed to download PDF. Please try again.', 'error');
        }
    };

    const handleDeleteInvoice = async (invoiceId: number) => {
        const ok = await confirmAction({
            title: 'Delete Invoice',
            message: 'Are you sure you want to delete this invoice? This action cannot be undone.',
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            await invoiceService.delete(invoiceId);
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
            showToast('Invoice deleted successfully', 'success');
        } catch (error: any) {
            console.error('Failed to delete invoice:', error);
            showToast(error?.userMessage || error?.message || 'Failed to delete invoice. Please try again.', 'error');
        }
    };

    const handleSaveEdit = async () => {
        if (!editingInvoice) return;

        try {
            const updateData: Partial<Invoice> = {
                name: editingInvoice.name,
                invoice_date: editingInvoice.invoice_date,
            };
            
            await invoiceService.update(editingInvoice.id, updateData);
            await loadData();
            setShowEditModal(false);
            setEditingInvoice(null);
            showToast('Invoice updated successfully', 'success');
        } catch (error) {
            console.error('Failed to update invoice:', error);
            showToast('Failed to update invoice. Please try again.', 'error');
        }
    };

    const filteredInvoices = invoices.filter(invoice => {
        const matchesSearch = invoice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getPartnerName(invoice.partner_id).toLowerCase().includes(searchTerm.toLowerCase());
        const invDate = invoice.invoice_date ? (invoice.invoice_date.includes('T') ? invoice.invoice_date.split('T')[0] : invoice.invoice_date.split(' ')[0]) : '';
        const matchesStart = !startDate || invDate >= startDate;
        const matchesEnd = !endDate || invDate <= endDate;
        return matchesSearch && matchesStart && matchesEnd;
    });

    const { paginatedItems: paginatedInvoices, page, setPage, pageSize, setPageSize, totalPages, totalItems, resetPage } = usePagination(filteredInvoices);

    // Reset page when filters change
    useEffect(() => { resetPage(); }, [searchTerm, startDate, endDate, resetPage]);

    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount_total, 0);
    const totalPaid = filteredInvoices.filter(inv => inv.payment_state === 'paid').reduce((sum, inv) => sum + inv.amount_total, 0);

    if (loading) {
        return <div className="invoices-page"><div className="container"><h1>Loading...</h1></div></div>;
    }

    return (
        <div className="invoices-page">
            <div className="container">
                <div className="invoices-header">
                    <div>
                        <h1>Invoices</h1>
                        <p className="invoices-subtitle">
                            {filteredInvoices.length} invoices · {formatInLakhsCompact(totalAmount)} total
                        </p>
                    </div>
                    <Button 
                        icon={<Plus size={20} />}
                        onClick={() => {
                            showToast('New Invoice functionality will be available soon', 'info');
                        }}
                    >
                        New Invoice
                    </Button>
                </div>

                <div className="invoices-stats">
                    <div className="stat-card">
                        <span className="stat-label">Total Amount</span>
                        <span className="stat-value">{formatInLakhsCompact(totalAmount)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Paid</span>
                        <span className="stat-value paid">{formatInLakhsCompact(totalPaid)}</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-label">Outstanding</span>
                        <span className="stat-value outstanding">{formatInLakhsCompact(totalAmount - totalPaid)}</span>
                    </div>
                </div>

                <div className="invoices-toolbar">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            id="invoice-search"
                            name="invoice-search"
                            placeholder="Search invoices..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <DateRangeFilter
                        startDate={startDate}
                        endDate={endDate}
                        onStartChange={setStartDate}
                        onEndChange={setEndDate}
                        onClear={() => { setStartDate(''); setEndDate(''); }}
                    />
                </div>

                <div className="invoices-table-container">
                    <table className="invoices-table">
                        <thead>
                            <tr>
                                <th>Invoice #</th>
                                <th>Customer</th>
                                <th>Date</th>
                                <th className="amount-col">Amount</th>
                                <th className="amount-col">Due</th>
                                <th>Status</th>
                                <th className="actions-col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                                        No invoices found
                                    </td>
                                </tr>
                            ) : (
                                paginatedInvoices.map((invoice) => (
                                    <tr key={invoice.id}>
                                        <td className="invoice-number">
                                            <FileText size={16} />
                                            {invoice.name}
                                        </td>
                                        <td>{getPartnerName(invoice.partner_id)}</td>
                                        <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                                        <td className="amount">{formatInLakhsCompact(invoice.amount_total)}</td>
                                        <td className="amount-due">{formatInLakhsCompact(invoice.amount_residual)}</td>
                                        <td>
                                            <span className={`payment-badge ${invoice.payment_state}`}>
                                                {invoice.payment_state === 'paid' ? <CheckCircle size={14} /> : <Clock size={14} />}
                                                {invoice.payment_state.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    type="button"
                                                    className="action-btn"
                                                    title="View Invoice"
                                                    onClick={() => handleViewInvoice(invoice.id)}
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn"
                                                    title="Edit Invoice"
                                                    onClick={() => handleEditInvoice(invoice.id)}
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn"
                                                    title="Download PDF"
                                                    onClick={() => handleDownloadPDF(invoice.id)}
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="action-btn delete"
                                                    title="Delete Invoice"
                                                    onClick={() => handleDeleteInvoice(invoice.id)}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 25, 50]}
                />

                {/* View Invoice Modal */}
                {showViewModal && selectedInvoice && (
                    <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                        <div className="modal-content invoice-view-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Invoice Details</h2>
                                <button 
                                    type="button"
                                    className="modal-close" 
                                    onClick={() => setShowViewModal(false)}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="invoice-details">
                                <div className="detail-row">
                                    <span className="detail-label">Invoice Number:</span>
                                    <span className="detail-value">{selectedInvoice.name}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Customer:</span>
                                    <span className="detail-value">{getPartnerName(selectedInvoice.partner_id)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Date:</span>
                                    <span className="detail-value">{new Date(selectedInvoice.invoice_date).toLocaleDateString()}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Due Date:</span>
                                    <span className="detail-value">N/A</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Total Amount:</span>
                                    <span className="detail-value">{formatInLakhsCompact(selectedInvoice.amount_total)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Amount Due:</span>
                                    <span className="detail-value">{formatInLakhsCompact(selectedInvoice.amount_residual)}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="detail-label">Status:</span>
                                    <span className={`payment-badge ${selectedInvoice.payment_state}`}>
                                        {selectedInvoice.payment_state.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                            <div className="modal-actions">
                                <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
                                <Button onClick={() => {
                                    setShowViewModal(false);
                                    handleDownloadPDF(selectedInvoice.id);
                                }}>
                                    <Download size={16} />
                                    Download PDF
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Invoice Modal */}
                {showEditModal && editingInvoice && (
                    <div className="modal-overlay" onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Edit Invoice</h2>
                                <button 
                                    type="button"
                                    className="modal-close" 
                                    onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-invoice-name">Invoice Number</label>
                                <input
                                    type="text"
                                    id="edit-invoice-name"
                                    name="invoice-name"
                                    value={editingInvoice.name}
                                    onChange={(e) => setEditingInvoice({ ...editingInvoice, name: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-invoice-date">Invoice Date</label>
                                <input
                                    type="date"
                                    id="edit-invoice-date"
                                    name="invoice-date"
                                    value={editingInvoice.invoice_date ? (editingInvoice.invoice_date.includes('T') ? editingInvoice.invoice_date.split('T')[0] : editingInvoice.invoice_date.split(' ')[0]) : ''}
                                    onChange={(e) => setEditingInvoice({ ...editingInvoice, invoice_date: e.target.value })}
                                />
                            </div>
                            <div className="modal-actions">
                                <Button variant="ghost" onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}>Cancel</Button>
                                <Button onClick={handleSaveEdit}>Save Changes</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
