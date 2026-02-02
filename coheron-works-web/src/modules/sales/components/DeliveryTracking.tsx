import React, { useState, useEffect } from 'react';
import { Truck, Package, CheckCircle, Clock, MapPin } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './DeliveryTracking.css';

interface DeliveryTrackingProps {
  order: any;
}

interface Delivery {
  id: number;
  name: string;
  scheduledDate: string;
  state: 'draft' | 'waiting' | 'confirmed' | 'assigned' | 'done' | 'cancel';
  trackingNumber?: string;
  carrier?: string;
  location?: string;
}

export const DeliveryTracking: React.FC<DeliveryTrackingProps> = ({ order }) => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveries();
  }, [order._id || order.id]);

  const loadDeliveries = async () => {
    const orderId = order._id || order.id;
    try {
      setLoading(true);
      // Fetch deliveries from API
      const pickingData = await apiService.get<any[]>(`/sales-delivery?sale_id=${orderId}`);

      // Transform to our Delivery format
      const transformed = pickingData.map((pick: any) => ({
        id: pick.id,
        name: pick.name || `Delivery ${pick.id}`,
        scheduledDate: pick.scheduled_date || new Date().toISOString(),
        state: pick.state || 'draft',
        trackingNumber: pick.carrier_tracking_ref || undefined,
        carrier: pick.carrier_id?.[1] || undefined,
        location: pick.location_id?.[1] || undefined,
      }));

      setDeliveries(transformed);
    } catch (error) {
      console.error('Failed to load deliveries:', error);
      setDeliveries([]);
    } finally {
      setLoading(false);
    }
  };

  const getStateIcon = (state: Delivery['state']) => {
    switch (state) {
      case 'done':
        return <CheckCircle size={20} className="state-icon done" />;
      case 'assigned':
      case 'confirmed':
        return <Truck size={20} className="state-icon in-transit" />;
      case 'waiting':
        return <Clock size={20} className="state-icon waiting" />;
      default:
        return <Package size={20} className="state-icon draft" />;
    }
  };

  const getStateLabel = (state: Delivery['state']) => {
    const labels: Record<Delivery['state'], string> = {
      draft: 'Draft',
      waiting: 'Waiting',
      confirmed: 'Confirmed',
      assigned: 'Assigned',
      done: 'Delivered',
      cancel: 'Cancelled',
    };
    return labels[state] || state;
  };

  const getStateColor = (state: Delivery['state']) => {
    const colors: Record<Delivery['state'], string> = {
      draft: '#64748b',
      waiting: '#f59e0b',
      confirmed: '#3b82f6',
      assigned: '#8b5cf6',
      done: '#10b981',
      cancel: '#ef4444',
    };
    return colors[state] || '#64748b';
  };

  if (loading) {
    return (
      <div className="delivery-tracking">
        <LoadingSpinner size="small" message="Loading delivery information..." />
      </div>
    );
  }

  if (deliveries.length === 0) {
    return (
      <div className="delivery-tracking">
        <div className="delivery-empty">
          <Package size={48} />
          <p>No deliveries found for this order</p>
          <p className="delivery-empty-note">
            Deliveries will appear here once the order is confirmed and processed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="delivery-tracking">
      <h4>Delivery Tracking</h4>
      <div className="delivery-list">
        {deliveries.map((delivery, idx) => (
          <div key={delivery.id || (delivery as any)._id || idx} className="delivery-item">
            <div className="delivery-header">
              <div className="delivery-info">
                {getStateIcon(delivery.state)}
                <div>
                  <strong>{delivery.name}</strong>
                  <span className="delivery-date">
                    Scheduled: {new Date(delivery.scheduledDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span
                className="delivery-state-badge"
                style={{
                  backgroundColor: `${getStateColor(delivery.state)}20`,
                  color: getStateColor(delivery.state),
                }}
              >
                {getStateLabel(delivery.state)}
              </span>
            </div>

            {(delivery.trackingNumber || delivery.carrier || delivery.location) && (
              <div className="delivery-details">
                {delivery.trackingNumber && (
                  <div className="detail-item">
                    <strong>Tracking Number:</strong>
                    <span>{delivery.trackingNumber}</span>
                  </div>
                )}
                {delivery.carrier && (
                  <div className="detail-item">
                    <strong>Carrier:</strong>
                    <span>{delivery.carrier}</span>
                  </div>
                )}
                {delivery.location && (
                  <div className="detail-item">
                    <MapPin size={16} />
                    <span>{delivery.location}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default DeliveryTracking;

