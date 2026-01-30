import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, BarChart3, ShoppingCart, Package, FileText, Users,
  FolderKanban, LifeBuoy, Factory, Megaphone, Store, Globe,
  PenTool, Shield, Layers, Zap, Server, IndianRupee,
  ChevronRight, Play, CheckCircle2,
} from 'lucide-react';
import './LandingPage.css';

import heroImage from '../assets/images/Hero Page Image.png';

const modules = [
  { name: 'CRM', icon: BarChart3, color: '#00C971', desc: 'BANT scoring, MEDDIC qualification, RFM analysis, visual pipeline, lead enrichment & engagement tracking', link: '/crm/pipeline' },
  { name: 'Sales', icon: ShoppingCart, color: '#1A6AFF', desc: 'Quotations, orders, pricing rules, contracts, delivery tracking, forecasting & team analytics', link: '/sales/orders' },
  { name: 'Inventory', icon: Package, color: '#F59E0B', desc: 'Multi-warehouse, batch & serial tracking, stock reservations, GRN, cycle counts, picking & packing', link: '/inventory/products' },
  { name: 'Manufacturing', icon: Factory, color: '#EF4444', desc: 'MRP planning, multi-level BOM, routing, work orders, quality inspections, production costing', link: '/manufacturing/orders' },
  { name: 'Accounting', icon: FileText, color: '#14B8A6', desc: 'GST returns, TDS, e-Invoice with IRN, chart of accounts, AP/AR, bank reconciliation, financial reports', link: '/accounting/invoices' },
  { name: 'HR & People', icon: Users, color: '#A855F7', desc: 'Payroll with auto TDS, attendance, leave, recruitment, appraisals, LMS, tax compliance & Form 16', link: '/hr' },
  { name: 'Projects', icon: FolderKanban, color: '#8B5CF6', desc: 'Agile sprints, timesheets, budgets, risk register, wiki, resource planning, change requests', link: '/projects' },
  { name: 'Support', icon: LifeBuoy, color: '#FF9F1A', desc: 'Ticket management, SLA policies, live chat, WhatsApp channel, knowledge base, CSAT surveys', link: '/support/tickets' },
  { name: 'Marketing', icon: Megaphone, color: '#EC4899', desc: 'Campaign management, email marketing, social campaigns, analytics & conversion tracking', link: '/marketing/campaigns' },
  { name: 'POS', icon: Store, color: '#06B6D4', desc: 'Touch-optimized terminal, shift sessions, multi-payment methods, Razorpay integration', link: '/pos' },
  { name: 'eCommerce', icon: Globe, color: '#10B981', desc: 'Product catalog, shopping cart, order processing, payment gateway, promotions & media library', link: '/website' },
  { name: 'E-Signature', icon: PenTool, color: '#004FFB', desc: 'Document templates, browser-based signing, multi-signer workflows, complete audit trail', link: '/esignature' },
  { name: 'Customer Portal', icon: Shield, color: '#FFB020', desc: 'Branded self-service portal, ticket & order tracking, knowledge base, registration workflows', link: '/portal' },
  { name: 'Platform', icon: Layers, color: '#FFFFFF', desc: 'Workflow engine, RBAC, SSO/SAML, 2FA, custom fields, integrations, dashboards & reports', link: '/settings' },
];

const features = [
  {
    icon: Zap,
    title: 'All-in-One Platform',
    subtitle: 'One price. Every module. Zero silos.',
    desc: '14 integrated modules in a single application — CRM, Sales, HR, Manufacturing, Inventory, Accounting, and more. No per-module licensing, no separate products to integrate.',
    highlights: ['Single unified database', 'Cross-module workflows', 'One login for everything', 'Per-tenant module control'],
  },
  {
    icon: IndianRupee,
    title: 'India-First Compliance',
    subtitle: 'Built for Indian businesses, from day one.',
    desc: 'Complete statutory compliance baked in — GST (GSTR-1, GSTR-3B, GSTR-9), TDS, PF/ESI, e-Invoice with IRN generation, and full tax computation with old/new regime comparison and Form 16.',
    highlights: ['GST returns & e-Invoice', 'TDS & Form 16 generation', 'PF/ESI payroll deductions', 'Old vs New tax regime'],
  },
  {
    icon: Server,
    title: 'Deploy Anywhere',
    subtitle: 'Your data. Your infrastructure. Your rules.',
    desc: 'Self-hosted via Docker on any VPS or cloud instance. Runs on as little as 512MB RAM. Perfect for regulated industries that need on-premise deployment.',
    highlights: ['Single Docker command', '512MB RAM minimum', 'MongoDB Atlas or self-hosted', 'Non-root container'],
  },
];

