import { apiService } from './apiService';

// Chart of Accounts
export const chartOfAccountsService = {
  getAll: (params?: any) => apiService.get('/accounting/chart-of-accounts', params),
  getById: (id: number) => apiService.getById('/accounting/chart-of-accounts', id),
  create: (data: any) => apiService.create('/accounting/chart-of-accounts', data),
  update: (id: number, data: any) => apiService.update('/accounting/chart-of-accounts', id, data),
  delete: (id: number) => apiService.delete('/accounting/chart-of-accounts', id),
  getBalance: (id: number, params?: any) => 
    apiService.getById(`/accounting/chart-of-accounts/${id}/balance`, 0).catch(() => 
      apiService.getAxiosInstance().get(`/accounting/chart-of-accounts/${id}/balance`, { params })
        .then(res => res.data)
    ),
};

// Journal Entries
export const journalEntriesService = {
  getAll: (params?: any) => apiService.get('/accounting/journal-entries', params),
  getById: (id: number) => apiService.getById('/accounting/journal-entries', id),
  create: (data: any) => apiService.create('/accounting/journal-entries', data),
  update: (id: number, data: any) => apiService.update('/accounting/journal-entries', id, data),
  delete: (id: number) => apiService.delete('/accounting/journal-entries', id),
  post: (id: number, data?: any) => 
    apiService.getAxiosInstance().post(`/accounting/journal-entries/${id}/post`, data || {}),
  cancel: (id: number) => 
    apiService.getAxiosInstance().post(`/accounting/journal-entries/${id}/cancel`),
};

// Accounts Payable
export const accountsPayableService = {
  // Vendors
  getVendors: (params?: any) => apiService.get('/accounting/accounts-payable/vendors', params),
  createVendor: (data: any) => apiService.create('/accounting/accounts-payable/vendors', data),
  
  // Bills
  getBills: (params?: any) => apiService.get('/accounting/accounts-payable/bills', params),
  getBillById: (id: number) => apiService.getById('/accounting/accounts-payable/bills', id),
  createBill: (data: any) => apiService.create('/accounting/accounts-payable/bills', data),
  updateBill: (id: number, data: any) => apiService.update('/accounting/accounts-payable/bills', id, data),
  postBill: (id: number) => 
    apiService.getAxiosInstance().post(`/accounting/accounts-payable/bills/${id}/post`),
  
  // Payments
  getPayments: (params?: any) => apiService.get('/accounting/accounts-payable/payments', params),
  createPayment: (data: any) => apiService.create('/accounting/accounts-payable/payments', data),
  postPayment: (id: number) => 
    apiService.getAxiosInstance().post(`/accounting/accounts-payable/payments/${id}/post`),
};

// Accounts Receivable
export const accountsReceivableService = {
  // Customers
  getCustomers: (params?: any) => apiService.get('/accounting/accounts-receivable/customers', params),
  getCustomerAging: (id: number) => 
    apiService.getById(`/accounting/accounts-receivable/customers/${id}/aging`, 0).catch(() =>
      apiService.getAxiosInstance().get(`/accounting/accounts-receivable/customers/${id}/aging`)
        .then(res => res.data)
    ),
  
  // Receipts
  getReceipts: (params?: any) => apiService.get('/accounting/accounts-receivable/receipts', params),
  getReceiptById: (id: number) => apiService.getById('/accounting/accounts-receivable/receipts', id),
  createReceipt: (data: any) => apiService.create('/accounting/accounts-receivable/receipts', data),
  postReceipt: (id: number) => 
    apiService.getAxiosInstance().post(`/accounting/accounts-receivable/receipts/${id}/post`),
  
  // Aging Report
  getAging: (params?: any) => apiService.get('/accounting/accounts-receivable/aging', params),
};

// Bank Management
export const bankManagementService = {
  // Bank Accounts
  getAccounts: (params?: any) => apiService.get('/accounting/bank/accounts', params),
  createAccount: (data: any) => apiService.create('/accounting/bank/accounts', data),
  
  // Statements
  getStatements: (params?: any) => apiService.get('/accounting/bank/statements', params),
  getStatementById: (id: number) => apiService.getById('/accounting/bank/statements', id),
  createStatement: (data: any) => apiService.create('/accounting/bank/statements', data),
  reconcileLine: (statementId: number, lineId: number, data: any) =>
    apiService.getAxiosInstance().post(`/accounting/bank/statements/${statementId}/lines/${lineId}/reconcile`, data),
  confirmStatement: (id: number) =>
    apiService.getAxiosInstance().post(`/accounting/bank/statements/${id}/confirm`),
};

// Fixed Assets
export const fixedAssetsService = {
  getCategories: () => apiService.get('/accounting/fixed-assets/categories'),
  getAll: (params?: any) => apiService.get('/accounting/fixed-assets', params),
  getById: (id: number) => apiService.getById('/accounting/fixed-assets', id),
  create: (data: any) => apiService.create('/accounting/fixed-assets', data),
  depreciate: (id: number, data: any) =>
    apiService.getAxiosInstance().post(`/accounting/fixed-assets/${id}/depreciate`, data),
  dispose: (id: number, data: any) =>
    apiService.getAxiosInstance().post(`/accounting/fixed-assets/${id}/dispose`, data),
};

// Tax
export const taxService = {
  getGroups: () => apiService.get('/accounting/tax/groups'),
  getAll: (params?: any) => apiService.get('/accounting/tax', params),
  getById: (id: number) => apiService.getById('/accounting/tax', id),
  create: (data: any) => apiService.create('/accounting/tax', data),
  getReturns: (params?: any) => apiService.get('/accounting/tax/returns', params),
  createReturn: (data: any) => apiService.create('/accounting/tax/returns', data),
  fileReturn: (id: number, data: any) =>
    apiService.getAxiosInstance().post(`/accounting/tax/returns/${id}/file`, data),
};

// Financial Reports
export const financialReportsService = {
  getTrialBalance: (params?: any) => apiService.get('/accounting/reports/trial-balance', params),
  getBalanceSheet: (params?: any) => apiService.get('/accounting/reports/balance-sheet', params),
  getProfitLoss: (params?: any) => apiService.get('/accounting/reports/profit-loss', params),
  getCashFlow: (params?: any) => apiService.get('/accounting/reports/cash-flow', params),
};

