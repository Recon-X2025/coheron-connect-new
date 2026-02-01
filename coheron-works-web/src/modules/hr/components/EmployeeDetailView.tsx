import { useState } from 'react';
import { ArrowLeft, Edit, Download, FileText, Phone, Mail, Plus } from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import './EmployeeDetailView.css';

interface EmployeeDetailViewProps {
  employee: any;
  onBack: () => void;
  onEdit: () => void;
}

export const EmployeeDetailView = ({ employee, onBack, onEdit }: EmployeeDetailViewProps) => {
  const tabs = ['overview', 'personal', 'employment', 'documents', 'emergency', 'history'];
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="employee-detail-view">
      <div className="container">
        <div className="detail-header">
          <Button variant="ghost" icon={<ArrowLeft size={18} />} onClick={onBack}>
            Back to Employees
          </Button>
          <div className="header-actions">
            <Button variant="secondary" icon={<Download size={18} />}>
              Export
            </Button>
            <Button icon={<Edit size={18} />} onClick={onEdit}>
              Edit
            </Button>
          </div>
        </div>

        <Card className="employee-profile-card">
          <div className="profile-header">
            <div className="profile-avatar-large">
              {employee.name.charAt(0)}
            </div>
            <div className="profile-info">
              <h1>{employee.name}</h1>
              <p className="job-title">{employee.job_title || 'No Title'}</p>
              <div className="profile-meta">
                <span><Mail size={16} /> {employee.work_email || 'No Email'}</span>
                <span><Phone size={16} /> {employee.work_phone || 'No Phone'}</span>
              </div>
            </div>
          </div>
        </Card>

        <div className="detail-tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="detail-content">
          {activeTab === 'overview' && <OverviewTab employee={employee} />}
          {activeTab === 'personal' && <PersonalTab />}
          {activeTab === 'employment' && <EmploymentTab employee={employee} />}
          {activeTab === 'documents' && <DocumentsTab />}
          {activeTab === 'emergency' && <EmergencyTab />}
          {activeTab === 'history' && <HistoryTab />}
        </div>
      </div>
    </div>
  );
};

const OverviewTab = ({ employee }: { employee: any }) => (
  <div className="overview-grid">
    <Card>
      <h3>Quick Info</h3>
      <div className="info-grid">
        <div className="info-item">
          <span className="label">Employee ID</span>
          <span className="value">EMP{employee.id.toString().padStart(4, '0')}</span>
        </div>
        <div className="info-item">
          <span className="label">Status</span>
          <span className={`value badge ${employee.attendance_state}`}>
            {employee.attendance_state === 'checked_in' ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="info-item">
          <span className="label">Department</span>
          <span className="value">Engineering</span>
        </div>
        <div className="info-item">
          <span className="label">Manager</span>
          <span className="value">John Doe</span>
        </div>
      </div>
    </Card>
    <Card>
      <h3>Contact Information</h3>
      <div className="info-list">
        <div className="info-row">
          <Mail size={18} />
          <span>{employee.work_email || 'No Email'}</span>
        </div>
        <div className="info-row">
          <Phone size={18} />
          <span>{employee.work_phone || 'No Phone'}</span>
        </div>
      </div>
    </Card>
  </div>
);

const PersonalTab = () => (
  <Card>
    <h3>Personal Information</h3>
    <div className="form-grid">
      <div className="form-group">
        <label>Date of Birth</label>
        <input type="date" />
      </div>
      <div className="form-group">
        <label>PAN Number</label>
        <input type="text" placeholder="ABCDE1234F" />
      </div>
      <div className="form-group">
        <label>Aadhaar Number</label>
        <input type="text" placeholder="1234 5678 9012" />
      </div>
      <div className="form-group">
        <label>Address</label>
        <textarea rows={3}></textarea>
      </div>
    </div>
  </Card>
);

const EmploymentTab = ({ employee }: { employee: any }) => {
  return (
  <Card>
    <h3>Employment Details</h3>
    <div className="form-grid">
      <div className="form-group">
        <label>Hire Date</label>
        <input type="date" />
      </div>
      <div className="form-group">
        <label>Department</label>
        <select>
          <option>Engineering</option>
          <option>HR</option>
          <option>Sales</option>
        </select>
      </div>
      <div className="form-group">
        <label>Position</label>
        <input type="text" defaultValue={employee.job_title || ''} />
      </div>
      <div className="form-group">
        <label>Reporting Manager</label>
        <select>
          <option>John Doe</option>
          <option>Jane Smith</option>
        </select>
      </div>
    </div>
  </Card>
  );
};

const DocumentsTab = () => (
  <Card>
    <h3>Documents</h3>
    <div className="documents-list">
      <div className="document-item">
        <FileText size={24} />
        <div>
          <h4>ID Proof</h4>
          <p>Uploaded on Jan 15, 2024</p>
        </div>
        <Button variant="secondary" size="sm">Download</Button>
      </div>
      <div className="document-item">
        <FileText size={24} />
        <div>
          <h4>Employment Contract</h4>
          <p>Uploaded on Jan 15, 2024</p>
        </div>
        <Button variant="secondary" size="sm">Download</Button>
      </div>
    </div>
    <Button icon={<Plus size={18} />}>Upload Document</Button>
  </Card>
);

const EmergencyTab = () => (
  <Card>
    <h3>Emergency Contacts</h3>
    <div className="emergency-contacts">
      <div className="contact-card">
        <h4>Primary Contact</h4>
        <div className="contact-info">
          <span>Name: John Doe</span>
          <span>Relationship: Spouse</span>
          <span>Phone: +91 98765 43210</span>
        </div>
      </div>
    </div>
    <Button icon={<Plus size={18} />}>Add Contact</Button>
  </Card>
);

const HistoryTab = () => (
  <Card>
    <h3>Employment History</h3>
    <div className="history-timeline">
      <div className="timeline-item">
        <div className="timeline-marker"></div>
        <div className="timeline-content">
          <h4>Promoted to Senior Developer</h4>
          <p>Jan 15, 2024</p>
        </div>
      </div>
      <div className="timeline-item">
        <div className="timeline-marker"></div>
        <div className="timeline-content">
          <h4>Joined Company</h4>
          <p>Jan 1, 2020</p>
        </div>
      </div>
    </div>
  </Card>
);

