import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../../components/Button';
import { apiService } from '../../../services/apiService';
import { showToast } from '../../../components/Toast';
import './JournalEntryForm.css';

interface JournalEntryFormProps {
  onClose: () => void;
  onSave: () => void;
  initialData?: any;
}

interface JournalLine {
  account_id: string;
  name: string;
  debit: string;
  credit: string;
  partner_id?: string;
}

export const JournalEntryForm = ({ onClose, onSave, initialData }: JournalEntryFormProps) => {
  const [loading, setLoading] = useState(false);
  const [journals, setJournals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    journal_id: '',
    date: new Date().toISOString().split('T')[0],
    ref: '',
  });
  const [lines, setLines] = useState<JournalLine[]>([
    { account_id: '', name: '', debit: '', credit: '' },
    { account_id: '', name: '', debit: '', credit: '' },
  ]);

  useEffect(() => {
    loadData();
    if (initialData) {
      setFormData({
        journal_id: initialData.journal_id?.toString() || '',
        date: initialData.date ? initialData.date.split('T')[0] : new Date().toISOString().split('T')[0],
        ref: initialData.ref || '',
      });
      if (initialData.lines) {
        setLines(initialData.lines.map((line: any) => ({
          account_id: line.account_id?.toString() || '',
          name: line.name || '',
          debit: line.debit?.toString() || '',
          credit: line.credit?.toString() || '',
          partner_id: line.partner_id?.toString() || '',
        })));
      }
    }
  }, [initialData]);

  const loadData = async () => {
    try {
      const [journalsData, accountsData, partnersData] = await Promise.all([
        apiService.get<any[]>('accounting/journal-entries').catch((err) => { console.error('Failed to load journal entries:', err.userMessage || err.message); return []; }),
        apiService.get<any[]>('accounting/chart-of-accounts').catch((err) => { console.error('Failed to load chart of accounts:', err.userMessage || err.message); return []; }),
        apiService.get<any[]>('partners').catch((err) => { console.error('Failed to load partners:', err.userMessage || err.message); return []; }),
      ]);

      // Get journals from a different endpoint or create default
      const journalsList = journalsData.length > 0 ? journalsData : [
        { id: 1, name: 'General Journal', code: 'MISC' },
      ];
      setJournals(journalsList);
      setAccounts(accountsData);
      setPartners(partnersData);
    } catch (error: any) {
      console.error('Error loading data:', error);
      showToast(error.userMessage || 'Failed to load form data', 'error');
    }
  };

  const addLine = () => {
    setLines([...lines, { account_id: '', name: '', debit: '', credit: '' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    } else {
      showToast('At least 2 lines are required', 'warning');
    }
  };

  const updateLine = (index: number, field: keyof JournalLine, value: string) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const calculateBalance = () => {
    const totalDebit = lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
    return { totalDebit, totalCredit, balance: totalDebit - totalCredit };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const balance = calculateBalance();
      if (Math.abs(balance.balance) > 0.01) {
        showToast('Journal entry must be balanced. Debits must equal credits.', 'error');
        setLoading(false);
        return;
      }

      const submitLines = lines
        .filter(line => line.account_id)
        .map(line => ({
          account_id: parseInt(line.account_id),
          name: line.name,
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
          partner_id: line.partner_id ? parseInt(line.partner_id) : null,
        }));

      if (submitLines.length < 2) {
        showToast('At least 2 lines are required', 'error');
        setLoading(false);
        return;
      }

      const submitData = {
        journal_id: parseInt(formData.journal_id),
        date: formData.date,
        ref: formData.ref || null,
        lines: submitLines,
      };

      if (initialData?.id) {
        await apiService.update('accounting/journal-entries', initialData.id, submitData);
        showToast('Journal entry updated successfully', 'success');
      } else {
        await apiService.create('accounting/journal-entries', submitData);
        showToast('Journal entry created successfully', 'success');
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving journal entry:', error);
      showToast(error?.userMessage || error?.message || 'Failed to save journal entry', 'error');
    } finally {
      setLoading(false);
    }
  };

  const balance = calculateBalance();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content journal-entry-form" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{initialData ? 'Edit Journal Entry' : 'Create New Journal Entry'}</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="journal_id">Journal *</label>
              <select
                id="journal_id"
                value={formData.journal_id}
                onChange={(e) => setFormData({ ...formData, journal_id: e.target.value })}
                required
              >
                <option value="">Select Journal</option>
                {journals.map((journal, idx) => (
                  <option key={journal.id || (journal as any)._id || idx} value={journal.id}>
                    {journal.name} ({journal.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="date">Date *</label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="ref">Reference</label>
            <input
              id="ref"
              type="text"
              value={formData.ref}
              onChange={(e) => setFormData({ ...formData, ref: e.target.value })}
              placeholder="Optional reference"
            />
          </div>

          <div className="journal-lines">
            <div className="lines-header">
              <h3>Journal Lines</h3>
              <Button type="button" variant="ghost" size="sm" icon={<Plus size={16} />} onClick={addLine}>
                Add Line
              </Button>
            </div>

            <div className="lines-table">
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Label</th>
                    <th>Partner</th>
                    <th>Debit</th>
                    <th>Credit</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={line.account_id}
                          onChange={(e) => updateLine(index, 'account_id', e.target.value)}
                          required
                        >
                          <option value="">Select Account</option>
                          {accounts.map((account, idx) => (
                            <option key={account.id || (account as any)._id || idx} value={account.id}>
                              {account.code} - {account.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={line.name}
                          onChange={(e) => updateLine(index, 'name', e.target.value)}
                          placeholder="Label"
                        />
                      </td>
                      <td>
                        <select
                          value={line.partner_id || ''}
                          onChange={(e) => updateLine(index, 'partner_id', e.target.value)}
                        >
                          <option value="">None</option>
                          {partners.map((partner, idx) => (
                            <option key={partner.id || (partner as any)._id || idx} value={partner.id}>
                              {partner.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.debit}
                          onChange={(e) => {
                            updateLine(index, 'debit', e.target.value);
                            if (e.target.value) updateLine(index, 'credit', '');
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          value={line.credit}
                          onChange={(e) => {
                            updateLine(index, 'credit', e.target.value);
                            if (e.target.value) updateLine(index, 'debit', '');
                          }}
                          placeholder="0.00"
                        />
                      </td>
                      <td>
                        {lines.length > 2 && (
                          <button
                            type="button"
                            className="remove-line-btn"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3}><strong>Total</strong></td>
                    <td><strong>{balance.totalDebit.toFixed(2)}</strong></td>
                    <td><strong>{balance.totalCredit.toFixed(2)}</strong></td>
                    <td></td>
                  </tr>
                  <tr className={Math.abs(balance.balance) > 0.01 ? 'unbalanced' : 'balanced'}>
                    <td colSpan={3}><strong>Balance</strong></td>
                    <td colSpan={2}>
                      <strong>{balance.balance.toFixed(2)}</strong>
                      {Math.abs(balance.balance) > 0.01 && (
                        <span className="balance-warning"> (Unbalanced)</span>
                      )}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="form-actions">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || Math.abs(balance.balance) > 0.01}>
              {loading ? 'Saving...' : initialData ? 'Update Entry' : 'Create Entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

