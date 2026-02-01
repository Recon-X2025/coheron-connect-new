import { apiService } from './apiService';

// Types
export interface Project {
  id: string;
  _id?: string;
  name: string;
  key: string;
  description?: string;
  project_type: 'kanban' | 'scrum' | 'classic';
  lead_id?: string;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  _id?: string;
  project_id: string;
  issue_type_id: string;
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  assignee_id?: string;
  reporter_id?: string;
  epic_id?: string;
  parent_issue_id?: string;
  story_points?: number;
  time_estimate?: number;
  time_spent?: number;
  labels?: string[];
  components?: string[];
  fix_version?: string;
  due_date?: string;
  resolution?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface Sprint {
  id: string;
  _id?: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  state: 'future' | 'active' | 'closed';
  completed_date?: string;
  velocity?: number;
  created_at: string;
  updated_at: string;
}

export interface Epic {
  id: string;
  _id?: string;
  project_id: string;
  key: string;
  name: string;
  description?: string;
  color?: string;
  status: 'new' | 'in_progress' | 'done' | 'cancelled';
  start_date?: string;
  end_date?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface IssueType {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  is_active: boolean;
}

export interface BurndownData {
  date: string;
  remaining_story_points: number;
  remaining_tasks: number;
  completed_story_points: number;
  completed_tasks: number;
}

export interface VelocityData {
  sprint_id: string;
  sprint_name: string;
  velocity: number;
  completed_issues: number;
  planned_story_points: number;
  planned_issues: number;
}

class ProjectService {
  // Projects
  async getProjects(params?: { search?: string; status?: string }) {
    return apiService.get<Project>('/projects', params);
  }

  async getProject(id: string) {
    return apiService.getById<Project>('/projects', id);
  }

  async createProject(data: Partial<Project>) {
    return apiService.create<Project>('/projects', data);
  }

  async updateProject(id: string, data: Partial<Project>) {
    return apiService.update<Project>('/projects', id, data);
  }

  // Sprints
  async getSprints(projectId: string, params?: { state?: string }) {
    return apiService.get<Sprint>(`/projects/${projectId}/sprints`, params);
  }

  async getSprint(id: string) {
    return apiService.getById<Sprint>('/sprints', id);
  }

  async createSprint(projectId: string, data: Partial<Sprint>) {
    return apiService.create<Sprint>(`/projects/${projectId}/sprints`, data);
  }

  async updateSprint(id: string, data: Partial<Sprint>) {
    return apiService.update<Sprint>('/sprints', id, data);
  }

  async startSprint(id: string) {
    return apiService.create(`/sprints/${id}/start`, {});
  }

  async closeSprint(id: string) {
    return apiService.create(`/sprints/${id}/close`, {});
  }

  // Issues
  async getIssues(projectId: string, params?: any) {
    return apiService.get<Issue>(`/projects/${projectId}/issues`, params);
  }

  async getIssue(id: string) {
    return apiService.getById<Issue>('/issues', id);
  }

  async createIssue(projectId: string, data: Partial<Issue>) {
    return apiService.create<Issue>(`/projects/${projectId}/issues`, data);
  }

  async updateIssue(id: string, data: Partial<Issue>) {
    return apiService.update<Issue>('/issues', id, data);
  }

  // Backlog
  async getBacklog(projectId: string, params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/backlog/enhanced${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async reorderBacklog(projectId: string, items: Array<{ issue_id: string; priority: number; rank: number }>) {
    return apiService.create(`/projects/${projectId}/backlog/reorder`, { items });
  }

  // Sprint Planning
  async getSprintPlanning(sprintId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sprints/${sprintId}/planning`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async addIssueToSprint(sprintId: string, issueId: string, position?: number) {
    return apiService.create(`/sprints/${sprintId}/issues`, { issue_id: issueId, position });
  }

  async removeIssueFromSprint(sprintId: string, issueId: string) {
    return apiService.delete(`/sprints/${sprintId}/issues`, issueId);
  }

  // Analytics
  async getBurndown(sprintId: string) {
    return apiService.getById(`/sprints/${sprintId}/burndown`, '0');
  }

  async getVelocity(projectId: string, limit = 10) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/velocity?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getThroughput(projectId: string, period = 'week', limit = 12) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/throughput?period=${period}&limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  // Issue Types
  async getIssueTypes(params?: { is_active?: boolean }) {
    return apiService.get<IssueType>('/issue-types', params);
  }

  // Epics
  async getEpics(projectId: string) {
    return apiService.get<Epic>(`/projects/${projectId}/epics`);
  }

  // Bugs
  async getBugs(projectId: string, params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/bugs${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getBugStatistics(projectId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/bugs/statistics`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  // Comments
  async getComments(issueId: string) {
    return apiService.get(`/issues/${issueId}/comments`);
  }

  async addComment(issueId: string, body: string, userId: string) {
    return apiService.create(`/issues/${issueId}/comments`, { user_id: userId, body });
  }

  // Retrospectives
  async getRetrospective(sprintId: string) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sprints/${sprintId}/retrospective`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async saveRetrospective(sprintId: string, data: any) {
    return apiService.create(`/sprints/${sprintId}/retrospective`, data);
  }
}

export const projectService = new ProjectService();

