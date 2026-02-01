import { useState, useEffect } from 'react';
import {
  Type,
  Image,
  MousePointer2,
  Minus,
  Columns,
  Share2,
  Heading1,
  
  Plus,
  Trash2,
  Eye,
  Copy,
  Send,
  Save,
  ArrowLeft,
  X,
  
  Layout,
  Mail,
  Search,
  
  MoveUp,
  MoveDown,
} from 'lucide-react';

const API_BASE = '/api/marketing/email-builder';
const getToken = () => localStorage.getItem('token') || '';
const apiFetch = async (path: string, options?: RequestInit) => {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options?.headers || {}) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
};

interface EmailBlock {
  type: 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'spacer';
  content: Record<string, any>;
  styles: Record<string, any>;
  order: number;
}

interface Template {
  _id: string;
  name: string;
  subject: string;
  category: string;
  blocks: EmailBlock[];
  is_active: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

const BLOCK_TYPES: { type: EmailBlock['type']; label: string; icon: React.ReactNode }[] = [
  { type: 'header', label: 'Header', icon: <Heading1 size={18} /> },
  { type: 'text', label: 'Text', icon: <Type size={18} /> },
  { type: 'image', label: 'Image', icon: <Image size={18} /> },
  { type: 'button', label: 'Button', icon: <MousePointer2 size={18} /> },
  { type: 'divider', label: 'Divider', icon: <Minus size={18} /> },
  { type: 'columns', label: 'Columns', icon: <Columns size={18} /> },
  { type: 'social', label: 'Social', icon: <Share2 size={18} /> },
];

const defaultContent: Record<string, Record<string, any>> = {
  header: { text: 'Your Headline Here' },
  text: { text: 'Write your content here. Double-click to edit.' },
  image: { src: '', alt: 'Image' },
  button: { text: 'Click Here', url: '#' },
  divider: {},
  columns: { columns: [{ text: 'Column 1' }, { text: 'Column 2' }] },
  social: { links: [{ platform: 'Twitter', url: '#' }, { platform: 'LinkedIn', url: '#' }] },
  spacer: {},
};

const defaultStyles: Record<string, Record<string, any>> = {
  header: { fontSize: '28px', color: '#333', textAlign: 'center', background: 'transparent' },
  text: { fontSize: '16px', color: '#555' },
  image: { borderRadius: '0px' },
  button: { background: '#00C971', color: '#ffffff', borderRadius: '6px' },
  divider: { color: '#eeeeee' },
  columns: {},
  social: { color: '#555' },
  spacer: { height: '24px' },
};

type View = 'library' | 'editor';

export const EmailBuilder: React.FC = () => {
  const [view, setView] = useState<View>('library');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Editor state
  const [currentTemplate, setCurrentTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('');
  const [blocks, setBlocks] = useState<EmailBlock[]>([]);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState<number | null>(null);
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [showTestEmail, setShowTestEmail] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [draggedBlockType, setDraggedBlockType] = useState<EmailBlock['type'] | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      const data = await apiFetch(`/templates?${params}`);
      setTemplates(data.templates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); }, [searchTerm]);

  const openEditor = (template?: Template) => {
    if (template) {
      setCurrentTemplate(template);
      setTemplateName(template.name);
      setSubject(template.subject);
      setBlocks(template.blocks || []);
    } else {
      setCurrentTemplate(null);
      setTemplateName('Untitled Template');
      setSubject('');
      setBlocks([]);
    }
    setSelectedBlockIndex(null);
    setView('editor');
  };

