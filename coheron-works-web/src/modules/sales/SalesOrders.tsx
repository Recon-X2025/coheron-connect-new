import { useState, useEffect } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, XCircle, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { saleOrderService, partnerService } from '../../services/odooService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { AdvancedFilter } from '../../shared/components/AdvancedFilter';
import { BulkActions, createCommonBulkActions } from '../../shared/components/BulkActions';
import { BulkActionModal } from '../../shared/components/BulkActionModal';
import { OrderWorkflow } from './components/OrderWorkflow';
import { OrderConfirmation } from './components/OrderConfirmation';
import { DeliveryTracking } from './components/DeliveryTracking';
import { OrderForm } from './components/OrderForm';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import type { SaleOrder, Partner } from '../../types/odoo';
import './SalesOrders.css';

export const SalesOrders = () => {
    const [orders, setOrders] = useState<SaleOrder[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [filterDomain, setFilterDomain] = useState<any[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<SaleOrder | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showBulkUpdateModal, setShowBulkUpdateModal] = useState(false);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkActionIds, setBulkActionIds] = useState<number[]>([]);
    const [showOrderForm, setShowOrderForm] = useState(false);

    useEffect(() => {
        loadData();
    }, [filterDomain]);

    const loadData = async () => {
        try {
            setLoading(true);
            const domain: any[] = filterDomain.length > 0 ? filterDomain : [];
            
            const [ordersData, partnersData] = await Promise.all([
                domain.length > 0 
                    ? saleOrderService.getAll().then(orders => {
                        // Client-side filtering for now
                        return orders;
                    })
                    : saleOrderService.getAll(),
                partnerService.getAll(),
            ]);
            setOrders(ordersData);
            setPartners(partnersData);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (ids: number[]) => {
        if (window.confirm(`Are you sure you want to delete ${ids.length} order(s)?`)) {
            try {
                await saleOrderService.delete(ids[0]);
                await loadData();
                setSelectedIds([]);
            } catch (error) {
                console.error('Failed to delete orders:', error);
            }
        }
    };

    const handleBulkUpdate = async (ids: number[]) => {
        setBulkActionIds(ids);
        setShowBulkUpdateModal(true);
    };

    const handleBulkUpdateConfirm = async (newState: string) => {
        try {
            for (const id of bulkActionIds) {
                await saleOrderService.update(id, { state: newState as any });
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
                await saleOrderService.update(id, { user_id: parseInt(userId) });
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
            saleOrderService.getById(selectedOrder.id).then(updated => {
                if (updated.length > 0) {
                    setSelectedOrder(updated[0]);
                }
            });
        }
    };

    const handleConfirmSuccess = () => {
        loadData();
        setShowConfirmation(false);
        if (selectedOrder) {
            saleOrderService.getById(selectedOrder.id).then(updated => {
                if (updated.length > 0) {
                    setSelectedOrder(updated[0]);
                }
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


    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            getPartnerName(order.partner_id).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.state === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.amount_total, 0);

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
                            {filteredOrders.length} orders · {formatInLakhsCompact(totalRevenue)} total
                        </p>
                    </div>
                    <Button icon={<Plus size={20} />} onClick={() => setShowOrderForm(true)}>New Order</Button>
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
                        totalCount={filteredOrders.length}
                        onSelectionChange={setSelectedIds}
                        actions={createCommonBulkActions(handleDelete, handleBulkAssign, handleBulkUpdate)}
                    />
                )}

                {viewMode === 'grid' ? (
                <div className="orders-grid">
                    {filteredOrders.map(order => (
                        <div key={order.id} className="order-card">
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
                                                selectedIds.length === filteredOrders.length &&
                                                filteredOrders.length > 0
                                            }
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedIds(filteredOrders.map((o) => o.id));
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
                                {filteredOrders.map(order => (
                                    <tr key={order.id}>
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
