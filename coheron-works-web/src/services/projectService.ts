import { apiService } from './apiService';

// Types
export interface Project {
  id: number;
  name: string;
  key: string;
  description?: string;
  project_type: 'kanban' | 'scrum' | 'classic';
  lead_id?: number;
  status: 'active' | 'archived' | 'deleted';
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: number;
  project_id: number;
  issue_type_id: number;
  key: string;
  summary: string;
  description?: string;
  status: string;
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  assignee_id?: number;
  reporter_id?: number;
  epic_id?: number;
  parent_issue_id?: number;
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
  id: number;
  project_id: number;
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
  id: number;
  project_id: number;
  key: string;
  name: string;
  description?: string;
  color?: string;
  status: 'new' | 'in_progress' | 'done' | 'cancelled';
  start_date?: string;
  end_date?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface IssueType {
  id: number;
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
  sprint_id: number;
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

  async getProject(id: number) {
    return apiService.getById<Project>('/projects', id);
  }

  async createProject(data: Partial<Project>) {
    return apiService.create<Project>('/projects', data);
  }

  async updateProject(id: number, data: Partial<Project>) {
    return apiService.update<Project>('/projects', id, data);
  }

  // Sprints
  async getSprints(projectId: number, params?: { state?: string }) {
    return apiService.get<Sprint>(`/projects/${projectId}/sprints`, params);
  }

  async getSprint(id: number) {
    return apiService.getById<Sprint>('/sprints', id);
  }

  async createSprint(projectId: number, data: Partial<Sprint>) {
    return apiService.create<Sprint>(`/projects/${projectId}/sprints`, data);
  }

  async updateSprint(id: number, data: Partial<Sprint>) {
    return apiService.update<Sprint>('/sprints', id, data);
  }

  async startSprint(id: number) {
    return apiService.create(`/sprints/${id}/start`, {});
  }

  async closeSprint(id: number) {
    return apiService.create(`/sprints/${id}/close`, {});
  }

  // Issues
  async getIssues(projectId: number, params?: any) {
    return apiService.get<Issue>(`/projects/${projectId}/issues`, params);
  }

  async getIssue(id: number) {
    return apiService.getById<Issue>('/issues', id);
  }

  async createIssue(projectId: number, data: Partial<Issue>) {
    return apiService.create<Issue>(`/projects/${projectId}/issues`, data);
  }

  async updateIssue(id: number, data: Partial<Issue>) {
    return apiService.update<Issue>('/issues', id, data);
  }

  // Backlog
  async getBacklog(projectId: number, params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/backlog/enhanced${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async reorderBacklog(projectId: number, items: Array<{ issue_id: number; priority: number; rank: number }>) {
    return apiService.create(`/projects/${projectId}/backlog/reorder`, { items });
  }

  // Sprint Planning
  async getSprintPlanning(sprintId: number) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sprints/${sprintId}/planning`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async addIssueToSprint(sprintId: number, issueId: number, position?: number) {
    return apiService.create(`/sprints/${sprintId}/issues`, { issue_id: issueId, position });
  }

  async removeIssueFromSprint(sprintId: number, issueId: number) {
    return apiService.delete(`/sprints/${sprintId}/issues`, issueId);
  }

  // Analytics
  async getBurndown(sprintId: number) {
    return apiService.getById(`/sprints/${sprintId}/burndown`, 0);
  }

  async getVelocity(projectId: number, limit = 10) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/velocity?limit=${limit}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getThroughput(projectId: number, period = 'week', limit = 12) {
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
  async getEpics(projectId: number) {
    return apiService.get<Epic>(`/projects/${projectId}/epics`);
  }

  // Bugs
  async getBugs(projectId: number, params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/bugs${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getBugStatistics(projectId: number) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/projects/${projectId}/bugs/statistics`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  // Comments
  async getComments(issueId: number) {
    return apiService.get(`/issues/${issueId}/comments`);
  }

  async addComment(issueId: number, body: string, userId: number) {
    return apiService.create(`/issues/${issueId}/comments`, { user_id: userId, body });
  }

  // Retrospectives
  async getRetrospective(sprintId: number) {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/sprints/${sprintId}/retrospective`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async saveRetrospective(sprintId: number, data: any) {
    return apiService.create(`/sprints/${sprintId}/retrospective`, data);
  }
}

export const projectService = new ProjectService();

