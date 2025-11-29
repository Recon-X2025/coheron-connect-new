import { useState, useEffect } from 'react';
import { FileText, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import { financialReportsService } from '../../services/accountingService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './FinancialReports.css';

export const FinancialReports = () => {
  const [activeReport, setActiveReport] = useState<'trial-balance' | 'balance-sheet' | 'profit-loss' | 'cash-flow'>('trial-balance');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadReport();
  }, [activeReport, dateFrom, dateTo]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const params = { date_from: dateFrom, date_to: dateTo };
      let data;
      
      switch (activeReport) {
        case 'trial-balance':
          data = await financialReportsService.getTrialBalance(params);
          break;
        case 'balance-sheet':
          data = await financialReportsService.getBalanceSheet({ date_as_of: dateTo });
          break;
        case 'profit-loss':
          data = await financialReportsService.getProfitLoss(params);
          break;
        case 'cash-flow':
          data = await financialReportsService.getCashFlow(params);
          break;
      }
      setReportData(data);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderTrialBalance = () => {
    if (!reportData || !Array.isArray(reportData)) return null;
    
    return (
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>Account Code</th>
              <th>Account Name</th>
              <th>Type</th>
              <th className="amount-col">Debit</th>
              <th className="amount-col">Credit</th>
              <th className="amount-col">Balance</th>
            </tr>
          </thead>
          <tbody>
            {reportData.map((row: any) => (
              <tr key={row.id}>
                <td className="account-code">{row.code}</td>
                <td>{row.name}</td>
                <td>{row.account_type}</td>
                <td className="amount">{formatInLakhsCompact(row.total_debit || 0)}</td>
                <td className="amount">{formatInLakhsCompact(row.total_credit || 0)}</td>
                <td className={`amount ${parseFloat(row.balance || 0) >= 0 ? 'positive' : 'negative'}`}>
                  {formatInLakhsCompact(row.balance || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderProfitLoss = () => {
    if (!reportData) return null;
    
    return (
      <div className="pl-report">
        <div className="pl-section">
          <h3>Income</h3>
          <div className="pl-items">
            {reportData.income?.map((item: any) => (
              <div key={item.account_type} className="pl-item">
                <span>{item.account_type}</span>
                <span className="amount positive">{formatInLakhsCompact(item.balance || 0)}</span>
              </div>
            ))}
          </div>
          <div className="pl-total">
            <span>Total Income</span>
            <span className="amount positive">{formatInLakhsCompact(reportData.total_income || 0)}</span>
          </div>
        </div>

        <div className="pl-section">
          <h3>Expenses</h3>
          <div className="pl-items">
            {reportData.expenses?.map((item: any) => (
              <div key={item.account_type} className="pl-item">
                <span>{item.account_type}</span>
                <span className="amount negative">{formatInLakhsCompact(item.balance || 0)}</span>
              </div>
            ))}
          </div>
          <div className="pl-total">
            <span>Total Expenses</span>
            <span className="amount negative">{formatInLakhsCompact(reportData.total_expenses || 0)}</span>
          </div>
        </div>

        <div className="pl-net">
          <span>Net Income</span>
          <span className={`amount ${(reportData.net_income || 0) >= 0 ? 'positive' : 'negative'}`}>
            {formatInLakhsCompact(reportData.net_income || 0)}
          </span>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!reportData) return null;
    
    const totalAssets = (reportData.assets || []).reduce((sum: number, item: any) => sum + parseFloat(item.balance || 0), 0);
    const totalLiabilities = (reportData.liabilities || []).reduce((sum: number, item: any) => sum + parseFloat(item.balance || 0), 0);
    const totalEquity = (reportData.equity || []).reduce((sum: number, item: any) => sum + parseFloat(item.balance || 0), 0);
    const totalLiabilitiesEquity = totalLiabilities + totalEquity;

    return (
      <div className="bs-report">
        <div className="bs-section">
          <h3>Assets</h3>
          <div className="bs-items">
            {reportData.assets?.map((item: any) => (
              <div key={item.account_type} className="bs-item">
                <span>{item.account_type.replace(/_/g, ' ')}</span>
                <span className="amount">{formatInLakhsCompact(item.balance || 0)}</span>
              </div>
            ))}
          </div>
          <div className="bs-total">
            <span>Total Assets</span>
            <span className="amount">{formatInLakhsCompact(totalAssets)}</span>
          </div>
        </div>

        <div className="bs-section">
          <h3>Liabilities</h3>
          <div className="bs-items">
            {reportData.liabilities?.map((item: any) => (
              <div key={item.account_type} className="bs-item">
                <span>{item.account_type.replace(/_/g, ' ')}</span>
                <span className="amount">{formatInLakhsCompact(item.balance || 0)}</span>
              </div>
            ))}
          </div>
          <div className="bs-total">
            <span>Total Liabilities</span>
            <span className="amount">{formatInLakhsCompact(totalLiabilities)}</span>
          </div>
        </div>

        <div className="bs-section">
          <h3>Equity</h3>
          <div className="bs-items">
            {reportData.equity?.map((item: any) => (
              <div key={item.account_type} className="bs-item">
                <span>{item.account_type.replace(/_/g, ' ')}</span>
                <span className="amount">{formatInLakhsCompact(item.balance || 0)}</span>
              </div>
            ))}
          </div>
          <div className="bs-total">
            <span>Total Equity</span>
            <span className="amount">{formatInLakhsCompact(totalEquity)}</span>
          </div>
        </div>

        <div className="bs-net">
          <span>Total Liabilities & Equity</span>
          <span className="amount">{formatInLakhsCompact(totalLiabilitiesEquity)}</span>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    if (!reportData) return null;
    
    const operatingCash = (reportData.operating?.cash_in || 0) - (reportData.operating?.cash_out || 0);
    const investingCash = (reportData.investing?.cash_in || 0) - (reportData.investing?.cash_out || 0);
    const financingCash = (reportData.financing?.cash_in || 0) - (reportData.financing?.cash_out || 0);
    const netCashFlow = operatingCash + investingCash + financingCash;

    return (
      <div className="cf-report">
        <div className="cf-section">
          <h3>Operating Activities</h3>
          <div className="cf-items">
            <div className="cf-item">
              <span>Cash In</span>
              <span className="amount positive">{formatInLakhsCompact(reportData.operating?.cash_in || 0)}</span>
            </div>
            <div className="cf-item">
              <span>Cash Out</span>
              <span className="amount negative">{formatInLakhsCompact(reportData.operating?.cash_out || 0)}</span>
            </div>
          </div>
          <div className="cf-total">
            <span>Net Operating Cash Flow</span>
            <span className={`amount ${operatingCash >= 0 ? 'positive' : 'negative'}`}>
              {formatInLakhsCompact(operatingCash)}
            </span>
          </div>
        </div>

        <div className="cf-section">
          <h3>Investing Activities</h3>
          <div className="cf-items">
            <div className="cf-item">
              <span>Cash In</span>
              <span className="amount positive">{formatInLakhsCompact(reportData.investing?.cash_in || 0)}</span>
            </div>
            <div className="cf-item">
              <span>Cash Out</span>
              <span className="amount negative">{formatInLakhsCompact(reportData.investing?.cash_out || 0)}</span>
            </div>
          </div>
          <div className="cf-total">
            <span>Net Investing Cash Flow</span>
            <span className={`amount ${investingCash >= 0 ? 'positive' : 'negative'}`}>
              {formatInLakhsCompact(investingCash)}
            </span>
          </div>
        </div>

        <div className="cf-section">
          <h3>Financing Activities</h3>
          <div className="cf-items">
            <div className="cf-item">
              <span>Cash In</span>
              <span className="amount positive">{formatInLakhsCompact(reportData.financing?.cash_in || 0)}</span>
            </div>
            <div className="cf-item">
              <span>Cash Out</span>
              <span className="amount negative">{formatInLakhsCompact(reportData.financing?.cash_out || 0)}</span>
            </div>
          </div>
          <div className="cf-total">
            <span>Net Financing Cash Flow</span>
            <span className={`amount ${financingCash >= 0 ? 'positive' : 'negative'}`}>
              {formatInLakhsCompact(financingCash)}
            </span>
          </div>
        </div>

        <div className="cf-net">
          <span>Net Cash Flow</span>
          <span className={`amount ${netCashFlow >= 0 ? 'positive' : 'negative'}`}>
            {formatInLakhsCompact(netCashFlow)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="financial-reports-page">
      <div className="container">
        <div className="fr-header">
          <div>
            <h1>Financial Reports</h1>
            <p className="fr-subtitle">Financial statements and analysis</p>
          </div>
        </div>

        <div className="fr-tabs">
          <button
            className={`fr-tab ${activeReport === 'trial-balance' ? 'active' : ''}`}
            onClick={() => setActiveReport('trial-balance')}
          >
            <FileText size={18} />
            Trial Balance
          </button>
          <button
            className={`fr-tab ${activeReport === 'balance-sheet' ? 'active' : ''}`}
            onClick={() => setActiveReport('balance-sheet')}
          >
            <BarChart3 size={18} />
            Balance Sheet
          </button>
          <button
            className={`fr-tab ${activeReport === 'profit-loss' ? 'active' : ''}`}
            onClick={() => setActiveReport('profit-loss')}
          >
            <TrendingUp size={18} />
            Profit & Loss
          </button>
          <button
            className={`fr-tab ${activeReport === 'cash-flow' ? 'active' : ''}`}
            onClick={() => setActiveReport('cash-flow')}
          >
            <DollarSign size={18} />
            Cash Flow
          </button>
        </div>

        <div className="fr-filters">
          <div className="date-filter">
            <label>From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="date-filter">
            <label>To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="fr-loading">Loading report...</div>
        ) : (
          <div className="fr-content">
            {activeReport === 'trial-balance' && renderTrialBalance()}
            {activeReport === 'profit-loss' && renderProfitLoss()}
            {activeReport === 'balance-sheet' && renderBalanceSheet()}
            {activeReport === 'cash-flow' && renderCashFlow()}
          </div>
        )}
      </div>
    </div>
  );
};

