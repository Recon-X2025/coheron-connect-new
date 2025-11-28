import { useState } from 'react';
import { Download, FileText, Shield } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import './ComplianceReporting.css';

export const ComplianceReporting = () => {
  const [selectedYear, setSelectedYear] = useState('2024');

  const complianceReports = [
    {
      id: 1,
      name: 'PF Contribution Report',
      type: 'PF',
      period: 'Monthly',
      status: 'compliant',
      lastGenerated: '2024-11-30',
    },
    {
      id: 2,
      name: 'ESI Contribution Report',
      type: 'ESI',
      period: 'Monthly',
      status: 'compliant',
      lastGenerated: '2024-11-30',
    },
    {
      id: 3,
      name: 'Professional Tax Report',
      type: 'PT',
      period: 'Monthly',
      status: 'compliant',
      lastGenerated: '2024-11-30',
    },
    {
      id: 4,
      name: 'TDS Certificate (Form 16)',
      type: 'Tax',
      period: 'Annual',
      status: 'pending',
      lastGenerated: null,
    },
    {
      id: 5,
      name: 'Income Tax Computation',
      type: 'Tax',
      period: 'Annual',
      status: 'pending',
      lastGenerated: null,
    },
  ];

  return (
    <div className="compliance-reporting">
      <div className="compliance-header">
        <Card>
          <div className="header-content">
            <div>
              <h3>Statutory Compliance Status</h3>
              <p>Overall compliance: 98%</p>
            </div>
            <div className="compliance-select">
              <label>Financial Year</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                <option>2024</option>
                <option>2023</option>
                <option>2022</option>
              </select>
            </div>
          </div>
        </Card>
      </div>

      <div className="reports-section">
        <h3>Compliance Reports</h3>
        <div className="reports-grid">
          {complianceReports.map((report) => (
            <Card key={report.id} className="report-card">
              <div className="report-header">
                <div className="report-icon">
                  <Shield size={24} />
                </div>
                <span className={`status-badge ${report.status}`}>
                  {report.status === 'compliant' ? 'Compliant' : 'Pending'}
                </span>
              </div>
              <h4>{report.name}</h4>
              <div className="report-meta">
                <span className="report-type">{report.type}</span>
                <span className="report-period">{report.period}</span>
              </div>
              {report.lastGenerated && (
                <p className="last-generated">
                  Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                </p>
              )}
              <div className="report-actions">
                <Button variant="secondary" size="sm" icon={<Download size={16} />}>
                  Download
                </Button>
                <Button variant="secondary" size="sm" icon={<FileText size={16} />}>
                  Generate
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="tax-section">
        <Card>
          <h3>Tax Computation & Forms</h3>
          <div className="tax-forms">
            <div className="tax-form-item">
              <FileText size={20} />
              <div>
                <h4>Form 16</h4>
                <p>Annual tax statement for employees</p>
              </div>
              <Button variant="secondary">Generate</Button>
            </div>
            <div className="tax-form-item">
              <FileText size={20} />
              <div>
                <h4>Form 24Q</h4>
                <p>Quarterly TDS return</p>
              </div>
              <Button variant="secondary">Generate</Button>
            </div>
            <div className="tax-form-item">
              <FileText size={20} />
              <div>
                <h4>Form 26AS</h4>
                <p>Tax credit statement</p>
              </div>
              <Button variant="secondary">View</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

