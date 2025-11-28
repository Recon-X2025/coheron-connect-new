import { apiService } from './apiService';

// Types
export interface KnowledgeSpace {
  id: number;
  key: string;
  name: string;
  description?: string;
  space_type: 'team' | 'personal' | 'documentation' | 'knowledge';
  owner_id?: number;
  is_public: boolean;
  project_id?: number;
  created_at: string;
  updated_at: string;
}

export interface WikiPage {
  id: number;
  space_id: number;
  parent_page_id?: number;
  title: string;
  slug: string;
  content: string;
  content_format: 'html' | 'markdown' | 'wiki';
  excerpt?: string;
  labels?: string[];
  status: 'draft' | 'published' | 'archived';
  author_id?: number;
  last_modified_by?: number;
  view_count: number;
  is_homepage: boolean;
  position?: number;
  created_at: string;
  updated_at: string;
}

export interface PageTemplate {
  id: number;
  space_id?: number;
  name: string;
  description?: string;
  template_content: string;
  template_type?: string;
  is_system: boolean;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

class WikiService {
  // Spaces - Note: Backend uses /spaces not /wiki/spaces
  async getSpaces(params?: { project_id?: number; is_public?: boolean }) {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/spaces${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getSpace(id: number) {
    return apiService.getById<KnowledgeSpace>('/spaces', id);
  }

  async createSpace(data: Partial<KnowledgeSpace>) {
    return apiService.create<KnowledgeSpace>('/spaces', data);
  }

  async updateSpace(id: number, data: Partial<KnowledgeSpace>) {
    return apiService.update<KnowledgeSpace>('/spaces', id, data);
  }

  // Pages
  async getPages(spaceId: number, params?: any) {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/spaces/${spaceId}/pages${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getPage(id: number) {
    return apiService.getById<WikiPage>('/pages', id);
  }

  async createPage(spaceId: number, data: Partial<WikiPage>) {
    return apiService.create<WikiPage>(`/spaces/${spaceId}/pages`, data);
  }

  async updatePage(id: number, data: Partial<WikiPage>) {
    return apiService.update<WikiPage>('/pages', id, data);
  }

  async searchPages(params: { q?: string; space_id?: number; label?: string }) {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/pages/search${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  // Templates
  async getTemplates(params?: { space_id?: number; template_type?: string; is_system?: boolean }) {
    const queryParams = new URLSearchParams(params as any).toString();
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/wiki/templates${queryParams ? '?' + queryParams : ''}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        'Content-Type': 'application/json',
      },
    });
    return response.json();
  }

  async getTemplate(id: number) {
    return apiService.getById<PageTemplate>('/wiki/templates', id);
  }

  async createTemplate(data: Partial<PageTemplate>) {
    return apiService.create<PageTemplate>('/wiki/templates', data);
  }

  async updateTemplate(id: number, data: Partial<PageTemplate>) {
    return apiService.update<PageTemplate>('/wiki/templates', id, data);
  }

  async deleteTemplate(id: number) {
    return apiService.delete('/wiki/templates', id);
  }
}

export const wikiService = new WikiService();

