import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supportDeskService, type KBArticle } from '../../services/supportDeskService';
import { showToast } from '../../components/Toast';
import './ArticleForm.css';

interface ArticleFormProps {
  article?: KBArticle;
  onClose: () => void;
  onSave: () => void;
}

export const ArticleForm = ({ article, onClose, onSave }: ArticleFormProps) => {
  const [formData, setFormData] = useState({
    title: article?.title || '',
    slug: article?.slug || '',
    content: article?.content || '',
    summary: article?.summary || '',
    article_type: article?.article_type || 'article' as 'article' | 'faq' | 'how_to' | 'troubleshooting',
    status: article?.status || 'draft' as 'draft' | 'published' | 'archived',
    is_public: article?.is_public !== false,
    category_id: article?.category_id || undefined,
    tags: article?.tags?.join(', ') || '',
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await supportDeskService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) {
      showToast('Please fill in all required fields', 'error');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(t => t) : [],
      };

      if (article) {
        await supportDeskService.updateKBArticle(article.id, submitData);
        showToast('Article updated successfully', 'success');
      } else {
        await supportDeskService.createKBArticle(submitData);
        showToast('Article created successfully', 'success');
      }
      onSave();
      onClose();
    } catch (error: any) {
      console.error('Failed to save article:', error);
      showToast(error?.message || 'Failed to save article. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content article-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{article ? 'Edit Article' : 'New Article'}</h2>
          <button type="button" className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Article title"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="article_type">Article Type</label>
              <select
                id="article_type"
                name="article_type"
                value={formData.article_type}
                onChange={(e) => setFormData({ ...formData, article_type: e.target.value as any })}
              >
                <option value="article">Article</option>
                <option value="faq">FAQ</option>
                <option value="how_to">How To</option>
                <option value="troubleshooting">Troubleshooting</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="form-group">
              <label htmlFor="category_id">Category</label>
              <select
                id="category_id"
                name="category_id"
                value={formData.category_id || ''}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : undefined })}
              >
                <option value="">No Category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="summary">Summary</label>
            <textarea
              id="summary"
              name="summary"
              rows={2}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              placeholder="Brief summary..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="content">Content *</label>
            <textarea
              id="content"
              name="content"
              required
              rows={10}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Article content..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (comma-separated)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="tag1, tag2, tag3"
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
              />
              Public (visible to customers)
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : article ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

