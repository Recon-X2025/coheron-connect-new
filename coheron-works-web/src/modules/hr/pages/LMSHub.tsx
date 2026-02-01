import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Award, Users, TrendingUp, AlertTriangle, Trophy,
  ChevronRight, Search, Plus, X, CheckCircle, Clock, BarChart3,
  Grid, Shield, GraduationCap
} from 'lucide-react';

const API = '/api/hr/lms';

interface LearningPath {
  _id: string; name: string; description: string; category: string;
  difficulty: string; estimated_hours: number; skills: string[];
  enrollment_count: number; completion_rate: number; is_published: boolean;
  courses: any[];
}

interface CertRecord {
  _id: string; certification_id: any; employee_id: any;
  status: string; earned_at?: string; expires_at?: string; score: number;
}

interface Enrollment {
  _id: string; path_id: any; employee_id: any;
  status: string; progress_pct: number; started_at?: string; completed_at?: string;
}

type Tab = 'paths' | 'certifications' | 'skills' | 'compliance' | 'leaderboard';

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

const badge = (text: string, color: string): React.CSSProperties => ({
  display: 'inline-block', padding: '2px 10px', borderRadius: 12,
  fontSize: 12, fontWeight: 600, background: color, color: '#fff',
});

const difficultyColor: Record<string, string> = {
  beginner: '#00C971', intermediate: '#f39c12', advanced: '#e74c3c',
};

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...opts,
  });
  return res.json();
}

