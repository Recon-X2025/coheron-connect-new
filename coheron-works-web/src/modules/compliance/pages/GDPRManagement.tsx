import { useState, useEffect, type FormEvent } from 'react';
import { FileText, Shield, Database, Clock, AlertTriangle } from 'lucide-react';

type Tab = 'consent' | 'dsars' | 'breaches' | 'processing' | 'retention';

const TABS: { key: Tab; label: string; icon: any }[] = [
  { key: 'consent', label: 'Consent', icon: FileText },
  { key: 'dsars', label: 'DSARs', icon: Shield },
  { key: 'breaches', label: 'Breaches', icon: AlertTriangle },
  { key: 'processing', label: 'Processing Activities', icon: Database },
  { key: 'retention', label: 'Retention Policies', icon: Clock },
];

const API_MAP: Record<Tab, string> = {
  consent: '/api/gdpr/consent',
  dsars: '/api/gdpr/dsar-requests',
  breaches: '/api/gdpr/breaches',
  processing: '/api/gdpr/processing-activities',
  retention: '/api/gdpr/retention-policies',
};

const headers = () => ({
  Authorization: `Bearer ${localStorage.getItem('authToken')}`,
  'Content-Type': 'application/json',
});

export default function GDPRManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('consent');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchData = () => {
    setLoading(true);
    fetch(API_MAP[activeTab], { headers: headers() })
      .then(r => r.json())
      .then(res => setData(Array.isArray(res) ? res : res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    setShowForm(false);
  }, [activeTab]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1><Shield size={24} /> GDPR Management</h1>
      </div>

      <div className="tab-bar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'tab-btn--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="section">
        <div className="section__header">
          <h2>{TABS.find(t => t.key === activeTab)?.label}</h2>
          <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New'}
          </button>
        </div>

        {showForm && <TabForm tab={activeTab} onDone={() => { setShowForm(false); fetchData(); }} />}

        {loading ? (
          <div className="page-loading">Loading...</div>
        ) : (
          <TabTable tab={activeTab} data={data} onRefresh={fetchData} />
        )}
      </div>
    </div>
  );
}

function TabForm({ tab, onDone }: { tab: Tab; onDone: () => void }) {
  const [form, setForm] = useState<Record<string, string>>({});
  const set = (k: string, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    fetch(API_MAP[tab], { method: 'POST', headers: headers(), body: JSON.stringify(form) })
      .then(() => onDone())
      .catch(() => {});
  };

  const fields: Record<Tab, { name: string; label: string; type?: string }[]> = {
    consent: [
      { name: 'purpose', label: 'Purpose' },
      { name: 'data_subject_email', label: 'Data Subject Email' },
      { name: 'legal_basis', label: 'Legal Basis' },
    ],
    dsars: [
      { name: 'subject_email', label: 'Subject Email' },
      { name: 'request_type', label: 'Request Type' },
      { name: 'description', label: 'Description' },
    ],
    breaches: [
      { name: 'title', label: 'Title' },
      { name: 'severity', label: 'Severity' },
      { name: 'description', label: 'Description' },
      { name: 'affected_records', label: 'Affected Records', type: 'number' },
    ],
    processing: [
      { name: 'name', label: 'Activity Name' },
      { name: 'purpose', label: 'Purpose' },
      { name: 'legal_basis', label: 'Legal Basis' },
      { name: 'data_categories', label: 'Data Categories' },
    ],
    retention: [
      { name: 'name', label: 'Policy Name' },
      { name: 'entity_type', label: 'Entity Type' },
      { name: 'retention_days', label: 'Retention Days', type: 'number' },
    ],
  };

  return (
    <form className="inline-form" onSubmit={submit}>
      {fields[tab].map(f => (
        <div className="form-group" key={f.name}>
          <label>{f.label}</label>
          <input
            className="input"
            type={f.type || 'text'}
            value={form[f.name] || ''}
            onChange={e => set(f.name, e.target.value)}
            required
          />
        </div>
      ))}
      <button className="btn btn--primary" type="submit">Create</button>
    </form>
  );
}

function TabTable({ tab, data, onRefresh }: { tab: Tab; data: any[]; onRefresh: () => void }) {
  const updateStatus = (id: string, status: string) => {
    fetch(`${API_MAP[tab]}/${id}`, {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({ status }),
    }).then(() => onRefresh());
  };

  if (!data.length) return <div className="page-loading">No records found.</div>;

  const columns: Record<Tab, string[]> = {
    consent: ['purpose', 'data_subject_email', 'legal_basis', 'status', 'created_at'],
    dsars: ['subject_email', 'request_type', 'status', 'due_date', 'created_at'],
    breaches: ['title', 'severity', 'status', 'affected_records', 'discovered_at'],
    processing: ['name', 'purpose', 'legal_basis', 'status'],
    retention: ['name', 'entity_type', 'retention_days', 'status'],
  };

  const cols = columns[tab];

  return (
    <table className="data-table">
      <thead>
        <tr>
          {cols.map(c => <th key={c}>{c.replace(/_/g, ' ')}</th>)}
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row: any, i: number) => (
          <tr key={row._id || row.id || i}>
            {cols.map(c => (
              <td key={c}>
                {c === 'status' ? (
                  <span className={`badge badge--${row[c]}`}>{row[c]}</span>
                ) : c.includes('date') || c.includes('_at') ? (
                  row[c] ? new Date(row[c]).toLocaleDateString() : '-'
                ) : (
                  String(row[c] ?? '-')
                )}
              </td>
            ))}
            <td>
              {tab === 'dsars' && row.status === 'pending' && (
                <button className="btn btn--sm" onClick={() => updateStatus(row._id || row.id, 'in_progress')}>
                  Start
                </button>
              )}
              {tab === 'breaches' && row.status === 'detected' && (
                <button className="btn btn--sm" onClick={() => updateStatus(row._id || row.id, 'investigating')}>
                  Investigate
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
