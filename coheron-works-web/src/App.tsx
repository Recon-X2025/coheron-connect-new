import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/LoadingSpinner';

// Lazy-loaded pages & modules
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Subscription = lazy(() => import('./pages/Subscription').then(m => ({ default: m.Subscription })));
const AdminPortal = lazy(() => import('./pages/AdminPortal'));

// Support pages
const SupportTickets = lazy(() => import('./pages/SupportTickets'));
const SupportDashboard = lazy(() => import('./pages/SupportDashboard').then(m => ({ default: m.SupportDashboard })));
const AgentWorkbench = lazy(() => import('./pages/AgentWorkbench').then(m => ({ default: m.AgentWorkbench })));
const KnowledgeBase = lazy(() => import('./pages/KnowledgeBase').then(m => ({ default: m.KnowledgeBase })));
const SupportReports = lazy(() => import('./pages/SupportReports').then(m => ({ default: m.SupportReports })));
const SurveyManagement = lazy(() => import('./pages/SurveyManagement').then(m => ({ default: m.SurveyManagement })));
const ITSM = lazy(() => import('./pages/ITSM'));
const AutomationBuilder = lazy(() => import('./pages/AutomationBuilder'));

// Projects
const Projects = lazy(() => import('./pages/Projects').then(m => ({ default: m.Projects })));
const ProjectsDashboard = lazy(() => import('./pages/ProjectsDashboard').then(m => ({ default: m.ProjectsDashboard })));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail').then(m => ({ default: m.ProjectDetail })));

// CRM
const CRMDashboard = lazy(() => import('./modules/crm/CRMDashboard').then(m => ({ default: m.CRMDashboard })));
const CRMPipeline = lazy(() => import('./modules/crm/CRMPipeline').then(m => ({ default: m.CRMPipeline })));
const LeadsList = lazy(() => import('./modules/crm/LeadsList').then(m => ({ default: m.LeadsList })));
const Opportunities = lazy(() => import('./modules/crm/Opportunities').then(m => ({ default: m.Opportunities })));
const Customers = lazy(() => import('./modules/crm/Customers').then(m => ({ default: m.Customers })));
const TasksCalendar = lazy(() => import('./modules/crm/TasksCalendar').then(m => ({ default: m.TasksCalendar })));
const AutomationEngine = lazy(() => import('./modules/crm/AutomationEngine').then(m => ({ default: m.AutomationEngine })));

// Sales
const SalesDashboard = lazy(() => import('./modules/sales/SalesDashboard').then(m => ({ default: m.SalesDashboard })));
const SalesOrders = lazy(() => import('./modules/sales/SalesOrders').then(m => ({ default: m.SalesOrders })));
const Quotations = lazy(() => import('./modules/sales/Quotations').then(m => ({ default: m.Quotations })));
const PricingManagement = lazy(() => import('./modules/sales/PricingManagement').then(m => ({ default: m.PricingManagement })));
const ContractsManagement = lazy(() => import('./modules/sales/ContractsManagement').then(m => ({ default: m.ContractsManagement })));
const DeliveryTracking = lazy(() => import('./modules/sales/DeliveryTracking').then(m => ({ default: m.DeliveryTracking })));
const ReturnsManagement = lazy(() => import('./modules/sales/ReturnsManagement').then(m => ({ default: m.ReturnsManagement })));
const SalesForecasting = lazy(() => import('./modules/sales/SalesForecasting').then(m => ({ default: m.SalesForecasting })));
const SalesTeamPerformance = lazy(() => import('./modules/sales/SalesTeamPerformance').then(m => ({ default: m.SalesTeamPerformance })));

// Inventory
const Products = lazy(() => import('./modules/inventory/Products').then(m => ({ default: m.Products })));
const Inventory = lazy(() => import('./modules/inventory/Inventory').then(m => ({ default: m.Inventory })));
const Warehouses = lazy(() => import('./modules/inventory/Warehouses').then(m => ({ default: m.Warehouses })));
const InventoryDashboard = lazy(() => import('./modules/inventory/InventoryDashboard').then(m => ({ default: m.InventoryDashboard })));
const StockMovements = lazy(() => import('./modules/inventory/StockMovements').then(m => ({ default: m.StockMovements })));
const BatchSerialManagement = lazy(() => import('./modules/inventory/BatchSerialManagement').then(m => ({ default: m.BatchSerialManagement })));
const WarehouseOperations = lazy(() => import('./modules/inventory/WarehouseOperations').then(m => ({ default: m.WarehouseOperations })));
const StockReports = lazy(() => import('./modules/inventory/StockReports').then(m => ({ default: m.StockReports })));
const InventorySettings = lazy(() => import('./modules/inventory/InventorySettings').then(m => ({ default: m.InventorySettings })));

