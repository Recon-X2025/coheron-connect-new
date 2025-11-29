import { useState, useEffect } from 'react';
import { 
  Users, Calculator, FileText, Shield, 
  CreditCard, BarChart3, UserCheck, Lock,
  Plus, Download, Calendar, DollarSign
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { apiService } from '../../services/apiService';
import { EmployeeMasterData } from './components/EmployeeMasterData';
import { SalaryStructure } from './components/SalaryStructure';
import { PayrollProcessing } from './components/PayrollProcessing';
import { ComplianceReporting } from './components/ComplianceReporting';
import { PayrollReports } from './components/PayrollReports';
import { EmployeeSelfService } from './components/EmployeeSelfService';
import { showToast } from '../../components/Toast';
import { AttendanceLeaveIntegration } from './components/AttendanceLeaveIntegration';
import { PayoutFinancial } from './components/PayoutFinancial';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './Payroll.css';

type PayrollTab = 
  | 'overview' 
  | 'employee-master' 
  | 'salary-structure' 
  | 'attendance-leave' 
  | 'processing' 
  | 'compliance' 
  | 'payout' 
  | 'reports' 
  | 'ess' 
  | 'security';

export const Payroll = () => {
  const [activeTab, setActiveTab] = useState<PayrollTab>('overview');

  const tabs = [
    { id: 'overview' as PayrollTab, label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'employee-master' as PayrollTab, label: 'Employee Master', icon: <Users size={18} /> },
    { id: 'salary-structure' as PayrollTab, label: 'Salary Structure', icon: <DollarSign size={18} /> },
    { id: 'attendance-leave' as PayrollTab, label: 'Attendance & Leave', icon: <Calendar size={18} /> },
    { id: 'processing' as PayrollTab, label: 'Processing', icon: <Calculator size={18} /> },
    { id: 'compliance' as PayrollTab, label: 'Compliance', icon: <Shield size={18} /> },
    { id: 'payout' as PayrollTab, label: 'Payout & Finance', icon: <CreditCard size={18} /> },
    { id: 'reports' as PayrollTab, label: 'Reports', icon: <FileText size={18} /> },
    { id: 'ess' as PayrollTab, label: 'Employee Self-Service', icon: <UserCheck size={18} /> },
    { id: 'security' as PayrollTab, label: 'Security & Audit', icon: <Lock size={18} /> },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <PayrollOverview />;
      case 'employee-master':
        return <EmployeeMasterData />;
      case 'salary-structure':
        return <SalaryStructure />;
      case 'attendance-leave':
        return <AttendanceLeaveIntegration />;
      case 'processing':
        return <PayrollProcessing />;
      case 'compliance':
        return <ComplianceReporting />;
      case 'payout':
        return <PayoutFinancial />;
      case 'reports':
        return <PayrollReports />;
      case 'ess':
        return <EmployeeSelfService />;
      case 'security':
        return <SecurityAudit />;
      default:
        return <PayrollOverview />;
    }
  };

  return (
    <div className="payroll-page">
      <div className="container">
        <div className="payroll-header">
          <div>
            <h1>Payroll Management</h1>
            <p className="payroll-subtitle">Comprehensive payroll processing and management system</p>
          </div>
          <div className="payroll-actions">
            <Button variant="secondary" icon={<Download size={18} />}>
              Export
            </Button>
            <Button icon={<Plus size={18} />} onClick={() => showToast('Payroll run creation form coming soon', 'info')}>
              New Payroll Run
            </Button>
          </div>
        </div>

        <div className="payroll-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`payroll-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="payroll-content">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

// Overview Component
const PayrollOverview = () => {
  const [stats, setStats] = useState({
    total_employees: 0,
    this_month_payroll: 0,
    pending_approvals: 0,
    compliance_status: 98,
  });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, payslipsData] = await Promise.all([
        apiService.get<any>('/payroll/stats').catch(() => ({ total_employees: 0, this_month_payroll: 0, pending_approvals: 0, compliance_status: 98 })),
        apiService.get<any>('/payroll/payslips').catch(() => []),
      ]);
      
      // Handle stats data - it might be an array or object
      const statsObj = Array.isArray(statsData) ? statsData[0] || {} : statsData;
      setStats({
        total_employees: statsObj.total_employees || 0,
        this_month_payroll: statsObj.this_month_payroll || 0,
        pending_approvals: statsObj.pending_approvals || 0,
        compliance_status: statsObj.compliance_status || 98,
      });
      setPayslips(payslipsData.slice(0, 3)); // Get recent 3
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayStats = [
    { label: 'Total Employees', value: stats.total_employees.toLocaleString(), icon: <Users size={24} />, color: '#3b82f6' },
    { label: 'This Month Payroll', value: formatInLakhsCompact(stats.this_month_payroll), icon: <DollarSign size={24} />, color: '#10b981' },
    { label: 'Pending Approvals', value: stats.pending_approvals.toString(), icon: <FileText size={24} />, color: '#f59e0b' },
    { label: 'Compliance Status', value: `${stats.compliance_status}%`, icon: <Shield size={24} />, color: '#8b5cf6' },
  ];

  if (loading) {
    return <div className="p-8">Loading payroll data...</div>;
  }

  return (
    <div className="payroll-overview">
      <div className="overview-stats">
        {displayStats.map((stat, index) => (
          <Card key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-content">
              <h3>{stat.value}</h3>
              <p>{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="overview-grid">
        <Card className="overview-card">
          <h3>Recent Payroll Runs</h3>
          <div className="recent-runs">
            {payslips.length > 0 ? (
              payslips.map((payslip) => (
                <div key={payslip.id} className="run-item">
                  <span className="run-period">
                    {new Date(payslip.date_from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                  </span>
                  <span className={`run-status ${payslip.state === 'done' ? 'completed' : 'pending'}`}>
                    {payslip.state === 'done' ? 'Completed' : 'In Progress'}
                  </span>
                  <span className="run-amount">
                    {payslip.net_wage ? `₹${(payslip.net_wage / 1000).toFixed(0)}K` : '-'}
                  </span>
                </div>
              ))
            ) : (
              <div className="run-item">
                <span className="run-period">No payroll runs yet</span>
                <span className="run-status pending">-</span>
                <span className="run-amount">-</span>
              </div>
            )}
          </div>
        </Card>

        <Card className="overview-card">
          <h3>Quick Actions</h3>
          <div className="quick-actions">
            <Button variant="secondary" fullWidth>Generate Payslips</Button>
            <Button variant="secondary" fullWidth>Process Payroll</Button>
            <Button variant="secondary" fullWidth>Export Reports</Button>
            <Button variant="secondary" fullWidth>Tax Calculator</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

// Security & Audit Component
const SecurityAudit = () => {
  return (
    <div className="security-audit">
      <Card>
        <h3>Access Control</h3>
        <p>Role-based permissions and access management</p>
        <div className="mt-4">
          <Button>Manage Roles</Button>
        </div>
      </Card>
      <Card className="mt-4">
        <h3>Audit Trail</h3>
        <p>Track all payroll changes and modifications</p>
        <div className="mt-4">
          <Button variant="secondary">View Audit Log</Button>
        </div>
      </Card>
    </div>
  );
};
