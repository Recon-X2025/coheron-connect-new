import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import './Compare.css';

/* ===== TYPES ===== */

type FeatureValue = 'full' | 'partial' | 'none' | 'addon';

interface Feature {
  name: string;
  values: Record<string, FeatureValue>;
}

interface Module {
  name: string;
  features: Feature[];
}

/* ===== DATA ===== */

const competitors = [
  { key: 'coheron', name: 'Coheron', price: '₹1,500/user/mo (5 core)' },
  { key: 'sap', name: 'SAP S/4HANA', price: '$150–300/user/mo' },
  { key: 'netsuite', name: 'Oracle NetSuite', price: '$99–999/user/mo' },
  { key: 'dynamics', name: 'MS Dynamics 365', price: '$65–210/user/mo' },
  { key: 'salesforce', name: 'Salesforce', price: '$25–300/user/mo' },
  { key: 'odoo', name: 'Odoo', price: '$24–44/user/mo' },
  { key: 'erpnext', name: 'ERPNext', price: 'Free / $50–150/mo' },
  { key: 'zoho', name: 'Zoho One', price: '$35–45/user/mo' },
];

const modules: Module[] = [
  {
    name: 'CRM',
    features: [
      { name: 'Lead scoring & AI', values: { coheron: 'full', sap: 'addon', netsuite: 'partial', dynamics: 'full', salesforce: 'full', odoo: 'partial', erpnext: 'none', zoho: 'full' } },
      { name: 'Pipeline automation', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'partial', zoho: 'full' } },
      { name: 'Territory management', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'none', erpnext: 'none', zoho: 'partial' } },
      { name: 'Email sequences', values: { coheron: 'full', sap: 'addon', netsuite: 'partial', dynamics: 'addon', salesforce: 'addon', odoo: 'partial', erpnext: 'none', zoho: 'full' } },
      { name: 'WhatsApp integration', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'addon', odoo: 'addon', erpnext: 'none', zoho: 'addon' } },
    ],
  },
  {
    name: 'Sales',
    features: [
      { name: 'Quotation builder', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'partial', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Multi-currency pricing', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'addon', odoo: 'full', erpnext: 'full', zoho: 'partial' } },
      { name: 'Approval workflows', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'partial', erpnext: 'partial', zoho: 'partial' } },
      { name: 'Recurring invoices', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
    ],
  },
  {
    name: 'Inventory',
    features: [
      { name: 'Multi-warehouse', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Barcode / QR scanning', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'partial' } },
      { name: 'Batch & serial tracking', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'partial' } },
      { name: 'AI reorder suggestions', values: { coheron: 'full', sap: 'addon', netsuite: 'partial', dynamics: 'addon', salesforce: 'none', odoo: 'none', erpnext: 'none', zoho: 'none' } },
      { name: 'Landed cost tracking', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'none' } },
    ],
  },
  {
    name: 'Accounting',
    features: [
      { name: 'Multi-company ledger', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'partial' } },
      { name: 'GST / e-Invoice (India)', values: { coheron: 'full', sap: 'full', netsuite: 'addon', dynamics: 'addon', salesforce: 'none', odoo: 'addon', erpnext: 'full', zoho: 'full' } },
      { name: 'Bank reconciliation', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Budgeting & forecasting', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'partial', erpnext: 'partial', zoho: 'partial' } },
      { name: 'TDS / PF / ESI', values: { coheron: 'full', sap: 'addon', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'addon', erpnext: 'full', zoho: 'full' } },
    ],
  },
  {
    name: 'HR',
    features: [
      { name: 'Payroll processing', values: { coheron: 'full', sap: 'full', netsuite: 'addon', dynamics: 'addon', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Leave & attendance', values: { coheron: 'full', sap: 'full', netsuite: 'partial', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Recruitment pipeline', values: { coheron: 'full', sap: 'full', netsuite: 'none', dynamics: 'addon', salesforce: 'none', odoo: 'full', erpnext: 'partial', zoho: 'full' } },
      { name: 'Biometric integration', values: { coheron: 'full', sap: 'addon', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'addon', erpnext: 'addon', zoho: 'addon' } },
      { name: 'Employee self-service', values: { coheron: 'full', sap: 'full', netsuite: 'partial', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
    ],
  },
  {
    name: 'Manufacturing',
    features: [
      { name: 'BOM management', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'partial' } },
      { name: 'Work order tracking', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'partial' } },
      { name: 'Quality control', values: { coheron: 'full', sap: 'full', netsuite: 'partial', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'none' } },
      { name: 'Shop floor scheduling', values: { coheron: 'full', sap: 'full', netsuite: 'addon', dynamics: 'full', salesforce: 'none', odoo: 'partial', erpnext: 'partial', zoho: 'none' } },
    ],
  },
  {
    name: 'Marketing',
    features: [
      { name: 'Email campaigns', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'addon', salesforce: 'addon', odoo: 'full', erpnext: 'none', zoho: 'full' } },
      { name: 'Landing page builder', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'addon', salesforce: 'addon', odoo: 'full', erpnext: 'none', zoho: 'full' } },
      { name: 'Social media management', values: { coheron: 'partial', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'addon', odoo: 'partial', erpnext: 'none', zoho: 'full' } },
      { name: 'Campaign analytics', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'addon', salesforce: 'full', odoo: 'full', erpnext: 'none', zoho: 'full' } },
    ],
  },
  {
    name: 'POS',
    features: [
      { name: 'Offline mode', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'partial', zoho: 'none' } },
      { name: 'Multi-store support', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'partial', zoho: 'none' } },
      { name: 'Payment gateway integration', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'addon', salesforce: 'none', odoo: 'full', erpnext: 'partial', zoho: 'none' } },
      { name: 'Loyalty programs', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'addon', salesforce: 'none', odoo: 'partial', erpnext: 'none', zoho: 'none' } },
    ],
  },
  {
    name: 'Support',
    features: [
      { name: 'Ticket management', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'partial', zoho: 'full' } },
      { name: 'SLA tracking', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'full', salesforce: 'full', odoo: 'partial', erpnext: 'partial', zoho: 'full' } },
      { name: 'Knowledge base', values: { coheron: 'full', sap: 'none', netsuite: 'addon', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'partial', zoho: 'full' } },
      { name: 'Customer portal', values: { coheron: 'full', sap: 'addon', netsuite: 'full', dynamics: 'full', salesforce: 'addon', odoo: 'full', erpnext: 'full', zoho: 'full' } },
    ],
  },
  {
    name: 'Projects',
    features: [
      { name: 'Gantt & Kanban views', values: { coheron: 'full', sap: 'partial', netsuite: 'partial', dynamics: 'full', salesforce: 'partial', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Time tracking', values: { coheron: 'full', sap: 'addon', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Resource allocation', values: { coheron: 'full', sap: 'full', netsuite: 'partial', dynamics: 'full', salesforce: 'none', odoo: 'partial', erpnext: 'partial', zoho: 'partial' } },
      { name: 'Budget tracking', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'none', odoo: 'partial', erpnext: 'partial', zoho: 'full' } },
    ],
  },
  {
    name: 'E-Signature',
    features: [
      { name: 'Built-in signing', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'full', erpnext: 'none', zoho: 'full' } },
      { name: 'Template library', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'full', erpnext: 'none', zoho: 'full' } },
      { name: 'Audit trail', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'full', erpnext: 'none', zoho: 'full' } },
      { name: 'Aadhaar eSign support', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'none', erpnext: 'none', zoho: 'none' } },
    ],
  },
  {
    name: 'Platform / No-Code',
    features: [
      { name: 'Custom field builder', values: { coheron: 'full', sap: 'partial', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Workflow automation', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'partial', zoho: 'full' } },
      { name: 'REST API access', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'full', zoho: 'full' } },
      { name: 'Self-hostable', values: { coheron: 'full', sap: 'none', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'full', erpnext: 'full', zoho: 'none' } },
    ],
  },
  {
    name: 'AI Add-on',
    features: [
      { name: 'AI copilot across modules', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'addon', salesforce: 'addon', odoo: 'none', erpnext: 'none', zoho: 'addon' } },
      { name: 'Natural language reports', values: { coheron: 'full', sap: 'addon', netsuite: 'none', dynamics: 'addon', salesforce: 'addon', odoo: 'none', erpnext: 'none', zoho: 'addon' } },
      { name: 'Predictive analytics', values: { coheron: 'full', sap: 'addon', netsuite: 'addon', dynamics: 'addon', salesforce: 'addon', odoo: 'none', erpnext: 'none', zoho: 'partial' } },
      { name: 'Smart categorization', values: { coheron: 'full', sap: 'addon', netsuite: 'none', dynamics: 'partial', salesforce: 'addon', odoo: 'none', erpnext: 'none', zoho: 'partial' } },
    ],
  },
  {
    name: 'Compliance',
    features: [
      { name: 'GST (GSTR-1, 3B, 9)', values: { coheron: 'full', sap: 'full', netsuite: 'addon', dynamics: 'addon', salesforce: 'none', odoo: 'addon', erpnext: 'full', zoho: 'full' } },
      { name: 'e-Invoice / e-Way Bill', values: { coheron: 'full', sap: 'full', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'addon', erpnext: 'full', zoho: 'full' } },
      { name: 'PF / ESI filing', values: { coheron: 'full', sap: 'addon', netsuite: 'none', dynamics: 'none', salesforce: 'none', odoo: 'none', erpnext: 'full', zoho: 'full' } },
      { name: 'Audit trail & RBAC', values: { coheron: 'full', sap: 'full', netsuite: 'full', dynamics: 'full', salesforce: 'full', odoo: 'full', erpnext: 'full', zoho: 'full' } },
    ],
  },
];

