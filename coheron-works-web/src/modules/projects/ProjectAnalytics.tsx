import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { projectService } from '../../services/projectService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import './ProjectAnalytics.css';

interface ProjectAnalyticsProps {
  projectId: number;
}

export const ProjectAnalytics = ({ projectId }: ProjectAnalyticsProps) => {
  const [velocity, setVelocity] = useState<any>(null);
  const [throughput, setThroughput] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [velocityData, throughputData] = await Promise.all([
        projectService.getVelocity(projectId),
        projectService.getThroughput(projectId),
      ]);
      setVelocity(velocityData);
      setThroughput(throughputData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading analytics..." />;
  }

  return (
    <div className="project-analytics">
      <div className="analytics-header">
        <h2>Project Analytics</h2>
        <p>Track velocity, throughput, and team performance</p>
      </div>

      <div className="analytics-grid">
        {/* Velocity Card */}
        <div className="analytics-card">
          <div className="card-header">
            <TrendingUp size={24} />
            <h3>Velocity</h3>
          </div>
          <div className="card-content">
            <div className="metric-value">
              {velocity?.average_velocity?.toFixed(1) || '0'} SP
            </div>
            <p className="metric-label">Average story points per sprint</p>
            {velocity?.sprints && velocity.sprints.length > 0 && (
              <div className="velocity-list">
                <h4>Recent Sprints</h4>
                {velocity.sprints.slice(0, 5).map((sprint: any) => (
                  <div key={sprint.id} className="velocity-item">
                    <span>{sprint.name}</span>
                    <span className="velocity-value">{sprint.velocity || 0} SP</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Throughput Card */}
        <div className="analytics-card">
          <div className="card-header">
            <BarChart3 size={24} />
            <h3>Throughput</h3>
          </div>
          <div className="card-content">
            {throughput.length > 0 ? (
              <div className="throughput-list">
                {throughput.slice(0, 8).map((item: any, index: number) => (
                  <div key={index} className="throughput-item">
                    <div className="throughput-period">
                      {new Date(item.period).toLocaleDateString()}
                    </div>
                    <div className="throughput-metrics">
                      <span>{item.issues_completed} issues</span>
                      <span className="story-points">
                        {item.story_points_completed} SP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-metric">
                <p>No throughput data yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

