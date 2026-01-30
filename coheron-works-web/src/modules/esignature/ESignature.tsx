import { useState, useEffect } from 'react';
import { Plus, FileText, Send, CheckCircle, XCircle, Clock, Eye, Download } from 'lucide-react';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import { CreateDocumentModal } from './components/CreateDocumentModal';
import { SigningInterface } from './components/SigningInterface';
import { useAuth } from '../../contexts/AuthContext';
import './ESignature.css';

interface ESignDocument {
  id: number;
  document_name: string;
  document_type: string;
  status: string;
  total_signers: number;
  signed_count: number;
  created_at: string;
  expires_at?: string;
  completed_at?: string;
  created_by_name?: string;
}

export const ESignature = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<ESignDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<ESignDocument | null>(null);
  const [showSigningInterface, setShowSigningInterface] = useState(false);
  const [signerInfo, setSignerInfo] = useState<{ signerId: number; signerEmail: string } | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data: any = await apiService.get('/esignature/documents', params);
      const flattened: ESignDocument[] = Array.isArray(data) && data.length > 0 && Array.isArray(data[0]) 
        ? data[0] 
        : (Array.isArray(data) ? data : []);
      setDocuments(flattened);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} className="status-icon completed" />;
      case 'declined': return <XCircle size={16} className="status-icon declined" />;
      case 'expired': return <XCircle size={16} className="status-icon expired" />;
      case 'in_progress': return <Clock size={16} className="status-icon in-progress" />;
      case 'sent': return <Send size={16} className="status-icon sent" />;
      default: return <FileText size={16} className="status-icon draft" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'var(--success)';
      case 'declined': return 'var(--danger)';
      case 'expired': return 'var(--danger)';
      case 'in_progress': return 'var(--primary)';
      case 'sent': return 'var(--primary)';
      default: return 'var(--text-muted)';
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="esignature-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading documents..." />
        </div>
      </div>
    );
  }

  return (
    <div className="esignature-page">
      <div className="container">
        <div className="esignature-header">
          <div>
            <h1>E-Signature Documents</h1>
            <p className="esignature-subtitle">Manage and track document signing workflows</p>
          </div>
          <Button icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>
            New Document
          </Button>
        </div>

        <div className="esignature-filters">
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="status-filter"
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="declined">Declined</option>
            <option value="expired">Expired</option>
          </select>
        </div>

        <div className="esignature-stats">
          <Card className="stat-card">
            <div className="stat-value">{documents.length}</div>
            <div className="stat-label">Total Documents</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value">
              {documents.filter(d => d.status === 'completed').length}
            </div>
            <div className="stat-label">Completed</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value">
              {documents.filter(d => d.status === 'in_progress' || d.status === 'sent').length}
            </div>
            <div className="stat-label">In Progress</div>
          </Card>
          <Card className="stat-card">
            <div className="stat-value">
              {documents.filter(d => d.status === 'pending' || d.status === 'draft').length}
            </div>
            <div className="stat-label">Pending</div>
          </Card>
        </div>

        <div className="esignature-documents-grid">
          {filteredDocuments.map((document) => (
            <Card key={document.id} className="document-card" hover>
              <div className="document-card-header">
                <div className="document-icon">
                  <FileText size={24} />
                </div>
                <span
                  className="status-badge"
                  style={{ color: getStatusColor(document.status) }}
                >
                  {getStatusIcon(document.status)}
                  {document.status.replace('_', ' ')}
                </span>
              </div>
              <div className="document-card-body">
                <h3>{document.document_name}</h3>
                <p className="document-type">{document.document_type}</p>
                <div className="document-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${(document.signed_count / document.total_signers) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="progress-text">
                    {document.signed_count} of {document.total_signers} signed
                  </span>
                </div>
                {document.expires_at && (
                  <div className="document-expiry">
                    <Clock size={14} />
                    <span>Expires: {new Date(document.expires_at).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
              <div className="document-card-footer">
                <button
                  className="action-btn"
                  onClick={() => {
                    // Load document details and check if current user is a signer
                    loadDocumentDetails(document.id);
                  }}
                >
                  <Eye size={16} />
                  View
                </button>
                {document.status === 'completed' && (
                  <button className="action-btn">
                    <Download size={16} />
                    Download
                  </button>
                )}
                {(document.status === 'sent' || document.status === 'in_progress') && (
                  <button
                    className="action-btn"
                    onClick={() => {
                      // Check if user can sign
                      checkSigningAccess(document.id);
                    }}
                  >
                    <CheckCircle size={16} />
                    Sign
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="empty-state">
            <FileText size={48} />
            <h3>No documents found</h3>
            <p>Create your first e-signature document to get started</p>
            <Button icon={<Plus size={20} />} onClick={() => setShowCreateModal(true)}>
              Create Document
            </Button>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateDocumentModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadDocuments();
          }}
        />
      )}

      {showSigningInterface && signerInfo && selectedDocument && (
        <SigningInterface
          documentId={selectedDocument.id}
          signerId={signerInfo.signerId}
          signerEmail={signerInfo.signerEmail}
          documentName={selectedDocument.document_name}
          onSignComplete={() => {
            setShowSigningInterface(false);
            setSelectedDocument(null);
            setSignerInfo(null);
            loadDocuments();
          }}
          onClose={() => {
            setShowSigningInterface(false);
            setSelectedDocument(null);
            setSignerInfo(null);
          }}
        />
      )}
    </div>
  );

  async function loadDocumentDetails(documentId: number) {
    try {
      const doc = await apiService.get(`/esignature/documents/${documentId}`) as any;
      if (Array.isArray(doc)) {
        setSelectedDocument(doc[0] || null);
      } else {
        setSelectedDocument(doc);
      }
      // TODO: Open document viewer modal
    } catch (error) {
      console.error('Error loading document:', error);
    }
  }

  async function checkSigningAccess(documentId: number) {
    try {
      const doc = await apiService.get(`/esignature/documents/${documentId}`) as any;
      const docData = Array.isArray(doc) ? doc[0] : doc;
      // Find pending signer for current user
      const currentUserEmail = user?.email || '';
      
      const signers = docData?.signers || [];
      const pendingSigner = signers.find(
        (s: any) => s.signer_email === currentUserEmail && s.status === 'sent'
      );

      if (pendingSigner) {
        setSelectedDocument(docData);
        setSignerInfo({
          signerId: pendingSigner.id,
          signerEmail: pendingSigner.signer_email,
        });
        setShowSigningInterface(true);
      } else {
        showToast('You are not authorized to sign this document or it has already been signed.', 'error');
      }
    } catch (error) {
      console.error('Error checking signing access:', error);
    }
  }
};

