import express from 'express';
import { requireModule } from '../shared/middleware/moduleGuard.js';
import authRoutes from '../modules/admin/routes/auth.js';
import partnersRoutes from '../modules/inventory/routes/partners.js';
import productsRoutes from '../modules/inventory/routes/products.js';
import leadsRoutes from '../modules/crm/routes/leads.js';
import saleOrdersRoutes from '../modules/sales/routes/saleOrders.js';
import invoicesRoutes from '../modules/sales/routes/invoices.js';
import manufacturingRoutes from '../modules/manufacturing/routes/manufacturing.js';
import manufacturingBomRoutes from '../modules/manufacturing/routes/manufacturingBom.js';
import manufacturingRoutingRoutes from '../modules/manufacturing/routes/manufacturingRouting.js';
import manufacturingWorkOrdersRoutes from '../modules/manufacturing/routes/manufacturingWorkOrders.js';
import manufacturingQualityRoutes from '../modules/manufacturing/routes/manufacturingQuality.js';
import manufacturingCostingRoutes from '../modules/manufacturing/routes/manufacturingCosting.js';
import campaignsRoutes from '../modules/marketing/routes/campaigns.js';
import marketingRoutes from '../modules/marketing/routes/marketing.js';
import posRoutes from '../modules/pos/routes/pos.js';
import websiteRoutes from '../modules/website/routes/website.js';
import websiteSitesRoutes from '../modules/website/routes/websiteSites.js';
import websiteMediaRoutes from '../modules/website/routes/websiteMedia.js';
import websiteProductsRoutes from '../modules/website/routes/websiteProducts.js';
import websiteCartRoutes from '../modules/website/routes/websiteCart.js';
import websiteOrdersRoutes from '../modules/website/routes/websiteOrders.js';
import websitePromotionsRoutes from '../modules/website/routes/websitePromotions.js';
import activitiesRoutes from '../modules/admin/routes/activities.js';
// Projects Module Routes
import projectsRoutes from '../modules/projects/routes/projects.js';
import projectTasksRoutes from '../modules/projects/routes/projectTasks.js';
import projectTimesheetsRoutes from '../modules/projects/routes/projectTimesheets.js';
import projectFinancialsRoutes from '../modules/projects/routes/projectFinancials.js';
import projectRisksIssuesRoutes from '../modules/projects/routes/projectRisksIssues.js';
import projectAgileRoutes from '../modules/projects/routes/projectAgile.js';
import projectWikiRoutes from '../modules/projects/routes/projectWiki.js';
import projectQualityRoutes from '../modules/projects/routes/projectQuality.js';
import projectResourcesRoutes from '../modules/projects/routes/projectResources.js';
import projectProcurementRoutes from '../modules/projects/routes/projectProcurement.js';
import projectChangeRequestsRoutes from '../modules/projects/routes/projectChangeRequests.js';
import projectAnalyticsRoutes from '../modules/projects/routes/projectAnalytics.js';
// HR Module Routes
import employeesRoutes from '../modules/hr/routes/employees.js';
import attendanceRoutes from '../modules/hr/routes/attendance.js';
import leaveRoutes from '../modules/hr/routes/leave.js';
import payrollRoutes from '../modules/hr/routes/payroll.js';
import appraisalsRoutes from '../modules/hr/routes/appraisals.js';
import goalsRoutes from '../modules/hr/routes/goals.js';
import coursesRoutes from '../modules/hr/routes/courses.js';
import applicantsRoutes from '../modules/hr/routes/applicants.js';
import policiesRoutes from '../modules/hr/routes/policies.js';
import supportTicketsRoutes from '../modules/support/routes/supportTickets.js';
import emailWebhookRoutes from '../modules/crossmodule/routes/emailWebhook.js';
// Sales Module Routes
import salesPricingRoutes from '../modules/sales/routes/salesPricing.js';
import salesContractsRoutes from '../modules/sales/routes/salesContracts.js';
import salesDeliveryRoutes from '../modules/sales/routes/salesDelivery.js';
import salesReturnsRoutes from '../modules/sales/routes/salesReturns.js';
import salesForecastingRoutes from '../modules/sales/routes/salesForecasting.js';
import salesTeamRoutes from '../modules/sales/routes/salesTeam.js';
import salesAnalyticsRoutes from '../modules/sales/routes/salesAnalytics.js';
// Inventory Module Routes
import inventoryRoutes from '../modules/inventory/routes/inventory.js';
// RBAC Module Routes
import rbacRoutes from '../modules/admin/routes/rbac.js';
import crmRbacRoutes from '../modules/crm/routes/crm-rbac.js';
// CRM Module Routes
import crmRoutes from '../modules/crm/routes/crm.js';
// Accounting Module Routes
import accountingChartOfAccountsRoutes from '../modules/accounting/routes/accountingChartOfAccounts.js';
import accountingJournalEntriesRoutes from '../modules/accounting/routes/accountingJournalEntries.js';
import accountingAccountsPayableRoutes from '../modules/accounting/routes/accountingAccountsPayable.js';
import accountingAccountsReceivableRoutes from '../modules/accounting/routes/accountingAccountsReceivable.js';
import accountingBankManagementRoutes from '../modules/accounting/routes/accountingBankManagement.js';
import accountingFixedAssetsRoutes from '../modules/accounting/routes/accountingFixedAssets.js';
import accountingTaxRoutes from '../modules/accounting/routes/accountingTax.js';
import accountingFinancialReportsRoutes from '../modules/accounting/routes/accountingFinancialReports.js';
// E-Signature Module Routes
import esignatureRoutes from '../modules/esignature/routes/esignature.js';
// CRM - Deals & Pipelines
import dealsRoutes from '../modules/crm/routes/deals.js';
import pipelinesRoutes from '../modules/crm/routes/pipelines.js';
// Platform Module Routes
import workflowsRoutes from '../modules/platform/routes/workflows.js';
import integrationsRoutes from '../modules/platform/routes/integrations.js';
import reportsRoutes from '../modules/platform/routes/reports.js';
import dashboardsRoutes from '../modules/platform/routes/dashboards.js';
// Tenant Config Routes
import tenantConfigRoutes from '../modules/admin/routes/tenantConfig.js';
// New module routes
import liveChatRoutes from '../modules/support/routes/liveChat.js';
import tdsRoutes from '../modules/accounting/routes/tds.js';
import gstReturnsRoutes from '../modules/accounting/routes/gstReturns.js';
import eInvoiceRoutes from '../modules/accounting/routes/eInvoice.js';
import customFieldsRoutes from '../modules/platform/routes/customFields.js';
import securityDashboardRoutes from '../modules/platform/routes/security-dashboard.js';
// GDPR / Compliance Routes
import consentRoutes from '../modules/platform/routes/consent.js';
import dsarRoutes from '../modules/platform/routes/dsar.js';
import complianceRoutes from '../modules/platform/routes/compliance.js';
import stockReservationsRoutes from '../modules/inventory/routes/stockReservations.js';
import paymentsRoutes from '../modules/crossmodule/routes/payments.js';
import filesRoutes from '../modules/crossmodule/routes/files.js';
import twoFactorRoutes from '../modules/admin/routes/twoFactor.js';
import whatsappWebhookRoutes from '../modules/crossmodule/routes/whatsappWebhook.js';
import taxComplianceRoutes from '../modules/hr/routes/taxCompliance.js';
import rfmRoutes from '../modules/crm/routes/rfm.js';
import mrpRoutes from '../modules/manufacturing/routes/mrp.js';
// Support Module — additional routes
import supportTeamsRoutes from '../modules/support/routes/supportTeams.js';
import supportSurveysRoutes from '../modules/support/routes/supportSurveys.js';
import supportChatRoutes from '../modules/support/routes/supportChat.js';
import supportAutomationRoutes from '../modules/support/routes/supportAutomation.js';
import supportReportsRoutes from '../modules/support/routes/supportReports.js';
import slaPoliciesRoutes from '../modules/support/routes/slaPolicies.js';
import cannedResponsesRoutes from '../modules/support/routes/cannedResponses.js';
import knowledgeBaseRoutes from '../modules/support/routes/knowledgeBase.js';
import itsmRoutes from '../modules/support/routes/itsm.js';
// Projects — standalone issue types
import issueTypesRoutes from '../modules/projects/routes/issueTypes.js';

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
router.use('/support-teams', requireModule('support'), supportTeamsRoutes);
router.use('/support-chat', requireModule('support'), supportChatRoutes);
router.use('/support-surveys', requireModule('support'), supportSurveysRoutes);
router.use('/support-automation', requireModule('support'), supportAutomationRoutes);
router.use('/support-reports', requireModule('support'), supportReportsRoutes);
router.use('/sla-policies', requireModule('support'), slaPoliciesRoutes);
router.use('/canned-responses', requireModule('support'), cannedResponsesRoutes);
router.use('/knowledge-base', requireModule('support'), knowledgeBaseRoutes);
router.use('/itsm', requireModule('support'), itsmRoutes);

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
router.use('/issue-types', requireModule('projects'), issueTypesRoutes);

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
router.use('/consent', consentRoutes);
router.use('/dsar', requireModule('platform'), dsarRoutes);
router.use('/compliance', requireModule('platform'), complianceRoutes);
router.use('/security-dashboard', requireModule('platform'), securityDashboardRoutes);

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
