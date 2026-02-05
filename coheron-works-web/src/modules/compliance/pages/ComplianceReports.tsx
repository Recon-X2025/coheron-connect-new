import React, { useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, Info } from 'lucide-react';

type ReportType = 'soc2' | 'gdpr' | 'iso27001';

interface ReportData {
  type: ReportType;
  generated_at: string;
  [key: string]: any;
}

const REPORT_TYPES: { key: ReportType; label: string; description: string }[] = [
  { key: 'soc2', label: 'SOC 2', description: 'Service Organization Control 2 compliance report' },
  { key: 'gdpr', label: 'GDPR', description: 'General Data Protection Regulation compliance report' },
  { key: 'iso27001', label: 'ISO 27001', description: 'Information security management system report' },
];

export default function ComplianceReports() {
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeType, setActiveType] = useState<ReportType | null>(null);

  const generateReport = (type: ReportType) => {
    setLoading(true);
    setActiveType(type);
    setReport(null);

    fetch(`/api/security-dashboard/reports/${type}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
    })
      .then(r => r.json())
      .then(data => setReport({ ...data, type }))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FileText size={24} /> Compliance Reports</h1>
      </div>

      <div className="stats-grid">
        {REPORT_TYPES.map(rt => (
          <div
            key={rt.key}
            className={`stat-card stat-card--clickable ${activeType === rt.key ? 'stat-card--selected' : ''}`}
            onClick={() => generateReport(rt.key)}
          >
            <FileText size={20} />
            <div className="stat-card__value">{rt.label}</div>
            <div className="stat-card__label">{rt.description}</div>
          </div>
        ))}
      </div>

      {loading && <div className="page-loading">Generating report...</div>}

      {report && !loading && (
        <div className="section">
          <div className="section__header">
            <h2>{REPORT_TYPES.find(r => r.key === report.type)?.label} Report</h2>
            <span className="text-muted">
              Generated: {new Date(report.generated_at || Date.now()).toLocaleString()}
            </span>
          </div>

          <ReportContent report={report} />
        </div>
      )}
    </div>
  );
}

function ReportContent({ report }: { report: ReportData }) {
  const { type, generated_at, ...metrics } = report;

  const renderValue = (key: string, value: any): React.ReactElement => {
    if (typeof value === 'object' && value !== null) {
      return (
        <div className="report-section" key={key}>
          <h3>{formatKey(key)}</h3>
          <div className="report-grid">
            {Object.entries(value).map(([k, v]) => <React.Fragment key={k}>{renderValue(k, v)}</React.Fragment>)}
          </div>
        </div>
      );
    }

    const isGood = typeof value === 'boolean' ? value : typeof value === 'number' && value >= 90;
    const isBad = typeof value === 'boolean' ? !value : typeof value === 'number' && value < 50;

    return (
      <div className="report-metric" key={key}>
        <div className="report-metric__icon">
          {isGood ? <CheckCircle size={16} /> : isBad ? <AlertTriangle size={16} /> : <Info size={16} />}
        </div>
        <div className="report-metric__label">{formatKey(key)}</div>
        <div className={`report-metric__value ${isGood ? 'text-success' : isBad ? 'text-danger' : ''}`}>
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}
        </div>
      </div>
    );
  };

  return (
    <div className="report-content">
      {Object.entries(metrics).map(([key, value]) => <React.Fragment key={key}>{renderValue(key, value)}</React.Fragment>)}

      <details className="report-raw">
        <summary>Raw JSON</summary>
        <pre className="code-block">{JSON.stringify(report, null, 2)}</pre>
      </details>
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
