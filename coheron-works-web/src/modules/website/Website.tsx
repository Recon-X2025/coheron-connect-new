import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Globe, 
  FileText, 
  Image, 
  ShoppingCart, 
  Package, 
  Tag, 
  Settings,
  BarChart3,
  Layout
} from 'lucide-react';
import { Pages } from './Pages';
import { MediaLibrary } from './components/MediaLibrary';
import { ProductCatalog } from './components/ProductCatalog';
import { CartCheckout } from './components/CartCheckout';
import { Promotions } from './components/Promotions';
import { SiteSettings } from './components/SiteSettings';
import { WebsiteAnalytics } from './components/WebsiteAnalytics';
import { PageBuilder } from './components/PageBuilder';
import './Website.css';

type WebsiteTab = 
  | 'dashboard' 
  | 'pages' 
  | 'builder' 
  | 'media' 
  | 'products' 
  | 'cart' 
  | 'promotions' 
  | 'analytics' 
  | 'settings';

export const Website = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab') as WebsiteTab | null;
  const [activeTab, setActiveTab] = useState<WebsiteTab>(tabFromUrl || 'dashboard');

  useEffect(() => {
    if (tabFromUrl && ['dashboard', 'pages', 'builder', 'media', 'products', 'cart', 'promotions', 'analytics', 'settings'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  const handleTabChange = (tab: WebsiteTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const tabs = [
    { id: 'dashboard' as WebsiteTab, label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'pages' as WebsiteTab, label: 'Pages', icon: <FileText size={18} /> },
    { id: 'builder' as WebsiteTab, label: 'Page Builder', icon: <Layout size={18} /> },
    { id: 'media' as WebsiteTab, label: 'Media Library', icon: <Image size={18} /> },
    { id: 'products' as WebsiteTab, label: 'Products', icon: <Package size={18} /> },
    { id: 'cart' as WebsiteTab, label: 'Cart & Checkout', icon: <ShoppingCart size={18} /> },
    { id: 'promotions' as WebsiteTab, label: 'Promotions', icon: <Tag size={18} /> },
    { id: 'analytics' as WebsiteTab, label: 'Analytics', icon: <BarChart3 size={18} /> },
    { id: 'settings' as WebsiteTab, label: 'Settings', icon: <Settings size={18} /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <WebsiteDashboard />;
      case 'pages':
        return <Pages onNewPage={() => handleTabChange('builder')} />;
      case 'builder':
        return <PageBuilder />;
      case 'media':
        return <MediaLibrary />;
      case 'products':
        return <ProductCatalog />;
      case 'cart':
        return <CartCheckout />;
      case 'promotions':
        return <Promotions />;
      case 'analytics':
        return <WebsiteAnalytics />;
      case 'settings':
        return <SiteSettings />;
      default:
        return <WebsiteDashboard />;
    }
  };

  return (
    <div className="website-module">
      <div className="website-header">
        <div className="website-header-content">
          <Globe size={24} />
          <h1>Website & E-commerce</h1>
        </div>
      </div>

      <div className="website-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`website-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="website-content">
        {renderContent()}
      </div>
    </div>
  );
};

// Dashboard Component
const WebsiteDashboard = () => {
  return (
    <div className="website-dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Total Pages</h3>
          <p className="dashboard-stat">0</p>
        </div>
        <div className="dashboard-card">
          <h3>Published Pages</h3>
          <p className="dashboard-stat">0</p>
        </div>
        <div className="dashboard-card">
          <h3>Total Products</h3>
          <p className="dashboard-stat">0</p>
        </div>
        <div className="dashboard-card">
          <h3>Orders Today</h3>
          <p className="dashboard-stat">0</p>
        </div>
        <div className="dashboard-card">
          <h3>Revenue (MTD)</h3>
          <p className="dashboard-stat">$0</p>
        </div>
        <div className="dashboard-card">
          <h3>Conversion Rate</h3>
          <p className="dashboard-stat">0%</p>
        </div>
      </div>
    </div>
  );
};

export default Website;

