import { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertTriangle, Warehouse, ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { inventoryService, type StockSummary, type ReorderSuggestion, type Warehouse as WarehouseType } from '../../services/inventoryService';
import './InventoryDashboard.css';

export const InventoryDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockSummary[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<StockSummary[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [summary, suggestions, warehousesData] = await Promise.all([
        inventoryService.getStockSummary(),
        inventoryService.getReorderSuggestions({ state: 'new' }),
        inventoryService.getWarehouses({ active: true }),
      ]);

      setStockSummary(summary);
      setReorderSuggestions(suggestions);
      setWarehouses(warehousesData);

      // Calculate low stock and out of stock items
      const lowStock = summary.filter(item => item.available_qty > 0 && item.available_qty < 10);
      const outOfStock = summary.filter(item => item.available_qty <= 0);
      setLowStockItems(lowStock);
      setOutOfStockItems(outOfStock);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate KPIs
  const totalProducts = stockSummary.length;
  const totalStockValue = stockSummary.reduce((sum, item) => {
    // Estimate value (would need actual cost from products)
    return sum + (item.total_qty * 100); // Placeholder calculation
  }, 0);
  const totalAvailableQty = stockSummary.reduce((sum, item) => sum + item.available_qty, 0);
  const totalReservedQty = stockSummary.reduce((sum, item) => sum + item.total_reserved, 0);
  const avgStockLevel = totalProducts > 0 ? totalAvailableQty / totalProducts : 0;
  const stockTurnoverRatio = totalReservedQty > 0 ? (totalReservedQty / totalAvailableQty) * 100 : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="inventory-dashboard">
      <div className="dashboard-header">
        <h2>Inventory Dashboard</h2>
        <p className="dashboard-subtitle">Real-time inventory overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#dbeafe', color: '#1e40af' }}>
            <Package size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Products</div>
            <div className="kpi-value">{totalProducts}</div>
            <div className="kpi-change positive">
              <Activity size={14} />
              <span>Active items</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#d1fae5', color: '#065f46' }}>
            <TrendingUp size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Total Stock Value</div>
            <div className="kpi-value">₹{totalStockValue.toLocaleString('en-IN')}</div>
            <div className="kpi-change positive">
              <ArrowUpRight size={14} />
              <span>Estimated value</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fef3c7', color: '#92400e' }}>
            <Warehouse size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Active Warehouses</div>
            <div className="kpi-value">{warehouses.length}</div>
            <div className="kpi-change">
              <span>Operational</span>
            </div>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: '#fee2e2', color: '#991b1b' }}>
            <AlertTriangle size={24} />
          </div>
          <div className="kpi-content">
            <div className="kpi-label">Low Stock Items</div>
            <div className="kpi-value">{lowStockItems.length + outOfStockItems.length}</div>
            <div className="kpi-change negative">
              <ArrowDownRight size={14} />
              <span>Requires attention</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Overview */}
      <div className="dashboard-section">
        <h3>Stock Overview</h3>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Available Quantity</div>
            <div className="stat-value">{totalAvailableQty.toFixed(2)}</div>
            <div className="stat-unit">units</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Reserved Quantity</div>
            <div className="stat-value">{totalReservedQty.toFixed(2)}</div>
            <div className="stat-unit">units</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Average Stock Level</div>
            <div className="stat-value">{avgStockLevel.toFixed(2)}</div>
            <div className="stat-unit">units/product</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Stock Turnover Ratio</div>
            <div className="stat-value">{stockTurnoverRatio.toFixed(1)}%</div>
            <div className="stat-unit">reserved/available</div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="dashboard-section">
        <h3>Alerts & Notifications</h3>
        <div className="alerts-grid">
          {outOfStockItems.length > 0 && (
            <div className="alert-card critical">
              <div className="alert-header">
                <AlertTriangle size={20} />
                <span>Out of Stock Items</span>
                <span className="alert-count">{outOfStockItems.length}</span>
              </div>
              <div className="alert-items">
                {outOfStockItems.slice(0, 5).map((item) => (
                  <div key={item.product_id} className="alert-item">
                    <span className="item-name">{item.product_name}</span>
                    <span className="item-code">{item.product_code}</span>
                  </div>
                ))}
                {outOfStockItems.length > 5 && (
                  <div className="alert-more">+{outOfStockItems.length - 5} more items</div>
                )}
              </div>
            </div>
          )}

          {lowStockItems.length > 0 && (
            <div className="alert-card warning">
              <div className="alert-header">
                <AlertTriangle size={20} />
                <span>Low Stock Items</span>
                <span className="alert-count">{lowStockItems.length}</span>
              </div>
              <div className="alert-items">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div key={item.product_id} className="alert-item">
                    <span className="item-name">{item.product_name}</span>
                    <span className="item-stock">{item.available_qty.toFixed(2)} units</span>
                  </div>
                ))}
                {lowStockItems.length > 5 && (
                  <div className="alert-more">+{lowStockItems.length - 5} more items</div>
                )}
              </div>
            </div>
          )}

          {reorderSuggestions.length > 0 && (
            <div className="alert-card info">
              <div className="alert-header">
                <Package size={20} />
                <span>Reorder Suggestions</span>
                <span className="alert-count">{reorderSuggestions.length}</span>
              </div>
              <div className="alert-items">
                {reorderSuggestions.slice(0, 5).map((suggestion, idx) => (
                  <div key={suggestion.id || (suggestion as any)._id || idx} className="alert-item">
                    <span className="item-name">{suggestion.product_name}</span>
                    <span className="item-suggestion">Suggested: {suggestion.suggested_qty.toFixed(2)}</span>
                  </div>
                ))}
                {reorderSuggestions.length > 5 && (
                  <div className="alert-more">+{reorderSuggestions.length - 5} more suggestions</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Top Products by Stock */}
      <div className="dashboard-section">
        <h3>Top Products by Stock Value</h3>
        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Code</th>
                <th>Total Qty</th>
                <th>Available</th>
                <th>Reserved</th>
                <th>Locations</th>
              </tr>
            </thead>
            <tbody>
              {stockSummary
                .sort((a, b) => b.total_qty - a.total_qty)
                .slice(0, 10)
                .map((item) => (
                  <tr key={item.product_id}>
                    <td>{item.product_name}</td>
                    <td className="code-cell">{item.product_code}</td>
                    <td>{item.total_qty.toFixed(2)}</td>
                    <td>
                      <span className={item.available_qty > 0 ? 'positive' : 'negative'}>
                        {item.available_qty.toFixed(2)}
                      </span>
                    </td>
                    <td>{item.total_reserved.toFixed(2)}</td>
                    <td>{item.location_count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

