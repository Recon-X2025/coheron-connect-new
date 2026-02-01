import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, XCircle, Eye, Printer } from 'lucide-react';
import { Pagination } from '../../shared/components/Pagination';
import { useServerPagination } from '../../hooks/useServerPagination';
import { Button } from '../../components/Button';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AdvancedFilter } from '../../shared/components/AdvancedFilter';
import { BulkActions, createCommonBulkActions } from '../../shared/components/BulkActions';
import { BulkActionModal } from '../../shared/components/BulkActionModal';
import { OrderWorkflow } from './components/OrderWorkflow';
import { OrderConfirmation } from './components/OrderConfirmation';
import { DeliveryTracking } from './components/DeliveryTracking';
import { OrderForm } from './components/OrderForm';
import { EmptyState } from '../../components/EmptyState';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import { confirmAction } from '../../components/ConfirmDialog';
import { useModalDismiss } from '../../hooks/useModalDismiss';
import './SalesOrders.css';

export const SalesOrders = () => {
    const [partners, setPartners] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filterDomain, setFilterDomain] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkActionIds, setBulkActionIds] = useState<number[]>([]);
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const serverPaginationFilters: Record<string, any> = {};
    if (searchTerm) serverPaginationFilters.search = searchTerm;
    if (statusFilter !== 'all') serverPaginationFilters.state = statusFilter;
    if (startDate) serverPaginationFilters.start_date = startDate;
    if (endDate) serverPaginationFilters.end_date = endDate;

    const {
        data: orders,
        pagination: paginationMeta,
        loading,
        setPage,
        setPageSize,
        setFilters: setServerFilters,
        refresh: loadData,
    } = useServerPagination<any>('/sale-orders', serverPaginationFilters);

    const closeDetailModal = useCallback(() => setSelectedOrder(null), []);
    useModalDismiss(!!selectedOrder && !showConfirmation, closeDetailModal);

    // Sync filters to server pagination
    useEffect(() => {
        const filters: Record<string, any> = {};
        if (searchTerm) filters.search = searchTerm;
        if (statusFilter !== 'all') filters.state = statusFilter;
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;
        setServerFilters(filters);
    }, [searchTerm, statusFilter, startDate, endDate, filterDomain, setServerFilters]);

    // Load partners separately
    useEffect(() => {
        apiService.get<any[]>('/partners').then(setPartners);
    }, []);

    const handleDelete = async (ids: number[]) => {
        const ok = await confirmAction({
            title: 'Delete Orders',
            message: `Are you sure you want to delete ${ids.length} order(s)?`,
            confirmLabel: 'Delete',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await apiService.delete('/sale-orders', ids[0]);
            await loadData();
            setSelectedIds([]);
        } catch (error) {
            console.error('Failed to delete orders:', error);
        }
    };

    const handleBulkUpdate = async (ids: number[]) => {
        setBulkActionIds(ids);
        setShowBulkUpdateModal(true);
    };

    const handleBulkUpdateConfirm = async (newState: string) => {
        try {
            for (const id of bulkActionIds) {
                await apiService.update('/sale-orders', id, { state: newState as any });
            }
            await loadData();
            setSelectedIds([]);
            setShowBulkUpdateModal(false);
            setBulkActionIds([]);
            showToast(`${bulkActionIds.length} order(s) updated successfully`, 'success');
        } catch (error: any) {
            console.error('Failed to bulk update orders:', error);
            showToast(error?.message || 'Failed to update orders', 'error');
        }
    };

    const handleBulkAssign = async (ids: number[]) => {
        setBulkActionIds(ids);
        setShowBulkAssignModal(true);
    };

    const handleBulkAssignConfirm = async (userId: string) => {
        try {
            for (const id of bulkActionIds) {
                await apiService.update('/sale-orders', id, { user_id: parseInt(userId) });
            }
            await loadData();
            setSelectedIds([]);
            setShowBulkAssignModal(false);
            setBulkActionIds([]);
            showToast(`${bulkActionIds.length} order(s) assigned successfully`, 'success');
        } catch (error: any) {
            console.error('Failed to bulk assign orders:', error);
            showToast(error?.message || 'Failed to assign orders', 'error');
        }
    };

    const handleStateChange = () => {
        loadData();
        if (selectedOrder) {
            // Reload selected order
            apiService.getById<any>('/sale-orders', selectedOrder.id).then(updated => {
                setSelectedOrder(updated);
            });
        }
    };

    const handleConfirmSuccess = () => {
        loadData();
        setShowConfirmation(false);
        if (selectedOrder) {
            apiService.getById<any>('/sale-orders', selectedOrder.id).then(updated => {
                setSelectedOrder(updated);
            });
        }
    };

    const getPartnerName = (partnerId: number) => {
        return partners.find(p => p.id === partnerId)?.name || 'Unknown';
    };

    const getStatusIcon = (state: string) => {
        switch (state) {
            case 'sale': return <CheckCircle size={16} />;
            case 'sent': return <Clock size={16} />;
            case 'done': return <CheckCircle size={16} />;
            case 'cancel': return <XCircle size={16} />;
            default: return <FileText size={16} />;
        }
    };

    const getStatusColor = (state: string) => {
        switch (state) {
            case 'sale': return '#10b981';
            case 'sent': return '#3b82f6';
            case 'done': return '#8b5cf6';
            case 'cancel': return '#ef4444';
            default: return '#64748b';
        }
    };

    const getStatusLabel = (state: string) => {
        const labels: Record<string, string> = {
            draft: 'Draft',
            sent: 'Quotation Sent',
            sale: 'Sales Order',
            done: 'Locked',
            cancel: 'Cancelled',
        };
        return labels[state] || state;
    };


    const paginatedOrders = orders;
    const totalRevenue = orders.reduce((sum, order) => sum + order.amount_total, 0);

    const filterFields = [
        { name: 'state', label: 'State', type: 'selection' as const },
        { name: 'amount_total', label: 'Total Amount', type: 'number' as const },
        { name: 'date_order', label: 'Order Date', type: 'date' as const },
    ];

    if (loading) {
        return (
            <div className="sales-orders-page">
                <div className="container">
                    <LoadingSpinner size="medium" message="Loading sales orders..." />
                </div>
            </div>
        );
    }

    return (
        <div className="sales-orders-page">
            <div className="container">
                <div className="sales-header">
                    <div>
                        <h1>Sales Orders</h1>
                        <p className="sales-subtitle">
                            {paginationMeta.total} orders · {formatInLakhsCompact(totalRevenue)} total
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="ghost" className="no-print" icon={<Printer size={16} />} onClick={() => window.print()}>Print</Button>
                        <Button icon={<Plus size={20} />} onClick={() => setShowOrderForm(true)}>New Order</Button>
                    </div>
                </div>

                <div className="sales-toolbar">
                    <div className="search-box">
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search orders..."
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

                    <div className="toolbar-actions">
                    <div className="status-filter">
                        <button className={statusFilter === 'all' ? 'active' : ''} onClick={() => setStatusFilter('all')}>
                            All
                        </button>
                        <button className={statusFilter === 'draft' ? 'active' : ''} onClick={() => setStatusFilter('draft')}>
                            Draft
                        </button>
                        <button className={statusFilter === 'sent' ? 'active' : ''} onClick={() => setStatusFilter('sent')}>
                            Sent
                        </button>
                        <button className={statusFilter === 'sale' ? 'active' : ''} onClick={() => setStatusFilter('sale')}>
                            Confirmed
                        </button>
                        </div>
                        <AdvancedFilter
                            fields={filterFields}
                            onFilterChange={setFilterDomain}
                            savedFilters={[]}
                        />
                        <div className="view-toggle">
                            <button
                                className={viewMode === 'grid' ? 'active' : ''}
                                onClick={() => setViewMode('grid')}
                            >
                                Grid
                            </button>
                            <button
                                className={viewMode === 'list' ? 'active' : ''}
                                onClick={() => setViewMode('list')}
                            >
                                List
                            </button>
                        </div>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <BulkActions
                        selectedIds={selectedIds}
                        totalCount={paginationMeta.total}
                        onSelectionChange={setSelectedIds}
                        actions={createCommonBulkActions(handleDelete, handleBulkAssign, handleBulkUpdate)}
                    />
                )}

                {orders.length === 0 && !loading ? (
                    <EmptyState
                        icon={<FileText size={48} />}
                        title="No sales orders yet"
                        description="Create your first sales order to get started"
                        actionLabel="New Order"
                        onAction={() => setShowOrderForm(true)}
                    />
                ) : viewMode === 'grid' ? (
                <div className="orders-grid">
                    {paginatedOrders.map((order, idx) => (
                        <div key={order.id || (order as any)._id || idx} className="order-card">
                            <div className="order-header">
                                <div>
                                    <h3>{order.name}</h3>
                                    <p className="order-customer">{getPartnerName(order.partner_id)}</p>
                                </div>
                                <div
                                    className="order-status"
                                    style={{ color: getStatusColor(order.state) }}
                                >
                                    {getStatusIcon(order.state)}
                                    <span>{getStatusLabel(order.state)}</span>
                                </div>
                            </div>

                            <div className="order-details">
                                <div className="order-date">
                                    <span className="label">Order Date</span>
                                    <span className="value">{new Date(order.date_order).toLocaleDateString()}</span>
                                </div>
                                <div className="order-amount">
                                    <span className="label">Total Amount</span>
                                            <span className="value amount">{formatInLakhsCompact(order.amount_total)}</span>
                                    </div>
                                </div>

                                <div className="order-items">
                                    <span className="items-count">{order.order_line.length} item(s)</span>
                                </div>

                                <div className="order-actions">
                                    <button
                                        className="action-btn"
                                        onClick={() => setSelectedOrder(order)}
                                        title="View Details"
                                    >
                                        <Eye size={16} />
                                        View
                                    </button>
                                    {order.state === 'sent' && (
                                        <button
                                            className="action-btn confirm"
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowConfirmation(true);
                                            }}
                                            title="Confirm Order"
                                        >
                                            <CheckCircle size={16} />
                                            Confirm
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="orders-table-container">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>
                                        <input
                                            type="checkbox"
                                            checked={
                                                selectedIds.length === paginatedOrders.length &&
                                                paginatedOrders.length > 0
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(paginatedOrders.map((o) => o.id));
                                                } else {
                                                    setSelectedIds([]);
                                                }
                                            }}
                                        />
                                    </th>
                                    <th>Order Number</th>
                                    <th>Customer</th>
                                    <th>Date</th>
                                    <th className="amount-col">Amount</th>
                                    <th>Status</th>
                                    <th className="actions-col">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrders.map((order, idx) => (
                                    <tr key={order.id || (order as any)._id || idx}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(order.id)}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setSelectedIds([...selectedIds, order.id]);
                                                    } else {
                                                        setSelectedIds(selectedIds.filter((id) => id !== order.id));
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td><strong>{order.name}</strong></td>
                                        <td>{getPartnerName(order.partner_id)}</td>
                                        <td>{new Date(order.date_order).toLocaleDateString()}</td>
                                        <td className="amount-col">{formatInLakhsCompact(order.amount_total)}</td>
                                        <td>
                                            <span
                                                className="status-badge"
                                                style={{
                                                    backgroundColor: `${getStatusColor(order.state)}20`,
                                                    color: getStatusColor(order.state),
                                                }}
                                            >
                                                {getStatusLabel(order.state)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="action-buttons">
                                                <button
                                                    className="action-btn"
                                                    onClick={() => setSelectedOrder(order)}
                                                    title="View"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {order.state === 'sent' && (
                                                    <button
                                                        className="action-btn confirm"
                                                        onClick={() => {
                                                            setSelectedOrder(order);
                                                            setShowConfirmation(true);
                                                        }}
                                                        title="Confirm"
                                                    >
                                                        <CheckCircle size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <Pagination
                    currentPage={paginationMeta.page}
                    totalPages={paginationMeta.totalPages}
                    pageSize={paginationMeta.limit}
                    totalItems={paginationMeta.total}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[10, 25, 50]}
                />

                {selectedOrder && !showConfirmation && (
                    <div className="order-detail-modal" onClick={() => setSelectedOrder(null)}>
                        <div className="order-detail-content" onClick={(e) => e.stopPropagation()}>
                            <div className="order-detail-header">
                                <h2>{selectedOrder.name}</h2>
                                <button onClick={() => setSelectedOrder(null)}>×</button>
                            </div>
                            <div className="order-detail-body">
                                <div className="order-info-section">
                                    <h3>Order Information</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <strong>Customer:</strong> {getPartnerName(selectedOrder.partner_id)}
                                        </div>
                                        <div className="info-item">
                                            <strong>Date:</strong> {new Date(selectedOrder.date_order).toLocaleDateString()}
                                        </div>
                                        <div className="info-item">
                                            <strong>Total:</strong> {formatInLakhsCompact(selectedOrder.amount_total)}
                                        </div>
                                        <div className="info-item">
                                            <strong>Status:</strong>{' '}
                                            <span
                                                className="status-badge"
                                                style={{
                                                    backgroundColor: `${getStatusColor(selectedOrder.state)}20`,
                                                    color: getStatusColor(selectedOrder.state),
                                                }}
                                            >
                                                {getStatusLabel(selectedOrder.state)}
                                            </span>
                                        </div>
                                </div>
                            </div>

                                <OrderWorkflow order={selectedOrder} onStateChange={handleStateChange} />
                                <DeliveryTracking order={selectedOrder} />
                            </div>
                        </div>
                </div>
                )}

                {showConfirmation && selectedOrder && (
                    <OrderConfirmation
                        order={selectedOrder}
                        onClose={() => {
                            setShowConfirmation(false);
                            setSelectedOrder(null);
                        }}
                        onSuccess={handleConfirmSuccess}
                    />
                )}
            </div>

            <BulkActionModal
          isOpen={showBulkUpdateModal}
          onClose={() => {
            setShowBulkUpdateModal(false);
            setBulkActionIds([]);
          }}
          onConfirm={handleBulkUpdateConfirm}
          title={`Update ${bulkActionIds.length} Order(s)`}
          label="New State"
          type="select"
          options={[
            { value: 'draft', label: 'Draft' },
            { value: 'sent', label: 'Sent' },
            { value: 'sale', label: 'Sale' },
            { value: 'done', label: 'Done' },
            { value: 'cancel', label: 'Cancel' },
          ]}
          confirmText="Update Orders"
        />

        <BulkActionModal
          isOpen={showBulkAssignModal}
          onClose={() => {
            setShowBulkAssignModal(false);
            setBulkActionIds([]);
          }}
          onConfirm={handleBulkAssignConfirm}
          title={`Assign ${bulkActionIds.length} Order(s)`}
          label="User ID"
          placeholder="Enter user ID"
          confirmText="Assign Orders"
        />

        {showOrderForm && (
          <OrderForm
            onClose={() => setShowOrderForm(false)}
            onSave={loadData}
          />
        )}
        </div>
    );
};
