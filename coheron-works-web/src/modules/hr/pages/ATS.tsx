import React, { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Users, Plus, Search, Star, Calendar, BarChart3,
  X, Clock, MapPin, Building, Eye,
  Send, UserX, ArrowRight, Phone
} from 'lucide-react';

const API = '/api/hr/ats';

interface Job {
  _id: string; title: string; department: string; location: string;
  employment_type: string; status: string; application_count: number;
  views_count: number; pipeline_stages: { name: string; order: number }[];
  published_at?: string; closes_at?: string; salary_range?: any;
}

interface Application {
  _id: string; candidate_name: string; candidate_email: string;
  candidate_phone: string; source: string; current_stage: string;
  rating: number; status: string; tags: string[];
  interview_scores: any[]; stage_history: any[]; offer?: any;
  resume_url?: string; cover_letter?: string; job_id?: any;
}

interface Interview {
  _id: string; interview_type: string; scheduled_at: string;
  duration_minutes: number; location: string; meeting_link: string;
  status: string; application_id?: any; interviewers: any[];
}

type Tab = 'jobs' | 'pipeline' | 'analytics';

const badge = (_text: string, color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 12,
  fontSize: 12, fontWeight: 600, background: color, color: '#fff',
});

const statusColor: Record<string, string> = {
  draft: '#666', published: '#00C971', closed: '#e74c3c', on_hold: '#f39c12',
  active: '#00C971', hired: '#3498db', rejected: '#e74c3c', withdrawn: '#999',
};

const sourceLabel: Record<string, string> = {
  career_page: 'Career Page', linkedin: 'LinkedIn', referral: 'Referral',
  agency: 'Agency', indeed: 'Indeed', other: 'Other',
};

const cardStyle: React.CSSProperties = {
  background: '#141414', border: '1px solid #222', borderRadius: 10, padding: 20,
};

const inputStyle: React.CSSProperties = {
  background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '8px 12px',
  color: '#fff', fontSize: 14, width: '100%', outline: 'none',
};

const btnPrimary: React.CSSProperties = {
  background: '#00C971', color: '#000', border: 'none', borderRadius: 6,
  padding: '8px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 14,
};

const btnSecondary: React.CSSProperties = {
  background: 'transparent', color: '#aaa', border: '1px solid #333',
  borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13,
};

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts,
  });
  return res.json();
}

