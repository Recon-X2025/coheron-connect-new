import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  manufacturingService,
  type Routing,
  type WorkCenter,
} from '../../services/manufacturingService';
import { showToast } from '../../components/Toast';
import { confirmAction } from '../../components/ConfirmDialog';
import './RoutingManagement.css';

export const RoutingManagement = () => {
  const [routings, setRoutings] = useState<Routing[]>([]);
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRouting, setSelectedRouting] = useState<Routing | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRouting, setEditingRouting] = useState<Routing | null>(null);
  const [activeTab, setActiveTab] = useState<'routings' | 'workcenters'>('routings');
  const [routingFormData, setRoutingFormData] = useState({
    name: '',
    code: '',
    active: true,
    note: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [routingsData, workCentersData] = await Promise.all([
        manufacturingService.getRoutings(),
        manufacturingService.getWorkCenters(),
      ]);
      setRoutings(routingsData);
      setWorkCenters(workCentersData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (routing: Routing) => {
    try {
      const fullRouting = await manufacturingService.getRouting(routing.id);
      setSelectedRouting(fullRouting);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load routing details:', error);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Routing',
      message: 'Are you sure you want to delete this routing?',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await manufacturingService.deleteRouting(id);
      await loadData();
      showToast('Routing deleted successfully', 'success');
    } catch (error) {
      showToast('Failed to delete routing', 'error');
    }
  };

  const handleCreateRouting = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRouting?.id) {
        await manufacturingService.updateRouting(editingRouting.id, routingFormData);
        showToast('Routing updated successfully', 'success');
      } else {
        await manufacturingService.createRouting(routingFormData);
        showToast('Routing created successfully', 'success');
      }

      await loadData();
      setShowCreateModal(false);
      setEditingRouting(null);
      setRoutingFormData({
        name: '',
        code: '',
        active: true,
        note: '',
      });
    } catch (error: any) {
      showToast(error.response?.data?.error || `Failed to ${editingRouting ? 'update' : 'create'} routing`, 'error');
    }
  };

  const filteredRoutings = routings.filter((routing) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      routing.name?.toLowerCase().includes(searchLower) ||
      routing.code?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="routing-management-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading routings..." />
        </div>
      </div>
    );
  }

  return (
    <div className="routing-management-page">
      <div className="container">
        <div className="routing-header">
          <div>
            <h1>Routing & Work Centers</h1>
            <p className="routing-subtitle">
              Manage production routings and work centers
            </p>
          </div>
          <div className="header-tabs">
            <button
              className={activeTab === 'routings' ? 'active' : ''}
              onClick={() => setActiveTab('routings')}
            >
              Routings ({routings.length})
            </button>
            <button
              className={activeTab === 'workcenters' ? 'active' : ''}
              onClick={() => setActiveTab('workcenters')}
            >
              Work Centers ({workCenters.length})
            </button>
          </div>
        </div>

        <div className="routing-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>
            New {activeTab === 'routings' ? 'Routing' : 'Work Center'}
          </Button>
        </div>

        {activeTab === 'routings' ? (
          <div className="routings-table-container">
            <table className="routings-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Active</th>
                  <th>Operations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutings.map((routing) => (
                  <tr key={routing.id}>
                    <td><strong>{routing.code || '-'}</strong></td>
                    <td>{routing.name}</td>
                    <td>
                      <span className={`status-badge ${routing.active ? 'active' : 'inactive'}`}>
                        {routing.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{routing.operations?.length || 0} operations</td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          onClick={() => handleViewDetails(routing)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button className="action-btn" title="Edit" onClick={() => { setEditingRouting(routing); setShowCreateModal(true); }}>
                          <Edit size={16} />
                        </button>
                        <button
                          className="action-btn danger"
                          onClick={() => handleDelete(routing.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="workcenters-table-container">
            <table className="workcenters-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Capacity</th>
                  <th>Efficiency</th>
                  <th>Cost/Hour</th>
                  <th>Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workCenters.map((wc) => (
                  <tr key={wc.id}>
                    <td><strong>{wc.code || '-'}</strong></td>
                    <td>{wc.name}</td>
                    <td>{wc.workcenter_type || '-'}</td>
                    <td>{wc.capacity || 1}</td>
                    <td>{wc.time_efficiency || 100}%</td>
                    <td>${wc.costs_hour?.toFixed(2) || '0.00'}</td>
                    <td>
                      <span className={`status-badge ${wc.active ? 'active' : 'inactive'}`}>
                        {wc.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="Edit" onClick={() => showToast('Select a routing to edit work center details', 'info')}>
                          <Edit size={16} />
                        </button>
                        <button className="action-btn danger" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showDetailModal && selectedRouting && (
          <div className="routing-detail-modal" onClick={() => setShowDetailModal(false)}>
            <div className="routing-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="routing-detail-header">
                <div>
                  <h2>{selectedRouting.name}</h2>
                  <p className="routing-subtitle">{selectedRouting.code || 'No code'}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>

              <div className="routing-detail-body">
                <div className="routing-info-section">
                  <h3>Routing Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Active:</strong>{' '}
                      <span className={`status-badge ${selectedRouting.active ? 'active' : 'inactive'}`}>
                        {selectedRouting.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {selectedRouting.note && (
                      <div className="info-item full-width">
                        <strong>Notes:</strong> {selectedRouting.note}
                      </div>
                    )}
                  </div>
                </div>

                <div className="operations-section">
                  <h3>Operations ({selectedRouting.operations?.length || 0})</h3>
                  {selectedRouting.operations && selectedRouting.operations.length > 0 ? (
                    <table className="operations-table">
                      <thead>
                        <tr>
                          <th>Sequence</th>
                          <th>Name</th>
                          <th>Work Center</th>
                          <th>Cycle Time</th>
                          <th>Setup Time</th>
                          <th>Batch Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRouting.operations.map((op) => (
                          <tr key={op.id}>
                            <td>{op.sequence}</td>
                            <td>{op.name}</td>
                            <td>{op.workcenter_name || '-'}</td>
                            <td>{op.time_cycle ? `${op.time_cycle}h` : '-'}</td>
                            <td>{op.time_start ? `${op.time_start}h` : '-'}</td>
                            <td>{op.batch_size || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No operations defined</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && activeTab === 'routings' && (
          <div className="routing-detail-modal" onClick={() => setShowCreateModal(false)}>
            <div className="routing-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="routing-detail-header">
                <h2>{editingRouting ? 'Edit Routing' : 'Create Routing'}</h2>
                <button onClick={() => {
                  setShowCreateModal(false);
                  setEditingRouting(null);
                  setRoutingFormData({
                    name: '',
                    code: '',
                    active: true,
                    note: '',
                  });
                }}>×</button>
              </div>
              <form onSubmit={handleCreateRouting} className="create-routing-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={routingFormData.name}
                    onChange={(e) => setRoutingFormData({ ...routingFormData, name: e.target.value })}
                    placeholder="Routing Name"
                  />
                </div>
                <div className="form-group">
                  <label>Code</label>
                  <input
                    type="text"
                    value={routingFormData.code}
                    onChange={(e) => setRoutingFormData({ ...routingFormData, code: e.target.value })}
                    placeholder="Routing Code (Optional)"
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    rows={3}
                    value={routingFormData.note}
                    onChange={(e) => setRoutingFormData({ ...routingFormData, note: e.target.value })}
                    placeholder="Routing notes..."
                  />
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingRouting ? 'Update Routing' : 'Create Routing'}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutingManagement;

