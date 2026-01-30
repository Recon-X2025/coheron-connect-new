import { useState, useMemo, useCallback } from 'react';
import { FileText, Search, Download, X, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { showToast } from '../../components/Toast';
import { exportToCSV } from '../../utils/exportCSV';
import './AuditLogsViewer.css';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: number;
  timestamp: string;
  user: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'export';
  entityType: string;
  entityId: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}

// ── Mock Data ──────────────────────────────────────────────────────────────────

const USERS = [
  'Priya Sharma', 'Arjun Patel', 'Kathi Iyer', 'Deepa Nair', 'Vikram Singh',
  'Ananya Das', 'Rohan Mehta', 'Sneha Rao', 'Admin System', 'Kavya Joshi',
];

const ENTITY_TYPES = ['Lead', 'Deal', 'Invoice', 'Employee', 'Contact', 'Product', 'Task', 'Project', 'Expense', 'Payroll'];

const ACTIONS: AuditLogEntry['action'][] = ['create', 'update', 'delete', 'login', 'export'];

const IP_ADDRESSES = [
  '192.168.1.10', '10.0.0.45', '172.16.0.22', '192.168.1.105', '10.0.1.33',
  '203.0.113.50', '198.51.100.14', '172.16.5.8', '192.168.0.201', '10.10.10.1',
];

