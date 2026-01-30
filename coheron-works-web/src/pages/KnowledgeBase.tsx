import { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  BookOpen,
  FileText,
  HelpCircle,
  Wrench,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Edit,
  History,
  Eye,
  Tag,
  Filter,
  Trash2,
} from 'lucide-react';
import { Button } from '../components/Button';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supportDeskService, type KBArticle } from '../services/supportDeskService';
import { showToast } from '../components/Toast';
import { confirmAction } from '../components/ConfirmDialog';
import './KnowledgeBase.css';

type ArticleType = 'article' | 'faq' | 'how_to' | 'troubleshooting';
type ArticleStatus = 'draft' | 'published' | 'archived';

export const KnowledgeBase: React.FC = () => {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ArticleType | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [showRevisions, setShowRevisions] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    summary: '',
    content: '',
    article_type: 'article' as ArticleType,
    status: 'draft' as ArticleStatus,
    category_id: '',
    tags: [] as string[],
  });

  useEffect(() => {
    loadArticles();
    loadCategories();
  }, [statusFilter, typeFilter, categoryFilter]);

  const loadArticles = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.article_type = typeFilter;
      if (categoryFilter !== 'all') params.category_id = categoryFilter;
      if (searchTerm) params.search = searchTerm;

      const data = await supportDeskService.getKBArticles(params);
      setArticles(data);
    } catch (error) {
      console.error('Error loading articles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await supportDeskService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleArticleClick = async (article: KBArticle) => {
    try {
      const fullArticle = await supportDeskService.getKBArticle(article.id);
      setSelectedArticle(fullArticle);
      setShowRevisions(false);
    } catch (error) {
      console.error('Error loading article:', error);
    }
  };

  const handleRateArticle = async (isHelpful: boolean) => {
    if (!selectedArticle) return;

    try {
      await supportDeskService.rateKBArticle(selectedArticle.id, isHelpful);
      const updated = await supportDeskService.getKBArticle(selectedArticle.id);
      setSelectedArticle(updated);
      showToast('Thank you for your feedback!', 'success');
    } catch (error) {
      console.error('Error rating article:', error);
      showToast('Failed to submit rating. Please try again.', 'error');
    }
  };

  const handleDeleteArticle = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Article',
      message: 'Are you sure you want to delete this article? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await supportDeskService.deleteKBArticle(id);
      showToast('Article deleted successfully', 'success');
      if (selectedArticle?.id === id) {
        setSelectedArticle(null);
      }
      loadArticles();
    } catch (error: any) {
      console.error('Failed to delete article:', error);
      showToast(error?.message || 'Failed to delete article. Please try again.', 'error');
    }
  };


  const getArticleTypeIcon = (type: ArticleType) => {
    switch (type) {
      case 'faq':
        return <HelpCircle size={18} />;
      case 'how_to':
        return <Wrench size={18} />;
      case 'troubleshooting':
        return <AlertCircle size={18} />;
      default:
        return <FileText size={18} />;
    }
  };

  const getArticleTypeLabel = (type: ArticleType) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleCreateArticle = async () => {
    if (!newArticle.title || !newArticle.content) {
      showToast('Please fill in title and content', 'error');
      return;
    }

    try {
      const articleData: any = {
        title: newArticle.title,
        summary: newArticle.summary,
        content: newArticle.content,
        article_type: newArticle.article_type,
        status: newArticle.status,
        tags: newArticle.tags,
      };
      if (newArticle.category_id && newArticle.category_id !== 'all') {
        articleData.category_id = parseInt(newArticle.category_id);
      }

      await supportDeskService.createKBArticle(articleData);
      showToast('Article created successfully', 'success');
      setShowCreateModal(false);
      setNewArticle({
        title: '',
        summary: '',
        content: '',
        article_type: 'article',
        status: 'draft',
        category_id: '',
        tags: [],
      });
      loadArticles();
    } catch (error: any) {
      console.error('Error creating article:', error);
      showToast(error?.message || 'Failed to create article', 'error');
    }
  };

  const filteredArticles = articles.filter((article) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        article.title.toLowerCase().includes(searchLower) ||
        article.summary?.toLowerCase().includes(searchLower) ||
        article.content.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div className="knowledge-base">
      <div className="kb-header">
        <div>
          <h1>Knowledge Base</h1>
          <p className="kb-subtitle">Manage articles, FAQs, and documentation</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setShowCreateModal(true)}>
          New Article
        </Button>
      </div>

      <div className="kb-layout">
        {/* Sidebar - Article List */}
        <div className="kb-sidebar">
          <div className="kb-filters">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && loadArticles()}
              />
            </div>

            <div className="filter-group">
              <label>
                <Filter size={14} /> Status
              </label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Type</label>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="all">All Types</option>
                <option value="article">Article</option>
                <option value="faq">FAQ</option>
                <option value="how_to">How-To</option>
                <option value="troubleshooting">Troubleshooting</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="articles-list">
            {loading ? (
              <LoadingSpinner size="small" message="Loading articles..." />
            ) : filteredArticles.length === 0 ? (
              <div className="empty-state">
                <BookOpen size={32} />
                <p>No articles found</p>
              </div>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className={`article-item ${selectedArticle?.id === article.id ? 'active' : ''}`}
                  onClick={() => handleArticleClick(article)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="article-item-header">
                    <div className="article-type-badge">
                      {getArticleTypeIcon(article.article_type)}
                      <span>{getArticleTypeLabel(article.article_type)}</span>
                    </div>
                    <span className={`article-status article-status-${article.status}`}>
                      {article.status}
                    </span>
                  </div>
                  <h4 className="article-title">{article.title}</h4>
                  {article.summary && (
                    <p className="article-summary">{article.summary.substring(0, 100)}...</p>
                  )}
                  <div className="article-meta">
                    <span className="article-views">
                      <Eye size={12} /> {article.view_count}
                    </span>
                    {article.helpful_count > 0 && (
                      <span className="article-helpful">
                        <ThumbsUp size={12} /> {article.helpful_count}
                      </span>
                    )}
                    {article.tags && article.tags.length > 0 && (
                      <div className="article-tags">
                        {article.tags.slice(0, 2).map((tag, idx) => (
                          <span key={idx} className="tag">
                            <Tag size={10} /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Article Viewer */}
        <div className="kb-main">
          {selectedArticle ? (
            <div className="article-viewer">
              <div className="article-header">
                <div>
                  <div className="article-header-meta">
                    <span className="article-type-large">
                      {getArticleTypeIcon(selectedArticle.article_type)}
                      {getArticleTypeLabel(selectedArticle.article_type)}
                    </span>
                    <span className={`article-status-large article-status-${selectedArticle.status}`}>
                      {selectedArticle.status}
                    </span>
                  </div>
                  <h2>{selectedArticle.title}</h2>
                  {selectedArticle.summary && <p className="article-summary-large">{selectedArticle.summary}</p>}
                </div>
                <div className="article-actions">
                  <Button variant="secondary" size="sm" icon={<Edit size={16} />}>
                    Edit
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<History size={16} />}
                    onClick={() => setShowRevisions(!showRevisions)}
                  >
                    History
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    onClick={() => handleDeleteArticle(selectedArticle.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              <div className="article-content">
                <div
                  className="article-body"
                  dangerouslySetInnerHTML={{ __html: selectedArticle.content }}
                />
              </div>

              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="article-tags-section">
                  <h4>Tags</h4>
                  <div className="tags-list">
                    {selectedArticle.tags.map((tag, idx) => (
                      <span key={idx} className="tag-badge">
                        <Tag size={12} /> {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="article-footer">
                <div className="article-stats">
                  <span>
                    <Eye size={16} /> {selectedArticle.view_count} views
                  </span>
                  <span>
                    <ThumbsUp size={16} /> {selectedArticle.helpful_count} helpful
                  </span>
                  <span>
                    <ThumbsDown size={16} /> {selectedArticle.not_helpful_count} not helpful
                  </span>
                </div>
                <div className="article-rating">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ThumbsUp size={16} />}
                    onClick={() => handleRateArticle(true)}
                  >
                    Helpful
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<ThumbsDown size={16} />}
                    onClick={() => handleRateArticle(false)}
                  >
                    Not Helpful
                  </Button>
                </div>
              </div>

              {showRevisions && selectedArticle.revisions && selectedArticle.revisions.length > 0 && (
                <div className="article-revisions">
                  <h3>Revision History</h3>
                  <div className="revisions-list">
                    {selectedArticle.revisions.map((revision) => (
                      <div key={revision.id} className="revision-item">
                        <div className="revision-header">
                          <span className="revision-number">v{revision.revision_number}</span>
                          <span className="revision-author">{revision.created_by_name || 'System'}</span>
                          <span className="revision-date">
                            {new Date(revision.created_at).toLocaleString()}
                          </span>
                        </div>
                        {revision.change_summary && (
                          <p className="revision-summary">{revision.change_summary}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-article-selected">
              <BookOpen size={64} />
              <h3>Select an article to view</h3>
              <p>Choose an article from the list to read its content</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Article Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Create New Article</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Title *</label>
                <input
                  type="text"
                  value={newArticle.title}
                  onChange={(e) => setNewArticle({ ...newArticle, title: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Article title"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Summary</label>
                <input
                  type="text"
                  value={newArticle.summary}
                  onChange={(e) => setNewArticle({ ...newArticle, summary: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Brief summary"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Content *</label>
                <textarea
                  value={newArticle.content}
                  onChange={(e) => setNewArticle({ ...newArticle, content: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '150px' }}
                  placeholder="Article content (HTML supported)"
                />
              </div>
              <div style={{ marginBottom: '15px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Type</label>
                  <select
                    value={newArticle.article_type}
                    onChange={(e) => setNewArticle({ ...newArticle, article_type: e.target.value as ArticleType })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="article">Article</option>
                    <option value="faq">FAQ</option>
                    <option value="how_to">How-To</option>
                    <option value="troubleshooting">Troubleshooting</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Status</label>
                  <select
                    value={newArticle.status}
                    onChange={(e) => setNewArticle({ ...newArticle, status: e.target.value as ArticleStatus })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Category</label>
                <select
                  value={newArticle.category_id}
                  onChange={(e) => setNewArticle({ ...newArticle, category_id: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="all">No Category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreateArticle}>Create Article</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeBase;

