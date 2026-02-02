import React, { useState } from 'react';
import { FileText, Download, Plus, Trash2, Eye } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '';

const MODULES: Record<string, { label: string; collection: string; columns: Array<{ field: string; label: string; type?: string }> }> = {
  sales: {
    label: 'Sales / Invoices',
    collection: 'accountmoves',
    columns: [
      { field: 'name', label: 'Number' },
      { field: 'partner_id', label: 'Customer' },
      { field: 'invoice_date', label: 'Date', type: 'date' },
      { field: 'invoice_date_due', label: 'Due Date', type: 'date' },
      { field: 'amount_total', label: 'Total', type: 'currency' },
      { field: 'amount_residual', label: 'Balance Due', type: 'currency' },
      { field: 'payment_state', label: 'Payment Status' },
      { field: 'state', label: 'Status' },
    ],
  },
  inventory: {
    label: 'Products',
    collection: 'products',
    columns: [
      { field: 'name', label: 'Product Name' },
      { field: 'default_code', label: 'SKU' },
      { field: 'type', label: 'Type' },
      { field: 'list_price', label: 'Price', type: 'currency' },
      { field: 'qty_on_hand', label: 'On Hand', type: 'number' },
      { field: 'reorder_point', label: 'Reorder Point', type: 'number' },
      { field: 'category', label: 'Category' },
    ],
  },
  partners: {
    label: 'Customers / Vendors',
    collection: 'partners',
    columns: [
      { field: 'name', label: 'Name' },
      { field: 'email', label: 'Email' },
      { field: 'phone', label: 'Phone' },
      { field: 'partner_type', label: 'Type' },
      { field: 'city', label: 'City' },
      { field: 'state', label: 'State' },
    ],
  },
  orders: {
    label: 'Sale Orders',
    collection: 'saleorders',
    columns: [
      { field: 'name', label: 'Order #' },
      { field: 'partner_id', label: 'Customer' },
      { field: 'order_date', label: 'Date', type: 'date' },
      { field: 'amount_total', label: 'Total', type: 'currency' },
      { field: 'status', label: 'Status' },
    ],
  },
};

const s = {
  page: { padding: 32, background: '#0a0a0a', minHeight: '100vh', color: '#fff' } as React.CSSProperties,
  card: { background: '#141414', border: '1px solid #222', borderRadius: 12, padding: 24, marginBottom: 16 } as React.CSSProperties,
  input: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14, width: '100%' } as React.CSSProperties,
  select: { background: '#1a1a1a', border: '1px solid #333', borderRadius: 8, padding: '8px 12px', color: '#e0e0e0', fontSize: 14 } as React.CSSProperties,
  btn: { background: '#00C971', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
  btnSec: { background: '#222', color: '#e0e0e0', border: '1px solid #333', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 6 } as React.CSSProperties,
};

export const ReportBuilder: React.FC = () => {
  const [module, setModule] = useState('sales');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [format, setFormat] = useState<'csv' | 'xlsx' | 'pdf'>('xlsx');
  const [preview, setPreview] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('authToken') || '';

  const modConfig = MODULES[module];

  const toggleColumn = (field: string) => {
    setSelectedColumns(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  const exportReport = async () => {
    setLoading(true);
    try {
      const cols = selectedColumns.length > 0
        ? modConfig.columns.filter(c => selectedColumns.includes(c.field))
        : modConfig.columns;

      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: `${modConfig.label} Report`,
          module,
          collection: modConfig.collection,
          columns: cols,
          filters,
          format,
        }),
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${module}-${Date.now()}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    }
    setLoading(false);
  };

  return (
    <div style={s.page}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FileText size={28} style={{ color: '#00C971' }} /> Report Builder
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
        {/* Config panel */}
        <div>
          <div style={s.card}>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Module</label>
            <select style={{ ...s.select, width: '100%' }} value={module} onChange={e => { setModule(e.target.value); setSelectedColumns([]); setFilters({}); }}>
              {Object.entries(MODULES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div style={s.card}>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>Columns</label>
            {modConfig.columns.map(col => (
              <label key={col.field} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, cursor: 'pointer', fontSize: 13 }}>
                <input type="checkbox" checked={selectedColumns.length === 0 || selectedColumns.includes(col.field)} onChange={() => toggleColumn(col.field)} />
                {col.label}
              </label>
            ))}
          </div>

          <div style={s.card}>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 8 }}>Filters</label>
            <div style={{ display: 'grid', gap: 8 }}>
              <input style={s.input} placeholder="Date from (YYYY-MM-DD)" value={filters.invoice_date_from || ''} onChange={e => setFilters({ ...filters, invoice_date_from: e.target.value })} />
              <input style={s.input} placeholder="Date to (YYYY-MM-DD)" value={filters.invoice_date_to || ''} onChange={e => setFilters({ ...filters, invoice_date_to: e.target.value })} />
              <input style={s.input} placeholder="Status filter" value={filters.state || ''} onChange={e => setFilters({ ...filters, state: e.target.value })} />
            </div>
          </div>

          <div style={s.card}>
            <label style={{ fontSize: 13, color: '#888', display: 'block', marginBottom: 6 }}>Format</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['csv', 'xlsx', 'pdf'] as const).map(f => (
                <button key={f} style={{ ...s.btnSec, ...(format === f ? { borderColor: '#00C971', color: '#00C971' } : {}) }} onClick={() => setFormat(f)}>
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <button style={s.btn} onClick={exportReport} disabled={loading}>
            <Download size={16} /> {loading ? 'Generating...' : `Export ${format.toUpperCase()}`}
          </button>
        </div>

        {/* Preview */}
        <div style={s.card}>
          <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Preview</h3>
          <div style={{ fontSize: 13, color: '#888' }}>
            Module: {modConfig.label} | Columns: {selectedColumns.length || modConfig.columns.length} | Format: {format.toUpperCase()}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #333' }}>
                {(selectedColumns.length > 0 ? modConfig.columns.filter(c => selectedColumns.includes(c.field)) : modConfig.columns).map(col => (
                  <th key={col.field} style={{ padding: 8, textAlign: 'left', color: '#888' }}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr><td colSpan={99} style={{ padding: 24, textAlign: 'center', color: '#666' }}>Click Export to generate report</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportBuilder;
