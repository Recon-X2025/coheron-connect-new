import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Factory,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Play,
  Scissors,
  AlertCircle,
  Package,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { manufacturingService, type ManufacturingOrder } from '../../services/manufacturingService';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import { confirmAction } from '../../components/ConfirmDialog';
import './ManufacturingOrders.css';

export const ManufacturingOrders = () => {
  const [orders, setOrders] = useState<ManufacturingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'workorders' | 'materials' | 'quality' | 'costing'>('overview');
  const [products, setProducts] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [routings, setRoutings] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    product_id: '',
    product_qty: '',
    mo_type: 'make_to_stock',
    priority: 'medium',
    date_planned_start: '',
    date_planned_finished: '',
    bom_id: '',
    routing_id: '',
    origin: 'manual',
  });

  useEffect(() => {
    loadData();
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [productsData, bomsData, routingsData] = await Promise.all([
        apiService.get<any>('/products'),
        manufacturingService.getBOMs(),
        manufacturingService.getRoutings(),
      ]);
      setProducts(productsData);
      setBoms(bomsData);
      setRoutings(routingsData);
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  const handleCreateMO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await manufacturingService.createManufacturingOrder({
        ...formData,
        product_id: parseInt(formData.product_id),
        product_qty: parseFloat(formData.product_qty),
        bom_id: formData.bom_id ? parseInt(formData.bom_id) : undefined,
        routing_id: formData.routing_id ? parseInt(formData.routing_id) : undefined,
        date_planned_start: formData.date_planned_start || undefined,
        date_planned_finished: formData.date_planned_finished || undefined,
      } as any);
      await loadData();
      setShowCreateModal(false);
      setFormData({
        name: '',
        product_id: '',
        product_qty: '',
        mo_type: 'make_to_stock',
        priority: 'medium',
        date_planned_start: '',
        date_planned_finished: '',
        bom_id: '',
        routing_id: '',
        origin: 'manual',
      });
      showToast('Manufacturing order created successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create manufacturing order', 'error');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await manufacturingService.getManufacturingOrders();
      setOrders(data);
    } catch (error) {
      console.error('Failed to load manufacturing orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order: ManufacturingOrder) => {
    try {
      const fullOrder = await manufacturingService.getManufacturingOrder(order.id);
      setSelectedOrder(fullOrder);
      setShowDetailModal(true);
      
      // Check availability
      const avail = await manufacturingService.checkAvailability(order.id);
      setAvailability(avail);
    } catch (error) {
      console.error('Failed to load order details:', error);
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      await manufacturingService.confirmMO(id);
      await loadData();
      showToast('Manufacturing order confirmed successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to confirm order', 'error');
    }
  };

  const handleStart = async (id: number) => {
    try {
      await manufacturingService.startMO(id);
      await loadData();
      showToast('Production started successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to start production', 'error');
    }
  };

  const handleComplete = async (id: number) => {
    const qty = prompt('Enter quantity produced:');
    if (qty) {
      try {
        await manufacturingService.completeMO(id, parseFloat(qty));
        await loadData();
        showToast('Manufacturing order completed successfully', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.error || 'Failed to complete order', 'error');
      }
    }
  };

  const handleCancel = async (id: number) => {
    const ok = await confirmAction({
      title: 'Cancel Manufacturing Order',
      message: 'Are you sure you want to cancel this manufacturing order?',
      confirmLabel: 'Cancel Order',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await manufacturingService.cancelMO(id);
      await loadData();
      showToast('Manufacturing order cancelled successfully', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to cancel order', 'error');
    }
  };

  const handleSplit = async (id: number) => {
    const qty = prompt('Enter quantity to split:');
    if (qty) {
      try {
        await manufacturingService.splitMO(id, parseFloat(qty), 'Split by user');
        await loadData();
        showToast('Manufacturing order split successfully', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.error || 'Failed to split order', 'error');
      }
    }
  };

  const getStateIcon = (state: ManufacturingOrder['state']) => {
    switch (state) {
      case 'done':
        return <CheckCircle size={16} className="state-icon done" />;
      case 'progress':
        return <Clock size={16} className="state-icon progress" />;
      case 'confirmed':
        return <CheckCircle size={16} className="state-icon confirmed" />;
      case 'to_close':
        return <Package size={16} className="state-icon to-close" />;
      case 'cancel':
        return <XCircle size={16} className="state-icon cancel" />;
      default:
        return <Factory size={16} className="state-icon draft" />;
    }
  };

  const getStateLabel = (state: ManufacturingOrder['state']) => {
    const labels: Record<ManufacturingOrder['state'], string> = {
      draft: 'Draft',
      confirmed: 'Confirmed',
      progress: 'In Progress',
      to_close: 'To Close',
      done: 'Done',
      cancel: 'Cancelled',
    };
    return labels[state] || state;
  };

  const getStateColor = (state: ManufacturingOrder['state']) => {
    const colors: Record<ManufacturingOrder['state'], string> = {
      draft: '#64748b',
      confirmed: '#3b82f6',
      progress: '#f59e0b',
      to_close: '#8b5cf6',
      done: '#10b981',
      cancel: '#ef4444',
    };
    return colors[state] || '#64748b';
  };

  const getActionButtons = (order: ManufacturingOrder) => {
    const buttons = [];
    
    if (order.state === 'draft') {
      buttons.push(
        <button
          key="confirm"
          className="action-btn primary"
          onClick={(e) => {
            e.stopPropagation();
            handleConfirm(order.id);
          }}
          title="Confirm"
        >
          <CheckCircle size={16} />
        </button>
      );
    }

    if (order.state === 'confirmed') {
      buttons.push(
        <button
          key="start"
          className="action-btn primary"
          onClick={(e) => {
            e.stopPropagation();
            handleStart(order.id);
          }}
          title="Start Production"
        >
          <Play size={16} />
        </button>
      );
    }

    if (order.state === 'progress') {
      buttons.push(
        <button
          key="complete"
          className="action-btn success"
          onClick={(e) => {
            e.stopPropagation();
            handleComplete(order.id);
          }}
          title="Complete"
        >
          <CheckCircle size={16} />
        </button>
      );
    }

    if (order.state !== 'done' && order.state !== 'cancel') {
      buttons.push(
        <button
          key="split"
          className="action-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleSplit(order.id);
          }}
          title="Split"
        >
          <Scissors size={16} />
        </button>
      );
    }

    if (order.state !== 'done' && order.state !== 'cancel') {
      buttons.push(
        <button
          key="cancel"
          className="action-btn danger"
          onClick={(e) => {
            e.stopPropagation();
            handleCancel(order.id);
          }}
          title="Cancel"
        >
          <XCircle size={16} />
        </button>
      );
    }

    return buttons;
  };

  const filteredOrders = orders.filter((order) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      order.name?.toLowerCase().includes(searchLower) ||
      order.mo_number?.toLowerCase().includes(searchLower) ||
      order.product_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="manufacturing-orders-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading manufacturing orders..." />
        </div>
      </div>
    );
  }

  return (
    <div className="manufacturing-orders-page">
      <div className="container">
        <div className="manufacturing-header">
          <div>
            <h1>Manufacturing Orders</h1>
            <p className="manufacturing-subtitle">
              {filteredOrders.length} order(s) found
            </p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>
            New Order
          </Button>
        </div>

        <div className="manufacturing-toolbar">
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
            <div className="view-toggle">
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                List
              </button>
              <button
                className={viewMode === 'kanban' ? 'active' : ''}
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          <div className="orders-table-container">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>MO Number</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Produced</th>
                  <th>Planned Start</th>
                  <th>Planned Finish</th>
                  <th>State</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id} onClick={() => handleViewDetails(order)}>
                    <td><strong>{order.mo_number || order.name}</strong></td>
                    <td>{order.product_name || 'Unknown'}</td>
                    <td>{order.product_qty}</td>
                    <td>
                      {order.qty_produced || 0} / {order.product_qty}
                      {order.qty_produced && (
                        <span className="progress-indicator">
                          ({Math.round((order.qty_produced / order.product_qty) * 100)}%)
                        </span>
                      )}
                    </td>
                    <td>
                      {order.date_planned_start
                        ? new Date(order.date_planned_start).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      {order.date_planned_finished
                        ? new Date(order.date_planned_finished).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(order.state)}20`,
                          color: getStateColor(order.state),
                        }}
                      >
                        {getStateIcon(order.state)}
                        {getStateLabel(order.state)}
                      </span>
                    </td>
                    <td>
                      <span className={`priority-badge ${order.priority || 'medium'}`}>
                        {order.priority || 'medium'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-btn"
                          onClick={() => handleViewDetails(order)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {getActionButtons(order)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="orders-kanban">
            <div className="kanban-columns">
              {(['draft', 'confirmed', 'progress', 'to_close', 'done'] as const).map((state) => (
                <div key={state} className="kanban-column">
                  <div className="kanban-header">
                    <h3>{getStateLabel(state)}</h3>
                    <span className="kanban-count">
                      {filteredOrders.filter((o) => o.state === state).length}
                    </span>
                  </div>
                  <div className="kanban-cards">
                    {filteredOrders
                      .filter((order) => order.state === state)
                      .map((order) => (
                        <div
                          key={order.id}
                          className="kanban-card"
                          onClick={() => handleViewDetails(order)}
                        >
                          <div className="kanban-card-header">
                            <strong>{order.mo_number || order.name}</strong>
                            {getStateIcon(order.state)}
                          </div>
                          <div className="kanban-card-body">
                            <p className="kanban-product">{order.product_name}</p>
                            <p className="kanban-quantity">
                              Qty: {order.qty_produced || 0} / {order.product_qty}
                            </p>
                            <p className="kanban-date">
                              {order.date_planned_start
                                ? new Date(order.date_planned_start).toLocaleDateString()
                                : 'No date'}
                            </p>
                            {order.workorder_count && (
                              <p className="kanban-workorders">
                                Work Orders: {order.workorder_count}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showDetailModal && selectedOrder && (
          <div className="order-detail-modal" onClick={() => setShowDetailModal(false)}>
            <div className="order-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="order-detail-header">
                <div>
                  <h2>{selectedOrder.mo_number || selectedOrder.name}</h2>
                  <p className="order-subtitle">{selectedOrder.product_name}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>

              <div className="order-detail-tabs">
                <button
                  className={activeTab === 'overview' ? 'active' : ''}
                  onClick={() => setActiveTab('overview')}
                >
                  <FileText size={16} />
                  Overview
                </button>
                <button
                  className={activeTab === 'workorders' ? 'active' : ''}
                  onClick={() => setActiveTab('workorders')}
                >
                  <Factory size={16} />
                  Work Orders ({selectedOrder.work_orders?.length || 0})
                </button>
                <button
                  className={activeTab === 'materials' ? 'active' : ''}
                  onClick={() => setActiveTab('materials')}
                >
                  <Package size={16} />
                  Materials
                </button>
                <button
                  className={activeTab === 'quality' ? 'active' : ''}
                  onClick={() => setActiveTab('quality')}
                >
                  <CheckCircle size={16} />
                  Quality ({selectedOrder.quality_inspections?.length || 0})
                </button>
                <button
                  className={activeTab === 'costing' ? 'active' : ''}
                  onClick={() => setActiveTab('costing')}
                >
                  <TrendingUp size={16} />
                  Costing
                </button>
              </div>

              <div className="order-detail-body">
                {activeTab === 'overview' && (
                  <div className="order-info-section">
                    <h3>Order Information</h3>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Product:</strong> {selectedOrder.product_name || 'Unknown'}
                      </div>
                      <div className="info-item">
                        <strong>Quantity:</strong> {selectedOrder.product_qty}
                      </div>
                      <div className="info-item">
                        <strong>Produced:</strong> {selectedOrder.qty_produced || 0}
                      </div>
                      <div className="info-item">
                        <strong>Scrapped:</strong> {selectedOrder.qty_scrapped || 0}
                      </div>
                      <div className="info-item">
                        <strong>State:</strong>{' '}
                        <span
                          className="state-badge"
                          style={{
                            backgroundColor: `${getStateColor(selectedOrder.state)}20`,
                            color: getStateColor(selectedOrder.state),
                          }}
                        >
                          {getStateLabel(selectedOrder.state)}
                        </span>
                      </div>
                      <div className="info-item">
                        <strong>Priority:</strong>{' '}
                        <span className={`priority-badge ${selectedOrder.priority || 'medium'}`}>
                          {selectedOrder.priority || 'medium'}
                        </span>
                      </div>
                      <div className="info-item">
                        <strong>Planned Start:</strong>{' '}
                        {selectedOrder.date_planned_start
                          ? new Date(selectedOrder.date_planned_start).toLocaleString()
                          : '-'}
                      </div>
                      <div className="info-item">
                        <strong>Planned Finish:</strong>{' '}
                        {selectedOrder.date_planned_finished
                          ? new Date(selectedOrder.date_planned_finished).toLocaleString()
                          : '-'}
                      </div>
                      {selectedOrder.date_start && (
                        <div className="info-item">
                          <strong>Actual Start:</strong>{' '}
                          {new Date(selectedOrder.date_start).toLocaleString()}
                        </div>
                      )}
                      {selectedOrder.date_finished && (
                        <div className="info-item">
                          <strong>Actual Finish:</strong>{' '}
                          {new Date(selectedOrder.date_finished).toLocaleString()}
                        </div>
                      )}
                      {selectedOrder.user_name && (
                        <div className="info-item">
                          <strong>Responsible:</strong> {selectedOrder.user_name}
                        </div>
                      )}
                      {selectedOrder.sale_order_name && (
                        <div className="info-item">
                          <strong>Sales Order:</strong> {selectedOrder.sale_order_name}
                        </div>
                      )}
                    </div>

                    {availability && (
                      <div className="availability-section">
                        <h4>Material Availability</h4>
                        {availability.available ? (
                          <div className="availability-success">
                            <CheckCircle size={20} />
                            All materials are available
                          </div>
                        ) : (
                          <div className="availability-error">
                            <AlertCircle size={20} />
                            <div>
                              <strong>Missing Materials:</strong>
                              <ul>
                                {availability.missing_materials?.map((mat: any, idx: number) => (
                                  <li key={idx}>
                                    Product ID {mat.product_id}: Required {mat.required_qty}, Available{' '}
                                    {mat.available_qty}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="action-buttons-section">
                      {selectedOrder.state === 'draft' && (
                        <Button onClick={() => handleConfirm(selectedOrder.id)}>
                          <CheckCircle size={16} />
                          Confirm
                        </Button>
                      )}
                      {selectedOrder.state === 'confirmed' && (
                        <Button onClick={() => handleStart(selectedOrder.id)}>
                          <Play size={16} />
                          Start Production
                        </Button>
                      )}
                      {selectedOrder.state === 'progress' && (
                        <Button onClick={() => handleComplete(selectedOrder.id)}>
                          <CheckCircle size={16} />
                          Complete
                        </Button>
                      )}
                      {selectedOrder.state !== 'done' && selectedOrder.state !== 'cancel' && (
                        <>
                          <Button onClick={() => handleSplit(selectedOrder.id)}>
                            <Scissors size={16} />
                            Split
                          </Button>
                          <Button
                            variant="danger"
                            onClick={() => handleCancel(selectedOrder.id)}
                          >
                            <XCircle size={16} />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'workorders' && (
                  <div className="workorders-section">
                    <h3>Work Orders</h3>
                    {selectedOrder.work_orders && selectedOrder.work_orders.length > 0 ? (
                      <table className="workorders-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Operation</th>
                            <th>Work Center</th>
                            <th>State</th>
                            <th>Qty Produced</th>
                            <th>Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.work_orders.map((wo) => (
                            <tr key={wo.id}>
                              <td>{wo.name}</td>
                              <td>{wo.operation_name || '-'}</td>
                              <td>{wo.workcenter_name || '-'}</td>
                              <td>
                                <span className="state-badge">{wo.state}</span>
                              </td>
                              <td>{wo.qty_produced || 0}</td>
                              <td>{wo.duration ? `${wo.duration.toFixed(2)}h` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No work orders found</p>
                    )}
                  </div>
                )}

                {activeTab === 'materials' && (
                  <div className="materials-section">
                    <h3>Material Reservations</h3>
                    {selectedOrder.material_reservations &&
                    selectedOrder.material_reservations.length > 0 ? (
                      <table className="materials-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Quantity</th>
                            <th>State</th>
                            <th>Planned Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.material_reservations.map((res) => (
                            <tr key={res.id}>
                              <td>Product ID {res.product_id}</td>
                              <td>{res.product_uom_qty}</td>
                              <td>
                                <span className="state-badge">{res.state}</span>
                              </td>
                              <td>
                                {res.date_planned
                                  ? new Date(res.date_planned).toLocaleDateString()
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No material reservations found</p>
                    )}
                  </div>
                )}

                {activeTab === 'quality' && (
                  <div className="quality-section">
                    <h3>Quality Inspections</h3>
                    {selectedOrder.quality_inspections &&
                    selectedOrder.quality_inspections.length > 0 ? (
                      <div className="inspections-list">
                        {selectedOrder.quality_inspections.map((insp) => (
                          <div key={insp.id} className="inspection-card">
                            <div className="inspection-header">
                              <span className="inspection-type">{insp.inspection_type}</span>
                              <span className="state-badge">{insp.state}</span>
                            </div>
                            <div className="inspection-body">
                              <p>
                                <strong>Qty Inspected:</strong> {insp.qty_inspected || 0} /{' '}
                                {insp.qty_to_inspect || 0}
                              </p>
                              <p>
                                <strong>Passed:</strong> {insp.qty_passed || 0} |{' '}
                                <strong>Failed:</strong> {insp.qty_failed || 0}
                              </p>
                              {insp.inspector_name && (
                                <p>
                                  <strong>Inspector:</strong> {insp.inspector_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No quality inspections found</p>
                    )}
                  </div>
                )}

                {activeTab === 'costing' && (
                  <div className="costing-section">
                    <h3>Costing</h3>
                    {selectedOrder.costing && selectedOrder.costing.length > 0 ? (
                      <table className="costing-table">
                        <thead>
                          <tr>
                            <th>Cost Type</th>
                            <th>Standard Cost</th>
                            <th>Actual Cost</th>
                            <th>Variance</th>
                            <th>Variance %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOrder.costing.map((cost) => (
                            <tr key={cost.id}>
                              <td>{cost.cost_type}</td>
                              <td>${cost.standard_cost?.toFixed(2) || '0.00'}</td>
                              <td>${cost.actual_cost?.toFixed(2) || '0.00'}</td>
                              <td
                                className={
                                  (cost.variance || 0) > 0 ? 'variance-positive' : 'variance-negative'
                                }
                              >
                                ${cost.variance?.toFixed(2) || '0.00'}
                              </td>
                              <td
                                className={
                                  (cost.variance_percent || 0) > 0
                                    ? 'variance-positive'
                                    : 'variance-negative'
                                }
                              >
                                {cost.variance_percent?.toFixed(2) || '0.00'}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p>No costing data available</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="create-modal-overlay" onClick={() => setShowCreateModal(false)}>
            <div className="create-modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="create-modal-header">
                <h2>Create Manufacturing Order</h2>
                <button onClick={() => setShowCreateModal(false)}>×</button>
              </div>
              <form onSubmit={handleCreateMO} className="create-mo-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="MO-2024-000001"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Product *</label>
                    <select
                      required
                      value={formData.product_id}
                      onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.product_qty}
                      onChange={(e) => setFormData({ ...formData, product_qty: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>MO Type</label>
                    <select
                      value={formData.mo_type}
                      onChange={(e) => setFormData({ ...formData, mo_type: e.target.value as any })}
                    >
                      <option value="make_to_stock">Make to Stock</option>
                      <option value="make_to_order">Make to Order</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>BOM</label>
                    <select
                      value={formData.bom_id}
                      onChange={(e) => setFormData({ ...formData, bom_id: e.target.value })}
                    >
                      <option value="">Select BOM (Optional)</option>
                      {boms.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.code ? `(${b.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Routing</label>
                    <select
                      value={formData.routing_id}
                      onChange={(e) => setFormData({ ...formData, routing_id: e.target.value })}
                    >
                      <option value="">Select Routing (Optional)</option>
                      {routings.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} {r.code ? `(${r.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Planned Start Date</label>
                    <input
                      type="datetime-local"
                      value={formData.date_planned_start}
                      onChange={(e) => setFormData({ ...formData, date_planned_start: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Planned Finish Date</label>
                    <input
                      type="datetime-local"
                      value={formData.date_planned_finished}
                      onChange={(e) => setFormData({ ...formData, date_planned_finished: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Order</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
