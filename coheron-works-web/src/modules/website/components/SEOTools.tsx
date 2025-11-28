import React, { useState } from 'react';
import { Search, FileText, Link as LinkIcon } from 'lucide-react';
import './SEOTools.css';

interface SEOToolsProps {
  pageId?: number;
  initialData?: {
    meta_title?: string;
    meta_description?: string;
    meta_keywords?: string;
    url?: string;
  };
  onSave?: (data: any) => void;
}

export const SEOTools: React.FC<SEOToolsProps> = ({
  initialData = {},
  onSave,
}) => {
  const [formData, setFormData] = useState({
    meta_title: initialData.meta_title || '',
    meta_description: initialData.meta_description || '',
    meta_keywords: initialData.meta_keywords || '',
    url: initialData.url || '',
  });

  const handleSave = () => {
    if (onSave) {
      onSave(formData);
    }
  };

  return (
    <div className="seo-tools">
      <h3>SEO Settings</h3>
      <div className="seo-form">
        <div className="form-field">
          <label>
            <FileText size={18} />
            Meta Title
          </label>
          <input
            type="text"
            value={formData.meta_title}
            onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
            placeholder="Page title for search engines"
            maxLength={60}
          />
          <span className="char-count">{formData.meta_title.length}/60</span>
        </div>

        <div className="form-field">
          <label>
            <Search size={18} />
            Meta Description
          </label>
          <textarea
            value={formData.meta_description}
            onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
            placeholder="Brief description for search results"
            rows={3}
            maxLength={160}
          />
          <span className="char-count">{formData.meta_description.length}/160</span>
        </div>

        <div className="form-field">
          <label>
            <Search size={18} />
            Meta Keywords
          </label>
          <input
            type="text"
            value={formData.meta_keywords}
            onChange={(e) => setFormData({ ...formData, meta_keywords: e.target.value })}
            placeholder="Comma-separated keywords"
          />
        </div>

        <div className="form-field">
          <label>
            <LinkIcon size={18} />
            URL Slug
          </label>
          <input
            type="text"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            placeholder="page-url-slug"
          />
        </div>

        <button className="save-btn" onClick={handleSave}>
          Save SEO Settings
        </button>
      </div>
    </div>
  );
};

export default SEOTools;

