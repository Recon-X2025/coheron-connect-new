import { apiService } from './apiService';

export interface SupportTicket {
  id: number;
  ticket_number: string;
  subject: string;
  description: string;
  ticket_type: 'issue' | 'request' | 'change' | 'incident' | 'problem';
  status: 'open' | 'in_progress' | 'pending' | 'resolved' | 'closed' | 'cancelled';
  priority: 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'low' | 'medium' | 'high' | 'urgent';
  channel_id?: number;
  category_id?: number;
  partner_id?: number;
  assigned_agent_id?: number;
  assigned_team_id?: number;
  sla_policy_id?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
  notes?: TicketNote[];
  attachments?: TicketAttachment[];
  watchers?: TicketWatcher[];
  history?: TicketHistory[];
  children?: SupportTicket[];
  partner_name?: string;
  agent_name?: string;
  team_name?: string;
  channel_name?: string;
  category_name?: string;
  sla_policy_name?: string;
}

export interface TicketNote {
  id: number;
  ticket_id: number;
  note_type: 'public' | 'private' | 'internal';
  content: string;
  created_by?: number;
  created_by_name?: string;
  is_pinned: boolean;
  created_at: string;
}

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface TicketWatcher {
  id: number;
  ticket_id: number;
  user_id: number;
  user_name?: string;
  user_email?: string;
}

export interface TicketHistory {
  id: number;
  ticket_id: number;
  action: string;
  old_value?: string;
  new_value?: string;
  performed_by?: number;
  performed_by_name?: string;
  created_at: string;
}

export interface SupportTeam {
  id: number;
  name: string;
  description?: string;
  email?: string;
  is_active: boolean;
  agent_count?: number;
  ticket_count?: number;
  agents?: SupportAgent[];
}

export interface SupportAgent {
  id: number;
  user_id: number;
  team_id?: number;
  agent_type: 'agent' | 'admin' | 'supervisor';
  is_active: boolean;
  max_tickets: number;
  skills?: string[];
  user_name?: string;
  user_email?: string;
  team_name?: string;
}

export interface SLAPolicy {
  id: number;
  name: string;
  description?: string;
  priority: string;
  first_response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours_only: boolean;
  working_hours?: any;
  timezone: string;
  is_active: boolean;
}

export interface AutomationRule {
  id: number;
  name: string;
  description?: string;
  trigger_event: string;
  trigger_conditions: any;
  actions: any;
  is_active: boolean;
  execution_order: number;
}

export interface KBArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  category_id?: number;
  article_type: 'article' | 'faq' | 'how_to' | 'troubleshooting';
  status: 'draft' | 'published' | 'archived';
  is_public: boolean;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  author_id?: number;
  author_name?: string;
  tags?: string[];
  revisions?: KBRevision[];
  attachments?: KBAttachment[];
}

export interface KBRevision {
  id: number;
  article_id: number;
  revision_number: number;
  title: string;
  content: string;
  change_summary?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export interface KBAttachment {
  id: number;
  article_id: number;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: number;
  uploaded_by_name?: string;
  created_at: string;
}

export interface ChatSession {
  id: number;
  session_id: string;
  visitor_name?: string;
  visitor_email?: string;
  visitor_phone?: string;
  partner_id?: number;
  channel: 'web' | 'mobile' | 'whatsapp' | 'api';
  status: 'waiting' | 'active' | 'ended' | 'transferred';
  assigned_agent_id?: number;
  started_at: string;
  ended_at?: string;
  messages?: ChatMessage[];
}

export interface ChatMessage {
  id: number;
  session_id: string;
  message_type: 'user' | 'agent' | 'system' | 'bot';
  content: string;
  sender_id?: number;
  sender_name?: string;
  is_read: boolean;
  created_at: string;
}

export interface Survey {
  id: number;
  name: string;
  survey_type: 'csat' | 'ces' | 'nps' | 'custom';
  description?: string;
  questions: any;
  trigger_event?: string;
  is_active: boolean;
  response_count?: number;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  ticket_id?: number;
  partner_id?: number;
  responses: any;
  score?: number;
  feedback?: string;
  submitted_at: string;
}

export interface CannedResponse {
  id: number;
  name: string;
  shortcut?: string;
  content: string;
  category?: string;
  is_public: boolean;
  created_by?: number;
  created_by_name?: string;
  usage_count: number;
}

class SupportDeskService {
  // ============================================
  // TICKETS
  // ============================================

