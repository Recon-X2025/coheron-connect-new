import { useState, useEffect, useCallback } from 'react';
import {
  GitBranch,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  ThumbsUp,
  Play,
  X,
  ChevronRight,
  Filter,
} from 'lucide-react';

interface ECO {
  _id: string;
  eco_number: string;
  title: string;
  description: string;
  reason: string;
  priority: string;
  status: string;
  product_id: any;
  current_revision: string;
  new_revision: string;
  items: any[];
  requested_by: any;
  reviewers: any[];
  approved_by: any;
  effective_date: string;
  created_at: string;
}

interface Revision {
  _id: string;
  product_id: any;
  revision: string;
  eco_id: any;
  status: string;
  change_summary: string;
  effective_from: string;
  effective_to?: string;
  created_by: any;
}

const API_BASE = '/api/manufacturing/plm';

const getToken = () => localStorage.getItem('authToken') || '';

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
};

const statusColors: Record<string, string> = {
  draft: '#939393',
  review: '#f59e0b',
  approved: '#00C971',
  in_progress: '#3b82f6',
  completed: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',
};

const priorityColors: Record<string, string> = {
  low: '#939393',
  normal: '#3b82f6',
  high: '#f59e0b',
  critical: '#ef4444',
};

const reasonLabels: Record<string, string> = {
  cost_reduction: 'Cost Reduction',
  quality_improvement: 'Quality Improvement',
  regulatory: 'Regulatory',
  customer_request: 'Customer Request',
  design_error: 'Design Error',
  other: 'Other',
};

