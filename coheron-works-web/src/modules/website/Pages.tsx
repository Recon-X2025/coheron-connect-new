import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Globe, Edit, Trash2, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { apiService } from '../../services/apiService';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import './Pages.css';

export interface WebsitePage {
  id: number;
  name: string;
  url: string;
  is_published: boolean;
  view_id: number;
  create_date: string;
  write_date: string;
}

interface PagesProps {
  onNewPage?: () => void;
}

export const Pages = ({ onNewPage }: PagesProps) => {
  const navigate = useNavigate();
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const handleNewPage = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('New Page button clicked', { onNewPage: !!onNewPage });
    
    if (onNewPage) {
      // If we're inside Website component, use the callback
      onNewPage();
    } else {
      // If we're standalone (via routing), navigate to website with builder tab
      navigate('/website?tab=builder', { replace: false });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const pagesData = await apiService.get<WebsitePage>('/website/pages');
      setPages(pagesData);
    } finally {
      setLoading(false);
    }
  };

  const filteredPages = pages.filter((page) =>
    page.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    page.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="pages-page">
        <div className="container">
          <LoadingSpinner size="medium" message="Loading pages..." />
        </div>
      </div>
    );
  }

  return (
    <div className="pages-page">
      <div className="container">
        <div className="pages-header">
          <div>
            <h1>Website Pages</h1>
            <p className="pages-subtitle">{filteredPages.length} page(s) found</p>
          </div>
          <Button 
            icon={<Plus size={20} />}
            onClick={handleNewPage}
          >
            New Page
          </Button>
        </div>

        <div className="pages-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {filteredPages.length === 0 ? (
          <div className="pages-empty-state">
            <Globe size={64} className="empty-icon" />
            <h2>No pages yet</h2>
            <p>Get started by creating your first website page</p>
            <Button 
              icon={<Plus size={20} />}
              onClick={handleNewPage}
            >
              Create Your First Page
            </Button>
          </div>
        ) : (
          <div className="pages-grid">
            {filteredPages.map((page, idx) => (
              <div key={page.id || (page as any)._id || idx} className="page-card">
                <div className="page-header">
                  <Globe size={24} />
                  <span className={`status-badge ${page.is_published ? 'published' : 'draft'}`}>
                    {page.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
                <h3>{page.name}</h3>
                <p className="page-url">{page.url}</p>
                <div className="page-actions">
                  <button className="action-btn" title="View">
                    <Eye size={16} />
                  </button>
                  <button className="action-btn" title="Edit">
                    <Edit size={16} />
                  </button>
                  <button className="action-btn delete" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Pages;

