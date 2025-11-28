import { useState, useEffect } from 'react';
import { Plus, Filter, Search, List } from 'lucide-react';
import { projectService, type Issue } from '../../services/projectService';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import './BacklogView.css';

interface BacklogViewProps {
  projectId: number;
}

export const BacklogView = ({ projectId }: BacklogViewProps) => {
  const [backlog, setBacklog] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBacklog();
  }, [projectId]);

  const loadBacklog = async () => {
    try {
      setLoading(true);
      const backlogData = await projectService.getBacklog(projectId);
      setBacklog(backlogData);
    } catch (error) {
      console.error('Failed to load backlog:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading backlog..." />;
  }

  const items = backlog?.items || [];
  const filteredItems = items.filter((item: any) =>
    item.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="backlog-view">
      <div className="backlog-header">
        <div>
          <h2>Backlog</h2>
          <p className="backlog-subtitle">
            {items.length} items • {backlog?.total_story_points || 0} story points
          </p>
        </div>
        <div className="backlog-actions">
          <Button icon={<Plus size={16} />}>Add Issue</Button>
        </div>
      </div>

      <div className="backlog-toolbar">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search backlog..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="filter-btn">
          <Filter size={18} />
          Filters
        </button>
      </div>

      <div className="backlog-list">
        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <List size={48} />
            <h3>No backlog items</h3>
            <p>Add issues to your backlog to get started</p>
            <Button icon={<Plus size={16} />}>Add Issue</Button>
          </div>
        ) : (
          filteredItems.map((item: any) => (
            <div key={item.id} className="backlog-item">
              <div className="backlog-item-main">
                <div className="backlog-item-header">
                  <span className="issue-key">{item.key}</span>
                  <span className={`priority-badge priority-${item.priority}`}>
                    {item.priority}
                  </span>
                </div>
                <h4 className="backlog-item-summary">{item.summary}</h4>
                {item.description && (
                  <p className="backlog-item-description">
                    {item.description.substring(0, 150)}...
                  </p>
                )}
              </div>
              <div className="backlog-item-meta">
                {item.story_points && (
                  <span className="story-points">{item.story_points} SP</span>
                )}
                {item.issue_type_name && (
                  <span className="issue-type">{item.issue_type_name}</span>
                )}
                {item.epic_name && (
                  <span className="epic-badge">{item.epic_name}</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

