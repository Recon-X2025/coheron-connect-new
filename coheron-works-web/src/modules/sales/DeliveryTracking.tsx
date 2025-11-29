import { useState, useEffect } from 'react';
import { Package, Truck, MapPin, Clock, CheckCircle, Search, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type DeliveryOrder } from '../../services/salesService';
import { DeliveryOrderForm } from './components/DeliveryOrderForm';
import './DeliveryTracking.css';

export const DeliveryTracking = () => {
  const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryOrder | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeliveryForm, setShowDeliveryForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await salesService.delivery.getDeliveryOrders(
        statusFilter !== 'all' ? { status: statusFilter } : {}
      );
      setDeliveries(data);
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={16} className="status-icon delivered" />;
      case 'in_transit': return <Truck size={16} className="status-icon in-transit" />;
      case 'ready': return <Package size={16} className="status-icon ready" />;
      default: return <Clock size={16} className="status-icon draft" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return '#10b981';
      case 'in_transit': return '#3b82f6';
      case 'ready': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#64748b';
    }
  };

  const filteredDeliveries = deliveries.filter(delivery =>
    delivery.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (delivery.sale_order_id?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="delivery-tracking">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading deliveries..." />
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-tracking">
      <div className="container">
        <div className="delivery-header">
          <div>
            <h1>Delivery Tracking</h1>
            <p className="delivery-subtitle">Track shipments and deliveries</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowDeliveryForm(true)}>New Delivery Order</Button>
        </div>

        <div className="delivery-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search deliveries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="in_transit">In Transit</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="deliveries-list">
          {filteredDeliveries.map((delivery) => (
            <div
              key={delivery.id}
              className="delivery-card"
              onClick={() => setSelectedDelivery(delivery)}
            >
              <div className="delivery-header-card">
                <div className="delivery-info">
                  <h3>{delivery.delivery_number}</h3>
                  <p className="sale-order-ref">{delivery.sale_order_id || 'N/A'}</p>
                </div>
                <span
                  className="status-badge"
                  style={{ color: getStatusColor(delivery.status) }}
                >
                  {getStatusIcon(delivery.status)}
                  {delivery.status.replace('_', ' ')}
                </span>
              </div>
              <div className="delivery-details">
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{delivery.delivery_address || 'Address not set'}</span>
                </div>
                <div className="detail-item">
                  <Clock size={16} />
                  <span>Delivery Date: {new Date(delivery.delivery_date).toLocaleDateString()}</span>
                </div>
                {delivery.tracking_number && (
                  <div className="detail-item">
                    <Truck size={16} />
                    <span>Tracking: {delivery.tracking_number}</span>
                  </div>
                )}
                {delivery.carrier_name && (
                  <div className="detail-item">
                    <span>Carrier: {delivery.carrier_name}</span>
                  </div>
                )}
              </div>
              {delivery.delivery_lines && delivery.delivery_lines.length > 0 && (
                <div className="delivery-lines-summary">
                  <span>{delivery.delivery_lines.length} item(s)</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {selectedDelivery && (
          <div className="modal-overlay" onClick={() => setSelectedDelivery(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedDelivery.delivery_number}</h2>
                <button onClick={() => setSelectedDelivery(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="delivery-details-full">
                  <div className="detail-section">
                    <h3>Delivery Information</h3>
                    <div className="detail-grid">
                      <div className="detail-item">
                        <span className="label">Status:</span>
                        <span>{selectedDelivery.status}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Delivery Date:</span>
                        <span>{new Date(selectedDelivery.delivery_date).toLocaleDateString()}</span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Method:</span>
                        <span>{selectedDelivery.delivery_method || 'Standard'}</span>
                      </div>
                      {selectedDelivery.tracking_number && (
                        <div className="detail-item">
                          <span className="label">Tracking Number:</span>
                          <span>{selectedDelivery.tracking_number}</span>
                        </div>
                      )}
                      {selectedDelivery.carrier_name && (
                        <div className="detail-item">
                          <span className="label">Carrier:</span>
                          <span>{selectedDelivery.carrier_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedDelivery.delivery_lines && selectedDelivery.delivery_lines.length > 0 && (
                    <div className="detail-section">
                      <h3>Delivery Items</h3>
                      <table className="delivery-lines-table">
                        <thead>
                          <tr>
                            <th>Product</th>
                            <th>Ordered</th>
                            <th>Delivered</th>
                            <th>Pending</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDelivery.delivery_lines.map((line) => (
                            <tr key={line.id}>
                              <td>{line.product_name || `Product ${line.product_id}`}</td>
                              <td>{line.quantity_ordered}</td>
                              <td>{line.quantity_delivered}</td>
                              <td>{line.quantity_pending}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedDelivery.tracking && selectedDelivery.tracking.length > 0 && (
                    <div className="detail-section">
                      <h3>Tracking History</h3>
                      <div className="tracking-timeline">
                        {selectedDelivery.tracking.map((event) => (
                          <div key={event.id} className="tracking-event">
                            <div className="event-dot" />
                            <div className="event-content">
                              <div className="event-header">
                                <span className="event-name">{event.tracking_event}</span>
                                <span className="event-date">
                                  {new Date(event.event_date).toLocaleString()}
                                </span>
                              </div>
                              {event.location && (
                                <div className="event-location">
                                  <MapPin size={14} />
                                  {event.location}
                                </div>
                              )}
                              {event.notes && (
                                <div className="event-notes">{event.notes}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeliveryForm && (
          <DeliveryOrderForm
            onClose={() => setShowDeliveryForm(false)}
            onSave={() => {
              setShowDeliveryForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