// Accounting
const Invoices = lazy(() => import('./modules/accounting/Invoices').then(m => ({ default: m.Invoices })));
const AccountingDashboard = lazy(() => import('./modules/accounting/AccountingDashboard').then(m => ({ default: m.AccountingDashboard })));
const ChartOfAccounts = lazy(() => import('./modules/accounting/ChartOfAccounts').then(m => ({ default: m.ChartOfAccounts })));
const JournalEntries = lazy(() => import('./modules/accounting/JournalEntries').then(m => ({ default: m.JournalEntries })));
const AccountsPayable = lazy(() => import('./modules/accounting/AccountsPayable').then(m => ({ default: m.AccountsPayable })));
const FinancialReports = lazy(() => import('./modules/accounting/FinancialReports').then(m => ({ default: m.FinancialReports })));

// HR
const Employees = lazy(() => import('./modules/hr/Employees').then(m => ({ default: m.Employees })));
const HRDashboard = lazy(() => import('./modules/hr/HRDashboard').then(m => ({ default: m.HRDashboard })));
const HRModules = lazy(() => import('./modules/hr/HRModules').then(m => ({ default: m.HRModules })));
const Payroll = lazy(() => import('./modules/hr/Payroll').then(m => ({ default: m.Payroll })));
const Recruitment = lazy(() => import('./modules/hr/Recruitment').then(m => ({ default: m.Recruitment })));
const Policies = lazy(() => import('./modules/hr/Policies').then(m => ({ default: m.Policies })));
const Appraisals = lazy(() => import('./modules/hr/Appraisals').then(m => ({ default: m.Appraisals })));
const LMS = lazy(() => import('./modules/hr/LMS').then(m => ({ default: m.LMS })));
const Attendance = lazy(() => import('./modules/hr/Attendance').then(m => ({ default: m.Attendance })));
const LeaveManagement = lazy(() => import('./modules/hr/LeaveManagement').then(m => ({ default: m.LeaveManagement })));
const Onboarding = lazy(() => import('./modules/hr/Onboarding').then(m => ({ default: m.Onboarding })));
const Offboarding = lazy(() => import('./modules/hr/Offboarding').then(m => ({ default: m.Offboarding })));

// Manufacturing
const ManufacturingOrders = lazy(() => import('./modules/manufacturing/ManufacturingOrders').then(m => ({ default: m.ManufacturingOrders })));
const ManufacturingDashboard = lazy(() => import('./modules/manufacturing/ManufacturingDashboard').then(m => ({ default: m.ManufacturingDashboard })));
const BOMManagement = lazy(() => import('./modules/manufacturing/BOMManagement'));
const RoutingManagement = lazy(() => import('./modules/manufacturing/RoutingManagement'));
const WorkOrders = lazy(() => import('./modules/manufacturing/WorkOrders'));
const QualityControl = lazy(() => import('./modules/manufacturing/QualityControl'));
const CostingAnalytics = lazy(() => import('./modules/manufacturing/CostingAnalytics'));

// Marketing
const Campaigns = lazy(() => import('./modules/marketing/Campaigns').then(m => ({ default: m.Campaigns })));
const MarketingDashboard = lazy(() => import('./modules/marketing/MarketingDashboard').then(m => ({ default: m.MarketingDashboard })));

// POS
const POSInterface = lazy(() => import('./modules/pos/POSInterface'));
const POSDashboard = lazy(() => import('./modules/pos/POSDashboard').then(m => ({ default: m.POSDashboard })));
const POSSessions = lazy(() => import('./modules/pos/POSSessions').then(m => ({ default: m.POSSessions })));
const POSTerminals = lazy(() => import('./modules/pos/POSTerminals').then(m => ({ default: m.POSTerminals })));

// Support module
const CustomerPortal = lazy(() => import('./modules/support/CustomerPortal').then(m => ({ default: m.CustomerPortal })));

// Website
const Website = lazy(() => import('./modules/website/Website'));
const WebsiteDashboard = lazy(() => import('./modules/website/WebsiteDashboard').then(m => ({ default: m.WebsiteDashboard })));
const WebsiteAnalytics = lazy(() => import('./modules/website/components/WebsiteAnalytics').then(m => ({ default: m.WebsiteAnalytics })));
const PageBuilder = lazy(() => import('./modules/website/components/PageBuilder').then(m => ({ default: m.PageBuilder })));
const ProductCatalog = lazy(() => import('./modules/website/components/ProductCatalog').then(m => ({ default: m.ProductCatalog })));
const SiteSettings = lazy(() => import('./modules/website/components/SiteSettings').then(m => ({ default: m.SiteSettings })));
const Promotions = lazy(() => import('./modules/website/components/Promotions').then(m => ({ default: m.Promotions })));
const MediaLibrary = lazy(() => import('./modules/website/components/MediaLibrary').then(m => ({ default: m.MediaLibrary })));
const CartCheckout = lazy(() => import('./modules/website/components/CartCheckout').then(m => ({ default: m.CartCheckout })));

