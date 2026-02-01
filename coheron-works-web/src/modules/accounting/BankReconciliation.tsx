import { useState } from 'react';
import { Upload, Zap, Check, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './BankReconciliation.css';

interface StatementLine {
  date: string;
  description: string;
  reference: string;
  debit: number;
  credit: number;
  status?: string;
}

export const BankReconciliation = () => {
  const [bankAccountId, setBankAccountId] = useState('');
  const [lines, setLines] = useState<StatementLine[]>([]);
  const [matchResult, setMatchResult] = useState<{ matched: number; unmatched: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [matching, setMatching] = useState(false);
  const ax = apiService.getAxiosInstance();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.trim().split('\n');
      if (rows.length < 2) { showToast('CSV must have header + data', 'error'); return; }
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      const dateIdx = headers.findIndex(h => h.includes('date'));
      const descIdx = headers.findIndex(h => h.includes('desc') || h.includes('narr') || h.includes('particular'));
      const refIdx = headers.findIndex(h => h.includes('ref') || h.includes('cheque'));
      const debitIdx = headers.findIndex(h => h.includes('debit') || h.includes('withdrawal'));
      const creditIdx = headers.findIndex(h => h.includes('credit') || h.includes('deposit'));
      const parsed: StatementLine[] = [];
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.trim().replace(/"/g, ''));
        if (cols.length < 3) continue;
        parsed.push({
          date: cols[dateIdx] || '',
          description: cols[descIdx] || '',
          reference: refIdx >= 0 ? cols[refIdx] : '',
          debit: debitIdx >= 0 ? parseFloat(cols[debitIdx]) || 0 : 0,
          credit: creditIdx >= 0 ? parseFloat(cols[creditIdx]) || 0 : 0,
        });
      }
      setLines(parsed);
      showToast(parsed.length + ' lines parsed from CSV', 'success');
    };
    reader.readAsText(file);
  };

  const importStatement = async () => {
    if (!bankAccountId) { showToast('Enter bank account ID', 'error'); return; }
    if (!lines.length) { showToast('No lines to import', 'error'); return; }
    setImporting(true);
    try {
      const res = await ax.post('/accounting/bank-reconciliation/import', { bank_account_id: bankAccountId, lines });
      showToast('Imported ' + (res.data.imported || 0) + ' lines', 'success');
    } catch (e: any) { showToast(e.userMessage || 'Import failed', 'error'); }
    finally { setImporting(false); }
  };

  const autoMatch = async () => {
    if (!bankAccountId) { showToast('Enter bank account ID', 'error'); return; }
    setMatching(true);
    try {
      const res = await ax.post('/accounting/bank-reconciliation/auto-match', { bank_account_id: bankAccountId });
      setMatchResult(res.data);
      showToast('Matched ' + res.data.matched + ' of ' + (res.data.matched + res.data.unmatched) + ' lines', 'success');
    } catch (e: any) { showToast(e.userMessage || 'Auto-match failed', 'error'); }
    finally { setMatching(false); }
  };

  return (
    <div className="bank-recon-page">
      <div className="bank-recon-header">
        <h1>Bank Reconciliation</h1>
        <p className="bank-recon-subtitle">Import bank statements and match with journal entries</p>
      </div>

      <div className="bank-recon-card">
        <h2>1. Setup</h2>
        <div className="form-group">
          <label>Bank Account ID</label>
          <input value={bankAccountId} onChange={e => setBankAccountId(e.target.value)} placeholder="Enter bank account ID" />
        </div>
      </div>

      <div className="bank-recon-card">
        <h2>2. Import Statement</h2>
        <p className="bank-recon-hint">Upload a CSV file with columns: Date, Description/Narration, Reference, Debit/Withdrawal, Credit/Deposit</p>
        <div className="bank-recon-upload">
          <label className="bank-recon-upload-btn">
            <Upload size={18} /> Choose CSV File
            <input type="file" accept=".csv" onChange={handleFileUpload} hidden />
          </label>
          {lines.length > 0 && (
            <div className="bank-recon-preview">
              <span>{lines.length} lines loaded</span>
              <button className="po-btn-primary" onClick={importStatement} disabled={importing}>
                {importing ? 'Importing...' : 'Import to System'}
              </button>
            </div>
          )}
        </div>
        {lines.length > 0 && (
          <div className="bank-recon-table-wrap">
            <table className="po-table">
              <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Debit</th><th>Credit</th></tr></thead>
              <tbody>
                {lines.slice(0, 20).map((l, i) => (
                  <tr key={i}><td>{l.date}</td><td>{l.description}</td><td>{l.reference}</td><td>{l.debit || '-'}</td><td>{l.credit || '-'}</td></tr>
                ))}
                {lines.length > 20 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>...and {lines.length - 20} more rows</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bank-recon-card">
        <h2>3. Auto-Match</h2>
        <p className="bank-recon-hint">Automatically match imported statement lines with journal entries by amount and reference</p>
        <button className="po-btn-primary" onClick={autoMatch} disabled={matching}>
          <Zap size={18} /> {matching ? 'Matching...' : 'Run Auto-Match'}
        </button>
        {matchResult && (
          <div className="bank-recon-results">
            <div className="bank-recon-result-card success"><Check size={24} /><div><strong>{matchResult.matched}</strong><span>Matched</span></div></div>
            <div className="bank-recon-result-card warning"><AlertCircle size={24} /><div><strong>{matchResult.unmatched}</strong><span>Unmatched</span></div></div>
          </div>
        )}
      </div>
    </div>
  );
};