  async getTickets(params?: {
    status?: string;
    priority?: string;
    assigned_agent_id?: number;
    assigned_team_id?: number;
    partner_id?: number;
    ticket_type?: string;
    search?: string;
  }): Promise<SupportTicket[]> {
    return apiService.get<SupportTicket>('support-tickets', params);
  }

  async getTicket(id: number): Promise<SupportTicket> {
    return apiService.getById<SupportTicket>('support-tickets', id);
  }

  async createTicket(data: Partial<SupportTicket>): Promise<SupportTicket> {
    return apiService.create<SupportTicket>('support-tickets', data);
  }

  async updateTicket(id: number, data: Partial<SupportTicket>): Promise<SupportTicket> {
    return apiService.update<SupportTicket>('support-tickets', id, data);
  }

  async deleteTicket(id: number): Promise<void> {
    return apiService.delete('support-tickets', id);
  }

  async mergeTickets(ticketId: number, mergeIntoId: number, mergedBy?: number): Promise<void> {
    return apiService.create(`support-tickets/${ticketId}/merge`, {
      merge_into_ticket_id: mergeIntoId,
      merged_by: mergedBy,
    });
  }

  async splitTicket(
    ticketId: number,
    subjects: string[],
    descriptions: string[]
  ): Promise<{ message: string; child_tickets: SupportTicket[] }> {
    return apiService.create(`support-tickets/${ticketId}/split`, { subjects, descriptions });
  }

  async transferTicket(
    ticketId: number,
    data: { assigned_team_id?: number; assigned_agent_id?: number; reason?: string; transferred_by?: number }
  ): Promise<SupportTicket> {
    return apiService.create<SupportTicket>(`support-tickets/${ticketId}/transfer`, data);
  }

  async addNote(
    ticketId: number,
    data: { note_type?: string; content: string; created_by?: number; is_pinned?: boolean }
  ): Promise<TicketNote> {
    return apiService.create<TicketNote>(`support-tickets/${ticketId}/notes`, data);
  }

  async addWatcher(ticketId: number, userId: number): Promise<TicketWatcher> {
    return apiService.create<TicketWatcher>(`support-tickets/${ticketId}/watchers`, { user_id: userId });
  }

  async removeWatcher(ticketId: number, userId: number): Promise<void> {
    return apiService.getAxiosInstance().delete(`support-tickets/${ticketId}/watchers/${userId}`);
  }

  // ============================================
  // TEAMS & AGENTS
  // ============================================

  async getTeams(): Promise<SupportTeam[]> {
    return apiService.get<SupportTeam>('support-teams');
  }

  async getTeam(id: number): Promise<SupportTeam> {
    return apiService.getById<SupportTeam>('support-teams', id);
  }

  async createTeam(data: Partial<SupportTeam>): Promise<SupportTeam> {
    return apiService.create<SupportTeam>('support-teams', data);
  }

  async updateTeam(id: number, data: Partial<SupportTeam>): Promise<SupportTeam> {
    return apiService.update<SupportTeam>('support-teams', id, data);
  }

  async getAgents(): Promise<SupportAgent[]> {
    return apiService.get<SupportAgent>('support-teams/agents/all');
  }

  async createAgent(data: Partial<SupportAgent>): Promise<SupportAgent> {
    return apiService.create<SupportAgent>('support-teams/agents', data);
  }

  async updateAgent(id: number, data: Partial<SupportAgent>): Promise<SupportAgent> {
    return apiService.update<SupportAgent>('support-teams/agents', id, data);
  }

  // ============================================
  // SLA POLICIES
  // ============================================

  async getSLAPolicies(params?: { is_active?: boolean; priority?: string }): Promise<SLAPolicy[]> {
    return apiService.get<SLAPolicy>('sla-policies', params);
  }

  async getSLAPolicy(id: number): Promise<SLAPolicy> {
    return apiService.getById<SLAPolicy>('sla-policies', id);
  }

  async createSLAPolicy(data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    return apiService.create<SLAPolicy>('sla-policies', data);
  }

  async updateSLAPolicy(id: number, data: Partial<SLAPolicy>): Promise<SLAPolicy> {
    return apiService.update<SLAPolicy>('sla-policies', id, data);
  }

  async deleteSLAPolicy(id: number): Promise<void> {
    return apiService.delete('sla-policies', id);
  }

  // ============================================
  // AUTOMATION RULES
  // ============================================

  async getAutomationRules(params?: { is_active?: boolean }): Promise<AutomationRule[]> {
    return apiService.get<AutomationRule>('support-automation', params);
  }

