import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '../ui/Card';
import { localDay } from '../../services/gym';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Attendance history starts here. */
export const ATTENDANCE_START = '2023-01-01';
const START_YEAR = 2023;

interface Props {
  /** Days with a check-in, as YYYY-MM-DD (India time). */
  days: Set<string>;
  /** Staff: tap a day to add or remove a visit. */
  onDayClick?: (day: string, checkedIn: boolean) => void;
  busyDay?: string | null;
  title?: string;
}

/** Month calendar of check-ins, from January 2023 to this month. */
export const AttendanceCalendar: React.FC<Props> = ({ days, onDayClick, busyDay, title }) => {
  const today = localDay();
  const now = new Date(`${today}T00:00:00`);
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));

  const minMonth = new Date(START_YEAR, 0, 1);
  const maxMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const go = (d: Date) => setMonth(d < minMonth ? minMonth : d > maxMonth ? maxMonth : d);

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
  const monthCount = [...days].filter((d) => d.startsWith(monthKey)).length;
  const years = Array.from({ length: now.getFullYear() - START_YEAR + 1 }, (_, i) => START_YEAR + i);

  const cells = useMemo(() => {
    const first = (month.getDay() + 6) % 7; // Monday first
    const total = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  }, [month]);

  const select = 'bg-black text-white border border-gym-border rounded-lg px-2 py-1.5 text-sm font-heading focus:outline-none focus:border-gym-primary';

  return (
    <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Attendance calendar">
      {title && <h3 className="font-heading text-white">{title}</h3>}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          disabled={month <= minMonth}
          onClick={() => go(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="p-2 text-gym-muted hover:text-white disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <select aria-label="Month" value={month.getMonth()} onChange={(e) => go(new Date(month.getFullYear(), Number(e.target.value), 1))} className={select}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select aria-label="Year" value={month.getFullYear()} onChange={(e) => go(new Date(Number(e.target.value), month.getMonth(), 1))} className={select}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          aria-label="Next month"
          disabled={month >= maxMonth}
          onClick={() => go(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="p-2 text-gym-muted hover:text-white disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      <p className="text-xs text-gym-muted -mt-2 text-center">
        {monthCount} visit{monthCount === 1 ? '' : 's'} in {month.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        {onDayClick ? ' · tap a day to add or remove a visit' : ''}
      </p>
      <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] text-gym-muted font-heading">
        {WEEK.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const key = `${monthKey}-${String(day).padStart(2, '0')}`;
          const hit = days.has(key);
          const future = key > today;
          const cls = `aspect-square rounded-lg flex items-center justify-center text-xs font-heading ${
            hit ? 'bg-gym-success/20 text-gym-success border border-gym-success/40' : key === today ? 'border border-gym-primary text-white' : 'bg-black/40 text-gym-muted'
          } ${busyDay === key ? 'opacity-50' : ''}`;
          if (onDayClick && !future) {
            return (
              <button
                key={i}
                type="button"
                disabled={busyDay === key}
                onClick={() => onDayClick(key, hit)}
                aria-label={hit ? `Checked in on ${key}, tap to remove` : `Add a visit on ${key}`}
                className={`${cls} hover:ring-1 hover:ring-gym-primary`}
              >
                {day}
              </button>
            );
          }
          return (
            <span key={i} aria-label={hit ? `Checked in on ${key}` : undefined} className={`${cls} ${future ? 'opacity-40' : ''}`}>
              {day}
            </span>
          );
        })}
      </div>
    </Card>
  );
};
