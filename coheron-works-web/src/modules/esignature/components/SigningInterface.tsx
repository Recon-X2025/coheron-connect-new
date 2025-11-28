import { useState, useRef, useEffect } from 'react';
import { X, Check, RotateCcw, Type, Upload } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import './SigningInterface.css';

interface SigningInterfaceProps {
  documentId: number;
  signerId: number;
  signerEmail: string;
  documentName: string;
  onSignComplete: () => void;
  onClose: () => void;
}

type SignatureType = 'draw' | 'type' | 'upload';

export const SigningInterface = ({
  documentId,
  signerId,
  signerEmail,
  documentName,
  onSignComplete,
  onClose,
}: SigningInterfaceProps) => {
  const [signatureType, setSignatureType] = useState<SignatureType>('draw');
  const [typedSignature, setTypedSignature] = useState('');
  const [uploadedSignature, setUploadedSignature] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState('');
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasSignature(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadedSignature(reader.result as string);
        setHasSignature(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const getSignatureData = (): string => {
    if (signatureType === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas || !hasSignature) return '';
      return canvas.toDataURL('image/png');
    } else if (signatureType === 'type') {
      if (!typedSignature.trim()) return '';
      // Create a canvas with typed signature
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';
      canvas.width = 400;
      canvas.height = 100;
      ctx.font = '48px Arial';
      ctx.fillStyle = '#000';
      ctx.fillText(typedSignature, 10, 60);
      return canvas.toDataURL('image/png');
    } else if (signatureType === 'upload') {
      return uploadedSignature || '';
    }
    return '';
  };

  const handleSign = async () => {
    setError('');

    if (signatureType === 'draw' && !hasSignature) {
      setError('Please draw your signature');
      return;
    }
    if (signatureType === 'type' && !typedSignature.trim()) {
      setError('Please type your signature');
      return;
    }
    if (signatureType === 'upload' && !uploadedSignature) {
      setError('Please upload your signature');
      return;
    }

    setSigning(true);

    try {
      const signatureData = getSignatureData();
      
      await apiService.getAxiosInstance().post(`/esignature/documents/${documentId}/sign/${signerId}`, {
        signature_data: signatureData,
        signature_type: signatureType,
        access_code: accessCode || undefined,
        fields: [], // TODO: Add field values if needed
      });

      onSignComplete();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to sign document');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content signing-interface" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Sign Document</h2>
            <p className="document-name">{documentName}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <div className="signer-info">
            <p>Signing as: <strong>{signerEmail}</strong></p>
          </div>

          <div className="signature-type-selector">
            <button
              className={`type-btn ${signatureType === 'draw' ? 'active' : ''}`}
              onClick={() => setSignatureType('draw')}
            >
              <Check size={16} />
              Draw
            </button>
            <button
              className={`type-btn ${signatureType === 'type' ? 'active' : ''}`}
              onClick={() => setSignatureType('type')}
            >
              <Type size={16} />
              Type
            </button>
            <button
              className={`type-btn ${signatureType === 'upload' ? 'active' : ''}`}
              onClick={() => setSignatureType('upload')}
            >
              <Upload size={16} />
              Upload
            </button>
          </div>

          <div className="signature-area">
            {signatureType === 'draw' && (
              <div className="draw-signature">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={200}
                  className="signature-canvas"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <button className="clear-btn" onClick={clearSignature}>
                  <RotateCcw size={16} />
                  Clear
                </button>
              </div>
            )}

            {signatureType === 'type' && (
              <div className="type-signature">
                <input
                  type="text"
                  value={typedSignature}
                  onChange={(e) => setTypedSignature(e.target.value)}
                  placeholder="Type your name"
                  className="typed-signature-input"
                />
                <div className="typed-preview">
                  {typedSignature || 'Your signature will appear here'}
                </div>
              </div>
            )}

            {signatureType === 'upload' && (
              <div className="upload-signature">
                <input
                  type="file"
                  id="signature-upload"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="file-input"
                />
                <label htmlFor="signature-upload" className="upload-label">
                  <Upload size={24} />
                  {uploadedSignature ? (
                    <img src={uploadedSignature} alt="Signature" className="uploaded-signature-img" />
                  ) : (
                    <span>Click to upload signature image</span>
                  )}
                </label>
              </div>
            )}
          </div>

          <div className="access-code-section">
            <label>Access Code (if required)</label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Enter access code"
            />
          </div>

          <div className="signing-note">
            <p>By signing this document, you acknowledge that you have read and agree to the terms.</p>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSign} disabled={signing || !hasSignature}>
            {signing ? 'Signing...' : 'Sign Document'}
          </Button>
        </div>
      </div>
    </div>
  );
};

