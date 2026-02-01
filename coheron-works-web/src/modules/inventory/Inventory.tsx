import { useState } from 'react';
import { Warehouse, Package, ArrowLeftRight, BarChart3, Settings, LayoutDashboard, Barcode, Boxes } from 'lucide-react';
import { InventoryDashboard } from './InventoryDashboard';
import { Warehouses } from './Warehouses';
import { StockMovements } from './StockMovements';
import { StockReports } from './StockReports';
import { InventorySettings } from './InventorySettings';
import { BatchSerialManagement } from './BatchSerialManagement';
import { WarehouseOperations } from './WarehouseOperations';
import './Inventory.css';

type InventoryTab = 'dashboard' | 'warehouses' | 'movements' | 'batch-serial' | 'warehouse-ops' | 'reports' | 'settings';

export const Inventory = () => {
  const [activeTab, setActiveTab] = useState<InventoryTab>('dashboard');

  const tabs = [
    { id: 'dashboard' as InventoryTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'warehouses' as InventoryTab, label: 'Warehouses', icon: Warehouse },
    { id: 'movements' as InventoryTab, label: 'Stock Movements', icon: ArrowLeftRight },
    { id: 'batch-serial' as InventoryTab, label: 'Batch & Serial', icon: Barcode },
    { id: 'warehouse-ops' as InventoryTab, label: 'Warehouse Ops', icon: Boxes },
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
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id || (tab as any)._id || idx}
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
        {activeTab === 'batch-serial' && <BatchSerialManagement />}
        {activeTab === 'warehouse-ops' && <WarehouseOperations />}
        {activeTab === 'reports' && <StockReports />}
        {activeTab === 'settings' && <InventorySettings />}
      </div>
    </div>
  );
};

