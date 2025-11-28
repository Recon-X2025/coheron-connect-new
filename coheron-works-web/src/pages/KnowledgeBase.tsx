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
} from 'lucide-react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { supportDeskService, type KBArticle, type KBRevision } from '../services/supportDeskService';
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
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRevisions, setShowRevisions] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

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
    } catch (error) {
      console.error('Error rating article:', error);
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
                  <Button variant="outline" size="sm" icon={<Edit size={16} />}>
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<History size={16} />}
                    onClick={() => setShowRevisions(!showRevisions)}
                  >
                    History
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
                    variant="outline"
                    size="sm"
                    icon={<ThumbsUp size={16} />}
                    onClick={() => handleRateArticle(true)}
                  >
                    Helpful
                  </Button>
                  <Button
                    variant="outline"
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
    </div>
  );
};

export default KnowledgeBase;

