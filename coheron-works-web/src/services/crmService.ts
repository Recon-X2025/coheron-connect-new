import { apiService } from './apiService';

// ============================================
// TYPES
// ============================================

export interface Task {
  id: number;
  name: string;
  description?: string;
  task_type: 'call' | 'email' | 'meeting' | 'note' | 'todo' | 'follow_up';
  related_model?: string;
  related_id?: number;
  related_name?: string;
  user_id: number;
  user_name?: string;
  assigned_to_id?: number;
  assigned_to_name?: string;
  due_date?: string;
  reminder_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  state: 'planned' | 'in_progress' | 'done' | 'canceled';
  sla_deadline?: string;
  duration?: number;
  result?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CalendarEvent {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  all_day: boolean;
  event_type: 'meeting' | 'call' | 'task' | 'reminder' | 'other';
  related_model?: string;
  related_id?: number;
  related_name?: string;
  user_id: number;
  user_name?: string;
  attendees?: number[];
  location?: string;
  reminder_minutes?: number;
  created_at?: string;
  updated_at?: string;
}

// ============================================
// SERVICE
// ============================================

class CRMService {
  // Tasks
  async getTasks(params?: {
    user_id?: number;
    assigned_to_id?: number;
    state?: string;
    task_type?: string;
    related_model?: string;
    related_id?: number;
    start_date?: string;
    end_date?: string;
  }): Promise<Task[]> {
    return apiService.get<Task>('/crm/tasks', params);
  }

  async getTask(id: number): Promise<Task> {
    return apiService.getById<Task>('/crm/tasks', id);
  }

  async createTask(data: Partial<Task>): Promise<Task> {
    return apiService.create<Task>('/crm/tasks', data);
  }

  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    return apiService.update<Task>('/crm/tasks', id, data);
  }

  async completeTask(id: number, result?: string): Promise<Task> {
    return apiService.getAxiosInstance().post(`/crm/tasks/${id}/complete`, { result });
  }

  async cancelTask(id: number): Promise<Task> {
    return apiService.getAxiosInstance().post(`/crm/tasks/${id}/cancel`);
  }

  async deleteTask(id: number): Promise<void> {
    return apiService.delete('/crm/tasks', id);
  }

  // Calendar Events
  async getCalendarEvents(params?: {
    user_id?: number;
    start_date?: string;
    end_date?: string;
    event_type?: string;
    related_model?: string;
    related_id?: number;
  }): Promise<CalendarEvent[]> {
    return apiService.get<CalendarEvent>('/crm/events', params);
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent> {
    return apiService.getById<CalendarEvent>('/crm/events', id);
  }

  async createCalendarEvent(data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return apiService.create<CalendarEvent>('/crm/events', data);
  }

  async updateCalendarEvent(id: number, data: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return apiService.update<CalendarEvent>('/crm/events', id, data);
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    return apiService.delete('/crm/events', id);
  }
}

export const crmService = new CRMService();

