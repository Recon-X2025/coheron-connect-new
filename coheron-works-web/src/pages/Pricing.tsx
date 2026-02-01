import React, { useState, useEffect, useMemo } from 'react';
import { Check, Plus, Minus, ShoppingCart, IndianRupee, ArrowRight, Users, HardDrive } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import './Pricing.css';

const API = import.meta.env.VITE_API_URL || '';

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

const fmt = (n: number) => n.toLocaleString('en-IN');

/* ===== CORE MODULES ===== */

const coreModules = [
  { name: 'CRM', desc: 'Pipeline management, lead scoring, customer 360' },
  { name: 'Sales', desc: 'Quotations, orders, invoicing, pricing rules' },
  { name: 'Accounting', desc: 'Double-entry GL, AP/AR, GST/TDS, bank reconciliation' },
  { name: 'Support', desc: 'Tickets, SLA, knowledge base, CSAT' },
  { name: 'HR', desc: 'Employees, leave, attendance, payroll, appraisals' },
];

/* ===== TEAM PACKAGES ===== */

interface TeamPackage {
  name: string;
  users: number;
  priceMonthly: number;
  perUser: number;
  savings: string;
  storageGB: number;
  isFeatured: boolean;
}

const teamPackages: TeamPackage[] = [
  { name: 'Solo', users: 1, priceMonthly: 1500, perUser: 1500, savings: '', storageGB: 2, isFeatured: false },
  { name: 'Team', users: 5, priceMonthly: 7500, perUser: 1500, savings: '', storageGB: 15, isFeatured: false },
  { name: 'Growth', users: 15, priceMonthly: 20000, perUser: 1333, savings: '11% off', storageGB: 50, isFeatured: true },
  { name: 'Business', users: 30, priceMonthly: 37500, perUser: 1250, savings: '17% off', storageGB: 120, isFeatured: false },
  { name: 'Scale', users: 50, priceMonthly: 55000, perUser: 1100, savings: '27% off', storageGB: 250, isFeatured: false },
  { name: 'Enterprise', users: 100, priceMonthly: 100000, perUser: 1000, savings: '33% off', storageGB: 600, isFeatured: false },
];

/* ===== ADD-ON MODULES ===== */

const SEED_ADDONS: ModulePrice[] = [
  { _id: 'a1', module_name: 'inventory', display_name: 'Inventory', description: 'Multi-warehouse, barcode, batch/serial', price_monthly: 3999, price_annual: 39990, category: 'core', icon: 'Package', features: ['Multi-warehouse', 'Barcode scanning', 'Batch & serial tracking'] },
  { _id: 'a2', module_name: 'manufacturing', display_name: 'Manufacturing', description: 'BOM, MRP, work orders, routing, QC', price_monthly: 5999, price_annual: 59990, category: 'premium', icon: 'Factory', features: ['BOM management', 'MRP planning', 'Quality control'] },
  { _id: 'a3', module_name: 'projects', display_name: 'Projects', description: 'Kanban/Gantt, timesheets, budgets', price_monthly: 2999, price_annual: 29990, category: 'advanced', icon: 'FolderKanban', features: ['Kanban & Gantt', 'Time tracking', 'Budget management'] },
  { _id: 'a4', module_name: 'marketing', display_name: 'Marketing', description: 'Campaigns, email builder, automation', price_monthly: 2999, price_annual: 29990, category: 'advanced', icon: 'Megaphone', features: ['Email campaigns', 'Landing pages', 'Campaign analytics'] },
  { _id: 'a5', module_name: 'pos', display_name: 'POS', description: 'Touch POS, payments, receipts', price_monthly: 2499, price_annual: 24990, category: 'advanced', icon: 'Monitor', features: ['Offline mode', 'Multi-store', 'Payment integration'] },
  { _id: 'a6', module_name: 'ecommerce', display_name: 'eCommerce', description: 'Online store, catalog, checkout', price_monthly: 3999, price_annual: 39990, category: 'premium', icon: 'Globe', features: ['Product catalog', 'Shopping cart', 'Payment gateway'] },
  { _id: 'a7', module_name: 'esignature', display_name: 'E-Signature', description: 'Digital signing, audit trail', price_monthly: 1499, price_annual: 14990, category: 'core', icon: 'PenTool', features: ['Digital signing', 'Audit trail', 'Templates'] },
  { _id: 'a8', module_name: 'compliance', display_name: 'Compliance', description: 'Frameworks, policy management', price_monthly: 2499, price_annual: 24990, category: 'advanced', icon: 'ShieldCheck', features: ['Compliance frameworks', 'Policy management', 'Audit reports'] },
  { _id: 'a9', module_name: 'ai', display_name: 'AI Assistant', description: 'Predictive analytics, smart automation', price_monthly: 4999, price_annual: 49990, category: 'premium', icon: 'Sparkles', features: ['AI copilot', 'Predictive analytics', 'Smart automation'] },
  { _id: 'a10', module_name: 'platform', display_name: 'Platform Pro', description: 'No-code studio, custom apps, API access', price_monthly: 3999, price_annual: 39990, category: 'premium', icon: 'Blocks', features: ['No-code builder', 'Custom apps', 'REST API'] },
];

