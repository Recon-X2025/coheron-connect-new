import React, { useState, useEffect } from 'react';
import { Search, Plus, FileText, CheckCircle, Clock, Eye, Edit, Trash2, Send, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { journalEntriesService } from '../../services/accountingService';
import { formatInLakhsCompact } from '../../utils/currencyFormatter';
import { showToast } from '../../components/Toast';
import { JournalEntryForm } from './components/JournalEntryForm';
import { confirmAction } from '../../components/ConfirmDialog';
import { DateRangeFilter } from '../../components/DateRangeFilter';
import { EmptyState } from '../../components/EmptyState';
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
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadEntries();
  }, [filters]);

  const loadEntries = async () => {
    try {
      const params: any = {};
      if (filters.state) params.state = filters.state;
      if (filters.journal_id) params.journal_id = filters.journal_id;
      
      const data = await journalEntriesService.getAll(params) as JournalEntry[];
      setEntries(data);
    } catch (error) {
      console.error('Error loading journal entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const handleViewEntry = async (id: number) => {
    try {
      const entry = entries.find(e => e.id === id);
      if (entry) {
        setSelectedEntry(entry);
        setShowViewModal(true);
      }
    } catch (error) {
      console.error('Error viewing entry:', error);
      showToast('Failed to load entry details', 'error');
    }
  };

  const handleEditEntry = async (id: number) => {
    try {
      const entry = entries.find(e => e.id === id);
      if (entry) {
        setEditingEntry(entry);
        setShowEntryForm(true);
      }
    } catch (error) {
      console.error('Error loading entry for edit:', error);
      showToast('Failed to load entry for editing', 'error');
    }
  };

  const handleDeleteEntry = async (id: number) => {
    const ok = await confirmAction({
      title: 'Delete Journal Entry',
      message: 'Are you sure you want to delete this journal entry? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await journalEntriesService.delete(id);
      loadEntries();
      showToast('Journal entry deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting entry:', error);
      showToast('Failed to delete entry. Please try again.', 'error');
    }
  };

  const handlePost = async (id: number) => {
    try {
      await journalEntriesService.post(id, { user_id: 1 });
      loadEntries();
      showToast('Entry posted successfully', 'success');
    } catch (error) {
      console.error('Error posting entry:', error);
      showToast('Failed to post entry', 'error');
    }
  };


  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.ref?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.partner_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const entryDate = entry.date ? entry.date.split('T')[0].split(' ')[0] : '';
    const matchesStart = !startDate || entryDate >= startDate;
    const matchesEnd = !endDate || entryDate <= endDate;
    return matchesSearch && matchesStart && matchesEnd;
  });

  const getStateBadge = (state: string) => {
    const badges: Record<string, { icon: React.ReactElement; class: string }> = {
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
          <Button icon={<Plus size={20} />} onClick={() => setShowEntryForm(true)}>New Entry</Button>
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
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartChange={setStartDate}
            onEndChange={setEndDate}
            onClear={() => { setStartDate(''); setEndDate(''); }}
          />
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

        {filteredEntries.length === 0 ? (
          <EmptyState
            icon={<FileText size={48} />}
            title="No journal entries yet"
            description="Create your first journal entry to start tracking transactions"
            actionLabel="New Entry"
            onAction={() => setShowEntryForm(true)}
          />
        ) : (
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
                        <button 
                          type="button"
                          className="action-btn" 
                          title="View"
                          onClick={() => handleViewEntry(entry.id)}
                        >
                          <Eye size={16} />
                        </button>
                        {entry.state === 'draft' && (
                          <>
                            <button 
                              type="button"
                              className="action-btn" 
                              title="Edit"
                              onClick={() => handleEditEntry(entry.id)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              className="action-btn post"
                              title="Post"
                              onClick={() => handlePost(entry.id)}
                            >
                              <Send size={16} />
                            </button>
                          </>
                        )}
                        {entry.state === 'draft' && (
                          <button 
                            type="button"
                            className="action-btn delete" 
                            title="Delete"
                            onClick={() => handleDeleteEntry(entry.id)}
                          >
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
        )}

        {/* View Entry Modal */}
        {showViewModal && selectedEntry && (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Journal Entry Details</h2>
                <button type="button" className="modal-close" onClick={() => setShowViewModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="invoice-details">
                <div className="detail-row">
                  <span className="detail-label">Entry Number:</span>
                  <span className="detail-value">{selectedEntry.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Journal:</span>
                  <span className="detail-value">{selectedEntry.journal_name || selectedEntry.journal_code}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date:</span>
                  <span className="detail-value">{new Date(selectedEntry.date).toLocaleDateString()}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Reference:</span>
                  <span className="detail-value">{selectedEntry.ref || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Amount:</span>
                  <span className="detail-value">{formatInLakhsCompact(selectedEntry.amount_total)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`state-badge ${selectedEntry.state}`}>
                    {selectedEntry.state}
                  </span>
                </div>
                {selectedEntry.lines && selectedEntry.lines.length > 0 && (
                  <div className="detail-section">
                    <h3>Entry Lines</h3>
                    <table>
                      <thead>
                        <tr>
                          <th>Account</th>
                          <th>Debit</th>
                          <th>Credit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedEntry.lines.map(line => (
                          <tr key={line.id}>
                            <td>{line.account_name} ({line.account_code})</td>
                            <td>{line.debit > 0 ? formatInLakhsCompact(line.debit) : '-'}</td>
                            <td>{line.credit > 0 ? formatInLakhsCompact(line.credit) : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <Button variant="ghost" onClick={() => setShowViewModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        )}

        {showEntryForm && (
          <JournalEntryForm
            initialData={editingEntry}
            onClose={() => {
              setShowEntryForm(false);
              setEditingEntry(null);
            }}
            onSave={() => {
              setShowEntryForm(false);
              setEditingEntry(null);
              loadEntries();
            }}
          />
        )}
      </div>
    </div>
  );
};