export const PLMDashboard: React.FC = () => {
  const [ecos, setEcos] = useState<ECO[]>([]);
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ecos' | 'revisions' | 'create'>('ecos');
  const [selectedEco, setSelectedEco] = useState<ECO | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    reason: 'cost_reduction',
    priority: 'normal',
    product_id: '',
    current_revision: '',
    new_revision: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const statusParam = statusFilter ? `&status=${statusFilter}` : '';
      const [ecoRes, revRes] = await Promise.all([
        apiFetch(`${API_BASE}/eco?page=1&limit=50${statusParam}`),
        apiFetch(`${API_BASE}/revisions`),
      ]);
      setEcos(ecoRes.data || []);
      setRevisions(revRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateECO = async () => {
    try {
      if (!form.title || !form.product_id || !form.current_revision || !form.new_revision) {
        setError('Please fill in all required fields');
        return;
      }
      await apiFetch(`${API_BASE}/eco`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setForm({ title: '', description: '', reason: 'cost_reduction', priority: 'normal', product_id: '', current_revision: '', new_revision: '' });
      setActiveTab('ecos');
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmitReview = async (id: string) => {
    try {
      await apiFetch(`${API_BASE}/eco/${id}/submit-review`, { method: 'POST', body: JSON.stringify({}) });
      loadData();
      setSelectedEco(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await apiFetch(`${API_BASE}/eco/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ user_id: 'current_user', action: 'approve' }),
      });
      loadData();
      setSelectedEco(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImplement = async (id: string) => {
    try {
      await apiFetch(`${API_BASE}/eco/${id}/implement`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      loadData();
      setSelectedEco(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statCounts = {
    total: ecos.length,
    draft: ecos.filter(e => e.status === 'draft').length,
    review: ecos.filter(e => e.status === 'review').length,
    approved: ecos.filter(e => e.status === 'approved').length,
    completed: ecos.filter(e => e.status === 'completed').length,
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#0a0a0a', minHeight: '100vh', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>PLM / Engineering Change Orders</h1>
          <p style={{ color: '#939393', margin: '4px 0 0' }}>Manage product revisions and engineering changes</p>
        </div>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
            backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: '8px',
            fontWeight: 600, cursor: 'pointer', fontSize: '14px',
          }}
        >
          <Plus size={16} /> New ECO
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          padding: '12px 16px', backgroundColor: '#1a0a0a', border: '1px solid #ef4444',
          borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#ef4444' }}>{error}</span>
          <X size={16} style={{ cursor: 'pointer', color: '#ef4444' }} onClick={() => setError('')} />
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total ECOs', value: statCounts.total, icon: FileText, color: '#3b82f6' },
          { label: 'Draft', value: statCounts.draft, icon: Clock, color: '#939393' },
          { label: 'In Review', value: statCounts.review, icon: AlertTriangle, color: '#f59e0b' },
          { label: 'Approved', value: statCounts.approved, icon: CheckCircle, color: '#00C971' },
          { label: 'Completed', value: statCounts.completed, icon: CheckCircle, color: '#10b981' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '20px', backgroundColor: '#141414', borderRadius: '12px', border: '1px solid #262626',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ color: '#939393', fontSize: '13px' }}>{s.label}</span>
              <s.icon size={18} color={s.color} />
            </div>
            <div style={{ fontSize: '28px', fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid #262626', paddingBottom: '0' }}>
        {(['ecos', 'revisions', 'create'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 20px', border: 'none', borderBottom: activeTab === tab ? '2px solid #00C971' : '2px solid transparent',
              backgroundColor: 'transparent', color: activeTab === tab ? '#fff' : '#939393',
              cursor: 'pointer', fontWeight: activeTab === tab ? 600 : 400, fontSize: '14px',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'ecos' ? 'Change Orders' : tab === 'revisions' ? 'Revision History' : 'Create ECO'}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>Loading...</div>
      ) : (
        <>
          {/* ECO List Tab */}
          {activeTab === 'ecos' && (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
                <Filter size={16} color="#939393" />
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px', backgroundColor: '#141414', color: '#fff', border: '1px solid #333',
                    borderRadius: '6px', fontSize: '13px',
                  }}
                >
                  <option value="">All Statuses</option>
                  {['draft', 'review', 'approved', 'in_progress', 'completed', 'rejected', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ').toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {ecos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>
                  No engineering change orders found. Create one to get started.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ecos.map(eco => (
                    <div
                      key={eco._id}
                      onClick={() => setSelectedEco(eco)}
                      style={{
                        padding: '16px 20px', backgroundColor: '#141414', borderRadius: '10px',
                        border: '1px solid #262626', cursor: 'pointer', display: 'flex',
                        justifyContent: 'space-between', alignItems: 'center',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = '#00C971')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = '#262626')}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                          <span style={{ color: '#00C971', fontWeight: 600, fontSize: '13px' }}>{eco.eco_number}</span>
                          <span style={{ fontWeight: 600, fontSize: '15px' }}>{eco.title}</span>
                          <span style={{
                            padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                            backgroundColor: `${statusColors[eco.status]}20`, color: statusColors[eco.status],
                          }}>
                            {eco.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span style={{
                            padding: '2px 8px', borderRadius: '12px', fontSize: '11px',
                            backgroundColor: `${priorityColors[eco.priority]}20`, color: priorityColors[eco.priority],
                          }}>
                            {eco.priority}
                          </span>
                        </div>
                        <div style={{ color: '#939393', fontSize: '13px', display: 'flex', gap: '16px' }}>
                          <span>{reasonLabels[eco.reason] || eco.reason}</span>
                          <span>Rev {eco.current_revision} → {eco.new_revision}</span>
                          <span>{new Date(eco.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight size={18} color="#939393" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Revision History Tab */}
          {activeTab === 'revisions' && (
            <div>
              {revisions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#939393' }}>
                  No product revisions found.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '30px' }}>
                  {/* Timeline line */}
                  <div style={{
                    position: 'absolute', left: '11px', top: '0', bottom: '0', width: '2px',
                    backgroundColor: '#262626',
                  }} />
                  {revisions.map((rev, _i) => (
                    <div key={rev._id} style={{ position: 'relative', marginBottom: '24px' }}>
                      {/* Timeline dot */}
                      <div style={{
                        position: 'absolute', left: '-24px', top: '8px', width: '12px', height: '12px',
                        borderRadius: '50%',
                        backgroundColor: rev.status === 'active' ? '#00C971' : rev.status === 'obsolete' ? '#939393' : '#f59e0b',
                        border: '2px solid #0a0a0a',
                      }} />
                      <div style={{
                        padding: '16px 20px', backgroundColor: '#141414', borderRadius: '10px',
                        border: `1px solid ${rev.status === 'active' ? '#00C971' : '#262626'}`,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <GitBranch size={16} color="#00C971" />
                            <span style={{ fontWeight: 700, fontSize: '15px' }}>
                              Rev {rev.revision}
                            </span>
                            <span style={{
                              padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 600,
                              backgroundColor: rev.status === 'active' ? '#00C97120' : '#93939320',
                              color: rev.status === 'active' ? '#00C971' : '#939393',
                            }}>
                              {rev.status.toUpperCase()}
                            </span>
                          </div>
                          <span style={{ color: '#939393', fontSize: '12px' }}>
                            {new Date(rev.effective_from).toLocaleDateString()}
                          </span>
                        </div>
                        <p style={{ color: '#939393', fontSize: '13px', margin: '4px 0 0' }}>
                          {rev.change_summary || 'No change summary'}
                        </p>
                        {rev.eco_id && (
                          <span style={{ color: '#3b82f6', fontSize: '12px', marginTop: '4px', display: 'inline-block' }}>
                            {typeof rev.eco_id === 'object' ? `${rev.eco_id.eco_number}: ${rev.eco_id.title}` : `ECO: ${rev.eco_id}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create ECO Tab */}
          {activeTab === 'create' && (
            <div style={{
              maxWidth: '700px', padding: '24px', backgroundColor: '#141414', borderRadius: '12px',
              border: '1px solid #262626',
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, marginTop: 0, marginBottom: '20px' }}>
                Create Engineering Change Order
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Title *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="ECO title"
                    style={{
                      width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                      border: '1px solid #333', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Describe the change..."
                    style={{
                      width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                      border: '1px solid #333', borderRadius: '8px', fontSize: '14px', resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Reason *</label>
                    <select
                      value={form.reason}
                      onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                        border: '1px solid #333', borderRadius: '8px', fontSize: '14px',
                      }}
                    >
                      {Object.entries(reasonLabels).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      style={{
                        width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                        border: '1px solid #333', borderRadius: '8px', fontSize: '14px',
                      }}
                    >
                      {['low', 'normal', 'high', 'critical'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Product ID *</label>
                  <input
                    value={form.product_id}
                    onChange={e => setForm(f => ({ ...f, product_id: e.target.value }))}
                    placeholder="Product ObjectId"
                    style={{
                      width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                      border: '1px solid #333', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>Current Revision *</label>
                    <input
                      value={form.current_revision}
                      onChange={e => setForm(f => ({ ...f, current_revision: e.target.value }))}
                      placeholder="e.g. A"
                      style={{
                        width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                        border: '1px solid #333', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ color: '#939393', fontSize: '13px', display: 'block', marginBottom: '6px' }}>New Revision *</label>
                    <input
                      value={form.new_revision}
                      onChange={e => setForm(f => ({ ...f, new_revision: e.target.value }))}
                      placeholder="e.g. B"
                      style={{
                        width: '100%', padding: '10px 14px', backgroundColor: '#0a0a0a', color: '#fff',
                        border: '1px solid #333', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateECO}
                  style={{
                    padding: '12px', backgroundColor: '#00C971', color: '#000', border: 'none',
                    borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '14px', marginTop: '8px',
                  }}
                >
                  Create ECO
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ECO Detail Modal */}
      {selectedEco && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex',
          justifyContent: 'center', alignItems: 'center', zIndex: 1000,
        }} onClick={() => setSelectedEco(null)}>
          <div
            style={{
              width: '600px', maxHeight: '80vh', overflow: 'auto', backgroundColor: '#141414',
              borderRadius: '16px', border: '1px solid #262626', padding: '28px',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '20px' }}>
              <div>
                <span style={{ color: '#00C971', fontSize: '13px', fontWeight: 600 }}>{selectedEco.eco_number}</span>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0' }}>{selectedEco.title}</h2>
                <span style={{
                  padding: '3px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                  backgroundColor: `${statusColors[selectedEco.status]}20`, color: statusColors[selectedEco.status],
                }}>
                  {selectedEco.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <X size={20} style={{ cursor: 'pointer', color: '#939393' }} onClick={() => setSelectedEco(null)} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <div style={{ padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                <div style={{ color: '#939393', fontSize: '12px' }}>Reason</div>
                <div style={{ fontSize: '14px', marginTop: '2px' }}>{reasonLabels[selectedEco.reason]}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                <div style={{ color: '#939393', fontSize: '12px' }}>Priority</div>
                <div style={{ fontSize: '14px', marginTop: '2px', color: priorityColors[selectedEco.priority] }}>
                  {selectedEco.priority.toUpperCase()}
                </div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                <div style={{ color: '#939393', fontSize: '12px' }}>Current Rev</div>
                <div style={{ fontSize: '14px', marginTop: '2px' }}>{selectedEco.current_revision}</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#0a0a0a', borderRadius: '8px' }}>
                <div style={{ color: '#939393', fontSize: '12px' }}>New Rev</div>
                <div style={{ fontSize: '14px', marginTop: '2px' }}>{selectedEco.new_revision}</div>
              </div>
            </div>

            {selectedEco.description && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#939393', fontSize: '12px', marginBottom: '4px' }}>Description</div>
                <p style={{ fontSize: '14px', margin: 0, lineHeight: 1.5 }}>{selectedEco.description}</p>
              </div>
            )}

            {selectedEco.reviewers?.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ color: '#939393', fontSize: '12px', marginBottom: '8px' }}>Reviewers</div>
                {selectedEco.reviewers.map((r: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0',
                    borderBottom: '1px solid #1a1a1a',
                  }}>
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      backgroundColor: r.status === 'approved' ? '#00C971' : r.status === 'rejected' ? '#ef4444' : '#f59e0b',
                    }} />
                    <span style={{ fontSize: '13px' }}>
                      {typeof r.user_id === 'object' ? r.user_id.name : r.user_id}
                    </span>
                    <span style={{ color: '#939393', fontSize: '12px', marginLeft: 'auto' }}>
                      {r.status}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              {selectedEco.status === 'draft' && (
                <button
                  onClick={() => handleSubmitReview(selectedEco._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                    backgroundColor: '#f59e0b', color: '#000', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  <Send size={14} /> Submit for Review
                </button>
              )}
              {selectedEco.status === 'review' && (
                <button
                  onClick={() => handleApprove(selectedEco._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                    backgroundColor: '#00C971', color: '#000', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  <ThumbsUp size={14} /> Approve
                </button>
              )}
              {selectedEco.status === 'approved' && (
                <button
                  onClick={() => handleImplement(selectedEco._id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px',
                    backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px',
                    fontWeight: 600, cursor: 'pointer', fontSize: '13px',
                  }}
                >
                  <Play size={14} /> Implement
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PLMDashboard;