  async getAutomationRule(id: number): Promise<AutomationRule> {
    return apiService.getById<AutomationRule>('support-automation', id);
  }

  async createAutomationRule(data: Partial<AutomationRule>): Promise<AutomationRule> {
    return apiService.create<AutomationRule>('support-automation', data);
  }

  async updateAutomationRule(id: number, data: Partial<AutomationRule>): Promise<AutomationRule> {
    return apiService.update<AutomationRule>('support-automation', id, data);
  }

  async deleteAutomationRule(id: number): Promise<void> {
    return apiService.delete('support-automation', id);
  }

  // ============================================
  // KNOWLEDGE BASE
  // ============================================

  async getKBArticles(params?: {
    status?: string;
    category_id?: number;
    is_public?: boolean;
    search?: string;
    article_type?: string;
  }): Promise<KBArticle[]> {
    return apiService.get<KBArticle>('knowledge-base/articles', params);
  }

  async getKBArticle(identifier: string | number): Promise<KBArticle> {
    const id = typeof identifier === 'string' ? parseInt(identifier) : identifier;
    return apiService.getById<KBArticle>('knowledge-base/articles', id);
  }

  async createKBArticle(data: Partial<KBArticle>): Promise<KBArticle> {
    return apiService.create<KBArticle>('knowledge-base/articles', data);
  }

  async updateKBArticle(id: number, data: Partial<KBArticle>): Promise<KBArticle> {
    return apiService.update<KBArticle>('knowledge-base/articles', id, data);
  }

  async deleteKBArticle(id: number): Promise<void> {
    return apiService.getAxiosInstance().delete(`knowledge-base/articles/${id}`);
  }

  async rateKBArticle(id: number, isHelpful: boolean): Promise<void> {
    return apiService.create(`knowledge-base/articles/${id}/rate`, { is_helpful: isHelpful });
  }

  async getChannels(): Promise<any[]> {
    return apiService.get('knowledge-base/channels');
  }

  async getCategories(): Promise<any[]> {
    return apiService.get('knowledge-base/categories');
  }

  // ============================================
  // LIVE CHAT
  // ============================================

  async getChatSessions(params?: {
    status?: string;
    assigned_agent_id?: number;
    channel?: string;
  }): Promise<ChatSession[]> {
    const result = await apiService.get<ChatSession>('support-chat/sessions', params);
    return Array.isArray(result) ? result : [];
  }

  async getChatSession(sessionId: string): Promise<ChatSession> {
    const result = await apiService.get<ChatSession>(`support-chat/sessions/${sessionId}`);
    return (Array.isArray(result) ? result[0] : result) as ChatSession;
  }

  async createChatSession(data: Partial<ChatSession>): Promise<ChatSession> {
    return apiService.create<ChatSession>('support-chat/sessions', data);
  }

  async sendChatMessage(
    sessionId: string,
    data: { content: string; message_type?: string; sender_id?: number }
  ): Promise<ChatMessage> {
    return apiService.create<ChatMessage>(`support-chat/sessions/${sessionId}/messages`, data);
  }

  async assignChatAgent(sessionId: string, agentId: number): Promise<ChatSession> {
    return apiService.create(`support-chat/sessions/${sessionId}/assign`, { assigned_agent_id: agentId });
  }

  async endChatSession(sessionId: string): Promise<ChatSession> {
    return apiService.create(`support-chat/sessions/${sessionId}/end`, {});
  }

  async createTicketFromChat(
    sessionId: string,
    data: { subject?: string; description?: string; priority?: string; category_id?: number }
  ): Promise<SupportTicket> {
    return apiService.create<SupportTicket>(`support-chat/sessions/${sessionId}/create-ticket`, data);
  }

  // ============================================
  // SURVEYS
  // ============================================

  async getSurveys(params?: { is_active?: boolean; survey_type?: string }): Promise<Survey[]> {
    return apiService.get<Survey>('support-surveys', params);
  }

  async getSurvey(id: number): Promise<Survey> {
    return apiService.getById<Survey>('support-surveys', id);
  }

  async createSurvey(data: Partial<Survey>): Promise<Survey> {
    return apiService.create<Survey>('support-surveys', data);
  }

  async updateSurvey(id: number, data: Partial<Survey>): Promise<Survey> {
    return apiService.update<Survey>('support-surveys', id, data);
  }

  async deleteSurvey(id: number): Promise<void> {
    return apiService.getAxiosInstance().delete(`support-surveys/${id}`);
  }

