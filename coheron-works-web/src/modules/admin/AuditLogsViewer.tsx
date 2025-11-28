import { useState, useEffect } from 'react';
import { FileText, Search, Filter, Download, Calendar } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { rbacService, type AuditLog } from '../../services/rbacService';
import './RBACManagement.css';

export const AuditLogsViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterResourceType, setFilterResourceType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit] = useState(50);

  useEffect(() => {
    loadLogs();
  }, [page, filterAction, filterResourceType]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const data = await rbacService.getAuditLogs({
        action: filterAction || undefined,
        resource_type: filterResourceType || undefined,
        limit,
        offset: (page - 1) * limit
      });
      setLogs(data);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('assign')) return '#27AE60';
    if (action.includes('update') || action.includes('edit')) return '#3498DB';
    if (action.includes('delete') || action.includes('remove')) return '#E74C3C';
    return '#666';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('assign')) return '✓';
    if (action.includes('update') || action.includes('edit')) return '✎';
    if (action.includes('delete') || action.includes('remove')) return '✗';
    return '•';
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         JSON.stringify(log.new_value || {}).toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const actions = Array.from(new Set(logs.map(l => l.action)));
  const resourceTypes = Array.from(new Set(logs.map(l => l.resource_type).filter(Boolean)));

  if (loading && page === 1) {
    return <LoadingSpinner size="medium" message="Loading audit logs..." />;
  }

  return (
    <div className="rbac-management">
      <div className="rbac-header">
        <div className="rbac-title">
          <FileText size={24} />
          <h2>Audit Logs</h2>
        </div>
        <Button variant="ghost">
          <Download size={18} />
          Export
        </Button>
      </div>

      <div className="rbac-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search logs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <Filter size={18} />
          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}>
            <option value="">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="filter-box">
          <Filter size={18} />
          <select value={filterResourceType} onChange={(e) => { setFilterResourceType(e.target.value); setPage(1); }}>
            <option value="">All Resources</option>
            {resourceTypes.map(rt => (
              <option key={rt} value={rt}>{rt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="audit-logs-list">
        {filteredLogs.map(log => (
          <Card key={log.id} className="audit-log-card">
            <div className="log-header">
              <div className="log-action" style={{ color: getActionColor(log.action) }}>
                <span className="action-icon">{getActionIcon(log.action)}</span>
                <span className="action-name">{log.action}</span>
              </div>
              <div className="log-time">
                <Calendar size={14} />
                {new Date(log.created_at).toLocaleString()}
              </div>
            </div>
            <div className="log-details">
              <div className="log-detail-item">
                <span className="detail-label">Resource:</span>
                <span className="detail-value">{log.resource_type || 'N/A'}</span>
              </div>
              {log.resource_id && (
                <div className="log-detail-item">
                  <span className="detail-label">Resource ID:</span>
                  <span className="detail-value">#{log.resource_id}</span>
                </div>
              )}
              {log.user_id && (
                <div className="log-detail-item">
                  <span className="detail-label">User ID:</span>
                  <span className="detail-value">#{log.user_id}</span>
                </div>
              )}
              {log.ip_address && (
                <div className="log-detail-item">
                  <span className="detail-label">IP:</span>
                  <span className="detail-value">{log.ip_address}</span>
                </div>
              )}
            </div>
            {log.new_value && (
              <div className="log-changes">
                <div className="change-item">
                  <strong>New Value:</strong>
                  <pre>{JSON.stringify(log.new_value, null, 2)}</pre>
                </div>
              </div>
            )}
            {log.old_value && (
              <div className="log-changes">
                <div className="change-item">
                  <strong>Old Value:</strong>
                  <pre>{JSON.stringify(log.old_value, null, 2)}</pre>
                </div>
              </div>
            )}
            {!log.success && (
              <div className="log-error">
                <strong>Error:</strong> {log.error_message}
              </div>
            )}
          </Card>
        ))}
      </div>

      {filteredLogs.length === 0 && !loading && (
        <div className="empty-state">
          <FileText size={48} />
          <p>No audit logs found</p>
        </div>
      )}

      <div className="pagination">
        <Button
          variant="ghost"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <span>Page {page}</span>
        <Button
          variant="ghost"
          onClick={() => setPage(p => p + 1)}
          disabled={filteredLogs.length < limit}
        >
          Next
        </Button>
      </div>
    </div>
  );
};

