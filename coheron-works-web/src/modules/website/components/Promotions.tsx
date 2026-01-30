import { useState, useEffect } from 'react';
import { Plus, Tag, Calendar, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { salesService } from '../../../services/salesService';
import { PromotionForm } from './PromotionForm';
import { showToast } from '../../../components/Toast';
import { confirmAction } from '../../../components/ConfirmDialog';
import './Promotions.css';

interface Promotion {
  id: number;
  name: string;
  code: string;
  discount_type: 'fixed' | 'percentage';
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
  const [showPromotionForm, setShowPromotionForm] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const data = await salesService.pricing.getPromotions();
      setPromotions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading promotions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNewPromotion = () => {
    setEditingPromotion(null);
    setShowPromotionForm(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setEditingPromotion(promotion);
    setShowPromotionForm(true);
  };

  const handleDeletePromotion = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Promotion',
      message: 'Are you sure you want to delete this promotion?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await salesService.pricing.deletePromotion(id);
      showToast('Promotion deleted successfully', 'success');
      loadPromotions();
    } catch (error: any) {
      console.error('Failed to delete promotion:', error);
      showToast(error?.message || 'Failed to delete promotion. Please try again.', 'error');
    }
  };

  const handlePromotionSaved = () => {
    loadPromotions();
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading promotions..." />;
  }

  return (
    <div className="promotions">
      <div className="promotions-header">
        <h2>Promotions & Coupons</h2>
        <Button icon={<Plus size={18} />} onClick={handleNewPromotion}>Create Promotion</Button>
      </div>

      <div className="promotions-grid">
        {promotions.length === 0 ? (
          <div className="empty-promotions">
            <Tag size={48} />
            <p>No promotions created yet</p>
            <Button icon={<Plus size={18} />} onClick={handleNewPromotion}>Create Your First Promotion</Button>
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
              <div className="promotion-actions">
                <button
                  type="button"
                  className="action-btn"
                  title="Edit Promotion"
                  onClick={() => handleEditPromotion(promo)}
                >
                  <Edit size={16} />
                </button>
                <button
                  type="button"
                  className="action-btn delete"
                  title="Delete Promotion"
                  onClick={() => handleDeletePromotion(promo.id)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showPromotionForm && (
        <PromotionForm
          promotion={editingPromotion || undefined}
          onClose={() => {
            setShowPromotionForm(false);
            setEditingPromotion(null);
          }}
          onSave={handlePromotionSaved}
        />
      )}
    </div>
  );
};

