import { useState } from 'react';
import { Check, CreditCard, Users, Package, ShieldCheck } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { showToast } from '../components/Toast';
import './Subscription.css';

const fmt = (n: number) => n.toLocaleString('en-IN');

/* ===== CORE MODULES (included in every plan) ===== */
const coreModules = ['CRM', 'Sales', 'Accounting', 'Support', 'HR'];

/* ===== TEAM PACKAGES ===== */
interface TeamPackage {
  id: string;
  name: string;
  users: number;
  priceMonthly: number;
  perUser: number;
  savings: string;
  storageGB: number;
  popular?: boolean;
}

const packages: TeamPackage[] = [
  { id: 'solo', name: 'Solo', users: 1, priceMonthly: 1500, perUser: 1500, savings: '', storageGB: 2 },
  { id: 'team', name: 'Team', users: 5, priceMonthly: 7500, perUser: 1500, savings: '', storageGB: 15 },
  { id: 'growth', name: 'Growth', users: 15, priceMonthly: 20000, perUser: 1333, savings: '11% off', storageGB: 50, popular: true },
  { id: 'business', name: 'Business', users: 30, priceMonthly: 37500, perUser: 1250, savings: '17% off', storageGB: 120 },
  { id: 'scale', name: 'Scale', users: 50, priceMonthly: 55000, perUser: 1100, savings: '27% off', storageGB: 250 },
  { id: 'enterprise', name: 'Enterprise', users: 100, priceMonthly: 100000, perUser: 1000, savings: '33% off', storageGB: 600 },
];

/* ===== ADD-ON MODULES ===== */
interface Addon {
  id: string;
  name: string;
  desc: string;
  priceMonthly: number;
}

const addons: Addon[] = [
  { id: 'inventory', name: 'Inventory', desc: 'Multi-warehouse, barcode, batch/serial', priceMonthly: 3999 },
  { id: 'manufacturing', name: 'Manufacturing', desc: 'BOM, MRP, work orders, routing, QC', priceMonthly: 5999 },
  { id: 'projects', name: 'Projects', desc: 'Kanban/Gantt, timesheets, budgets', priceMonthly: 2999 },
  { id: 'marketing', name: 'Marketing', desc: 'Campaigns, email builder, automation', priceMonthly: 2999 },
  { id: 'pos', name: 'POS', desc: 'Touch POS, payments, receipts', priceMonthly: 2499 },
  { id: 'ecommerce', name: 'eCommerce', desc: 'Online store, catalog, checkout', priceMonthly: 3999 },
  { id: 'esignature', name: 'E-Signature', desc: 'Digital signing, audit trail', priceMonthly: 1499 },
  { id: 'compliance', name: 'Compliance', desc: 'Frameworks, policy management', priceMonthly: 2499 },
  { id: 'ai', name: 'AI Assistant', desc: 'Predictive analytics, smart automation', priceMonthly: 4999 },
  { id: 'platform', name: 'Platform Pro', desc: 'No-code studio, custom apps, API', priceMonthly: 3999 },
];

