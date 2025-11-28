import { useState } from 'react';
import { X, Upload, Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import './CreateDocumentModal.css';

interface Signer {
  name: string;
  email: string;
  role: string;
  authentication_method: string;
  access_code?: string;
}

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  relatedRecordType?: string;
  relatedRecordId?: number;
}

export const CreateDocumentModal = ({
  isOpen,
  onClose,
  onSuccess,
  relatedRecordType,
  relatedRecordId,
}: CreateDocumentModalProps) => {
  const [step, setStep] = useState(1);
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('contract');
  const [file, setFile] = useState<File | null>(null);
  const [signers, setSigners] = useState<Signer[]>([
    { name: '', email: '', role: 'signer', authentication_method: 'email' },
  ]);
  const [expiresAt, setExpiresAt] = useState('');
  const [message, setMessage] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderFrequency, setReminderFrequency] = useState(3);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError('');
      if (!documentName) {
        setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const addSigner = () => {
    setSigners([
      ...signers,
      { name: '', email: '', role: 'signer', authentication_method: 'email' },
    ]);
  };

  const removeSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const validateStep1 = () => {
    if (!documentName.trim()) {
      setError('Document name is required');
      return false;
    }
    if (!file) {
      setError('Please upload a document file');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      if (!signer.name.trim()) {
        setError(`Signer ${i + 1}: Name is required`);
        return false;
      }
      if (!signer.email.trim() || !signer.email.includes('@')) {
        setError(`Signer ${i + 1}: Valid email is required`);
        return false;
      }
      if (signer.authentication_method === 'access_code' && !signer.access_code) {
        setError(`Signer ${i + 1}: Access code is required`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!file) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_name', documentName);
      formData.append('document_type', documentType);
      formData.append('signers', JSON.stringify(signers));
      formData.append('message', message);
      formData.append('reminder_enabled', reminderEnabled.toString());
      formData.append('reminder_frequency', reminderFrequency.toString());
      
      if (expiresAt) {
        formData.append('expires_at', new Date(expiresAt).toISOString());
      }
      
      if (relatedRecordType) {
        formData.append('related_record_type', relatedRecordType);
      }
      
      if (relatedRecordId) {
        formData.append('related_record_id', relatedRecordId.toString());
      }

      // Get current user ID (you may need to adjust this based on your auth system)
      const userId = 1; // TODO: Get from auth context
      formData.append('created_by', userId.toString());

      await apiService.getAxiosInstance().post('/esignature/documents', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onSuccess();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create document');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setDocumentName('');
    setFile(null);
    setSigners([{ name: '', email: '', role: 'signer', authentication_method: 'email' }]);
    setExpiresAt('');
    setMessage('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-document-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create E-Signature Document</h2>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {step === 1 && (
            <div className="step-content">
              <div className="form-group">
                <label>Document Name *</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  placeholder="Enter document name"
                />
              </div>

              <div className="form-group">
                <label>Document Type *</label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="contract">Contract</option>
                  <option value="agreement">Agreement</option>
                  <option value="invoice">Invoice</option>
                  <option value="policy">Policy</option>
                  <option value="nda">NDA</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label>Upload Document *</label>
                <div className="file-upload-area">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  <label htmlFor="file-upload" className="file-upload-label">
                    <Upload size={24} />
                    {file ? (
                      <span>{file.name}</span>
                    ) : (
                      <span>Click to upload or drag and drop<br />PDF, DOC, DOCX (max 10MB)</span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="step-content">
              <div className="form-group">
                <label>Signers *</label>
                {signers.map((signer, index) => (
                  <div key={index} className="signer-row">
                    <div className="signer-info">
                      <input
                        type="text"
                        placeholder="Name"
                        value={signer.name}
                        onChange={(e) => updateSigner(index, 'name', e.target.value)}
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={signer.email}
                        onChange={(e) => updateSigner(index, 'email', e.target.value)}
                      />
                      <select
                        value={signer.role}
                        onChange={(e) => updateSigner(index, 'role', e.target.value)}
                      >
                        <option value="signer">Signer</option>
                        <option value="witness">Witness</option>
                        <option value="notary">Notary</option>
                      </select>
                      <select
                        value={signer.authentication_method}
                        onChange={(e) => updateSigner(index, 'authentication_method', e.target.value)}
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="access_code">Access Code</option>
                      </select>
                      {signer.authentication_method === 'access_code' && (
                        <input
                          type="text"
                          placeholder="Access Code"
                          value={signer.access_code || ''}
                          onChange={(e) => updateSigner(index, 'access_code', e.target.value)}
                        />
                      )}
                    </div>
                    {signers.length > 1 && (
                      <button
                        type="button"
                        className="remove-signer-btn"
                        onClick={() => removeSigner(index)}
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" className="add-signer-btn" onClick={addSigner}>
                  <Plus size={16} />
                  Add Signer
                </button>
              </div>

              <div className="form-group">
                <label>Expiration Date (Optional)</label>
                <div className="date-input-wrapper">
                  <Calendar size={18} />
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Message to Signers (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a custom message for signers..."
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={reminderEnabled}
                    onChange={(e) => setReminderEnabled(e.target.checked)}
                  />
                  Enable Reminders
                </label>
                {reminderEnabled && (
                  <select
                    value={reminderFrequency}
                    onChange={(e) => setReminderFrequency(parseInt(e.target.value))}
                    className="reminder-frequency"
                  >
                    <option value={1}>Daily</option>
                    <option value={3}>Every 3 days</option>
                    <option value={7}>Weekly</option>
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="step-indicator">
            Step {step} of 2
          </div>
          <div className="modal-actions">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleNext} disabled={uploading}>
              {uploading ? 'Creating...' : step === 2 ? 'Create Document' : 'Next'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

