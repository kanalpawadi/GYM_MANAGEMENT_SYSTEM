// Export a table as CSV, HTML or PDF (PDF through the browser's "Save as PDF" print dialog,
// the same way invoices work, so no extra library is needed).
import { downloadFile, toCsv } from '../services/gym';

export type ExportFormat = 'csv' | 'html' | 'pdf';
export type ExportRow = Record<string, string | number | null | undefined>;

export interface ExportSpec {
  /** Shown as the document heading, e.g. "Members". */
  title: string;
  /** File name without extension, e.g. "rv-fitness-members-2026-10-23". */
  filename: string;
  rows: ExportRow[];
}

const escapeHtml = (v: unknown) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const label = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** A standalone, printable HTML document with the RV Fitness heading and the table. */
export function toHtmlDocument({ title, rows }: Pick<ExportSpec, 'title' | 'rows'>, generatedAt = new Date()): string {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const when = generatedAt.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RV Fitness · ${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 24px; }
  header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 3px solid #D4AF37; padding-bottom: 8px; margin-bottom: 16px; }
  h1 { margin: 0; font-size: 22px; } h1 span { color: #B8941F; }
  .meta { font-size: 12px; color: #555; text-align: right; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #111; color: #D4AF37; text-align: left; padding: 8px; }
  td { padding: 7px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #faf7ec; }
  footer { margin-top: 16px; font-size: 11px; color: #777; }
  @media print { body { margin: 12mm; } th { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<header>
  <h1>RV <span>FITNESS</span> · ${escapeHtml(title)}</h1>
  <div class="meta">${rows.length} record${rows.length === 1 ? '' : 's'}<br />Generated ${escapeHtml(when)}</div>
</header>
<table>
  <thead><tr>${headers.map((h) => `<th>${escapeHtml(label(h))}</th>`).join('')}</tr></thead>
  <tbody>
${rows.map((r) => `    <tr>${headers.map((h) => `<td>${escapeHtml(r[h])}</td>`).join('')}</tr>`).join('\n')}
  </tbody>
</table>
<footer>RV Fitness, Narsobawadi · Confidential member data, handle with care.</footer>
</body>
</html>`;
}

export function exportTable(format: ExportFormat, spec: ExportSpec): void {
  if (!spec.rows.length) throw new Error('Nothing to export.');
  if (format === 'csv') {
    // BOM so Excel opens names with Marathi/Hindi letters correctly.
    downloadFile(`${spec.filename}.csv`, '﻿' + toCsv(spec.rows), 'text/csv;charset=utf-8');
    return;
  }
  const html = toHtmlDocument(spec);
  if (format === 'html') {
    downloadFile(`${spec.filename}.html`, html, 'text/html;charset=utf-8');
    return;
  }
  const win = window.open('', '_blank');
  if (!win) throw new Error('Please allow pop-ups for this site to save the PDF.');
  win.document.open();
  win.document.write(html.replace('</body>', '<script>window.onload = function () { window.print(); };</script></body>'));
  win.document.close();
}
