import React, { useState, useEffect, useMemo } from 'react';
import { Check, Plus, Minus, ShoppingCart, Building2, Factory, Briefcase, Heart, GraduationCap, Hotel } from 'lucide-react';
import { Button } from '../components/Button';
import './Pricing.css';

const API = import.meta.env.VITE_API_URL || '';

interface PricingPlan {
  _id: string;
  name: string;
  slug: string;
  description: string;
  plan_type: 'tier' | 'industry' | 'addon';
  tier_level: number;
  industry?: string;
  included_modules: string[];
  max_users: number;
  storage_gb: number;
  features: string[];
  base_price_monthly: number;
  base_price_annual: number;
  per_user_price: number;
  is_featured: boolean;
  cta_label: string;
  cta_link: string;
}

interface ModulePrice {
  _id: string;
  module_name: string;
  display_name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  category: 'core' | 'advanced' | 'premium';
  icon: string;
  features: string[];
}

const INDUSTRY_ICONS: Record<string, React.ReactNode> = {
  retail: <Building2 size={28} />,
  manufacturing: <Factory size={28} />,
  services: <Briefcase size={28} />,
  healthcare: <Heart size={28} />,
  education: <GraduationCap size={28} />,
  hospitality: <Hotel size={28} />,
};

const fmt = (n: number) => n.toLocaleString('en-IN');

// Seed data used as fallback when API is unavailable
const SEED_TIERS: PricingPlan[] = [
  {
    _id: 't1', name: 'Starter', slug: 'starter', description: 'For small teams getting started',
    plan_type: 'tier', tier_level: 1, included_modules: ['crm', 'sales', 'support'],
    max_users: 5, storage_gb: 5, base_price_monthly: 2999, base_price_annual: 29990,
    per_user_price: 0, is_featured: false, cta_label: 'Start Free Trial', cta_link: '/signup?plan=starter',
    features: ['CRM, Sales & Support', 'Up to 5 users', '5 GB storage', 'Email support'],
  },
  {
    _id: 't2', name: 'Business', slug: 'business', description: 'For growing businesses',
    plan_type: 'tier', tier_level: 2, included_modules: ['crm', 'sales', 'support', 'inventory', 'accounting', 'hr', 'projects'],
    max_users: 25, storage_gb: 50, base_price_monthly: 7999, base_price_annual: 79990,
    per_user_price: 0, is_featured: true, cta_label: 'Start Free Trial', cta_link: '/signup?plan=business',
    features: ['7 core modules', 'Up to 25 users', '50 GB storage', 'Priority support', 'API access'],
  },
  {
    _id: 't3', name: 'Enterprise', slug: 'enterprise', description: 'For large organizations',
    plan_type: 'tier', tier_level: 3,
    included_modules: ['crm', 'sales', 'support', 'hr', 'manufacturing', 'inventory', 'accounting', 'marketing', 'projects', 'pos', 'website', 'esignature', 'platform', 'ai'],
    max_users: 0, storage_gb: 0, base_price_monthly: 14999, base_price_annual: 149990,
    per_user_price: 0, is_featured: false, cta_label: 'Contact Sales', cta_link: '/contact?plan=enterprise',
    features: ['All 14 modules', 'Unlimited users', 'Unlimited storage', 'Dedicated support', 'Custom integrations', 'SLA guarantee'],
  },
];