  const handleSave = async () => {
    const payload = { name: templateName, subject, blocks, category: 'general' };
    try {
      if (currentTemplate) {
        const updated = await apiFetch(`/templates/${currentTemplate._id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setCurrentTemplate(updated);
      } else {
        const created = await apiFetch('/templates', { method: 'POST', body: JSON.stringify(payload) });
        setCurrentTemplate(created);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleClone = async (id: string) => {
    try {
      await apiFetch(`/templates/${id}/clone`, { method: 'POST' });
      loadTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    try {
      await apiFetch(`/templates/${id}`, { method: 'DELETE' });
      loadTemplates();
    } catch (e) {
      console.error(e);
    }
  };

  const handlePreview = async () => {
    if (!currentTemplate) return;
    try {
      const data = await apiFetch(`/templates/${currentTemplate._id}/preview`, { method: 'POST', body: JSON.stringify({ blocks }) });
      setPreviewHtml(data.html);
      setShowPreview(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendTest = async () => {
    if (!currentTemplate || !testEmail) return;
    try {
      await apiFetch(`/templates/${currentTemplate._id}/send-test`, { method: 'POST', body: JSON.stringify({ email: testEmail }) });
      setShowTestEmail(false);
      setTestEmail('');
    } catch (e) {
      console.error(e);
    }
  };

  const addBlock = (type: EmailBlock['type'], atIndex?: number) => {
    const newBlock: EmailBlock = {
      type,
      content: { ...defaultContent[type] },
      styles: { ...defaultStyles[type] },
      order: atIndex !== undefined ? atIndex : blocks.length,
    };
    const updated = [...blocks];
    if (atIndex !== undefined) {
      updated.splice(atIndex, 0, newBlock);
    } else {
      updated.push(newBlock);
    }
    setBlocks(updated.map((b, i) => ({ ...b, order: i })));
    setSelectedBlockIndex(atIndex !== undefined ? atIndex : updated.length - 1);
  };

  const removeBlock = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index).map((b, i) => ({ ...b, order: i }));
    setBlocks(updated);
    setSelectedBlockIndex(null);
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const updated = [...blocks];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setBlocks(updated.map((b, i) => ({ ...b, order: i })));
    setSelectedBlockIndex(newIndex);
  };

  const updateBlockContent = (index: number, content: Record<string, any>) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, content: { ...b.content, ...content } } : b));
  };

  const updateBlockStyles = (index: number, styles: Record<string, any>) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, styles: { ...b.styles, ...styles } } : b));
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedBlockType) {
      addBlock(draggedBlockType, dropIndex);
      setDraggedBlockType(null);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #333',
    background: '#1a1a1a', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, color: '#939393', marginBottom: 4, fontWeight: 500 };

  // ===== LIBRARY VIEW =====
  if (view === 'library') {
    return (
      <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Email Builder</h1>
            <p style={{ color: '#939393', margin: '4px 0 0', fontSize: 14 }}>Create and manage email templates with drag-and-drop</p>
          </div>
          <button onClick={() => openEditor()} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            <Plus size={16} /> New Template
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, background: '#141414', borderRadius: 8, padding: '10px 14px', border: '1px solid #222', maxWidth: 400 }}>
          <Search size={16} color="#939393" />
          <input placeholder="Search templates..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none' }} />
        </div>

        {loading ? (
          <div style={{ color: '#939393', textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : templates.length === 0 ? (
          <div style={{ background: '#141414', borderRadius: 12, padding: 60, textAlign: 'center', border: '1px solid #222' }}>
            <Mail size={48} color="#333" />
            <p style={{ color: '#939393', marginTop: 16 }}>No templates yet. Create your first email template.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {templates.map(tpl => (
              <div key={tpl._id} style={{ background: '#141414', borderRadius: 12, border: '1px solid #222', overflow: 'hidden' }}>
                <div style={{ height: 120, background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Layout size={32} color="#333" />
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{tpl.name}</div>
                  <div style={{ fontSize: 12, color: '#939393', marginTop: 4 }}>{tpl.subject || 'No subject'}</div>
                  <div style={{ fontSize: 11, color: '#555', marginTop: 6 }}>Updated {new Date(tpl.updated_at).toLocaleDateString()}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                    <button onClick={() => openEditor(tpl)} style={{ flex: 1, padding: '8px 0', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                    <button onClick={() => handleClone(tpl._id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', cursor: 'pointer' }}><Copy size={12} /></button>
                    <button onClick={() => handleDelete(tpl._id)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ===== EDITOR VIEW =====
  const selectedBlock = selectedBlockIndex !== null ? blocks[selectedBlockIndex] : null;

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
      {/* Left: Block Palette */}
      <div style={{ width: 200, background: '#111', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #222' }}>
          <button onClick={() => { setView('library'); loadTemplates(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#939393', cursor: 'pointer', fontSize: 13 }}>
            <ArrowLeft size={14} /> Back to Library
          </button>
        </div>
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#939393', textTransform: 'uppercase', marginBottom: 10 }}>Blocks</div>
          {BLOCK_TYPES.map(bt => (
            <div
              key={bt.type}
              draggable
              onDragStart={() => setDraggedBlockType(bt.type)}
              onDragEnd={() => setDraggedBlockType(null)}
              onClick={() => addBlock(bt.type)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, cursor: 'grab', marginBottom: 4, border: '1px solid #222',
                background: '#141414', transition: 'all 0.15s',
              }}
            >
              <span style={{ color: '#00C971' }}>{bt.icon}</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{bt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Center: Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', background: '#111', borderBottom: '1px solid #222' }}>
          <input value={templateName} onChange={e => setTemplateName(e.target.value)}
            style={{ background: 'none', border: 'none', color: '#fff', fontSize: 16, fontWeight: 600, outline: 'none', flex: 1 }} />
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}><Save size={14} /> Save</button>
          {currentTemplate && (
            <>
              <button onClick={handlePreview} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', fontSize: 13, cursor: 'pointer' }}><Eye size={14} /> Preview</button>
              <button onClick={() => setShowTestEmail(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', fontSize: 13, cursor: 'pointer' }}><Send size={14} /> Test</button>
            </>
          )}
        </div>

        {/* Subject line */}
        <div style={{ padding: '10px 20px', background: '#0d0d0d', borderBottom: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#939393', fontWeight: 500 }}>Subject:</span>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Enter email subject line..."
              style={{ flex: 1, background: 'none', border: 'none', color: '#fff', fontSize: 14, outline: 'none' }} />
          </div>
        </div>

        {/* Email canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24, display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: 600, background: '#fff', borderRadius: 8, minHeight: 400 }}>
            {blocks.length === 0 ? (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, 0)}
                style={{ padding: 60, textAlign: 'center', color: '#999' }}
              >
                <Layout size={40} color="#ccc" />
                <p style={{ marginTop: 12, fontSize: 14 }}>Drag blocks here or click from the palette</p>
              </div>
            ) : (
              blocks.map((block, index) => (
                <div key={index}>
                  {/* Drop zone */}
                  <div
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDrop(e, index)}
                    style={{ height: 4, background: draggedBlockType ? '#00C971' : 'transparent', transition: 'all 0.2s' }}
                  />
                  <div
                    onClick={() => setSelectedBlockIndex(index)}
                    style={{
                      position: 'relative', cursor: 'pointer',
                      outline: selectedBlockIndex === index ? '2px solid #00C971' : '1px solid transparent',
                      outlineOffset: -1,
                    }}
                  >
                    {/* Block render */}
                    {block.type === 'header' && (
                      <h1 style={{ margin: 0, padding: 20, fontSize: block.styles.fontSize || '28px', color: block.styles.color || '#333', textAlign: (block.styles.textAlign || 'center') as any, background: block.styles.background || 'transparent' }}>
                        {block.content.text}
                      </h1>
                    )}
                    {block.type === 'text' && (
                      <div style={{ padding: '16px 24px', fontSize: block.styles.fontSize || '16px', color: block.styles.color || '#555', lineHeight: 1.6 }}>
                        {block.content.text}
                      </div>
                    )}
                    {block.type === 'image' && (
                      <div style={{ textAlign: 'center', padding: 16 }}>
                        {block.content.src ? (
                          <img src={block.content.src} alt={block.content.alt} style={{ maxWidth: '100%', borderRadius: block.styles.borderRadius || 0 }} />
                        ) : (
                          <div style={{ padding: 40, background: '#f0f0f0', color: '#999' }}><Image size={32} /> <br />Drop image URL</div>
                        )}
                      </div>
                    )}
                    {block.type === 'button' && (
                      <div style={{ textAlign: 'center', padding: 16 }}>
                        <span style={{
                          display: 'inline-block', padding: '12px 32px',
                          background: block.styles.background || '#00C971',
                          color: block.styles.color || '#fff',
                          borderRadius: block.styles.borderRadius || '6px',
                          fontWeight: 600,
                        }}>{block.content.text}</span>
                      </div>
                    )}
                    {block.type === 'divider' && (
                      <hr style={{ border: 'none', borderTop: `1px solid ${block.styles.color || '#eee'}`, margin: '16px 24px' }} />
                    )}
                    {block.type === 'columns' && (
                      <div style={{ display: 'flex', padding: 16, gap: 16 }}>
                        {(block.content.columns || []).map((col: any, ci: number) => (
                          <div key={ci} style={{ flex: 1, padding: 12, background: '#f9f9f9', borderRadius: 4, fontSize: 14, color: '#555' }}>{col.text}</div>
                        ))}
                      </div>
                    )}
                    {block.type === 'social' && (
                      <div style={{ textAlign: 'center', padding: 16 }}>
                        {(block.content.links || []).map((l: any, li: number) => (
                          <span key={li} style={{ margin: '0 8px', color: block.styles.color || '#555', fontSize: 14 }}>{l.platform}</span>
                        ))}
                      </div>
                    )}

                    {/* Hover actions */}
                    {selectedBlockIndex === index && (
                      <div style={{ position: 'absolute', top: -12, right: 8, display: 'flex', gap: 2 }}>
                        <button onClick={e => { e.stopPropagation(); moveBlock(index, -1); }} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MoveUp size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); moveBlock(index, 1); }} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MoveDown size={12} /></button>
                        <button onClick={e => { e.stopPropagation(); removeBlock(index); }} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {/* Bottom drop zone */}
            {blocks.length > 0 && (
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDrop(e, blocks.length)}
                style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: 12 }}
              >
                {draggedBlockType ? 'Drop here' : ''}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right: Properties Panel */}
      <div style={{ width: 260, background: '#111', borderLeft: '1px solid #222', overflow: 'auto' }}>
        <div style={{ padding: 16, borderBottom: '1px solid #222' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#939393', textTransform: 'uppercase' }}>Properties</div>
        </div>
        {selectedBlock ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#00C971', textTransform: 'capitalize' }}>{selectedBlock.type} Block</div>

            {/* Content fields */}
            {(selectedBlock.type === 'header' || selectedBlock.type === 'text') && (
              <div>
                <label style={labelStyle}>Text</label>
                <textarea value={selectedBlock.content.text || ''} onChange={e => updateBlockContent(selectedBlockIndex!, { text: e.target.value })}
                  style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
              </div>
            )}
            {selectedBlock.type === 'image' && (
              <>
                <div><label style={labelStyle}>Image URL</label><input style={inputStyle} value={selectedBlock.content.src || ''} onChange={e => updateBlockContent(selectedBlockIndex!, { src: e.target.value })} /></div>
                <div><label style={labelStyle}>Alt Text</label><input style={inputStyle} value={selectedBlock.content.alt || ''} onChange={e => updateBlockContent(selectedBlockIndex!, { alt: e.target.value })} /></div>
              </>
            )}
            {selectedBlock.type === 'button' && (
              <>
                <div><label style={labelStyle}>Button Text</label><input style={inputStyle} value={selectedBlock.content.text || ''} onChange={e => updateBlockContent(selectedBlockIndex!, { text: e.target.value })} /></div>
                <div><label style={labelStyle}>URL</label><input style={inputStyle} value={selectedBlock.content.url || ''} onChange={e => updateBlockContent(selectedBlockIndex!, { url: e.target.value })} /></div>
              </>
            )}

            {/* Style fields */}
            <div style={{ borderTop: '1px solid #222', paddingTop: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#939393', textTransform: 'uppercase', marginBottom: 10 }}>Styles</div>
              {selectedBlock.type !== 'divider' && selectedBlock.type !== 'columns' && (
                <>
                  {(selectedBlock.type === 'header' || selectedBlock.type === 'text') && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Font Size</label>
                      <input style={inputStyle} value={selectedBlock.styles.fontSize || ''} onChange={e => updateBlockStyles(selectedBlockIndex!, { fontSize: e.target.value })} placeholder="16px" />
                    </div>
                  )}
                  <div style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>Color</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <input type="color" value={selectedBlock.styles.color || '#333333'} onChange={e => updateBlockStyles(selectedBlockIndex!, { color: e.target.value })}
                        style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                      <input style={inputStyle} value={selectedBlock.styles.color || ''} onChange={e => updateBlockStyles(selectedBlockIndex!, { color: e.target.value })} />
                    </div>
                  </div>
                  {selectedBlock.type === 'button' && (
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Background</label>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="color" value={selectedBlock.styles.background || '#00C971'} onChange={e => updateBlockStyles(selectedBlockIndex!, { background: e.target.value })}
                          style={{ width: 32, height: 32, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                        <input style={inputStyle} value={selectedBlock.styles.background || ''} onChange={e => updateBlockStyles(selectedBlockIndex!, { background: e.target.value })} />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: '#555', fontSize: 13 }}>Select a block to edit properties</div>
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, width: 660, maxHeight: '85vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f5f5f5', borderBottom: '1px solid #ddd' }}>
              <span style={{ fontWeight: 600, color: '#333' }}>Email Preview</span>
              <button onClick={() => setShowPreview(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} color="#666" /></button>
            </div>
            <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
          </div>
        </div>
      )}

      {/* Test Email Modal */}
      {showTestEmail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#141414', borderRadius: 12, padding: 24, width: 400, border: '1px solid #222' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700 }}>Send Test Email</h3>
            <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="recipient@example.com" style={inputStyle} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowTestEmail(false)} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: '#1a1a1a', color: '#ccc', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSendTest} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', fontWeight: 600, cursor: 'pointer' }}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailBuilder;
