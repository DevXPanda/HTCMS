/**
 * Convert array of objects to CSV string and trigger download.
 * @param {Array<Object>} data - Array of row objects (flat or with nested refs)
 * @param {string} filename - Download filename (without extension)
 * @param {Array<{ key: string, label: string }>} columns - Optional column order and labels; if omitted, uses first object keys
 */
export function exportToCSV(data, filename = 'export', columns = null) {
  if (!data || data.length === 0) {
    return;
  }
  const headers = columns
    ? columns.map(c => c.label)
    : Object.keys(data[0]);
  const keys = columns
    ? columns.map(c => c.key)
    : Object.keys(data[0]);
  const escape = (v) => {
    if (v == null) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const getVal = (row, key) => {
    const parts = key.split('.');
    let v = row;
    for (const p of parts) v = v?.[p];
    return v;
  };
  const headerLine = headers.map(escape).join(',');
  const rows = data.map(row =>
    keys.map(k => escape(getVal(row, k))).join(',')
  );
  const csv = [headerLine, ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