const SEED_BUNDLES: PricingPlan[] = [
  { _id: 'b1', name: 'Retail & eCommerce', slug: 'retail', description: 'Complete retail operations', plan_type: 'industry', tier_level: 0, industry: 'retail', included_modules: ['crm', 'sales', 'inventory', 'pos', 'website', 'accounting', 'marketing'], max_users: 0, storage_gb: 50, base_price_monthly: 9999, base_price_annual: 99990, per_user_price: 0, is_featured: false, cta_label: 'Get Started', cta_link: '/signup?plan=retail', features: ['POS & eCommerce', 'Inventory management', 'Marketing automation'] },
  { _id: 'b2', name: 'Manufacturing', slug: 'manufacturing', description: 'End-to-end manufacturing', plan_type: 'industry', tier_level: 0, industry: 'manufacturing', included_modules: ['crm', 'sales', 'inventory', 'manufacturing', 'accounting', 'projects', 'hr'], max_users: 0, storage_gb: 50, base_price_monthly: 11999, base_price_annual: 119990, per_user_price: 0, is_featured: false, cta_label: 'Get Started', cta_link: '/signup?plan=manufacturing', features: ['MRP & BOM', 'Quality control', 'Production planning'] },
  { _id: 'b3', name: 'Professional Services', slug: 'services', description: 'For consulting & service firms', plan_type: 'industry', tier_level: 0, industry: 'services', included_modules: ['crm', 'sales', 'projects', 'hr', 'accounting', 'support', 'esignature'], max_users: 0, storage_gb: 50, base_price_monthly: 8999, base_price_annual: 89990, per_user_price: 0, is_featured: false, cta_label: 'Get Started', cta_link: '/signup?plan=services', features: ['Project management', 'Time tracking', 'E-Signatures'] },
  { _id: 'b4', name: 'Healthcare', slug: 'healthcare', description: 'HIPAA-ready healthcare ops', plan_type: 'industry', tier_level: 0, industry: 'healthcare', included_modules: ['crm', 'hr', 'accounting', 'support', 'inventory', 'platform'], max_users: 0, storage_gb: 50, base_price_monthly: 10999, base_price_annual: 109990, per_user_price: 0, is_featured: false, cta_label: 'Get Started', cta_link: '/signup?plan=healthcare', features: ['Compliance tools', 'Patient support', 'Inventory tracking'] },
  { _id: 'b5', name: 'Education', slug: 'education', description: 'For schools & institutions', plan_type: 'industry', tier_level: 0, industry: 'education', included_modules: ['crm', 'hr', 'accounting', 'projects', 'support', 'marketing'], max_users: 0, storage_gb: 50, base_price_monthly: 6999, base_price_annual: 69990, per_user_price: 0, is_featured: false, cta_label: 'Get Started', cta_link: '/signup?plan=education', features: ['Student CRM', 'Staff management', 'Fee accounting'] },
  { _id: 'b6', name: 'Hospitality', slug: 'hospitality', description: 'Hotels, restaurants & more', plan_type: 'industry', tier_level: 0, industry: 'hospitality', included_modules: ['crm', 'sales', 'pos', 'inventory', 'hr', 'accounting', 'marketing'], max_users: 0, storage_gb: 50, base_price_monthly: 9999, base_price_annual: 99990, per_user_price: 0, is_featured: false, cta_label: 'Get Started', cta_link: '/signup?plan=hospitality', features: ['POS integration', 'Inventory control', 'Staff scheduling'] },
];

const SEED_MODULES: ModulePrice[] = [
  { _id: 'm1', module_name: 'crm', display_name: 'CRM', description: 'Pipeline, Leads, Customers', price_monthly: 999, price_annual: 9990, category: 'core', icon: 'Users', features: ['Pipeline management', 'Lead scoring', 'Customer 360'] },
  { _id: 'm2', module_name: 'sales', display_name: 'Sales', description: 'Quotations, Orders, Invoicing', price_monthly: 799, price_annual: 7990, category: 'core', icon: 'ShoppingBag', features: ['Quote builder', 'Order management', 'Invoicing'] },
  { _id: 'm3', module_name: 'inventory', display_name: 'Inventory', description: 'Stock, Warehouses, Barcode', price_monthly: 1199, price_annual: 11990, category: 'core', icon: 'Package', features: ['Multi-warehouse', 'Barcode scanning', 'Stock alerts'] },
  { _id: 'm4', module_name: 'accounting', display_name: 'Accounting', description: 'GL, AP/AR, Reports', price_monthly: 1599, price_annual: 15990, category: 'core', icon: 'Calculator', features: ['Double-entry GL', 'GST compliance', 'Financial reports'] },
  { _id: 'm5', module_name: 'hr', display_name: 'HR', description: 'Employees, Recruitment, Time Off', price_monthly: 799, price_annual: 7990, category: 'core', icon: 'UserCheck', features: ['Employee records', 'Leave management', 'Recruitment'] },
  { _id: 'm6', module_name: 'projects', display_name: 'Projects', description: 'Tasks, Timesheets, Planning', price_monthly: 1199, price_annual: 11990, category: 'advanced', icon: 'FolderKanban', features: ['Kanban boards', 'Gantt charts', 'Timesheets'] },
  { _id: 'm7', module_name: 'support', display_name: 'Support', description: 'Tickets, SLA, Help Center', price_monthly: 1499, price_annual: 14990, category: 'advanced', icon: 'LifeBuoy', features: ['Ticket management', 'SLA tracking', 'Knowledge base'] },
  { _id: 'm8', module_name: 'marketing', display_name: 'Marketing', description: 'Campaigns, Automation, Analytics', price_monthly: 1299, price_annual: 12990, category: 'advanced', icon: 'Megaphone', features: ['Email campaigns', 'Marketing automation', 'Analytics'] },
  { _id: 'm9', module_name: 'manufacturing', display_name: 'Manufacturing', description: 'BOM, MRP, Quality', price_monthly: 1999, price_annual: 19990, category: 'premium', icon: 'Factory', features: ['Bill of materials', 'Production planning', 'Quality checks'] },
  { _id: 'm10', module_name: 'pos', display_name: 'Point of Sale', description: 'Retail POS, Payments', price_monthly: 1499, price_annual: 14990, category: 'advanced', icon: 'Monitor', features: ['Touch POS', 'Payment processing', 'Receipt printing'] },
  { _id: 'm11', module_name: 'website', display_name: 'eCommerce', description: 'Online Store, Cart, Checkout', price_monthly: 1799, price_annual: 17990, category: 'premium', icon: 'Globe', features: ['Product catalog', 'Shopping cart', 'Payment gateway'] },
  { _id: 'm12', module_name: 'esignature', display_name: 'E-Signature', description: 'Digital signatures, Audit trail', price_monthly: 699, price_annual: 6990, category: 'advanced', icon: 'PenTool', features: ['Digital signing', 'Audit trail', 'Templates'] },
  { _id: 'm13', module_name: 'platform', display_name: 'Platform', description: 'No-code studio, Extensions', price_monthly: 2499, price_annual: 24990, category: 'premium', icon: 'Blocks', features: ['No-code builder', 'Custom apps', 'API access'] },
  { _id: 'm14', module_name: 'ai', display_name: 'AI Add-on', description: 'AI assistant, Smart insights', price_monthly: 1999, price_annual: 19990, category: 'premium', icon: 'Sparkles', features: ['AI assistant', 'Predictive analytics', 'Smart automation'] },
];

