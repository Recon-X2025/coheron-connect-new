import { apiService } from './apiService';

export interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  module: string;
  level: number;
  parent_role_id?: number;
  is_system_role: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  code: string;
  description?: string;
  module: string;
  feature?: string;
  action: string;
  resource_type?: string;
  field_restrictions?: any;
  record_access_level: 'own' | 'team' | 'department' | 'all';
  conditions?: any;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  assigned_by?: number;
  assigned_at: string;
  expires_at?: string;
  is_active: boolean;
  notes?: string;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  granted: boolean;
  conditions?: any;
}

export interface AuditLog {
  id: number;
  user_id?: number;
  action: string;
  resource_type?: string;
  resource_id?: number;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
  created_at: string;
}

export interface UserPermissions {
  roles: Role[];
  permissions: Permission[];
}

class RbacService {
  // Roles
  async getRoles(filters?: { module?: string; level?: number; is_active?: boolean }): Promise<Role[]> {
    const params = new URLSearchParams();
    if (filters?.module) params.append('module', filters.module);
    if (filters?.level) params.append('level', filters.level.toString());
    if (filters?.is_active !== undefined) params.append('is_active', filters.is_active.toString());
    
    const query = params.toString();
    return apiService.get<Role[]>(`/rbac/roles${query ? `?${query}` : ''}`);
  }

  async getRole(id: number): Promise<Role & { permissions: Permission[] }> {
    return apiService.get(`/rbac/roles/${id}`);
  }

  async createRole(role: Partial<Role>): Promise<Role> {
    return apiService.post<Role>('/rbac/roles', role);
  }

  async updateRole(id: number, role: Partial<Role>): Promise<Role> {
    return apiService.put<Role>(`/rbac/roles/${id}`, role);
  }

  async deleteRole(id: number): Promise<void> {
    return apiService.delete(`/rbac/roles/${id}`);
  }

  // Permissions
  async getPermissions(filters?: { module?: string; feature?: string; action?: string }): Promise<Permission[]> {
    const params = new URLSearchParams();
    if (filters?.module) params.append('module', filters.module);
    if (filters?.feature) params.append('feature', filters.feature);
    if (filters?.action) params.append('action', filters.action);
    
    const query = params.toString();
    return apiService.get<Permission[]>(`/rbac/permissions${query ? `?${query}` : ''}`);
  }

  async createPermission(permission: Partial<Permission>): Promise<Permission> {
    return apiService.post<Permission>('/rbac/permissions', permission);
  }

  // Role-Permission Assignments
  async assignPermissionToRole(roleId: number, permissionId: number, granted: boolean = true, conditions?: any): Promise<RolePermission> {
    return apiService.post<RolePermission>(`/rbac/roles/${roleId}/permissions`, {
      permission_id: permissionId,
      granted,
      conditions
    });
  }

  async removePermissionFromRole(roleId: number, permissionId: number): Promise<void> {
    return apiService.delete(`/rbac/roles/${roleId}/permissions/${permissionId}`);
  }

  // User-Role Assignments
  async assignRoleToUser(userId: number, roleId: number, expiresAt?: string, notes?: string): Promise<UserRole> {
    return apiService.post<UserRole>(`/rbac/users/${userId}/roles`, {
      role_id: roleId,
      expires_at: expiresAt,
      notes
    });
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    return apiService.delete(`/rbac/users/${userId}/roles/${roleId}`);
  }

  async getUserPermissions(userId: number): Promise<UserPermissions> {
    return apiService.get<UserPermissions>(`/rbac/users/${userId}/permissions`);
  }

  // Audit Logs
  async getAuditLogs(filters?: { user_id?: number; action?: string; resource_type?: string; limit?: number; offset?: number }): Promise<AuditLog[]> {
    const params = new URLSearchParams();
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.action) params.append('action', filters.action);
    if (filters?.resource_type) params.append('resource_type', filters.resource_type);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());
    
    const query = params.toString();
    return apiService.get<AuditLog[]>(`/rbac/audit-logs${query ? `?${query}` : ''}`);
  }
}

export const rbacService = new RbacService();

