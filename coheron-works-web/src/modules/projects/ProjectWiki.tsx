import { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, FileText } from 'lucide-react';
import { wikiService, type KnowledgeSpace, type WikiPage } from '../../services/wikiService';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { WikiForm } from './components/WikiForm';
import './ProjectWiki.css';

interface ProjectWikiProps {
  projectId: string;
}

export const ProjectWiki = ({ projectId }: ProjectWikiProps) => {
  const [spaces, setSpaces] = useState<KnowledgeSpace[]>([]);
  const [pages, setPages] = useState<WikiPage[]>([]);
  const [selectedSpace, setSelectedSpace] = useState<KnowledgeSpace | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWikiForm, setShowWikiForm] = useState(false);
  const [wikiFormType, setWikiFormType] = useState<'space' | 'page'>('page');

  useEffect(() => {
    loadSpaces();
  }, [projectId]);

  useEffect(() => {
    if (selectedSpace) {
      loadPages(selectedSpace.id);
    }
  }, [selectedSpace]);

  const loadSpaces = async () => {
    try {
      setLoading(true);
      const spacesData = await wikiService.getSpaces({ project_id: projectId });
      setSpaces(spacesData);
      if (spacesData.length > 0) {
        setSelectedSpace(spacesData[0]);
      }
    } catch (error) {
      console.error('Failed to load spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPages = async (spaceId: string) => {
    try {
      const pagesData = await wikiService.getPages(spaceId);
      setPages(pagesData);
    } catch (error) {
      console.error('Failed to load pages:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner size="medium" message="Loading wiki..." />;
  }

  return (
    <div className="project-wiki">
      <div className="wiki-header">
        <div>
          <h2>Knowledge Base</h2>
          <p>Documentation and knowledge sharing for this project</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => {
          setWikiFormType('page');
          setShowWikiForm(true);
        }}>New Page</Button>
      </div>

      <div className="wiki-layout">
        {/* Spaces Sidebar */}
        <div className="wiki-spaces">
          <div className="spaces-header">
            <BookOpen size={18} />
            <span>Spaces</span>
          </div>
          <div className="spaces-list">
            {spaces.map((space, idx) => (
              <button
                key={space.id || (space as any)._id || idx}
                className={`space-item ${selectedSpace?.id === space.id ? 'active' : ''}`}
                onClick={() => setSelectedSpace(space)}
              >
                <span className="space-name">{space.name}</span>
                <span className="space-key">{space.key}</span>
              </button>
            ))}
            {spaces.length === 0 && (
              <div className="empty-spaces">
                <p>No spaces yet</p>
                <Button size="sm" icon={<Plus size={14} />} onClick={() => {
                  setWikiFormType('space');
                  setShowWikiForm(true);
                }}>
                  Create Space
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Pages Content */}
        <div className="wiki-content">
          {selectedSpace ? (
            <>
              <div className="pages-header">
                <h3>{selectedSpace.name}</h3>
                {selectedSpace.description && <p>{selectedSpace.description}</p>}
              </div>

              <div className="pages-toolbar">
                <div className="search-box">
                  <Search size={18} />
                  <input type="text" placeholder="Search pages..." />
                </div>
                <Button icon={<Plus size={16} />} size="sm" onClick={() => {
                  setWikiFormType('page');
                  setShowWikiForm(true);
                }}>
                  New Page
                </Button>
              </div>

              <div className="pages-list">
                {pages.length === 0 ? (
                  <div className="empty-pages">
                    <FileText size={48} />
                    <h3>No pages yet</h3>
                    <p>Create your first page to get started</p>
                    <Button icon={<Plus size={16} />} onClick={() => {
                      setWikiFormType('page');
                      setShowWikiForm(true);
                    }}>Create Page</Button>
                  </div>
                ) : (
                  pages.map((page, idx) => (
                    <div key={page.id || (page as any)._id || idx} className="page-item">
                      <FileText size={20} />
                      <div className="page-info">
                        <h4>{page.title}</h4>
                        {page.excerpt && <p>{page.excerpt}</p>}
                        <div className="page-meta">
                          <span>{new Date(page.updated_at).toLocaleDateString()}</span>
                          {page.labels && page.labels.length > 0 && (
                            <div className="page-labels">
                              {page.labels.map((label, i) => (
                                <span key={i} className="label">{label}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              <BookOpen size={48} />
              <h3>No space selected</h3>
              <p>Select a space or create a new one to get started</p>
            </div>
          )}
        </div>

        {showWikiForm && (
          <WikiForm
            projectId={projectId}
            type={wikiFormType}
            spaceId={selectedSpace?.id}
            onClose={() => setShowWikiForm(false)}
            onSave={() => {
              setShowWikiForm(false);
              if (wikiFormType === 'space') {
                loadSpaces();
              } else {
                if (selectedSpace) {
                  loadPages(selectedSpace.id);
                }
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