export const Pricing: React.FC = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [tiers, setTiers] = useState<PricingPlan[]>(SEED_TIERS);
  const [bundles, setBundles] = useState<PricingPlan[]>(SEED_BUNDLES);
  const [modules, setModules] = useState<ModulePrice[]>(SEED_MODULES);
  const [cart, setCart] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const [plansRes, modsRes] = await Promise.all([
          fetch(`${API}/pricing-plans`),
          fetch(`${API}/module-prices`),
        ]);
        if (plansRes.ok) {
          const plans: PricingPlan[] = await plansRes.json();
          const t = plans.filter(p => p.plan_type === 'tier').sort((a, b) => a.tier_level - b.tier_level);
          const b = plans.filter(p => p.plan_type === 'industry');
          if (t.length) setTiers(t);
          if (b.length) setBundles(b);
        }
        if (modsRes.ok) {
          const m: ModulePrice[] = await modsRes.json();
          if (m.length) setModules(m);
        }
      } catch {
        // use seed data
      }
    };
    load();
  }, []);

  const toggleModule = (name: string) => {
    setCart(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const cartTotal = useMemo(() => {
    return modules
      .filter(m => cart.has(m.module_name))
      .reduce((sum, m) => sum + (billing === 'annual' ? m.price_annual / 12 : m.price_monthly), 0);
  }, [cart, modules, billing]);

  const price = (monthly: number, annual: number) =>
    billing === 'annual' ? Math.round(annual / 12) : monthly;

  return (
    <div className="pricing-page">
      <div className="container">
        {/* Header */}
        <div className="pricing-header">
          <h1>Flexible pricing for every business</h1>
          <p>Choose a plan, pick an industry bundle, or build your own custom stack.</p>
          <div className="billing-toggle">
            <button
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
            >Monthly</button>
            <button
              className={billing === 'annual' ? 'active' : ''}
              onClick={() => setBilling('annual')}
            >Annual <span className="save-badge">Save 17%</span></button>
          </div>
        </div>

        {/* Section 1: Tiered Plans */}
        <section className="pricing-section">
          <h2 className="section-title">Tiered Plans</h2>
          <p className="section-subtitle">Pre-configured bundles to get you running fast</p>
          <div className="tier-grid">
            {tiers.map(plan => (
              <div key={plan._id} className={`pricing-card${plan.is_featured ? ' featured' : ''}`}>
                {plan.is_featured && <span className="badge">Most Popular</span>}
                <div className="card-header">
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>
                <div className="price">
                  <span className="currency">₹</span>
                  <span className="amount">{fmt(price(plan.base_price_monthly, plan.base_price_annual))}</span>
                  <span className="period">/mo</span>
                </div>
                {billing === 'annual' && (
                  <p className="billing-text">billed annually at ₹{fmt(plan.base_price_annual)}</p>
                )}
                <div className="plan-meta">
                  <span>{plan.max_users === 0 ? 'Unlimited' : `Up to ${plan.max_users}`} users</span>
                  <span>{plan.storage_gb === 0 ? 'Unlimited' : `${plan.storage_gb} GB`} storage</span>
                </div>
                <div className="features-list">
                  {plan.features.map((f, i) => (
                    <div key={i} className="feature-item">
                      <Check size={18} className="check-icon" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
                <div className="included-modules">
                  <span className="modules-label">{plan.included_modules.length} modules included</span>
                  <div className="module-tags">
                    {plan.included_modules.map(m => (
                      <span key={m} className="module-tag">{m}</span>
                    ))}
                  </div>
                </div>
                <a href={plan.cta_link}>
                  <Button
                    variant={plan.is_featured ? 'primary' : 'secondary'}
                    size="lg"
                    fullWidth
                  >
                    {plan.cta_label}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Section 2: Industry Bundles */}
        <section className="pricing-section">
          <h2 className="section-title">Industry Bundles</h2>
          <p className="section-subtitle">Purpose-built module combinations for your sector</p>
          <div className="bundle-grid">
            {bundles.map(plan => (
              <div key={plan._id} className="bundle-card">
                <div className="bundle-icon">
                  {INDUSTRY_ICONS[plan.industry || ''] || <Building2 size={28} />}
                </div>
                <h3>{plan.name}</h3>
                <p className="bundle-desc">{plan.description}</p>
                <div className="price">
                  <span className="currency">₹</span>
                  <span className="amount">{fmt(price(plan.base_price_monthly, plan.base_price_annual))}</span>
                  <span className="period">/mo</span>
                </div>
                <div className="bundle-modules">
                  {plan.included_modules.map(m => (
                    <span key={m} className="module-tag">{m}</span>
                  ))}
                </div>
                <ul className="bundle-features">
                  {plan.features.map((f, i) => (
                    <li key={i}><Check size={14} className="check-icon" /> {f}</li>
                  ))}
                </ul>
                <a href={plan.cta_link}>
                  <Button variant="secondary" size="md" fullWidth>{plan.cta_label}</Button>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: À La Carte */}
        <section className="pricing-section">
          <h2 className="section-title">À La Carte Modules</h2>
          <p className="section-subtitle">Pick exactly the modules you need — per user pricing</p>
          <div className="alacarte-grid">
            {modules.map(mod => {
              const selected = cart.has(mod.module_name);
              return (
                <div
                  key={mod._id}
                  className={`module-card${selected ? ' selected' : ''}`}
                  onClick={() => toggleModule(mod.module_name)}
                >
                  <div className="module-card-header">
                    <span className={`category-badge ${mod.category}`}>{mod.category}</span>
                    <button className="toggle-btn" aria-label={selected ? 'Remove' : 'Add'}>
                      {selected ? <Minus size={16} /> : <Plus size={16} />}
                    </button>
                  </div>
                  <h4>{mod.display_name}</h4>
                  <p className="module-desc">{mod.description}</p>
                  <div className="module-price">
                    ₹{fmt(price(mod.price_monthly, mod.price_annual))}<span>/user/mo</span>
                  </div>
                  <ul className="module-features">
                    {mod.features.map((f, i) => (
                      <li key={i}><Check size={12} /> {f}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 4: Custom Builder / Cart */}
        {cart.size > 0 && (
          <section className="pricing-section cart-section">
            <div className="cart-bar">
              <div className="cart-info">
                <ShoppingCart size={20} />
                <span>{cart.size} module{cart.size > 1 ? 's' : ''} selected</span>
              </div>
              <div className="cart-total">
                <span className="cart-price">₹{fmt(Math.round(cartTotal))}</span>
                <span className="cart-period">/user/mo</span>
              </div>
              <a href={`/signup?modules=${Array.from(cart).join(',')}&billing=${billing}`}>
                <Button variant="primary" size="lg">Get Custom Plan</Button>
              </a>
            </div>
          </section>
        )}

        {/* Module Pricing Table */}
        <div className="module-pricing-table">
          <h2>Module Pricing Breakdown</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Category</th>
                  <th>Price/User/Mo</th>
                  <th>Features</th>
                </tr>
              </thead>
              <tbody>
                {modules.map(mod => (
                  <tr key={mod._id}>
                    <td><strong>{mod.display_name}</strong></td>
                    <td><span className={`category-badge ${mod.category}`}>{mod.category}</span></td>
                    <td>₹{fmt(price(mod.price_monthly, mod.price_annual))}</td>
                    <td>{mod.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
