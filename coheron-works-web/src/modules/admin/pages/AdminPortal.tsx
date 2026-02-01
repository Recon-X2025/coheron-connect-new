import { useState, useEffect } from 'react';
import { Users, Settings, CreditCard, Shield, Activity, TrendingUp, Key, FileText, UserCheck, Upload } from 'lucide-react';
import { Card } from '../../../components/Card';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { apiService } from '../../../services/apiService';
import { RolesManagement } from '../RolesManagement';
import { PermissionsManagement } from '../PermissionsManagement';
import { UserRoleAssignments } from '../UserRoleAssignments';
import { AuditLogsViewer } from '../AuditLogsViewer';
import { DataImport } from '../DataImport';
import { showToast } from '../../../components/Toast';
import './AdminPortal.css';

interface Subscription {
  plan: string;
  status: string;
  users: number;
  maxUsers: number;
  expiresAt: string;
}

type AdminTab = 'overview' | 'roles' | 'permissions' | 'assignments' | 'audit' | 'import';

export const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      // Load users and subscription data
      const usersData = await apiService.get<any>('/partners').catch((err) => { console.error('Failed to load partners:', err.userMessage || err.message); return []; });
      setUsers(usersData.slice(0, 5)); // Show first 5

      // Mock subscription data (would come from API in production)
      setSubscription({
        plan: 'Professional',
        status: 'active',
        users: usersData.length,
        maxUsers: 50,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } catch (error: any) {
      console.error('Failed to load admin data:', error);
      showToast(error.userMessage || 'Failed to load admin data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-portal">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading admin portal..." />
        </div>
      </div>
    );
  }

  return (
    <div className="admin-portal">
      <div className="container">
        <div className="admin-header">
          <div>
            <h1>Admin Portal</h1>
            <p className="admin-subtitle">Manage your organization settings, subscriptions, and access control</p>
          </div>
        </div>

        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={18} />
            Overview
          </button>
          <button
            className={`admin-tab ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            <Shield size={18} />
            Roles
          </button>
          <button
            className={`admin-tab ${activeTab === 'permissions' ? 'active' : ''}`}
            onClick={() => setActiveTab('permissions')}
          >
            <Key size={18} />
            Permissions
          </button>
          <button
            className={`admin-tab ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <UserCheck size={18} />
            User Assignments
          </button>
          <button
            className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <FileText size={18} />
            Audit Logs
          </button>
          <button
            className={`admin-tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            <Upload size={18} />
            Data Import
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="admin-grid">
          <Card className="admin-card subscription-card">
            <div className="card-header">
              <CreditCard size={24} />
              <h2>Subscription</h2>
            </div>
            <div className="subscription-info">
              <div className="subscription-plan">
                <span className="plan-name">{subscription?.plan || 'Free'}</span>
                <span className={`plan-status ${subscription?.status || 'active'}`}>
                  {subscription?.status || 'Active'}
                </span>
              </div>
              <div className="subscription-details">
                <div className="detail-item">
                  <span className="detail-label">Users</span>
                  <span className="detail-value">
                    {subscription?.users || 0} / {subscription?.maxUsers || 0}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Renews</span>
                  <span className="detail-value">
                    {subscription?.expiresAt
                      ? new Date(subscription.expiresAt).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <Button className="upgrade-btn">Upgrade Plan</Button>
            </div>
          </Card>

          <Card className="admin-card">
            <div className="card-header">
              <Users size={24} />
              <h2>User Management</h2>
            </div>
            <div className="user-stats">
              <div className="stat-item">
                <span className="stat-value">{users.length}</span>
                <span className="stat-label">Total Users</span>
              </div>
              <Button variant="ghost">Manage Users</Button>
            </div>
            <div className="recent-users">
              <h3>Recent Users</h3>
              {users.length > 0 ? (
                <ul className="user-list">
                  {users.map((user, idx) => (
                    <li key={user.id || (user as any)._id || idx}>
                      <span className="user-name">{user.name}</span>
                      <span className="user-email">{user.email}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">No users found</p>
              )}
            </div>
          </Card>

          <Card className="admin-card">
            <div className="card-header">
              <Settings size={24} />
              <h2>Organization Settings</h2>
            </div>
            <div className="settings-list">
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Company Information</h3>
                  <p>Update your company details and branding</p>
                </div>
                <Button variant="ghost">Edit</Button>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Billing & Payment</h3>
                  <p>Manage payment methods and billing history</p>
                </div>
                <Button variant="ghost">Manage</Button>
              </div>
              <div className="setting-item">
                <div className="setting-info">
                  <h3>Security Settings</h3>
                  <p>Configure security policies and access controls</p>
                </div>
                <Button variant="ghost">Configure</Button>
              </div>
            </div>
          </Card>

          <Card className="admin-card">
            <div className="card-header">
              <Activity size={24} />
              <h2>Usage Statistics</h2>
            </div>
            <div className="usage-stats">
              <div className="usage-item">
                <TrendingUp size={20} />
                <div>
                  <span className="usage-value">1,234</span>
                  <span className="usage-label">API Calls (This Month)</span>
                </div>
              </div>
              <div className="usage-item">
                <Users size={20} />
                <div>
                  <span className="usage-value">45</span>
                  <span className="usage-label">Active Sessions</span>
                </div>
              </div>
              <div className="usage-item">
                <Shield size={20} />
                <div>
                  <span className="usage-value">99.9%</span>
                  <span className="usage-label">Uptime</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
        )}

        {activeTab === 'roles' && <RolesManagement />}
        {activeTab === 'permissions' && <PermissionsManagement />}
        {activeTab === 'assignments' && <UserRoleAssignments />}
        {activeTab === 'audit' && <AuditLogsViewer />}
        {activeTab === 'import' && <DataImport />}
      </div>
    </div>
  );
};

export default AdminPortal;
