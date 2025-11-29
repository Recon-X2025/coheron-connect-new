import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Tag, Settings, Search, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { salesService, type PriceList, type PricingRule } from '../../services/salesService';
import { showToast } from '../../components/Toast';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { PriceListForm } from './components/PriceListForm';
import './PricingManagement.css';

export const PricingManagement = () => {
  const [priceLists, setPriceLists] = useState<PriceList[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'price-lists' | 'rules' | 'promotions'>('price-lists');
  const [selectedPriceList, setSelectedPriceList] = useState<PriceList | null>(null);
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [showPriceListForm, setShowPriceListForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'price-lists') {
        const lists = await salesService.pricing.getPriceLists({ is_active: true });
        setPriceLists(lists);
      } else if (activeTab === 'rules') {
        const rules = await salesService.pricing.getPricingRules({ is_active: true });
        setPricingRules(rules);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePriceList = () => {
    setShowPriceListForm(true);
  };

  const handleCreateRule = async () => {
    console.log('Create rule clicked');
    setShowRuleForm(true);
  };

  const handleSaveRule = async (ruleData: Partial<PricingRule>) => {
    console.log('Save rule clicked, data:', ruleData);
    try {
      await salesService.pricing.createPricingRule(ruleData);
      await loadData();
      setShowRuleForm(false);
      showToast('Pricing rule created successfully', 'success');
    } catch (error: any) {
      console.error('Failed to create pricing rule:', error);
      showToast(error?.userMessage || error?.message || 'Failed to create pricing rule. Please try again.', 'error');
    }
  };

  const filteredPriceLists = priceLists.filter(list =>
    list.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="pricing-management">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading pricing data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="pricing-management">
      <div className="container">
        <div className="pricing-header">
          <div>
            <h1>Pricing Management</h1>
            <p className="pricing-subtitle">Manage price lists, rules, and promotions</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={handleCreatePriceList}>
            {activeTab === 'price-lists' ? 'New Price List' : activeTab === 'rules' ? 'New Rule' : 'New Promotion'}
          </Button>
        </div>

        <div className="pricing-tabs">
          <button
            className={`tab ${activeTab === 'price-lists' ? 'active' : ''}`}
            onClick={() => setActiveTab('price-lists')}
          >
            <DollarSign size={18} />
            Price Lists
          </button>
          <button
            className={`tab ${activeTab === 'rules' ? 'active' : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            <Settings size={18} />
            Pricing Rules
          </button>
          <button
            className={`tab ${activeTab === 'promotions' ? 'active' : ''}`}
            onClick={() => setActiveTab('promotions')}
          >
            <Tag size={18} />
            Promotions
          </button>
        </div>

        {activeTab === 'price-lists' && (
          <div className="pricing-content">
            <div className="search-bar">
              <Search size={20} />
              <input
                type="text"
                placeholder="Search price lists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="price-lists-grid">
              {filteredPriceLists.map((list) => (
                <div
                  key={list.id}
                  className="price-list-card"
                  onClick={() => setSelectedPriceList(list)}
                >
                  <div className="card-header">
                    <div>
                      <h3>{list.name}</h3>
                      <p className="card-subtitle">{list.currency}</p>
                    </div>
                    {list.is_default && (
                      <span className="badge default">Default</span>
                    )}
                  </div>
                  <div className="card-body">
                    <div className="card-stat">
                      <span className="stat-label">Products</span>
                      <span className="stat-value">{list.products?.length || 0}</span>
                    </div>
                    <div className="card-stat">
                      <span className="stat-label">Status</span>
                      <span className={`stat-value ${list.is_active ? 'active' : 'inactive'}`}>
                        {list.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="card-footer">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Edit price list
                      }}
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      className="icon-btn danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Delete price list
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {filteredPriceLists.length === 0 && (
              <div className="empty-state">
                <DollarSign size={48} />
                <h3>No price lists found</h3>
                <p>Create your first price list to get started</p>
                <Button onClick={handleCreatePriceList}>Create Price List</Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'rules' && (
          <div className="pricing-content">
            <div className="rules-list">
              {pricingRules.map((rule) => (
                <div key={rule.id} className="rule-card">
                  <div className="rule-header">
                    <div>
                      <h3>{rule.name}</h3>
                      <p className="rule-type">{rule.rule_type} · {rule.discount_type}</p>
                    </div>
                    <span className={`badge ${rule.is_active ? 'active' : 'inactive'}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="rule-body">
                    <div className="rule-details">
                      <div className="detail-item">
                        <span className="detail-label">Discount:</span>
                        <span className="detail-value">
                          {rule.discount_type === 'percentage'
                            ? `${rule.discount_value}%`
                            : formatInLakhsCompact(rule.discount_value)}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-label">Priority:</span>
                        <span className="detail-value">{rule.priority}</span>
                      </div>
                    </div>
                  </div>
                  <div className="rule-footer">
                    <button className="icon-btn">
                      <Edit size={16} />
                    </button>
                    <button className="icon-btn danger">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {pricingRules.length === 0 && (
              <div className="empty-state">
                <Settings size={48} />
                <h3>No pricing rules</h3>
                <p>Create pricing rules to automate discounts</p>
                <Button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Create Rule button clicked directly');
                    handleCreateRule();
                  }}
                >
                  Create Rule
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'promotions' && (
          <div className="pricing-content">
            <div className="empty-state">
              <Tag size={48} />
              <h3>Promotions coming soon</h3>
              <p>Promotional pricing management will be available here</p>
            </div>
          </div>
        )}

        {selectedPriceList && (
          <div className="modal-overlay" onClick={() => setSelectedPriceList(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{selectedPriceList.name}</h2>
                <button onClick={() => setSelectedPriceList(null)}>×</button>
              </div>
              <div className="modal-body">
                <div className="price-list-details">
                  <div className="detail-row">
                    <span className="detail-label">Currency:</span>
                    <span>{selectedPriceList.currency}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Status:</span>
                    <span>{selectedPriceList.is_active ? 'Active' : 'Inactive'}</span>
                  </div>
                  {selectedPriceList.valid_from && (
                    <div className="detail-row">
                      <span className="detail-label">Valid From:</span>
                      <span>{new Date(selectedPriceList.valid_from).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedPriceList.valid_until && (
                    <div className="detail-row">
                      <span className="detail-label">Valid Until:</span>
                      <span>{new Date(selectedPriceList.valid_until).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                {selectedPriceList.products && selectedPriceList.products.length > 0 && (
                  <div className="products-list">
                    <h3>Products ({selectedPriceList.products.length})</h3>
                    <table className="products-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Min Quantity</th>
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPriceList.products.map((product) => (
                          <tr key={product.id}>
                            <td>{product.product_name || `Product ${product.product_id}`}</td>
                            <td>{product.min_quantity}</td>
                            <td>{formatInLakhsCompact(product.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Pricing Rule Modal */}
        {showRuleForm && (
          <div className="modal-overlay" onClick={() => setShowRuleForm(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Create Pricing Rule</h2>
                <button className="modal-close" onClick={() => setShowRuleForm(false)}>
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                await handleSaveRule({
                  name: formData.get('name') as string,
                  rule_type: formData.get('rule_type') as 'volume' | 'tiered' | 'promotional' | 'contract' | 'region',
                  discount_type: formData.get('discount_type') as 'percentage' | 'fixed' | 'formula',
                  discount_value: parseFloat(formData.get('discount_value') as string),
                  is_active: true,
                  conditions: {},
                  priority: 1,
                });
              }}>
                <div className="form-group">
                  <label htmlFor="pricing-rule-name">Rule Name *</label>
                  <input 
                    type="text" 
                    id="pricing-rule-name"
                    name="name" 
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pricing-rule-type">Rule Type *</label>
                  <select 
                    id="pricing-rule-type"
                    name="rule_type" 
                    required
                  >
                    <option value="quantity">Quantity Based</option>
                    <option value="date">Date Based</option>
                    <option value="customer">Customer Based</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="pricing-discount-type">Discount Type *</label>
                  <select 
                    id="pricing-discount-type"
                    name="discount_type" 
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="pricing-discount-value">Discount Value *</label>
                  <input 
                    type="number" 
                    id="pricing-discount-value"
                    name="discount_value" 
                    step="0.01" 
                    required 
                  />
                </div>
                <div className="modal-actions">
                  <Button type="button" variant="ghost" onClick={() => setShowRuleForm(false)}>Cancel</Button>
                  <Button type="submit">Create Rule</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showPriceListForm && (
          <PriceListForm
            onClose={() => setShowPriceListForm(false)}
            onSave={() => {
              setShowPriceListForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

