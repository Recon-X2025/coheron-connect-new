import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronRight } from 'lucide-react';

interface AuditEntry {
  _id: string;
  timestamp: string;
  user: string;
  action: string;
  entity_type: string;
  entity_id: string;
  ip_address: string;
  changes?: { field: string; old_value: any; new_value: any }[];
}

const ACTIONS = ['', 'create', 'update', 'delete', 'login', 'logout', 'export', 'import'];

export default function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const fetchLogs = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '25' });
    if (entityType) params.set('entity_type', entityType);
    if (action) params.set('action', action);
    if (userSearch) params.set('user', userSearch);

    fetch(`/api/audit-logs?${params}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
      .then(r => r.json())
      .then(res => {
        setLogs(Array.isArray(res) ? res : res.data || []);
        setTotalPages(res.totalPages || 1);
      })
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page]);

  const handleFilter = () => { setPage(1); fetchLogs(); };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><FileText size={24} /> Audit Log Viewer</h1>
      </div>

      <div className="filter-bar">
        <div className="form-group">
          <label>Entity Type</label>
          <input className="input" value={entityType} onChange={e => setEntityType(e.target.value)} placeholder="e.g. User, Order" />
        </div>
        <div className="form-group">
          <label>Action</label>
          <select className="input" value={action} onChange={e => setAction(e.target.value)}>
            {ACTIONS.map(a => <option key={a} value={a}>{a || 'All'}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>User</label>
          <input className="input" value={userSearch} onChange={e => setUserSearch(e.target.value)} placeholder="Search user..." />
        </div>
        <button className="btn btn--primary" onClick={handleFilter}>Filter</button>
      </div>

      {loading ? (
        <div className="page-loading">Loading audit logs...</div>
      ) : (
        <div className="section">
          <table className="data-table">
            <thead>
              <tr>
                <th></th>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity Type</th>
                <th>Entity ID</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <>
                  <tr key={log._id} onClick={() => setExpandedRow(expandedRow === log._id ? null : log._id)} className="data-table__row--clickable">
                    <td>
                      {log.changes?.length ? (
                        expandedRow === log._id ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                      ) : null}
                    </td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.user}</td>
                    <td><span className={`badge badge--${log.action}`}>{log.action}</span></td>
                    <td>{log.entity_type}</td>
                    <td className="mono">{log.entity_id}</td>
                    <td className="mono">{log.ip_address}</td>
                  </tr>
                  {expandedRow === log._id && log.changes?.length && (
                    <tr key={`${log._id}-detail`} className="data-table__detail-row">
                      <td colSpan={7}>
                        <table className="data-table data-table--nested">
                          <thead>
                            <tr><th>Field</th><th>Old Value</th><th>New Value</th></tr>
                          </thead>
                          <tbody>
                            {log.changes!.map((c, i) => (
                              <tr key={i}>
                                <td>{c.field}</td>
                                <td className="mono">{JSON.stringify(c.old_value)}</td>
                                <td className="mono">{JSON.stringify(c.new_value)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
