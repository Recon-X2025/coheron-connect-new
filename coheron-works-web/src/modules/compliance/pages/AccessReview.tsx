import { useState, useEffect } from 'react';
import { Users, ShieldCheck, LogOut } from 'lucide-react';

interface Session {
  _id: string;
  user: string;
  email: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_active: string;
}

interface UserPermission {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissions: string[];
  last_login: string;
  is_active: boolean;
}

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json',
});

export default function AccessReview() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [users, setUsers] = useState<UserPermission[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchSessions = () => {
    setLoadingSessions(true);
    fetch('/api/security-dashboard/active-sessions', { headers: authHeaders() })
      .then(r => r.json())
      .then(res => setSessions(Array.isArray(res) ? res : res.data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSessions(false));
  };

  const fetchUsers = () => {
    setLoadingUsers(true);
    fetch('/api/rbac/users-permissions', { headers: authHeaders() })
      .then(r => r.json())
      .then(res => setUsers(Array.isArray(res) ? res : res.data || []))
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false));
  };

  useEffect(() => {
    fetchSessions();
    fetchUsers();
  }, []);

  const terminateSession = (sessionId: string) => {
    if (!confirm('Terminate this session?')) return;
    fetch(`/api/security-dashboard/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }).then(() => fetchSessions());
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><ShieldCheck size={24} /> Access Review</h1>
      </div>

      <div className="section">
        <h2><Users size={18} /> Active Sessions</h2>
        {loadingSessions ? (
          <div className="page-loading">Loading sessions...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>IP Address</th>
                <th>Started</th>
                <th>Last Active</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s._id}>
                  <td>{s.user}</td>
                  <td>{s.email}</td>
                  <td className="mono">{s.ip_address}</td>
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                  <td>{new Date(s.last_active).toLocaleString()}</td>
                  <td>
                    <button className="btn btn--sm btn--danger" onClick={() => terminateSession(s._id)}>
                      <LogOut size={14} /> Terminate
                    </button>
                  </td>
                </tr>
              ))}
              {!sessions.length && (
                <tr><td colSpan={6}>No active sessions found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="section">
        <h2><ShieldCheck size={18} /> User Permissions</h2>
        {loadingUsers ? (
          <div className="page-loading">Loading user permissions...</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Last Login</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="badge">{u.role}</span></td>
                  <td>
                    <div className="tag-list">
                      {u.permissions.map(p => (
                        <span key={p} className="tag">{p}</span>
                      ))}
                    </div>
                  </td>
                  <td>{u.last_login ? new Date(u.last_login).toLocaleDateString() : '-'}</td>
                  <td>
                    <span className={`badge badge--${u.is_active ? 'active' : 'inactive'}`}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr><td colSpan={6}>No users found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
