import { useState, useEffect } from 'react';
import { Package, ArrowDown, ArrowUp, Search, List, Plus } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './WarehouseOperations.css';

interface PutawayTask {
  id: number;
  grn_id: number;
  grn_number?: string;
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  from_location?: string;
  recommended_location?: string;
  actual_location?: string;
  state: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to_id?: number;
  assigned_to_name?: string;
  started_at?: string;
  completed_at?: string;
  putaway_time_minutes?: number;
}

interface PickingTask {
  id: number;
  order_id: number;
  order_number?: string;
  order_type: 'sale' | 'transfer' | 'issue';
  product_id: number;
  product_name?: string;
  product_code?: string;
  quantity: number;
  quantity_picked: number;
  recommended_location?: string;
  actual_location?: string;
  picking_strategy: 'fifo' | 'lifo' | 'fefo' | 'closest';
  state: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to_id?: number;
  assigned_to_name?: string;
  started_at?: string;
  completed_at?: string;
  picking_time_minutes?: number;
}

interface PackingTask {
  id: number;
  order_id: number;
  order_number?: string;
  picking_task_id: number;
  items: PackingItem[];
  carton_type?: string;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  state: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to_id?: number;
  assigned_to_name?: string;
  started_at?: string;
  completed_at?: string;
}

interface PackingItem {
  product_id: number;
  product_name?: string;
  quantity: number;
}

interface CycleCount {
  id: number;
  count_number: string;
  warehouse_id: number;
  warehouse_name?: string;
  location_id?: number;
  location_name?: string;
  count_type: 'scheduled' | 'random' | 'abc_based' | 'location_based' | 'full';
  count_method: 'blind' | 'guided';
  state: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to_id?: number;
  assigned_to_name?: string;
  scheduled_date?: string;
  started_at?: string;
  completed_at?: string;
  items: CycleCountItem[];
  variance_count: number;
  accuracy_percentage?: number;
}

interface CycleCountItem {
  id: number;
  product_id: number;
  product_name?: string;
  product_code?: string;
  system_qty: number;
  physical_qty: number;
  variance: number;
  variance_percentage: number;
  counted_by?: number;
  counted_at?: string;
}

type OperationTab = 'putaway' | 'picking' | 'packing' | 'cycle-count';

