import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Users,
  Calendar,
} from 'lucide-react';
import { apiService } from '../../../services/apiService';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { Card } from '../../../components/Card';
import { formatInLakhsCompact } from '../../../utils/currencyFormatter';
import { showToast } from '../../../components/Toast';
import './ProjectsDashboard.css';

interface ProjectsDashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalBudget: number;
  totalSpent: number;
  teamMembers: number;
  overdueTasks: number;
}

export const ProjectsDashboard: React.FC = () => {
  const [stats, setStats] = useState<ProjectsDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [activeProjects, setActiveProjects] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [projects, tasks] = await Promise.all([
        apiService.get<any>('/projects').catch((err) => { console.error('Failed to load projects:', err.userMessage || err.message); return []; }),
        apiService.get<any>('/projects/tasks').catch((err) => { console.error('Failed to load tasks:', err.userMessage || err.message); return []; }),
      ]);

      const activeProjects = projects.filter((p: any) => 
        p.status === 'active' || p.state === 'active' || !['completed', 'cancelled', 'on_hold'].includes(p.status)
      );
      const completedProjects = projects.filter((p: any) => 
        p.status === 'completed' || p.state === 'completed' || p.status === 'done'
      );
      const onHoldProjects = projects.filter((p: any) => 
        p.status === 'on_hold' || p.state === 'on_hold'
      );

      const totalBudget = projects.reduce((sum: number, p: any) => {
        const budget = typeof p.budget === 'string'
          ? parseFloat(p.budget.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(p.budget) || 0;
        return sum + budget;
      }, 0);

      const totalSpent = projects.reduce((sum: number, p: any) => {
        const spent = typeof p.actual_cost === 'string'
          ? parseFloat(p.actual_cost.replace(/[^\d.-]/g, '')) || 0
          : parseFloat(p.actual_cost) || 0;
        return sum + spent;
      }, 0);

      const overdueTasks = tasks.filter((t: any) => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate < new Date() && t.status !== 'completed' && t.state !== 'done';
      }).length;

      const teamMembers = new Set(
        projects.flatMap((p: any) => p.team_members || [p.lead_id].filter(Boolean))
      ).size;

      setStats({
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        completedProjects: completedProjects.length,
        onHoldProjects: onHoldProjects.length,
        totalBudget,
        totalSpent,
        teamMembers,
        overdueTasks,
      });

      setRecentProjects(projects.slice(0, 5));
      setActiveProjects(activeProjects.slice(0, 5));
    } catch (error: any) {
      console.error('Failed to load projects dashboard data:', error);
      showToast(error.userMessage || 'Failed to load projects data', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="projects-dashboard">
        <div className="container">
          <LoadingSpinner size="large" message="Loading projects dashboard..." />
        </div>
      </div>
    );
  }

  const budgetUtilization = stats && stats.totalBudget > 0
    ? ((stats.totalSpent / stats.totalBudget) * 100).toFixed(1)
    : '0.0';

  const statCards = [
    {
      title: 'Total Projects',
      value: stats?.totalProjects || 0,
      icon: <FolderKanban size={24} />,
      color: '#3b82f6',
      link: '/projects',
    },
    {
      title: 'Active Projects',
      value: stats?.activeProjects || 0,
      icon: <Clock size={24} />,
      color: '#f59e0b',
      link: '/projects',
    },
    {
      title: 'Completed',
      value: stats?.completedProjects || 0,
      icon: <CheckCircle size={24} />,
      color: '#10b981',
      link: '/projects',
    },
    {
      title: 'Total Budget',
      value: formatInLakhsCompact(stats?.totalBudget || 0),
      icon: <DollarSign size={24} />,
      color: '#8b5cf6',
      link: '/projects',
    },
    {
      title: 'Budget Utilized',
      value: `${budgetUtilization}%`,
      icon: <TrendingUp size={24} />,
      color: stats && parseFloat(budgetUtilization) > 90 ? '#ef4444' : '#10b981',
      link: '/projects',
    },
    {
      title: 'Team Members',
      value: stats?.teamMembers || 0,
      icon: <Users size={24} />,
      color: '#ec4899',
      link: '/projects',
    },
  ];

  return (
    <div className="projects-dashboard">
      <div className="container">
        <div className="projects-dashboard-header">
          <div>
            <h1>Projects Dashboard</h1>
            <p className="projects-dashboard-subtitle">Project portfolio overview and key metrics</p>
          </div>
          <Link to="/projects" className="btn-primary">
            View Projects
          </Link>
        </div>

        {/* Key Metrics */}
        <div className="projects-dashboard-stats">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link} className="projects-stat-card-link">
              <Card className="projects-stat-card" hover>
                <div className="projects-stat-header">
                  <div className="projects-stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                    {stat.icon}
                  </div>
                </div>
                <div className="projects-stat-content">
                  <h3 className="projects-stat-value">{stat.value}</h3>
                  <p className="projects-stat-title">{stat.title}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <div className="projects-dashboard-sections">
          {/* Active Projects */}
          <Card className="projects-dashboard-section">
            <div className="projects-section-header">
              <h2>Active Projects</h2>
              <Link to="/projects" className="projects-view-all">View All</Link>
            </div>
            <div className="projects-recent-list">
              {activeProjects.length > 0 ? (
                activeProjects.map((project) => (
                  <div key={project.id} className="projects-recent-item">
                    <div className="projects-recent-item-info">
                      <h4>{project.name || `Project #${project.id}`}</h4>
                      <p>{project.project_type || 'Standard'} Project</p>
                    </div>
                    <div className="projects-recent-item-meta">
                      <span className={`projects-status-badge ${project.status || project.state || 'active'}`}>
                        {project.status || project.state || 'Active'}
                      </span>
                      {project.budget && (
                        <span className="projects-budget">
                          {formatInLakhsCompact(
                            typeof project.budget === 'string'
                              ? parseFloat(project.budget.replace(/[^\d.-]/g, '')) || 0
                              : parseFloat(project.budget) || 0
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="projects-empty-state">No active projects</p>
              )}
            </div>
          </Card>

          {/* Recent Projects */}
          <Card className="projects-dashboard-section">
            <div className="projects-section-header">
              <h2>Recent Projects</h2>
              <Link to="/projects" className="projects-view-all">View All</Link>
            </div>
            <div className="projects-recent-list">
              {recentProjects.length > 0 ? (
                recentProjects.map((project) => (
                  <div key={project.id} className="projects-recent-item">
                    <div className="projects-recent-item-info">
                      <h4>{project.name || `Project #${project.id}`}</h4>
                      <p>{project.project_type || 'Standard'} Project</p>
                    </div>
                    <div className="projects-recent-item-meta">
                      <span className={`projects-status-badge ${project.status || project.state || 'active'}`}>
                        {project.status || project.state || 'Active'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="projects-empty-state">No projects found</p>
              )}
            </div>
          </Card>

          {/* Alerts */}
          {stats && stats.overdueTasks > 0 && (
            <Card className="projects-dashboard-section projects-alerts">
              <h2>
                <AlertTriangle size={20} />
                Alerts
              </h2>
              <div className="projects-alerts-list">
                <div className="projects-alert-item warning">
                  <AlertTriangle size={20} />
                  <div>
                    <h4>{stats.overdueTasks} Overdue Tasks</h4>
                    <p>Requires immediate attention</p>
                  </div>
                  <Link to="/projects" className="projects-alert-link">View</Link>
                </div>
              </div>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="projects-dashboard-section">
            <h2>Quick Actions</h2>
            <div className="projects-quick-actions">
              <Link to="/projects" className="projects-quick-action">
                <FolderKanban size={20} />
                <span>View Projects</span>
              </Link>
              <Link to="/projects" className="projects-quick-action">
                <Calendar size={20} />
                <span>Timeline</span>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

