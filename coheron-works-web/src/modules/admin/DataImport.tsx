import { useState, useRef } from 'react';
import { Button } from '../../components/Button';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { apiService } from '../../services/apiService';
import { showToast } from '../../components/Toast';
import './DataImport.css';

const ENTITY_TYPES = [
  { value: 'chart_of_accounts', label: 'Chart of Accounts' },
  { value: 'partners', label: 'Partners / Customers' },
  { value: 'products', label: 'Products' },
  { value: 'employees', label: 'Employees' },
  { value: 'opening_balances', label: 'Opening Balances' },
] as const;

interface ImportResult {
  imported: number;
  errors: { row: number; message: string }[];
}

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? '';
    });
    return obj;
  });

  return { headers, rows };
}

export const DataImport: React.FC = () => {
  const [entityType, setEntityType] = useState<string>('chart_of_accounts');
  const [headers, setHeaders] = useState<string[]>([]);
  const [allRows, setAllRows] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) {
      setHeaders([]);
      setAllRows([]);
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setAllRows(r);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (allRows.length === 0) {
      showToast('No data to import. Please upload a CSV file first.', 'error');
      return;
    }

    try {
      setLoading(true);
      setResult(null);
      const res = await apiService.create<ImportResult>('/admin/import', {
        entity_type: entityType,
        data: allRows,
      });
      setResult(res);
      if (res.errors.length === 0) {
        showToast(`Successfully imported ${res.imported} records.`, 'success');
      } else {
        showToast(`Imported ${res.imported} records with ${res.errors.length} errors.`, 'warning');
      }
    } catch (err: any) {
      showToast(err?.userMessage || err?.message || 'Import failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const previewRows = allRows.slice(0, 5);

  return (
    <div className="data-import">
      <h2>Data Import</h2>

      <div className="data-import__form">
        <div className="data-import__field">
          <label htmlFor="entity-type">Entity Type</label>
          <select
            id="entity-type"
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setResult(null);
            }}
          >
            {ENTITY_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>

        <div className="data-import__field">
          <label htmlFor="csv-file">CSV File</label>
          <input
            id="csv-file"
            ref={fileRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
          />
        </div>

        <div className="data-import__actions">
          <Button onClick={handleImport} disabled={loading || allRows.length === 0}>
            {loading ? <LoadingSpinner /> : 'Import'}
          </Button>
          {allRows.length > 0 && (
            <span style={{ fontSize: '0.875rem', color: 'var(--text-main)' }}>
              {allRows.length} row{allRows.length !== 1 ? 's' : ''} loaded
            </span>
          )}
        </div>
      </div>

      {previewRows.length > 0 && (
        <div className="data-import__preview">
          <h3>Preview (first {previewRows.length} rows)</h3>
          <div className="data-import__table-wrap">
            <table className="data-import__table">
              <thead>
                <tr>
                  {headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i}>
                    {headers.map((h) => (
                      <td key={h}>{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="data-import__results">
          <h3>Import Results</h3>
          <div className="data-import__success">
            {result.imported} record{result.imported !== 1 ? 's' : ''} imported successfully.
          </div>
          {result.errors.length > 0 && (
            <div className="data-import__errors">
              <h4>{result.errors.length} error{result.errors.length !== 1 ? 's' : ''}</h4>
              {result.errors.map((err, i) => (
                <div key={i} className="data-import__error-row">
                  <strong>Row {err.row}:</strong> {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DataImport;
