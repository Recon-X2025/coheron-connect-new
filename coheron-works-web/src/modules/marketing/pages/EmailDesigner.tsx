import React, { useState } from 'react';
import { Plus, Send, Palette, Type, Image, MousePointer, Minus, Columns, Share2, Video, ShoppingBag, Timer, Trash2, ArrowUp, ArrowDown, Eye, ChevronRight } from 'lucide-react';

type BlockType = 'header' | 'text' | 'image' | 'button' | 'divider' | 'columns' | 'social' | 'video' | 'product_card' | 'countdown';

interface Block {
  id: string;
  type: BlockType;
  content: any;
  styles: any;
  order: number;
}

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string;
  blocks: Block[];
  global_styles: { font_family: string; primary_color: string; background_color: string; text_color: string; link_color: string; border_radius: number };
  is_published: boolean;
  open_rate: number;
  click_rate: number;
  usage_count: number;
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: React.ReactNode }[] = [
  { type: 'header', label: 'Header', icon: <Type size={18} /> },
  { type: 'text', label: 'Text', icon: <Type size={18} /> },
  { type: 'image', label: 'Image', icon: <Image size={18} /> },
  { type: 'button', label: 'Button', icon: <MousePointer size={18} /> },
  { type: 'divider', label: 'Divider', icon: <Minus size={18} /> },
  { type: 'columns', label: 'Columns', icon: <Columns size={18} /> },
  { type: 'social', label: 'Social Icons', icon: <Share2 size={18} /> },
  { type: 'video', label: 'Video', icon: <Video size={18} /> },
  { type: 'product_card', label: 'Product Card', icon: <ShoppingBag size={18} /> },
  { type: 'countdown', label: 'Countdown', icon: <Timer size={18} /> },
];

const STARTER_TEMPLATES = [
  { name: 'Minimal Newsletter', category: 'newsletter', blockCount: 4 },
  { name: 'Product Launch', category: 'promotional', blockCount: 5 },
  { name: 'Event Invitation', category: 'event', blockCount: 5 },
  { name: 'Welcome Email', category: 'automated', blockCount: 4 },
  { name: 'Order Confirmation', category: 'transactional', blockCount: 4 },
  { name: 'Weekly Digest', category: 'newsletter', blockCount: 4 },
  { name: 'Sale Announcement', category: 'promotional', blockCount: 4 },
  { name: 'Re-engagement', category: 'automated', blockCount: 3 },
];

const SAMPLE_TEMPLATES: EmailTemplate[] = [
  { id: '1', name: 'March Newsletter', category: 'newsletter', subject: 'March Updates', blocks: [
    { id: 'b1', type: 'header', content: { text: 'March Newsletter', level: 'h1' }, styles: { textAlign: 'center' }, order: 0 },
    { id: 'b2', type: 'divider', content: {}, styles: {}, order: 1 },
    { id: 'b3', type: 'text', content: { html: '<p>Welcome to our March edition...</p>' }, styles: {}, order: 2 },
    { id: 'b4', type: 'button', content: { text: 'Read More', url: '#' }, styles: { backgroundColor: '#00C971' }, order: 3 },
  ], global_styles: { font_family: 'Arial, sans-serif', primary_color: '#00C971', background_color: '#ffffff', text_color: '#333', link_color: '#00C971', border_radius: 4 }, is_published: true, open_rate: 42.3, click_rate: 12.1, usage_count: 3 },
  { id: '2', name: 'Product Launch', category: 'promotional', subject: 'Introducing V2', blocks: [], global_styles: { font_family: 'Arial, sans-serif', primary_color: '#00C971', background_color: '#ffffff', text_color: '#333', link_color: '#00C971', border_radius: 4 }, is_published: false, open_rate: 0, click_rate: 0, usage_count: 0 },
];