export const LMSHub: React.FC = () => {
  const [tab, setTab] = useState<Tab>('paths');
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [expiring, setExpiring] = useState<CertRecord[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);
  const [skillGap, setSkillGap] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [showNewPath, setShowNewPath] = useState(false);
  const [showNewCert, setShowNewCert] = useState(false);

  const [newPath, setNewPath] = useState({ name: '', description: '', category: '', difficulty: 'beginner', estimated_hours: 0, skills: '' });
  const [newCert, setNewCert] = useState({ name: '', description: '', issuing_authority: 'Internal', validity_months: 12 });

  const loadPaths = useCallback(async () => {
    const data = await api('/paths' + (search ? `?search=${search}` : ''));
    setPaths(data);
  }, [search]);

  const loadCerts = useCallback(async () => {
    const data = await api('/certifications');
    setCertifications(data);
  }, []);

  const loadExpiring = useCallback(async () => {
    const data = await api('/expiring-certifications?days=60');
    setExpiring(data);
  }, []);

  const loadLeaderboard = useCallback(async () => {
    const data = await api('/leaderboard');
    setLeaderboard(data);
  }, []);

  const loadCompliance = useCallback(async () => {
    const data = await api('/compliance-training-status');
    setCompliance(data);
  }, []);

  const loadSkillGap = useCallback(async () => {
    const data = await api('/skill-gap-analysis');
    setSkillGap(data);
  }, []);

  useEffect(() => { loadPaths(); loadExpiring(); loadLeaderboard(); }, [loadPaths, loadExpiring, loadLeaderboard]);
  useEffect(() => { if (tab === 'certifications') loadCerts(); }, [tab, loadCerts]);
  useEffect(() => { if (tab === 'compliance') loadCompliance(); }, [tab, loadCompliance]);
  useEffect(() => { if (tab === 'skills') loadSkillGap(); }, [tab, loadSkillGap]);

  const handleCreatePath = async () => {
    await api('/paths', {
      method: 'POST',
      body: JSON.stringify({ ...newPath, skills: newPath.skills.split(',').map(s => s.trim()).filter(Boolean) }),
    });
    setShowNewPath(false);
    setNewPath({ name: '', description: '', category: '', difficulty: 'beginner', estimated_hours: 0, skills: '' });
    loadPaths();
  };

  const handlePublishPath = async (id: string) => {
    await api(`/paths/${id}/publish`, { method: 'POST' });
    loadPaths();
  };

  const handleCreateCert = async () => {
    await api('/certifications', { method: 'POST', body: JSON.stringify(newCert) });
    setShowNewCert(false);
    setNewCert({ name: '', description: '', issuing_authority: 'Internal', validity_months: 12 });
    loadCerts();
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', color: '#e0e0e0', padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, color: '#fff' }}>Learning Management Hub</h1>
          <p style={{ margin: '4px 0 0', color: '#888', fontSize: 14 }}>Learning paths, certifications, skill development and compliance</p>
        </div>
      </div>

      {/* Expiring certs alert */}
      {expiring.length > 0 && (
        <div style={{ background: '#2a1a0a', border: '1px solid #4a3a1a', borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} color="#f39c12" />
          <span style={{ color: '#f39c12', fontWeight: 600, fontSize: 14 }}>{expiring.length} certifications expiring in the next 60 days</span>
          <button style={{ ...btnSecondary, marginLeft: 'auto', padding: '4px 12px', fontSize: 12 }} onClick={() => setTab('certifications')}>View Details</button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {([
          ['paths', 'Learning Paths', BookOpen],
          ['certifications', 'Certifications', Award],
          ['skills', 'Skill Matrix', Grid],
          ['compliance', 'Compliance', Shield],
          ['leaderboard', 'Leaderboard', Trophy],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key as Tab)} style={{
            ...btnSecondary,
            background: tab === key ? '#00C971' : 'transparent',
            color: tab === key ? '#000' : '#aaa',
            borderColor: tab === key ? '#00C971' : '#333',
            display: 'flex', alignItems: 'center', gap: 6,
          }}><Icon size={15} />{label}</button>
        ))}
      </div>

      {/* LEARNING PATHS TAB */}
      {tab === 'paths' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ position: 'relative', maxWidth: 400, flex: 1 }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#666' }} />
              <input placeholder="Search learning paths..." value={search} onChange={e => setSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: 36 }} />
            </div>
            <button style={btnPrimary} onClick={() => setShowNewPath(true)}><Plus size={16} style={{ marginRight: 6 }} />New Path</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {paths.map(path => (
              <div key={path._id} style={{ ...cardStyle, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16, color: '#fff' }}>{path.name}</h3>
                    {path.category && <span style={{ fontSize: 12, color: '#888' }}>{path.category}</span>}
                  </div>
                  <span style={badge(path.difficulty, difficultyColor[path.difficulty] || '#666')}>{path.difficulty}</span>
                </div>
                <p style={{ fontSize: 13, color: '#aaa', margin: '0 0 12px', flex: 1, lineHeight: 1.5 }}>{path.description || 'No description'}</p>

                {/* Progress bar */}
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888', marginBottom: 4 }}>
                    <span>Completion Rate</span><span>{path.completion_rate}%</span>
                  </div>
                  <div style={{ background: '#222', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#00C971', height: '100%', width: `${path.completion_rate}%`, borderRadius: 4 }} />
                  </div>
                </div>

                {/* Skills */}
                {path.skills.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {path.skills.slice(0, 4).map(s => (
                      <span key={s} style={{ background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 4, padding: '2px 8px', fontSize: 11, color: '#00C971' }}>{s}</span>
                    ))}
                    {path.skills.length > 4 && <span style={{ fontSize: 11, color: '#666' }}>+{path.skills.length - 4}</span>}
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: '#888' }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Clock size={12} />{path.estimated_hours}h</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Users size={12} />{path.enrollment_count} enrolled</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><BookOpen size={12} />{path.courses?.length || 0} courses</span>
                  </div>
                  {!path.is_published && (
                    <button style={{ ...btnSecondary, padding: '4px 10px', fontSize: 12 }} onClick={() => handlePublishPath(path._id)}>Publish</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CERTIFICATIONS TAB */}
      {tab === 'certifications' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button style={btnPrimary} onClick={() => setShowNewCert(true)}><Plus size={16} style={{ marginRight: 6 }} />New Certification</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Cert catalog */}
            <div>
              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>Certification Catalog</h3>
              {certifications.map(cert => (
                <div key={cert._id} style={{ ...cardStyle, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Award size={16} color="#f39c12" />
                        <span style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>{cert.name}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                        {cert.issuing_authority} | Valid {cert.validity_months} months
                        {cert.renewal_required && <span style={{ color: '#f39c12', marginLeft: 8 }}>Renewal required</span>}
                      </div>
                    </div>
                    <span style={badge(cert.status, cert.status === 'active' ? '#00C971' : '#666')}>{cert.status}</span>
                  </div>
                  {cert.description && <p style={{ fontSize: 13, color: '#aaa', margin: '8px 0 0' }}>{cert.description}</p>}
                </div>
              ))}
              {certifications.length === 0 && <p style={{ color: '#666' }}>No certifications yet</p>}
            </div>

            {/* Expiring */}
            <div>
              <h3 style={{ color: '#fff', fontSize: 16, marginBottom: 12 }}>Expiring Certifications</h3>
              {expiring.map(rec => (
                <div key={rec._id} style={{ ...cardStyle, marginBottom: 10, borderColor: '#4a3a1a' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: '#fff', fontSize: 14 }}>{rec.certification_id?.name || 'Unknown'}</span>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{rec.employee_id?.name || 'Unknown'} - {rec.employee_id?.email || ''}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#e74c3c', fontWeight: 600 }}>
                        Expires {rec.expires_at ? new Date(rec.expires_at).toLocaleDateString() : 'N/A'}
                      </div>
                      <div style={{ fontSize: 11, color: '#888' }}>
                        {rec.expires_at ? Math.ceil((new Date(rec.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0} days left
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {expiring.length === 0 && <p style={{ color: '#666' }}>No expiring certifications</p>}
            </div>
          </div>
        </div>
      )}

      {/* SKILL MATRIX TAB */}
      {tab === 'skills' && skillGap && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: '#888' }}>Total Certifications</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#00C971' }}>{skillGap.total_certifications}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: '#888' }}>Certified Employees</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#3498db' }}>{skillGap.total_certified_employees}</div>
            </div>
            <div style={cardStyle}>
              <div style={{ fontSize: 13, color: '#888' }}>Available Skills</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#f39c12' }}>{skillGap.available_skills?.length || 0}</div>
            </div>
          </div>

          {/* Certification coverage as skill matrix */}
          <div style={cardStyle}>
            <h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 16px' }}>Certification Coverage Matrix</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>Certification</th>
                    <th style={{ textAlign: 'center', padding: '8px 12px', borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>Holders</th>
                    <th style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '1px solid #333', color: '#888', fontSize: 13 }}>Coverage</th>
                  </tr>
                </thead>
                <tbody>
                  {(skillGap.certification_coverage || []).map((c: any, i: number) => {
                    const maxHolders = Math.max(...(skillGap.certification_coverage || []).map((x: any) => x.holders), 1);
                    const pct = Math.round((c.holders / maxHolders) * 100);
                    const color = pct > 66 ? '#00C971' : pct > 33 ? '#f39c12' : '#e74c3c';
                    return (
                      <tr key={i}>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a1a', color: '#fff', fontSize: 14 }}>{c.certification}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a1a', textAlign: 'center', color: '#ccc', fontSize: 14 }}>{c.holders}</td>
                        <td style={{ padding: '10px 12px', borderBottom: '1px solid #1a1a1a', width: '40%' }}>
                          <div style={{ background: '#222', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ background: color, height: '100%', width: `${pct}%`, borderRadius: 4 }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Skills list */}
          {skillGap.available_skills?.length > 0 && (
            <div style={{ ...cardStyle, marginTop: 16 }}>
              <h3 style={{ color: '#fff', fontSize: 16, margin: '0 0 12px' }}>Available Skills</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {skillGap.available_skills.map((s: string) => (
                  <span key={s} style={{ background: '#1a2a1a', border: '1px solid #2a4a2a', borderRadius: 6, padding: '4px 12px', fontSize: 13, color: '#00C971' }}>{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* COMPLIANCE TAB */}
      {tab === 'compliance' && (
        <div>
          <h3 style={{ color: '#fff', fontSize: 18, marginBottom: 16 }}>Mandatory Training Compliance</h3>
          {compliance.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
              <Shield size={40} color="#333" />
              <p style={{ color: '#666', marginTop: 12 }}>No compliance training paths found. Create a learning path with category "compliance" to track mandatory training.</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {compliance.map((c: any) => (
              <div key={c.path_id} style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ margin: 0, color: '#fff', fontSize: 15 }}>{c.path_name}</h4>
                  <span style={{ fontSize: 24, fontWeight: 700, color: c.completion_rate >= 80 ? '#00C971' : c.completion_rate >= 50 ? '#f39c12' : '#e74c3c' }}>
                    {c.completion_rate}%
                  </span>
                </div>
                <div style={{ background: '#222', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{
                    background: c.completion_rate >= 80 ? '#00C971' : c.completion_rate >= 50 ? '#f39c12' : '#e74c3c',
                    height: '100%', width: `${c.completion_rate}%`, borderRadius: 4,
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                  <span style={{ color: '#00C971' }}><CheckCircle size={13} style={{ marginRight: 4 }} />{c.completed} completed</span>
                  <span style={{ color: '#f39c12' }}><Clock size={13} style={{ marginRight: 4 }} />{c.in_progress} in progress</span>
                  <span style={{ color: '#e74c3c' }}>{c.not_started} not started</span>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 8 }}>Total enrolled: {c.total_enrolled}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEADERBOARD TAB */}
      {tab === 'leaderboard' && (
        <div style={{ maxWidth: 600 }}>
          <h3 style={{ color: '#fff', fontSize: 18, marginBottom: 16 }}>Top Learners</h3>
          {leaderboard.map((entry, i) => (
            <div key={entry.employee_id} style={{
              ...cardStyle, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 16,
              borderColor: i < 3 ? ['#f1c40f', '#95a5a6', '#cd7f32'][i] : '#222',
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i < 3 ? ['#f1c40f', '#95a5a6', '#cd7f32'][i] : '#333',
                color: i < 3 ? '#000' : '#888', fontWeight: 700, fontSize: 16,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: '#fff', fontSize: 15 }}>{entry.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{entry.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: '#00C971' }}>{entry.completed}</div>
                <div style={{ fontSize: 11, color: '#888' }}>paths completed</div>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
              <Trophy size={40} color="#333" />
              <p style={{ color: '#666', marginTop: 12 }}>No completions yet. Enroll employees in learning paths to see the leaderboard.</p>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      {showNewPath && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>New Learning Path</h3>
              <X size={18} color="#888" style={{ cursor: 'pointer' }} onClick={() => setShowNewPath(false)} />
            </div>
            {[['name', 'Name'], ['description', 'Description'], ['category', 'Category (e.g. compliance, technical, soft-skills)']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{l}</label>
                {k === 'description' ? (
                  <textarea style={{ ...inputStyle, height: 60, resize: 'vertical' }} value={(newPath as any)[k]} onChange={e => setNewPath({ ...newPath, [k]: e.target.value })} />
                ) : (
                  <input style={inputStyle} value={(newPath as any)[k]} onChange={e => setNewPath({ ...newPath, [k]: e.target.value })} />
                )}
              </div>
            ))}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Difficulty</label>
              <select style={inputStyle} value={newPath.difficulty} onChange={e => setNewPath({ ...newPath, difficulty: e.target.value })}>
                <option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option>
              </select>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Estimated Hours</label>
              <input type="number" style={inputStyle} value={newPath.estimated_hours} onChange={e => setNewPath({ ...newPath, estimated_hours: Number(e.target.value) })} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Skills (comma separated)</label>
              <input style={inputStyle} value={newPath.skills} onChange={e => setNewPath({ ...newPath, skills: e.target.value })} />
            </div>
            <button style={btnPrimary} onClick={handleCreatePath}>Create Path</button>
          </div>
        </div>
      )}

      {showNewCert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ ...cardStyle, width: 440 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ margin: 0, color: '#fff' }}>New Certification</h3>
              <X size={18} color="#888" style={{ cursor: 'pointer' }} onClick={() => setShowNewCert(false)} />
            </div>
            {[['name', 'Certification Name'], ['description', 'Description'], ['issuing_authority', 'Issuing Authority']].map(([k, l]) => (
              <div key={k} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>{l}</label>
                <input style={inputStyle} value={(newCert as any)[k]} onChange={e => setNewCert({ ...newCert, [k]: e.target.value })} />
              </div>
            ))}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Validity (months)</label>
              <input type="number" style={inputStyle} value={newCert.validity_months} onChange={e => setNewCert({ ...newCert, validity_months: Number(e.target.value) })} />
            </div>
            <button style={btnPrimary} onClick={handleCreateCert}>Create Certification</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LMSHub;
