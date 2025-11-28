import { useState, useEffect } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, Eye, Edit, Trash2, Send } from 'lucide-react';
import { Button } from '../../components/Button';
import { journalEntriesService } from '../../services/accountingService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import './JournalEntries.css';

interface JournalEntry {
  id: number;
  name: string;
  journal_name: string;
  journal_code: string;
  date: string;
  ref: string;
  state: string;
  move_type: string;
  amount_total: number;
  partner_name: string;
  lines?: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  account_code: string;
  account_name: string;
  name: string;
  debit: number;
  credit: number;
  balance: number;
}

export const JournalEntries = () => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ state: '', journal_id: '' });

  useEffect(() => {
    loadEntries();
  }, [filters]);

  const loadEntries = async () => {
    try {
      const params: any = {};
      if (filters.state) params.state = filters.state;
      if (filters.journal_id) params.journal_id = filters.journal_id;
      
      const data = await journalEntriesService.getAll(params);
      setEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (id: number) => {
    try {
      await journalEntriesService.post(id, { user_id: 1 });
      loadEntries();
    } catch (error) {
      console.error('Error posting entry:', error);
      alert('Failed to post entry');
    }
  };

  const filteredEntries = entries.filter(entry =>
    entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.partner_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStateBadge = (state: string) => {
    const badges: Record<string, { icon: JSX.Element; class: string }> = {
      draft: { icon: <Clock size={14} />, class: 'draft' },
      posted: { icon: <CheckCircle size={14} />, class: 'posted' },
      cancel: { icon: <FileText size={14} />, class: 'cancel' },
    };
    return badges[state] || badges.draft;
  };

  if (loading) {
    return <div className="journal-entries-page"><div className="container"><h1>Loading...</h1></div></div>;
  }

  return (
    <div className="journal-entries-page">
      <div className="container">
        <div className="je-header">
          <div>
            <h1>Journal Entries</h1>
            <p className="je-subtitle">{filteredEntries.length} entries</p>
          </div>
          <Button icon={<Plus size={20} />}>New Entry</Button>
        </div>

        <div className="je-filters">
          <div className="search-box">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={filters.state}
            onChange={(e) => setFilters({ ...filters, state: e.target.value })}
            className="filter-select"
          >
            <option value="">All States</option>
            <option value="draft">Draft</option>
            <option value="posted">Posted</option>
            <option value="cancel">Cancelled</option>
          </select>
        </div>

        <div className="je-table-container">
          <table className="je-table">
            <thead>
              <tr>
                <th>Entry #</th>
                <th>Journal</th>
                <th>Date</th>
                <th>Reference</th>
                <th>Partner</th>
                <th className="amount-col">Amount</th>
                <th>Status</th>
                <th className="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map(entry => {
                const badge = getStateBadge(entry.state);
                return (
                  <tr key={entry.id}>
                    <td className="entry-number">
                      <FileText size={16} />
                      {entry.name}
                    </td>
                    <td>{entry.journal_name || entry.journal_code}</td>
                    <td>{new Date(entry.date).toLocaleDateString()}</td>
                    <td>{entry.ref || '-'}</td>
                    <td>{entry.partner_name || '-'}</td>
                    <td className="amount">{formatInLakhsCompact(entry.amount_total)}</td>
                    <td>
                      <span className={`state-badge ${badge.class}`}>
                        {badge.icon}
                        {entry.state}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button className="action-btn" title="View">
                          <Eye size={16} />
                        </button>
                        {entry.state === 'draft' && (
                          <>
                            <button className="action-btn" title="Edit">
                              <Edit size={16} />
                            </button>
                            <button
                              className="action-btn post"
                              title="Post"
                              onClick={() => handlePost(entry.id)}
                            >
                              <Send size={16} />
                            </button>
                          </>
                        )}
                        {entry.state === 'draft' && (
                          <button className="action-btn delete" title="Delete">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

