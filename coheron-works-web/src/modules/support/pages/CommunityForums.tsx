import { useState, useEffect } from 'react';
import {
  MessageCircle, Plus, Search, Pin, Lock, CheckCircle, ThumbsUp, ThumbsDown,
  Eye, ChevronLeft, Tag, Hash,
} from 'lucide-react';

const TOKEN = localStorage.getItem('authToken') || '';
const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` };
const apiFetch = (url: string, opts?: any) => fetch(url, { headers, ...opts });

interface Category { _id: string; name: string; description: string; slug: string; icon: string; sort_order: number; is_active: boolean; thread_count: number; reply_count: number; }
interface Thread { _id: string; category_id: string; title: string; body: string; author_id: any; is_pinned: boolean; is_locked: boolean; is_solved: boolean; views: number; reply_count: number; last_reply_at: string; tags: string[]; status: string; created_at: string; }
interface Reply { _id: string; body: string; author_id: any; is_solution: boolean; upvotes: number; downvotes: number; parent_reply_id?: string; status: string; created_at: string; }
interface Stats { categories: number; threads: number; replies: number; solved_threads: number; solve_rate: number; }

type View = 'categories' | 'threads' | 'thread';

export const CommunityForums: React.FC = () => {
  const [view, setView] = useState<View>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [stats, setStats] = useState<Stats>({ categories: 0, threads: 0, replies: 0, solved_threads: 0, solve_rate: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewThread, setShowNewThread] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newThread, setNewThread] = useState({ title: '', body: '', tags: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '', slug: '', icon: '' });
  const [newReply, setNewReply] = useState('');

  useEffect(() => { loadCategories(); loadStats(); }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/support/forums/categories');
      if (res.ok) setCategories(await res.json());
    } catch {}
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const res = await apiFetch('/api/support/forums/stats');
      if (res.ok) setStats(await res.json());
    } catch {}
  };

  const loadThreads = async (catId: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/support/forums/threads?category_id=${catId}`);
      if (res.ok) { const d = await res.json(); setThreads(d.threads || []); }
    } catch {}
    setLoading(false);
  };

  const loadThread = async (threadId: string) => {
    setLoading(true);
    try {
      const [tRes, rRes] = await Promise.all([
        apiFetch(`/api/support/forums/threads/${threadId}`),
        apiFetch(`/api/support/forums/threads/${threadId}/replies`),
      ]);
      if (tRes.ok) setSelectedThread(await tRes.json());
      if (rRes.ok) setReplies(await rRes.json());
    } catch {}
    setLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/api/support/forums/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) { const d = await res.json(); setThreads(d.threads || []); setView('threads'); setSelectedCategory(null); }
    } catch {}
    setLoading(false);
  };

  const createCategory = async () => {
    try {
      const res = await apiFetch('/api/support/forums/categories', { method: 'POST', body: JSON.stringify(newCategory) });
      if (res.ok) { setShowNewCategory(false); setNewCategory({ name: '', description: '', slug: '', icon: '' }); loadCategories(); }
    } catch {}
  };

  const createThread = async () => {
    if (!selectedCategory) return;
    try {
      const body = { ...newThread, category_id: selectedCategory._id, tags: newThread.tags.split(',').map(t => t.trim()).filter(Boolean) };
      const res = await apiFetch('/api/support/forums/threads', { method: 'POST', body: JSON.stringify(body) });
      if (res.ok) { setShowNewThread(false); setNewThread({ title: '', body: '', tags: '' }); loadThreads(selectedCategory._id); }
    } catch {}
  };

  const postReply = async () => {
    if (!selectedThread || !newReply.trim()) return;
    try {
      const res = await apiFetch(`/api/support/forums/threads/${selectedThread._id}/replies`, { method: 'POST', body: JSON.stringify({ body: newReply }) });
      if (res.ok) { setNewReply(''); loadThread(selectedThread._id); }
    } catch {}
  };

  const voteReply = async (replyId: string, direction: 'up' | 'down') => {
    try {
      await apiFetch(`/api/support/forums/replies/${replyId}/vote`, { method: 'POST', body: JSON.stringify({ direction }) });
      if (selectedThread) loadThread(selectedThread._id);
    } catch {}
  };

  const markSolution = async (replyId: string) => {
    if (!selectedThread) return;
    try {
      await apiFetch(`/api/support/forums/threads/${selectedThread._id}/solve`, { method: 'POST', body: JSON.stringify({ reply_id: replyId }) });
      loadThread(selectedThread._id);
    } catch {}
  };

  const openCategory = (cat: Category) => { setSelectedCategory(cat); setView('threads'); loadThreads(cat._id); };
  const openThread = (t: Thread) => { setSelectedThread(t); setView('thread'); loadThread(t._id); };
  const goBack = () => {
    if (view === 'thread') { setView('threads'); setSelectedThread(null); if (selectedCategory) loadThreads(selectedCategory._id); }
    else { setView('categories'); setSelectedCategory(null); }
  };

  const S = {
    page: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', padding: 24 } as React.CSSProperties,
    card: { background: '#141414', border: '1px solid #222', borderRadius: 8, padding: 16, marginBottom: 12, cursor: 'pointer', transition: 'border-color 0.2s' } as React.CSSProperties,
    input: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%' } as React.CSSProperties,
    btn: { background: '#1e1e1e', border: '1px solid #333', color: '#fff', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    btnPrimary: { background: '#00C971', border: '1px solid #00C971', color: '#000', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
    badge: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 12, padding: '2px 8px', fontSize: 11, color: '#939393' } as React.CSSProperties,
    statBox: { background: '#1a1a1a', borderRadius: 8, padding: 16, textAlign: 'center' as const, flex: 1 },
    textarea: { background: '#1a1a1a', border: '1px solid #333', color: '#fff', padding: '8px 12px', borderRadius: 6, fontSize: 13, outline: 'none', width: '100%', minHeight: 80, resize: 'vertical' as const },
  };

  if (loading && categories.length === 0) return <div style={S.page}><div style={{ textAlign: 'center', padding: 60, color: '#939393' }}>Loading...</div></div>;

  return (
    <div style={S.page}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {view !== 'categories' && <button style={S.btn} onClick={goBack}><ChevronLeft size={16} /> Back</button>}
          <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <MessageCircle size={24} /> Community Forums
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <input style={{ ...S.input, width: 200 }} placeholder="Search threads..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button style={S.btn} onClick={handleSearch}><Search size={14} /></button>
          </div>
          {view === 'categories' && <button style={S.btnPrimary} onClick={() => setShowNewCategory(true)}><Plus size={14} /> New Category</button>}
          {view === 'threads' && <button style={S.btnPrimary} onClick={() => setShowNewThread(true)}><Plus size={14} /> New Thread</button>}
        </div>
      </div>

      {/* Stats */}
      {view === 'categories' && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <div style={S.statBox}><div style={{ fontSize: 24, fontWeight: 700, color: '#00C971' }}>{stats.categories}</div><div style={{ fontSize: 12, color: '#939393' }}>Categories</div></div>
          <div style={S.statBox}><div style={{ fontSize: 24, fontWeight: 700, color: '#2196f3' }}>{stats.threads}</div><div style={{ fontSize: 12, color: '#939393' }}>Threads</div></div>
          <div style={S.statBox}><div style={{ fontSize: 24, fontWeight: 700, color: '#ff9800' }}>{stats.replies}</div><div style={{ fontSize: 12, color: '#939393' }}>Replies</div></div>
          <div style={S.statBox}><div style={{ fontSize: 24, fontWeight: 700 }}>{stats.solve_rate}%</div><div style={{ fontSize: 12, color: '#939393' }}>Solved Rate</div></div>
        </div>
      )}

      {/* New Category Modal */}
      {showNewCategory && (
        <div style={{ ...S.card, cursor: 'default', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>New Category</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <input style={S.input} placeholder="Name" value={newCategory.name} onChange={e => setNewCategory({ ...newCategory, name: e.target.value })} />
            <input style={S.input} placeholder="Slug" value={newCategory.slug} onChange={e => setNewCategory({ ...newCategory, slug: e.target.value })} />
          </div>
          <input style={{ ...S.input, marginBottom: 12 }} placeholder="Description" value={newCategory.description} onChange={e => setNewCategory({ ...newCategory, description: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnPrimary} onClick={createCategory}>Create</button>
            <button style={S.btn} onClick={() => setShowNewCategory(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* New Thread Modal */}
      {showNewThread && (
        <div style={{ ...S.card, cursor: 'default', marginBottom: 20 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 15 }}>New Thread in {selectedCategory?.name}</h3>
          <input style={{ ...S.input, marginBottom: 12 }} placeholder="Title" value={newThread.title} onChange={e => setNewThread({ ...newThread, title: e.target.value })} />
          <textarea style={{ ...S.textarea, marginBottom: 12 }} placeholder="Body (markdown supported)" value={newThread.body} onChange={e => setNewThread({ ...newThread, body: e.target.value })} />
          <input style={{ ...S.input, marginBottom: 12 }} placeholder="Tags (comma-separated)" value={newThread.tags} onChange={e => setNewThread({ ...newThread, tags: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btnPrimary} onClick={createThread}>Post Thread</button>
            <button style={S.btn} onClick={() => setShowNewThread(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Categories View */}
      {view === 'categories' && categories.map(cat => (
        <div key={cat._id} style={S.card} onClick={() => openCategory(cat)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Hash size={16} style={{ color: '#00C971' }} /> {cat.name}
              </div>
              <div style={{ fontSize: 13, color: '#939393' }}>{cat.description}</div>
            </div>
            <div style={{ display: 'flex', gap: 16, textAlign: 'center' }}>
              <div><div style={{ fontWeight: 600 }}>{cat.thread_count}</div><div style={{ fontSize: 11, color: '#666' }}>Threads</div></div>
              <div><div style={{ fontWeight: 600 }}>{cat.reply_count}</div><div style={{ fontSize: 11, color: '#666' }}>Replies</div></div>
            </div>
          </div>
        </div>
      ))}

      {/* Threads View */}
      {view === 'threads' && (
        <>
          {selectedCategory && <div style={{ fontSize: 13, color: '#939393', marginBottom: 12 }}>Browsing: {selectedCategory.name}</div>}
          {threads.length === 0 && <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>No threads yet. Start a discussion!</div>}
          {threads.map(t => (
            <div key={t._id} style={S.card} onClick={() => openThread(t)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {t.is_pinned && <Pin size={13} style={{ color: '#ff9800' }} />}
                    {t.is_locked && <Lock size={13} style={{ color: '#f44336' }} />}
                    {t.is_solved && <CheckCircle size={13} style={{ color: '#00C971' }} />}
                    {t.title}
                  </div>
                  <div style={{ fontSize: 12, color: '#939393', marginBottom: 6 }}>
                    by {t.author_id?.name || 'Unknown'} -- {new Date(t.created_at).toLocaleDateString()}
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {t.tags?.map(tag => <span key={tag} style={S.badge}><Tag size={10} /> {tag}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, textAlign: 'center', flexShrink: 0 }}>
                  <div><div style={{ fontWeight: 600 }}>{t.reply_count}</div><div style={{ fontSize: 10, color: '#666' }}>Replies</div></div>
                  <div><div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} /> {t.views}</div><div style={{ fontSize: 10, color: '#666' }}>Views</div></div>
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Thread Detail View */}
      {view === 'thread' && selectedThread && (
        <>
          <div style={{ ...S.card, cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              {selectedThread.is_pinned && <Pin size={14} style={{ color: '#ff9800' }} />}
              {selectedThread.is_locked && <Lock size={14} style={{ color: '#f44336' }} />}
              {selectedThread.is_solved && <span style={{ color: '#00C971', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={14} /> Solved</span>}
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>{selectedThread.title}</h2>
            <div style={{ fontSize: 12, color: '#939393', marginBottom: 12 }}>
              by {selectedThread.author_id?.name || 'Unknown'} -- {new Date(selectedThread.created_at).toLocaleDateString()} -- {selectedThread.views} views
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: '#ccc', whiteSpace: 'pre-wrap' }}>{selectedThread.body}</div>
            {selectedThread.tags?.length > 0 && (
              <div style={{ display: 'flex', gap: 4, marginTop: 12 }}>
                {selectedThread.tags.map(tag => <span key={tag} style={S.badge}><Tag size={10} /> {tag}</span>)}
              </div>
            )}
          </div>

          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Replies ({replies.length})</h3>
          {replies.map(r => (
            <div key={r._id} style={{ ...S.card, cursor: 'default', borderLeft: r.is_solution ? '3px solid #00C971' : undefined }}>
              <div style={{ fontSize: 12, color: '#939393', marginBottom: 8 }}>
                {r.author_id?.name || 'Unknown'} -- {new Date(r.created_at).toLocaleDateString()}
                {r.is_solution && <span style={{ color: '#00C971', marginLeft: 8, fontWeight: 600 }}>Accepted Solution</span>}
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#ccc', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{r.body}</div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button style={{ ...S.btn, padding: '4px 8px', fontSize: 12 }} onClick={() => voteReply(r._id, 'up')}><ThumbsUp size={12} /> {r.upvotes}</button>
                <button style={{ ...S.btn, padding: '4px 8px', fontSize: 12 }} onClick={() => voteReply(r._id, 'down')}><ThumbsDown size={12} /> {r.downvotes}</button>
                {!selectedThread.is_solved && (
                  <button style={{ ...S.btn, padding: '4px 8px', fontSize: 12, color: '#00C971' }} onClick={() => markSolution(r._id)}>
                    <CheckCircle size={12} /> Mark as Solution
                  </button>
                )}
              </div>
            </div>
          ))}

          {!selectedThread.is_locked && (
            <div style={{ ...S.card, cursor: 'default' }}>
              <textarea style={S.textarea} placeholder="Write a reply..." value={newReply} onChange={e => setNewReply(e.target.value)} />
              <button style={{ ...S.btnPrimary, marginTop: 8 }} onClick={postReply}>Post Reply</button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CommunityForums;
