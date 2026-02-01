import { useState } from 'react';
import { UserPlus, CheckCircle2, Clock, FileText, Settings, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { OnboardingForm } from './components/OnboardingForm';
import './Onboarding.css';

type OnboardingTab = 'overview' | 'tasks' | 'documents' | 'checklist';

export const Onboarding = () => {
  const [activeTab, setActiveTab] = useState<OnboardingTab>('overview');
  const [showOnboardingForm, setShowOnboardingForm] = useState(false);

  const tabs = [
    { id: 'overview' as OnboardingTab, label: 'Overview', icon: <UserPlus size={18} /> },
    { id: 'tasks' as OnboardingTab, label: 'Tasks', icon: <CheckCircle2 size={18} /> },
    { id: 'documents' as OnboardingTab, label: 'Documents', icon: <FileText size={18} /> },
    { id: 'checklist' as OnboardingTab, label: 'Checklist', icon: <Settings size={18} /> },
  ];

  const onboardingStats = {
    inProgress: 5,
    completed: 45,
    pending: 3,
  };

  const onboardingList = [
    { id: 1, name: 'Rajesh Kumar', department: 'Engineering', startDate: '2024-12-15', status: 'in_progress', progress: 60 },
    { id: 2, name: 'Priya Sharma', department: 'HR', startDate: '2024-12-20', status: 'pending', progress: 0 },
    { id: 3, name: 'Amit Patel', department: 'Sales', startDate: '2024-12-10', status: 'completed', progress: 100 },
  ];

  return (
    <div className="onboarding-page">
      <div className="container">
        <div className="onboarding-header">
          <div>
            <h1>Employee Onboarding</h1>
            <p className="onboarding-subtitle">Streamline new employee onboarding process</p>
          </div>
          <div className="header-actions">
            <Button icon={<Plus size={18} />} onClick={() => setShowOnboardingForm(true)}>New Onboarding</Button>
          </div>
        </div>

        <div className="onboarding-stats">
          <Card className="stat-card">
            <Clock size={24} className="stat-icon in-progress" />
            <div>
              <h3>{onboardingStats.inProgress}</h3>
              <p>In Progress</p>
            </div>
          </Card>
          <Card className="stat-card">
            <CheckCircle2 size={24} className="stat-icon completed" />
            <div>
              <h3>{onboardingStats.completed}</h3>
              <p>Completed</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Clock size={24} className="stat-icon pending" />
            <div>
              <h3>{onboardingStats.pending}</h3>
              <p>Pending</p>
            </div>
          </Card>
        </div>

        <div className="onboarding-tabs">
          {tabs.map((tab, idx) => (
            <button
              key={tab.id || (tab as any)._id || idx}
              className={`onboarding-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="onboarding-content">
          {activeTab === 'overview' && <OverviewTab list={onboardingList} />}
          {activeTab === 'tasks' && <TasksTab />}
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'checklist' && <ChecklistTab />}
        </div>

        {showOnboardingForm && (
          <OnboardingForm
            onClose={() => setShowOnboardingForm(false)}
            onSave={() => {
              setShowOnboardingForm(false);
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
      <h3>Onboarding List</h3>
      <table className="onboarding-table">
        <thead>
          <tr>
            <th>Employee</th>
            <th>Department</th>
            <th>Start Date</th>
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
              <td>{new Date(item.startDate).toLocaleDateString()}</td>
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

const TasksTab = () => {
  const tasks = [
    { id: 1, title: 'Complete KYC Forms', category: 'Documents', assignedTo: 'HR Team', status: 'completed' },
    { id: 2, title: 'IT Asset Provisioning', category: 'IT', assignedTo: 'IT Team', status: 'in_progress' },
    { id: 3, title: 'Orientation Session', category: 'Training', assignedTo: 'HR Team', status: 'pending' },
  ];

  return (
    <Card>
      <h3>Onboarding Tasks</h3>
      <div className="tasks-list">
        {tasks.map((task, idx) => (
          <div key={task.id || (task as any)._id || idx} className="task-item">
            <div className="task-info">
              <h4>{task.title}</h4>
              <p>{task.category} • Assigned to: {task.assignedTo}</p>
            </div>
            <span className={`status-badge ${task.status}`}>
              {task.status === 'completed' ? 'Completed' : task.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

const DocumentsTab = () => {
  const documents = [
    { id: 1, name: 'ID Proof', required: true, uploaded: true },
    { id: 2, name: 'PAN Card', required: true, uploaded: true },
    { id: 3, name: 'Bank Details', required: true, uploaded: false },
    { id: 4, name: 'Educational Certificates', required: false, uploaded: false },
  ];

  return (
    <Card>
      <h3>Required Documents</h3>
      <div className="documents-list">
        {documents.map((doc, idx) => (
          <div key={doc.id || (doc as any)._id || idx} className="document-item">
            <FileText size={24} />
            <div className="doc-info">
              <h4>{doc.name}</h4>
              <p>{doc.required ? 'Required' : 'Optional'}</p>
            </div>
            {doc.uploaded ? (
              <CheckCircle2 size={20} className="success" />
            ) : (
              <Button variant="secondary" size="sm">Upload</Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};

const ChecklistTab = () => {
  const checklist = [
    { id: 1, item: 'Welcome email sent', completed: true },
    { id: 2, item: 'Access cards issued', completed: true },
    { id: 3, item: 'Laptop assigned', completed: false },
    { id: 4, item: 'Email account created', completed: true },
    { id: 5, item: 'Orientation scheduled', completed: false },
  ];

  return (
    <Card>
      <h3>Onboarding Checklist</h3>
      <div className="checklist">
        {checklist.map((item, idx) => (
          <div key={item.id || (item as any)._id || idx} className="checklist-item">
            <input type="checkbox" checked={item.completed} readOnly />
            <span className={item.completed ? 'completed' : ''}>{item.item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
};

