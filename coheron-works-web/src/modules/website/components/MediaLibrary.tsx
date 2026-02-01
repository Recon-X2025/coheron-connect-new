import { useState, useEffect } from 'react';
import { Upload, Search, Grid, List, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { showToast } from '../../../components/Toast';
import './MediaLibrary.css';

interface MediaItem {
  id: number;
  name: string;
  file_url: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  alt_text?: string;
  created_at: string;
}

export const MediaLibrary = () => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedMedia, setSelectedMedia] = useState<number | null>(null);

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/website/media');
      if (response.ok) {
        const data = await response.json();
        setMedia(data);
      }
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // In a real implementation, you would upload the file to a storage service
    // and then create the media record via API
    showToast('File upload functionality will be available soon', 'info');
  };

  const filteredMedia = media.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading media library..." />;
  }

  return (
    <div className="media-library">
      <div className="media-library-header">
        <h2>Media Library</h2>
        <div className="media-library-actions">
          <label className="upload-btn">
            <Upload size={18} />
            Upload Media
            <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
          </label>
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
            >
              <Grid size={18} />
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="media-library-search">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search media..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className={`media-library-content ${viewMode}`}>
        {filteredMedia.length === 0 ? (
          <div className="empty-media">
            <ImageIcon size={48} />
            <p>No media files found</p>
            <Button icon={<Upload size={18} />}>Upload Your First File</Button>
          </div>
        ) : (
          filteredMedia.map((item, idx) => (
            <div
              key={item.id || (item as any)._id || idx}
              className={`media-item ${selectedMedia === item.id ? 'selected' : ''}`}
              onClick={() => setSelectedMedia(item.id)}
            >
              {item.mime_type?.startsWith('image/') ? (
                <img src={item.file_url} alt={item.alt_text || item.name} />
              ) : (
                <div className="media-placeholder">
                  <ImageIcon size={32} />
                  <span>{item.mime_type}</span>
                </div>
              )}
              <div className="media-info">
                <p className="media-name">{item.name}</p>
                <p className="media-meta">
                  {item.width && item.height && `${item.width} × ${item.height}`}
                  {item.file_size && ` • ${(item.file_size / 1024).toFixed(1)} KB`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedMedia && (
        <div className="media-details-panel">
          <div className="panel-header">
            <h3>Media Details</h3>
            <button onClick={() => setSelectedMedia(null)}>
              <X size={18} />
            </button>
          </div>
          <div className="panel-content">
            {(() => {
              const item = media.find((m) => m.id === selectedMedia);
              if (!item) return null;
              return (
                <>
                  <div className="detail-group">
                    <label>Name</label>
                    <input type="text" value={item.name} readOnly />
                  </div>
                  <div className="detail-group">
                    <label>URL</label>
                    <input type="text" value={item.file_url} readOnly />
                  </div>
                  <div className="detail-group">
                    <label>Alt Text</label>
                    <input type="text" value={item.alt_text || ''} placeholder="Add alt text" />
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

