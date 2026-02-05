import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Users, Clock } from 'lucide-react';

interface SecurityOverview {
  overview: {
    failed_logins_24h: number;
    successful_logins_24h: number;
    active_sessions: number;
    critical_events_7d: number;
    pending_dsars: number;
  };
  recent_security_events: any[];
  recent_changes: any[];
}

export default function SecurityDashboard() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/security-dashboard', {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
    })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loading">Loading security dashboard...</div>;
  if (!data) return <div className="page-error">Failed to load security data</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><Shield size={24} /> Security Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-card--danger">
          <AlertTriangle size={20} />
          <div className="stat-card__value">{data.overview.failed_logins_24h}</div>
          <div className="stat-card__label">Failed Logins (24h)</div>
        </div>
        <div className="stat-card">
          <Users size={20} />
          <div className="stat-card__value">{data.overview.active_sessions}</div>
          <div className="stat-card__label">Active Sessions</div>
        </div>
        <div className="stat-card stat-card--warning">
          <AlertTriangle size={20} />
          <div className="stat-card__value">{data.overview.critical_events_7d}</div>
          <div className="stat-card__label">Critical Events (7d)</div>
        </div>
        <div className="stat-card">
          <Clock size={20} />
          <div className="stat-card__value">{data.overview.pending_dsars}</div>
          <div className="stat-card__label">Pending DSARs</div>
        </div>
      </div>

      <div className="section">
        <h2>Recent Security Events</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Severity</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_security_events.map((event: any, i: number) => (
              <tr key={i}>
                <td>{new Date(event.timestamp).toLocaleString()}</td>
                <td>{event.event_type}</td>
                <td><span className={`badge badge--${event.severity}`}>{event.severity}</span></td>
                <td>{event.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>Recent Changes</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_changes.map((change: any, i: number) => (
              <tr key={i}>
                <td>{new Date(change.timestamp).toLocaleString()}</td>
                <td>{change.user}</td>
                <td>{change.action}</td>
                <td>{change.entity_type}</td>
                <td>{change.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