  async submitSurveyResponse(
    surveyId: number,
    data: { ticket_id?: number; partner_id?: number; responses: any; score?: number; feedback?: string }
  ): Promise<SurveyResponse> {
    return apiService.create<SurveyResponse>(`support-surveys/${surveyId}/responses`, data);
  }

  async getSurveyResponses(surveyId: number): Promise<SurveyResponse[]> {
    return apiService.get<SurveyResponse>(`support-surveys/${surveyId}/responses`);
  }

  async getSurveyAnalytics(surveyId: number): Promise<any> {
    return apiService.get(`support-surveys/${surveyId}/analytics`);
  }

  // ============================================
  // CANNED RESPONSES
  // ============================================

  async getCannedResponses(params?: {
    category?: string;
    is_public?: boolean;
    search?: string;
    created_by?: number;
  }): Promise<CannedResponse[]> {
    return apiService.get<CannedResponse>('canned-responses', params);
  }

  async getCannedResponse(id: number): Promise<CannedResponse> {
    return apiService.getById<CannedResponse>('canned-responses', id);
  }

  async createCannedResponse(data: Partial<CannedResponse>): Promise<CannedResponse> {
    return apiService.create<CannedResponse>('canned-responses', data);
  }

  async updateCannedResponse(id: number, data: Partial<CannedResponse>): Promise<CannedResponse> {
    return apiService.update<CannedResponse>('canned-responses', id, data);
  }

  async useCannedResponse(id: number): Promise<CannedResponse> {
    return apiService.create(`canned-responses/${id}/use`, {});
  }

  async deleteCannedResponse(id: number): Promise<void> {
    return apiService.delete(`canned-responses/${id}`, id);
  }

  // ============================================
  // REPORTS & ANALYTICS
  // ============================================

  async getDashboard(params?: { start_date?: string; end_date?: string }): Promise<any> {
    return apiService.get('support-reports/dashboard', params);
  }

  async getAgentPerformance(params?: {
    start_date?: string;
    end_date?: string;
    agent_id?: number;
  }): Promise<any[]> {
    return apiService.get('support-reports/agents/performance', params);
  }

  async getTicketTrends(params?: { period?: string; start_date?: string; end_date?: string }): Promise<any[]> {
    return apiService.get('support-reports/tickets/trends', params);
  }

  async getTicketsByCategory(params?: { start_date?: string; end_date?: string }): Promise<any[]> {
    return apiService.get('support-reports/tickets/by-category', params);
  }

  async getBacklogAging(): Promise<any[]> {
    return apiService.get('support-reports/tickets/backlog-aging');
  }

  async getSatisfactionTrends(params?: { start_date?: string; end_date?: string }): Promise<any[]> {
    return apiService.get('support-reports/surveys/satisfaction-trends', params);
  }

  async getRecurringIssues(params?: { limit?: number }): Promise<any[]> {
    return apiService.get('support-reports/tickets/recurring-issues', params);
  }

  // ============================================
  // ITSM
  // ============================================

  async getIncidents(params?: { status?: string; priority?: string; impact?: string }): Promise<any[]> {
    return apiService.get('itsm/incidents', params);
  }

  async createIncident(data: any): Promise<any> {
    return apiService.create('itsm/incidents', data);
  }

  async updateIncident(id: number, data: any): Promise<any> {
    return apiService.update('itsm/incidents', id, data);
  }

  async getProblems(params?: { status?: string; priority?: string }): Promise<any[]> {
    return apiService.get('itsm/problems', params);
  }

  async createProblem(data: any): Promise<any> {
    return apiService.create('itsm/problems', data);
  }

  async updateProblem(id: number, data: any): Promise<any> {
    return apiService.update('itsm/problems', id, data);
  }

  async getChanges(params?: { status?: string; change_type?: string; priority?: string }): Promise<any[]> {
    return apiService.get('itsm/changes', params);
  }

  async createChange(data: any): Promise<any> {
    return apiService.create('itsm/changes', data);
  }

  async updateChange(id: number, data: any): Promise<any> {
    return apiService.update('itsm/changes', id, data);
  }

  async addCABMember(changeId: number, data: { user_id: number; role?: string }): Promise<any> {
    return apiService.create(`itsm/changes/${changeId}/cab`, data);
  }

  async approveChange(changeId: number, memberId: number, data: { approval_status: string; comments?: string }): Promise<any> {
    return apiService.create(`itsm/changes/${changeId}/cab/${memberId}/approve`, data);
  }
}

export const supportDeskService = new SupportDeskService();

