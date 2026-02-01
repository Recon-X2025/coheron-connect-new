import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Users, ShoppingCart, Package, FileText, Briefcase, Megaphone, Factory, Headphones, DollarSign, LayoutDashboard, ArrowRight } from 'lucide-react';
import './GlobalSearch.css';

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  module: string;
  path: string;
  icon: React.ReactNode;
}

const MODULE_ROUTES: { label: string; icon: React.ReactNode; path: string; keywords: string[] }[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={16} />, path: '/dashboard', keywords: ['home', 'overview'] },
  { label: 'CRM Dashboard', icon: <Users size={16} />, path: '/crm/dashboard', keywords: ['crm', 'customers', 'leads'] },
  { label: 'Leads', icon: <Users size={16} />, path: '/crm/leads', keywords: ['lead', 'prospect'] },
  { label: 'Customers', icon: <Users size={16} />, path: '/crm/customers', keywords: ['customer', 'client', 'contact'] },
  { label: 'Pipeline', icon: <Users size={16} />, path: '/crm/pipeline', keywords: ['pipeline', 'deal', 'opportunity'] },
  { label: 'Opportunities', icon: <Users size={16} />, path: '/crm/opportunities', keywords: ['opportunity'] },
  { label: 'Sales Dashboard', icon: <ShoppingCart size={16} />, path: '/sales/dashboard', keywords: ['sales', 'revenue'] },
  { label: 'Sales Orders', icon: <ShoppingCart size={16} />, path: '/sales/orders', keywords: ['order', 'sale'] },
  { label: 'Quotations', icon: <ShoppingCart size={16} />, path: '/sales/quotations', keywords: ['quote', 'quotation', 'proposal'] },
  { label: 'Pricing', icon: <ShoppingCart size={16} />, path: '/sales/pricing', keywords: ['price', 'discount'] },
  { label: 'Contracts', icon: <ShoppingCart size={16} />, path: '/sales/contracts', keywords: ['contract', 'agreement'] },
  { label: 'Delivery', icon: <ShoppingCart size={16} />, path: '/sales/delivery', keywords: ['delivery', 'shipping'] },
  { label: 'Invoices', icon: <DollarSign size={16} />, path: '/accounting/invoices', keywords: ['invoice', 'billing'] },
  { label: 'Inventory Dashboard', icon: <Package size={16} />, path: '/inventory/dashboard', keywords: ['inventory', 'stock'] },
  { label: 'Products', icon: <Package size={16} />, path: '/inventory/products', keywords: ['product', 'item', 'sku'] },
  { label: 'Warehouses', icon: <Package size={16} />, path: '/inventory/warehouses', keywords: ['warehouse', 'location'] },
  { label: 'Accounting', icon: <DollarSign size={16} />, path: '/accounting/dashboard', keywords: ['accounting', 'finance', 'ledger'] },
  { label: 'Chart of Accounts', icon: <DollarSign size={16} />, path: '/accounting/chart-of-accounts', keywords: ['chart', 'accounts', 'coa'] },
  { label: 'HR Dashboard', icon: <Briefcase size={16} />, path: '/hr', keywords: ['hr', 'human resources'] },
  { label: 'Employees', icon: <Briefcase size={16} />, path: '/hr/employees', keywords: ['employee', 'staff', 'people'] },
  { label: 'Payroll', icon: <Briefcase size={16} />, path: '/hr/payroll', keywords: ['payroll', 'salary', 'wages'] },
  { label: 'Leave', icon: <Briefcase size={16} />, path: '/hr/leave', keywords: ['leave', 'vacation', 'time off', 'pto'] },
  { label: 'Attendance', icon: <Briefcase size={16} />, path: '/hr/attendance', keywords: ['attendance', 'clock', 'check in'] },
  { label: 'Recruitment', icon: <Briefcase size={16} />, path: '/hr/recruitment', keywords: ['recruit', 'hire', 'applicant', 'candidate'] },
  { label: 'Manufacturing', icon: <Factory size={16} />, path: '/manufacturing/dashboard', keywords: ['manufacturing', 'production'] },
  { label: 'Manufacturing Orders', icon: <Factory size={16} />, path: '/manufacturing/orders', keywords: ['manufacturing order', 'mo'] },
  { label: 'BOM', icon: <Factory size={16} />, path: '/manufacturing/bom', keywords: ['bom', 'bill of materials'] },
  { label: 'Campaigns', icon: <Megaphone size={16} />, path: '/marketing/campaigns', keywords: ['campaign', 'marketing', 'email'] },
  { label: 'Support', icon: <Headphones size={16} />, path: '/support/dashboard', keywords: ['support', 'ticket', 'help desk'] },
  { label: 'Projects', icon: <FileText size={16} />, path: '/projects', keywords: ['project', 'task'] },
  { label: 'POS', icon: <ShoppingCart size={16} />, path: '/pos', keywords: ['pos', 'point of sale', 'register'] },
  { label: 'Website', icon: <LayoutDashboard size={16} />, path: '/website/dashboard', keywords: ['website', 'web', 'cms'] },
  { label: 'E-Signature', icon: <FileText size={16} />, path: '/esignature', keywords: ['esign', 'signature', 'document'] },
  { label: 'Settings', icon: <LayoutDashboard size={16} />, path: '/settings', keywords: ['settings', 'preferences', 'config'] },
  { label: 'Admin Portal', icon: <LayoutDashboard size={16} />, path: '/admin', keywords: ['admin', 'roles', 'permissions'] },
];

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Cmd+K / Ctrl+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const search = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    const lower = q.toLowerCase();
    const matched = MODULE_ROUTES.filter((r) =>
      r.label.toLowerCase().includes(lower) ||
      r.keywords.some((k) => k.includes(lower))
    ).map((r) => ({
      id: r.path,
      title: r.label,
      subtitle: r.path,
      module: r.path.split('/')[1] || 'app',
      path: r.path,
      icon: r.icon,
    }));
    setResults(matched.slice(0, 10));
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    search(query);
  }, [query, search]);

  const handleSelect = (result: SearchResult) => {
    navigate(result.path);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="gsearch-overlay" onClick={() => setOpen(false)}>
      <div className="gsearch-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="gsearch-input-wrapper">
          <Search size={20} className="gsearch-icon" />
          <input
            ref={inputRef}
            className="gsearch-input"
            placeholder="Search pages, modules, features..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Global search"
          />
          <kbd className="gsearch-kbd">ESC</kbd>
          <button className="gsearch-close" onClick={() => setOpen(false)} aria-label="Close search">
            <X size={18} />
          </button>
        </div>

        {results.length > 0 && (
          <ul className="gsearch-results" role="listbox">
            {results.map((r, i) => (
              <li
                key={r.id || (r as any)._id || i}
                className={`gsearch-result ${i === selectedIndex ? 'gsearch-result-active' : ''}`}
                onClick={() => handleSelect(r)}
                role="option"
                aria-selected={i === selectedIndex}
              >
                <span className="gsearch-result-icon">{r.icon}</span>
                <div className="gsearch-result-text">
                  <span className="gsearch-result-title">{r.title}</span>
                  <span className="gsearch-result-path">{r.path}</span>
                </div>
                <ArrowRight size={14} className="gsearch-result-arrow" />
              </li>
            ))}
          </ul>
        )}

        {query && results.length === 0 && (
          <div className="gsearch-empty">
            No results for &ldquo;{query}&rdquo;
          </div>
        )}

        {!query && (
          <div className="gsearch-hint">
            <p>Type to search across all modules</p>
            <div className="gsearch-hint-keys">
              <kbd>↑↓</kbd> navigate <kbd>↵</kbd> select <kbd>esc</kbd> close
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
