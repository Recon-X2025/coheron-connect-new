import { useState, useEffect } from 'react';
import {
  Search,
  Play,
  Square,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { manufacturingService, type WorkOrder } from '../../services/manufacturingService';
import { showToast } from '../../components/Toast';
import './WorkOrders.css';

export const WorkOrders = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWorkCenter] = useState<number | undefined>();
  const [selectedState, setSelectedState] = useState<string>('');
  const [dashboard, setDashboard] = useState<any>(null);
  const [selectedWO, setSelectedWO] = useState<WorkOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    loadData();
    loadDashboard();
  }, [selectedWorkCenter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedWorkCenter) params.workcenter_id = selectedWorkCenter;
      if (selectedState) params.state = selectedState;
      const data = await manufacturingService.getWorkOrders(params);
      setWorkOrders(data);
    } catch (error) {
      console.error('Failed to load work orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async () => {
    try {
      const data = await manufacturingService.getShopFloorDashboard(selectedWorkCenter);
      setDashboard(data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const handleStart = async (id: number) => {
    try {
      await manufacturingService.startWorkOrder(id);
      await loadData();
      await loadDashboard();
      showToast('Work order started', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to start work order', 'error');
    }
  };

  const handlePause = async (id: number) => {
    const reason = prompt('Enter downtime reason:');
    if (reason) {
      try {
        await manufacturingService.pauseWorkOrder(id, undefined, reason);
        await loadData();
        await loadDashboard();
        showToast('Work order paused', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.error || 'Failed to pause work order', 'error');
      }
    }
  };

  const handleResume = async (id: number) => {
    try {
      await manufacturingService.resumeWorkOrder(id);
      await loadData();
      await loadDashboard();
      showToast('Work order resumed', 'success');
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Failed to resume work order', 'error');
    }
  };

  const handleComplete = async (id: number) => {
    const qtyProduced = prompt('Enter quantity produced:');
    const qtyScrapped = prompt('Enter quantity scrapped (optional):') || '0';
    if (qtyProduced) {
      try {
        await manufacturingService.completeWorkOrder(
          id,
          undefined,
          parseFloat(qtyProduced),
          parseFloat(qtyScrapped)
        );
        await loadData();
        await loadDashboard();
        showToast('Work order completed', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.error || 'Failed to complete work order', 'error');
      }
    }
  };

  const handleRecordScrap = async (id: number) => {
    const qty = prompt('Enter scrapped quantity:');
    const reason = prompt('Enter scrap reason:');
    if (qty) {
      try {
        await manufacturingService.recordScrap(id, 1, parseFloat(qty), reason || undefined);
        await loadData();
        await loadDashboard();
        showToast('Scrap recorded', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.error || 'Failed to record scrap', 'error');
      }
    }
  };

  const handleViewDetails = async (wo: WorkOrder) => {
    try {
      const fullWO = await manufacturingService.getWorkOrder(wo.id);
      setSelectedWO(fullWO);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load work order details:', error);
    }
  };

  const getStateIcon = (state: WorkOrder['state']) => {
    switch (state) {
      case 'done':
        return <CheckCircle size={16} className="state-icon done" />;
      case 'progress':
        return <Play size={16} className="state-icon progress" />;
      case 'ready':
        return <Clock size={16} className="state-icon ready" />;
      case 'cancel':
        return <AlertCircle size={16} className="state-icon cancel" />;
      default:
        return <Clock size={16} className="state-icon pending" />;
    }
  };

  const getStateColor = (state: WorkOrder['state']) => {
    const colors: Record<WorkOrder['state'], string> = {
      pending: '#64748b',
      ready: '#3b82f6',
      progress: '#f59e0b',
      done: '#10b981',
      cancel: '#ef4444',
    };
    return colors[state] || '#64748b';
  };

  const filteredWorkOrders = workOrders.filter((wo) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      wo.name?.toLowerCase().includes(searchLower) ||
      wo.mo_name?.toLowerCase().includes(searchLower) ||
      wo.operation_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="work-orders-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading work orders..." />
        </div>
      </div>
    );
  }

  return (
    <div className="work-orders-page">
      <div className="container">
        <div className="work-orders-header">
          <div>
            <h1>Work Orders - Shop Floor</h1>
            <p className="work-orders-subtitle">Manage production work orders</p>
          </div>
        </div>

        {dashboard && (
          <div className="shop-floor-dashboard">
            <div className="dashboard-card">
              <div className="dashboard-icon active">
                <Play size={24} />
              </div>
              <div className="dashboard-content">
                <div className="dashboard-value">{dashboard.statistics?.active_count || 0}</div>
                <div className="dashboard-label">Active</div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon ready">
                <Clock size={24} />
              </div>
              <div className="dashboard-content">
                <div className="dashboard-value">{dashboard.statistics?.ready_count || 0}</div>
                <div className="dashboard-label">Ready</div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon pending">
                <Clock size={24} />
              </div>
              <div className="dashboard-content">
                <div className="dashboard-value">{dashboard.statistics?.pending_count || 0}</div>
                <div className="dashboard-label">Pending</div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon done">
                <CheckCircle size={24} />
              </div>
              <div className="dashboard-content">
                <div className="dashboard-value">{dashboard.statistics?.completed_count || 0}</div>
                <div className="dashboard-label">Completed</div>
              </div>
            </div>
            <div className="dashboard-card">
              <div className="dashboard-icon scrap">
                <AlertCircle size={24} />
              </div>
              <div className="dashboard-content">
                <div className="dashboard-value">{dashboard.statistics?.total_scrapped || 0}</div>
                <div className="dashboard-label">Total Scrapped</div>
              </div>
            </div>
          </div>
        )}

        <div className="work-orders-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search work orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={selectedState}
            onChange={(e) => {
              setSelectedState(e.target.value);
              loadData();
            }}
            className="filter-select"
          >
            <option value="">All States</option>
            <option value="pending">Pending</option>
            <option value="ready">Ready</option>
            <option value="progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="work-orders-table-container">
          <table className="work-orders-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>MO</th>
                <th>Operation</th>
                <th>Work Center</th>
                <th>State</th>
                <th>Qty Produced</th>
                <th>Duration</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredWorkOrders.map((wo) => (
                <tr key={wo.id} onClick={() => handleViewDetails(wo)}>
                  <td><strong>{wo.name}</strong></td>
                  <td>{wo.mo_name || wo.mo_number || '-'}</td>
                  <td>{wo.operation_name || '-'}</td>
                  <td>{wo.workcenter_name || '-'}</td>
                  <td>
                    <span
                      className="state-badge"
                      style={{
                        backgroundColor: `${getStateColor(wo.state)}20`,
                        color: getStateColor(wo.state),
                      }}
                    >
                      {getStateIcon(wo.state)}
                      {wo.state}
                    </span>
                  </td>
                  <td>
                    {wo.qty_produced || 0}
                    {wo.qty_scrapped && wo.qty_scrapped > 0 && (
                      <span className="scrap-indicator"> ({wo.qty_scrapped} scrap)</span>
                    )}
                  </td>
                  <td>{wo.duration ? `${wo.duration.toFixed(2)}h` : '-'}</td>
                  <td>
                    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                      {wo.state === 'ready' || wo.state === 'pending' ? (
                        <button
                          className="action-btn primary"
                          onClick={() => handleStart(wo.id)}
                          title="Start"
                        >
                          <Play size={16} />
                        </button>
                      ) : wo.state === 'progress' ? (
                        <>
                          {wo.is_user_working ? (
                            <button
                              className="action-btn warning"
                              onClick={() => handlePause(wo.id)}
                              title="Pause"
                            >
                              <Square size={16} />
                            </button>
                          ) : (
                            <button
                              className="action-btn primary"
                              onClick={() => handleResume(wo.id)}
                              title="Resume"
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                          <button
                            className="action-btn success"
                            onClick={() => handleComplete(wo.id)}
                            title="Complete"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="action-btn danger"
                            onClick={() => handleRecordScrap(wo.id)}
                            title="Record Scrap"
                          >
                            <AlertCircle size={16} />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showDetailModal && selectedWO && (
          <div className="wo-detail-modal" onClick={() => setShowDetailModal(false)}>
            <div className="wo-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="wo-detail-header">
                <div>
                  <h2>{selectedWO.name}</h2>
                  <p className="wo-subtitle">{selectedWO.mo_name}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>

              <div className="wo-detail-body">
                <div className="wo-info-section">
                  <h3>Work Order Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Operation:</strong> {selectedWO.operation_name || '-'}
                    </div>
                    <div className="info-item">
                      <strong>Work Center:</strong> {selectedWO.workcenter_name || '-'}
                    </div>
                    <div className="info-item">
                      <strong>State:</strong>{' '}
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(selectedWO.state)}20`,
                          color: getStateColor(selectedWO.state),
                        }}
                      >
                        {selectedWO.state}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Qty Produced:</strong> {selectedWO.qty_produced || 0}
                    </div>
                    <div className="info-item">
                      <strong>Qty Scrapped:</strong> {selectedWO.qty_scrapped || 0}
                    </div>
                    <div className="info-item">
                      <strong>Duration:</strong>{' '}
                      {selectedWO.duration ? `${selectedWO.duration.toFixed(2)}h` : '-'}
                    </div>
                    {selectedWO.date_start && (
                      <div className="info-item">
                        <strong>Start:</strong> {new Date(selectedWO.date_start).toLocaleString()}
                      </div>
                    )}
                    {selectedWO.date_finished && (
                      <div className="info-item">
                        <strong>Finish:</strong> {new Date(selectedWO.date_finished).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {selectedWO.activities && selectedWO.activities.length > 0 && (
                  <div className="activities-section">
                    <h3>Operator Activities</h3>
                    <div className="activities-list">
                      {selectedWO.activities.map((activity) => (
                        <div key={activity.id} className="activity-item">
                          <div className="activity-header">
                            <span className="activity-type">{activity.activity_type}</span>
                            <span className="activity-time">
                              {activity.timestamp
                                ? new Date(activity.timestamp).toLocaleString()
                                : '-'}
                            </span>
                          </div>
                          {activity.operator_name && (
                            <p className="activity-operator">Operator: {activity.operator_name}</p>
                          )}
                          {activity.qty_produced && (
                            <p>Qty Produced: {activity.qty_produced}</p>
                          )}
                          {activity.qty_scrapped && <p>Qty Scrapped: {activity.qty_scrapped}</p>}
                          {activity.downtime_reason && (
                            <p>Downtime: {activity.downtime_reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkOrders;