export const WarehouseOperations = () => {
  const [activeTab, setActiveTab] = useState<OperationTab>('putaway');
  const [putawayTasks, setPutawayTasks] = useState<PutawayTask[]>([]);
  const [pickingTasks, setPickingTasks] = useState<PickingTask[]>([]);
  const [packingTasks, setPackingTasks] = useState<PackingTask[]>([]);
  const [cycleCounts, setCycleCounts] = useState<CycleCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    state: '',
    warehouse_id: '',
    search: '',
  });

  useEffect(() => {
    loadData();
  }, [activeTab, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'putaway':
          const putawayData = await apiService.get<PutawayTask>('/inventory/warehouse-operations/putaway', filters);
          setPutawayTasks(Array.isArray(putawayData) ? putawayData : []);
          break;
        case 'picking':
          const pickingData = await apiService.get<PickingTask>('/inventory/warehouse-operations/picking', filters);
          setPickingTasks(Array.isArray(pickingData) ? pickingData : []);
          break;
        case 'packing':
          const packingData = await apiService.get<PackingTask>('/inventory/warehouse-operations/packing', filters);
          setPackingTasks(Array.isArray(packingData) ? packingData : []);
          break;
        case 'cycle-count':
          const cycleData = await apiService.get<CycleCount>('/inventory/warehouse-operations/cycle-counts', filters);
          setCycleCounts(Array.isArray(cycleData) ? cycleData : []);
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartPutaway = async (id: number) => {
    try {
      await apiService.getAxiosInstance().post(`/inventory/warehouse-operations/putaway/${id}/start`);
      loadData();
    } catch (error) {
      console.error('Failed to start putaway:', error);
      showToast('Failed to start putaway task', 'error');
    }
  };

  const handleCompletePutaway = async (id: number, location: string) => {
    try {
      await apiService.getAxiosInstance().post(`/inventory/warehouse-operations/putaway/${id}/complete`, {
        actual_location: location,
      });
      loadData();
    } catch (error) {
      console.error('Failed to complete putaway:', error);
      showToast('Failed to complete putaway task', 'error');
    }
  };

  const handleStartPicking = async (id: number) => {
    try {
      await apiService.getAxiosInstance().post(`/inventory/warehouse-operations/picking/${id}/start`);
      loadData();
    } catch (error) {
      console.error('Failed to start picking:', error);
      showToast('Failed to start picking task', 'error');
    }
  };

  const handleCompletePicking = async (id: number, quantity: number) => {
    try {
      await apiService.getAxiosInstance().post(`/inventory/warehouse-operations/picking/${id}/complete`, {
        quantity_picked: quantity,
      });
      loadData();
    } catch (error) {
      console.error('Failed to complete picking:', error);
      showToast('Failed to complete picking task', 'error');
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      pending: { label: 'Pending', class: 'badge-gray' },
      in_progress: { label: 'In Progress', class: 'badge-blue' },
      completed: { label: 'Completed', class: 'badge-green' },
      cancelled: { label: 'Cancelled', class: 'badge-red' },
      draft: { label: 'Draft', class: 'badge-gray' },
    };
    return badges[state] || { label: state, class: 'badge-gray' };
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const [showPutawayForm, setShowPutawayForm] = useState(false);
  const [showPickingForm, setShowPickingForm] = useState(false);
  const [showPackingForm, setShowPackingForm] = useState(false);
  const [showCycleCountForm, setShowCycleCountForm] = useState(false);

  return (
    <div className="warehouse-operations">
      <div className="operations-header">
        <h2>Warehouse Operations</h2>
        <div className="header-actions">
          {activeTab === 'putaway' && (
            <Button icon={<Plus size={18} />} onClick={() => setShowPutawayForm(true)}>
              New Putaway Rule
            </Button>
          )}
          {activeTab === 'picking' && (
            <Button icon={<Plus size={18} />} onClick={() => setShowPickingForm(true)}>
              New Picking List
            </Button>
          )}
          {activeTab === 'packing' && (
            <Button icon={<Plus size={18} />} onClick={() => setShowPackingForm(true)}>
              New Packing List
            </Button>
          )}
          {activeTab === 'cycle-count' && (
            <Button icon={<Plus size={18} />} onClick={() => setShowCycleCountForm(true)}>
              New Cycle Count
            </Button>
          )}
        </div>
      </div>

      <div className="operations-tabs">
        <button
          type="button"
          className={activeTab === 'putaway' ? 'active' : ''}
          onClick={() => setActiveTab('putaway')}
        >
          <ArrowDown size={18} />
          Putaway
        </button>
        <button
          type="button"
          className={activeTab === 'picking' ? 'active' : ''}
          onClick={() => setActiveTab('picking')}
        >
          <ArrowUp size={18} />
          Picking
        </button>
        <button
          type="button"
          className={activeTab === 'packing' ? 'active' : ''}
          onClick={() => setActiveTab('packing')}
        >
          <Package size={18} />
          Packing
        </button>
        <button
          type="button"
          className={activeTab === 'cycle-count' ? 'active' : ''}
          onClick={() => setActiveTab('cycle-count')}
        >
          <List size={18} />
          Cycle Count
        </button>
      </div>

      <div className="operations-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          value={filters.state}
          onChange={(e) => setFilters({ ...filters, state: e.target.value })}
        >
          <option value="">All States</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="operations-content">
        {activeTab === 'putaway' && (
          <div className="putaway-tasks">
            <table>
              <thead>
                <tr>
                  <th>GRN</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Recommended Location</th>
                  <th>State</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {putawayTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <Package size={48} />
                      <p>No putaway tasks found</p>
                    </td>
                  </tr>
                ) : (
                  putawayTasks.map((task) => {
                    const badge = getStateBadge(task.state);
                    return (
                      <tr key={task.id}>
                        <td>{task.grn_number || `#${task.grn_id}`}</td>
                        <td>{task.product_name || task.product_code}</td>
                        <td>{task.quantity}</td>
                        <td>{task.recommended_location || '-'}</td>
                        <td>
                          <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                        </td>
                        <td>{task.assigned_to_name || '-'}</td>
                        <td>
                          <div className="action-buttons">
                            {task.state === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartPutaway(task.id)}
                              >
                                Start
                              </Button>
                            )}
                            {task.state === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const location = prompt('Enter actual location:');
                                  if (location) handleCompletePutaway(task.id, location);
                                }}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'picking' && (
          <div className="picking-tasks">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Picked</th>
                  <th>Location</th>
                  <th>Strategy</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pickingTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      <ArrowUp size={48} />
                      <p>No picking tasks found</p>
                    </td>
                  </tr>
                ) : (
                  pickingTasks.map((task) => {
                    const badge = getStateBadge(task.state);
                    return (
                      <tr key={task.id}>
                        <td>{task.order_number || `#${task.order_id}`}</td>
                        <td>{task.product_name || task.product_code}</td>
                        <td>{task.quantity}</td>
                        <td>{task.quantity_picked}</td>
                        <td>{task.recommended_location || '-'}</td>
                        <td>{task.picking_strategy.toUpperCase()}</td>
                        <td>
                          <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {task.state === 'pending' && (
                              <Button
                                size="sm"
                                onClick={() => handleStartPicking(task.id)}
                              >
                                Start
                              </Button>
                            )}
                            {task.state === 'in_progress' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const qty = prompt('Enter quantity picked:', task.quantity.toString());
                                  if (qty) handleCompletePicking(task.id, parseFloat(qty));
                                }}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'packing' && (
          <div className="packing-tasks">
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Items</th>
                  <th>Carton Type</th>
                  <th>Weight</th>
                  <th>State</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {packingTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <Package size={48} />
                      <p>No packing tasks found</p>
                    </td>
                  </tr>
                ) : (
                  packingTasks.map((task) => {
                    const badge = getStateBadge(task.state);
                    return (
                      <tr key={task.id}>
                        <td>{task.order_number || `#${task.order_id}`}</td>
                        <td>{task.items.length} items</td>
                        <td>{task.carton_type || '-'}</td>
                        <td>{task.weight ? `${task.weight} kg` : '-'}</td>
                        <td>
                          <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                        </td>
                        <td>{task.assigned_to_name || '-'}</td>
                        <td>
                          <Button size="sm" variant="secondary">View</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'cycle-count' && (
          <div className="cycle-counts">
            <table>
              <thead>
                <tr>
                  <th>Count Number</th>
                  <th>Warehouse</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Variances</th>
                  <th>Accuracy</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cycleCounts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      <List size={48} />
                      <p>No cycle counts found</p>
                    </td>
                  </tr>
                ) : (
                  cycleCounts.map((count) => {
                    const badge = getStateBadge(count.state);
                    return (
                      <tr key={count.id}>
                        <td>{count.count_number}</td>
                        <td>{count.warehouse_name}</td>
                        <td>{count.count_type}</td>
                        <td>{count.count_method}</td>
                        <td>{count.variance_count}</td>
                        <td>
                          {count.accuracy_percentage !== undefined
                            ? `${count.accuracy_percentage.toFixed(1)}%`
                            : '-'}
                        </td>
                        <td>
                          <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                        </td>
                        <td>
                          <Button size="sm" variant="secondary">View</Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Putaway Form Modal */}
      {showPutawayForm && (
        <PutawayFormModal
          onClose={() => setShowPutawayForm(false)}
          onSuccess={() => {
            setShowPutawayForm(false);
            loadData();
          }}
        />
      )}

      {/* Picking Form Modal */}
      {showPickingForm && (
        <PickingFormModal
          onClose={() => setShowPickingForm(false)}
          onSuccess={() => {
            setShowPickingForm(false);
            loadData();
          }}
        />
      )}

      {/* Packing Form Modal */}
      {showPackingForm && (
        <PackingFormModal
          onClose={() => setShowPackingForm(false)}
          onSuccess={() => {
            setShowPackingForm(false);
            loadData();
          }}
        />
      )}

      {/* Cycle Count Form Modal */}
      {showCycleCountForm && (
        <CycleCountFormModal
          onClose={() => setShowCycleCountForm(false)}
          onSuccess={() => {
            setShowCycleCountForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Putaway Form Component
interface PutawayFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PutawayFormModal = ({ onClose, onSuccess }: PutawayFormModalProps) => {
  const [formData, setFormData] = useState({
    grn_id: '',
    warehouse_id: '',
    product_id: '',
    quantity: '',
    recommended_location: '',
    priority: 'normal',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.create('/inventory/warehouse-operations/putaway', {
        grn_id: parseInt(formData.grn_id),
        warehouse_id: parseInt(formData.warehouse_id),
        product_id: parseInt(formData.product_id),
        quantity: parseFloat(formData.quantity),
        recommended_location: formData.recommended_location,
        priority: formData.priority,
      });
      showToast('Putaway rule created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create putaway rule:', error);
      showToast(error?.message || 'Failed to create putaway rule', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Putaway Rule</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>GRN ID *</label>
            <input
              type="number"
              required
              value={formData.grn_id}
              onChange={(e) => setFormData({ ...formData, grn_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Warehouse ID *</label>
            <input
              type="number"
              required
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Product ID *</label>
            <input
              type="number"
              required
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Quantity *</label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Recommended Location</label>
            <input
              type="text"
              value={formData.recommended_location}
              onChange={(e) => setFormData({ ...formData, recommended_location: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Picking Form Component
interface PickingFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PickingFormModal = ({ onClose, onSuccess }: PickingFormModalProps) => {
  const [formData, setFormData] = useState({
    order_id: '',
    order_type: 'sale' as 'sale' | 'transfer' | 'issue',
    warehouse_id: '',
    picking_strategy: 'fifo' as 'fifo' | 'lifo' | 'fefo' | 'closest',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.create('/inventory/warehouse-operations/picking', {
        order_id: parseInt(formData.order_id),
        order_type: formData.order_type,
        warehouse_id: parseInt(formData.warehouse_id),
        picking_strategy: formData.picking_strategy,
      });
      showToast('Picking list created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create picking list:', error);
      showToast(error?.message || 'Failed to create picking list', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Picking List</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Order ID *</label>
            <input
              type="number"
              required
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Order Type *</label>
            <select
              value={formData.order_type}
              onChange={(e) => setFormData({ ...formData, order_type: e.target.value as any })}
            >
              <option value="sale">Sale Order</option>
              <option value="transfer">Transfer</option>
              <option value="issue">Issue</option>
            </select>
          </div>
          <div className="form-group">
            <label>Warehouse ID *</label>
            <input
              type="number"
              required
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Picking Strategy *</label>
            <select
              value={formData.picking_strategy}
              onChange={(e) => setFormData({ ...formData, picking_strategy: e.target.value as any })}
            >
              <option value="fifo">FIFO (First In First Out)</option>
              <option value="lifo">LIFO (Last In First Out)</option>
              <option value="fefo">FEFO (First Expiry First Out)</option>
              <option value="closest">Closest Location</option>
            </select>
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Packing Form Component
interface PackingFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const PackingFormModal = ({ onClose, onSuccess }: PackingFormModalProps) => {
  const [formData, setFormData] = useState({
    order_id: '',
    picking_task_id: '',
    carton_type: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.create('/inventory/warehouse-operations/packing', {
        order_id: parseInt(formData.order_id),
        picking_task_id: parseInt(formData.picking_task_id),
        carton_type: formData.carton_type,
      });
      showToast('Packing list created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create packing list:', error);
      showToast(error?.message || 'Failed to create packing list', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Packing List</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Order ID *</label>
            <input
              type="number"
              required
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Picking Task ID *</label>
            <input
              type="number"
              required
              value={formData.picking_task_id}
              onChange={(e) => setFormData({ ...formData, picking_task_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Carton Type</label>
            <input
              type="text"
              value={formData.carton_type}
              onChange={(e) => setFormData({ ...formData, carton_type: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Cycle Count Form Component
interface CycleCountFormModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CycleCountFormModal = ({ onClose, onSuccess }: CycleCountFormModalProps) => {
  const [formData, setFormData] = useState({
    warehouse_id: '',
    location_id: '',
    count_type: 'scheduled' as 'scheduled' | 'random' | 'abc_based' | 'location_based' | 'full',
    count_method: 'guided' as 'blind' | 'guided',
    scheduled_date: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiService.create('/inventory/warehouse-operations/cycle-counts', {
        warehouse_id: parseInt(formData.warehouse_id),
        location_id: formData.location_id ? parseInt(formData.location_id) : undefined,
        count_type: formData.count_type,
        count_method: formData.count_method,
        scheduled_date: formData.scheduled_date,
      });
      showToast('Cycle count created successfully', 'success');
      onSuccess();
    } catch (error: any) {
      console.error('Failed to create cycle count:', error);
      showToast(error?.message || 'Failed to create cycle count', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Cycle Count</h3>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Warehouse ID *</label>
            <input
              type="number"
              required
              value={formData.warehouse_id}
              onChange={(e) => setFormData({ ...formData, warehouse_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Location ID</label>
            <input
              type="number"
              value={formData.location_id}
              onChange={(e) => setFormData({ ...formData, location_id: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Count Type *</label>
            <select
              value={formData.count_type}
              onChange={(e) => setFormData({ ...formData, count_type: e.target.value as any })}
            >
              <option value="scheduled">Scheduled</option>
              <option value="random">Random</option>
              <option value="abc_based">ABC Based</option>
              <option value="location_based">Location Based</option>
              <option value="full">Full</option>
            </select>
          </div>
          <div className="form-group">
            <label>Count Method *</label>
            <select
              value={formData.count_method}
              onChange={(e) => setFormData({ ...formData, count_method: e.target.value as any })}
            >
              <option value="blind">Blind</option>
              <option value="guided">Guided</option>
            </select>
          </div>
          <div className="form-group">
            <label>Scheduled Date</label>
            <input
              type="date"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