const defaultBlock = (type: BlockType, order: number): Block => {
  const id = `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  const defaults: Record<BlockType, any> = {
    header: { text: 'Heading', level: 'h1' },
    text: { html: '<p>Your text here...</p>' },
    image: { src: '', alt: 'Image' },
    button: { text: 'Click Here', url: '#' },
    divider: {},
    columns: { columns: [{ html: 'Column 1' }, { html: 'Column 2' }] },
    social: { links: { twitter: '#', linkedin: '#', facebook: '#' } },
    video: { url: '', thumbnail: '' },
    product_card: { name: 'Product', price: '$0', image: '' },
    countdown: { targetDate: '' },
  };
  return { id, type, content: defaults[type], styles: {}, order };
};

export const EmailDesigner: React.FC = () => {
  const [view, setView] = useState<'list' | 'editor' | 'starters'>('list');
  const [template, setTemplate] = useState<EmailTemplate | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const [showGlobalStyles, setShowGlobalStyles] = useState(false);

  const addBlock = (type: BlockType) => {
    if (!template) return;
    const block = defaultBlock(type, template.blocks.length);
    setTemplate({ ...template, blocks: [...template.blocks, block] });
  };

  const removeBlock = (id: string) => {
    if (!template) return;
    setTemplate({ ...template, blocks: template.blocks.filter(b => b.id !== id).map((b, i) => ({ ...b, order: i })) });
    if (selectedBlock?.id === id) setSelectedBlock(null);
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    if (!template) return;
    const idx = template.blocks.findIndex(b => b.id === id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === template.blocks.length - 1)) return;
    const blocks = [...template.blocks];
    [blocks[idx], blocks[idx + dir]] = [blocks[idx + dir], blocks[idx]];
    setTemplate({ ...template, blocks: blocks.map((b, i) => ({ ...b, order: i })) });
  };

  const renderBlock = (block: Block) => {
    const gs = template?.global_styles;
    switch (block.type) {
      case 'header': return <div style={{ fontSize: block.content.level === 'h1' ? 28 : 22, fontWeight: 700, textAlign: block.styles.textAlign || 'left', color: gs?.text_color, padding: '16px 0' }}>{block.content.text}</div>;
      case 'text': return <div style={{ color: gs?.text_color, lineHeight: 1.6, padding: '8px 0' }} dangerouslySetInnerHTML={{ __html: block.content.html }} />;
      case 'image': return <div style={{ textAlign: 'center', padding: '16px 0' }}>{block.content.src ? <img src={block.content.src} alt={block.content.alt} style={{ maxWidth: '100%', borderRadius: gs?.border_radius }} /> : <div style={{ background: '#e5e7eb', height: 200, borderRadius: gs?.border_radius, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><Image size={32} /></div>}</div>;
      case 'button': return <div style={{ textAlign: 'center', padding: '16px 0' }}><span style={{ display: 'inline-block', padding: '12px 32px', background: block.styles.backgroundColor || gs?.primary_color, color: '#fff', borderRadius: gs?.border_radius, fontWeight: 600, fontSize: 15 }}>{block.content.text}</span></div>;
      case 'divider': return <hr style={{ border: 'none', borderTop: '1px solid #e5e7eb', margin: '16px 0' }} />;
      case 'columns': return <div style={{ display: 'flex', gap: 16, padding: '16px 0' }}>{(block.content.columns || []).map((c: any, i: number) => <div key={i} style={{ flex: 1, padding: 16, background: '#f9fafb', borderRadius: gs?.border_radius, color: gs?.text_color }}>{c.html}</div>)}</div>;
      case 'social': return <div style={{ display: 'flex', justifyContent: 'center', gap: 16, padding: '16px 0' }}>{['Twitter', 'LinkedIn', 'Facebook'].map(s => <span key={s} style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: 20, fontSize: 13, color: '#666' }}>{s}</span>)}</div>;
      case 'product_card': return <div style={{ border: '1px solid #e5e7eb', borderRadius: gs?.border_radius, padding: 20, textAlign: 'center' }}><div style={{ background: '#f3f4f6', height: 120, borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><ShoppingBag size={24} /></div><div style={{ fontWeight: 600, color: gs?.text_color }}>{block.content.name}</div><div style={{ color: gs?.primary_color, fontWeight: 700, marginTop: 4 }}>{block.content.price}</div></div>;
      case 'countdown': return <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 24, fontWeight: 700, color: gs?.primary_color }}>00d : 00h : 00m : 00s</div>;
      case 'video': return <div style={{ textAlign: 'center', padding: '16px 0' }}><div style={{ background: '#f3f4f6', height: 200, borderRadius: gs?.border_radius, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}><Video size={32} /></div></div>;
      default: return null;
    }
  };

  if (view === 'starters') {
    return (
      <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 14 }}>Back</button>
          <ChevronRight size={14} color="#555" /><span style={{ color: '#00C971', fontWeight: 600 }}>Starter Templates</span>
        </div>
        <h2 style={{ margin: '0 0 24px' }}>Start from a Template</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {STARTER_TEMPLATES.map(t => (
            <div key={t.name} onClick={() => {
              setTemplate({ id: 'new', name: t.name, category: t.category, subject: '', blocks: [], global_styles: { font_family: 'Arial, sans-serif', primary_color: '#00C971', background_color: '#ffffff', text_color: '#333333', link_color: '#00C971', border_radius: 4 }, is_published: false, open_rate: 0, click_rate: 0, usage_count: 0 });
              setView('editor');
            }} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, cursor: 'pointer' }}>
              <div style={{ background: '#1a1a1a', height: 100, borderRadius: 8, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Palette size={24} color="#00C971" /></div>
              <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>{t.name}</h3>
              <span style={{ color: '#999', fontSize: 12 }}>{t.category} - {t.blockCount} blocks</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (view === 'editor' && template) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0a0a0a', color: '#fff' }}>
        {/* Block Palette */}
        <div style={{ width: 220, background: '#141414', borderRight: '1px solid #222', padding: 16, overflowY: 'auto' }}>
          <button onClick={() => { setView('list'); setSelectedBlock(null); }} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, marginBottom: 16 }}>&larr; Back</button>
          <h3 style={{ margin: '0 0 14px', fontSize: 13, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Blocks</h3>
          {BLOCK_TYPES.map(bt => (
            <div key={bt.type} onClick={() => addBlock(bt.type)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', marginBottom: 6, background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
              <span style={{ color: '#00C971' }}>{bt.icon}</span>{bt.label}
            </div>
          ))}
          <div style={{ marginTop: 20, borderTop: '1px solid #222', paddingTop: 16 }}>
            <button onClick={() => setShowGlobalStyles(!showGlobalStyles)} style={{ width: '100%', padding: '10px 12px', background: showGlobalStyles ? '#00C97122' : '#1a1a1a', border: '1px solid #333', borderRadius: 8, color: showGlobalStyles ? '#00C971' : '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Palette size={16} /> Global Styles
            </button>
          </div>
        </div>

        {/* Preview */}
        <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <input value={template.name} onChange={e => setTemplate({ ...template, name: e.target.value })} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 20, fontWeight: 700, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Eye size={14} /> Preview</button>
              <button style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><Send size={14} /> Test</button>
              <button style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Save</button>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <input placeholder="Subject line..." value={template.subject} onChange={e => setTemplate({ ...template, subject: e.target.value })}
              style={{ width: '100%', padding: '10px 14px', background: '#141414', border: '1px solid #222', borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box' }} />
          </div>
          {/* Email Preview */}
          <div style={{ maxWidth: 640, margin: '0 auto', background: template.global_styles.background_color, borderRadius: 8, padding: 32, fontFamily: template.global_styles.font_family }}>
            {template.blocks.length === 0 && (
              <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>
                <Plus size={32} /><p>Click a block type on the left to add content</p>
              </div>
            )}
            {template.blocks.map(block => (
              <div key={block.id} onClick={() => setSelectedBlock(block)}
                style={{ position: 'relative', border: selectedBlock?.id === block.id ? '2px solid #00C971' : '2px solid transparent', borderRadius: 4, padding: 4, margin: '4px 0', cursor: 'pointer' }}>
                {renderBlock(block)}
                {selectedBlock?.id === block.id && (
                  <div style={{ position: 'absolute', top: -12, right: 0, display: 'flex', gap: 4 }}>
                    <button onClick={e => { e.stopPropagation(); moveBlock(block.id, -1); }} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#333', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowUp size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); moveBlock(block.id, 1); }} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#333', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ArrowDown size={12} /></button>
                    <button onClick={e => { e.stopPropagation(); removeBlock(block.id); }} style={{ width: 24, height: 24, borderRadius: 4, border: 'none', background: '#ef4444', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={12} /></button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Config Panel */}
        {(selectedBlock || showGlobalStyles) && (
          <div style={{ width: 280, background: '#141414', borderLeft: '1px solid #222', padding: 20, overflowY: 'auto' }}>
            {showGlobalStyles ? (
              <>
                <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Global Styles</h3>
                {(['primary_color', 'background_color', 'text_color', 'link_color'] as const).map(key => (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>{key.replace(/_/g, ' ')}</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="color" value={template.global_styles[key]} onChange={e => setTemplate({ ...template, global_styles: { ...template.global_styles, [key]: e.target.value } })} style={{ width: 36, height: 36, border: 'none', borderRadius: 4, cursor: 'pointer' }} />
                      <input value={template.global_styles[key]} onChange={e => setTemplate({ ...template, global_styles: { ...template.global_styles, [key]: e.target.value } })}
                        style={{ flex: 1, padding: '6px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13 }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Font Family</label>
                  <select value={template.global_styles.font_family} onChange={e => setTemplate({ ...template, global_styles: { ...template.global_styles, font_family: e.target.value } })}
                    style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, boxSizing: 'border-box' }}>
                    <option value="Arial, sans-serif">Arial</option><option value="Georgia, serif">Georgia</option><option value="'Courier New', monospace">Courier</option><option value="Verdana, sans-serif">Verdana</option>
                  </select>
                </div>
              </>
            ) : selectedBlock && (
              <>
                <h3 style={{ margin: '0 0 16px', fontSize: 15 }}>Block Settings</h3>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#999' }}>Type: {BLOCK_TYPES.find(bt => bt.type === selectedBlock.type)?.label}</label>
                </div>
                {selectedBlock.type === 'header' && (
                  <input value={selectedBlock.content.text || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, text: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                    style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, marginBottom: 12, boxSizing: 'border-box' }} />
                )}
                {selectedBlock.type === 'text' && (
                  <textarea value={selectedBlock.content.html || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, html: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                    style={{ width: '100%', height: 120, padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, resize: 'vertical', marginBottom: 12, boxSizing: 'border-box' }} />
                )}
                {selectedBlock.type === 'button' && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Button Text</label>
                      <input value={selectedBlock.content.text || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, text: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                        style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>URL</label>
                      <input value={selectedBlock.content.url || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, url: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                        style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Color</label>
                      <input type="color" value={selectedBlock.styles.backgroundColor || '#00C971'} onChange={e => { const b = { ...selectedBlock, styles: { ...selectedBlock.styles, backgroundColor: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }} />
                    </div>
                  </>
                )}
                {selectedBlock.type === 'image' && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Image URL</label>
                    <input value={selectedBlock.content.src || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, src: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                      style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                  </div>
                )}
                {selectedBlock.type === 'product_card' && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Product Name</label>
                      <input value={selectedBlock.content.name || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, name: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                        style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, color: '#999', display: 'block', marginBottom: 4 }}>Price</label>
                      <input value={selectedBlock.content.price || ''} onChange={e => { const b = { ...selectedBlock, content: { ...selectedBlock.content, price: e.target.value } }; setSelectedBlock(b); setTemplate({ ...template, blocks: template.blocks.map(bl => bl.id === b.id ? b : bl) }); }}
                        style={{ width: '100%', padding: '8px 10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, color: '#fff', fontSize: 13, boxSizing: 'border-box' }} />
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // List view
  return (
    <div style={{ padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26 }}>Email Designer</h1>
          <p style={{ color: '#999', margin: '4px 0 0', fontSize: 14 }}>Build beautiful block-based email templates</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => setView('starters')} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #333', background: 'transparent', color: '#ccc', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Palette size={16} /> Starters</button>
          <button onClick={() => { setTemplate({ id: 'new', name: 'Untitled Template', category: 'newsletter', subject: '', blocks: [], global_styles: { font_family: 'Arial, sans-serif', primary_color: '#00C971', background_color: '#ffffff', text_color: '#333333', link_color: '#00C971', border_radius: 4 }, is_published: false, open_rate: 0, click_rate: 0, usage_count: 0 }); setView('editor'); }}
            style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#00C971', color: '#000', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={16} /> New Template</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {SAMPLE_TEMPLATES.map(t => (
          <div key={t.id} onClick={() => { setTemplate(t); setView('editor'); }} style={{ background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 20, cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#00C971')} onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}>
            <div style={{ background: '#1a1a1a', height: 140, borderRadius: 8, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Palette size={28} color="#555" /></div>
            <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>{t.name}</h3>
            <span style={{ color: '#999', fontSize: 12 }}>{t.category}</span>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, paddingTop: 12, borderTop: '1px solid #222' }}>
              <div><span style={{ color: '#999', fontSize: 11 }}>Opens</span><div style={{ fontWeight: 600, fontSize: 14, color: '#00C971' }}>{t.open_rate}%</div></div>
              <div><span style={{ color: '#999', fontSize: 11 }}>Clicks</span><div style={{ fontWeight: 600, fontSize: 14 }}>{t.click_rate}%</div></div>
              <div><span style={{ color: '#999', fontSize: 11 }}>Used</span><div style={{ fontWeight: 600, fontSize: 14 }}>{t.usage_count}x</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EmailDesigner;
