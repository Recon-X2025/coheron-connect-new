import { useState, useEffect } from 'react';
import { Download, FileText, Upload, DollarSign, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { apiService } from '../../../services/apiService';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import './EmployeeSelfService.css';

export const EmployeeSelfService = () => {
  const [activeTab, setActiveTab] = useState<'payslips' | 'tax' | 'structure' | 'claims'>('payslips');
  const [payslips, setPayslips] = useState<any[]>([]);
  const [salaryStructure, setSalaryStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const employeeId = 1; // TODO: Get from auth context

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'payslips') {
        const data = await apiService.get<any>('/payroll/payslips', { employee_id: employeeId });
        setPayslips(data);
      } else if (activeTab === 'structure') {
        try {
          const data = await apiService.getById<any>('/payroll/salary-structure', employeeId);
          setSalaryStructure(data);
        } catch (error) {
          console.error('Failed to load salary structure:', error);
          setSalaryStructure([]);
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="employee-self-service">
      <div className="ess-header">
        <Card>
          <h3>Employee Self-Service Portal</h3>
          <p>Access your payroll information and manage your details</p>
        </Card>
      </div>

      <div className="ess-tabs">
        <button
          className={`ess-tab ${activeTab === 'payslips' ? 'active' : ''}`}
          onClick={() => setActiveTab('payslips')}
        >
          <FileText size={18} />
          Payslips
        </button>
        <button
          className={`ess-tab ${activeTab === 'tax' ? 'active' : ''}`}
          onClick={() => setActiveTab('tax')}
        >
          <DollarSign size={18} />
          Tax Declarations
        </button>
        <button
          className={`ess-tab ${activeTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveTab('structure')}
        >
          <FileText size={18} />
          Salary Structure
        </button>
        <button
          className={`ess-tab ${activeTab === 'claims' ? 'active' : ''}`}
          onClick={() => setActiveTab('claims')}
        >
          <Upload size={18} />
          Reimbursements
        </button>
      </div>

      <div className="ess-content">
        {activeTab === 'payslips' && (
          <Card>
            <h4>My Payslips</h4>
            {loading ? (
              <div className="p-8">Loading payslips...</div>
            ) : payslips.length > 0 ? (
              <div className="payslips-list">
                {payslips.map((payslip) => (
                  <div key={payslip.id} className="payslip-item">
                    <div className="payslip-info">
                      <FileText size={20} />
                      <div>
                        <h5>
                          {new Date(payslip.date_from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                        </h5>
                        <p>Net Salary: {formatInLakhsCompact(payslip.net_wage || 0)}</p>
                      </div>
                    </div>
                    <div className="payslip-actions">
                      <Button variant="secondary" size="sm" icon={<Download size={16} />}>
                        Download
                      </Button>
                      <Button variant="secondary" size="sm" icon={<FileText size={16} />}>
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No payslips available</p>
            )}
          </Card>
        )}

        {activeTab === 'tax' && (
          <Card>
            <h4>Tax Investment Declarations</h4>
            <div className="tax-declarations">
              <p>Declare your tax-saving investments for the financial year</p>
              <div className="declaration-form">
                <div className="form-group">
                  <label>Section 80C Investments (₹)</label>
                  <input type="number" placeholder="150000" />
                </div>
                <div className="form-group">
                  <label>Section 80D (Health Insurance) (₹)</label>
                  <input type="number" placeholder="25000" />
                </div>
                <div className="form-group">
                  <label>Section 24 (Home Loan Interest) (₹)</label>
                  <input type="number" placeholder="200000" />
                </div>
                <Button>Submit Declaration</Button>
              </div>
            </div>
          </Card>
        )}

        {activeTab === 'structure' && (
          <Card>
            <h4>My Salary Structure</h4>
            {loading ? (
              <div className="p-8">Loading salary structure...</div>
            ) : salaryStructure.length > 0 ? (
              <div className="salary-structure-view">
                <div className="earnings-section">
                  <h5>Earnings</h5>
                  {salaryStructure.filter((s: any) => s.component_type === 'earning').map((item: any) => (
                    <div key={item.id} className="structure-item">
                      <span>{item.component_name}</span>
                      <span>{formatInLakhsCompact(parseFloat(item.amount || 0))}</span>
                    </div>
                  ))}
                </div>
                <div className="deductions-section">
                  <h5>Deductions</h5>
                  {salaryStructure.filter((s: any) => s.component_type === 'deduction').map((item: any) => (
                    <div key={item.id} className="structure-item">
                      <span>{item.component_name}</span>
                      <span>{formatInLakhsCompact(parseFloat(item.amount || 0))}</span>
                    </div>
                  ))}
                </div>
                <div className="structure-total">
                  <div className="structure-item total">
                    <span>Net Salary</span>
                    <span>
                      {formatInLakhsCompact(
                        salaryStructure
                          .filter((s: any) => s.component_type === 'earning')
                          .reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0) -
                        salaryStructure
                          .filter((s: any) => s.component_type === 'deduction')
                          .reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0)
                      )}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted">No salary structure available</p>
            )}
          </Card>
        )}

        {activeTab === 'claims' && (
          <Card>
            <h4>Reimbursement Claims</h4>
            <div className="claims-section">
              <Button icon={<Plus size={18} />}>New Claim</Button>
              <div className="claims-list">
                <p>No pending claims</p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

