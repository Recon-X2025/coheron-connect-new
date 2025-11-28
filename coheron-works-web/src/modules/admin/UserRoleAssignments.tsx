import { useState, useEffect } from 'react';
import { Users, UserPlus, X, Calendar, Search } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { rbacService, type Role, type UserRole, type UserPermissions } from '../../services/rbacService';
import { apiService } from '../../services/apiService';
import './RBACManagement.css';

interface User {
  id: number;
  name: string;
  email: string;
}

export const UserRoleAssignments: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userRoles, setUserRoles] = useState<Record<number, UserPermissions>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    role_id: '',
    expires_at: '',
    notes: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      loadUserRoles(selectedUser.id);
    }
  }, [selectedUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        apiService.get<User[]>('/partners').catch(() => []),
        rbacService.getRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserRoles = async (userId: number) => {
    try {
      const data = await rbacService.getUserPermissions(userId);
      setUserRoles(prev => ({ ...prev, [userId]: data }));
    } catch (error) {
      console.error('Failed to load user roles:', error);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !assignFormData.role_id) return;
    try {
      await rbacService.assignRoleToUser(
        selectedUser.id,
        parseInt(assignFormData.role_id),
        assignFormData.expires_at || undefined,
        assignFormData.notes || undefined
      );
      setShowAssignModal(false);
      setAssignFormData({ role_id: '', expires_at: '', notes: '' });
      loadUserRoles(selectedUser.id);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    if (!confirm('Are you sure you want to remove this role from the user?')) return;
    try {
      await rbacService.removeRoleFromUser(userId, roleId);
      loadUserRoles(userId);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to remove role');
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUserRoles = (userId: number) => {
    return userRoles[userId]?.roles || [];
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading users..." />;
  }

  return (
    <div className="rbac-management">
      <div className="rbac-header">
        <div className="rbac-title">
          <Users size={24} />
          <h2>User-Role Assignments</h2>
        </div>
      </div>

      <div className="user-role-layout">
        <div className="users-list">
          <div className="search-box">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="users-scroll">
            {filteredUsers.map(user => (
              <Card
                key={user.id}
                className={`user-card ${selectedUser?.id === user.id ? 'selected' : ''}`}
                onClick={() => setSelectedUser(user)}
              >
                <div className="user-info">
                  <div className="user-avatar">{user.name.charAt(0).toUpperCase()}</div>
                  <div>
                    <h4>{user.name}</h4>
                    <p>{user.email}</p>
                  </div>
                </div>
                <div className="user-role-count">
                  {getUserRoles(user.id).length} role{getUserRoles(user.id).length !== 1 ? 's' : ''}
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="user-roles-panel">
          {selectedUser ? (
            <>
              <div className="panel-header">
                <div>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>
                <Button onClick={() => setShowAssignModal(true)}>
                  <UserPlus size={18} />
                  Assign Role
                </Button>
              </div>

              <div className="roles-list">
                {getUserRoles(selectedUser.id).length > 0 ? (
                  getUserRoles(selectedUser.id).map(role => {
                    const userRole = userRoles[selectedUser.id]?.roles.find(r => r.id === role.id);
                    return (
                      <Card key={role.id} className="assigned-role-card">
                        <div className="role-header">
                          <div>
                            <h4>{role.name}</h4>
                            <p className="role-code">{role.code}</p>
                          </div>
                          <div className="role-level">Level {role.level}</div>
                        </div>
                        {role.description && (
                          <p className="role-description">{role.description}</p>
                        )}
                        <div className="role-meta">
                          <span className="module-badge">{role.module.toUpperCase()}</span>
                          {userRole && (userRole as any).expires_at && (
                            <span className="expiry-badge">
                              <Calendar size={14} />
                              Expires: {new Date((userRole as any).expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <div className="role-actions">
                          <Button
                            variant="ghost"
                            size="small"
                            onClick={() => handleRemoveRole(selectedUser.id, role.id)}
                            className="danger"
                          >
                            <X size={16} />
                            Remove
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <div className="empty-state">
                    <Users size={48} />
                    <p>No roles assigned</p>
                    <Button onClick={() => setShowAssignModal(true)}>
                      Assign First Role
                    </Button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Users size={48} />
              <p>Select a user to view their roles</p>
            </div>
          )}
        </div>
      </div>

      {showAssignModal && selectedUser && (
        <div className="modal-overlay" onClick={() => { setShowAssignModal(false); setAssignFormData({ role_id: '', expires_at: '', notes: '' }); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Role to {selectedUser.name}</h3>
            <div className="form-group">
              <label>Role *</label>
              <select
                value={assignFormData.role_id}
                onChange={(e) => setAssignFormData({ ...assignFormData, role_id: e.target.value })}
              >
                <option value="">Select a role</option>
                {roles
                  .filter(r => r.is_active && !getUserRoles(selectedUser.id).some(ur => ur.id === r.id))
                  .map(role => (
                    <option key={role.id} value={role.id}>
                      {role.name} ({role.module} - Level {role.level})
                    </option>
                  ))}
              </select>
            </div>
            <div className="form-group">
              <label>Expires At (Optional)</label>
              <input
                type="datetime-local"
                value={assignFormData.expires_at}
                onChange={(e) => setAssignFormData({ ...assignFormData, expires_at: e.target.value })}
              />
              <small>Leave empty for permanent assignment</small>
            </div>
            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={assignFormData.notes}
                onChange={(e) => setAssignFormData({ ...assignFormData, notes: e.target.value })}
                rows={3}
                placeholder="Add notes about this assignment..."
              />
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => { setShowAssignModal(false); setAssignFormData({ role_id: '', expires_at: '', notes: '' }); }}>
                Cancel
              </Button>
              <Button onClick={handleAssignRole} disabled={!assignFormData.role_id}>
                Assign Role
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

