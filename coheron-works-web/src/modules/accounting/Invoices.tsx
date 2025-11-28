import { useState, useEffect, useCallback } from 'react';
import { Search, FileText, Plus, CheckCircle, Clock, Eye, Edit, Trash2, Download, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { invoiceService, partnerService } from '../../services/odooService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import type { Invoice, Partner } from '../../types/odoo';
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

    useEffect(() => {
        console.log('=== INVOICES COMPONENT MOUNTED ===');
        alert('Invoices component loaded! Check console for logs.');
        loadData();
    }, []);

    // Test immediate execution
    console.log('=== INVOICES COMPONENT RENDERING ===', new Date().toISOString());


    const loadData = async () => {
        try {
            const [invoicesData, partnersData] = await Promise.all([
                invoiceService.getAll(),
                partnerService.getAll(),
            ]);
            setInvoices(invoicesData);
            setPartners(partnersData);
        } finally {
            setLoading(false);
        }
    };

    const getPartnerName = (partnerId: number) => {
        return partners.find(p => p.id === partnerId)?.name || 'Unknown';
    };

    const handleViewInvoice = useCallback(async (invoiceId: number) => {
        console.log('View invoice clicked:', invoiceId);
        try {
            const invoiceData = await invoiceService.getById(invoiceId);
            console.log('Invoice data received:', invoiceData);
            if (invoiceData && invoiceData.length > 0) {
                setSelectedInvoice(invoiceData[0]);
                setShowViewModal(true);
            } else {
                // If invoice not found in API, use the one from the list
                const invoice = invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    setSelectedInvoice(invoice);
                    setShowViewModal(true);
                } else {
                    alert('Invoice not found');
                }
            }
        } catch (error: any) {
            console.error('Failed to load invoice:', error);
            // Fallback: use invoice from list if API fails
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                setSelectedInvoice(invoice);
                setShowViewModal(true);
            } else {
                alert(error?.userMessage || error?.message || 'Failed to load invoice details');
            }
        }
    }, [invoices]);

    const handleEditInvoice = useCallback(async (invoiceId: number) => {
        console.log('Edit invoice clicked:', invoiceId);
        try {
            const invoiceData = await invoiceService.getById(invoiceId);
            if (invoiceData && invoiceData.length > 0) {
                setEditingInvoice(invoiceData[0]);
                setShowEditModal(true);
            } else {
                // Fallback: use invoice from list
                const invoice = invoices.find(inv => inv.id === invoiceId);
                if (invoice) {
                    setEditingInvoice(invoice);
                    setShowEditModal(true);
                } else {
                    alert('Invoice not found');
                }
            }
        } catch (error: any) {
            console.error('Failed to load invoice:', error);
            // Fallback: use invoice from list if API fails
            const invoice = invoices.find(inv => inv.id === invoiceId);
            if (invoice) {
                setEditingInvoice(invoice);
                setShowEditModal(true);
            } else {
                alert(error?.userMessage || error?.message || 'Failed to load invoice for editing');
            }
        }
    }, [invoices]);

    const handleDownloadPDF = useCallback(async (invoiceId: number) => {
        console.log('Download PDF clicked:', invoiceId);
        try {
            // Try to get PDF from API or generate download link
            // For Odoo, the URL format is typically: /report/pdf/account.move/{id}
            const pdfUrl = `/report/pdf/account.move/${invoiceId}`;
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `invoice-${invoiceId}.pdf`;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Also try opening in new tab as fallback
            setTimeout(() => {
                window.open(pdfUrl, '_blank');
            }, 100);
        } catch (error: any) {
            console.error('Failed to download PDF:', error);
            alert(error?.userMessage || error?.message || 'Failed to download PDF. Please try again.');
        }
    }, []);

    const handleDeleteInvoice = useCallback(async (invoiceId: number) => {
        console.log('Delete invoice clicked:', invoiceId);
        if (!window.confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
            return;
        }

        try {
            await invoiceService.delete(invoiceId);
            // Update local state
            setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
            alert('Invoice deleted successfully');
        } catch (error: any) {
            console.error('Failed to delete invoice:', error);
            alert(error?.userMessage || error?.message || 'Failed to delete invoice. Please try again.');
        }
    }, []);

    const handleSaveEdit = async () => {
        if (!editingInvoice) return;

        try {
            // Only send updatable fields
            const updateData: Partial<Invoice> = {
                name: editingInvoice.name,
                invoice_date: editingInvoice.invoice_date,
            };
            
            await invoiceService.update(editingInvoice.id, updateData);
            await loadData(); // Reload invoices
            setShowEditModal(false);
            setEditingInvoice(null);
            alert('Invoice updated successfully');
        } catch (error) {
            console.error('Failed to update invoice:', error);
            alert('Failed to update invoice. Please try again.');
        }
    };

    const filteredInvoices = invoices.filter(invoice =>
        invoice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getPartnerName(invoice.partner_id).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount_total, 0);
    const totalPaid = filteredInvoices.filter(inv => inv.payment_state === 'paid').reduce((sum, inv) => sum + inv.amount_total, 0);

    // Add global click listener AFTER handlers are defined
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            console.log('=== GLOBAL CLICK DETECTED ===', {
                tagName: target.tagName,
                className: target.className,
                id: target.id,
                textContent: target.textContent?.substring(0, 30)
            });
            
            const button = target.closest('button');
            if (button) {
                console.log('=== BUTTON CLICKED ===', {
                    id: button.id,
                    title: button.getAttribute('title'),
                    dataInvoiceId: button.getAttribute('data-invoice-id'),
                    className: button.className
                });
                
                // If React onClick didn't fire, manually trigger
                const title = button.getAttribute('title');
                const invoiceId = button.getAttribute('data-invoice-id');
                
                if (title === 'View Invoice' && invoiceId) {
                    console.log('Manually triggering View for invoice:', invoiceId);
                    handleViewInvoice(parseInt(invoiceId));
                } else if (title === 'Edit Invoice' && invoiceId) {
                    console.log('Manually triggering Edit for invoice:', invoiceId);
                    handleEditInvoice(parseInt(invoiceId));
                } else if (title === 'Download PDF' && invoiceId) {
                    console.log('Manually triggering Download for invoice:', invoiceId);
                    handleDownloadPDF(parseInt(invoiceId));
                } else if (title === 'Delete Invoice' && invoiceId) {
                    console.log('Manually triggering Delete for invoice:', invoiceId);
                    handleDeleteInvoice(parseInt(invoiceId));
                }
            }
        };
        
        document.addEventListener('click', handleGlobalClick, true);
        console.log('Global click listener attached');
        
        return () => {
            document.removeEventListener('click', handleGlobalClick, true);
        };
    }, [handleViewInvoice, handleEditInvoice, handleDownloadPDF, handleDeleteInvoice]);

    if (loading) {
        return <div className="invoices-page"><div className="container"><h1>Loading...</h1></div></div>;
    }

    // Debug: Log component render
    console.log('Invoices component rendered, invoice count:', filteredInvoices.length);
    console.log('Handlers defined:', {
        handleViewInvoice: typeof handleViewInvoice,
        handleEditInvoice: typeof handleEditInvoice,
        handleDownloadPDF: typeof handleDownloadPDF,
        handleDeleteInvoice: typeof handleDeleteInvoice
    });

    // Add native DOM event listener as fallback
    useEffect(() => {
        const testButton = document.getElementById('native-test-button');
        if (testButton) {
            const handler = () => {
                console.log('NATIVE DOM BUTTON CLICKED!');
                alert('Native DOM button works! React onClick might not be working.');
            };
            testButton.addEventListener('click', handler);
            return () => testButton.removeEventListener('click', handler);
        }
    }, []);

    return (
        <div className="invoices-page">
            <div className="container">
                {/* DEBUG TEST BUTTONS */}
                <div style={{ padding: '20px', background: '#f0f0f0', marginBottom: '20px', border: '2px solid red' }}>
                    <h3>DEBUG TEST BUTTONS - If you see this, component is rendering</h3>
                    <p>Check console for "INVOICES COMPONENT RENDERING" log</p>
                    <button 
                        id="native-test-button"
                        type="button"
                        style={{ padding: '10px', margin: '10px', background: 'red', color: 'white', cursor: 'pointer', fontSize: '16px' }}
                    >
                        NATIVE DOM TEST BUTTON - CLICK ME
                    </button>
                    <button 
                        type="button"
                        onClick={() => {
                            console.log('TEST BUTTON 1 CLICKED');
                            alert('TEST BUTTON 1 WORKS!');
                        }}
                        style={{ padding: '10px', margin: '10px', background: 'blue', color: 'white', cursor: 'pointer', fontSize: '16px' }}
                    >
                        REACT onClick TEST BUTTON - CLICK ME
                    </button>
                    <button 
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();
                            console.log('TEST BUTTON 2 CLICKED');
                            alert('TEST BUTTON 2 WORKS!');
                            if (filteredInvoices.length > 0) {
                                handleViewInvoice(filteredInvoices[0].id);
                            }
                        }}
                        style={{ padding: '10px', margin: '10px', background: 'green', color: 'white', cursor: 'pointer', fontSize: '16px' }}
                    >
                        TEST VIEW HANDLER - CLICK ME
                    </button>
                </div>
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
                            console.log('New Invoice button clicked - TEST');
                            alert('New Invoice functionality coming soon');
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
                                        <p>No invoices found. Debug: filteredInvoices.length = {filteredInvoices.length}, invoices.length = {invoices.length}</p>
                                    </td>
                                </tr>
                            ) : null}
                            {filteredInvoices.map((invoice, index) => {
                                console.log(`Rendering invoice row ${index}:`, invoice.id, invoice.name);
                                return (
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
                                        <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                className="action-btn"
                                                title="View Invoice"
                                                data-invoice-id={invoice.id}
                                                id={`view-btn-${invoice.id}`}
                                                onClick={(e) => {
                                                    console.log('=== VIEW BUTTON onClick FIRED ===', invoice.id);
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    alert('View button clicked! Invoice ID: ' + invoice.id);
                                                    handleViewInvoice(invoice.id);
                                                }}
                                                onMouseDown={(e) => {
                                                    console.log('=== VIEW BUTTON onMouseDown FIRED ===', invoice.id);
                                                }}
                                                onMouseUp={(e) => {
                                                    console.log('=== VIEW BUTTON onMouseUp FIRED ===', invoice.id);
                                                }}
                                            >
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="action-btn"
                                                title="Edit Invoice"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('=== EDIT BUTTON CLICKED ===', invoice.id);
                                                    alert('Edit button clicked! Invoice ID: ' + invoice.id);
                                                    handleEditInvoice(invoice.id);
                                                }}
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="action-btn"
                                                title="Download PDF"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('=== DOWNLOAD BUTTON CLICKED ===', invoice.id);
                                                    alert('Download button clicked! Invoice ID: ' + invoice.id);
                                                    handleDownloadPDF(invoice.id);
                                                }}
                                            >
                                                <Download size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                className="action-btn delete"
                                                title="Delete Invoice"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('=== DELETE BUTTON CLICKED ===', invoice.id);
                                                    alert('Delete button clicked! Invoice ID: ' + invoice.id);
                                                    handleDeleteInvoice(invoice.id);
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* View Invoice Modal */}
                {showViewModal && selectedInvoice && (
                    <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
                        <div className="modal-content invoice-view-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h2>Invoice Details</h2>
                                <button className="modal-close" onClick={() => setShowViewModal(false)}>
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
                                <button className="modal-close" onClick={() => { setShowEditModal(false); setEditingInvoice(null); }}>
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
