import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Shield, Search, Filter } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { rbacService, type Role } from '../../services/rbacService';
import { showToast } from '../../components/Toast';
import './RBACManagement.css';

interface RolesManagementProps {
  onRoleSelect?: (role: Role) => void;
}

export const RolesManagement: React.FC<RolesManagementProps> = ({ onRoleSelect }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    module: 'crm',
    level: 1,
    parent_role_id: undefined as number | undefined,
    priority: 0
  });

  const modules = ['crm', 'sales', 'inventory', 'accounting', 'hr', 'manufacturing', 'marketing', 'pos', 'website', 'support', 'projects', 'dashboard', 'system'];

  useEffect(() => {
    loadRoles();
  }, [filterModule]);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterModule) filters.module = filterModule;
      const data = await rbacService.getRoles(filters);
      setRoles(data);
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await rbacService.createRole(formData);
      setShowCreateModal(false);
      resetForm();
      loadRoles();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to create role', 'error');
    }
  };

  const handleUpdate = async () => {
    if (!editingRole) return;
    try {
      await rbacService.updateRole(editingRole.id, formData);
      setEditingRole(null);
      resetForm();
      loadRoles();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to update role', 'error');
    }
  };

  const handleDelete = async (role: Role) => {
    if (!confirm(`Are you sure you want to delete role "${role.name}"?`)) return;
    if (role.is_system_role) {
      showToast('Cannot delete system roles', 'warning');
      return;
    }
    try {
      await rbacService.deleteRole(role.id);
      loadRoles();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to delete role', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      module: 'crm',
      level: 1,
      parent_role_id: undefined,
      priority: 0
    });
  };

  const openEditModal = (role: Role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      code: role.code,
      description: role.description || '',
      module: role.module,
      level: role.level,
      parent_role_id: role.parent_role_id || undefined,
      priority: role.priority
    });
    setShowCreateModal(true);
  };

  const filteredRoles = roles.filter(role => {
    const matchesSearch = role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         role.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getModuleColor = (module: string) => {
    const colors: Record<string, string> = {
      crm: '#875A7B',
      sales: '#00A09D',
      inventory: '#F2994A',
      accounting: '#27AE60',
      hr: '#3498DB',
      manufacturing: '#9B59B6',
      marketing: '#E74C3C',
      support: '#F39C12',
      system: '#34495E'
    };
    return colors[module] || '#666';
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading roles..." />;
  }

  return (
    <div className="rbac-management">
      <div className="rbac-header">
        <div className="rbac-title">
          <Shield size={24} />
          <h2>Roles Management</h2>
        </div>
        <Button onClick={() => { resetForm(); setEditingRole(null); setShowCreateModal(true); }}>
          <Plus size={18} />
          Create Role
        </Button>
      </div>

      <div className="rbac-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <Filter size={18} />
          <select value={filterModule} onChange={(e) => setFilterModule(e.target.value)}>
            <option value="">All Modules</option>
            {modules.map(m => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="roles-grid">
        {filteredRoles.map(role => (
          <Card key={role.id} className="role-card">
            <div className="role-header">
              <div className="role-info">
                <div className="role-badge" style={{ backgroundColor: getModuleColor(role.module) }}>
                  {role.module.toUpperCase()}
                </div>
                <div>
                  <h3>{role.name}</h3>
                  <p className="role-code">{role.code}</p>
                </div>
              </div>
              <div className="role-level">Level {role.level}</div>
            </div>
            {role.description && (
              <p className="role-description">{role.description}</p>
            )}
            <div className="role-meta">
              <span className={`role-status ${role.is_active ? 'active' : 'inactive'}`}>
                {role.is_active ? 'Active' : 'Inactive'}
              </span>
              {role.is_system_role && (
                <span className="system-badge">System</span>
              )}
            </div>
            <div className="role-actions">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  openEditModal(role);
                  onRoleSelect?.(role);
                }}
              >
                <Edit size={16} />
                Edit
              </Button>
              {!role.is_system_role && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(role)}
                  className="danger"
                >
                  <Trash2 size={16} />
                  Delete
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {filteredRoles.length === 0 && (
        <div className="empty-state">
          <Shield size={48} />
          <p>No roles found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); setEditingRole(null); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>{editingRole ? 'Edit Role' : 'Create Role'}</h3>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!!editingRole}
              />
            </div>
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={!!editingRole}
                placeholder="e.g., crm_manager"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Module *</label>
                <select
                  value={formData.module}
                  onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                  disabled={!!editingRole}
                >
                  {modules.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Level *</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="form-group">
              <label>Parent Role</label>
              <select
                value={formData.parent_role_id || ''}
                onChange={(e) => setFormData({ ...formData, parent_role_id: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">None</option>
                {roles.filter(r => r.module === formData.module && r.id !== editingRole?.id).map(r => (
                  <option key={r.id} value={r.id}>{r.name} (Level {r.level})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
              />
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => { setShowCreateModal(false); setEditingRole(null); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={editingRole ? handleUpdate : handleCreate}>
                {editingRole ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

