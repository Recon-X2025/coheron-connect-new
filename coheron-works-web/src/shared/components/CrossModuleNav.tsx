import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  TrendingUp,
  ShoppingCart,
  FileText,
  Package,
  Factory,
  Megaphone,
  Briefcase,
  CircleDollarSign,
} from 'lucide-react';
import './CrossModuleNav.css';

interface RelatedRecord {
  id: number;
  name: string;
  model: string;
  url: string;
}

interface CrossModuleNavProps {
  currentRecord: {
    id: number;
    model: string;
    name: string;
  };
  relatedRecords?: RelatedRecord[];
  showQuickLinks?: boolean;
}

const moduleIcons: Record<string, React.ReactNode> = {
  'res.partner': <Users size={18} />,
  'crm.lead': <TrendingUp size={18} />,
  'sale.order': <ShoppingCart size={18} />,
  'account.move': <FileText size={18} />,
  'product.product': <Package size={18} />,
  'mrp.production': <Factory size={18} />,
  'utm.campaign': <Megaphone size={18} />,
  'project.project': <Briefcase size={18} />,
  'account.payment': <CircleDollarSign size={18} />,
};

const moduleLabels: Record<string, string> = {
  'res.partner': 'Partner',
  'crm.lead': 'Lead/Opportunity',
  'sale.order': 'Sales Order',
  'account.move': 'Invoice',
  'product.product': 'Product',
  'mrp.production': 'Manufacturing Order',
  'utm.campaign': 'Campaign',
  'project.project': 'Project',
  'account.payment': 'Payment',
};

const getModuleRoute = (model: string, id: number): string => {
  const routeMap: Record<string, string> = {
    'res.partner': `/partners/${id}`,
    'crm.lead': `/crm/leads/${id}`,
    'sale.order': `/sales/orders/${id}`,
    'account.move': `/accounting/invoices/${id}`,
    'product.product': `/inventory/products/${id}`,
    'mrp.production': `/manufacturing/orders/${id}`,
    'utm.campaign': `/marketing/campaigns/${id}`,
    'project.project': `/projects/${id}`,
  };
  return routeMap[model] || `/#`;
};

export const CrossModuleNav: React.FC<CrossModuleNavProps> = ({
  currentRecord,
  relatedRecords = [],
  showQuickLinks = true,
}) => {
  const getBreadcrumbs = () => {
    const parts = [];
    const modelLabel = moduleLabels[currentRecord.model] || currentRecord.model;
    parts.push({ label: modelLabel, url: '#' });
    parts.push({ label: currentRecord.name, url: '#' });
    return parts;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="cross-module-nav">
      {breadcrumbs.length > 0 && (
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <ol className="breadcrumb-list">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="breadcrumb-item">
                {index < breadcrumbs.length - 1 ? (
                  <Link to={crumb.url} className="breadcrumb-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="breadcrumb-current">{crumb.label}</span>
                )}
                {index < breadcrumbs.length - 1 && (
                  <span className="breadcrumb-separator">/</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}

      {relatedRecords.length > 0 && (
        <div className="related-records">
          <h4 className="related-title">Related Records</h4>
          <div className="related-list">
            {relatedRecords.map((record, idx) => (
              <Link
                key={`${record.model}-${record.id || (record as any)._id || idx}`}
                to={getModuleRoute(record.model, record.id)}
                className="related-item"
              >
                <span className="related-icon">
                  {moduleIcons[record.model] || <FileText size={18} />}
                </span>
                <div className="related-content">
                  <span className="related-model">
                    {moduleLabels[record.model] || record.model}
                  </span>
                  <span className="related-name">{record.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {showQuickLinks && (
        <div className="quick-links">
          <h4 className="quick-links-title">Quick Links</h4>
          <div className="quick-links-grid">
            <Link to="/crm/leads" className="quick-link">
              <TrendingUp size={20} />
              <span>Leads</span>
            </Link>
            <Link to="/sales/orders" className="quick-link">
              <ShoppingCart size={20} />
              <span>Sales Orders</span>
            </Link>
            <Link to="/accounting/invoices" className="quick-link">
              <FileText size={20} />
              <span>Invoices</span>
            </Link>
            <Link to="/inventory/products" className="quick-link">
              <Package size={20} />
              <span>Products</span>
            </Link>
            <Link to="/manufacturing/orders" className="quick-link">
              <Factory size={20} />
              <span>Manufacturing</span>
            </Link>
            <Link to="/marketing/campaigns" className="quick-link">
              <Megaphone size={20} />
              <span>Campaigns</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrossModuleNav;

