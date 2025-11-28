import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import SupportTickets from './pages/SupportTickets';
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
import { LeadsList } from './modules/crm/LeadsList';
import { Customers } from './modules/crm/Customers';
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
import { Invoices } from './modules/accounting/Invoices';
import { ChartOfAccounts } from './modules/accounting/ChartOfAccounts';
import { JournalEntries } from './modules/accounting/JournalEntries';
import { AccountsPayable } from './modules/accounting/AccountsPayable';
import { FinancialReports } from './modules/accounting/FinancialReports';
import { Employees } from './modules/hr/Employees';
import { Opportunities } from './modules/crm/Opportunities';
import { ManufacturingOrders } from './modules/manufacturing/ManufacturingOrders';
import BOMManagement from './modules/manufacturing/BOMManagement';
import RoutingManagement from './modules/manufacturing/RoutingManagement';
import WorkOrders from './modules/manufacturing/WorkOrders';
import QualityControl from './modules/manufacturing/QualityControl';
import CostingAnalytics from './modules/manufacturing/CostingAnalytics';
import { Campaigns } from './modules/marketing/Campaigns';
import POSInterface from './modules/pos/POSInterface';
import { Settings } from './pages/Settings';
import { Payroll } from './modules/hr/Payroll';
import { Recruitment } from './modules/hr/Recruitment';
import { Policies } from './modules/hr/Policies';
import { Appraisals } from './modules/hr/Appraisals';
import { LMS } from './modules/hr/LMS';
import { HR } from './modules/hr/HR';
import { Attendance } from './modules/hr/Attendance';
import { LeaveManagement } from './modules/hr/LeaveManagement';
import { Onboarding } from './modules/hr/Onboarding';
import { Offboarding } from './modules/hr/Offboarding';
import { CustomerPortal } from './modules/support/CustomerPortal';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Layout><LandingPage /></Layout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/pricing" element={<Layout><Pricing /></Layout>} />

        {/* App routes with Layout */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />

        {/* CRM */}
        <Route path="/crm/pipeline" element={<Layout><CRMPipeline /></Layout>} />
        <Route path="/crm/leads" element={<Layout><LeadsList /></Layout>} />
        <Route path="/crm/opportunities" element={<Layout><Opportunities /></Layout>} />
        <Route path="/crm/customers" element={<Layout><Customers /></Layout>} />

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
        <Route path="/inventory/products" element={<Layout><Products /></Layout>} />

        {/* Accounting */}
        <Route path="/accounting/invoices" element={<Layout><Invoices /></Layout>} />
        <Route path="/accounting/chart-of-accounts" element={<Layout><ChartOfAccounts /></Layout>} />
        <Route path="/accounting/journal-entries" element={<Layout><JournalEntries /></Layout>} />
        <Route path="/accounting/accounts-payable" element={<Layout><AccountsPayable /></Layout>} />
        <Route path="/accounting/reports" element={<Layout><FinancialReports /></Layout>} />

        {/* HR */}
        <Route path="/hr" element={<Layout><HR /></Layout>} />
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
        <Route path="/manufacturing/orders" element={<Layout><ManufacturingOrders /></Layout>} />
        <Route path="/manufacturing/bom" element={<Layout><BOMManagement /></Layout>} />
        <Route path="/manufacturing/routing" element={<Layout><RoutingManagement /></Layout>} />
        <Route path="/manufacturing/work-orders" element={<Layout><WorkOrders /></Layout>} />
        <Route path="/manufacturing/quality" element={<Layout><QualityControl /></Layout>} />
        <Route path="/manufacturing/costing" element={<Layout><CostingAnalytics /></Layout>} />

        {/* Marketing */}
        <Route path="/marketing/campaigns" element={<Layout><Campaigns /></Layout>} />

        {/* POS */}
        <Route path="/pos" element={<Layout><POSInterface /></Layout>} />

        {/* Support */}
        <Route path="/support/tickets" element={<Layout><SupportTickets /></Layout>} />
        <Route path="/support/workbench" element={<Layout><AgentWorkbench /></Layout>} />
        <Route path="/support/knowledge-base" element={<Layout><KnowledgeBase /></Layout>} />
        <Route path="/support/reports" element={<Layout><SupportReports /></Layout>} />
        <Route path="/support/surveys" element={<Layout><SurveyManagement /></Layout>} />
        <Route path="/support/itsm" element={<Layout><ITSM /></Layout>} />
        <Route path="/support/automation" element={<Layout><AutomationBuilder /></Layout>} />
        <Route path="/portal" element={<CustomerPortal />} />

        {/* Projects */}
        <Route path="/projects" element={<Layout><Projects /></Layout>} />
        <Route path="/projects/:id" element={<Layout><ProjectDetail /></Layout>} />

        {/* Subscription */}
        <Route path="/subscription" element={<Layout><Subscription /></Layout>} />

        {/* Settings */}
        <Route path="/settings" element={<Layout><Settings /></Layout>} />

        {/* Admin Portal */}
        <Route path="/admin" element={<Layout><AdminPortal /></Layout>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
