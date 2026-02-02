import React, { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const sCard: React.CSSProperties = { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24 };
const sBtn: React.CSSProperties = { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 };
const sDropZone = (dragging: boolean): React.CSSProperties => ({
  border: `2px dashed ${dragging ? '#00C971' : '#333'}`,
  borderRadius: 12,
  padding: 48,
  textAlign: 'center',
  cursor: 'pointer',
  background: dragging ? '#00C97108' : '#0a0a0a',
  transition: 'all 0.2s',
});

export const DocumentUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('authToken') || '';

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) { setFile(droppedFile); setResult(null); setError(''); }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setResult(null); setError(''); }
  };

  const extract = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_BASE}/api/ai/document-extract`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const fieldLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>
        <FileText size={28} style={{ marginRight: 10, verticalAlign: 'middle', color: '#00C971' }} />
        Document Intelligence
      </h1>

      <div style={sCard}>
        <div
          style={sDropZone(dragging)}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload size={32} style={{ color: '#888', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
            {file ? file.name : 'Drop invoice, PO, or receipt here'}
          </div>
          <div style={{ fontSize: 13, color: '#666' }}>PNG, JPG, PDF up to 10MB</div>
          <input id="file-input" type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>

        {file && (
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
            <button style={sBtn} onClick={extract} disabled={loading}>
              {loading ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite', marginRight: 6 }} /> Extracting...</> : 'Extract Data'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div style={{ ...sCard, marginTop: 16, borderColor: '#ef4444' }}>
          <AlertTriangle size={16} style={{ color: '#ef4444', marginRight: 8, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <div style={sCard}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>
              <CheckCircle size={16} style={{ color: '#00C971', marginRight: 6, verticalAlign: 'middle' }} />
              Extracted Fields
              <span style={{ fontSize: 12, color: '#888', fontWeight: 400, marginLeft: 8 }}>
                Confidence: {Math.round(result.confidence)}%
              </span>
            </h3>
            {result.structured_data && (
              <div style={{ display: 'grid', gap: 8 }}>
                {Object.entries(result.structured_data)
                  .filter(([k, v]) => v !== null && k !== '_extraction_method' && !Array.isArray(v))
                  .map(([key, value]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1a1a1a' }}>
                      <span style={{ fontSize: 13, color: '#888' }}>{fieldLabel(key)}</span>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{String(value)}</span>
                    </div>
                  ))}
              </div>
            )}
            {result.structured_data?.line_items && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Line Items</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
                      <th style={{ padding: 6, textAlign: 'left' }}>Description</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>Qty</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>Price</th>
                      <th style={{ padding: 6, textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.structured_data.line_items.map((item: any, i: number) => (
                      <tr key={i} style={{ borderBottom: '1px solid #1a1a1a' }}>
                        <td style={{ padding: 6 }}>{item.description}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{item.quantity}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{item.unit_price}</td>
                        <td style={{ padding: 6, textAlign: 'right' }}>{item.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={sCard}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Raw Text</h3>
            <pre style={{ background: '#0a0a0a', padding: 12, borderRadius: 8, fontSize: 12, maxHeight: 400, overflow: 'auto', color: '#888', whiteSpace: 'pre-wrap', margin: 0 }}>
              {result.extracted_text || 'No text extracted'}
            </pre>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default DocumentUploader;
