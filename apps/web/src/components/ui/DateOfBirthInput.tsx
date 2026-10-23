import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

/** "DD/MM/YYYY" -> "YYYY-MM-DD", or null when it isn't a real date. */
export function parseDmy(text: string): string | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
  if (d.getUTCFullYear() !== Number(yyyy) || d.getUTCMonth() !== Number(mm) - 1 || d.getUTCDate() !== Number(dd)) return null;
  return `${yyyy}-${mm}-${dd}`;
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" */
export const isoToDmy = (iso?: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** Adds the slashes while typing: "250819" -> "25/08/19". Also accepts a pasted "1999-02-01". */
export function formatDobTyping(raw: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw.trim())) return isoToDmy(raw.trim());
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

interface Props {
  label?: string;
  /** "YYYY-MM-DD" or "". */
  value: string;
  /** Called with "YYYY-MM-DD" when the typed date is complete and real, otherwise with "". `typed` is what is in the box. */
  onChange: (iso: string, typed: string) => void;
  required?: boolean;
  /** Latest allowed date, "YYYY-MM-DD". */
  max?: string;
}

/**
 * Date of birth that can be typed with the number keyboard (DD/MM/YYYY) or picked from a calendar.
 * Phone calendars make you scroll back decades for a birth year, so typing comes first.
 */
export const DateOfBirthInput: React.FC<Props> = ({ label = 'Date of Birth', value, onChange, required, max }) => {
  const [text, setText] = useState(isoToDmy(value));
  const pickerRef = useRef<HTMLInputElement>(null);
  const id = 'date-of-birth';

  // Follow outside changes (profile loaded, calendar pick) without fighting the user's typing.
  useEffect(() => {
    if (value && parseDmy(text) !== value) setText(isoToDmy(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const iso = parseDmy(text);
  const tooLate = !!iso && !!max && iso > max;
  const showHint = text.length === 10 && (!iso || tooLate);

  const update = (next: string) => {
    setText(next);
    const parsed = parseDmy(next);
    onChange(parsed && !(max && parsed > max) ? parsed : '', next);
  };

  const openCalendar = () => {
    const el = pickerRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
      else el.click();
    } catch {
      el.click();
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gym-muted">
        {label}
      </label>
      <div className="relative flex items-center">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="bday"
          placeholder="DD/MM/YYYY"
          maxLength={10}
          value={text}
          required={required}
          aria-invalid={showHint || undefined}
          aria-describedby={`${id}-hint`}
          onChange={(e) => update(formatDobTyping(e.target.value))}
          className={`w-full bg-black text-white placeholder-gym-muted/70 border rounded-xl pl-4 pr-12 py-2.5 min-h-[44px] text-sm font-body tracking-wider focus:outline-none focus:ring-1 ${
            showHint ? 'border-gym-danger focus:border-gym-danger focus:ring-gym-danger' : 'border-gym-border focus:border-gym-primary focus:ring-gym-primary'
          }`}
        />
        <button
          type="button"
          onClick={openCalendar}
          className="absolute right-1 w-10 h-10 flex items-center justify-center rounded-lg text-gym-primary hover:bg-gym-primary/10"
          aria-label="Pick date of birth from calendar"
        >
          <CalendarDays className="w-5 h-5" />
        </button>
        {/* Native calendar, opened by the button above. */}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          max={max}
          value={iso ?? ''}
          onChange={(e) => update(isoToDmy(e.target.value))}
          className="absolute right-0 bottom-0 w-10 h-10 opacity-0 pointer-events-none"
        />
      </div>
      <span id={`${id}-hint`} className={`text-xs ${showHint ? 'text-gym-danger' : 'text-gym-muted'}`}>
        {showHint ? (tooLate ? 'Date of birth cannot be in the future.' : 'Not a real date. Use DD/MM/YYYY, e.g. 25/08/1998.') : 'Type it, e.g. 25/08/1998, or tap the calendar.'}
      </span>
    </div>
  );
};
