import { useState } from 'react';
import { Warehouse, Package, ArrowLeftRight, FileText, BarChart3, Settings, LayoutDashboard } from 'lucide-react';
import { InventoryDashboard } from './InventoryDashboard';
import { Warehouses } from './Warehouses';
import { StockMovements } from './StockMovements';
import { StockReports } from './StockReports';
import { InventorySettings } from './InventorySettings';
import './Inventory.css';

type InventoryTab = 'dashboard' | 'warehouses' | 'movements' | 'reports' | 'settings';

export const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('dashboard');

  const tabs = [
    { id: 'dashboard' as InventoryTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'warehouses' as InventoryTab, label: 'Warehouses', icon: Warehouse },
    { id: 'movements' as InventoryTab, label: 'Stock Movements', icon: ArrowLeftRight },
    { id: 'reports' as InventoryTab, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as InventoryTab, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="inventory-module">
      <div className="inventory-header">
        <div className="inventory-title">
          <Package size={32} />
          <div>
            <h1>Inventory Management</h1>
            <p>Manage warehouses, stock movements, and inventory operations</p>
          </div>
        </div>
      </div>

      <div className="inventory-tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`inventory-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="inventory-content">
        {activeTab === 'dashboard' && <InventoryDashboard />}
        {activeTab === 'warehouses' && <Warehouses />}
        {activeTab === 'movements' && <StockMovements />}
        {activeTab === 'reports' && <StockReports />}
        {activeTab === 'settings' && <InventorySettings />}
      </div>
    </div>
  );
};

