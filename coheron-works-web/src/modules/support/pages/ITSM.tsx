import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Bug,
  GitBranch,
  Plus,
  Filter,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  User,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { supportDeskService } from '../../../services/supportDeskService';
import { ITSMForm } from './components/ITSMForm';
import './ITSM.css';

type ITSMTab = 'incidents' | 'problems' | 'changes';

export const ITSM: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ITSMTab>('incidents');
  const [incidents, setIncidents] = useState<any[]>([]);
  const [problems, setProblems] = useState<any[]>([]);
  const [changes, setChanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setSelectedItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showITSMForm, setShowITSMForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'incidents') {
        const params: any = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        const data = await supportDeskService.getIncidents(params);
        setIncidents(data);
      } else if (activeTab === 'problems') {
        const params: any = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        const data = await supportDeskService.getProblems(params);
        setProblems(data);
      } else if (activeTab === 'changes') {
        const params: any = {};
        if (statusFilter !== 'all') params.status = statusFilter;
        const data = await supportDeskService.getChanges(params);
        setChanges(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      new: '#3b82f6',
      assigned: '#f59e0b',
      in_progress: '#f59e0b',
      investigating: '#f59e0b',
      identified: '#22c55e',
      resolved: '#22c55e',
      closed: '#16a34a',
      draft: '#64748b',
      submitted: '#3b82f6',
      approved: '#22c55e',
      completed: '#16a34a',
      rejected: '#ef4444',
      cancelled: '#6b7280',
    };
    return colors[status] || '#666';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      p1: '#dc2626',
      p2: '#ef4444',
      p3: '#f59e0b',
      p4: '#64748b',
      p5: '#9ca3af',
      critical: '#dc2626',
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#64748b',
    };
    return colors[priority] || '#666';
  };

  const getStatusIcon = (status: string) => {
    if (status.includes('resolved') || status.includes('closed') || status === 'completed') {
      return <CheckCircle size={16} />;
    }
    if (status.includes('rejected') || status === 'cancelled') {
      return <XCircle size={16} />;
    }
    return <Clock size={16} />;
  };

  const renderIncidents = () => {
    const filtered = incidents.filter((item) => {
      if (searchTerm) {
        return (
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.incident_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    });

    return (
      <div className="itsm-list">
        {filtered.map((incident) => (
          <div
            key={incident.id}
            onClick={() => setSelectedItem(incident)}
            style={{ cursor: 'pointer' }}
          >
            <Card
              className="itsm-item"
              hover
            >
            <div className="itsm-item-header">
              <div>
                <span className="item-number">{incident.incident_number}</span>
                <h3>{incident.title}</h3>
              </div>
              <div className="item-badges">
                <span
                  className="priority-badge"
                  style={{
                    backgroundColor: `${getPriorityColor(incident.priority)}20`,
                    color: getPriorityColor(incident.priority),
                  }}
                >
                  {incident.priority}
                </span>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: `${getStatusColor(incident.status)}20`,
                    color: getStatusColor(incident.status),
                  }}
                >
                  {getStatusIcon(incident.status)}
                  {incident.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div className="itsm-item-meta">
              <span>
                <AlertTriangle size={14} /> Impact: {incident.impact}
              </span>
              <span>
                <TrendingUp size={14} /> Urgency: {incident.urgency}
              </span>
              {incident.assigned_to_name && (
                <span>
                  <User size={14} /> {incident.assigned_to_name}
                </span>
              )}
              <span>
                <Calendar size={14} /> {new Date(incident.created_at).toLocaleDateString()}
              </span>
            </div>
            {incident.affected_users && (
              <div className="itsm-item-details">
                Affected Users: {incident.affected_users}
              </div>
            )}
            </Card>
          </div>
        ))}
      </div>
    );
  };

  const renderProblems = () => {
    const filtered = problems.filter((item) => {
      if (searchTerm) {
        return (
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.problem_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    });

    return (
      <div className="itsm-list">
        {filtered.map((problem) => (
          <div
            key={problem.id}
            onClick={() => setSelectedItem(problem)}
            style={{ cursor: 'pointer' }}
          >
            <Card
              className="itsm-item"
              hover
            >
            <div className="itsm-item-header">
              <div>
                <span className="item-number">{problem.problem_number}</span>
                <h3>{problem.title}</h3>
              </div>
              <div className="item-badges">
                <span
                  className="priority-badge"
                  style={{
                    backgroundColor: `${getPriorityColor(problem.priority)}20`,
                    color: getPriorityColor(problem.priority),
                  }}
                >
                  {problem.priority}
                </span>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: `${getStatusColor(problem.status)}20`,
                    color: getStatusColor(problem.status),
                  }}
                >
                  {getStatusIcon(problem.status)}
                  {problem.status.replace('_', ' ')}
                </span>
                {problem.known_error && (
                  <span className="known-error-badge">Known Error</span>
                )}
              </div>
            </div>
            <div className="itsm-item-meta">
              {problem.assigned_to_name && (
                <span>
                  <User size={14} /> {problem.assigned_to_name}
                </span>
              )}
              {problem.related_incidents && problem.related_incidents.length > 0 && (
                <span>
                  Related Incidents: {problem.related_incidents.length}
                </span>
              )}
              <span>
                <Calendar size={14} /> {new Date(problem.created_at).toLocaleDateString()}
              </span>
            </div>
            {problem.root_cause_analysis && (
              <div className="itsm-item-details">
                <strong>RCA:</strong> {problem.root_cause_analysis.substring(0, 150)}...
              </div>
            )}
            </Card>
          </div>
        ))}
      </div>
    );
  };

  const renderChanges = () => {
    const filtered = changes.filter((item) => {
      if (searchTerm) {
        return (
          item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.change_number?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      return true;
    });

    return (
      <div className="itsm-list">
        {filtered.map((change) => (
          <div
            key={change.id}
            onClick={() => setSelectedItem(change)}
            style={{ cursor: 'pointer' }}
          >
            <Card
              className="itsm-item"
              hover
            >
            <div className="itsm-item-header">
              <div>
                <span className="item-number">{change.change_number}</span>
                <h3>{change.title}</h3>
              </div>
              <div className="item-badges">
                <span className="change-type-badge">{change.change_type}</span>
                <span
                  className="priority-badge"
                  style={{
                    backgroundColor: `${getPriorityColor(change.priority)}20`,
                    color: getPriorityColor(change.priority),
                  }}
                >
                  {change.priority}
                </span>
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: `${getStatusColor(change.status)}20`,
                    color: getStatusColor(change.status),
                  }}
                >
                  {getStatusIcon(change.status)}
                  {change.status.replace('_', ' ')}
                </span>
                <span
                  className="risk-badge"
                  style={{
                    backgroundColor:
                      change.risk_level === 'high'
                        ? '#fee2e2'
                        : change.risk_level === 'medium'
                        ? '#fef3c7'
                        : '#dcfce7',
                    color:
                      change.risk_level === 'high'
                        ? '#dc2626'
                        : change.risk_level === 'medium'
                        ? '#d97706'
                        : '#16a34a',
                  }}
                >
                  Risk: {change.risk_level}
                </span>
              </div>
            </div>
            <div className="itsm-item-meta">
              {change.requested_by_name && (
                <span>
                  <User size={14} /> Requested by: {change.requested_by_name}
                </span>
              )}
              {change.scheduled_start && (
                <span>
                  <Calendar size={14} /> Scheduled: {new Date(change.scheduled_start).toLocaleDateString()}
                </span>
              )}
              <span>
                <Calendar size={14} /> Created: {new Date(change.created_at).toLocaleDateString()}
              </span>
            </div>
            </Card>
          </div>
        ))}
      </div>
    );
  };

  const getStatusOptions = () => {
    if (activeTab === 'incidents') {
      return ['all', 'new', 'assigned', 'in_progress', 'resolved', 'closed'];
    } else if (activeTab === 'problems') {
      return ['all', 'new', 'investigating', 'identified', 'resolved', 'closed'];
    } else {
      return ['all', 'draft', 'submitted', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled'];
    }
  };

  return (
    <div className="itsm-page">
      <div className="itsm-header">
        <div>
          <h1>ITSM Management</h1>
          <p className="itsm-subtitle">Manage Incidents, Problems, and Change Requests</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setShowITSMForm(true)}>
          New {activeTab === 'incidents' ? 'Incident' : activeTab === 'problems' ? 'Problem' : 'Change'}
        </Button>
      </div>

      <div className="itsm-tabs">
        <button
          className={activeTab === 'incidents' ? 'active' : ''}
          onClick={() => setActiveTab('incidents')}
        >
          <AlertTriangle size={18} />
          Incidents
        </button>
        <button
          className={activeTab === 'problems' ? 'active' : ''}
          onClick={() => setActiveTab('problems')}
        >
          <Bug size={18} />
          Problems
        </button>
        <button
          className={activeTab === 'changes' ? 'active' : ''}
          onClick={() => setActiveTab('changes')}
        >
          <GitBranch size={18} />
          Changes
        </button>
      </div>

      <div className="itsm-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={16} />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            {getStatusOptions().map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Status' : status.replace('_', ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="itsm-content">
        {loading ? (
          <LoadingSpinner size="medium" message={`Loading ${activeTab}...`} />
        ) : (
          <>
            {activeTab === 'incidents' && renderIncidents()}
            {activeTab === 'problems' && renderProblems()}
            {activeTab === 'changes' && renderChanges()}
          </>
        )}

        {showITSMForm && (
          <ITSMForm
            type={activeTab === 'incidents' ? 'incident' : activeTab === 'problems' ? 'problem' : 'change'}
            onClose={() => setShowITSMForm(false)}
            onSave={() => {
              setShowITSMForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ITSM;

