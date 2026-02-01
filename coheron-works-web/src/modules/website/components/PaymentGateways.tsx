import { useState, useEffect } from 'react';
import { CreditCard, Plus, Trash2, CheckCircle, XCircle, Settings, Key } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './PaymentGateways.css';

interface PaymentGateway {
  id: string;
  name: string;
  type: 'stripe' | 'adyen' | 'payu' | 'razorpay' | 'paypal' | 'custom';
  enabled: boolean;
  test_mode: boolean;
  config: {
    api_key?: string;
    secret_key?: string;
    merchant_id?: string;
    webhook_secret?: string;
    [key: string]: any;
  };
  supported_currencies: string[];
  supported_payment_methods: string[];
  transaction_fee_percentage?: number;
  transaction_fee_fixed?: number;
  created_at?: string;
  updated_at?: string;
}

export const PaymentGateways = () => {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway | null>(null);
  const [testingGateway, setTestingGateway] = useState<string | null>(null);

  useEffect(() => {
    loadGateways();
  }, []);

  const loadGateways = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<PaymentGateway>('/website/payment-gateways');
      setGateways(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load gateways:', error);
      // Set default gateways if API fails
      setGateways([
        {
          id: 'stripe',
          name: 'Stripe',
          type: 'stripe',
          enabled: false,
          test_mode: true,
          config: {},
          supported_currencies: ['USD', 'EUR', 'INR'],
          supported_payment_methods: ['card', 'bank_transfer'],
        },
        {
          id: 'adyen',
          name: 'Adyen',
          type: 'adyen',
          enabled: false,
          test_mode: true,
          config: {},
          supported_currencies: ['USD', 'EUR', 'GBP', 'INR'],
          supported_payment_methods: ['card', 'apple_pay', 'google_pay'],
        },
        {
          id: 'payu',
          name: 'PayU',
          type: 'payu',
          enabled: false,
          test_mode: true,
          config: {},
          supported_currencies: ['INR'],
          supported_payment_methods: ['card', 'netbanking', 'upi', 'wallet'],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGateway = async (gateway: Partial<PaymentGateway>) => {
    try {
      if (gateway.id && gateways.find(g => g.id === gateway.id)) {
        await apiService.getAxiosInstance().put(`/website/payment-gateways/${gateway.id}`, gateway);
      } else {
        await apiService.create<PaymentGateway>('/website/payment-gateways', gateway);
      }
      loadGateways();
      setShowForm(false);
      setSelectedGateway(null);
    } catch (error) {
      console.error('Failed to save gateway:', error);
      showToast('Failed to save payment gateway', 'error');
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      await apiService.getAxiosInstance().patch(`/website/payment-gateways/${id}`, { enabled });
      loadGateways();
    } catch (error) {
      console.error('Failed to toggle gateway:', error);
      showToast('Failed to update gateway', 'error');
    }
  };

  const handleTestConnection = async (id: string) => {
    try {
      setTestingGateway(id);
      await apiService.getAxiosInstance().post(`/website/payment-gateways/${id}/test`);
      showToast('Connection test successful!', 'success');
    } catch (error) {
      console.error('Connection test failed:', error);
      showToast('Connection test failed. Please check your credentials.', 'error');
    } finally {
      setTestingGateway(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment gateway?')) return;
    try {
      await apiService.getAxiosInstance().delete(`/website/payment-gateways/${id}`);
      loadGateways();
    } catch (error) {
      console.error('Failed to delete gateway:', error);
      showToast('Failed to delete gateway', 'error');
    }
  };

  const getGatewayIcon = () => {
    return <CreditCard size={24} />;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="payment-gateways">
      <div className="gateways-header">
        <h2>Payment Gateways</h2>
        <Button
          size="sm"
          onClick={() => {
            setSelectedGateway(null);
            setShowForm(true);
          }}
        >
          <Plus size={16} /> Add Gateway
        </Button>
      </div>

      <div className="gateways-grid">
        {gateways.map((gateway, idx) => (
          <div key={gateway.id || (gateway as any)._id || idx} className="gateway-card">
            <div className="gateway-card-header">
              <div className="gateway-icon">
                {getGatewayIcon()}
              </div>
              <div className="gateway-info">
                <h3>{gateway.name}</h3>
                <span className="gateway-type">{gateway.type}</span>
              </div>
              <div className="gateway-status">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={gateway.enabled}
                    onChange={(e) => handleToggleEnabled(gateway.id, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                </label>
                {gateway.enabled ? (
                  <CheckCircle size={20} className="status-icon enabled" />
                ) : (
                  <XCircle size={20} className="status-icon disabled" />
                )}
              </div>
            </div>

            <div className="gateway-details">
              <div className="detail-row">
                <span className="detail-label">Test Mode:</span>
                <span className="detail-value">{gateway.test_mode ? 'Yes' : 'No'}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Currencies:</span>
                <span className="detail-value">{gateway.supported_currencies.join(', ')}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Payment Methods:</span>
                <span className="detail-value">{gateway.supported_payment_methods.join(', ')}</span>
              </div>
              {gateway.config.api_key && (
                <div className="detail-row">
                  <span className="detail-label">API Key:</span>
                  <span className="detail-value">
                    {gateway.config.api_key.substring(0, 8)}...
                    <Key size={14} />
                  </span>
                </div>
              )}
            </div>

            <div className="gateway-actions">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleTestConnection(gateway.id)}
                disabled={testingGateway === gateway.id}
              >
                {testingGateway === gateway.id ? 'Testing...' : 'Test Connection'}
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setSelectedGateway(gateway);
                  setShowForm(true);
                }}
              >
                <Settings size={16} /> Configure
              </Button>
              <button
                type="button"
                className="delete-btn"
                onClick={() => handleDelete(gateway.id)}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <GatewayForm
          gateway={selectedGateway || undefined}
          onClose={() => {
            setShowForm(false);
            setSelectedGateway(null);
          }}
          onSave={handleSaveGateway}
        />
      )}
    </div>
  );
};

// Gateway Form Component
interface GatewayFormProps {
  gateway?: PaymentGateway;
  onClose: () => void;
  onSave: (gateway: Partial<PaymentGateway>) => void;
}

const GatewayForm = ({ gateway, onClose, onSave }: GatewayFormProps) => {
  const [formData, setFormData] = useState({
    id: gateway?.id || '',
    name: gateway?.name || '',
    type: gateway?.type || 'stripe',
      enabled: gateway?.enabled ?? false,
      test_mode: gateway?.test_mode ?? true,
    api_key: gateway?.config?.api_key || '',
    secret_key: gateway?.config?.secret_key || '',
    merchant_id: gateway?.config?.merchant_id || '',
    webhook_secret: gateway?.config?.webhook_secret || '',
    transaction_fee_percentage: gateway?.transaction_fee_percentage || 0,
    transaction_fee_fixed: gateway?.transaction_fee_fixed || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: formData.id,
      name: formData.name,
      type: formData.type as any,
      enabled: formData.enabled,
      test_mode: formData.test_mode,
      config: {
        api_key: formData.api_key,
        secret_key: formData.secret_key,
        merchant_id: formData.merchant_id,
        webhook_secret: formData.webhook_secret,
      },
      transaction_fee_percentage: formData.transaction_fee_percentage,
      transaction_fee_fixed: formData.transaction_fee_fixed,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{gateway ? 'Configure Payment Gateway' : 'Add Payment Gateway'}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Gateway Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Gateway Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              required
            >
              <option value="stripe">Stripe</option>
              <option value="adyen">Adyen</option>
              <option value="payu">PayU</option>
              <option value="razorpay">Razorpay</option>
              <option value="paypal">PayPal</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>API Key *</label>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Secret Key *</label>
              <input
                type="password"
                value={formData.secret_key}
                onChange={(e) => setFormData({ ...formData, secret_key: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Merchant ID</label>
              <input
                type="text"
                value={formData.merchant_id}
                onChange={(e) => setFormData({ ...formData, merchant_id: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Webhook Secret</label>
              <input
                type="password"
                value={formData.webhook_secret}
                onChange={(e) => setFormData({ ...formData, webhook_secret: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Transaction Fee (%)</label>
              <input
                type="number"
                step="0.01"
                value={formData.transaction_fee_percentage}
                onChange={(e) => setFormData({ ...formData, transaction_fee_percentage: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="form-group">
              <label>Fixed Fee (₹)</label>
              <input
                type="number"
                step="0.01"
                value={formData.transaction_fee_fixed}
                onChange={(e) => setFormData({ ...formData, transaction_fee_fixed: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.test_mode}
                onChange={(e) => setFormData({ ...formData, test_mode: e.target.checked })}
              />
              Test Mode
            </label>
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              Enabled
            </label>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save Gateway</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

