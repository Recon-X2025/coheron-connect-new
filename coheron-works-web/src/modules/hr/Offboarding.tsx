import { useState } from 'react';
import { UserMinus, FileText, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { OffboardingForm } from './components/OffboardingForm';
import './Offboarding.css';

type OffboardingTab = 'overview' | 'clearance' | 'exit-interview' | 'documents';

export const Offboarding = () => {
  const [activeTab, setActiveTab] = useState<OffboardingTab>('overview');
  const [showOffboardingForm, setShowOffboardingForm] = useState(false);

  const tabs = [
    { id: 'overview' as OffboardingTab, label: 'Overview', icon: <UserMinus size={18} /> },
    { id: 'clearance' as OffboardingTab, label: 'Clearance', icon: <CheckCircle2 size={18} /> },
    { id: 'exit-interview' as OffboardingTab, label: 'Exit Interview', icon: <FileText size={18} /> },
    { id: 'documents' as OffboardingTab, label: 'Documents', icon: <FileText size={18} /> },
  ];

  const offboardingList = [
    { id: 1, name: 'John Doe', department: 'Engineering', lastDate: '2024-12-31', status: 'in_progress', progress: 70 },
    { id: 2, name: 'Jane Smith', department: 'Sales', lastDate: '2025-01-15', status: 'pending', progress: 20 },
  ];

  return (
    <div className="offboarding-page">
      <div className="container">
        <div className="offboarding-header">
          <div>
            <h1>Employee Offboarding</h1>
            <p className="offboarding-subtitle">Manage employee exit process and final settlement</p>
          </div>
          <div className="header-actions">
            <Button icon={<Plus size={18} />} onClick={() => setShowOffboardingForm(true)}>New Offboarding</Button>
          </div>
        </div>

        <div className="offboarding-tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id || (tab as any)._id || idx}
              className={`offboarding-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="offboarding-content">
          {activeTab === 'overview' && <OverviewTab list={offboardingList} />}
          {activeTab === 'clearance' && <ClearanceTab />}
          {activeTab === 'exit-interview' && <ExitInterviewTab />}
          {activeTab === 'documents' && <DocumentsTab />}
        </div>

        {showOffboardingForm && (
          <OffboardingForm
            onClose={() => setShowOffboardingForm(false)}
            onSave={() => {
              setShowOffboardingForm(false);
            }}
          />
        )}
      </div>
    </div>
  );
};

const OverviewTab = ({ list }: { list: any[] }) => {
  return (
    <Card>
      <h3>Offboarding List</h3>
      <table className="offboarding-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Last Working Date</th>
            <th>Progress</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((item, idx) => (
            <tr key={item.id || (item as any)._id || idx}>
              <td>{item.name}</td>
              <td>{item.department}</td>
              <td>{new Date(item.lastDate).toLocaleDateString()}</td>
              <td>
                <div className="progress-container">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.progress}%` }}></div>
                  </div>
                  <span>{item.progress}%</span>
                </div>
              </td>
              <td>
                <span className={`status-badge ${item.status}`}>
                  {item.status === 'completed' ? 'Completed' : item.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </span>
              </td>
              <td>
                <Button variant="secondary" size="sm">View</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
};

const ClearanceTab = () => {
  const clearanceItems = [
    { department: 'IT', items: ['Laptop', 'Access Card', 'Email Account'], status: 'pending' },
    { department: 'Admin', items: ['ID Card', 'Keys'], status: 'completed' },
    { department: 'Finance', items: ['Outstanding Payments'], status: 'pending' },
  ];

  return (
    <Card>
      <h3>Clearance Checklist</h3>
      <div className="clearance-list">
        {clearanceItems.map((item, index) => (
          <div key={index} className="clearance-item">
            <div className="clearance-header">
              <h4>{item.department}</h4>
              <span className={`status-badge ${item.status}`}>
                {item.status === 'completed' ? 'Completed' : 'Pending'}
              </span>
            </div>
            <ul className="clearance-items">
              {item.items.map((clearanceItem, i) => (
                <li key={i}>
                  <CheckCircle2 size={16} className={item.status === 'completed' ? 'completed' : 'pending'} />
                  {clearanceItem}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
};

const ExitInterviewTab = () => {
  return (
    <Card>
      <h3>Exit Interview</h3>
      <div className="exit-interview-form">
        <div className="form-group">
          <label>Reason for Leaving *</label>
          <select required>
            <option>Better Opportunity</option>
            <option>Personal Reasons</option>
            <option>Relocation</option>
            <option>Career Change</option>
            <option>Other</option>
          </select>
        </div>
        <div className="form-group">
          <label>Feedback</label>
          <textarea rows={6} placeholder="Share your experience and suggestions..."></textarea>
        </div>
        <div className="form-group">
          <label>Would you recommend this company?</label>
          <select>
            <option>Yes</option>
            <option>No</option>
            <option>Maybe</option>
          </select>
        </div>
        <Button>Submit Exit Interview</Button>
      </div>
    </Card>
  );
};

const DocumentsTab = () => {
  const documents = [
    { name: 'Experience Letter', generated: true, date: '2024-12-01' },
    { name: 'Relieving Letter', generated: false, date: null },
    { name: 'Final Settlement', generated: false, date: null },
  ];

  return (
    <Card>
      <h3>Offboarding Documents</h3>
      <div className="documents-list">
        {documents.map((doc, index) => (
          <div key={index} className="document-item">
            <FileText size={24} />
            <div className="doc-info">
              <h4>{doc.name}</h4>
              {doc.generated && <p>Generated on {new Date(doc.date!).toLocaleDateString()}</p>}
            </div>
            {doc.generated ? (
              <Button variant="secondary" size="sm">Download</Button>
            ) : (
              <Button variant="secondary" size="sm">Generate</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

