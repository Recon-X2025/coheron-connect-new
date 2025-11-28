import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter, MoreVertical, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { projectService, type Project } from '../services/projectService';
import './Projects.css';

export const Projects = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const projectsData = await projectService.getProjects();
      console.log('Projects data:', projectsData);
      
      // Handle both array and object responses
      if (Array.isArray(projectsData)) {
        // Map old schema to new schema if needed
        const mappedProjects = projectsData.map((p: any) => ({
          id: p.id,
          name: p.name,
          key: p.key || p.code || `PROJ-${p.id}`,
          description: p.description,
          project_type: p.project_type || 'scrum',
          lead_id: p.lead_id || p.project_manager_id,
          status: p.status || p.state || 'active',
          created_at: p.created_at,
          updated_at: p.updated_at,
        }));
        setProjects(mappedProjects);
      } else if (projectsData && Array.isArray(projectsData.data)) {
        setProjects(projectsData.data);
      } else if (projectsData && projectsData.projects) {
        setProjects(projectsData.projects);
      } else {
        // Fallback: Show empty state or mock data for testing
        console.warn('Unexpected projects data format:', projectsData);
        setProjects([]);
      }
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      
      // Show user-friendly error message
      const errorMessage = error.userMessage || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to load projects';
      
      if (error.isNetworkError) {
        console.warn('Backend server may not be running');
        // Still show empty state but log the error
      }
      
      // Show empty state on error - user can still see the UI
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock size={16} />;
      case 'archived':
        return <CheckCircle2 size={16} />;
      default:
        return <AlertCircle size={16} />;
    }
  };

  const getStatusClass = (status: string) => {
    return `status-badge status-${status}`;
  };

  const handleProjectClick = (projectId: number) => {
    navigate(`/projects/${projectId}`);
  };

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="projects-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading projects..." />
        </div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="container">
        <div className="projects-header">
          <div>
            <h1>Projects</h1>
            <p className="projects-subtitle">Manage and track all your projects</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setIsCreateModalOpen(true)}>
            New Project
          </Button>
        </div>

        <div className="projects-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="filter-btn">
            <Filter size={20} />
            Filter
          </button>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="empty-projects">
            <div className="empty-projects-content">
              <h3>No projects yet</h3>
              <p>Get started by creating your first project</p>
              <Button icon={<Plus size={20} />} onClick={() => setIsCreateModalOpen(true)}>
                Create Your First Project
              </Button>
            </div>
          </div>
        ) : (
          <div className="projects-grid">
            {filteredProjects.map((project) => (
            <Card 
              key={project.id} 
              hover 
              className="project-card"
              onClick={() => handleProjectClick(project.id)}
              style={{ cursor: 'pointer' }}
            >
              <div className="project-header">
                <h3>{project.name}</h3>
                <button 
                  className="project-menu"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Handle menu click
                  }}
                >
                  <MoreVertical size={20} />
                </button>
              </div>

              <div className={getStatusClass(project.status)}>
                {getStatusIcon(project.status)}
                <span>{project.status}</span>
              </div>

              <div className="project-meta">
                <div className="project-info">
                  <span className="project-key">{project.key}</span>
                  {project.description && (
                    <p className="project-description-small">{project.description.substring(0, 100)}...</p>
                  )}
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadProjects}
      />
    </div>
  );
};