// Admin
const RolesManagement = lazy(() => import('./modules/admin/RolesManagement').then(m => ({ default: m.RolesManagement })));
const PermissionsManagement = lazy(() => import('./modules/admin/PermissionsManagement').then(m => ({ default: m.PermissionsManagement })));
const UserRoleAssignments = lazy(() => import('./modules/admin/UserRoleAssignments').then(m => ({ default: m.UserRoleAssignments })));
const AuditLogsViewer = lazy(() => import('./modules/admin/AuditLogsViewer').then(m => ({ default: m.AuditLogsViewer })));

// E-Signature
const ESignature = lazy(() => import('./modules/esignature/ESignature').then(m => ({ default: m.ESignature })));

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingSpinner size="large" message="Loading..." />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/pricing" element={<Layout><Pricing /></Layout>} />

          {/* App routes with Layout */}
          <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />

          {/* CRM */}
          <Route path="/crm/dashboard" element={<Layout><CRMDashboard /></Layout>} />
          <Route path="/crm/pipeline" element={<Layout><CRMPipeline /></Layout>} />
          <Route path="/crm/leads" element={<Layout><LeadsList /></Layout>} />
          <Route path="/crm/opportunities" element={<Layout><Opportunities /></Layout>} />
          <Route path="/crm/customers" element={<Layout><Customers /></Layout>} />
          <Route path="/crm/tasks" element={<Layout><TasksCalendar /></Layout>} />
          <Route path="/crm/automation" element={<Layout><AutomationEngine /></Layout>} />

          {/* Sales */}
          <Route path="/sales/dashboard" element={<Layout><SalesDashboard /></Layout>} />
          <Route path="/sales/orders" element={<Layout><SalesOrders /></Layout>} />
          <Route path="/sales/quotations" element={<Layout><Quotations /></Layout>} />
          <Route path="/sales/pricing" element={<Layout><PricingManagement /></Layout>} />
          <Route path="/sales/contracts" element={<Layout><ContractsManagement /></Layout>} />
          <Route path="/sales/delivery" element={<Layout><DeliveryTracking /></Layout>} />
          <Route path="/sales/returns" element={<Layout><ReturnsManagement /></Layout>} />
          <Route path="/sales/forecasting" element={<Layout><SalesForecasting /></Layout>} />
          <Route path="/sales/team" element={<Layout><SalesTeamPerformance /></Layout>} />

          {/* Inventory */}
          <Route path="/inventory" element={<Layout><Inventory /></Layout>} />
          <Route path="/inventory/dashboard" element={<Layout><InventoryDashboard /></Layout>} />
          <Route path="/inventory/products" element={<Layout><Products /></Layout>} />
          <Route path="/inventory/warehouses" element={<Layout><Warehouses /></Layout>} />
          <Route path="/inventory/movements" element={<Layout><StockMovements /></Layout>} />
          <Route path="/inventory/batch-serial" element={<Layout><BatchSerialManagement /></Layout>} />
          <Route path="/inventory/warehouse-ops" element={<Layout><WarehouseOperations /></Layout>} />
          <Route path="/inventory/reports" element={<Layout><StockReports /></Layout>} />
          <Route path="/inventory/settings" element={<Layout><InventorySettings /></Layout>} />

          {/* Accounting */}
          <Route path="/accounting/dashboard" element={<Layout><AccountingDashboard /></Layout>} />
          <Route path="/accounting/invoices" element={<Layout><Invoices /></Layout>} />
          <Route path="/accounting/chart-of-accounts" element={<Layout><ChartOfAccounts /></Layout>} />
          <Route path="/accounting/journal-entries" element={<Layout><JournalEntries /></Layout>} />
          <Route path="/accounting/accounts-payable" element={<Layout><AccountsPayable /></Layout>} />
          <Route path="/accounting/reports" element={<Layout><FinancialReports /></Layout>} />

          {/* HR */}
          <Route path="/hr" element={<Layout><HRDashboard /></Layout>} />
          <Route path="/hr/modules" element={<Layout><HRModules /></Layout>} />
          <Route path="/hr/employees" element={<Layout><Employees /></Layout>} />
          <Route path="/hr/payroll" element={<Layout><Payroll /></Layout>} />
          <Route path="/hr/recruitment" element={<Layout><Recruitment /></Layout>} />
          <Route path="/hr/policies" element={<Layout><Policies /></Layout>} />
          <Route path="/hr/appraisals" element={<Layout><Appraisals /></Layout>} />
          <Route path="/hr/lms" element={<Layout><LMS /></Layout>} />
          <Route path="/hr/attendance" element={<Layout><Attendance /></Layout>} />
          <Route path="/hr/leave" element={<Layout><LeaveManagement /></Layout>} />
          <Route path="/hr/onboarding" element={<Layout><Onboarding /></Layout>} />
          <Route path="/hr/offboarding" element={<Layout><Offboarding /></Layout>} />

          {/* Manufacturing */}
          <Route path="/manufacturing/dashboard" element={<Layout><ManufacturingDashboard /></Layout>} />
          <Route path="/manufacturing/orders" element={<Layout><ManufacturingOrders /></Layout>} />
          <Route path="/manufacturing/bom" element={<Layout><BOMManagement /></Layout>} />
          <Route path="/manufacturing/routing" element={<Layout><RoutingManagement /></Layout>} />
          <Route path="/manufacturing/work-orders" element={<Layout><WorkOrders /></Layout>} />
          <Route path="/manufacturing/quality" element={<Layout><QualityControl /></Layout>} />
          <Route path="/manufacturing/costing" element={<Layout><CostingAnalytics /></Layout>} />

          {/* Marketing */}
          <Route path="/marketing/dashboard" element={<Layout><MarketingDashboard /></Layout>} />
          <Route path="/marketing/campaigns" element={<Layout><Campaigns /></Layout>} />

          {/* POS */}
          <Route path="/pos/dashboard" element={<Layout><POSDashboard /></Layout>} />
          <Route path="/pos" element={<Layout><POSInterface /></Layout>} />
          <Route path="/pos/sessions" element={<Layout><POSSessions /></Layout>} />
          <Route path="/pos/terminals" element={<Layout><POSTerminals /></Layout>} />

          {/* Support */}
          <Route path="/support/dashboard" element={<Layout><SupportDashboard /></Layout>} />
          <Route path="/support/tickets" element={<Layout><SupportTickets /></Layout>} />
          <Route path="/support/workbench" element={<Layout><AgentWorkbench /></Layout>} />
          <Route path="/support/knowledge-base" element={<Layout><KnowledgeBase /></Layout>} />
          <Route path="/support/reports" element={<Layout><SupportReports /></Layout>} />
          <Route path="/support/surveys" element={<Layout><SurveyManagement /></Layout>} />
          <Route path="/support/itsm" element={<Layout><ITSM /></Layout>} />
          <Route path="/support/automation" element={<Layout><AutomationBuilder /></Layout>} />
          <Route path="/portal" element={<CustomerPortal />} />

          {/* Projects */}
          <Route path="/projects/dashboard" element={<Layout><ProjectsDashboard /></Layout>} />
          <Route path="/projects" element={<Layout><Projects /></Layout>} />
          <Route path="/projects/:id" element={<Layout><ProjectDetail /></Layout>} />

          {/* Subscription */}
          <Route path="/subscription" element={<Layout><Subscription /></Layout>} />

          {/* Settings */}
          <Route path="/settings" element={<Layout><Settings /></Layout>} />

          {/* Website */}
          <Route path="/website/dashboard" element={<Layout><WebsiteDashboard /></Layout>} />
          <Route path="/website" element={<Layout><Website /></Layout>} />
          <Route path="/website/analytics" element={<Layout><WebsiteAnalytics /></Layout>} />
          <Route path="/website/builder" element={<Layout><PageBuilder /></Layout>} />
          <Route path="/website/catalog" element={<Layout><ProductCatalog /></Layout>} />
          <Route path="/website/settings" element={<Layout><SiteSettings /></Layout>} />
          <Route path="/website/promotions" element={<Layout><Promotions /></Layout>} />
          <Route path="/website/media" element={<Layout><MediaLibrary /></Layout>} />
          <Route path="/website/checkout" element={<Layout><CartCheckout /></Layout>} />

          {/* Admin Portal */}
          <Route path="/admin" element={<Layout><AdminPortal /></Layout>} />
          <Route path="/admin/roles" element={<Layout><RolesManagement onRoleSelect={() => {}} /></Layout>} />
          <Route path="/admin/permissions" element={<Layout><PermissionsManagement /></Layout>} />
          <Route path="/admin/users" element={<Layout><UserRoleAssignments /></Layout>} />
          <Route path="/admin/audit" element={<Layout><AuditLogsViewer /></Layout>} />

          {/* E-Signature */}
          <Route path="/esignature" element={<Layout><ESignature /></Layout>} />
        </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
