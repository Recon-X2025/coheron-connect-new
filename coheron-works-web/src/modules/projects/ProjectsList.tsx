import { useState, useEffect } from 'react';
import { Search, FolderKanban, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { projectService } from '../../services/odooService';
import { CreateProjectModal } from '../../components/CreateProjectModal';
import type { Project } from '../../types/odoo';
import './ProjectsList.css';

export const ProjectsList = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const projectsData = await projectService.getAll();
            setProjects(projectsData);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="projects-list-page"><div className="container"><h1>Loading...</h1></div></div>;
    }

    return (
        <div className="projects-list-page">
            <div className="container">
                <div className="projects-header">
                    <div>
                        <h1>Projects</h1>
                        <p className="projects-subtitle">{filteredProjects.length} active projects</p>
                    </div>
                    <Button icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>New Project</Button>
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
                </div>

                <div className="projects-grid">
                    {filteredProjects.map((project, idx) => (
                        <div key={project.id || (project as any)._id || idx} className="project-card">
                            <div className="project-icon">
                                <FolderKanban size={32} />
                            </div>
                            <div className="project-info">
                                <h3>{project.name}</h3>
                                <p className="project-dates">
                                    {new Date(project.date_start).toLocaleDateString()} - {project.date ? new Date(project.date).toLocaleDateString() : 'Ongoing'}
                                </p>
                            </div>
                            <div className="project-progress">
                                <div className="progress-header">
                                    <span className="label">Progress</span>
                                    <span className="percentage">{project.progress}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                                </div>
                            </div>
                            <div className="project-tasks">
                                <span className="tasks-count">{project.task_count} tasks</span>
                            </div>
                        </div>
                    ))}
                </div>

                <CreateProjectModal
                    isOpen={showCreateModal}
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadData();
                    }}
                />
            </div>
        </div>
    );
};
