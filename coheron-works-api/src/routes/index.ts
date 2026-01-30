import express from 'express';
import { requireModule } from '../middleware/moduleGuard.js';
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
import goalsRoutes from './goals.js';
import coursesRoutes from './courses.js';
import applicantsRoutes from './applicants.js';
import policiesRoutes from './policies.js';
import supportTicketsRoutes from './supportTickets.js';
import emailWebhookRoutes from './emailWebhook.js';
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
// CRM Module Routes
import crmRoutes from './crm.js';
// Accounting Module Routes
import accountingChartOfAccountsRoutes from './accountingChartOfAccounts.js';
import accountingJournalEntriesRoutes from './accountingJournalEntries.js';
import accountingAccountsPayableRoutes from './accountingAccountsPayable.js';
import accountingAccountsReceivableRoutes from './accountingAccountsReceivable.js';
import accountingBankManagementRoutes from './accountingBankManagement.js';
import accountingFixedAssetsRoutes from './accountingFixedAssets.js';
import accountingTaxRoutes from './accountingTax.js';
import accountingFinancialReportsRoutes from './accountingFinancialReports.js';
// E-Signature Module Routes
import esignatureRoutes from './esignature.js';
// CRM - Deals & Pipelines
import dealsRoutes from './deals.js';
import pipelinesRoutes from './pipelines.js';
// Platform Module Routes
import workflowsRoutes from './workflows.js';
import integrationsRoutes from './integrations.js';
import reportsRoutes from './reports.js';
import dashboardsRoutes from './dashboards.js';
// Tenant Config Routes
import tenantConfigRoutes from './tenantConfig.js';
// New module routes
import liveChatRoutes from './liveChat.js';
import tdsRoutes from './tds.js';
import gstReturnsRoutes from './gstReturns.js';
import eInvoiceRoutes from './eInvoice.js';
import customFieldsRoutes from './customFields.js';
import stockReservationsRoutes from './stockReservations.js';
import paymentsRoutes from './payments.js';
import filesRoutes from './files.js';
import twoFactorRoutes from './twoFactor.js';
import whatsappWebhookRoutes from './whatsappWebhook.js';
import taxComplianceRoutes from './taxCompliance.js';
import rfmRoutes from './rfm.js';
import mrpRoutes from './mrp.js';

const router = express.Router();

// WhatsApp webhook (public, no auth — must be before auth middleware)
router.use('/whatsapp', whatsappWebhookRoutes);

// Always-available routes (no module guard)
router.use('/auth', authRoutes);
router.use('/auth/2fa', twoFactorRoutes);
router.use('/partners', partnersRoutes);
router.use('/rbac', rbacRoutes);
router.use('/activities', activitiesRoutes);
router.use('/email-webhook', emailWebhookRoutes);
router.use('/tenant-config', tenantConfigRoutes);

// CRM Module
router.use('/crm/rfm', requireModule('crm'), rfmRoutes);
router.use('/leads', requireModule('crm'), leadsRoutes);
router.use('/deals', requireModule('crm'), dealsRoutes);
router.use('/pipelines', requireModule('crm'), pipelinesRoutes);
router.use('/crm', requireModule('crm'), crmRoutes);
router.use('/crm-rbac', requireModule('crm'), crmRbacRoutes);

// Sales Module
router.use('/sale-orders', requireModule('sales'), saleOrdersRoutes);
router.use('/sales/pricing', requireModule('sales'), salesPricingRoutes);
router.use('/sales/contracts', requireModule('sales'), salesContractsRoutes);
router.use('/sales/delivery', requireModule('sales'), salesDeliveryRoutes);
router.use('/sales/returns', requireModule('sales'), salesReturnsRoutes);
router.use('/sales/forecasting', requireModule('sales'), salesForecastingRoutes);
router.use('/sales/team', requireModule('sales'), salesTeamRoutes);
router.use('/sales/analytics', requireModule('sales'), salesAnalyticsRoutes);
router.use('/invoices', requireModule('sales'), invoicesRoutes);

// Support Module
router.use('/support-tickets', requireModule('support'), supportTicketsRoutes);

// HR Module
router.use('/employees', requireModule('hr'), employeesRoutes);
router.use('/attendance', requireModule('hr'), attendanceRoutes);
router.use('/leave', requireModule('hr'), leaveRoutes);
router.use('/payroll', requireModule('hr'), payrollRoutes);
router.use('/appraisals', requireModule('hr'), appraisalsRoutes);
router.use('/goals', requireModule('hr'), goalsRoutes);
router.use('/courses', requireModule('hr'), coursesRoutes);
router.use('/applicants', requireModule('hr'), applicantsRoutes);
router.use('/policies', requireModule('hr'), policiesRoutes);

