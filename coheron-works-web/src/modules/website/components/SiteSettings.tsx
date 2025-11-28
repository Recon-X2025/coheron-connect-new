import { useState } from 'react';
import { Settings, Globe, Shield, CreditCard, Truck } from 'lucide-react';
import './SiteSettings.css';

export const SiteSettings = () => {
  const [activeSection, setActiveSection] = useState<string>('general');

  const sections = [
    { id: 'general', label: 'General', icon: <Globe size={18} /> },
    { id: 'security', label: 'Security', icon: <Shield size={18} /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard size={18} /> },
    { id: 'shipping', label: 'Shipping', icon: <Truck size={18} /> },
  ];

  return (
    <div className="site-settings">
      <div className="site-settings-header">
        <Settings size={24} />
        <h2>Site Settings</h2>
      </div>

      <div className="site-settings-layout">
        <div className="settings-sidebar">
          {sections.map((section) => (
            <button
              key={section.id}
              className={`settings-section-btn ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              {section.icon}
              <span>{section.label}</span>
            </button>
          ))}
        </div>

        <div className="settings-content">
          {activeSection === 'general' && (
            <div className="settings-panel">
              <h3>General Settings</h3>
              <p>Site configuration options would be implemented here</p>
            </div>
          )}
          {activeSection === 'security' && (
            <div className="settings-panel">
              <h3>Security Settings</h3>
              <p>SSL, authentication, and security options</p>
            </div>
          )}
          {activeSection === 'payment' && (
            <div className="settings-panel">
              <h3>Payment Methods</h3>
              <p>Configure payment gateways and methods</p>
            </div>
          )}
          {activeSection === 'shipping' && (
            <div className="settings-panel">
              <h3>Shipping Methods</h3>
              <p>Configure shipping carriers and rates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

