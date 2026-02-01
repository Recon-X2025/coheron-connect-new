import { useState, useEffect } from 'react';
import { Download, FileText, BarChart3, Calendar, Filter } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { apiService } from '../../../services/apiService';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import './PayrollReports.css';

export const PayrollReports = () => {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPayslips();
  }, [dateRange]);

  const loadPayslips = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateRange.from) params.from_date = dateRange.from;
      if (dateRange.to) params.to_date = dateRange.to;
      
      const data = await apiService.get<any>('/payroll/payslips', params);
      setPayslips(data);
    } catch (error) {
      console.error('Failed to load payslips:', error);
      setPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const reports = [
    {
      id: 'payslip',
      name: 'Payslip Register',
      description: 'Individual payslips for all employees',
      icon: <FileText size={24} />,
    },
    {
      id: 'register',
      name: 'Payroll Register',
      description: 'Complete payroll summary for a period',
      icon: <BarChart3 size={24} />,
    },
    {
      id: 'monthly',
      name: 'Monthly Payroll Report',
      description: 'Month-wise payroll analysis',
      icon: <Calendar size={24} />,
    },
    {
      id: 'employee',
      name: 'Employee-wise Report',
      description: 'Payroll details for individual employees',
      icon: <FileText size={24} />,
    },
    {
      id: 'tax',
      name: 'Tax & Statutory Reports',
      description: 'TDS, PF, ESI, and other statutory reports',
      icon: <FileText size={24} />,
    },
    {
      id: 'cost',
      name: 'Cost-to-Company Analysis',
      description: 'CTC breakdown and analysis',
      icon: <BarChart3 size={24} />,
    },
    {
      id: 'variance',
      name: 'Salary Variance Report',
      description: 'Month-over-month salary changes',
      icon: <BarChart3 size={24} />,
    },
  ];

  return (
    <div className="payroll-reports">
      <div className="reports-header">
        <Card>
          <div className="header-filters">
            <div className="filter-group">
              <label>Report Type</label>
              <select>
                <option>All Reports</option>
                <option>Payslips</option>
                <option>Registers</option>
                <option>Analytics</option>
              </select>
            </div>
            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              />
            </div>
            <Button icon={<Filter size={18} />} onClick={loadPayslips}>Apply Filters</Button>
          </div>
        </Card>
      </div>

      <div className="reports-grid">
        {reports.map((report, idx) => (
          <div
            key={report.id || (report as any)._id || idx}
            className={`report-card-wrapper ${selectedReport === report.id ? 'selected' : ''}`}
            onClick={() => setSelectedReport(report.id)}
          >
            <Card>
              <div className="report-icon">{report.icon}</div>
              <h4>{report.name}</h4>
              <p>{report.description}</p>
              <div className="report-actions">
                <Button variant="secondary" size="sm" icon={<Download size={16} />}>
                  Download
                </Button>
                <Button variant="secondary" size="sm" icon={<FileText size={16} />}>
                  View
                </Button>
              </div>
            </Card>
          </div>
        ))}
      </div>

      {selectedReport === 'payslip' && (
        <Card className="report-preview">
          <h3>Payslip Register</h3>
          <div className="preview-content">
            {loading ? (
              <p>Loading payslips...</p>
            ) : payslips.length > 0 ? (
              <table className="payslip-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Basic Wage</th>
                    <th>Gross Wage</th>
                    <th>Net Wage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payslips.map((payslip, idx) => (
                    <tr key={payslip.id || (payslip as any)._id || idx}>
                      <td>{payslip.employee_name}</td>
                      <td>{new Date(payslip.date_from).toLocaleDateString()} - {new Date(payslip.date_to).toLocaleDateString()}</td>
                      <td>{formatInLakhsCompact(payslip.basic_wage || 0)}</td>
                      <td>{formatInLakhsCompact(payslip.gross_wage || 0)}</td>
                      <td>{formatInLakhsCompact(payslip.net_wage || 0)}</td>
                      <td>
                        <span className={`status-badge ${payslip.state}`}>
                          {payslip.state === 'done' ? 'Completed' : payslip.state === 'draft' ? 'Draft' : 'Cancelled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No payslips found for the selected period.</p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};

