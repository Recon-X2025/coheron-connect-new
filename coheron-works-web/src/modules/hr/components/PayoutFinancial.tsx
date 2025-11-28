import { useState } from 'react';
import { CreditCard, Download, FileText, CheckCircle2, Upload } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import './PayoutFinancial.css';

export const PayoutFinancial = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('2024-12');

  const payoutData = {
    totalEmployees: 1234,
    totalAmount: 45200000,
    bankTransfers: 1234,
    pending: 0,
    processed: 1234,
  };

  const bankFiles = [
    {
      id: 1,
      period: 'November 2024',
      bank: 'HDFC Bank',
      employees: 1234,
      amount: 45200000,
      status: 'processed',
      generatedDate: '2024-11-30',
    },
  ];

  return (
    <div className="payout-financial">
      <div className="payout-header">
        <Card>
          <div className="header-content">
            <div>
              <h3>Payout & Financial Integration</h3>
              <p>Generate bank transfer files and integrate with accounting</p>
            </div>
            <div className="period-select">
              <label>Payroll Period</label>
              <input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
          </div>
        </Card>
      </div>

      <div className="payout-stats">
        <Card>
          <h4>Payout Summary</h4>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <CreditCard size={24} />
              </div>
              <div>
                <h5>Total Employees</h5>
                <p>{payoutData.totalEmployees}</p>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <FileText size={24} />
              </div>
              <div>
                <h5>Total Amount</h5>
                <p>{formatInLakhsCompact(payoutData.totalAmount)}</p>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h5>Processed</h5>
                <p>{payoutData.processed}</p>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-icon" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <FileText size={24} />
              </div>
              <div>
                <h5>Pending</h5>
                <p>{payoutData.pending}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="bank-files-section">
        <Card>
          <div className="section-header">
            <h4>Bank Transfer Files</h4>
            <Button icon={<Upload size={18} />}>Generate Bank File</Button>
          </div>
          <div className="bank-files-list">
            {bankFiles.map((file) => (
              <div key={file.id} className="bank-file-item">
                <div className="file-info">
                  <FileText size={24} />
                  <div>
                    <h5>{file.period}</h5>
                    <p>{file.bank} • {file.employees} employees • {formatInLakhsCompact(file.amount)}</p>
                  </div>
                </div>
                <div className="file-actions">
                  <span className={`status-badge ${file.status}`}>
                    {file.status === 'processed' ? 'Processed' : 'Pending'}
                  </span>
                  <Button variant="secondary" size="sm" icon={<Download size={16} />}>
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="payslip-generation">
        <Card>
          <h4>Payslip Generation</h4>
          <div className="payslip-actions">
            <Button icon={<FileText size={18} />}>Generate All Payslips</Button>
            <Button variant="secondary" icon={<Download size={18} />}>Bulk Download</Button>
            <Button variant="secondary" icon={<FileText size={18} />}>Email Payslips</Button>
          </div>
        </Card>
      </div>

      <div className="gl-integration">
        <Card>
          <h4>General Ledger Integration</h4>
          <p>Automatically post payroll entries to accounting module</p>
          <div className="gl-actions">
            <Button>Post to GL</Button>
            <Button variant="secondary">View GL Entries</Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

