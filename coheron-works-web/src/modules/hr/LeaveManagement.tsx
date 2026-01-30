import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Download, Settings } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { apiService } from '../../services/apiService';
import { LeaveRequestForm } from './components/LeaveRequestForm';
import { useAuth } from '../../contexts/AuthContext';
import { showToast } from '../../components/Toast';
import { exportToCSV } from '../../utils/exportCSV';
import './LeaveManagement.css';

type LeaveTab = 'overview' | 'requests' | 'policies' | 'calendar' | 'balance';

export const LeaveManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<LeaveTab>('overview');
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [leaveBalance, setLeaveBalance] = useState<any>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [requests, balance] = await Promise.all([
        apiService.get<any>('/leave/requests').catch((err) => { console.error('Failed to load leave requests:', err.userMessage || err.message); return []; }),
        apiService.get<any>(`/leave/balance/${user?.userId || '1'}`).catch((err) => { console.error('Failed to load leave balance:', err.userMessage || err.message); return []; }),
      ]);
      setLeaveRequests(requests);
      
      // Transform balance data
      const balanceMap: any = {};
      balance.forEach((b: any) => {
        balanceMap[b.leave_type] = {
          total: b.total_days,
          used: b.used_days,
          remaining: b.remaining_days,
        };
      });
      setLeaveBalance(balanceMap);
    } catch (error: any) {
      console.error('Failed to load leave data:', error);
      showToast(error.userMessage || 'Failed to load leave data', 'error');
    }
  };

  const tabs = [
    { id: 'overview' as LeaveTab, label: 'Overview', icon: <Calendar size={18} /> },
    { id: 'requests' as LeaveTab, label: 'Leave Requests', icon: <Clock size={18} /> },
    { id: 'policies' as LeaveTab, label: 'Policies', icon: <Settings size={18} /> },
    { id: 'calendar' as LeaveTab, label: 'Calendar', icon: <Calendar size={18} /> },
    { id: 'balance' as LeaveTab, label: 'Leave Balance', icon: <CheckCircle2 size={18} /> },
  ];

  const leaveStats = {
    pending: leaveRequests.filter((r: any) => r.status === 'pending').length,
    approved: leaveRequests.filter((r: any) => r.status === 'approved').length,
    rejected: leaveRequests.filter((r: any) => r.status === 'rejected').length,
    onLeave: leaveRequests.filter((r: any) => r.status === 'approved' && new Date(r.to_date) >= new Date()).length,
  };

  return (
    <div className="leave-management-page">
      <div className="container">
        <div className="leave-header">
          <div>
            <h1>Leave Management</h1>
            <p className="leave-subtitle">Manage employee leave requests and policies</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" icon={<Download size={18} />} onClick={() => exportToCSV(leaveRequests, 'leave-requests', [
              { key: 'employee_name', label: 'Employee' },
              { key: 'leave_type', label: 'Leave Type' },
              { key: 'from_date', label: 'From' },
              { key: 'to_date', label: 'To' },
              { key: 'days', label: 'Days' },
              { key: 'status', label: 'Status' },
            ])}>
              Export
            </Button>
            <Button icon={<Plus size={18} />} onClick={() => setShowRequestForm(true)}>
              New Leave Request
            </Button>
          </div>
        </div>

        <div className="leave-stats">
          <Card className="stat-card">
            <AlertCircle size={24} className="stat-icon pending" />
            <div>
              <h3>{leaveStats.pending}</h3>
              <p>Pending Requests</p>
            </div>
          </Card>
          <Card className="stat-card">
            <CheckCircle2 size={24} className="stat-icon approved" />
            <div>
              <h3>{leaveStats.approved}</h3>
              <p>Approved This Month</p>
            </div>
          </Card>
          <Card className="stat-card">
            <XCircle size={24} className="stat-icon rejected" />
            <div>
              <h3>{leaveStats.rejected}</h3>
              <p>Rejected</p>
            </div>
          </Card>
          <Card className="stat-card">
            <Calendar size={24} className="stat-icon onLeave" />
            <div>
              <h3>{leaveStats.onLeave}</h3>
              <p>Currently on Leave</p>
            </div>
          </Card>
        </div>

        <div className="leave-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`leave-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="leave-content">
          {activeTab === 'overview' && <OverviewTab requests={leaveRequests} />}
          {activeTab === 'requests' && <RequestsTab requests={leaveRequests} />}
          {activeTab === 'policies' && <PoliciesTab />}
          {activeTab === 'calendar' && <CalendarTab />}
          {activeTab === 'balance' && <BalanceTab balance={leaveBalance || {}} />}
        </div>

        {showRequestForm && (
          <LeaveRequestForm
            onClose={() => setShowRequestForm(false)}
            onSave={() => {
              setShowRequestForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

const OverviewTab = ({ requests }: { requests: any[] }) => {
  const recentRequests = requests.slice(0, 5);

  return (
    <div className="overview-content">
      <Card>
        <h3>Recent Leave Requests</h3>
        <table className="leave-table">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Leave Type</th>
              <th>From</th>
              <th>To</th>
              <th>Days</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {recentRequests.map((req) => (
              <tr key={req.id}>
                <td>{req.employee_name || req.employee}</td>
                <td>{req.leave_type || req.type}</td>
                <td>{new Date(req.from_date || req.from).toLocaleDateString()}</td>
                <td>{new Date(req.to_date || req.to).toLocaleDateString()}</td>
                <td>{req.days}</td>
                <td>
                  <span className={`status-badge ${req.status}`}>
                    {req.status === 'pending' ? <AlertCircle size={14} /> : req.status === 'approved' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                    {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

const RequestsTab = ({ requests }: { requests: any[] }) => {
  const [filter, setFilter] = useState('all');
  
  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter((r: any) => r.status === filter);

  return (
    <Card>
      <div className="requests-header">
        <h3>Leave Requests</h3>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All Requests</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      <div className="requests-list">
        {filteredRequests.map((req) => (
          <div key={req.id} className="request-card">
            <div className="request-info">
              <h4>{req.employee_name || req.employee}</h4>
              <p>{req.leave_type || req.type} • {req.days} day(s)</p>
              <p className="request-dates">
                {new Date(req.from_date || req.from).toLocaleDateString()} - {new Date(req.to_date || req.to).toLocaleDateString()}
              </p>
              <p className="request-reason">{req.reason}</p>
            </div>
            <div className="request-actions">
              <span className={`status-badge ${req.status}`}>
                {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
              </span>
              {req.status === 'pending' && (
                <>
                  <Button variant="secondary" size="sm">Approve</Button>
                  <Button variant="secondary" size="sm">Reject</Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const PoliciesTab = () => {
  const policies = [
    { type: 'Annual Leave (PL)', accrual: '1.5 days per month', maxCarryForward: 5, encashment: 'Yes' },
    { type: 'Sick Leave (SL)', accrual: '0.5 days per month', maxCarryForward: 3, encashment: 'No' },
    { type: 'Casual Leave (CL)', accrual: '1 day per month', maxCarryForward: 0, encashment: 'No' },
    { type: 'Earned Leave', accrual: 'Based on attendance', maxCarryForward: 10, encashment: 'Yes' },
  ];

  return (
    <Card>
      <h3>Leave Policies</h3>
      <div className="policies-list">
        {policies.map((policy, index) => (
          <div key={index} className="policy-card">
            <h4>{policy.type}</h4>
            <div className="policy-details">
              <div className="detail-item">
                <span className="label">Accrual Rate</span>
                <span className="value">{policy.accrual}</span>
              </div>
              <div className="detail-item">
                <span className="label">Max Carry Forward</span>
                <span className="value">{policy.maxCarryForward} days</span>
              </div>
              <div className="detail-item">
                <span className="label">Encashment</span>
                <span className="value">{policy.encashment}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

const CalendarTab = () => {
  return (
    <Card>
      <h3>Leave Calendar</h3>
      <p>Visual calendar showing all leave dates</p>
      <div className="calendar-placeholder">
        <Calendar size={48} />
        <p>Calendar view will be displayed here</p>
      </div>
    </Card>
  );
};

const BalanceTab = ({ balance }: { balance: any }) => {
  return (
    <Card>
      <h3>Leave Balance</h3>
      <div className="balance-grid">
        {Object.entries(balance).map(([type, data]: [string, any]) => (
          <div key={type} className="balance-card">
            <h4>{type.charAt(0).toUpperCase() + type.slice(1)} Leave</h4>
            <div className="balance-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${(data.used / data.total) * 100}%` }}
                ></div>
              </div>
              <div className="balance-numbers">
                <span>Used: {data.used}</span>
                <span>Remaining: {data.remaining}</span>
                <span>Total: {data.total}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

