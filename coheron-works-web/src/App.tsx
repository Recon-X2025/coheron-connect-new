import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SupportTickets from './pages/SupportTickets';
import { SupportDashboard } from './pages/SupportDashboard';
import { AgentWorkbench } from './pages/AgentWorkbench';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { SupportReports } from './pages/SupportReports';
import { SurveyManagement } from './pages/SurveyManagement';
import ITSM from './pages/ITSM';
import AutomationBuilder from './pages/AutomationBuilder';
import { Subscription } from './pages/Subscription';
import AdminPortal from './pages/AdminPortal';
import Pricing from './pages/Pricing';
import { CRMPipeline } from './modules/crm/CRMPipeline';
import { CRMDashboard } from './modules/crm/CRMDashboard';
import { LeadsList } from './modules/crm/LeadsList';
import { Customers } from './modules/crm/Customers';
import { TasksCalendar } from './modules/crm/TasksCalendar';
import { AutomationEngine } from './modules/crm/AutomationEngine';
import { SalesOrders } from './modules/sales/SalesOrders';
import { Quotations } from './modules/sales/Quotations';
import { SalesDashboard } from './modules/sales/SalesDashboard';
import { PricingManagement } from './modules/sales/PricingManagement';
import { ContractsManagement } from './modules/sales/ContractsManagement';
import { DeliveryTracking } from './modules/sales/DeliveryTracking';
import { ReturnsManagement } from './modules/sales/ReturnsManagement';
import { SalesForecasting } from './modules/sales/SalesForecasting';
import { SalesTeamPerformance } from './modules/sales/SalesTeamPerformance';
import { Products } from './modules/inventory/Products';
import { Inventory } from './modules/inventory/Inventory';
import { Warehouses } from './modules/inventory/Warehouses';
import { InventoryDashboard } from './modules/inventory/InventoryDashboard';
import { StockMovements } from './modules/inventory/StockMovements';
import { BatchSerialManagement } from './modules/inventory/BatchSerialManagement';
import { WarehouseOperations } from './modules/inventory/WarehouseOperations';
import { StockReports } from './modules/inventory/StockReports';
import { InventorySettings } from './modules/inventory/InventorySettings';
import { Invoices } from './modules/accounting/Invoices';
import { AccountingDashboard } from './modules/accounting/AccountingDashboard';
import { ChartOfAccounts } from './modules/accounting/ChartOfAccounts';
import { JournalEntries } from './modules/accounting/JournalEntries';
import { AccountsPayable } from './modules/accounting/AccountsPayable';
import { FinancialReports } from './modules/accounting/FinancialReports';
import { Employees } from './modules/hr/Employees';
import { Opportunities } from './modules/crm/Opportunities';
import { ManufacturingOrders } from './modules/manufacturing/ManufacturingOrders';
import { ManufacturingDashboard } from './modules/manufacturing/ManufacturingDashboard';
import BOMManagement from './modules/manufacturing/BOMManagement';
import RoutingManagement from './modules/manufacturing/RoutingManagement';
import WorkOrders from './modules/manufacturing/WorkOrders';
import QualityControl from './modules/manufacturing/QualityControl';
import CostingAnalytics from './modules/manufacturing/CostingAnalytics';
import { Campaigns } from './modules/marketing/Campaigns';
import { MarketingDashboard } from './modules/marketing/MarketingDashboard';
import POSInterface from './modules/pos/POSInterface';
import { POSDashboard } from './modules/pos/POSDashboard';
import { POSSessions } from './modules/pos/POSSessions';
import { POSTerminals } from './modules/pos/POSTerminals';
import { Settings } from './pages/Settings';
import { Payroll } from './modules/hr/Payroll';
import { Recruitment } from './modules/hr/Recruitment';
import { Policies } from './modules/hr/Policies';
import { Appraisals } from './modules/hr/Appraisals';
import { LMS } from './modules/hr/LMS';
import { HRDashboard } from './modules/hr/HRDashboard';
import { HRModules } from './modules/hr/HRModules';
import { Attendance } from './modules/hr/Attendance';
import { LeaveManagement } from './modules/hr/LeaveManagement';
import { Onboarding } from './modules/hr/Onboarding';
import { Offboarding } from './modules/hr/Offboarding';
import { CustomerPortal } from './modules/support/CustomerPortal';
import { Projects } from './pages/Projects';
import { ProjectsDashboard } from './pages/ProjectsDashboard';
import { ProjectDetail } from './pages/ProjectDetail';
import Website from './modules/website/Website';
import { WebsiteDashboard } from './modules/website/WebsiteDashboard';
import { WebsiteAnalytics } from './modules/website/components/WebsiteAnalytics';
import { PageBuilder } from './modules/website/components/PageBuilder';
import { ProductCatalog } from './modules/website/components/ProductCatalog';
import { SiteSettings } from './modules/website/components/SiteSettings';
import { Promotions } from './modules/website/components/Promotions';
import { MediaLibrary } from './modules/website/components/MediaLibrary';
import { CartCheckout } from './modules/website/components/CartCheckout';
import { RolesManagement } from './modules/admin/RolesManagement';
import { PermissionsManagement } from './modules/admin/PermissionsManagement';
import { UserRoleAssignments } from './modules/admin/UserRoleAssignments';
import { AuditLogsViewer } from './modules/admin/AuditLogsViewer';
import { ESignature } from './modules/esignature/ESignature';

function App() {
  return (
    <ThemeProvider>
    <BrowserRouter>
      <AuthProvider>
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
      </AuthProvider>
    </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
