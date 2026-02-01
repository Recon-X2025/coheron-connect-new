import { useState, useEffect } from 'react';
import { Package, Search, Plus, Eye, Barcode, Hash, Edit, Trash2 } from 'lucide-react';
import { showToast } from '../../components/Toast';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { inventoryService, type StockLot } from '../../services/inventoryService';
import { apiService } from '../../services/apiService';
import { SerialForm } from './components/SerialForm';
import { confirmAction } from '../../components/ConfirmDialog';
import './BatchSerialManagement.css';

interface SerialNumber {
  id: number;
  name: string;
  product_id: number;
  product_name?: string;
  product_code?: string;
  location_id?: number;
  location_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  lot_id?: number;
  lot_name?: string;
  state: 'available' | 'reserved' | 'in_use' | 'scrapped';
  warranty_start_date?: string;
  warranty_end_date?: string;
  current_location?: string;
  transaction_history?: SerialTransaction[];
  created_at?: string;
}

interface SerialTransaction {
  id: number;
  transaction_type: string;
  transaction_id: number;
  reference?: string;
  from_location?: string;
  to_location?: string;
  date: string;
  user_id?: number;
  user_name?: string;
}

interface BatchDetails extends StockLot {
  product_name?: string;
  product_code?: string;
  manufacturing_date?: string;
  expiry_date?: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  locations?: BatchLocation[];
  cost?: number;
  traceability?: TraceabilityRecord[];
}

interface BatchLocation {
  location_id: number;
  location_name: string;
  warehouse_id: number;
  warehouse_name: string;
  quantity: number;
}

interface TraceabilityRecord {
  id: number;
  record_type: 'forward' | 'backward';
  transaction_type: string;
  transaction_id: number;
  reference?: string;
  date: string;
  quantity?: number;
  location?: string;
  related_batch_id?: number;
  related_serial_id?: number;
}

type ViewTab = 'batches' | 'serials' | 'traceability';

