/**
 * Export an array of objects to a CSV file and trigger a browser download.
 *
 * @param data    - Array of row objects to export.
 * @param filename - Name for the downloaded file (without extension).
 * @param columns - Optional column definitions. When provided, only the listed
 *                  keys are included and the label is used as the header.
 *                  When omitted, Object.keys of the first row are used.
 */
export function exportToCSV(
  data: Record<string, any>[],
  filename: string,
  columns?: { key: string; label: string }[]
): void {
  if (!data || data.length === 0) {
    console.warn('exportToCSV: No data to export.');
    return;
  }

  const cols = columns ?? Object.keys(data[0]).map((key) => ({ key, label: key }));

  const escapeCell = (value: unknown): string => {
    const str = value == null ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = cols.map((c) => escapeCell(c.label)).join(',');
  const bodyRows = data.map((row) =>
    cols.map((c) => escapeCell(row[c.key])).join(',')
  );

  const csv = [headerRow, ...bodyRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