// HR - Tax Compliance
router.use('/hr/tax', requireModule('hr'), taxComplianceRoutes);

// Manufacturing Module
router.use('/manufacturing', requireModule('manufacturing'), manufacturingRoutes);
router.use('/manufacturing/bom', requireModule('manufacturing'), manufacturingBomRoutes);
router.use('/manufacturing/routing', requireModule('manufacturing'), manufacturingRoutingRoutes);
router.use('/manufacturing/work-orders', requireModule('manufacturing'), manufacturingWorkOrdersRoutes);
router.use('/manufacturing/quality', requireModule('manufacturing'), manufacturingQualityRoutes);
router.use('/manufacturing/costing', requireModule('manufacturing'), manufacturingCostingRoutes);
router.use('/manufacturing/mrp', requireModule('manufacturing'), mrpRoutes);

// Inventory Module
router.use('/inventory', requireModule('inventory'), inventoryRoutes);
router.use('/products', requireModule('inventory'), productsRoutes);

// Accounting Module
router.use('/accounting/chart-of-accounts', requireModule('accounting'), accountingChartOfAccountsRoutes);
router.use('/accounting/journal-entries', requireModule('accounting'), accountingJournalEntriesRoutes);
router.use('/accounting/accounts-payable', requireModule('accounting'), accountingAccountsPayableRoutes);
router.use('/accounting/accounts-receivable', requireModule('accounting'), accountingAccountsReceivableRoutes);
router.use('/accounting/bank', requireModule('accounting'), accountingBankManagementRoutes);
router.use('/accounting/fixed-assets', requireModule('accounting'), accountingFixedAssetsRoutes);
router.use('/accounting/tax', requireModule('accounting'), accountingTaxRoutes);
router.use('/accounting/reports', requireModule('accounting'), accountingFinancialReportsRoutes);

// Marketing Module
router.use('/campaigns', requireModule('marketing'), campaignsRoutes);
router.use('/marketing', requireModule('marketing'), marketingRoutes);

// Projects Module
router.use('/projects', requireModule('projects'), projectsRoutes);
router.use('/projects', requireModule('projects'), projectTasksRoutes);
router.use('/projects', requireModule('projects'), projectTimesheetsRoutes);
router.use('/projects', requireModule('projects'), projectFinancialsRoutes);
router.use('/projects', requireModule('projects'), projectRisksIssuesRoutes);
router.use('/projects', requireModule('projects'), projectAgileRoutes);
router.use('/projects', requireModule('projects'), projectWikiRoutes);
router.use('/projects', requireModule('projects'), projectQualityRoutes);
router.use('/projects', requireModule('projects'), projectResourcesRoutes);
router.use('/projects', requireModule('projects'), projectProcurementRoutes);
router.use('/projects', requireModule('projects'), projectChangeRequestsRoutes);
router.use('/projects', requireModule('projects'), projectAnalyticsRoutes);

// POS Module
router.use('/pos', requireModule('pos'), posRoutes);

// Website Module
router.use('/website', requireModule('website'), websiteRoutes);
router.use('/website/sites', requireModule('website'), websiteSitesRoutes);
router.use('/website/media', requireModule('website'), websiteMediaRoutes);
router.use('/website/products', requireModule('website'), websiteProductsRoutes);
router.use('/website/cart', requireModule('website'), websiteCartRoutes);
router.use('/website/orders', requireModule('website'), websiteOrdersRoutes);
router.use('/website/promotions', requireModule('website'), websitePromotionsRoutes);

// E-Signature Module
router.use('/esignature', requireModule('esignature'), esignatureRoutes);

// Platform Module
router.use('/workflows', requireModule('platform'), workflowsRoutes);
router.use('/integrations', requireModule('platform'), integrationsRoutes);
router.use('/reports', requireModule('platform'), reportsRoutes);
router.use('/dashboards', requireModule('platform'), dashboardsRoutes);
router.use('/custom-fields', requireModule('platform'), customFieldsRoutes);

// Live Chat (Support Module)
router.use('/live-chat', requireModule('support'), liveChatRoutes);

// Accounting - India Compliance
router.use('/accounting/tds', requireModule('accounting'), tdsRoutes);
router.use('/accounting/gst-returns', requireModule('accounting'), gstReturnsRoutes);
router.use('/accounting/e-invoice', requireModule('accounting'), eInvoiceRoutes);

// Inventory - Stock Reservations
router.use('/inventory/reservations', requireModule('inventory'), stockReservationsRoutes);

// Payments (no module guard - cross-module)
router.use('/payments', paymentsRoutes);

// File Storage (no module guard - cross-module)
router.use('/files', filesRoutes);

export default router;
