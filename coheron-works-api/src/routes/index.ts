import express from 'express';
import authRoutes from './auth.js';
import partnersRoutes from './partners.js';
import productsRoutes from './products.js';
import leadsRoutes from './leads.js';
import saleOrdersRoutes from './saleOrders.js';
import invoicesRoutes from './invoices.js';
import manufacturingRoutes from './manufacturing.js';
import manufacturingBomRoutes from './manufacturingBom.js';
import manufacturingRoutingRoutes from './manufacturingRouting.js';
import manufacturingWorkOrdersRoutes from './manufacturingWorkOrders.js';
import manufacturingQualityRoutes from './manufacturingQuality.js';
import manufacturingCostingRoutes from './manufacturingCosting.js';
import campaignsRoutes from './campaigns.js';
import marketingRoutes from './marketing.js';
import posRoutes from './pos.js';
import websiteRoutes from './website.js';
import websiteSitesRoutes from './websiteSites.js';
import websiteMediaRoutes from './websiteMedia.js';
import websiteProductsRoutes from './websiteProducts.js';
import websiteCartRoutes from './websiteCart.js';
import websiteOrdersRoutes from './websiteOrders.js';
import websitePromotionsRoutes from './websitePromotions.js';
import activitiesRoutes from './activities.js';
// Projects Module Routes
import projectsRoutes from './projects.js';
import projectTasksRoutes from './projectTasks.js';
import projectTimesheetsRoutes from './projectTimesheets.js';
import projectFinancialsRoutes from './projectFinancials.js';
import projectRisksIssuesRoutes from './projectRisksIssues.js';
import projectAgileRoutes from './projectAgile.js';
import projectWikiRoutes from './projectWiki.js';
import projectQualityRoutes from './projectQuality.js';
import projectResourcesRoutes from './projectResources.js';
import projectProcurementRoutes from './projectProcurement.js';
import projectChangeRequestsRoutes from './projectChangeRequests.js';
import projectAnalyticsRoutes from './projectAnalytics.js';
// HR Module Routes
import employeesRoutes from './employees.js';
import attendanceRoutes from './attendance.js';
import leaveRoutes from './leave.js';
import payrollRoutes from './payroll.js';
import appraisalsRoutes from './appraisals.js';
import coursesRoutes from './courses.js';
import applicantsRoutes from './applicants.js';
import policiesRoutes from './policies.js';
import supportTicketsRoutes from './supportTickets.js';
// Sales Module Routes
import salesPricingRoutes from './salesPricing.js';
import salesContractsRoutes from './salesContracts.js';
import salesDeliveryRoutes from './salesDelivery.js';
import salesReturnsRoutes from './salesReturns.js';
import salesForecastingRoutes from './salesForecasting.js';
import salesTeamRoutes from './salesTeam.js';
import salesAnalyticsRoutes from './salesAnalytics.js';
// Inventory Module Routes
import inventoryRoutes from './inventory.js';
// RBAC Module Routes
import rbacRoutes from './rbac.js';
import crmRbacRoutes from './crm-rbac.js';
// Accounting Module Routes
import accountingChartOfAccountsRoutes from './accountingChartOfAccounts.js';
import accountingJournalEntriesRoutes from './accountingJournalEntries.js';
import accountingAccountsPayableRoutes from './accountingAccountsPayable.js';
import accountingAccountsReceivableRoutes from './accountingAccountsReceivable.js';
import accountingBankManagementRoutes from './accountingBankManagement.js';
import accountingFixedAssetsRoutes from './accountingFixedAssets.js';
import accountingTaxRoutes from './accountingTax.js';
import accountingFinancialReportsRoutes from './accountingFinancialReports.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/partners', partnersRoutes);
router.use('/products', productsRoutes);
router.use('/leads', leadsRoutes);
router.use('/sale-orders', saleOrdersRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/manufacturing', manufacturingRoutes);
router.use('/manufacturing/bom', manufacturingBomRoutes);
router.use('/manufacturing/routing', manufacturingRoutingRoutes);
router.use('/manufacturing/work-orders', manufacturingWorkOrdersRoutes);
router.use('/manufacturing/quality', manufacturingQualityRoutes);
router.use('/manufacturing/costing', manufacturingCostingRoutes);
router.use('/campaigns', campaignsRoutes);
router.use('/marketing', marketingRoutes);
router.use('/pos', posRoutes);
router.use('/website', websiteRoutes);
router.use('/website/sites', websiteSitesRoutes);
router.use('/website/media', websiteMediaRoutes);
router.use('/website/products', websiteProductsRoutes);
router.use('/website/cart', websiteCartRoutes);
router.use('/website/orders', websiteOrdersRoutes);
router.use('/website/promotions', websitePromotionsRoutes);
router.use('/activities', activitiesRoutes);
// Projects Module
router.use('/projects', projectsRoutes);
router.use('/projects', projectTasksRoutes);
router.use('/projects', projectTimesheetsRoutes);
router.use('/projects', projectFinancialsRoutes);
router.use('/projects', projectRisksIssuesRoutes);
router.use('/projects', projectAgileRoutes);
router.use('/projects', projectWikiRoutes);
router.use('/projects', projectQualityRoutes);
router.use('/projects', projectResourcesRoutes);
router.use('/projects', projectProcurementRoutes);
router.use('/projects', projectChangeRequestsRoutes);
router.use('/projects', projectAnalyticsRoutes);
// HR Module Routes
router.use('/employees', employeesRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/appraisals', appraisalsRoutes);
router.use('/courses', coursesRoutes);
router.use('/applicants', applicantsRoutes);
router.use('/policies', policiesRoutes);
// Support Desk Module
router.use('/support-tickets', supportTicketsRoutes);
// Sales Module Routes
router.use('/sales/pricing', salesPricingRoutes);
router.use('/sales/contracts', salesContractsRoutes);
router.use('/sales/delivery', salesDeliveryRoutes);
router.use('/sales/returns', salesReturnsRoutes);
router.use('/sales/forecasting', salesForecastingRoutes);
router.use('/sales/team', salesTeamRoutes);
router.use('/sales/analytics', salesAnalyticsRoutes);
// Inventory Module
router.use('/inventory', inventoryRoutes);
// RBAC Module
router.use('/rbac', rbacRoutes);
router.use('/crm-rbac', crmRbacRoutes);
// Accounting Module
router.use('/accounting/chart-of-accounts', accountingChartOfAccountsRoutes);
router.use('/accounting/journal-entries', accountingJournalEntriesRoutes);
router.use('/accounting/accounts-payable', accountingAccountsPayableRoutes);
router.use('/accounting/accounts-receivable', accountingAccountsReceivableRoutes);
router.use('/accounting/bank', accountingBankManagementRoutes);
router.use('/accounting/fixed-assets', accountingFixedAssetsRoutes);
router.use('/accounting/tax', accountingTaxRoutes);
router.use('/accounting/reports', accountingFinancialReportsRoutes);

export default router;
