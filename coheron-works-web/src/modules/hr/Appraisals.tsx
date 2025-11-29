import { useState, useEffect } from 'react';
import { Award, Calendar, CheckCircle, Clock, Plus, Target, TrendingUp, Users, BarChart3 } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { apiService } from '../../services/apiService';
import { AppraisalForm } from './components/AppraisalForm';
import { GoalForm } from './components/GoalForm';
import { showToast } from '../../components/Toast';
import './Appraisals.css';

type AppraisalTab = 'overview' | 'appraisals' | 'goals' | 'feedback' | 'reports';

export const Appraisals = () => {
  const [appraisals, setAppraisals] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<AppraisalTab>('overview');
  const [showForm, setShowForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [appraisalsData, employeesData] = await Promise.all([
        apiService.get<any>('/appraisals'),
        apiService.get<any>('/employees'),
      ]);
      setAppraisals(appraisalsData);
      setEmployees(employeesData);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeeName = (id: number) => employees.find(e => e.id === id)?.name || 'Unknown';

  const tabs = [
    { id: 'overview' as AppraisalTab, label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'appraisals' as AppraisalTab, label: 'Appraisals', icon: <Award size={18} /> },
    { id: 'goals' as AppraisalTab, label: 'Goals & OKRs', icon: <Target size={18} /> },
    { id: 'feedback' as AppraisalTab, label: '360 Feedback', icon: <Users size={18} /> },
    { id: 'reports' as AppraisalTab, label: 'Reports', icon: <TrendingUp size={18} /> },
  ];

  const stats = {
    total: appraisals.length,
    completed: appraisals.filter(a => a.state === 'done').length,
    pending: appraisals.filter(a => a.state === 'pending').length,
    inProgress: appraisals.filter(a => a.state === 'new').length,
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="appraisals-page">
      <div className="container">
        <div className="appraisals-header">
          <div>
            <h1>Performance Management</h1>
            <p className="appraisals-subtitle">Employee performance reviews and goal tracking</p>
          </div>
          <div className="header-actions">
            <Button icon={<Plus size={18} />} onClick={() => setShowForm(true)}>
              New Appraisal
            </Button>
          </div>
        </div>

        <div className="appraisals-stats">
          <Card className="stat-card">
            <Award size={24} className="stat-icon" />
            <div>
              <h3>{stats.total}</h3>
              <p>Total Appraisals</p>
            </div>
          </Card>
          <Card className="stat-card">
            <CheckCircle size={24} className="stat-icon completed" />
            <div>
              <h3>{stats.completed}</h3>
              <p>Completed</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Clock size={24} className="stat-icon pending" />
            <div>
              <h3>{stats.pending}</h3>
              <p>Pending</p>
            </div>
          </Card>
          <Card className="stat-card">
            <TrendingUp size={24} className="stat-icon in-progress" />
            <div>
              <h3>{stats.inProgress}</h3>
              <p>In Progress</p>
            </div>
          </Card>
        </div>

        <div className="appraisals-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`appraisal-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="appraisals-content">
          {activeTab === 'overview' && <OverviewTab appraisals={appraisals} getEmployeeName={getEmployeeName} />}
          {activeTab === 'appraisals' && <AppraisalsTab appraisals={appraisals} getEmployeeName={getEmployeeName} />}
          {activeTab === 'goals' && <GoalsTab onAddGoal={() => setShowGoalForm(true)} />}
          {activeTab === 'feedback' && <FeedbackTab />}
          {activeTab === 'reports' && <ReportsTab />}
        </div>

        {showForm && (
          <AppraisalForm
            employees={employees}
            onClose={() => setShowForm(false)}
            onSave={() => {
              setShowForm(false);
              loadData();
            }}
          />
        )}

        {showGoalForm && (
          <GoalForm
            onClose={() => setShowGoalForm(false)}
            onSave={() => {
              setShowGoalForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

const OverviewTab = ({ appraisals, getEmployeeName }: { appraisals: any[]; getEmployeeName: (id: number) => string }) => {
  return (
    <div className="overview-grid">
      <Card>
        <h3>Recent Appraisals</h3>
        <div className="recent-appraisals">
          {appraisals.slice(0, 5).map((appraisal) => (
            <div key={appraisal.id} className="appraisal-item">
              <div>
                <h4>{getEmployeeName(appraisal.employee_id)}</h4>
                <p>Manager: {getEmployeeName(appraisal.manager_id)}</p>
              </div>
              <span className={`status-badge ${appraisal.state}`}>
                {appraisal.state.charAt(0).toUpperCase() + appraisal.state.slice(1)}
              </span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <h3>Performance Trends</h3>
        <div className="trends-placeholder">
          <BarChart3 size={48} />
          <p>Performance trends chart</p>
        </div>
      </Card>
    </div>
  );
};

const AppraisalsTab = ({ appraisals, getEmployeeName }: { appraisals: any[]; getEmployeeName: (id: number) => string }) => {
  return (
    <div className="appraisals-grid">
      {appraisals.map(appraisal => (
        <Card key={appraisal.id} className="appraisal-card">
          <div className="appraisal-header">
            <div>
              <h3>{getEmployeeName(appraisal.employee_id)}</h3>
              <p className="manager-name">Manager: {getEmployeeName(appraisal.manager_id)}</p>
            </div>
            <span className={`status-badge ${appraisal.state}`}>
              {appraisal.state === 'done' ? 'Completed' :
                appraisal.state === 'pending' ? 'Pending' : 
                appraisal.state === 'new' ? 'New' : 'Cancelled'}
            </span>
          </div>

          <div className="appraisal-meta">
            <div className="meta-item">
              <Calendar size={16} />
              <span>Deadline: {new Date(appraisal.date_close).toLocaleDateString()}</span>
            </div>
            {appraisal.final_assessment && (
              <div className="meta-item">
                <CheckCircle size={16} />
                <span>{appraisal.final_assessment}</span>
              </div>
            )}
          </div>

          <div className="appraisal-actions">
            <Button variant="secondary" size="sm" onClick={() => showToast('Appraisal detail view coming soon', 'info')}>View Details</Button>
            <Button variant="secondary" size="sm" onClick={() => showToast('Appraisal edit form coming soon', 'info')}>Edit</Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

const GoalsTab = ({ onAddGoal }: { onAddGoal: () => void }) => {
  const goals = [
    { id: 1, title: 'Increase Sales by 20%', employee: 'Rajesh Kumar', progress: 75, status: 'on_track' },
    { id: 2, title: 'Complete Project X', employee: 'Priya Sharma', progress: 45, status: 'at_risk' },
    { id: 3, title: 'Improve Customer Satisfaction', employee: 'Amit Patel', progress: 90, status: 'on_track' },
  ];

  return (
    <Card>
      <h3>Goals & OKRs</h3>
      <div className="goals-list">
        {goals.map((goal) => (
          <div key={goal.id} className="goal-item">
            <div className="goal-info">
              <h4>{goal.title}</h4>
              <p>{goal.employee}</p>
            </div>
            <div className="goal-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${goal.progress}%` }}></div>
              </div>
              <span>{goal.progress}%</span>
            </div>
            <span className={`status-badge ${goal.status}`}>
              {goal.status === 'on_track' ? 'On Track' : 'At Risk'}
            </span>
          </div>
        ))}
      </div>
      <Button icon={<Plus size={18} />} onClick={onAddGoal}>Add Goal</Button>
    </Card>
  );
};

const FeedbackTab = () => {
  return (
    <Card>
      <h3>360 Degree Feedback</h3>
      <div className="feedback-section">
        <p>Collect feedback from peers, managers, and direct reports</p>
        <div className="feedback-list">
          <div className="feedback-item">
            <h4>Self Assessment</h4>
            <Button variant="secondary" size="sm">Start</Button>
          </div>
          <div className="feedback-item">
            <h4>Peer Feedback</h4>
            <Button variant="secondary" size="sm">Request</Button>
          </div>
          <div className="feedback-item">
            <h4>Manager Feedback</h4>
            <Button variant="secondary" size="sm">View</Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

const ReportsTab = () => {
  return (
    <Card>
      <h3>Performance Reports</h3>
      <div className="reports-grid">
        <div className="report-card">
          <BarChart3 size={32} />
          <h4>Performance Summary</h4>
          <Button variant="secondary" size="sm">Generate</Button>
        </div>
        <div className="report-card">
          <TrendingUp size={32} />
          <h4>Trend Analysis</h4>
          <Button variant="secondary" size="sm">Generate</Button>
        </div>
        <div className="report-card">
          <Users size={32} />
          <h4>Team Performance</h4>
          <Button variant="secondary" size="sm">Generate</Button>
        </div>
      </div>
    </Card>
  );
};
