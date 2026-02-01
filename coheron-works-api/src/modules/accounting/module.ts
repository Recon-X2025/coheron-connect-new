import { Router } from 'express';
import * as routes from './routes/index.js';

export interface ModuleRoute {
  path: string;
  router: Router;
  middleware?: any[];
  public?: boolean;
}

export const metadata = {
  name: 'accounting',
  description: 'Chart of Accounts, Journal Entries, AP/AR, Bank, Fixed Assets, Tax, Financial Reports, TDS, GST, E-Invoice, Cost Centers',
  dependencies: [],
};

export function register(): ModuleRoute[] {
  return [
    { path: '/accounting/chart-of-accounts', router: routes.accountingChartOfAccounts },
    { path: '/accounting/journal-entries', router: routes.accountingJournalEntries },
    { path: '/accounting/accounts-payable', router: routes.accountingAccountsPayable },
    { path: '/accounting/accounts-receivable', router: routes.accountingAccountsReceivable },
    { path: '/accounting/bank', router: routes.accountingBankManagement },
    { path: '/accounting/fixed-assets', router: routes.accountingFixedAssets },
    { path: '/accounting/tax', router: routes.accountingTax },
    { path: '/accounting/reports', router: routes.accountingFinancialReports },
    { path: '/accounting/tds', router: routes.tds },
    { path: '/accounting/gst-returns', router: routes.gstReturns },
    { path: '/accounting/e-invoice', router: routes.eInvoice },
    { path: '/accounting/bank-reconciliation', router: routes.bankReconciliation },
    { path: '/accounting/report-builder', router: routes.reportBuilder },
    { path: '/accounting/bank-feeds', router: routes.bankFeeds },
    { path: '/accounting/currency', router: routes.currency },
    { path: '/accounting/cost-centers', router: routes.costCenters },
    { path: '/accounting/currency-revaluation', router: routes.currencyRevaluation },
    { path: '/accounting/asset-maintenance', router: routes.assetMaintenance },
    { path: '/accounting/budgeting', router: routes.budgeting },
    { path: '/accounting/consolidation', router: routes.consolidation },
    { path: '/accounting/revenue-recognition', router: routes.revenueRecognition },
    { path: '/accounting/deferred', router: routes.deferredRevExp },
  ];
}
