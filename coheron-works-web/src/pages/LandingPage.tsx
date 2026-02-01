import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Play, Sparkles, IndianRupee, Server, Users2,
  ToggleRight, ShieldCheck, Zap, Bot,
} from 'lucide-react';
import './LandingPage.css';

/* ===== DATA ===== */

const innerOrbitModules = [
  { name: 'CRM', color: '#00C971' },
  { name: 'Sales', color: '#1A6AFF' },
  { name: 'Inventory', color: '#F59E0B' },
  { name: 'Accounting', color: '#14B8A6' },
];

const outerOrbitModules = [
  { name: 'HR & People', color: '#A855F7' },
  { name: 'Manufacturing', color: '#EF4444' },
  { name: 'Marketing', color: '#EC4899' },
  { name: 'Projects', color: '#8B5CF6' },
  { name: 'Support', color: '#FF9F1A' },
  { name: 'POS', color: '#06B6D4' },
  { name: 'eCommerce', color: '#10B981' },
  { name: 'E-Signature', color: '#004FFB' },
  { name: 'AI Copilot', color: '#7C3AED' },
  { name: 'Platform', color: '#FFFFFF' },
];

const allModules = [...innerOrbitModules, ...outerOrbitModules];

const tickerItems = [
  '2,847 invoices processed today',
  '14,392 inventory movements',
  '891 support tickets resolved',
  '3,241 CRM activities logged',
  '1,204 payroll calculations',
  '567 manufacturing orders completed',
  '2,103 e-signatures collected',
];

const comparisons = [
  { label: 'CRM', replace: 'Salesforce ($25-300/user/mo)' },
  { label: 'Helpdesk', replace: 'Freshdesk ($15-95/agent/mo)' },
  { label: 'HR & Payroll', replace: 'BambooHR ($6-8/user/mo)' },
  { label: 'Manufacturing', replace: 'SAP ($150+/user/mo)' },
  { label: 'Accounting', replace: 'QuickBooks ($30-200/mo)' },
  { label: 'eCommerce', replace: 'Shopify ($39-399/mo)' },
  { label: 'E-Signature', replace: 'DocuSign ($10-65/user/mo)' },
];

const integrations = [
  'Razorpay', 'Stripe', 'WhatsApp', 'Slack', 'Microsoft Teams',
  'Shopify', 'Tally', 'ZKTeco', 'Google Workspace', 'SMTP',
];

/* ===== HELPERS ===== */

function posOnCircle(index: number, total: number, radius: number) {
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const x = 50 + (radius / 350) * 50 * Math.cos(angle);
  const y = 50 + (radius / 350) * 50 * Math.sin(angle);
  return { left: `${x}%`, top: `${y}%` };
}

/* ===== ANIMATED COUNTER ===== */

