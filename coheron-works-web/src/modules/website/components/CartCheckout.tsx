import { useState, useEffect } from 'react';
import { ShoppingCart, CreditCard, Plus, Search, DollarSign, Package } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './CartCheckout.css';

interface Cart {
  id: number;
  session_id: string;
  customer_id?: number;
  customer_name?: string;
  customer_email?: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;
  currency: string;
  state: 'active' | 'abandoned' | 'completed' | 'expired';
  created_at: string;
  updated_at: string;
  last_activity: string;
}

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  product_code: string;
  variant_id?: number;
  variant_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  tax: number;
  total: number;
}

interface CheckoutConfig {
  payment_methods: PaymentMethod[];
  shipping_methods: ShippingMethod[];
  tax_rules: TaxRule[];
  allow_guest_checkout: boolean;
  require_account: boolean;
  min_order_value?: number;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: 'stripe' | 'adyen' | 'payu' | 'cash_on_delivery' | 'bank_transfer';
  enabled: boolean;
  config: Record<string, any>;
}

interface ShippingMethod {
  id: string;
  name: string;
  carrier: 'fedex' | 'ups' | 'shiprocket' | 'custom';
  enabled: boolean;
  cost: number;
  free_shipping_threshold?: number;
  estimated_days: number;
  config: Record<string, any>;
}

interface TaxRule {
  id: number;
  name: string;
  rate: number;
  type: 'percentage' | 'fixed';
  applicable_to: 'all' | 'products' | 'shipping';
  enabled: boolean;
}

