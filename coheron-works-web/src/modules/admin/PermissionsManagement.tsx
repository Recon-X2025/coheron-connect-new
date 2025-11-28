import { useState, useEffect } from 'react';
import { Key, Search, Filter, Plus, CheckCircle, XCircle } from 'lucide-react';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { rbacService, type Permission } from '../../services/rbacService';
import './RBACManagement.css';

export const PermissionsManagement: React.FC = () => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterModule, setFilterModule] = useState<string>('');
  const [filterAction, setFilterAction] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    module: 'crm',
    feature: '',
    action: 'view',
    resource_type: '',
    record_access_level: 'own' as 'own' | 'team' | 'department' | 'all'
  });

  const modules = ['crm', 'sales', 'inventory', 'accounting', 'hr', 'manufacturing', 'marketing', 'pos', 'website', 'support', 'projects', 'dashboard', 'system'];
  const actions = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import', 'configure', 'manage'];

  useEffect(() => {
    loadPermissions();
  }, [filterModule, filterAction]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const filters: any = {};
      if (filterModule) filters.module = filterModule;
      if (filterAction) filters.action = filterAction;
      const data = await rbacService.getPermissions(filters);
      setPermissions(data);
    } catch (error) {
      console.error('Failed to load permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      await rbacService.createPermission(formData);
      setShowCreateModal(false);
      resetForm();
      loadPermissions();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create permission');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      module: 'crm',
      feature: '',
      action: 'view',
      resource_type: '',
      record_access_level: 'own'
    });
  };

  const filteredPermissions = permissions.filter(perm => {
    const matchesSearch = perm.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         perm.code.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
    const key = `${perm.module}.${perm.feature || 'general'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading permissions..." />;
  }

  return (
    <div className="rbac-management">
      <div className="rbac-header">
        <div className="rbac-title">
          <Key size={24} />
          <h2>Permissions Management</h2>
        </div>
        <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
          <Plus size={18} />
          Create Permission
        </Button>
      </div>

      <div className="rbac-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search permissions..."
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
        <div className="filter-box">
          <Filter size={18} />
          <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
            <option value="">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{a.toUpperCase()}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="permissions-list">
        {Object.entries(groupedPermissions).map(([group, perms]) => (
          <Card key={group} className="permission-group">
            <h3 className="group-title">{group}</h3>
            <div className="permissions-grid">
              {perms.map(perm => (
                <div key={perm.id} className="permission-item">
                  <div className="permission-header">
                    <div>
                      <h4>{perm.name}</h4>
                      <p className="permission-code">{perm.code}</p>
                    </div>
                    <div className={`permission-badge ${perm.action}`}>
                      {perm.action}
                    </div>
                  </div>
                  {perm.description && (
                    <p className="permission-description">{perm.description}</p>
                  )}
                  <div className="permission-meta">
                    <span className="access-level">{perm.record_access_level}</span>
                    {perm.resource_type && (
                      <span className="resource-type">{perm.resource_type}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {filteredPermissions.length === 0 && (
        <div className="empty-state">
          <Key size={48} />
          <p>No permissions found</p>
        </div>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => { setShowCreateModal(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Permission</h3>
            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Code *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g., crm.leads.create"
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
                >
                  {modules.map(m => (
                    <option key={m} value={m}>{m.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Feature</label>
                <input
                  type="text"
                  value={formData.feature}
                  onChange={(e) => setFormData({ ...formData, feature: e.target.value })}
                  placeholder="e.g., leads, orders"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Action *</label>
                <select
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                >
                  {actions.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Resource Type</label>
                <input
                  type="text"
                  value={formData.resource_type}
                  onChange={(e) => setFormData({ ...formData, resource_type: e.target.value })}
                  placeholder="e.g., lead, order"
                />
              </div>
            </div>
            <div className="form-group">
              <label>Record Access Level</label>
              <select
                value={formData.record_access_level}
                onChange={(e) => setFormData({ ...formData, record_access_level: e.target.value as any })}
              >
                <option value="own">Own Records</option>
                <option value="team">Team Records</option>
                <option value="department">Department Records</option>
                <option value="all">All Records</option>
              </select>
            </div>
            <div className="modal-actions">
              <Button variant="ghost" onClick={() => { setShowCreateModal(false); resetForm(); }}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

