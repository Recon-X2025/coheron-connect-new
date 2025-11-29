import { useState, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { manufacturingService, type BOM } from '../../services/manufacturingService';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './BOMManagement.css';

export const BOMManagement = () => {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBOM, setSelectedBOM] = useState<BOM | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOM | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [bomFormData, setBomFormData] = useState({
    name: '',
    code: '',
    product_id: '',
    product_qty: '1',
    type: 'normal',
    active: true,
  });

  useEffect(() => {
    loadData();
    loadProducts();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await manufacturingService.getBOMs();
      setBoms(data);
    } catch (error) {
      console.error('Failed to load BOMs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await apiService.get<any>('/products');
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
    }
  };

  const handleViewDetails = async (bom: BOM) => {
    try {
      const fullBOM = await manufacturingService.getBOM(bom.id);
      setSelectedBOM(fullBOM);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load BOM details:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this BOM?')) {
      try {
        await manufacturingService.deleteBOM(id);
        await loadData();
        showToast('BOM deleted successfully', 'success');
      } catch (error) {
        showToast('Failed to delete BOM', 'error');
      }
    }
  };

  const handleCreateBOM = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const submitData = {
        ...bomFormData,
        product_id: parseInt(bomFormData.product_id),
        product_qty: parseFloat(bomFormData.product_qty),
      } as any;

      if (editingBOM?.id) {
        await manufacturingService.updateBOM(editingBOM.id, submitData);
        showToast('BOM updated successfully', 'success');
      } else {
        await manufacturingService.createBOM(submitData);
        showToast('BOM created successfully', 'success');
      }

      await loadData();
      setShowCreateModal(false);
      setEditingBOM(null);
      setBomFormData({
        name: '',
        code: '',
        product_id: '',
        product_qty: '1',
        type: 'normal',
        active: true,
      });
    } catch (error: any) {
      showToast(error.response?.data?.error || `Failed to ${editingBOM ? 'update' : 'create'} BOM`, 'error');
    }
  };

  const filteredBOMs = boms.filter((bom) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      bom.name?.toLowerCase().includes(searchLower) ||
      bom.code?.toLowerCase().includes(searchLower) ||
      bom.product_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="bom-management-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading BOMs..." />
        </div>
      </div>
    );
  }

  return (
    <div className="bom-management-page">
      <div className="container">
        <div className="bom-header">
          <div>
            <h1>Bill of Materials (BOM)</h1>
            <p className="bom-subtitle">{filteredBOMs.length} BOM(s) found</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>
            New BOM
          </Button>
        </div>

        <div className="bom-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search BOMs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="boms-table-container">
          <table className="boms-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Type</th>
                <th>Version</th>
                <th>Active</th>
                <th>Components</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBOMs.map((bom) => (
                <tr key={bom.id}>
                  <td><strong>{bom.code || '-'}</strong></td>
                  <td>{bom.name}</td>
                  <td>{bom.product_name || 'Unknown'}</td>
                  <td>{bom.product_qty}</td>
                  <td>
                    <span className="type-badge">{bom.type || 'normal'}</span>
                  </td>
                  <td>{bom.version || 1}</td>
                  <td>
                    <span className={`status-badge ${bom.active ? 'active' : 'inactive'}`}>
                      {bom.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>{bom.lines?.length || 0} components</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-btn"
                        onClick={() => handleViewDetails(bom)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button className="action-btn" title="Edit" onClick={() => {
                        setEditingBOM(bom);
                        setBomFormData({
                          name: bom.name || '',
                          code: bom.code || '',
                          product_id: bom.product_id?.toString() || '',
                          product_qty: bom.product_qty?.toString() || '1',
                          type: bom.type || 'normal',
                          active: bom.active !== false,
                        });
                        setShowCreateModal(true);
                      }}>
                        <Edit size={16} />
                      </button>
                      <button
                        className="action-btn danger"
                        onClick={() => handleDelete(bom.id)}
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

        {showDetailModal && selectedBOM && (
          <div className="bom-detail-modal" onClick={() => setShowDetailModal(false)}>
            <div className="bom-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="bom-detail-header">
                <div>
                  <h2>{selectedBOM.name}</h2>
                  <p className="bom-subtitle">{selectedBOM.code || 'No code'}</p>
                </div>
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>

              <div className="bom-detail-body">
                <div className="bom-info-section">
                  <h3>BOM Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Product:</strong> {selectedBOM.product_name || 'Unknown'}
                    </div>
                    <div className="info-item">
                      <strong>Quantity:</strong> {selectedBOM.product_qty}
                    </div>
                    <div className="info-item">
                      <strong>Type:</strong> {selectedBOM.type || 'normal'}
                    </div>
                    <div className="info-item">
                      <strong>Version:</strong> {selectedBOM.version || 1}
                    </div>
                    <div className="info-item">
                      <strong>Active:</strong>{' '}
                      <span className={`status-badge ${selectedBOM.active ? 'active' : 'inactive'}`}>
                        {selectedBOM.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bom-lines-section">
                  <h3>BOM Components ({selectedBOM.lines?.length || 0})</h3>
                  {selectedBOM.lines && selectedBOM.lines.length > 0 ? (
                    <table className="bom-lines-table">
                      <thead>
                        <tr>
                          <th>Sequence</th>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Type</th>
                          <th>Operation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBOM.lines.map((line) => (
                          <tr key={line.id}>
                            <td>{line.sequence || '-'}</td>
                            <td>
                              {line.product_name || `Product ID ${line.product_id}`}
                              {line.default_code && (
                                <span className="product-code"> ({line.default_code})</span>
                              )}
                            </td>
                            <td>{line.product_qty}</td>
                            <td>
                              <span className="type-badge">{line.type || 'normal'}</span>
                            </td>
                            <td>{line.operation_id || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>No components defined</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="bom-detail-modal" onClick={() => setShowCreateModal(false)}>
            <div className="bom-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="bom-detail-header">
                <h2>{editingBOM ? 'Edit BOM' : 'Create BOM'}</h2>
                <button onClick={() => {
                  setShowCreateModal(false);
                  setEditingBOM(null);
                  setBomFormData({
                    name: '',
                    code: '',
                    product_id: '',
                    product_qty: '1',
                    type: 'normal',
                    active: true,
                  });
                }}>×</button>
              </div>
              <form onSubmit={handleCreateBOM} className="create-bom-form">
                <div className="form-group">
                  <label>Name *</label>
                  <input
                    type="text"
                    required
                    value={bomFormData.name}
                    onChange={(e) => setBomFormData({ ...bomFormData, name: e.target.value })}
                    placeholder="BOM Name"
                  />
                </div>
                <div className="form-group">
                  <label>Code</label>
                  <input
                    type="text"
                    value={bomFormData.code}
                    onChange={(e) => setBomFormData({ ...bomFormData, code: e.target.value })}
                    placeholder="BOM Code (Optional)"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Product *</label>
                    <select
                      required
                      value={bomFormData.product_id}
                      onChange={(e) => setBomFormData({ ...bomFormData, product_id: e.target.value })}
                    >
                      <option value="">Select Product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Product Quantity *</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={bomFormData.product_qty}
                      onChange={(e) => setBomFormData({ ...bomFormData, product_qty: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={bomFormData.type}
                    onChange={(e) => setBomFormData({ ...bomFormData, type: e.target.value as any })}
                  >
                    <option value="normal">Normal</option>
                    <option value="phantom">Phantom</option>
                    <option value="subcontract">Subcontract</option>
                  </select>
                </div>
                <div className="form-actions">
                  <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingBOM ? 'Update BOM' : 'Create BOM'}</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BOMManagement;