export const Pricing: React.FC = () => {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [addons, setAddons] = useState<ModulePrice[]>(SEED_ADDONS);
  const [cart, setCart] = useState<Set<string>>(new Set());

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/module-prices`);
        if (res.ok) {
          const m: ModulePrice[] = await res.json();
          if (m.length) setAddons(m);
        }
      } catch {
        // use seed data
      }
    };
    load();
  }, []);

  const toggleAddon = (name: string) => {
    setCart(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const cartTotal = useMemo(() => {
    return addons
      .filter(m => cart.has(m.module_name))
      .reduce((sum, m) => sum + (billing === 'annual' ? m.price_annual / 12 : m.price_monthly), 0);
  }, [cart, addons, billing]);

  const addonPrice = (m: ModulePrice) =>
    billing === 'annual' ? Math.round(m.price_annual / 12) : m.price_monthly;

  const annualMultiplier = 10; // 2 months free = 10 months

  return (
    <div className="pricing-page">
      <div className="container">
        {/* Header */}
        <div className="pricing-header">
          <h1>Simple, Transparent Pricing</h1>
          <p className="pricing-header-sub">
            <strong>5 core modules included.</strong> Add what you need. Scale as you grow.
          </p>
          <div className="pricing-hero-price">
            <IndianRupee size={28} />
            <span className="pricing-hero-amount">1,500</span>
            <span className="pricing-hero-period">/user/mo</span>
          </div>
          <p className="pricing-hero-note">All 5 core modules included in every plan</p>

          <div className="billing-toggle">
            <button
              className={billing === 'monthly' ? 'active' : ''}
              onClick={() => setBilling('monthly')}
            >Monthly</button>
            <button
              className={billing === 'annual' ? 'active' : ''}
              onClick={() => setBilling('annual')}
            >Annual <span className="save-badge">2 months free</span></button>
          </div>
        </div>

        {/* Core Modules */}
        <section className="pricing-section">
          <h2 className="section-title">Core Modules — Included in Every Plan</h2>
          <p className="section-subtitle">Everything your business needs to operate, out of the box</p>
          <div className="core-grid">
            {coreModules.map(mod => (
              <div key={mod.name} className="core-card">
                <div className="core-card-check"><Check size={18} /></div>
                <h4>{mod.name}</h4>
                <p>{mod.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Team Packages */}
        <section className="pricing-section">
          <h2 className="section-title">Team Packages — Save up to 33%</h2>
          <p className="section-subtitle">Volume discounts that grow with your team</p>
          <div className="packages-grid">
            {teamPackages.map(pkg => (
              <div key={pkg.name} className={`package-card${pkg.isFeatured ? ' featured' : ''}`}>
                {pkg.isFeatured && <span className="badge">Popular</span>}
                <h3>{pkg.name}</h3>
                <div className="package-users">
                  <Users size={16} />
                  <span>{pkg.users} user{pkg.users > 1 ? 's' : ''}</span>
                </div>
                <div className="price">
                  <span className="currency">₹</span>
                  <span className="amount">
                    {fmt(billing === 'annual' ? Math.round(pkg.priceMonthly * annualMultiplier / 12) : pkg.priceMonthly)}
                  </span>
                  <span className="period">/mo</span>
                </div>
                {billing === 'annual' && (
                  <p className="billing-text">₹{fmt(pkg.priceMonthly * annualMultiplier)}/yr</p>
                )}
                <div className="package-meta">
                  <span className="package-per-user">₹{fmt(pkg.perUser)}/user</span>
                  {pkg.savings && <span className="package-savings">{pkg.savings}</span>}
                </div>
                <div className="package-storage">
                  <HardDrive size={14} />
                  <span>{pkg.storageGB} GB storage</span>
                </div>
                <a href={`/signup?plan=${pkg.name.toLowerCase()}&billing=${billing}`}>
                  <Button
                    variant={pkg.isFeatured ? 'primary' : 'secondary'}
                    size="lg"
                    fullWidth
                  >
                    {pkg.users >= 100 ? 'Contact Sales' : 'Start Free Trial'}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Add-on Modules */}
        <section className="pricing-section">
          <h2 className="section-title">Optional Add-On Modules</h2>
          <p className="section-subtitle">Extend your platform with powerful capabilities — flat monthly fee per module</p>
          <div className="alacarte-grid">
            {addons.map(mod => {
              const selected = cart.has(mod.module_name);
              return (
                <div
                  key={mod._id}
                  className={`module-card${selected ? ' selected' : ''}`}
                  onClick={() => toggleAddon(mod.module_name)}
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
                    ₹{fmt(addonPrice(mod))}<span>/mo</span>
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

        {/* Cart */}
        {cart.size > 0 && (
          <section className="pricing-section cart-section">
            <div className="cart-bar">
              <div className="cart-info">
                <ShoppingCart size={20} />
                <span>{cart.size} add-on{cart.size > 1 ? 's' : ''} selected</span>
              </div>
              <div className="cart-total">
                <span className="cart-price">₹{fmt(Math.round(cartTotal))}</span>
                <span className="cart-period">/mo (add-ons)</span>
              </div>
              <a href={`/signup?addons=${Array.from(cart).join(',')}&billing=${billing}`}>
                <Button variant="primary" size="lg">Get Started</Button>
              </a>
            </div>
          </section>
        )}

        {/* Annual Pricing Table */}
        <section className="pricing-section">
          <div className="module-pricing-table">
            <h2>Annual Pricing — 2 Months Free</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Package</th>
                    <th>Users</th>
                    <th>Monthly</th>
                    <th>Annual</th>
                    <th>You Save</th>
                  </tr>
                </thead>
                <tbody>
                  {teamPackages.map(pkg => (
                    <tr key={pkg.name}>
                      <td><strong>{pkg.name}</strong></td>
                      <td>{pkg.users}</td>
                      <td>₹{fmt(pkg.priceMonthly)}/mo</td>
                      <td>₹{fmt(pkg.priceMonthly * annualMultiplier)}/yr</td>
                      <td className="savings-cell">₹{fmt(pkg.priceMonthly * 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Competitive Comparison */}
        <section className="pricing-section">
          <div className="module-pricing-table">
            <h2>How We Compare (15 Users)</h2>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>ERP</th>
                    <th>15 Users/mo</th>
                    <th>Core Modules</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="highlight-row">
                    <td><strong>Coheron</strong></td>
                    <td><strong>₹20,000</strong></td>
                    <td>5 (CRM, Sales, Accounting, Support, HR)</td>
                  </tr>
                  <tr>
                    <td>Zoho One</td>
                    <td>₹22,500</td>
                    <td>Limited per app</td>
                  </tr>
                  <tr>
                    <td>ERPNext Cloud</td>
                    <td>₹24,000</td>
                    <td>3–4 modules</td>
                  </tr>
                  <tr>
                    <td>Odoo Enterprise</td>
                    <td>₹30,000+</td>
                    <td>Per module pricing</td>
                  </tr>
                  <tr>
                    <td>Tally + CRM combo</td>
                    <td>₹25,000+</td>
                    <td>Fragmented</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="compare-link">
              <Link to="/compare">
                See full module-by-module comparison <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Pricing;
