import { useState, useEffect } from 'react';
import { Plus, Calendar, Target, Users } from 'lucide-react';
import { projectService, type Sprint, type Issue } from '../../services/projectService';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import './SprintBoard.css';

interface SprintBoardProps {
  projectId: number;
}

export const SprintBoard = ({ projectId }: SprintBoardProps) => {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [activeSprint, setActiveSprint] = useState<Sprint | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSprints();
  }, [projectId]);

  useEffect(() => {
    if (activeSprint) {
      loadSprintIssues(activeSprint.id);
    }
  }, [activeSprint]);

  const loadSprints = async () => {
    try {
      setLoading(true);
      const sprintsData = await projectService.getSprints(projectId);
      setSprints(sprintsData);
      
      // Set active sprint if available
      const active = sprintsData.find(s => s.state === 'active');
      if (active) {
        setActiveSprint(active);
      } else if (sprintsData.length > 0) {
        setActiveSprint(sprintsData[0]);
      }
    } catch (error) {
      console.error('Failed to load sprints:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSprintIssues = async (sprintId: number) => {
    try {
      const planning = await projectService.getSprintPlanning(sprintId);
      setIssues(planning.issues || []);
    } catch (error) {
      console.error('Failed to load sprint issues:', error);
    }
  };

  const getStatusColumns = () => {
    return ['To Do', 'In Progress', 'Done'];
  };

  const getIssuesByStatus = (status: string) => {
    return issues.filter(issue => issue.status === status);
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading sprints..." />;
  }

  return (
    <div className="sprint-board">
      {/* Sprint Selector */}
      <div className="sprint-selector">
        <div className="sprint-tabs">
          {sprints.map(sprint => (
            <button
              key={sprint.id}
              className={`sprint-tab ${activeSprint?.id === sprint.id ? 'active' : ''}`}
              onClick={() => setActiveSprint(sprint)}
            >
              <Calendar size={16} />
              <span>{sprint.name}</span>
              <span className={`sprint-state state-${sprint.state}`}>{sprint.state}</span>
            </button>
          ))}
        </div>
        <Button icon={<Plus size={16} />} onClick={() => {/* Create sprint */}}>
          New Sprint
        </Button>
      </div>

      {/* Active Sprint Info */}
      {activeSprint && (
        <div className="sprint-info">
          <div className="sprint-header">
            <h2>{activeSprint.name}</h2>
            {activeSprint.goal && (
              <div className="sprint-goal">
                <Target size={16} />
                <span>{activeSprint.goal}</span>
              </div>
            )}
          </div>
          <div className="sprint-dates">
            <span>{new Date(activeSprint.start_date).toLocaleDateString()}</span>
            <span>→</span>
            <span>{new Date(activeSprint.end_date).toLocaleDateString()}</span>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      {activeSprint && (
        <div className="kanban-board">
          {getStatusColumns().map(status => (
            <div key={status} className="kanban-column">
              <div className="column-header">
                <h3>{status}</h3>
                <span className="issue-count">{getIssuesByStatus(status).length}</span>
              </div>
              <div className="column-content">
                {getIssuesByStatus(status).map(issue => (
                  <div key={issue.id} className="issue-card">
                    <div className="issue-header">
                      <span className="issue-key">{issue.key}</span>
                      {issue.priority && (
                        <span className={`priority-badge priority-${issue.priority}`}>
                          {issue.priority}
                        </span>
                      )}
                    </div>
                    <h4 className="issue-summary">{issue.summary}</h4>
                    <div className="issue-footer">
                      {issue.story_points && (
                        <span className="story-points">{issue.story_points} SP</span>
                      )}
                      {issue.assignee_id && (
                        <span className="assignee">Assignee: {issue.assignee_id}</span>
                      )}
                    </div>
                  </div>
                ))}
                {getIssuesByStatus(status).length === 0 && (
                  <div className="empty-column">No issues</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {sprints.length === 0 && (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>No sprints yet</h3>
          <p>Create your first sprint to get started</p>
          <Button icon={<Plus size={16} />}>Create Sprint</Button>
        </div>
      )}
    </div>
  );
};

