import { useState, useEffect } from 'react';
import { Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { projectService, type Issue } from '../../services/projectService';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import './BugTracker.css';

interface BugTrackerProps {
  projectId: number;
}

export const BugTracker = ({ projectId }: BugTrackerProps) => {
  const [bugs, setBugs] = useState<Issue[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBugs();
    loadStatistics();
  }, [projectId]);

  const loadBugs = async () => {
    try {
      setLoading(true);
      const bugsData = await projectService.getBugs(projectId);
      setBugs(bugsData.bugs || bugsData);
    } catch (error) {
      console.error('Failed to load bugs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await projectService.getBugStatistics(projectId);
      setStatistics(stats.summary || stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading bugs..." />;
  }

  const openBugs = bugs.filter(b => b.status !== 'Done');
  const resolvedBugs = bugs.filter(b => b.status === 'Done');

  return (
    <div className="bug-tracker">
      <div className="bug-header">
        <div>
          <h2>Bug Tracker</h2>
          <p>Track and manage bugs for this project</p>
        </div>
        <Button icon={<Plus size={16} />}>Report Bug</Button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="bug-statistics">
          <div className="stat-card">
            <div className="stat-value">{statistics.total_bugs || bugs.length}</div>
            <div className="stat-label">Total Bugs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value open">{statistics.open_bugs || openBugs.length}</div>
            <div className="stat-label">Open</div>
          </div>
          <div className="stat-card">
            <div className="stat-value resolved">{statistics.resolved_bugs || resolvedBugs.length}</div>
            <div className="stat-label">Resolved</div>
          </div>
          <div className="stat-card">
            <div className="stat-value critical">{statistics.critical_bugs || 0}</div>
            <div className="stat-label">Critical</div>
          </div>
        </div>
      )}

      {/* Bugs List */}
      <div className="bugs-list">
        <div className="bugs-section">
          <h3>
            <AlertCircle size={18} />
            Open Bugs ({openBugs.length})
          </h3>
          {openBugs.length === 0 ? (
            <div className="empty-bugs">
              <CheckCircle2 size={48} />
              <p>No open bugs! Great job!</p>
            </div>
          ) : (
            openBugs.map(bug => (
              <div key={bug.id} className="bug-item open">
                <div className="bug-main">
                  <div className="bug-header-item">
                    <span className="bug-key">{bug.key}</span>
                    <span className={`priority-badge priority-${bug.priority}`}>
                      {bug.priority}
                    </span>
                  </div>
                  <h4 className="bug-summary">{bug.summary}</h4>
                  {bug.description && (
                    <p className="bug-description">{bug.description.substring(0, 200)}...</p>
                  )}
                </div>
                <div className="bug-meta">
                  {bug.due_date && (
                    <span className="due-date">
                      Due: {new Date(bug.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {bug.assignee_id && (
                    <span className="assignee">Assignee: {bug.assignee_id}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bugs-section">
          <h3>
            <CheckCircle2 size={18} />
            Resolved Bugs ({resolvedBugs.length})
          </h3>
          {resolvedBugs.length === 0 ? (
            <div className="empty-bugs">
              <p>No resolved bugs yet</p>
            </div>
          ) : (
            resolvedBugs.map(bug => (
              <div key={bug.id} className="bug-item resolved">
                <div className="bug-main">
                  <div className="bug-header-item">
                    <span className="bug-key">{bug.key}</span>
                    <span className="resolution">{bug.resolution || 'Fixed'}</span>
                  </div>
                  <h4 className="bug-summary">{bug.summary}</h4>
                </div>
                <div className="bug-meta">
                  {bug.resolved_at && (
                    <span className="resolved-date">
                      Resolved: {new Date(bug.resolved_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