export const Subscription: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string>('growth');
  const [selectedAddons, setSelectedAddons] = useState<Set<string>>(new Set());
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');

  const pkg = packages.find(p => p.id === selectedPackage)!;
  const addonTotal = addons.filter(a => selectedAddons.has(a.id)).reduce((s, a) => s + a.priceMonthly, 0);
  const monthlyTotal = pkg.priceMonthly + addonTotal;
  const annualMonthly = Math.round(monthlyTotal * 10 / 12);
  const displayTotal = billing === 'annual' ? annualMonthly : monthlyTotal;

  const toggleAddon = (id: string) => {
    setSelectedAddons(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubscribe = async () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast(`Subscribed to ${pkg.name} plan (${billing})!`, 'success');
    }, 1500);
  };

  return (
    <div className="subscription-page">
      <div className="container">
        <div className="subscription-header">
          <h1>Subscribe to Coheron</h1>
          <p className="subscription-subtitle">
            5 core modules included in every plan &middot; Add only what you need
          </p>
          <p className="subscription-base-price">
            Starting at <strong>₹1,500</strong>/user/month
          </p>
        </div>

        {/* Billing Toggle */}
        <div className="billing-toggle">
          <button className={billing === 'monthly' ? 'active' : ''} onClick={() => setBilling('monthly')}>
            Monthly
          </button>
          <button className={billing === 'annual' ? 'active' : ''} onClick={() => setBilling('annual')}>
            Annual <span className="discount-badge">2 months free</span>
          </button>
        </div>

        {/* Core Modules */}
        <div className="sub-section">
          <h2 className="sub-section-title">
            <ShieldCheck size={20} /> Core Modules — Included in All Plans
          </h2>
          <div className="core-chips">
            {coreModules.map(m => (
              <span key={m} className="core-chip"><Check size={14} /> {m}</span>
            ))}
          </div>
        </div>

        {/* Team Package Selection */}
        <div className="sub-section">
          <h2 className="sub-section-title">
            <Users size={20} /> Choose Your Team Package
          </h2>
          <div className="packages-grid">
            {packages.map(p => (
              <div
                key={p.id}
                className={`package-card ${selectedPackage === p.id ? 'selected' : ''} ${p.popular ? 'popular' : ''}`}
                onClick={() => setSelectedPackage(p.id)}
              >
                {p.popular && <div className="popular-badge">Most Popular</div>}
                <h3>{p.name}</h3>
                <div className="package-users">{p.users} user{p.users > 1 ? 's' : ''}</div>
                <div className="package-price">
                  <span className="price">₹{fmt(billing === 'annual' ? Math.round(p.priceMonthly * 10 / 12) : p.priceMonthly)}</span>
                  <span className="interval">/mo</span>
                </div>
                <div className="package-per-user">₹{fmt(p.perUser)}/user/mo</div>
                {p.savings && <span className="package-savings">{p.savings}</span>}
                <div className="package-storage">{p.storageGB} GB storage</div>
              </div>
            ))}
          </div>
        </div>

        {/* Add-on Modules */}
        <div className="sub-section">
          <h2 className="sub-section-title">
            <Package size={20} /> Optional Add-on Modules
          </h2>
          <div className="addons-grid">
            {addons.map(a => (
              <div
                key={a.id}
                className={`addon-card ${selectedAddons.has(a.id) ? 'selected' : ''}`}
                onClick={() => toggleAddon(a.id)}
              >
                <div className="addon-check">
                  {selectedAddons.has(a.id) ? <Check size={18} /> : <span className="addon-empty-check" />}
                </div>
                <div className="addon-info">
                  <h4>{a.name}</h4>
                  <p>{a.desc}</p>
                </div>
                <div className="addon-price">
                  ₹{fmt(billing === 'annual' ? Math.round(a.priceMonthly * 10 / 12) : a.priceMonthly)}/mo
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Summary & Subscribe */}
        <Card className="sub-summary">
          <h2>Order Summary</h2>
          <div className="summary-rows">
            <div className="summary-row">
              <span>{pkg.name} Package ({pkg.users} users, {billing})</span>
              <span>₹{fmt(billing === 'annual' ? Math.round(pkg.priceMonthly * 10 / 12) : pkg.priceMonthly)}/mo</span>
            </div>
            {addons.filter(a => selectedAddons.has(a.id)).map(a => (
              <div key={a.id} className="summary-row addon-row">
                <span>+ {a.name}</span>
                <span>₹{fmt(billing === 'annual' ? Math.round(a.priceMonthly * 10 / 12) : a.priceMonthly)}/mo</span>
              </div>
            ))}
            <div className="summary-row total-row">
              <span>Total</span>
              <span>₹{fmt(displayTotal)}/mo</span>
            </div>
            {billing === 'annual' && (
              <div className="summary-row savings-row">
                <span>Annual savings</span>
                <span>₹{fmt((monthlyTotal - annualMonthly) * 12)}/year</span>
              </div>
            )}
          </div>
          <Button className="subscribe-btn" onClick={handleSubscribe} disabled={loading}>
            {loading ? (
              <><LoadingSpinner size="small" /> Processing...</>
            ) : (
              <><CreditCard size={18} /> Subscribe — ₹{fmt(displayTotal)}/mo</>
            )}
          </Button>
        </Card>

        <div className="subscription-info">
          <Card className="info-card">
            <h3>All plans include:</h3>
            <ul>
              <li>✓ 5 core modules (CRM, Sales, Accounting, Support, HR)</li>
              <li>✓ Secure cloud hosting</li>
              <li>✓ Regular updates & new features</li>
              <li>✓ Mobile app access</li>
              <li>✓ Data backup & recovery</li>
              <li>✓ 99.9% uptime SLA</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