export const BatchSerialManagement = () => {
  const [activeTab, setActiveTab] = useState<ViewTab>('batches');
  const [batches, setBatches] = useState<BatchDetails[]>([]);
  const [serials, setSerials] = useState<SerialNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [showSerialForm, setShowSerialForm] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BatchDetails | null>(null);
  const [selectedSerial, setSelectedSerial] = useState<SerialNumber | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    product_id: '',
    search: '',
    state: '',
  });

  useEffect(() => {
    loadData();
    loadProducts();
  }, [activeTab, filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'batches') {
        const params: any = {};
        if (filters.product_id) params.product_id = parseInt(filters.product_id);
        const data = await inventoryService.getLots(params);
        // Enrich with additional details
        const enriched = await Promise.all(
          data.map(async (lot) => {
            const stockData = await inventoryService.getStockQuant({ product_id: lot.product_id });
            const lotStock = stockData.filter(s => s.lot_id === lot.id);
            return {
              ...lot,
              quantity: lotStock.reduce((sum, s) => sum + s.quantity, 0),
              available_quantity: lotStock.reduce((sum, s) => sum + (s.available_quantity || s.quantity - s.reserved_quantity), 0),
              reserved_quantity: lotStock.reduce((sum, s) => sum + s.reserved_quantity, 0),
            } as BatchDetails;
          })
        );
        setBatches(enriched);
      } else if (activeTab === 'serials') {
        // Load serials - would need API endpoint
        const data = await apiService.get<SerialNumber>('/inventory/serials', filters);
        setSerials(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiService.get<any>('/products');
      setProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleCreateBatch = async (batchData: Partial<StockLot>) => {
    try {
      await inventoryService.createLot(batchData);
      loadData();
    } catch (error) {
      console.error('Failed to create batch:', error);
      showToast('Failed to create batch', 'error');
    }
  };

  const handleEditBatch = (batch: BatchDetails) => {
    setSelectedBatch(batch);
    setShowBatchForm(true);
  };

  const handleDeleteBatch = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Batch',
      message: 'Are you sure you want to delete this batch? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await inventoryService.deleteLot(id);
      loadData();
      showToast('Batch deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete batch:', error);
      showToast('Failed to delete batch. Please try again.', 'error');
    }
  };

  const handleEditSerial = (serial: SerialNumber) => {
    setSelectedSerial(serial);
    setShowSerialForm(true);
  };

  const handleDeleteSerial = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Serial Number',
      message: 'Are you sure you want to delete this serial number? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await inventoryService.deleteSerial(id);
      loadData();
      showToast('Serial deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete serial:', error);
      showToast('Failed to delete serial. Please try again.', 'error');
    }
  };

  const handleViewTraceability = async (batchId: number) => {
    try {
      const traceData = await apiService.get<TraceabilityRecord>(`/inventory/batches/${batchId}/traceability`);
      // Show traceability modal
      console.log('Traceability data:', traceData);
    } catch (error) {
      console.error('Failed to load traceability:', error);
    }
  };

  const getStateBadge = (state: string) => {
    const badges: Record<string, { label: string; class: string }> = {
      available: { label: 'Available', class: 'badge-green' },
      reserved: { label: 'Reserved', class: 'badge-yellow' },
      in_use: { label: 'In Use', class: 'badge-blue' },
      scrapped: { label: 'Scrapped', class: 'badge-red' },
    };
    return badges[state] || { label: state, class: 'badge-gray' };
  };

  const formatDate = (date?: string) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="batch-serial-management">
      <div className="batch-serial-header">
        <h2>Batch & Serial Management</h2>
        <div className="header-actions">
          <Button
            size="sm"
            onClick={() => {
              if (activeTab === 'batches') {
                setShowBatchForm(true);
              } else {
                setSelectedSerial(null);
                setShowSerialForm(true);
              }
            }}
          >
            <Plus size={16} />
            {activeTab === 'batches' ? 'New Batch' : 'New Serial'}
          </Button>
        </div>
      </div>

      <div className="batch-serial-tabs">
        <button
          type="button"
          className={activeTab === 'batches' ? 'active' : ''}
          onClick={() => setActiveTab('batches')}
        >
          <Package size={18} />
          Batches
        </button>
        <button
          type="button"
          className={activeTab === 'serials' ? 'active' : ''}
          onClick={() => setActiveTab('serials')}
        >
          <Barcode size={18} />
          Serial Numbers
        </button>
        <button
          type="button"
          className={activeTab === 'traceability' ? 'active' : ''}
          onClick={() => setActiveTab('traceability')}
        >
          <Hash size={18} />
          Traceability
        </button>
      </div>

      <div className="batch-serial-filters">
        <div className="search-box">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, product..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <select
          value={filters.product_id}
          onChange={(e) => setFilters({ ...filters, product_id: e.target.value })}
        >
          <option value="">All Products</option>
          {products.map((prod, idx) => (
            <option key={prod.id || (prod as any)._id || idx} value={prod.id}>
              {prod.name || prod.code}
            </option>
          ))}
        </select>
        {activeTab === 'serials' && (
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
          >
            <option value="">All States</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="in_use">In Use</option>
            <option value="scrapped">Scrapped</option>
          </select>
        )}
      </div>

      <div className="batch-serial-content">
        {activeTab === 'batches' && (
          <div className="batches-table">
            <table>
              <thead>
                <tr>
                  <th>Batch Number</th>
                  <th>Product</th>
                  <th>Manufacturing Date</th>
                  <th>Expiry Date</th>
                  <th>Quantity</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      <Package size={48} />
                      <p>No batches found</p>
                    </td>
                  </tr>
                ) : (
                  batches
                    .filter((batch) =>
                      filters.search
                        ? batch.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                          batch.product_name?.toLowerCase().includes(filters.search.toLowerCase())
                        : true
                    )
                    .map((batch, idx) => (
                      <tr key={batch.id || (batch as any)._id || idx}>
                        <td>
                          <strong>{batch.name}</strong>
                          {batch.ref && <span className="batch-ref">({batch.ref})</span>}
                        </td>
                        <td>{batch.product_name || batch.product_code}</td>
                        <td>{formatDate((batch as any).manufacturing_date)}</td>
                        <td>
                          {formatDate((batch as any).expiry_date)}
                          {(batch as any).expiry_date &&
                            new Date((batch as any).expiry_date) < new Date() && (
                              <span className="expired-badge">Expired</span>
                            )}
                        </td>
                        <td>{batch.quantity}</td>
                        <td>{batch.available_quantity}</td>
                        <td>{batch.reserved_quantity}</td>
                        <td>
                          <div className="action-buttons">
                            <button
                              type="button"
                              className="action-btn"
                              title="View Details"
                              onClick={() => {
                                setSelectedBatch(batch);
                              }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              title="Traceability"
                              onClick={() => handleViewTraceability(batch.id)}
                            >
                              <Hash size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn"
                              title="Edit Lot"
                              onClick={() => handleEditBatch(batch)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn delete"
                              title="Delete Lot"
                              onClick={() => handleDeleteBatch(batch.id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'serials' && (
          <div className="serials-table">
            <table>
              <thead>
                <tr>
                  <th>Serial Number</th>
                  <th>Product</th>
                  <th>Location</th>
                  <th>State</th>
                  <th>Warranty Start</th>
                  <th>Warranty End</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {serials.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <Barcode size={48} />
                      <p>No serial numbers found</p>
                    </td>
                  </tr>
                ) : (
                  serials
                    .filter((serial) =>
                      filters.search
                        ? serial.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                          serial.product_name?.toLowerCase().includes(filters.search.toLowerCase())
                        : true
                    )
                    .filter((serial) => (filters.state ? serial.state === filters.state : true))
                    .map((serial, idx) => {
                      const badge = getStateBadge(serial.state);
                      return (
                        <tr key={serial.id || (serial as any)._id || idx}>
                          <td>
                            <strong>{serial.name}</strong>
                          </td>
                          <td>{serial.product_name || serial.product_code}</td>
                          <td>
                            {serial.warehouse_name && serial.location_name
                              ? `${serial.warehouse_name} / ${serial.location_name}`
                              : serial.warehouse_name || serial.location_name || '-'}
                          </td>
                          <td>
                            <span className={`state-badge ${badge.class}`}>{badge.label}</span>
                          </td>
                          <td>{formatDate(serial.warranty_start_date)}</td>
                          <td>
                            {formatDate(serial.warranty_end_date)}
                            {serial.warranty_end_date &&
                              new Date(serial.warranty_end_date) < new Date() && (
                                <span className="expired-badge">Expired</span>
                              )}
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button
                                type="button"
                                className="action-btn"
                                title="View Details"
                                onClick={() => {
                                  setSelectedSerial(serial);
                                }}
                              >
                                <Eye size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                title="Traceability"
                                onClick={() => {
                                  // Show traceability
                                }}
                              >
                                <Hash size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn"
                                title="Edit Serial"
                                onClick={() => handleEditSerial(serial)}
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn delete"
                                title="Delete Serial"
                                onClick={() => handleDeleteSerial(serial.id)}
                              >
                                <Trash2 size={16} />
                              </button>
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

        {activeTab === 'traceability' && (
          <div className="traceability-view">
            <div className="traceability-search">
              <div className="search-box">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Enter batch number or serial number..."
                />
              </div>
              <select>
                <option value="batch">Batch Number</option>
                <option value="serial">Serial Number</option>
              </select>
              <Button>Search Traceability</Button>
            </div>
            <div className="traceability-results">
              <p className="placeholder-text">
                Enter a batch or serial number to view complete traceability chain
              </p>
            </div>
          </div>
        )}
      </div>

      {showBatchForm && (
        <BatchForm
          batch={selectedBatch || undefined}
          products={products}
          onClose={() => {
            setShowBatchForm(false);
            setSelectedBatch(null);
          }}
          onSuccess={(batchData) => {
            handleCreateBatch(batchData);
            setShowBatchForm(false);
            setSelectedBatch(null);
          }}
        />
      )}

      {selectedBatch && !showBatchForm && (
        <BatchDetailsModal
          batch={selectedBatch}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {selectedSerial && !showSerialForm && (
        <SerialDetailsModal
          serial={selectedSerial}
          onClose={() => setSelectedSerial(null)}
        />
      )}

      {showSerialForm && (
        <SerialForm
          serial={selectedSerial ? {
            id: selectedSerial.id,
            name: selectedSerial.name,
            product_id: selectedSerial.product_id,
            lot_id: selectedSerial.lot_id,
            warranty_start_date: selectedSerial.warranty_start_date,
            warranty_end_date: selectedSerial.warranty_end_date,
            notes: '',
            state: selectedSerial.state,
          } : undefined}
          onClose={() => {
            setShowSerialForm(false);
            setSelectedSerial(null);
          }}
          onSave={() => {
            setShowSerialForm(false);
            setSelectedSerial(null);
            loadData();
          }}
        />
      )}
    </div>
  );
};

// Batch Form Component
interface BatchFormProps {
  batch?: BatchDetails;
  products: any[];
  onClose: () => void;
  onSuccess: (data: Partial<StockLot>) => void;
}

const BatchForm = ({ batch, products, onClose, onSuccess }: BatchFormProps) => {
  const [formData, setFormData] = useState({
    name: batch?.name || '',
    product_id: batch?.product_id?.toString() || '',
    ref: batch?.ref || '',
    manufacturing_date: (batch as any)?.manufacturing_date || '',
    expiry_date: (batch as any)?.expiry_date || '',
    note: batch?.note || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSuccess({
      name: formData.name,
      product_id: parseInt(formData.product_id),
      ref: formData.ref || undefined,
      note: formData.note || undefined,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{batch ? 'Edit Batch' : 'Create Batch'}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Batch Number *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label>Product *</label>
            <select
              value={formData.product_id}
              onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
              required
            >
              <option value="">Select Product</option>
              {products.map((prod, idx) => (
                <option key={prod.id || (prod as any)._id || idx} value={prod.id}>
                  {prod.name || prod.code}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Manufacturing Date</label>
              <input
                type="date"
                value={formData.manufacturing_date}
                onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Expiry Date</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Reference</label>
            <input
              type="text"
              value={formData.ref}
              onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit">{batch ? 'Update' : 'Create'} Batch</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Batch Details Modal
interface BatchDetailsModalProps {
  batch: BatchDetails;
  onClose: () => void;
}

const BatchDetailsModal = ({ batch, onClose }: BatchDetailsModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Batch Details: {batch.name}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <h4>Basic Information</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Product:</span>
                <span className="detail-value">{batch.product_name || batch.product_code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Total Quantity:</span>
                <span className="detail-value">{batch.quantity}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Available:</span>
                <span className="detail-value">{batch.available_quantity}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Reserved:</span>
                <span className="detail-value">{batch.reserved_quantity}</span>
              </div>
            </div>
          </div>
          {batch.locations && batch.locations.length > 0 && (
            <div className="detail-section">
              <h4>Locations</h4>
              <table>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Location</th>
                    <th>Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {batch.locations.map((loc, idx) => (
                    <tr key={idx}>
                      <td>{loc.warehouse_name}</td>
                      <td>{loc.location_name}</td>
                      <td>{loc.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Serial Details Modal
interface SerialDetailsModalProps {
  serial: SerialNumber;
  onClose: () => void;
}

const SerialDetailsModal = ({ serial, onClose }: SerialDetailsModalProps) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Serial Number: {serial.name}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="detail-section">
            <h4>Basic Information</h4>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Product:</span>
                <span className="detail-value">{serial.product_name || serial.product_code}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">State:</span>
                <span className="detail-value">{serial.state}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location:</span>
                <span className="detail-value">
                  {serial.warehouse_name && serial.location_name
                    ? `${serial.warehouse_name} / ${serial.location_name}`
                    : serial.warehouse_name || serial.location_name || '-'}
                </span>
              </div>
            </div>
          </div>
          {serial.transaction_history && serial.transaction_history.length > 0 && (
            <div className="detail-section">
              <h4>Transaction History</h4>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>From</th>
                    <th>To</th>
                  </tr>
                </thead>
                <tbody>
                  {serial.transaction_history.map((txn, idx) => (
                    <tr key={txn.id || (txn as any)._id || idx}>
                      <td>{new Date(txn.date).toLocaleString()}</td>
                      <td>{txn.transaction_type}</td>
                      <td>{txn.reference || `#${txn.transaction_id}`}</td>
                      <td>{txn.from_location || '-'}</td>
                      <td>{txn.to_location || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

