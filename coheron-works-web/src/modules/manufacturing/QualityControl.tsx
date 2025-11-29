import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  CheckCircle,
  AlertTriangle,
  Eye,
  FileText,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import {
  manufacturingService,
  type QualityInspection,
  type NonConformance,
  type ReworkOrder,
} from '../../services/manufacturingService';
import { showToast } from '../../components/Toast';
import { QualityInspectionForm } from './components/QualityInspectionForm';
import './QualityControl.css';

export const QualityControl = () => {
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [ncrList, setNCRList] = useState<NonConformance[]>([]);
  const [reworkOrders, setReworkOrders] = useState<ReworkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'inspections' | 'ncr' | 'rework'>('inspections');
  const [selectedInspection, setSelectedInspection] = useState<QualityInspection | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInspectionForm, setShowInspectionForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'inspections') {
        const data = await manufacturingService.getQualityInspections();
        setInspections(data);
      } else if (activeTab === 'ncr') {
        const data = await manufacturingService.getNCRs();
        setNCRList(data);
      } else if (activeTab === 'rework') {
        const data = await manufacturingService.getReworkOrders();
        setReworkOrders(data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (inspection: QualityInspection) => {
    try {
      const fullInspection = await manufacturingService.getQualityInspection(inspection.id);
      setSelectedInspection(fullInspection);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to load inspection details:', error);
    }
  };

  const handleCompleteInspection = async (id: number) => {
    const qtyPassed = prompt('Enter quantity passed:');
    const qtyFailed = prompt('Enter quantity failed:');
    if (qtyPassed && qtyFailed) {
      try {
        await manufacturingService.completeInspection(
          id,
          parseFloat(qtyPassed),
          parseFloat(qtyFailed)
        );
        await loadData();
        showToast('Inspection completed successfully', 'success');
      } catch (error: any) {
        showToast(error.response?.data?.error || 'Failed to complete inspection', 'error');
      }
    }
  };

  const getStateColor = (state?: string) => {
    const colors: Record<string, string> = {
      draft: '#64748b',
      in_progress: '#f59e0b',
      done: '#10b981',
      cancel: '#ef4444',
      open: '#ef4444',
      resolved: '#10b981',
      closed: '#64748b',
    };
    return colors[state || ''] || '#64748b';
  };

  const getSeverityColor = (severity?: string) => {
    const colors: Record<string, string> = {
      minor: '#f59e0b',
      major: '#ef4444',
      critical: '#991b1b',
    };
    return colors[severity || ''] || '#64748b';
  };

  const filteredInspections = inspections.filter((insp) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      insp.mo_name?.toLowerCase().includes(searchLower) ||
      insp.mo_number?.toLowerCase().includes(searchLower) ||
      insp.inspection_type?.toLowerCase().includes(searchLower)
    );
  });

  const filteredNCRs = ncrList.filter((ncr) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      ncr.ncr_number?.toLowerCase().includes(searchLower) ||
      ncr.mo_name?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="quality-control-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading quality data..." />
        </div>
      </div>
    );
  }

  return (
    <div className="quality-control-page">
      <div className="container">
        <div className="quality-header">
          <div>
            <h1>Quality Control</h1>
            <p className="quality-subtitle">Manage quality inspections and non-conformance</p>
          </div>
          <div className="header-tabs">
            <button
              className={activeTab === 'inspections' ? 'active' : ''}
              onClick={() => setActiveTab('inspections')}
            >
              <ClipboardCheck size={16} />
              Inspections ({inspections.length})
            </button>
            <button
              className={activeTab === 'ncr' ? 'active' : ''}
              onClick={() => setActiveTab('ncr')}
            >
              <AlertTriangle size={16} />
              NCR ({ncrList.length})
            </button>
            <button
              className={activeTab === 'rework' ? 'active' : ''}
              onClick={() => setActiveTab('rework')}
            >
              <FileText size={16} />
              Rework ({reworkOrders.length})
            </button>
          </div>
        </div>

        <div className="quality-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          {activeTab === 'inspections' && (
            <Button icon={<Plus size={20} />} onClick={() => setShowInspectionForm(true)}>New Inspection</Button>
          )}
        </div>

        {activeTab === 'inspections' && (
          <div className="inspections-table-container">
            <table className="inspections-table">
              <thead>
                <tr>
                  <th>MO Number</th>
                  <th>Type</th>
                  <th>Qty to Inspect</th>
                  <th>Qty Inspected</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>State</th>
                  <th>Inspector</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInspections.map((insp) => (
                  <tr key={insp.id} onClick={() => handleViewDetails(insp)}>
                    <td><strong>{insp.mo_number || insp.mo_name || '-'}</strong></td>
                    <td>
                      <span className="type-badge">{insp.inspection_type}</span>
                    </td>
                    <td>{insp.qty_to_inspect || 0}</td>
                    <td>{insp.qty_inspected || 0}</td>
                    <td className="passed">{insp.qty_passed || 0}</td>
                    <td className="failed">{insp.qty_failed || 0}</td>
                    <td>
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(insp.state)}20`,
                          color: getStateColor(insp.state),
                        }}
                      >
                        {insp.state || 'draft'}
                      </span>
                    </td>
                    <td>{insp.inspector_name || '-'}</td>
                    <td>
                      <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="action-btn"
                          onClick={() => handleViewDetails(insp)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {insp.state !== 'done' && (
                          <button
                            className="action-btn success"
                            onClick={() => handleCompleteInspection(insp.id)}
                            title="Complete"
                          >
                            <CheckCircle size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'ncr' && (
          <div className="ncr-table-container">
            <table className="ncr-table">
              <thead>
                <tr>
                  <th>NCR Number</th>
                  <th>MO Number</th>
                  <th>Product</th>
                  <th>Qty Non-Conforming</th>
                  <th>Severity</th>
                  <th>State</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNCRs.map((ncr) => (
                  <tr key={ncr.id}>
                    <td><strong>{ncr.ncr_number}</strong></td>
                    <td>{ncr.mo_number || ncr.mo_name || '-'}</td>
                    <td>{ncr.product_name || '-'}</td>
                    <td>{ncr.qty_non_conforming || 0}</td>
                    <td>
                      <span
                        className="severity-badge"
                        style={{
                          backgroundColor: `${getSeverityColor(ncr.severity)}20`,
                          color: getSeverityColor(ncr.severity),
                        }}
                      >
                        {ncr.severity || 'minor'}
                      </span>
                    </td>
                    <td>
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(ncr.state)}20`,
                          color: getStateColor(ncr.state),
                        }}
                      >
                        {ncr.state || 'open'}
                      </span>
                    </td>
                    <td>{ncr.assigned_to_name || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="View">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'rework' && (
          <div className="rework-table-container">
            <table className="rework-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>MO Number</th>
                  <th>NCR Number</th>
                  <th>Qty to Rework</th>
                  <th>State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reworkOrders.map((rw) => (
                  <tr key={rw.id}>
                    <td><strong>{rw.name}</strong></td>
                    <td>{rw.mo_number || rw.mo_name || '-'}</td>
                    <td>{rw.ncr_number || '-'}</td>
                    <td>{rw.qty_to_rework}</td>
                    <td>
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(rw.state)}20`,
                          color: getStateColor(rw.state),
                        }}
                      >
                        {rw.state || 'draft'}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="View">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showDetailModal && selectedInspection && (
          <div className="inspection-detail-modal" onClick={() => setShowDetailModal(false)}>
            <div className="inspection-detail-content" onClick={(e) => e.stopPropagation()}>
              <div className="inspection-detail-header">
                <div>
                  <h2>Inspection Details</h2>
                  <p className="inspection-subtitle">
                    {selectedInspection.mo_number || selectedInspection.mo_name}
                  </p>
                </div>
                <button onClick={() => setShowDetailModal(false)}>×</button>
              </div>

              <div className="inspection-detail-body">
                <div className="inspection-info-section">
                  <h3>Inspection Information</h3>
                  <div className="info-grid">
                    <div className="info-item">
                      <strong>Type:</strong> {selectedInspection.inspection_type}
                    </div>
                    <div className="info-item">
                      <strong>State:</strong>{' '}
                      <span
                        className="state-badge"
                        style={{
                          backgroundColor: `${getStateColor(selectedInspection.state)}20`,
                          color: getStateColor(selectedInspection.state),
                        }}
                      >
                        {selectedInspection.state}
                      </span>
                    </div>
                    <div className="info-item">
                      <strong>Qty to Inspect:</strong> {selectedInspection.qty_to_inspect || 0}
                    </div>
                    <div className="info-item">
                      <strong>Qty Inspected:</strong> {selectedInspection.qty_inspected || 0}
                    </div>
                    <div className="info-item">
                      <strong>Qty Passed:</strong>{' '}
                      <span className="passed">{selectedInspection.qty_passed || 0}</span>
                    </div>
                    <div className="info-item">
                      <strong>Qty Failed:</strong>{' '}
                      <span className="failed">{selectedInspection.qty_failed || 0}</span>
                    </div>
                    {selectedInspection.inspector_name && (
                      <div className="info-item">
                        <strong>Inspector:</strong> {selectedInspection.inspector_name}
                      </div>
                    )}
                    {selectedInspection.inspection_date && (
                      <div className="info-item">
                        <strong>Date:</strong>{' '}
                        {new Date(selectedInspection.inspection_date).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {selectedInspection.checklist && selectedInspection.checklist.length > 0 && (
                  <div className="checklist-section">
                    <h3>Checklist ({selectedInspection.checklist.length})</h3>
                    <table className="checklist-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Specification</th>
                          <th>Actual Value</th>
                          <th>Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedInspection.checklist.map((item) => (
                          <tr key={item.id}>
                            <td>{item.checklist_item}</td>
                            <td>{item.specification || '-'}</td>
                            <td>{item.actual_value || '-'}</td>
                            <td>
                              <span
                                className={`result-badge ${
                                  item.result === 'pass'
                                    ? 'pass'
                                    : item.result === 'fail'
                                    ? 'fail'
                                    : 'pending'
                                }`}
                              >
                                {item.result || 'pending'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showInspectionForm && (
          <QualityInspectionForm
            onClose={() => setShowInspectionForm(false)}
            onSave={() => {
              setShowInspectionForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};

export default QualityControl;