export const LandingPage: React.FC = () => {
  return (
    <div className="landing-page">
      {/* ===== NAVBAR ===== */}
      <nav className="landing-nav">
        <div className="container landing-nav-inner">
          <Link to="/" className="landing-logo">
            <svg width="32" height="32" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="20" cy="20" r="10" fill="none" stroke="#FFFFFF" strokeWidth="2" />
              <circle cx="20" cy="20" r="4" fill="#FFFFFF" />
            </svg>
            <span className="landing-logo-text">C<span className="green">O</span>HERON</span>
          </Link>
          <div className="landing-nav-links">
            <a href="#modules">Modules</a>
            <a href="#features">Features</a>
            <Link to="/pricing">Pricing</Link>
          </div>
          <div className="landing-nav-actions">
            <Link to="/login" className="nav-btn-ghost">Login</Link>
            <Link to="/signup" className="nav-btn-primary">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="hero">
        <div className="hero-glow hero-glow-blue" />
        <div className="hero-glow hero-glow-green" />
        <div className="container hero-grid">
          <div className="hero-content">
            <div className="hero-badge">
              <Zap size={14} />
              <span>14 Modules. One Platform. Zero Silos.</span>
            </div>
            <h1>Unifying Your Operations.<br /><span className="text-gradient-green">Amplifying Your Outcomes.</span></h1>
            <p className="hero-subtitle">
              The complete business management platform — CRM, Sales, HR, Manufacturing,
              Inventory, Accounting, Support, and more — all integrated, all included, one price.
            </p>
            <div className="hero-actions">
              <Link to="/signup" className="btn-hero-primary">
                Get Started Free <ArrowRight size={18} />
              </Link>
              <Link to="/dashboard" className="btn-hero-outline">
                <Play size={16} /> Watch Demo
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">14+</span>
                <span className="hero-stat-label">Modules</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">193</span>
                <span className="hero-stat-label">Data Models</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">100%</span>
                <span className="hero-stat-label">India Compliant</span>
              </div>
            </div>
          </div>
          <div className="hero-image">
            <div className="hero-image-wrapper">
              <img src={heroImage} alt="Coheron ERP Dashboard" className="hero-image-content" />
            </div>
          </div>
        </div>
      </section>

      {/* ===== MODULES ===== */}
      <section id="modules" className="modules-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Modules</span>
            <h2>Everything you need to run your business</h2>
            <p>A complete suite of integrated applications — no add-ons, no separate products.</p>
          </div>
          <div className="modules-grid">
            {modules.map((mod) => (
              <Link key={mod.name} to={mod.link} className="module-card">
                <div className="module-icon" style={{ background: `${mod.color}15`, color: mod.color }}>
                  <mod.icon size={24} />
                </div>
                <div className="module-info">
                  <h3>{mod.name}</h3>
                  <p>{mod.desc}</p>
                </div>
                <ChevronRight size={16} className="module-arrow" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Why Coheron</span>
            <h2>Built different. Built better.</h2>
            <p>Three principles that set Coheron apart from every other ERP.</p>
          </div>
          <div className="features-list">
            {features.map((feat, idx) => (
              <div key={idx} className={`feature-row ${idx % 2 === 1 ? 'feature-row-reverse' : ''}`}>
                <div className="feature-content">
                  <div className="feature-icon-badge">
                    <feat.icon size={20} />
                  </div>
                  <h3>{feat.title}</h3>
                  <p className="feature-subtitle">{feat.subtitle}</p>
                  <p className="feature-desc">{feat.desc}</p>
                  <ul className="feature-highlights">
                    {feat.highlights.map((h, i) => (
                      <li key={i}><CheckCircle2 size={16} /> {h}</li>
                    ))}
                  </ul>
                </div>
                <div className="feature-visual">
                  <div className="feature-visual-card">
                    <feat.icon size={48} strokeWidth={1.5} />
                    <span>{feat.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== COMPARISON ===== */}
      <section className="comparison-section">
        <div className="container">
          <div className="section-header">
            <span className="section-tag">Comparison</span>
            <h2>Replace your entire stack</h2>
            <p>Everything you're paying separately for — in one platform.</p>
          </div>
          <div className="comparison-grid">
            {[
              { label: 'CRM', them: 'Freshsales ($9-69/user/mo)', us: 'Included' },
              { label: 'Helpdesk', them: 'Freshdesk ($15-95/agent/mo)', us: 'Included' },
              { label: 'HR & Payroll', them: 'Freshteam (discontinued)', us: 'Included' },
              { label: 'Manufacturing', them: 'Not available', us: 'Included' },
              { label: 'Inventory/WMS', them: 'Not available', us: 'Included' },
              { label: 'Self-Hosted', them: 'No', us: 'Yes (Docker)' },
              { label: 'India Compliance', them: 'Add-on', us: 'Built-in' },
            ].map((row, i) => (
              <div key={i} className="comparison-row">
                <span className="comparison-label">{row.label}</span>
                <span className="comparison-them">{row.them}</span>
                <span className="comparison-us">{row.us}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="cta-section">
        <div className="container cta-inner">
          <h2>Ready to unify your operations?</h2>
          <p>Start free. No credit card required. Deploy in minutes.</p>
          <div className="cta-actions">
            <Link to="/signup" className="btn-hero-primary">
              Get Started Free <ArrowRight size={18} />
            </Link>
            <Link to="/pricing" className="btn-hero-outline">
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="landing-footer">
        <div className="container landing-footer-inner">
          <div className="landing-footer-brand">
            <svg width="24" height="24" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="16" fill="none" stroke="#6E6E6E" strokeWidth="2" />
              <circle cx="20" cy="20" r="10" fill="none" stroke="#6E6E6E" strokeWidth="2" />
              <circle cx="20" cy="20" r="4" fill="#6E6E6E" />
            </svg>
            <span>Coheron Tech</span>
          </div>
          <p className="landing-footer-copy">&copy; {new Date().getFullYear()} Coheron Tech. All rights reserved.</p>
          <div className="landing-footer-links">
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
