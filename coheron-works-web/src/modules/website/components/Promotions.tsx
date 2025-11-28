import { useState, useEffect } from 'react';
import { Plus, Tag, Calendar } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './Promotions.css';

interface Promotion {
  id: number;
  name: string;
  code: string;
  discount_type: string;
  discount_value: number;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  usage_count: number;
  usage_limit?: number;
}

export const Promotions = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/website/promotions');
      if (response.ok) {
        const data = await response.json();
        setPromotions(data);
      }
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading promotions..." />;
  }

  return (
    <div className="promotions">
      <div className="promotions-header">
        <h2>Promotions & Coupons</h2>
        <Button icon={<Plus size={18} />}>Create Promotion</Button>
      </div>

      <div className="promotions-grid">
        {promotions.length === 0 ? (
          <div className="empty-promotions">
            <Tag size={48} />
            <p>No promotions created yet</p>
            <Button icon={<Plus size={18} />}>Create Your First Promotion</Button>
          </div>
        ) : (
          promotions.map((promo) => (
            <div key={promo.id} className="promotion-card">
              <div className="promotion-header">
                <Tag size={24} />
                <span className={`status-badge ${promo.is_active ? 'active' : 'inactive'}`}>
                  {promo.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3>{promo.name}</h3>
              <p className="promotion-code">Code: <strong>{promo.code}</strong></p>
              <p className="promotion-discount">
                {promo.discount_type === 'percentage'
                  ? `${promo.discount_value}% off`
                  : `$${promo.discount_value} off`}
              </p>
              <div className="promotion-dates">
                <Calendar size={16} />
                <span>
                  {new Date(promo.valid_from).toLocaleDateString()} -{' '}
                  {new Date(promo.valid_until).toLocaleDateString()}
                </span>
              </div>
              <div className="promotion-usage">
                Used: {promo.usage_count}
                {promo.usage_limit && ` / ${promo.usage_limit}`}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

