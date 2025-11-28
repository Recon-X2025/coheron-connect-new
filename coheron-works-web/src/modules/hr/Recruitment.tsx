import { useState, useEffect } from 'react';
import { Mail, Star, Plus, Search, Filter, Briefcase, Download } from 'lucide-react';
import { KanbanBoard } from '../../shared/views/KanbanBoard';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { apiService } from '../../services/apiService';
import { JobPostingForm } from './components/JobPostingForm';
import './Recruitment.css';

const RECRUITMENT_STAGES = [
  { id: 1, title: 'Initial Qualification', color: '#64748b' },
  { id: 2, title: 'First Interview', color: '#3b82f6' },
  { id: 3, title: 'Second Interview', color: '#8b5cf6' },
  { id: 4, title: 'Contract Proposal', color: '#10b981' },
  { id: 5, title: 'Contract Signed', color: '#059669' },
];

export const Recruitment = () => {
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showJobForm, setShowJobForm] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await apiService.get<any>('/applicants');
      setApplicants(data);
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async (id: number, newStageId: string) => {
    setApplicants(prev => prev.map(a =>
      a.id === id ? { ...a, stage_id: Number(newStageId) } : a
    ));
    await apiService.update('/applicants', id, { stage_id: Number(newStageId) });
  };

  const renderCard = (applicant: any) => (
    <div className="applicant-card">
      <div className="applicant-header">
        <h4>{applicant.partner_name}</h4>
        <div className="priority-stars">
          {[...Array(Number(applicant.priority))].map((_, i) => (
            <Star key={i} size={12} className="star-filled" />
          ))}
        </div>
      </div>
      <p className="job-title">{applicant.name}</p>
      <div className="applicant-meta">
        <Mail size={12} />
        <span>{applicant.email_from}</span>
      </div>
      <div className="applicant-actions">
        <Button variant="ghost" size="sm">View</Button>
        <Button variant="ghost" size="sm">Schedule</Button>
      </div>
    </div>
  );

  const jobPostings = [
    { id: 1, title: 'Senior Full Stack Developer', department: 'Engineering', applicants: 45, status: 'active' },
    { id: 2, title: 'HR Manager', department: 'HR', applicants: 23, status: 'active' },
    { id: 3, title: 'Sales Executive', department: 'Sales', applicants: 12, status: 'closed' },
  ];

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="recruitment-page">
      <div className="container">
        <div className="recruitment-header">
          <div>
            <h1>Recruitment & ATS</h1>
            <p className="recruitment-subtitle">Applicant tracking and job postings</p>
          </div>
          <div className="header-actions">
            <Button variant="secondary" icon={<Download size={18} />}>
              Export
            </Button>
            <Button icon={<Plus size={18} />} onClick={() => setShowJobForm(true)}>
              Post Job
            </Button>
          </div>
        </div>

        <div className="recruitment-tabs">
          <button className="tab active">Applicants</button>
          <button className="tab">Job Postings</button>
          <button className="tab">Interviews</button>
          <button className="tab">Offers</button>
        </div>

        <div className="recruitment-toolbar">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search applicants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="secondary" icon={<Filter size={18} />}>
            Filter
          </Button>
          <div className="view-toggle">
            <button
              className={viewMode === 'kanban' ? 'active' : ''}
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          <div className="kanban-container">
            <KanbanBoard
              columns={RECRUITMENT_STAGES.map(s => ({ ...s, id: String(s.id) }))}
              items={applicants.map(a => ({ ...a, stage: String(a.stage_id) }))}
              onItemMove={(id, stage) => handleMove(id, stage)}
              renderCard={renderCard as any}
            />
          </div>
        ) : (
          <Card>
            <table className="applicants-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Position</th>
                  <th>Email</th>
                  <th>Stage</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applicants.map((applicant) => (
                  <tr key={applicant.id}>
                    <td>{applicant.partner_name}</td>
                    <td>{applicant.name}</td>
                    <td>{applicant.email_from}</td>
                    <td>
                      <span className="stage-badge">
                        {RECRUITMENT_STAGES.find(s => s.id === applicant.stage_id)?.title || 'Unknown'}
                      </span>
                    </td>
                    <td>
                      <div className="priority-stars">
                        {[...Array(Number(applicant.priority))].map((_, i) => (
                          <Star key={i} size={12} className="star-filled" />
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button variant="ghost" size="sm">View</Button>
                        <Button variant="ghost" size="sm">Schedule</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Card className="job-postings-section">
          <div className="section-header">
            <h3>Active Job Postings</h3>
            <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setShowJobForm(true)}>
              New Posting
            </Button>
          </div>
          <div className="job-postings-grid">
            {jobPostings.map((job) => (
              <div key={job.id} className="job-posting-card">
                <div className="job-header">
                  <Briefcase size={24} />
                  <span className={`status-badge ${job.status}`}>
                    {job.status === 'active' ? 'Active' : 'Closed'}
                  </span>
                </div>
                <h4>{job.title}</h4>
                <p className="job-department">{job.department}</p>
                <div className="job-stats">
                  <span>{job.applicants} applicants</span>
                </div>
                <div className="job-actions">
                  <Button variant="secondary" size="sm">View Applicants</Button>
                  <Button variant="secondary" size="sm">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {showJobForm && (
          <JobPostingForm
            onClose={() => setShowJobForm(false)}
            onSave={() => {
              setShowJobForm(false);
              loadData();
            }}
          />
        )}
      </div>
    </div>
  );
};