const symbolMap: Record<FeatureValue, { symbol: string; className: string; label: string }> = {
  full: { symbol: '\u2713', className: 'cmp-cell--full', label: 'Included' },
  partial: { symbol: '~', className: 'cmp-cell--partial', label: 'Partial' },
  none: { symbol: '\u2717', className: 'cmp-cell--none', label: 'Not available' },
  addon: { symbol: '$', className: 'cmp-cell--addon', label: 'Paid add-on' },
};

/* ===== COMPONENT ===== */

const Compare: React.FC = () => {
  const [activeModule, setActiveModule] = useState(0);
  const mod = modules[activeModule];

  const LogoSVG = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="10" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill={color} />
    </svg>
  );

  return (
    <div className="cmp">
      {/* Navbar */}
      <nav className="cmp-nav">
        <Link to="/" className="cmp-nav-logo">
          <LogoSVG />
          <span className="cmp-nav-logo-text">C<span className="cmp-green">O</span>HERON</span>
        </Link>
        <div className="cmp-nav-links">
          <Link to="/">Home</Link>
          <Link to="/pricing">Pricing</Link>
        </div>
        <Link to="/signup" className="cmp-nav-cta">Start Free Trial</Link>
      </nav>

      {/* Hero */}
      <section className="cmp-hero">
        <span className="cmp-hero-tag">Comparison</span>
        <h1 className="cmp-hero-title">How Coheron Stacks Up</h1>
        <p className="cmp-hero-sub">
          Module-by-module comparison against SAP, Oracle NetSuite, Microsoft Dynamics 365, Salesforce, Odoo, ERPNext, and Zoho.
        </p>
      </section>

      {/* Module Tabs */}
      <section className="cmp-tabs-section">
        <div className="cmp-tabs-scroll">
          <div className="cmp-tabs">
            {modules.map((m, i) => (
              <button
                key={m.name}
                className={`cmp-tab ${i === activeModule ? 'cmp-tab--active' : ''}`}
                onClick={() => setActiveModule(i)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="cmp-grid-section">
        <div className="cmp-grid-container">
          <h2 className="cmp-grid-title">{mod.name}</h2>
          <div className="cmp-table-wrapper">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th className="cmp-th-feature">Feature</th>
                  {competitors.map((c) => (
                    <th key={c.key} className={c.key === 'coheron' ? 'cmp-th--highlight' : ''}>
                      {c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mod.features.map((feat) => (
                  <tr key={feat.name}>
                    <td className="cmp-td-feature">{feat.name}</td>
                    {competitors.map((c) => {
                      const val = feat.values[c.key] || 'none';
                      const info = symbolMap[val];
                      return (
                        <td
                          key={c.key}
                          className={`cmp-td-cell ${info.className} ${c.key === 'coheron' ? 'cmp-td--highlight' : ''}`}
                          title={info.label}
                        >
                          {info.symbol}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Pricing row */}
                <tr className="cmp-pricing-row">
                  <td className="cmp-td-feature cmp-td-feature--price">Price</td>
                  {competitors.map((c) => (
                    <td key={c.key} className={`cmp-td-price ${c.key === 'coheron' ? 'cmp-td--highlight' : ''}`}>
                      {c.price}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="cmp-legend">
            <span className="cmp-legend-item"><span className="cmp-legend-sym cmp-cell--full">{'\u2713'}</span> Included</span>
            <span className="cmp-legend-item"><span className="cmp-legend-sym cmp-cell--partial">~</span> Partial</span>
            <span className="cmp-legend-item"><span className="cmp-legend-sym cmp-cell--addon">$</span> Paid add-on</span>
            <span className="cmp-legend-item"><span className="cmp-legend-sym cmp-cell--none">{'\u2717'}</span> Not available</span>
          </div>
        </div>
      </section>

      {/* Summary / Cost Section */}
      <section className="cmp-summary">
        <div className="cmp-summary-inner">
          <h2 className="cmp-summary-title">Save 60–80% vs. Piecing Together a Stack</h2>
          <p className="cmp-summary-desc">
            Instead of paying for Salesforce + SAP + Freshdesk + BambooHR + DocuSign + QuickBooks + Shopify separately,
            get everything in one platform at a fraction of the cost.
          </p>
          <div className="cmp-summary-cards">
            <div className="cmp-summary-card cmp-summary-card--stack">
              <span className="cmp-summary-card-label">Typical 7-tool stack</span>
              <span className="cmp-summary-card-price">₹25,000–80,000+<small>/mo for 15 users</small></span>
            </div>
            <div className="cmp-summary-card cmp-summary-card--coheron">
              <span className="cmp-summary-card-label">Coheron (5 core modules)</span>
              <span className="cmp-summary-card-price">₹20,000<small>/mo for 15 users</small></span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cmp-cta">
        <h2 className="cmp-cta-title">Ready to consolidate?</h2>
        <p className="cmp-cta-desc">Start free. Deploy in minutes. No credit card required.</p>
        <div className="cmp-cta-actions">
          <Link to="/signup" className="cmp-btn-glow">
            Start Free Trial <ArrowRight size={18} />
          </Link>
          <Link to="/pricing" className="cmp-btn-outline">See Pricing</Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="cmp-footer">
        <div className="cmp-footer-inner">
          <span className="cmp-footer-brand">
            <LogoSVG size={18} color="#6E6E6E" /> Coheron Tech
          </span>
          <p className="cmp-footer-copy">&copy; {new Date().getFullYear()} Coheron Tech. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Compare;
