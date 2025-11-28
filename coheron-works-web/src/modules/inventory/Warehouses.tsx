import { useState, useEffect } from 'react';
import { Search, Plus, Warehouse, MapPin, User, Phone, Mail, Edit } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { inventoryService, type Warehouse as WarehouseType } from '../../services/inventoryService';
import { showToast } from '../../components/Toast';
import './Warehouses.css';

export const Warehouses = () => {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseType | null>(null);
  const [formData, setFormData] = useState<{
    code: string;
    name: string;
    warehouse_type: WarehouseType['warehouse_type'];
    address: string;
    city: string;
    state: string;
    country: string;
    zip_code: string;
    phone: string;
    email: string;
    manager_id: string;
    active: boolean;
    temperature_controlled: boolean;
    humidity_controlled: boolean;
    security_level: string;
    operating_hours: string;
    capacity_cubic_meters: string;
    notes: string;
  }>({
    code: '',
    name: '',
    warehouse_type: 'internal',
    address: '',
    city: '',
    state: '',
    country: '',
    zip_code: '',
    phone: '',
    email: '',
    manager_id: '',
    active: true,
    temperature_controlled: false,
    humidity_controlled: false,
    security_level: '',
    operating_hours: '',
    capacity_cubic_meters: '',
    notes: '',
  });

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await inventoryService.getWarehouses({ active: undefined });
      setWarehouses(data);
    } catch (error) {
      console.error('Failed to load warehouses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedWarehouse) {
        await inventoryService.updateWarehouse(selectedWarehouse.id, {
          ...formData,
          manager_id: formData.manager_id ? parseInt(formData.manager_id) : undefined,
          capacity_cubic_meters: formData.capacity_cubic_meters ? parseFloat(formData.capacity_cubic_meters) : undefined,
        });
      } else {
        await inventoryService.createWarehouse({
          ...formData,
          manager_id: formData.manager_id ? parseInt(formData.manager_id) : undefined,
          capacity_cubic_meters: formData.capacity_cubic_meters ? parseFloat(formData.capacity_cubic_meters) : undefined,
        });
      }
      setShowCreateModal(false);
      setSelectedWarehouse(null);
      resetForm();
      loadWarehouses();
    } catch (error) {
      console.error('Failed to save warehouse:', error);
      showToast('Failed to save warehouse. Please try again.', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      warehouse_type: 'internal',
      address: '',
      city: '',
      state: '',
      country: '',
      zip_code: '',
      phone: '',
      email: '',
      manager_id: '',
      active: true,
      temperature_controlled: false,
      humidity_controlled: false,
      security_level: '',
      operating_hours: '',
      capacity_cubic_meters: '',
      notes: '',
    });
  };

  const handleEdit = (warehouse: WarehouseType) => {
    setSelectedWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      warehouse_type: warehouse.warehouse_type,
      address: warehouse.address || '',
      city: warehouse.city || '',
      state: warehouse.state || '',
      country: warehouse.country || '',
      zip_code: warehouse.zip_code || '',
      phone: warehouse.phone || '',
      email: warehouse.email || '',
      manager_id: warehouse.manager_id?.toString() || '',
      active: warehouse.active,
      temperature_controlled: warehouse.temperature_controlled || false,
      humidity_controlled: warehouse.humidity_controlled || false,
      security_level: warehouse.security_level || '',
      operating_hours: warehouse.operating_hours || '',
      capacity_cubic_meters: warehouse.capacity_cubic_meters?.toString() || '',
      notes: warehouse.notes || '',
    });
    setShowCreateModal(true);
  };

  const filteredWarehouses = warehouses.filter((w) =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="warehouses-page">
      <div className="warehouses-header">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search warehouses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button icon={<Plus size={20} />} onClick={() => {
          resetForm();
          setSelectedWarehouse(null);
          setShowCreateModal(true);
        }}>
          New Warehouse
        </Button>
      </div>

      <div className="warehouses-grid">
        {filteredWarehouses.map((warehouse) => (
          <div key={warehouse.id} className="warehouse-card">
            <div className="warehouse-card-header">
              <div className="warehouse-icon">
                <Warehouse size={24} />
              </div>
              <div className="warehouse-info">
                <h3>{warehouse.name}</h3>
                <span className="warehouse-code">{warehouse.code}</span>
              </div>
              <div className="warehouse-actions">
                <button className="icon-button" onClick={() => handleEdit(warehouse)}>
                  <Edit size={18} />
                </button>
              </div>
            </div>

            <div className="warehouse-details">
              {warehouse.address && (
                <div className="detail-item">
                  <MapPin size={16} />
                  <span>{warehouse.address}, {warehouse.city}</span>
                </div>
              )}
              {warehouse.manager_name && (
                <div className="detail-item">
                  <User size={16} />
                  <span>{warehouse.manager_name}</span>
                </div>
              )}
              {warehouse.phone && (
                <div className="detail-item">
                  <Phone size={16} />
                  <span>{warehouse.phone}</span>
                </div>
              )}
              {warehouse.email && (
                <div className="detail-item">
                  <Mail size={16} />
                  <span>{warehouse.email}</span>
                </div>
              )}
            </div>

            <div className="warehouse-footer">
              <span className={`warehouse-type ${warehouse.warehouse_type}`}>
                {warehouse.warehouse_type}
              </span>
              <span className={`warehouse-status ${warehouse.active ? 'active' : 'inactive'}`}>
                {warehouse.active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateModal(false);
          setSelectedWarehouse(null);
          resetForm();
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{selectedWarehouse ? 'Edit Warehouse' : 'New Warehouse'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Code *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type *</label>
                  <select
                    value={formData.warehouse_type}
                    onChange={(e) => setFormData({ ...formData, warehouse_type: e.target.value as WarehouseType['warehouse_type'] })}
                    required
                  >
                    <option value="internal">Internal</option>
                    <option value="vendor">Vendor</option>
                    <option value="customer">Customer</option>
                    <option value="transit">Transit</option>
                    <option value="production">Production</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.active ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, active: e.target.value === 'active' })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <Button type="button" variant="secondary" onClick={() => {
                  setShowCreateModal(false);
                  setSelectedWarehouse(null);
                  resetForm();
                }}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedWarehouse ? 'Update' : 'Create'} Warehouse
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

