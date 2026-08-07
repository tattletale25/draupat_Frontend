/** Turns an array of flat objects into a CSV string and triggers a
 * browser download. No library needed — this is the entire "download as
 * .csv" feature. */
export function downloadCsv(filename: string, rows: Record<string, string | number | boolean | null>[]) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);

  const escape = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
    return str;
  };

  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ];
  const csv = lines.join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
