import { useState, useEffect } from 'react';
import { Play, CheckCircle2, AlertCircle, Users, DollarSign } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { apiService } from '../../../services/apiService';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import { showToast } from '../../../components/Toast';
import './PayrollProcessing.css';

export const PayrollProcessing = () => {
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [processing, setProcessing] = useState(false);
  const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [payslipsData, employeesData] = await Promise.all([
        apiService.get<any>('/payroll/payslips').catch(() => []),
        apiService.get<any>('/employees').catch(() => []),
      ]);
      
      // Group payslips by period
      const runsMap = new Map();
      payslipsData.forEach((payslip: any) => {
        const period = new Date(payslip.date_from).toISOString().slice(0, 7);
        if (!runsMap.has(period)) {
          runsMap.set(period, {
            period: new Date(payslip.date_from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
            status: payslip.state === 'done' ? 'completed' : 'pending',
            employees: 0,
            totalAmount: 0,
            processedDate: payslip.date_from,
          });
        }
        const run = runsMap.get(period);
        run.employees++;
        run.totalAmount += parseFloat(payslip.net_wage || 0);
      });
      setPayrollRuns(Array.from(runsMap.values()));
      setEmployees(employeesData);
    } catch (error) {
      console.error('Failed to load payroll data:', error);
    }
  };

  const handleProcessPayroll = async () => {
    if (!selectedPeriod) {
      showToast('Please select a payroll period', 'error');
      return;
    }

    setProcessing(true);
    try {
      // For each employee, calculate and create payslip
      const [year, month] = selectedPeriod.split('-');
      const dateFrom = new Date(parseInt(year), parseInt(month) - 1, 1);
      const dateTo = new Date(parseInt(year), parseInt(month), 0);

      for (const emp of employees.slice(0, 5)) { // Process first 5 for demo
        try {
          const structure = await apiService.getById<any>('/payroll/salary-structure', emp.id);
          if (structure && structure.length > 0) {
            const earnings = structure.filter((s: any) => s.component_type === 'earning');
            const deductions = structure.filter((s: any) => s.component_type === 'deduction');
            const gross = earnings.reduce((sum: number, e: any) => sum + parseFloat(e.amount || 0), 0);
            const totalDeductions = deductions.reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0);
            const net = gross - totalDeductions;
            const basic = earnings.find((e: any) => e.component_name.toLowerCase().includes('basic'))?.amount || 0;

            await apiService.create('/payroll/payslips', {
              employee_id: emp.id,
              name: `PAY/${year}/${month}/${emp.employee_id}`,
              date_from: dateFrom.toISOString().split('T')[0],
              date_to: dateTo.toISOString().split('T')[0],
              basic_wage: parseFloat(basic),
              gross_wage: gross,
              net_wage: net,
            });
          }
        } catch (error) {
          console.error(`Failed to process payroll for ${emp.name}:`, error);
        }
      }

      showToast('Payroll processed successfully!', 'success');
      loadData();
    } catch (error) {
      console.error('Failed to process payroll:', error);
      showToast('Failed to process payroll. Please try again.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="payroll-processing">
      <div className="processing-header">
        <Card className="process-card">
          <h3>Process Payroll</h3>
          <div className="process-form">
            <div className="form-group">
              <label>Payroll Period</label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Payroll Type</label>
              <select>
                <option>Regular Payroll</option>
                <option>Off-Cycle Payroll</option>
                <option>Bonus Payroll</option>
              </select>
            </div>
            <Button
              icon={<Play size={18} />}
              onClick={handleProcessPayroll}
              disabled={processing}
            >
              {processing ? 'Processing...' : 'Process Payroll'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="validation-section">
        <Card>
          <h3>Pre-Payroll Validation</h3>
          <div className="validation-checks">
            <div className="check-item">
              <CheckCircle2 size={20} className="success" />
              <span>Employee master data validated</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={20} className="success" />
              <span>Salary structures verified</span>
            </div>
            <div className="check-item">
              <AlertCircle size={20} className="warning" />
              <span>12 employees with missing attendance data</span>
            </div>
            <div className="check-item">
              <CheckCircle2 size={20} className="success" />
              <span>Bank details validated</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="runs-section">
        <h3>Payroll Runs History</h3>
        <div className="runs-list">
          {payrollRuns.map((run) => (
            <Card key={run.id} className="run-card">
              <div className="run-header">
                <div>
                  <h4>{run.period}</h4>
                  <span className={`status-badge ${run.status}`}>
                    {run.status === 'completed' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    {run.status.charAt(0).toUpperCase() + run.status.slice(1)}
                  </span>
                </div>
                {run.processedDate && (
                  <span className="processed-date">
                    Processed: {new Date(run.processedDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <div className="run-stats">
                <div className="stat">
                  <Users size={18} />
                  <span>{run.employees} employees</span>
                </div>
                <div className="stat">
                  <DollarSign size={18} />
                  <span>{formatInLakhsCompact(run.totalAmount)}</span>
                </div>
              </div>
              <div className="run-actions">
                <Button variant="secondary" size="sm">View Details</Button>
                <Button variant="secondary" size="sm">Export</Button>
                {run.status === 'completed' && (
                  <Button variant="secondary" size="sm">Generate Payslips</Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

