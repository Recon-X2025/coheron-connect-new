import { useState, useEffect } from 'react';
import {
  Plus,
  BarChart3,
  Star,
  MessageSquare,
  TrendingUp,
  Users,
  Edit,
  Send,
  Trash2,
} from 'lucide-react';
import { Button } from '../../../components/Button';
import { Card } from '../../../components/Card';
import { LoadingSpinner } from '../../../components/LoadingSpinner';
import { supportDeskService, type Survey, type SurveyResponse } from '../../../services/supportDeskService';
import { showToast } from '../../../components/Toast';
import { confirmAction } from '../../../components/ConfirmDialog';
import './SurveyManagement.css';

type SurveyType = 'csat' | 'ces' | 'nps' | 'custom';

export const SurveyManagement: React.FC = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [selectedSurvey, setSelectedSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<SurveyResponse[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSurvey, setNewSurvey] = useState({
    name: '',
    description: '',
    survey_type: 'csat' as SurveyType,
    is_active: true,
    trigger_event: '',
  });

  useEffect(() => {
    loadSurveys();
  }, [filter]);

  useEffect(() => {
    if (selectedSurvey) {
      loadResponses();
      loadAnalytics();
    }
  }, [selectedSurvey]);

  const loadSurveys = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filter === 'active') params.is_active = true;
      if (filter === 'inactive') params.is_active = false;

      const data = await supportDeskService.getSurveys(params);
      setSurveys(data);
    } catch (error) {
      console.error('Error loading surveys:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadResponses = async () => {
    if (!selectedSurvey) return;

    try {
      const data = await supportDeskService.getSurveyResponses(selectedSurvey.id);
      setResponses(data);
    } catch (error) {
      console.error('Error loading responses:', error);
    }
  };

  const loadAnalytics = async () => {
    if (!selectedSurvey) return;

    try {
      const data = await supportDeskService.getSurveyAnalytics(selectedSurvey.id);
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const handleSurveyClick = (survey: Survey) => {
    setSelectedSurvey(survey);
  };

  const getSurveyTypeIcon = (type: SurveyType) => {
    switch (type) {
      case 'csat':
      case 'ces':
        return <Star size={18} />;
      case 'nps':
        return <TrendingUp size={18} />;
      default:
        return <MessageSquare size={18} />;
    }
  };

  const getSurveyTypeLabel = (type: SurveyType) => {
    return type.toUpperCase();
  };

  const renderScoreDistribution = () => {
    if (!analytics?.score_distribution) return null;

    const maxCount = Math.max(...Object.values(analytics.score_distribution) as number[]);

    return (
      <div className="score-distribution">
        {Object.entries(analytics.score_distribution)
          .sort(([a], [b]) => parseInt(b) - parseInt(a))
          .map(([score, count]: [string, any]) => (
            <div key={score} className="score-bar-item">
              <div className="score-bar-header">
                <span className="score-label">{score}</span>
                <span className="score-count">{count}</span>
              </div>
              <div className="score-bar">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${(count / maxCount) * 100}%`,
                  }}
                />
              </div>
            </div>
          ))}
      </div>
    );
  };

  const handleCreateSurvey = async () => {
    if (!newSurvey.name) {
      showToast('Please enter a survey name', 'error');
      return;
    }

    try {
      await supportDeskService.createSurvey(newSurvey);
      showToast('Survey created successfully', 'success');
      setShowCreateModal(false);
      setNewSurvey({
        name: '',
        description: '',
        survey_type: 'csat' as SurveyType,
        is_active: true,
        trigger_event: '',
      });
      loadSurveys();
    } catch (error: any) {
      console.error('Failed to create survey:', error);
      showToast(error?.message || 'Failed to create survey. Please try again.', 'error');
    }
  };

  const handleDeleteSurvey = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Survey',
      message: 'Are you sure you want to delete this survey? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await supportDeskService.deleteSurvey(id);
      showToast('Survey deleted successfully', 'success');
      if (selectedSurvey?.id === id) {
        setSelectedSurvey(null);
      }
      loadSurveys();
    } catch (error: any) {
      console.error('Failed to delete survey:', error);
      showToast(error?.message || 'Failed to delete survey. Please try again.', 'error');
    }
  };

  const filteredSurveys = surveys;

  return (
    <div className="survey-management">
      <div className="survey-header">
        <div>
          <h1>Survey Management</h1>
          <p className="survey-subtitle">Create and manage CSAT, CES, NPS, and custom surveys</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => {
          setShowCreateModal(true);
        }}>
          New Survey
        </Button>
      </div>

      <div className="survey-layout">
        {/* Sidebar - Survey List */}
        <div className="survey-sidebar">
          <div className="survey-filters">
            <div className="filter-tabs">
              <button
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={filter === 'active' ? 'active' : ''}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button
                className={filter === 'inactive' ? 'active' : ''}
                onClick={() => setFilter('inactive')}
              >
                Inactive
              </button>
            </div>
          </div>

          <div className="surveys-list">
            {loading ? (
              <LoadingSpinner size="small" message="Loading surveys..." />
            ) : filteredSurveys.length === 0 ? (
              <div className="empty-state">
                <MessageSquare size={32} />
                <p>No surveys found</p>
              </div>
            ) : (
              filteredSurveys.map((survey) => (
                <div
                  key={survey.id}
                  className={`survey-item ${selectedSurvey?.id === survey.id ? 'active' : ''}`}
                  onClick={() => handleSurveyClick(survey)}
                >
                  <div className="survey-item-header">
                    <div className="survey-type-badge">
                      {getSurveyTypeIcon(survey.survey_type)}
                      <span>{getSurveyTypeLabel(survey.survey_type)}</span>
                    </div>
                    <span className={`survey-status ${survey.is_active ? 'active' : 'inactive'}`}>
                      {survey.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h4 className="survey-name">{survey.name}</h4>
                  {survey.description && (
                    <p className="survey-description">{survey.description.substring(0, 80)}...</p>
                  )}
                  <div className="survey-meta">
                    <span className="survey-responses">
                      <Users size={12} /> {survey.response_count || 0} responses
                    </span>
                    {survey.trigger_event && (
                      <span className="survey-trigger">Triggers: {survey.trigger_event}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Main Content - Survey Details */}
        <div className="survey-main">
          {selectedSurvey ? (
            <div className="survey-details">
              <div className="survey-details-header">
                <div>
                  <div className="survey-header-meta">
                    <span className="survey-type-large">
                      {getSurveyTypeIcon(selectedSurvey.survey_type)}
                      {getSurveyTypeLabel(selectedSurvey.survey_type)}
                    </span>
                    <span className={`survey-status-large ${selectedSurvey.is_active ? 'active' : 'inactive'}`}>
                      {selectedSurvey.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <h2>{selectedSurvey.name}</h2>
                  {selectedSurvey.description && (
                    <p className="survey-description-large">{selectedSurvey.description}</p>
                  )}
                </div>
                <div className="survey-actions">
                  <Button variant="secondary" size="sm" icon={<Edit size={16} />}>
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" icon={<Send size={16} />}>
                    Send
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 size={16} />}
                    onClick={() => handleDeleteSurvey(selectedSurvey.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>

              {/* Analytics */}
              {analytics && (
                <div className="survey-analytics">
                  <h3>Analytics</h3>
                  <div className="analytics-grid">
                    <Card className="metric-card">
                      <div className="metric-label">Total Responses</div>
                      <div className="metric-value">{analytics.total_responses || 0}</div>
                    </Card>
                    <Card className="metric-card">
                      <div className="metric-label">Average Score</div>
                      <div className="metric-value">
                        {analytics.average_score ? analytics.average_score.toFixed(1) : 'N/A'}
                      </div>
                    </Card>
                  </div>

                  {analytics.score_distribution && (
                    <div className="score-distribution-section">
                      <h4>Score Distribution</h4>
                      {renderScoreDistribution()}
                    </div>
                  )}
                </div>
              )}

              {/* Responses */}
              <div className="survey-responses-section">
                <h3>Responses ({responses.length})</h3>
                {responses.length > 0 ? (
                  <div className="responses-list">
                    {responses.map((response) => (
                      <Card key={response.id} className="response-item">
                        <div className="response-header">
                          <div>
                            {response.partner_id && (
                              <span className="response-customer">{response.partner_id}</span>
                            )}
                            {response.ticket_id && (
                              <span className="response-ticket">Ticket #{response.ticket_id}</span>
                            )}
                          </div>
                          <span className="response-date">
                            {new Date(response.submitted_at).toLocaleString()}
                          </span>
                        </div>
                        {response.score !== null && response.score !== undefined && (
                          <div className="response-score">
                            <Star size={16} fill="#fbbf24" color="#fbbf24" />
                            <span>{response.score}/5</span>
                          </div>
                        )}
                        {response.feedback && (
                          <p className="response-feedback">{response.feedback}</p>
                        )}
                        {response.responses && typeof response.responses === 'object' && (
                          <div className="response-answers">
                            {Object.entries(response.responses).map(([key, value]: [string, any]) => (
                              <div key={key} className="response-answer">
                                <strong>{key}:</strong> {String(value)}
                              </div>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="no-responses">
                    <MessageSquare size={48} />
                    <p>No responses yet</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="no-survey-selected">
              <BarChart3 size={64} />
              <h3>Select a survey to view details</h3>
              <p>Choose a survey from the list to see analytics and responses</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Survey Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Create New Survey</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Survey Name *</label>
                <input
                  type="text"
                  value={newSurvey.name}
                  onChange={(e) => setNewSurvey({ ...newSurvey, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="Survey name"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Description</label>
                <textarea
                  value={newSurvey.description}
                  onChange={(e) => setNewSurvey({ ...newSurvey, description: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px', minHeight: '100px' }}
                  placeholder="Survey description"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Survey Type</label>
                <select
                  value={newSurvey.survey_type}
                  onChange={(e) => setNewSurvey({ ...newSurvey, survey_type: e.target.value as SurveyType })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                >
                  <option value="csat">CSAT (Customer Satisfaction)</option>
                  <option value="ces">CES (Customer Effort Score)</option>
                  <option value="nps">NPS (Net Promoter Score)</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>Trigger Event</label>
                <input
                  type="text"
                  value={newSurvey.trigger_event}
                  onChange={(e) => setNewSurvey({ ...newSurvey, trigger_event: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
                  placeholder="e.g., ticket_resolved"
                />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="checkbox"
                    checked={newSurvey.is_active}
                    onChange={(e) => setNewSurvey({ ...newSurvey, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
                <Button onClick={handleCreateSurvey}>Create Survey</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SurveyManagement;

