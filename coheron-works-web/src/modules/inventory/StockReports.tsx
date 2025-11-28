import { useState, useEffect } from 'react';
import { Package, AlertCircle, FileText } from 'lucide-react';
import { inventoryService, type StockSummary, type StockLedger, type ReorderSuggestion } from '../../services/inventoryService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import './StockReports.css';

export const StockReports = () => {
  const [stockSummary, setStockSummary] = useState<StockSummary[]>([]);
  const [stockLedger, setStockLedger] = useState<StockLedger[]>([]);
  const [reorderSuggestions, setReorderSuggestions] = useState<ReorderSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<'summary' | 'ledger' | 'reorder'>('summary');

  useEffect(() => {
    loadReports();
  }, [activeReport]);

  const loadReports = async () => {
    try {
      setLoading(true);
      switch (activeReport) {
        case 'summary':
          const summary = await inventoryService.getStockSummary();
          setStockSummary(summary);
          break;
        case 'ledger':
          const ledger = await inventoryService.getStockLedger();
          setStockLedger(ledger);
          break;
        case 'reorder':
          const suggestions = await inventoryService.getReorderSuggestions();
          setReorderSuggestions(suggestions);
          break;
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stock-reports-page">
      <div className="reports-header">
        <h2>Inventory Reports</h2>
        <div className="report-tabs">
          <button
            className={`report-tab ${activeReport === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveReport('summary')}
          >
            <Package size={18} />
            <span>Stock Summary</span>
          </button>
          <button
            className={`report-tab ${activeReport === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveReport('ledger')}
          >
            <FileText size={18} />
            <span>Stock Ledger</span>
          </button>
          <button
            className={`report-tab ${activeReport === 'reorder' ? 'active' : ''}`}
            onClick={() => setActiveReport('reorder')}
          >
            <AlertCircle size={18} />
            <span>Reorder Suggestions</span>
          </button>
        </div>
      </div>

      <div className="reports-content">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {activeReport === 'summary' && (
              <div className="report-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product Code</th>
                      <th>Product Name</th>
                      <th>Total Qty</th>
                      <th>Reserved</th>
                      <th>Available</th>
                      <th>Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockSummary.map((item) => (
                      <tr key={item.product_id}>
                        <td>{item.product_code}</td>
                        <td>{item.product_name}</td>
                        <td>{item.total_qty.toFixed(2)}</td>
                        <td>{item.total_reserved.toFixed(2)}</td>
                        <td>
                          <span className={item.available_qty > 0 ? 'positive' : 'negative'}>
                            {item.available_qty.toFixed(2)}
                          </span>
                        </td>
                        <td>{item.location_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeReport === 'ledger' && (
              <div className="report-table">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Product</th>
                      <th>Location</th>
                      <th>Type</th>
                      <th>In Qty</th>
                      <th>Out Qty</th>
                      <th>Balance</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLedger.map((entry) => (
                      <tr key={entry.id}>
                        <td>{new Date(entry.transaction_date).toLocaleDateString()}</td>
                        <td>{entry.product_name}</td>
                        <td>{entry.location_name}</td>
                        <td>{entry.transaction_type}</td>
                        <td>{entry.in_qty.toFixed(2)}</td>
                        <td>{entry.out_qty.toFixed(2)}</td>
                        <td>{entry.balance_qty.toFixed(2)}</td>
                        <td>₹{entry.balance_value.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeReport === 'reorder' && (
              <div className="report-table">
                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Warehouse</th>
                      <th>Current</th>
                      <th>Min</th>
                      <th>Max</th>
                      <th>Suggested</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reorderSuggestions.map((suggestion) => (
                      <tr key={suggestion.id}>
                        <td>{suggestion.product_name}</td>
                        <td>{suggestion.warehouse_name}</td>
                        <td>
                          <span className={suggestion.current_qty < suggestion.min_qty ? 'negative' : 'positive'}>
                            {suggestion.current_qty.toFixed(2)}
                          </span>
                        </td>
                        <td>{suggestion.min_qty.toFixed(2)}</td>
                        <td>{suggestion.max_qty.toFixed(2)}</td>
                        <td className="suggested-qty">{suggestion.suggested_qty.toFixed(2)}</td>
                        <td>
                          <span className={`status-badge ${suggestion.state}`}>
                            {suggestion.state}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