function useCounter(end: number, duration: number, inView: boolean, suffix = '') {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const id = setInterval(() => {
      start += step;
      if (start >= end) {
        setValue(end);
        clearInterval(id);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(id);
  }, [inView, end, duration]);
  return `${value}${suffix}`;
}

/* ===== INTERSECTION OBSERVER HOOK ===== */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

/* ===== COMPONENT ===== */

export const LandingPage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroInView, setHeroInView] = useState(false);
  const [typedText, setTypedText] = useState('');
  const fullText = 'The Operating System for Modern Business';

  // Hero in-view
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setHeroInView(true); }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Typing animation
  useEffect(() => {
    if (!heroInView) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTypedText(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(id);
    }, 50);
    return () => clearInterval(id);
  }, [heroInView]);

  const modules18 = useCounter(18, 1200, heroInView, '+');
  const models200 = useCounter(200, 1400, heroInView, '+');
  const selfHost = useCounter(100, 1000, heroInView, '%');

  // Scroll reveal
  const revealRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setRevealRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    revealRefs.current[index] = el;
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('lp-visible');
        });
      },
      { threshold: 0.1 }
    );
    revealRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  // Comparison rows reveal
  const compRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setCompRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    compRefs.current[index] = el;
  }, []);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setTimeout(() => e.target.classList.add('lp-visible'), 0);
          }
        });
      },
      { threshold: 0.1 }
    );
    compRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const bentoInView = useInView(0.1);
  const compInView = useInView(0.1);
  const intInView = useInView(0.1);
  const ctaInView = useInView(0.1);

  const LogoSVG = ({ size = 28, color = '#fff' }: { size?: number; color?: string }) => (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="10" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill={color} />
    </svg>
  );

  return (
    <div className="lp">
      {/* Background layers */}
      <div className="lp-mesh-bg">
        <div className="lp-mesh-blob lp-mesh-blob--green" />
        <div className="lp-mesh-blob lp-mesh-blob--blue" />
        <div className="lp-mesh-blob lp-mesh-blob--purple" />
      </div>
      <div className="lp-grid-dots" />
      <div className="lp-particles">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="lp-particle" />
        ))}
      </div>

      {/* ===== NAVBAR ===== */}
      <nav className="lp-nav">
        <Link to="/" className="lp-nav-logo">
          <LogoSVG />
          <span className="lp-nav-logo-text">C<span className="lp-green">O</span>HERON</span>
        </Link>
        <div className="lp-nav-links">
          <a href="#platform">Platform</a>
          <a href="#modules">Modules</a>
          <Link to="/pricing">Pricing</Link>
        </div>
        <Link to="/dashboard" className="lp-nav-cta">Launch App</Link>
      </nav>

      {/* ===== HERO ===== */}
      <section className="lp-hero" ref={heroRef}>
        <div className="lp-hero-inner">
          <div className="lp-hero-shapes">
            <div className="lp-shape lp-shape--hex1" />
            <div className="lp-shape lp-shape--hex2" />
            <div className="lp-shape lp-shape--hex3" />
            <div className="lp-shape lp-shape--hex4" />
            <div className="lp-shape lp-shape--hex5" />
          </div>

          <h1 className="lp-hero-headline">
            {typedText}
            <span className="lp-typing-cursor" />
          </h1>
          <p className="lp-hero-sub">
            <strong>18 modules.</strong> One platform. Zero compromise.
          </p>

          <div className="lp-hero-actions">
            <Link to="/signup" className="lp-btn-glow">
              Start Building <ArrowRight size={18} />
            </Link>
            <Link to="/dashboard" className="lp-btn-outline">
              <Play size={16} /> Watch Demo
            </Link>
          </div>

          <div className="lp-hero-stats">
            <div className="lp-hero-stat">
              <span className="lp-hero-stat-value">{modules18}</span>
              <span className="lp-hero-stat-label">Modules</span>
            </div>
            <div className="lp-hero-stat">
              <span className="lp-hero-stat-value">{models200}</span>
              <span className="lp-hero-stat-label">Data Models</span>
            </div>
            <div className="lp-hero-stat">
              <span className="lp-hero-stat-value">{selfHost}</span>
              <span className="lp-hero-stat-label">Self-Hostable</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== MODULE CONSTELLATION ===== */}
      <section id="modules" className="lp-constellation">
        <div className="lp-container">
          <div className="lp-constellation-header lp-reveal" ref={setRevealRef(0)}>
            <span className="lp-section-tag">Platform</span>
            <h2 className="lp-section-title">The Module Constellation</h2>
            <p className="lp-section-desc">
              Every module orbits the same core -- unified data, shared workflows, one login.
            </p>
          </div>

          {/* Desktop orbit */}
          <div className="lp-orbit-container">
            <div className="lp-orbit-core">
              <LogoSVG size={32} color="#00C971" />
              <span className="lp-orbit-core-label">Core</span>
            </div>

            <div className="lp-orbit-ring lp-orbit-ring--inner">
              {innerOrbitModules.map((mod, i) => {
                const pos = posOnCircle(i, innerOrbitModules.length, 160);
                return (
                  <div key={mod.name} className="lp-orbit-node" style={{ left: pos.left, top: pos.top }}>
                    <div className="lp-orbit-node-dot" style={{ background: mod.color, color: mod.color }} />
                    <div className="lp-orbit-node-tooltip">{mod.name}</div>
                  </div>
                );
              })}
            </div>

            <div className="lp-orbit-ring lp-orbit-ring--outer">
              {outerOrbitModules.map((mod, i) => {
                const pos = posOnCircle(i, outerOrbitModules.length, 300);
                return (
                  <div key={mod.name} className="lp-orbit-node" style={{ left: pos.left, top: pos.top }}>
                    <div className="lp-orbit-node-dot" style={{ background: mod.color, color: mod.color }} />
                    <div className="lp-orbit-node-tooltip">{mod.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile grid */}
          <div className="lp-modules-grid-mobile">
            {allModules.map((mod) => (
              <div key={mod.name} className="lp-module-chip">
                <div className="lp-module-chip-dot" style={{ background: mod.color }} />
                <span className="lp-module-chip-name">{mod.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BENTO GRID ===== */}
      <section id="platform" className="lp-bento">
        <div className="lp-container">
          <div className="lp-bento-header lp-reveal" ref={setRevealRef(1)}>
            <span className="lp-section-tag">Features</span>
            <h2 className="lp-section-title">Built Different. Built Better.</h2>
            <p className="lp-section-desc">
              Enterprise capabilities without the enterprise complexity.
            </p>
          </div>

          <div className="lp-bento-grid" ref={bentoInView.ref} style={{ opacity: bentoInView.visible ? 1 : 0, transform: bentoInView.visible ? 'none' : 'translateY(30px)', transition: 'all 0.7s ease' }}>
            {/* Large */}
            <div className="lp-bento-card lp-bento-card--lg">
              <div className="lp-bento-icon lp-bento-icon--purple"><Bot size={22} /></div>
              <h3 className="lp-bento-title">AI-Powered Operations</h3>
              <p className="lp-bento-desc">
                Built-in AI copilot for auto-categorization, predictive lead scoring, smart inventory
                reordering, and natural language report generation across every module.
              </p>
            </div>
            {/* Medium */}
            <div className="lp-bento-card lp-bento-card--md">
              <div className="lp-bento-icon lp-bento-icon--green"><IndianRupee size={22} /></div>
              <h3 className="lp-bento-title">India-First Compliance</h3>
              <p className="lp-bento-desc">
                GST (GSTR-1, 3B, 9), TDS, e-Invoice with IRN, PF/ESI, Form 16. Statutory compliance built-in from day one.
              </p>
            </div>
            {/* Medium */}
            <div className="lp-bento-card lp-bento-card--md">
              <div className="lp-bento-icon lp-bento-icon--blue"><Server size={22} /></div>
              <h3 className="lp-bento-title">Deploy Anywhere</h3>
              <p className="lp-bento-desc">
                Single Docker command. Runs on 512MB RAM. Self-host on any VPS, air-gapped network, or cloud instance.
              </p>
            </div>
            {/* Small */}
            <div className="lp-bento-card lp-bento-card--sm">
              <div className="lp-bento-icon lp-bento-icon--green"><Users2 size={22} /></div>
              <h3 className="lp-bento-title">Real-time Collaboration</h3>
              <p className="lp-bento-desc">Live updates, activity feeds, and team notifications across modules.</p>
            </div>
            <div className="lp-bento-card lp-bento-card--sm">
              <div className="lp-bento-icon lp-bento-icon--blue"><ToggleRight size={22} /></div>
              <h3 className="lp-bento-title">Module Hot-Toggle</h3>
              <p className="lp-bento-desc">Enable or disable any module per tenant instantly. No restart needed.</p>
            </div>
            <div className="lp-bento-card lp-bento-card--sm">
              <div className="lp-bento-icon lp-bento-icon--purple"><ShieldCheck size={22} /></div>
              <h3 className="lp-bento-title">Enterprise Security</h3>
              <p className="lp-bento-desc">2FA, SSO/SAML, field-level encryption, RBAC, and full audit trails.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== TICKER ===== */}
      <div className="lp-ticker">
        <div className="lp-ticker-track">
          {[...tickerItems, ...tickerItems].map((item, i) => (
            <div key={i} className="lp-ticker-item">
              <span className="lp-ticker-dot" />
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* ===== COMPARISON ===== */}
      <section className="lp-comparison" ref={compInView.ref}>
        <div className="lp-container">
          <div className="lp-comparison-header lp-reveal" ref={setRevealRef(2)}>
            <span className="lp-section-tag">Replace Your Stack</span>
            <h2 className="lp-section-title">Everything. Included.</h2>
            <p className="lp-section-desc">
              Stop paying for 7 different SaaS products. Coheron replaces them all.
            </p>
          </div>

          <div className="lp-comparison-list">
            {comparisons.map((row, i) => (
              <div
                key={row.label}
                className="lp-comparison-row"
                ref={setCompRef(i)}
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="lp-comparison-label">{row.label}</span>
                <span className="lp-comparison-replace">{row.replace}</span>
                <span className="lp-comparison-badge">Included</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== INTEGRATIONS ===== */}
      <section className="lp-integrations" ref={intInView.ref}>
        <div className="lp-container">
          <div className="lp-integrations-header lp-reveal" ref={setRevealRef(3)}>
            <Zap size={18} style={{ color: '#00C971', marginBottom: 12 }} />
            <h2 className="lp-section-title">Connect Everything</h2>
            <p className="lp-section-desc">
              Pre-built integrations with the tools you already use.
            </p>
          </div>

          <div className="lp-integrations-grid" style={{ opacity: intInView.visible ? 1 : 0, transform: intInView.visible ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
            {integrations.map((name) => (
              <div key={name} className="lp-integration-badge">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== SOCIAL PROOF ===== */}
      <section className="lp-proof">
        <div className="lp-container">
          <p className="lp-proof-title">Trusted by forward-thinking businesses</p>
          <div className="lp-proof-logos">
            {['Acme Corp', 'Buildify', 'NexaWare', 'Stratton', 'Velora'].map((name) => (
              <div key={name} className="lp-proof-logo">{name}</div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA ===== */}
      <section className="lp-cta" ref={ctaInView.ref}>
        <div className="lp-cta-grid-fade" />
        <div className="lp-container lp-cta-inner">
          <Sparkles size={24} style={{ color: '#00C971', marginBottom: 16, opacity: ctaInView.visible ? 1 : 0, transition: 'opacity 0.5s' }} />
          <h2 className="lp-cta-title" style={{ opacity: ctaInView.visible ? 1 : 0, transform: ctaInView.visible ? 'none' : 'translateY(20px)', transition: 'all 0.6s ease' }}>
            Ready to run your business from a single platform?
          </h2>
          <p className="lp-cta-desc" style={{ opacity: ctaInView.visible ? 1 : 0, transition: 'opacity 0.6s ease 0.1s' }}>
            Start free. Deploy in minutes. No credit card required.
          </p>
          <div style={{ opacity: ctaInView.visible ? 1 : 0, transition: 'opacity 0.6s ease 0.2s' }}>
            <Link to="/signup" className="lp-btn-glow">
              Start Building <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <LogoSVG size={20} color="#6E6E6E" />
            <span>Coheron Tech</span>
          </div>
          <p className="lp-footer-copy">&copy; {new Date().getFullYear()} Coheron Tech. All rights reserved.</p>
          <div className="lp-footer-links">
            <Link to="/pricing">Pricing</Link>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
