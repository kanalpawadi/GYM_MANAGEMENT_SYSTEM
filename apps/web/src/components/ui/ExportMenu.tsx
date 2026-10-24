import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, FileCode2, FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from './Button';
import { ExportFormat, ExportSpec, exportTable } from '../../utils/exportTable';

const OPTIONS: { format: ExportFormat; label: string; hint: string; icon: React.ReactNode }[] = [
  { format: 'csv', label: 'CSV', hint: 'Excel / Google Sheets', icon: <FileSpreadsheet className="w-4 h-4 text-gym-primary" /> },
  { format: 'pdf', label: 'PDF', hint: 'Print or save as PDF', icon: <FileText className="w-4 h-4 text-gym-primary" /> },
  { format: 'html', label: 'HTML', hint: 'Web page file', icon: <FileCode2 className="w-4 h-4 text-gym-primary" /> },
  { format: 'html-min', label: 'Minified HTML', hint: 'Same page, smallest file', icon: <FileCode2 className="w-4 h-4 text-gym-primary" /> },
];

const DEFAULT_FORMATS: ExportFormat[] = ['csv', 'pdf', 'html'];

interface Props {
  /** Builds the export when a format is picked (so it always uses the current filters). */
  getSpec: () => ExportSpec;
  label?: string;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
  className?: string;
  /** Which formats to offer (default CSV, PDF, HTML). */
  formats?: ExportFormat[];
}

/** "Export ▾" button with CSV, PDF and HTML. */
export const ExportMenu: React.FC<Props> = ({ getSpec, label = 'Export', disabled, variant = 'outline', className = '', formats = DEFAULT_FORMATS }) => {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const run = (format: ExportFormat) => {
    setOpen(false);
    setError('');
    try {
      exportTable(format, getSpec());
    } catch (err: any) {
      setError(err.message || 'Export failed');
    }
  };

  return (
    <div ref={ref} className={`relative inline-flex flex-col ${className}`}>
      <Button
        variant={variant}
        size="sm"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        leftIcon={<Download className="w-4 h-4" />}
        rightIcon={<ChevronDown className="w-4 h-4" />}
      >
        {label}
      </Button>
      {open && (
        <div role="menu" aria-label={`${label} formats`} className="absolute right-0 top-full mt-1 z-40 w-56 bg-gym-surface border border-gym-border rounded-xl shadow-2xl overflow-hidden">
          {OPTIONS.filter((o) => formats.includes(o.format)).map((o) => (
            <button
              key={o.format}
              type="button"
              role="menuitem"
              onClick={() => run(o.format)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-gym-surfaceHover"
            >
              {o.icon}
              <span className="flex flex-col">
                <span className="text-sm text-white font-heading">{o.label}</span>
                <span className="text-[11px] text-gym-muted">{o.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {error && <span role="alert" className="text-xs text-gym-danger mt-1">{error}</span>}
    </div>
  );
};
