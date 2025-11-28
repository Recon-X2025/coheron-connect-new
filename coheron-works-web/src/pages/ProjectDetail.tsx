import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Kanban, 
  List, 
  BarChart3, 
  BookOpen, 
  Bug, 
  Calendar,
  Users,
  Settings
} from 'lucide-react';
import { projectService, type Project } from '../services/projectService';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { SprintBoard } from '../modules/projects/SprintBoard';
import { BacklogView } from '../modules/projects/BacklogView';
import { ProjectAnalytics } from '../modules/projects/ProjectAnalytics';
import { ProjectWiki } from '../modules/projects/ProjectWiki';
import { BugTracker } from '../modules/projects/BugTracker';
import './ProjectDetail.css';

type TabType = 'sprints' | 'backlog' | 'analytics' | 'wiki' | 'bugs' | 'settings';

export const ProjectDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('sprints');

  useEffect(() => {
    if (id) {
      loadProject();
    }
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const projectData = await projectService.getProject(parseInt(id!));
      setProject(projectData);
    } catch (error) {
      console.error('Failed to load project:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="project-detail-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading project..." />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="project-detail-page">
        <div className="container">
          <div className="error-message">
            <h2>Project not found</h2>
            <button onClick={() => navigate('/projects')}>Back to Projects</button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'sprints' as TabType, label: 'Sprints', icon: Calendar },
    { id: 'backlog' as TabType, label: 'Backlog', icon: List },
    { id: 'analytics' as TabType, label: 'Analytics', icon: BarChart3 },
    { id: 'wiki' as TabType, label: 'Wiki', icon: BookOpen },
    { id: 'bugs' as TabType, label: 'Bugs', icon: Bug },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="project-detail-page">
      <div className="container">
        {/* Header */}
        <div className="project-header">
          <div className="project-header-info">
            <button className="back-button" onClick={() => navigate('/projects')}>
              ← Back
            </button>
            <div>
              <h1>{project.name}</h1>
              <p className="project-key">{project.key}</p>
              {project.description && <p className="project-description">{project.description}</p>}
            </div>
          </div>
          <div className="project-header-actions">
            <span className={`project-status status-${project.status}`}>
              {project.status}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="project-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`project-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={18} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="project-content">
          {activeTab === 'sprints' && <SprintBoard projectId={project.id} />}
          {activeTab === 'backlog' && <BacklogView projectId={project.id} />}
          {activeTab === 'analytics' && <ProjectAnalytics projectId={project.id} />}
          {activeTab === 'wiki' && <ProjectWiki projectId={project.id} />}
          {activeTab === 'bugs' && <BugTracker projectId={project.id} />}
          {activeTab === 'settings' && (
            <div className="settings-placeholder">
              <h2>Project Settings</h2>
              <p>Settings coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

