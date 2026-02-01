import { lazy } from 'react';
const AccountingDashboard = lazy(() => import('./AccountingDashboard').then(m => ({ default: m.AccountingDashboard })));
const Invoices = lazy(() => import('./Invoices').then(m => ({ default: m.Invoices })));
const ChartOfAccounts = lazy(() => import('./ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const JournalEntries = lazy(() => import('./JournalEntries').then(m => ({ default: m.JournalEntries })));
const AccountsPayable = lazy(() => import('./AccountsPayable').then(m => ({ default: m.AccountsPayable })));
const FinancialReports = lazy(() => import('./FinancialReports').then(m => ({ default: m.FinancialReports })));
const BankReconciliation = lazy(() => import('./BankReconciliation').then(m => ({ default: m.BankReconciliation })));
const Budgeting = lazy(() => import('./pages/Budgeting').then(m => ({ default: m.Budgeting })));
const Consolidation = lazy(() => import('./pages/Consolidation').then(m => ({ default: m.Consolidation })));
const RevenueRecognition = lazy(() => import('./pages/RevenueRecognition').then(m => ({ default: m.RevenueRecognition })));
const DeferredRevExp = lazy(() => import('./pages/DeferredRevExp').then(m => ({ default: m.DeferredRevExp })));

export const accountingRoutes = [
  { path: '/accounting/dashboard', element: <AccountingDashboard /> },
  { path: '/accounting/invoices', element: <Invoices /> },
  { path: '/accounting/chart-of-accounts', element: <ChartOfAccounts /> },
  { path: '/accounting/journal-entries', element: <JournalEntries /> },
  { path: '/accounting/accounts-payable', element: <AccountsPayable /> },
  { path: '/accounting/reports', element: <FinancialReports /> },
  { path: '/accounting/bank-reconciliation', element: <BankReconciliation /> },
  { path: '/accounting/budgeting', element: <Budgeting /> },
  { path: '/accounting/consolidation', element: <Consolidation /> },
  { path: '/accounting/revenue-recognition', element: <RevenueRecognition /> },
  { path: '/accounting/deferred', element: <DeferredRevExp /> },
];
