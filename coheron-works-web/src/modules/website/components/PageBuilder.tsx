import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Save, Eye, X } from 'lucide-react';
import { Button } from '../../../components/Button';
import { showToast } from '../../../components/Toast';
import { apiService } from '../../../services/apiService';
import './PageBuilder.css';

interface Block {
  id: string;
  type: string;
  config: Record<string, any>;
}

export const PageBuilder = () => {
  const { pageId } = useParams<{ pageId: string }>();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    if (pageId) {
      apiService.get(`/website/pages/${pageId}`).then((data: any) => {
        const page = Array.isArray(data) ? data[0] : data;
        if (page?.blocks) {
          setBlocks(page.blocks);
        }
      }).catch((err) => {
        console.error('Failed to load page:', err);
        showToast('Failed to load page', 'error');
      });
    }
  }, [pageId]);

  const blockTypes = [
    { type: 'text', label: 'Text', icon: '📝' },
    { type: 'image', label: 'Image', icon: '🖼️' },
    { type: 'gallery', label: 'Gallery', icon: '🖼️' },
    { type: 'product', label: 'Product', icon: '📦' },
    { type: 'cta', label: 'Call to Action', icon: '🎯' },
    { type: 'form', label: 'Form', icon: '📋' },
    { type: 'video', label: 'Video', icon: '🎥' },
  ];

  const addBlock = (type: string) => {
    const newBlock: Block = {
      id: `block-${Date.now()}`,
      type,
      config: {},
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedBlock === id) {
      setSelectedBlock(null);
    }
  };

  const updateBlock = (id: string, config: Record<string, any>) => {
    setBlocks(
      blocks.map((b) => (b.id === id ? { ...b, config: { ...b.config, ...config } } : b))
    );
  };

  const handleSave = async () => {
    try {
      const pageData = {
        blocks: blocks,
        metadata: {
          saved_at: new Date().toISOString(),
        },
      };
      if (pageId) {
        await apiService.update(`/website/pages/${pageId}`, pageData);
      } else {
        await apiService.create('/website/pages/save', pageData);
      }
      showToast('Page saved successfully', 'success');
    } catch (error: any) {
      console.error('Failed to save page:', error);
      showToast(error?.message || 'Failed to save page', 'error');
    }
  };

  return (
    <div className="page-builder">
      <div className="page-builder-header">
        <h2>Page Builder</h2>
        <div className="page-builder-actions">
          <Button
            icon={<Eye size={18} />}
            onClick={() => setPreviewMode(!previewMode)}
            variant="secondary"
          >
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button icon={<Save size={18} />} onClick={handleSave}>Save Page</Button>
        </div>
      </div>

      <div className="page-builder-layout">
        {!previewMode && (
          <div className="page-builder-sidebar">
            <h3>Blocks</h3>
            <div className="block-types">
              {blockTypes.map((bt) => (
                <button
                  key={bt.type}
                  className="block-type-btn"
                  onClick={() => addBlock(bt.type)}
                >
                  <span className="block-icon">{bt.icon}</span>
                  <span>{bt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="page-builder-canvas">
          {blocks.length === 0 ? (
            <div className="empty-canvas">
              <p>Start building your page by adding blocks</p>
              <div className="block-types-inline">
                {blockTypes.map((bt) => (
                  <button
                    key={bt.type}
                    className="block-type-btn"
                    onClick={() => addBlock(bt.type)}
                  >
                    <span className="block-icon">{bt.icon}</span>
                    <span>{bt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            blocks.map((block, idx) => (
              <div
                key={block.id || (block as any)._id || idx}
                className={`page-block ${selectedBlock === block.id ? 'selected' : ''}`}
                onClick={() => setSelectedBlock(block.id)}
              >
                {!previewMode && (
                  <div className="block-header">
                    <span className="block-type-label">{block.type}</span>
                    <button
                      className="block-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBlock(block.id);
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                <div className="block-content">
                  {renderBlock(block, (config) => updateBlock(block.id, config))}
                </div>
              </div>
            ))
          )}
        </div>

        {!previewMode && selectedBlock && (
          <div className="page-builder-properties">
            <h3>Block Properties</h3>
            <BlockProperties
              block={blocks.find((b) => b.id === selectedBlock)!}
              onUpdate={(config) => updateBlock(selectedBlock, config)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const renderBlock = (block: Block, onUpdate: (config: Record<string, any>) => void) => {
  switch (block.type) {
    case 'text':
      return (
        <div className="block-text">
          <textarea
            value={block.config.content || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Enter text content..."
            rows={4}
          />
        </div>
      );
    case 'image':
      return (
        <div className="block-image">
          <input
            type="text"
            value={block.config.url || ''}
            onChange={(e) => onUpdate({ url: e.target.value })}
            placeholder="Image URL"
          />
          {block.config.url && <img src={block.config.url} alt={block.config.alt || ''} />}
        </div>
      );
    case 'product':
      return (
        <div className="block-product">
          <input
            type="number"
            value={block.config.productId || ''}
            onChange={(e) => onUpdate({ productId: e.target.value })}
            placeholder="Product ID"
          />
        </div>
      );
    default:
      return <div className="block-placeholder">{block.type} block</div>;
  }
};

const BlockProperties = ({
  block,
}: {
  block: Block;
  onUpdate?: (config: Record<string, any>) => void;
}) => {
  return (
    <div className="block-properties">
      <div className="property-group">
        <label>Block Type</label>
        <input type="text" value={block.type} disabled />
      </div>
      {/* Add more property fields based on block type */}
    </div>
  );
};

