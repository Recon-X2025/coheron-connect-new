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
  description: 'Chart of Accounts, Journal Entries, AP/AR, Bank, Fixed Assets, Tax, Financial Reports, TDS, GST, E-Invoice',
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
    { path: '/accounting/financial-reports', router: routes.accountingFinancialReports },
    { path: '/tds', router: routes.tds },
    { path: '/gst-returns', router: routes.gstReturns },
    { path: '/e-invoice', router: routes.eInvoice },
  ];
}