function generateMockLogs(): AuditLogEntry[] {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const logs: AuditLogEntry[] = [];

  const descriptions: Record<string, (entity: string, id: string) => string> = {
    create: (e, id) => `Created ${e} #${id}`,
    update: (e, id) => `Updated ${e} #${id} fields`,
    delete: (e, id) => `Deleted ${e} #${id}`,
    login: () => `User logged in successfully`,
    export: (e) => `Exported ${e} data to CSV`,
  };

  const oldValues: Record<string, Record<string, unknown>> = {
    Lead: { status: 'New', assignedTo: 'Unassigned', score: 20 },
    Deal: { stage: 'Qualification', amount: 15000, probability: 30 },
    Invoice: { status: 'Draft', amount: 5200, dueDate: '2025-12-15' },
    Employee: { department: 'Engineering', designation: 'Junior Developer', salary: 45000 },
    Contact: { email: 'old@example.com', phone: '+91-9800000000' },
    Product: { price: 299, stock: 50, category: 'Electronics' },
    Task: { status: 'To Do', priority: 'Medium', assignee: 'Unassigned' },
    Project: { status: 'Planning', budget: 100000, progress: 10 },
    Expense: { status: 'Pending', amount: 1200, category: 'Travel' },
    Payroll: { basicSalary: 40000, hra: 16000, totalDeductions: 8000 },
  };

  const newValues: Record<string, Record<string, unknown>> = {
    Lead: { status: 'Qualified', assignedTo: 'Priya Sharma', score: 75 },
    Deal: { stage: 'Proposal', amount: 22000, probability: 65 },
    Invoice: { status: 'Sent', amount: 5200, dueDate: '2025-12-30' },
    Employee: { department: 'Engineering', designation: 'Senior Developer', salary: 72000 },
    Contact: { email: 'updated@company.com', phone: '+91-9811111111' },
    Product: { price: 349, stock: 120, category: 'Electronics' },
    Task: { status: 'In Progress', priority: 'High', assignee: 'Arjun Patel' },
    Project: { status: 'In Progress', budget: 120000, progress: 45 },
    Expense: { status: 'Approved', amount: 1200, category: 'Travel' },
    Payroll: { basicSalary: 50000, hra: 20000, totalDeductions: 10000 },
  };

  for (let i = 0; i < 50; i++) {
    const action = ACTIONS[i % ACTIONS.length];
    const entityType = ENTITY_TYPES[i % ENTITY_TYPES.length];
    const entityId = String(1000 + Math.floor(Math.random() * 9000));
    const user = USERS[i % USERS.length];
    const ts = new Date(now - Math.floor(Math.random() * thirtyDays));

    logs.push({
      id: i + 1,
      timestamp: ts.toISOString(),
      user,
      action,
      entityType: action === 'login' ? 'Session' : entityType,
      entityId: action === 'login' ? '-' : entityId,
      description: descriptions[action](entityType, entityId),
      ipAddress: IP_ADDRESSES[i % IP_ADDRESSES.length],
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      success: i !== 37,
      oldValue: action === 'update' ? oldValues[entityType] : null,
      newValue: (action === 'update' || action === 'create') ? newValues[entityType] : null,
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

const MOCK_LOGS = generateMockLogs();
const PER_PAGE = 20;

// ── Component ──────────────────────────────────────────────────────────────────

export const AuditLogsViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const filtered = useMemo(() => {
    return MOCK_LOGS.filter(log => {
      if (filterAction && log.action !== filterAction) return false;
      if (filterEntity && log.entityType !== filterEntity) return false;
      if (dateFrom && log.timestamp < new Date(dateFrom).toISOString()) return false;
      if (dateTo && log.timestamp > new Date(dateTo + 'T23:59:59').toISOString()) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          log.user.toLowerCase().includes(q) ||
          log.description.toLowerCase().includes(q) ||
          log.entityId.includes(q)
        );
      }
      return true;
    });
  }, [searchTerm, filterAction, filterEntity, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterAction('');
    setFilterEntity('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }, []);

  const handleExport = useCallback(() => {
    if (filtered.length === 0) {
      showToast('No data to export', 'error');
      return;
    }
    exportToCSV(
      filtered.map(l => ({
        Timestamp: new Date(l.timestamp).toLocaleString(),
        User: l.user,
        Action: l.action,
        'Entity Type': l.entityType,
        'Entity ID': l.entityId,
        Description: l.description,
        'IP Address': l.ipAddress,
        Success: l.success ? 'Yes' : 'No',
      })),
      `audit-logs-${new Date().toISOString().slice(0, 10)}`,
      [
        { key: 'Timestamp', label: 'Timestamp' },
        { key: 'User', label: 'User' },
        { key: 'Action', label: 'Action' },
        { key: 'Entity Type', label: 'Entity Type' },
        { key: 'Entity ID', label: 'Entity ID' },
        { key: 'Description', label: 'Description' },
        { key: 'IP Address', label: 'IP Address' },
        { key: 'Success', label: 'Success' },
      ]
    );
    showToast(`Exported ${filtered.length} audit log entries`, 'success');
  }, [filtered]);

  const actionBadgeClass = (action: string) => {
    if (['create', 'update', 'delete', 'login', 'export'].includes(action)) return action;
    return '';
  };

  const hasActiveFilters = filterAction || filterEntity || dateFrom || dateTo || searchTerm;

  return (
    <div className="audit-viewer">
      {/* Header */}
      <div className="audit-viewer-header">
        <h2>
          <FileText size={24} />
          Audit Logs
        </h2>
        <Button variant="ghost" onClick={handleExport}>
          <Download size={18} />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card className="audit-filters-card">
        <div className="audit-filters">
          <div className="audit-filter-group">
            <label>Search</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="User, description, ID..."
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              />
            </div>
          </div>

          <div className="audit-filter-group">
            <label>Action</label>
            <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); }}>
              <option value="">All Actions</option>
              {ACTIONS.map(a => (
                <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="audit-filter-group">
            <label>Entity Type</label>
            <select value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setPage(1); }}>
              <option value="">All Entities</option>
              {['Session', ...ENTITY_TYPES].map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="audit-filter-group">
            <label>From</label>
            <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} />
          </div>

          <div className="audit-filter-group">
            <label>To</label>
            <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} />
          </div>

          {hasActiveFilters && (
            <div className="audit-filter-actions">
              <Button variant="ghost" onClick={clearFilters}>
                <RotateCcw size={14} />
                Clear
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Table */}
      <div className="audit-table-wrapper responsive-table">
        <table className="audit-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity Type</th>
              <th>Entity ID</th>
              <th>Description</th>
              <th>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map(log => (
              <tr key={log.id} onClick={() => setSelectedLog(log)}>
                <td data-label="Timestamp" className="audit-timestamp">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td data-label="User">{log.user}</td>
                <td data-label="Action">
                  <span className={`audit-action-badge ${actionBadgeClass(log.action)}`}>
                    {log.action}
                  </span>
                </td>
                <td data-label="Entity Type">{log.entityType}</td>
                <td data-label="Entity ID" className="audit-entity-id">{log.entityId}</td>
                <td data-label="Description">{log.description}</td>
                <td data-label="IP Address" className="audit-ip">{log.ipAddress}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="audit-empty">
          <Search size={48} />
          <p>No audit log entries match your filters</p>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="audit-pagination">
          <div className="audit-pagination-info">
            Showing {(currentPage - 1) * PER_PAGE + 1}&ndash;{Math.min(currentPage * PER_PAGE, filtered.length)} of {filtered.length} entries
          </div>
          <div className="audit-pagination-controls">
            <Button
              variant="ghost"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} />
              Prev
            </Button>
            <span>Page {currentPage} of {totalPages}</span>
            <Button
              variant="ghost"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      {selectedLog && (
        <div className="audit-detail-overlay" onClick={() => setSelectedLog(null)}>
          <div className="audit-detail-drawer" onClick={e => e.stopPropagation()}>
            <div className="audit-detail-header">
              <h3>Audit Log Detail #{selectedLog.id}</h3>
              <button className="audit-detail-close" onClick={() => setSelectedLog(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="audit-detail-body">
              <div className="audit-detail-section">
                <h4>General Information</h4>
                <div className="audit-detail-grid">
                  <div className="audit-detail-field">
                    <span className="field-label">Timestamp</span>
                    <span className="field-value">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">User</span>
                    <span className="field-value">{selectedLog.user}</span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">Action</span>
                    <span className="field-value">
                      <span className={`audit-action-badge ${actionBadgeClass(selectedLog.action)}`}>
                        {selectedLog.action}
                      </span>
                    </span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">Status</span>
                    <span className="field-value">{selectedLog.success ? 'Success' : 'Failed'}</span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">Entity Type</span>
                    <span className="field-value">{selectedLog.entityType}</span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">Entity ID</span>
                    <span className="field-value">{selectedLog.entityId}</span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">IP Address</span>
                    <span className="field-value">{selectedLog.ipAddress}</span>
                  </div>
                  <div className="audit-detail-field">
                    <span className="field-label">User Agent</span>
                    <span className="field-value">{selectedLog.userAgent}</span>
                  </div>
                </div>
              </div>

              <div className="audit-detail-section">
                <h4>Description</h4>
                <p style={{ margin: 0, color: '#374151' }}>{selectedLog.description}</p>
              </div>

              {(selectedLog.oldValue || selectedLog.newValue) && (
                <div className="audit-detail-section">
                  <h4>Changes (Before / After)</h4>
                  <div className="audit-diff">
                    <div className="audit-diff-panel before">
                      <div className="audit-diff-panel-header">Before</div>
                      <pre>{selectedLog.oldValue ? JSON.stringify(selectedLog.oldValue, null, 2) : '(none)'}</pre>
                    </div>
                    <div className="audit-diff-panel after">
                      <div className="audit-diff-panel-header">After</div>
                      <pre>{selectedLog.newValue ? JSON.stringify(selectedLog.newValue, null, 2) : '(none)'}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