export const ATS: React.FC = () => {
  const [tab, setTab] = useState<Tab>('jobs');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [_applications, setApplications] = useState<Application[]>([]);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [pipelineData, setPipelineData] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showNewJob, setShowNewJob] = useState(false);
  const [showNewApp, setShowNewApp] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [showOffer, setShowOffer] = useState(false);

  const [newJob, setNewJob] = useState({ title: '', department: '', location: '', employment_type: 'full_time', description: '', requirements: '', skills_required: '' });
  const [newApp, setNewApp] = useState({ candidate_name: '', candidate_email: '', candidate_phone: '', source: 'career_page', cover_letter: '' });
  const [newInterview, setNewInterview] = useState({ interview_type: 'phone_screen', scheduled_at: '', duration_minutes: 60, meeting_link: '' });
  const [offerData, setOfferData] = useState({ salary: '', start_date: '', benefits: '' });

  const loadJobs = useCallback(async () => {
    const data = await api('/jobs' + (search ? `?search=${search}` : ''));
    setJobs(data);
  }, [search]);

  const loadApplications = useCallback(async (jobId: string) => {
    const data = await api(`/applications?job_id=${jobId}`);
    setApplications(data);
  }, []);

  const loadPipeline = useCallback(async (jobId: string) => {
    const data = await api(`/pipeline/${jobId}`);
    setPipelineData(data);
  }, []);

  const loadAnalytics = useCallback(async () => {
    const data = await api('/analytics');
    setAnalytics(data);
  }, []);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  useEffect(() => {
    if (tab === 'analytics') loadAnalytics();
  }, [tab, loadAnalytics]);

  const handleCreateJob = async () => {
    await api('/jobs', {
      method: 'POST',
      body: JSON.stringify({
        ...newJob,
        requirements: newJob.requirements.split('\n').filter(Boolean),
        skills_required: newJob.skills_required.split(',').map(s => s.trim()).filter(Boolean),
      }),
    });
    setShowNewJob(false);
    setNewJob({ title: '', department: '', location: '', employment_type: 'full_time', description: '', requirements: '', skills_required: '' });
    loadJobs();
  };

  const handlePublish = async (id: string) => {
    await api(`/jobs/${id}/publish`, { method: 'POST' });
    loadJobs();
  };

  const handleCloseJob = async (id: string) => {
    await api(`/jobs/${id}/close`, { method: 'POST' });
    loadJobs();
  };

  const selectJob = (job: Job) => {
    setSelectedJob(job);
    setSelectedApp(null);
    loadApplications(job._id);
    loadPipeline(job._id);
    setTab('pipeline');
  };

  const handleCreateApp = async () => {
    if (!selectedJob) return;
    await api('/applications', {
      method: 'POST',
      body: JSON.stringify({ ...newApp, job_id: selectedJob._id }),
    });
    setShowNewApp(false);
    setNewApp({ candidate_name: '', candidate_email: '', candidate_phone: '', source: 'career_page', cover_letter: '' });
    loadApplications(selectedJob._id);
    loadPipeline(selectedJob._id);
  };

  const handleMoveStage = async (appId: string, stage: string) => {
    await api(`/applications/${appId}/move-stage`, { method: 'POST', body: JSON.stringify({ stage }) });
    if (selectedJob) { loadApplications(selectedJob._id); loadPipeline(selectedJob._id); }
  };

  const handleRate = async (appId: string, rating: number) => {
    await api(`/applications/${appId}/rate`, { method: 'POST', body: JSON.stringify({ rating }) });
    if (selectedJob) loadApplications(selectedJob._id);
  };

  const handleReject = async (appId: string) => {
    await api(`/applications/${appId}/reject`, { method: 'POST', body: JSON.stringify({ rejection_reason: 'Not a fit at this time' }) });
    if (selectedJob) { loadApplications(selectedJob._id); loadPipeline(selectedJob._id); }
  };

  const handleMakeOffer = async () => {
    if (!selectedApp) return;
    await api(`/applications/${selectedApp._id}/make-offer`, {
      method: 'POST',
      body: JSON.stringify({ salary: Number(offerData.salary), start_date: offerData.start_date, benefits: offerData.benefits }),
    });
    setShowOffer(false);
    if (selectedJob) { loadApplications(selectedJob._id); loadPipeline(selectedJob._id); }
  };

  const handleScheduleInterview = async () => {
    if (!selectedApp || !selectedJob) return;
    await api('/interviews', {
      method: 'POST',
      body: JSON.stringify({ ...newInterview, application_id: selectedApp._id, job_id: selectedJob._id }),
    });
    setShowSchedule(false);
    const data = await api(`/interviews?application_id=${selectedApp._id}`);
    setInterviews(data);
  };

  const renderStars = (rating: number, appId: string) => (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={14} fill={i <= rating ? '#f1c40f' : 'none'} color={i <= rating ? '#f1c40f' : '#555'}
          style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleRate(appId, i); }} />
      ))}
    </span>
  );

  // ---- RENDER ----
  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#fff' }}>Applicant Tracking System</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>Manage job postings, candidates, and hiring pipeline</p>
        </div>
        <button style={btnPrimary} onClick={() => setShowNewJob(true)}><Plus size={16} style={{ marginRight: 6 }} />New Job Posting</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([['jobs', 'Job Postings', Briefcase], ['pipeline', 'Pipeline', Users], ['analytics', 'Analytics', BarChart3]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            ...btnSecondary,
            background: tab === key ? '#00C971' : 'transparent',
            color: tab === key ? '#000' : '#aaa',
            borderColor: tab === key ? '#00C971' : '#333',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><Icon size={15} />{label}</button>
        ))}
      </div>

      {/* JOBS TAB */}
      {tab === 'jobs' && (
        <div>
          <div style={{ marginBottom: 16, position: 'relative', maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#666' }} />
            <input placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ ...inputStyle, paddingLeft: 36 }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
            {jobs.map(job => (
              <div key={job._id} style={{ ...cardStyle, cursor: 'pointer', transition: 'border-color 0.2s' }}
                onClick={() => selectJob(job)}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#00C971')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#222')}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{job.title}</h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 6, color: '#888', fontSize: 13 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Building size={13} />{job.department || 'General'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><MapPin size={13} />{job.location || 'Remote'}</span>
                    </div>
                  </div>
                  <span style={badge(job.status, statusColor[job.status] || '#666')}>{job.status}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#888', fontSize: 13 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={13} />{job.application_count} applicants</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={13} />{job.views_count} views</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {job.status === 'draft' && <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={e => { e.stopPropagation(); handlePublish(job._id); }}>Publish</button>}
                    {job.status === 'published' && <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12, borderColor: '#e74c3c', color: '#e74c3c' }} onClick={e => { e.stopPropagation(); handleCloseJob(job._id); }}>Close</button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PIPELINE TAB */}
      {tab === 'pipeline' && selectedJob && pipelineData && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <h2 style={{ margin: 0, color: '#fff', fontSize: 20 }}>{selectedJob.title}</h2>
              <p style={{ margin: '4px 0 0', color: '#888', fontSize: 13 }}>{selectedJob.department} - {selectedJob.location}</p>
            </div>
            <button style={btnPrimary} onClick={() => setShowNewApp(true)}><Plus size={14} style={{ marginRight: 4 }} />Add Applicant</button>
          </div>

          {/* Kanban */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
            {(pipelineData.pipeline || []).map((stage: any) => (
              <div key={stage.name} style={{ minWidth: 260, maxWidth: 280, flex: '0 0 260px' }}>
                <div style={{ background: '#1a1a1a', borderRadius: '8px 8px 0 0', padding: '10px 14px', borderBottom: '2px solid #00C971', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#fff' }}>{stage.name}</span>
                  <span style={{ ...badge(String(stage.count), '#333'), color: '#aaa' }}>{stage.count}</span>
                </div>
                <div style={{ background: '#111', borderRadius: '0 0 8px 8px', padding: 8, minHeight: 200, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(stage.applications || []).map((app: Application) => (
                    <div key={app._id} style={{ background: '#1a1a1a', border: '1px solid #222', borderRadius: 8, padding: 12, cursor: 'pointer' }}
                      onClick={async () => {
                        setSelectedApp(app);
                        const data = await api(`/interviews?application_id=${app._id}`);
                        setInterviews(data);
                      }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#fff', marginBottom: 4 }}>{app.candidate_name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>{app.candidate_email}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {renderStars(app.rating, app._id)}
                        <span style={{ fontSize: 11, color: '#666' }}>{sourceLabel[app.source] || app.source}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Application Detail Panel */}
          {selectedApp && (
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{selectedApp.candidate_name}</h3>
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, color: '#888', fontSize: 13 }}>
                    <span>{selectedApp.candidate_email}</span>
                    {selectedApp.candidate_phone && <span><Phone size={12} /> {selectedApp.candidate_phone}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={btnPrimary} onClick={() => setShowSchedule(true)}><Calendar size={14} style={{ marginRight: 4 }} />Schedule Interview</button>
                  <button style={{ ...btnPrimary, background: '#3498db' }} onClick={() => { setShowOffer(true); setOfferData({ salary: '', start_date: '', benefits: '' }); }}><Send size={14} style={{ marginRight: 4 }} />Make Offer</button>
                  <button style={{ ...btnSecondary, borderColor: '#e74c3c', color: '#e74c3c' }} onClick={() => handleReject(selectedApp._id)}><UserX size={14} style={{ marginRight: 4 }} />Reject</button>
                  <button style={btnSecondary} onClick={() => setSelectedApp(null)}><X size={14} /></button>
                </div>
              </div>

              {/* Stage move buttons */}
              <div style={{ marginBottom: 16 }}>
                <span style={{ fontSize: 13, color: '#888', marginRight: 8 }}>Move to:</span>
                {(selectedJob.pipeline_stages || []).sort((a, b) => a.order - b.order).map(s => (
                  <button key={s.name} onClick={() => handleMoveStage(selectedApp._id, s.name)} style={{
                    ...btnSecondary, padding: '4px 10px', fontSize: 12, marginRight: 6,
                    background: selectedApp.current_stage === s.name ? '#00C971' : 'transparent',
                    color: selectedApp.current_stage === s.name ? '#000' : '#aaa',
                  }}>{s.name}</button>
                ))}
              </div>

              {/* Stage history timeline */}
              <div style={{ marginBottom: 16 }}>
                <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Stage History</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {(selectedApp.stage_history || []).map((h: any, i: number) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: 6, padding: '4px 10px', fontSize: 12 }}>
                        <span style={{ color: '#00C971', fontWeight: 600 }}>{h.stage}</span>
                        <span style={{ color: '#666', marginLeft: 6 }}>{new Date(h.entered_at).toLocaleDateString()}</span>
                      </div>
                      {i < (selectedApp.stage_history || []).length - 1 && <ArrowRight size={12} color="#555" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Interview scores */}
              {selectedApp.interview_scores?.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Interview Scores</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 10 }}>
                    {selectedApp.interview_scores.map((score: any, i: number) => (
                      <div key={i} style={{ background: '#1a1a1a', borderRadius: 6, padding: 12, border: '1px solid #222' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Score: {score.overall_score}/100</div>
                        {score.criteria?.map((c: any, j: number) => (
                          <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginTop: 2 }}>
                            <span>{c.name}</span><span>{c.score}/{c.max_score}</span>
                          </div>
                        ))}
                        {score.feedback && <div style={{ fontSize: 12, color: '#aaa', marginTop: 6, fontStyle: 'italic' }}>{score.feedback}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scheduled interviews */}
              {interviews.length > 0 && (
                <div>
                  <h4 style={{ color: '#fff', fontSize: 14, marginBottom: 8 }}>Scheduled Interviews</h4>
                  {interviews.map(iv => (
                    <div key={iv._id} style={{ background: '#1a1a1a', borderRadius: 6, padding: 10, border: '1px solid #222', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>{iv.interview_type.replace('_', ' ')}</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 12 }}><Clock size={11} /> {new Date(iv.scheduled_at).toLocaleString()}</span>
                        <span style={{ color: '#888', fontSize: 12, marginLeft: 12 }}>{iv.duration_minutes}min</span>
                      </div>
                      <span style={badge(iv.status, statusColor[iv.status] || '#666')}>{iv.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Offer section */}
              {selectedApp.offer?.status && (
                <div style={{ marginTop: 16, background: '#1a2a1a', borderRadius: 8, padding: 14, border: '1px solid #2a4a2a' }}>
                  <h4 style={{ color: '#00C971', fontSize: 14, margin: '0 0 8px' }}>Offer Details</h4>
                  <div style={{ display: 'flex', gap: 24, fontSize: 13, color: '#ccc' }}>
                    <span>Salary: ${selectedApp.offer.salary?.toLocaleString()}</span>
                    <span>Start: {selectedApp.offer.start_date ? new Date(selectedApp.offer.start_date).toLocaleDateString() : 'TBD'}</span>
                    <span>Status: <span style={{ color: statusColor[selectedApp.offer.status] || '#fff', fontWeight: 600 }}>{selectedApp.offer.status}</span></span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'pipeline' && !selectedJob && (
        <div style={{ ...cardStyle, textAlign: 'center', padding: 60 }}>
          <Briefcase size={48} color="#333" />
          <p style={{ color: '#666', marginTop: 12 }}>Select a job posting from the Jobs tab to view its pipeline</p>
        </div>
      )}

      {/* ANALYTICS TAB */}
      {tab === 'analytics' && analytics && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Applications', value: analytics.total_applications, color: '#00C971' },
              { label: 'Total Hired', value: analytics.total_hired, color: '#3498db' },
              { label: 'Active Jobs', value: analytics.active_jobs, color: '#f39c12' },
              { label: 'Avg Time to Hire', value: `${analytics.avg_time_to_hire_days}d`, color: '#9b59b6' },
            ].map((stat, i) => (
              <div key={i} style={cardStyle}>
                <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>{stat.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Source effectiveness */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16 }}>Source Effectiveness</h3>
              {analytics.source_effectiveness && (() => {
                const sources = Object.entries(analytics.source_effectiveness) as [string, { total: number; hired: number }][];
                const total = sources.reduce((s, [, v]) => s + v.total, 0);
                const colors = ['#00C971', '#3498db', '#f39c12', '#e74c3c', '#9b59b6', '#1abc9c'];
                let offset = 0;
                return (
                  <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                    <svg width={140} height={140} viewBox="0 0 140 140">
                      {sources.map(([, v], i) => {
                        const pct = total > 0 ? v.total / total : 0;
                        const dashArray = pct * 377;
                        const dashOffset = -offset * 377;
                        offset += pct;
                        return <circle key={i} cx={70} cy={70} r={60} fill="none" stroke={colors[i % colors.length]}
                          strokeWidth={20} strokeDasharray={`${dashArray} ${377 - dashArray}`} strokeDashoffset={dashOffset}
                          transform="rotate(-90 70 70)" />;
                      })}
                    </svg>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sources.map(([name, v], i) => (
                        <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: colors[i % colors.length] }} />
                          <span style={{ color: '#ccc' }}>{sourceLabel[name] || name}</span>
                          <span style={{ color: '#888' }}>{v.total} ({v.hired} hired)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Pipeline conversion */}
            <div style={cardStyle}>
              <h3 style={{ margin: '0 0 16px', color: '#fff', fontSize: 16 }}>Pipeline Conversion</h3>
              {(analytics.pipeline_conversion || []).map((stage: any, _i: number) => {
                const maxCount = Math.max(...(analytics.pipeline_conversion || []).map((s: any) => s.count), 1);
                return (
                  <div key={stage.stage} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#ccc', marginBottom: 4 }}>
                      <span>{stage.stage}</span><span>{stage.count}</span>
                    </div>
                    <div style={{ background: '#222', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{ background: '#00C971', height: '100%', width: `${(stage.count / maxCount) * 100}%`, borderRadius: 4, transition: 'width 0.3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      {showNewJob && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 500, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>New Job Posting</h3>
              <X size={18} color="#888" style={{ cursor: 'pointer' }} onClick={() => setShowNewJob(false)} />
            </div>
            {[['title', 'Job Title'], ['department', 'Department'], ['location', 'Location']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{l}</label>
                <input style={inputStyle} value={(newJob as any)[k]} onChange={e => setNewJob({ ...newJob, [k]: e.target.value })} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Type</label>
              <select style={inputStyle} value={newJob.employment_type} onChange={e => setNewJob({ ...newJob, employment_type: e.target.value })}>
                <option value="full_time">Full Time</option><option value="part_time">Part Time</option>
                <option value="contract">Contract</option><option value="intern">Intern</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea style={{ ...inputStyle, height: 80, resize: 'vertical' }} value={newJob.description} onChange={e => setNewJob({ ...newJob, description: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Requirements (one per line)</label>
              <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={newJob.requirements} onChange={e => setNewJob({ ...newJob, requirements: e.target.value })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Skills (comma separated)</label>
              <input style={inputStyle} value={newJob.skills_required} onChange={e => setNewJob({ ...newJob, skills_required: e.target.value })} />
            </div>
            <button style={btnPrimary} onClick={handleCreateJob}>Create Job Posting</button>
          </div>
        </div>
      )}

      {showNewApp && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Add Applicant</h3>
              <X size={18} color="#888" style={{ cursor: 'pointer' }} onClick={() => setShowNewApp(false)} />
            </div>
            {[['candidate_name', 'Full Name'], ['candidate_email', 'Email'], ['candidate_phone', 'Phone']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{l}</label>
                <input style={inputStyle} value={(newApp as any)[k]} onChange={e => setNewApp({ ...newApp, [k]: e.target.value })} />
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Source</label>
              <select style={inputStyle} value={newApp.source} onChange={e => setNewApp({ ...newApp, source: e.target.value })}>
                {Object.entries(sourceLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Cover Letter</label>
              <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={newApp.cover_letter} onChange={e => setNewApp({ ...newApp, cover_letter: e.target.value })} />
            </div>
            <button style={btnPrimary} onClick={handleCreateApp}>Add Applicant</button>
          </div>
        </div>
      )}

      {showSchedule && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Schedule Interview</h3>
              <X size={18} color="#888" style={{ cursor: 'pointer' }} onClick={() => setShowSchedule(false)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Type</label>
              <select style={inputStyle} value={newInterview.interview_type} onChange={e => setNewInterview({ ...newInterview, interview_type: e.target.value })}>
                <option value="phone_screen">Phone Screen</option><option value="technical">Technical</option>
                <option value="behavioral">Behavioral</option><option value="panel">Panel</option><option value="final">Final</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Date & Time</label>
              <input type="datetime-local" style={inputStyle} value={newInterview.scheduled_at} onChange={e => setNewInterview({ ...newInterview, scheduled_at: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Duration (min)</label>
              <input type="number" style={inputStyle} value={newInterview.duration_minutes} onChange={e => setNewInterview({ ...newInterview, duration_minutes: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Meeting Link</label>
              <input style={inputStyle} value={newInterview.meeting_link} onChange={e => setNewInterview({ ...newInterview, meeting_link: e.target.value })} />
            </div>
            <button style={btnPrimary} onClick={handleScheduleInterview}>Schedule</button>
          </div>
        </div>
      )}

      {showOffer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>Make Offer</h3>
              <X size={18} color="#888" style={{ cursor: 'pointer' }} onClick={() => setShowOffer(false)} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Salary</label>
              <input type="number" style={inputStyle} value={offerData.salary} onChange={e => setOfferData({ ...offerData, salary: e.target.value })} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="date" style={inputStyle} value={offerData.start_date} onChange={e => setOfferData({ ...offerData, start_date: e.target.value })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Benefits</label>
              <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={offerData.benefits} onChange={e => setOfferData({ ...offerData, benefits: e.target.value })} />
            </div>
            <button style={btnPrimary} onClick={handleMakeOffer}>Send Offer</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ATS;
