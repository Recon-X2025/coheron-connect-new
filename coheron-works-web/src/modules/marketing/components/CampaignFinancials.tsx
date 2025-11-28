import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, Receipt, FileText, Users, Target } from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import './CampaignFinancials.css';

interface CampaignFinancialsProps {
  campaignId: number;
  campaignBudget: number;
  campaignBudgetLimit: number;
}

interface FinancialData {
  totalSpend: number;
  totalRevenue: number;
  budgetRemaining: number;
  budgetUtilization: number;
  roi: number;
  cpl: number;
  cpa: number;
  roas: number;
  transactions: Array<{
    id: number;
    date: string;
    type: 'spend' | 'revenue' | 'refund';
    amount: number;
    description: string;
    invoice_id?: number;
  }>;
  budgetVariance: number;
  projectedSpend: number;
}

export const CampaignFinancials: React.FC<CampaignFinancialsProps> = ({
  campaignId,
  campaignBudget,
  campaignBudgetLimit,
}) => {
  const [loading, setLoading] = useState(true);
  const [financials, setFinancials] = useState<FinancialData | null>(null);

  useEffect(() => {
    loadFinancials();
  }, [campaignId]);

  const loadFinancials = async () => {
    try {
      setLoading(true);
      const campaignResponse = await apiService.get<any>(`/campaigns/${campaignId}`);
      const campaign = Array.isArray(campaignResponse) ? campaignResponse[0] : campaignResponse;
      const transactions = await apiService.get<any[]>(`/campaigns/${campaignId}/financials`).catch(() => []);

      const totalSpend = campaign?.total_cost || 0;
      const totalRevenue = campaign?.revenue || 0;
      const budgetRemaining = campaignBudget - totalSpend;
      const budgetUtilization = campaignBudget > 0 ? (totalSpend / campaignBudget) * 100 : 0;
      const roi = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
      const leads = campaign?.leads_count || 1;
      const cpl = totalSpend / leads;
      const cpa = totalSpend / leads; // Simplified
      const roas = totalSpend > 0 ? (totalRevenue / totalSpend) * 100 : 0;
      const budgetVariance = campaignBudget - totalSpend;
      
      // Projected spend based on current daily average
      const daysElapsed = campaign?.start_date && campaign?.end_date
        ? Math.ceil((new Date(campaign.end_date).getTime() - new Date(campaign.start_date).getTime()) / (1000 * 60 * 60 * 24))
        : 30;
      const dailyAverage = totalSpend / Math.max(daysElapsed, 1);
      const projectedSpend = dailyAverage * daysElapsed;

      setFinancials({
        totalSpend,
        totalRevenue,
        budgetRemaining,
        budgetUtilization: parseFloat(budgetUtilization.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        cpl: parseFloat(cpl.toFixed(2)),
        cpa: parseFloat(cpa.toFixed(2)),
        roas: parseFloat(roas.toFixed(2)),
        transactions: transactions.map((t: any) => ({
          id: t.id,
          date: t.transaction_date || t.created_at,
          type: t.transaction_type || 'spend',
          amount: parseFloat(t.amount),
          description: t.description || 'Transaction',
          invoice_id: t.invoice_id,
        })),
        budgetVariance: parseFloat(budgetVariance.toFixed(2)),
        projectedSpend: parseFloat(projectedSpend.toFixed(2)),
      });
    } catch (error) {
      console.error('Failed to load financials:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="campaign-financials">
        <LoadingSpinner size="medium" message="Loading financial data..." />
      </div>
    );
  }

  if (!financials) {
    return <div className="campaign-financials">No financial data available</div>;
  }

  const isOverBudget = financials.totalSpend > campaignBudget;
  const isNearLimit = campaignBudgetLimit > 0 && financials.totalSpend >= campaignBudgetLimit * 0.9;

  return (
    <div className="campaign-financials">
      <div className="financials-header">
        <h3>Financial Overview</h3>
        <p className="financials-subtitle">Budget tracking, ROI, and spend analysis</p>
      </div>

      {/* Budget Alerts */}
      {(isOverBudget || isNearLimit) && (
        <div className={`budget-alert ${isOverBudget ? 'over-budget' : 'near-limit'}`}>
          <AlertCircle size={20} />
          <div>
            <strong>
              {isOverBudget ? 'Over Budget' : 'Approaching Budget Limit'}
            </strong>
            <p>
              {isOverBudget
                ? `Spending has exceeded budget by ${formatCurrency(Math.abs(financials.budgetVariance))}`
                : `Current spend is ${financials.budgetUtilization.toFixed(1)}% of budget limit`}
            </p>
          </div>
        </div>
      )}

      {/* Key Financial Metrics */}
      <div className="financial-metrics-grid">
        <div className="financial-card">
          <div className="financial-header">
            <DollarSign size={20} />
            <span>Total Spend</span>
          </div>
          <div className="financial-value">{formatCurrency(financials.totalSpend)}</div>
          <div className="financial-progress">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${Math.min(financials.budgetUtilization, 100)}%` }}
              />
            </div>
            <span className="progress-text">
              {financials.budgetUtilization.toFixed(1)}% of budget
            </span>
          </div>
        </div>

        <div className="financial-card">
          <div className="financial-header">
            <DollarSign size={20} />
            <span>Total Revenue</span>
          </div>
          <div className="financial-value revenue">{formatCurrency(financials.totalRevenue)}</div>
          <div className="financial-change positive">
            <TrendingUp size={14} />
            Generated from campaign
          </div>
        </div>

        <div className="financial-card">
          <div className="financial-header">
            <DollarSign size={20} />
            <span>Budget Remaining</span>
          </div>
          <div className={`financial-value ${financials.budgetRemaining < 0 ? 'negative' : ''}`}>
            {formatCurrency(financials.budgetRemaining)}
          </div>
          <div className="financial-budget">
            Budget: {formatCurrency(campaignBudget)}
            {campaignBudgetLimit > 0 && (
              <span className="budget-limit">Limit: {formatCurrency(campaignBudgetLimit)}</span>
            )}
          </div>
        </div>

        <div className="financial-card">
          <div className="financial-header">
            <TrendingUp size={20} />
            <span>ROI</span>
          </div>
          <div className={`financial-value ${financials.roi >= 0 ? 'positive' : 'negative'}`}>
            {financials.roi >= 0 ? '+' : ''}{financials.roi}%
          </div>
          <div className="financial-detail">
            {formatCurrency(financials.totalRevenue - financials.totalSpend)} net profit
          </div>
        </div>

        <div className="financial-card">
          <div className="financial-header">
            <Users size={20} />
            <span>Cost per Lead (CPL)</span>
          </div>
          <div className="financial-value">{formatCurrency(financials.cpl)}</div>
        </div>

        <div className="financial-card">
          <div className="financial-header">
            <Target size={20} />
            <span>ROAS</span>
          </div>
          <div className="financial-value">{financials.roas.toFixed(1)}%</div>
          <div className="financial-detail">Return on Ad Spend</div>
        </div>
      </div>

      {/* Projected Spend */}
      <div className="projected-spend">
        <h4>Projected Spend</h4>
        <div className="projected-content">
          <div className="projected-value">{formatCurrency(financials.projectedSpend)}</div>
          <p>Based on current daily average spending rate</p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="transactions-section">
        <h4>Financial Transactions</h4>
        <div className="transactions-list">
          {financials.transactions.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Invoice</th>
                </tr>
              </thead>
              <tbody>
                {financials.transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{new Date(transaction.date).toLocaleDateString()}</td>
                    <td>
                      <span className={`transaction-type ${transaction.type}`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td>{transaction.description}</td>
                    <td className={transaction.type === 'revenue' ? 'positive' : 'negative'}>
                      {transaction.type === 'revenue' ? '+' : '-'}
                      {formatCurrency(Math.abs(transaction.amount))}
                    </td>
                    <td>
                      {transaction.invoice_id ? (
                        <a href={`/accounting/invoices/${transaction.invoice_id}`} className="invoice-link">
                          <FileText size={16} />
                          View Invoice
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-transactions">
              <Receipt size={48} />
              <p>No transactions recorded yet</p>
              <p className="note">Transactions will appear here when invoices or vendor bills are linked to this campaign</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CampaignFinancials;