export const CartCheckout = () => {
  const [activeTab, setActiveTab] = useState<'cart' | 'checkout'>('cart');
  const [carts, setCarts] = useState<Cart[]>([]);
  const [checkoutConfig, setCheckoutConfig] = useState<CheckoutConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    state: '',
    search: '',
  });

  useEffect(() => {
    if (activeTab === 'cart') {
      loadCarts();
    } else {
      loadCheckoutConfig();
    }
  }, [activeTab, filters]);

  const loadCarts = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<Cart>('/website/carts', filters);
      setCarts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load carts:', error);
      setCarts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCheckoutConfig = async () => {
    try {
      setLoading(true);
      const data = await apiService.get<CheckoutConfig>('/website/checkout/config');
      setCheckoutConfig(Array.isArray(data) ? null : data);
    } catch (error) {
      console.error('Failed to load checkout config:', error);
      // Set default config
      setCheckoutConfig({
        payment_methods: [],
        shipping_methods: [],
        tax_rules: [],
        allow_guest_checkout: true,
        require_account: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCheckoutConfig = async () => {
    if (!checkoutConfig) return;
    try {
      await apiService.getAxiosInstance().put('/website/checkout/config', checkoutConfig);
      showToast('Checkout configuration saved successfully!', 'success');
    } catch (error) {
      console.error('Failed to save config:', error);
      showToast('Failed to save checkout configuration', 'error');
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      active: { label: 'Active', class: 'badge-green' },
      abandoned: { label: 'Abandoned', class: 'badge-yellow' },
      completed: { label: 'Completed', class: 'badge-blue' },
      expired: { label: 'Expired', class: 'badge-gray' },
    };
    return badges[state] || { label: state, class: 'badge-gray' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="cart-checkout">
      <div className="cart-checkout-header">
        <h2>Cart & Checkout</h2>
        <div className="tab-switcher">
          <button
            type="button"
            className={activeTab === 'cart' ? 'active' : ''}
            onClick={() => setActiveTab('cart')}
          >
            <ShoppingCart size={18} />
            Cart Management
          </button>
          <button
            type="button"
            className={activeTab === 'checkout' ? 'active' : ''}
            onClick={() => setActiveTab('checkout')}
          >
            <CreditCard size={18} />
            Checkout Configuration
          </button>
        </div>
      </div>

      <div className="cart-checkout-content">
        {loading ? (
          <LoadingSpinner />
        ) : activeTab === 'cart' ? (
          <div className="cart-management">
            <div className="cart-filters">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Search carts by customer, email, or session..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <select
                value={filters.state}
                onChange={(e) => setFilters({ ...filters, state: e.target.value })}
              >
                <option value="">All States</option>
                <option value="active">Active</option>
                <option value="abandoned">Abandoned</option>
                <option value="completed">Completed</option>
                <option value="expired">Expired</option>
              </select>
            </div>

            <div className="carts-table">
              <table>
                <thead>
                  <tr>
                    <th>Cart ID</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>State</th>
                    <th>Last Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {carts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="empty-state">
                        <ShoppingCart size={48} />
                        <p>No carts found</p>
                      </td>
                    </tr>
                  ) : (
                    carts.map((cart) => {
                      const badge = getStateBadge(cart.state);
                      return (
                        <tr key={cart.id}>
                          <td>#{cart.id}</td>
                          <td>
                            {cart.customer_name || cart.customer_email || `Guest (${cart.session_id.substring(0, 8)})`}
                          </td>
                          <td>{cart.items.length} items</td>
                          <td>{formatCurrency(cart.total)}</td>
                          <td>
                            <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                          </td>
                          <td>{new Date(cart.last_activity).toLocaleString()}</td>
                          <td>
                            <Button size="sm" variant="secondary">View</Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="cart-stats">
              <div className="stat-card">
                <div className="stat-icon">
                  <ShoppingCart size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{carts.filter(c => c.state === 'active').length}</div>
                  <div className="stat-label">Active Carts</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {formatCurrency(carts.filter(c => c.state === 'active').reduce((sum, c) => sum + c.total, 0))}
                  </div>
                  <div className="stat-label">Active Cart Value</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">
                  <Package size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{carts.filter(c => c.state === 'abandoned').length}</div>
                  <div className="stat-label">Abandoned Carts</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="checkout-configuration">
            {checkoutConfig && (
              <>
                <div className="config-section">
                  <h3>Payment Methods</h3>
                  <div className="payment-methods">
                    {checkoutConfig.payment_methods.length === 0 ? (
                      <p className="empty-message">No payment methods configured</p>
                    ) : (
                      checkoutConfig.payment_methods.map((method) => (
                        <div key={method.id} className="method-card">
                          <div className="method-header">
                            <input
                              type="checkbox"
                              checked={method.enabled}
                              onChange={(e) => {
                                const updated = {
                                  ...checkoutConfig,
                                  payment_methods: checkoutConfig.payment_methods.map(m =>
                                    m.id === method.id ? { ...m, enabled: e.target.checked } : m
                                  ),
                                };
                                setCheckoutConfig(updated);
                              }}
                            />
                            <span className="method-name">{method.name}</span>
                            <span className="method-type">{method.type}</span>
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const newMethod: PaymentMethod = {
                          id: `method_${Date.now()}`,
                          name: 'New Payment Method',
                          type: 'stripe',
                          enabled: false,
                          config: {},
                        };
                        setCheckoutConfig({
                          ...checkoutConfig,
                          payment_methods: [...checkoutConfig.payment_methods, newMethod],
                        });
                      }}
                    >
                      <Plus size={16} /> Add Payment Method
                    </Button>
                  </div>
                </div>

                <div className="config-section">
                  <h3>Shipping Methods</h3>
                  <div className="shipping-methods">
                    {checkoutConfig.shipping_methods.length === 0 ? (
                      <p className="empty-message">No shipping methods configured</p>
                    ) : (
                      checkoutConfig.shipping_methods.map((method) => (
                        <div key={method.id} className="method-card">
                          <div className="method-header">
                            <input
                              type="checkbox"
                              checked={method.enabled}
                              onChange={(e) => {
                                const updated = {
                                  ...checkoutConfig,
                                  shipping_methods: checkoutConfig.shipping_methods.map(m =>
                                    m.id === method.id ? { ...m, enabled: e.target.checked } : m
                                  ),
                                };
                                setCheckoutConfig(updated);
                              }}
                            />
                            <span className="method-name">{method.name}</span>
                            <span className="method-carrier">{method.carrier}</span>
                            <span className="method-cost">{formatCurrency(method.cost)}</span>
                          </div>
                        </div>
                      ))
                    )}
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        const newMethod: ShippingMethod = {
                          id: `shipping_${Date.now()}`,
                          name: 'New Shipping Method',
                          carrier: 'custom',
                          enabled: false,
                          cost: 0,
                          estimated_days: 3,
                          config: {},
                        };
                        setCheckoutConfig({
                          ...checkoutConfig,
                          shipping_methods: [...checkoutConfig.shipping_methods, newMethod],
                        });
                      }}
                    >
                      <Plus size={16} /> Add Shipping Method
                    </Button>
                  </div>
                </div>

                <div className="config-section">
                  <h3>Checkout Settings</h3>
                  <div className="settings-grid">
                    <div className="setting-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={checkoutConfig.allow_guest_checkout}
                          onChange={(e) =>
                            setCheckoutConfig({ ...checkoutConfig, allow_guest_checkout: e.target.checked })
                          }
                        />
                        Allow Guest Checkout
                      </label>
                    </div>
                    <div className="setting-item">
                      <label>
                        <input
                          type="checkbox"
                          checked={checkoutConfig.require_account}
                          onChange={(e) =>
                            setCheckoutConfig({ ...checkoutConfig, require_account: e.target.checked })
                          }
                        />
                        Require Account Creation
                      </label>
                    </div>
                    <div className="setting-item">
                      <label>
                        Minimum Order Value (₹)
                        <input
                          type="number"
                          value={checkoutConfig.min_order_value || 0}
                          onChange={(e) =>
                            setCheckoutConfig({
                              ...checkoutConfig,
                              min_order_value: parseFloat(e.target.value) || undefined,
                            })
                          }
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="config-actions">
                  <Button onClick={handleSaveCheckoutConfig}>Save Configuration</Button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
