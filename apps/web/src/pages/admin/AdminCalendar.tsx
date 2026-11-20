import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { ChevronLeft, ChevronRight, UserPlus, IndianRupee, Pill, CalendarCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { ExportMenu } from '../../components/ui/ExportMenu';
import { localDay } from '../../services/gym';
import { DayData, dayTotals, emptyDay, loadMonth } from '../../services/calendar';
import { useFinancePin, useMoney } from '../../components/security/FinancePin';

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const rupeesText = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const pad = (n: number) => String(n).padStart(2, '0');

/** Month calendar of the whole gym: tap a day to see its entries, money, supplements and attendance. */
export const AdminCalendar: React.FC = () => {
  const today = localDay();
  const now = new Date(`${today}T00:00:00`);
  // Money shows as "₹ ••••" until the security PIN is entered.
  const { unlocked } = useFinancePin();
  const money = useMoney();
  const rupees = (n: number) => money(rupeesText(n));
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(today);
  const [days, setDays] = useState<Map<string, DayData>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');
    loadMonth(year, month)
      .then((d) => live && setDays(d))
      .catch((err: Error) => live && setError(err.message))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [year, month]);

  const go = (delta: number) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelected(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`);
  };

  const cells = useMemo(() => {
    const first = (new Date(year, month, 1).getDay() + 6) % 7; // Monday first
    const total = new Date(year, month + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: total }, (_, i) => `${year}-${pad(month + 1)}-${pad(i + 1)}`)] as (string | null)[];
  }, [year, month]);

  const monthTotals = useMemo(() => {
    const all = emptyDay();
    for (const d of days.values()) {
      all.entries.push(...d.entries);
      all.receipts.push(...d.receipts);
      all.supplements.push(...d.supplements);
    }
    const t = dayTotals(all);
    const visits = [...days.values()].reduce((s, d) => s + dayTotals(d).visits, 0);
    return { ...t, visits };
  }, [days]);

  const day = days.get(selected) ?? emptyDay();
  const t = dayTotals(day);
  const selectedLabel = new Date(`${selected}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const exportSpec = () => ({
    title: `Day summary ${selected}`,
    filename: `rv-fitness-day-${selected}`,
    rows: [
      ...day.entries.map((e) => ({ section: 'New member', time: time(e.at), name: e.name, member_id: e.member_code ?? '', detail: e.approval_status ?? '', amount: '' })),
      ...day.receipts.map((r) => ({ section: 'Payment received', time: time(r.at), name: r.member, member_id: r.member_code ?? '', detail: `${r.receipt_no} · ${r.mode.toUpperCase()}`, amount: unlocked ? r.amount : '' })),
      ...day.supplements.map((s) => ({ section: 'Supplement', time: '', name: s.member, member_id: s.member_code ?? '', detail: [s.supplement, s.brand, s.quantity].filter(Boolean).join(' · '), amount: unlocked ? s.price ?? '' : '' })),
      ...day.visits.map((v) => ({ section: 'Attendance', time: time(v.at), name: v.member, member_id: v.member_code ?? '', detail: v.method, amount: '' })),
    ],
  });

  const years = Array.from({ length: 18 }, (_, i) => now.getFullYear() - 15 + i);
  if (!years.includes(year)) years.push(year);
  const select = 'bg-black text-white border border-gym-border rounded-lg px-2 py-1.5 text-sm font-heading focus:outline-none focus:border-gym-primary';

  return (
    <>
      <Helmet>
        <title>Calendar | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">DAY BY DAY</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            GYM <span className="text-gym-primary">CALENDAR</span>
          </h1>
        </div>

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Month totals">
          <Stat icon={<UserPlus className="w-4 h-4" />} label="New members" value={String(monthTotals.entries)} />
          <Stat icon={<IndianRupee className="w-4 h-4" />} label="Received" value={rupees(monthTotals.received)} />
          <Stat icon={<Pill className="w-4 h-4" />} label="Supplements" value={`${monthTotals.supplements} · ${rupees(monthTotals.supplementsValue)}`} />
          <Stat icon={<CalendarCheck className="w-4 h-4" />} label="Visits" value={String(monthTotals.visits)} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
          <Card hoverEffect={false} className="p-4 sm:p-6 flex flex-col gap-4" aria-label="Month calendar">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <button type="button" onClick={() => go(-1)} className="p-2 rounded-lg text-gym-muted hover:text-white hover:bg-black/40" aria-label="Previous month">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <select aria-label="Month" className={select} value={month} onChange={(e) => { setMonth(Number(e.target.value)); setSelected(`${year}-${pad(Number(e.target.value) + 1)}-01`); }}>
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
                <select aria-label="Year" className={select} value={year} onChange={(e) => { setYear(Number(e.target.value)); setSelected(`${e.target.value}-${pad(month + 1)}-01`); }}>
                  {years.sort((a, b) => a - b).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => go(1)} className="p-2 rounded-lg text-gym-muted hover:text-white hover:bg-black/40" aria-label="Next month">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center">
              {WEEK.map((w) => <div key={w} className="text-[10px] sm:text-xs font-heading text-gym-muted uppercase py-1">{w}</div>)}
              {cells.map((key, i) => {
                if (!key) return <div key={`pad-${i}`} />;
                const d = days.get(key);
                const s = d ? dayTotals(d) : null;
                const isSel = key === selected;
                const isToday = key === today;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelected(key)}
                    aria-pressed={isSel}
                    aria-label={`${key}${s ? `: ${s.entries} new, ${rupees(s.received)} received, ${s.supplements} supplements, ${s.visits} visits` : ''}`}
                    className={`min-h-[56px] sm:min-h-[84px] rounded-xl border p-1 sm:p-1.5 flex flex-col items-stretch text-left transition-colors ${
                      isSel ? 'border-gym-primary bg-gym-primary/10' : 'border-gym-border bg-black/30 hover:border-gym-primary/50'
                    }`}
                  >
                    <span className={`text-xs sm:text-sm font-heading ${isToday ? 'text-gym-primary' : 'text-white'}`}>{Number(key.slice(8))}</span>
                    {s && (
                      <span className="mt-auto flex flex-col gap-0.5 text-[9px] sm:text-[11px] leading-tight">
                        {s.received > 0 && <span className="text-emerald-400 truncate">{rupees(s.received)}</span>}
                        <span className="hidden sm:flex gap-1.5 text-gym-muted flex-wrap">
                          {s.entries > 0 && <span title="New members">+{s.entries}</span>}
                          {s.supplements > 0 && <span title="Supplements" className="text-sky-300">💊{s.supplements}</span>}
                          {s.visits > 0 && <span title="Visits">✓{s.visits}</span>}
                        </span>
                        {s.visits > 0 && <span className="sm:hidden text-gym-muted">✓{s.visits}</span>}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {loading && <p className="text-xs text-gym-muted">Loading...</p>}
          </Card>

          <Card hoverEffect={false} className="p-4 sm:p-6 flex flex-col gap-5" aria-label="Day details">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="font-heading text-white text-lg">{selectedLabel}</h2>
                <p className="text-xs text-gym-muted">{t.entries} new · {rupees(t.received)} received · {t.supplements} supplements · {t.visits} visits</p>
              </div>
              <ExportMenu getSpec={exportSpec} disabled={!(day.entries.length || day.receipts.length || day.supplements.length || day.visits.length)} label="Export day" />
            </div>

            <Section title="New members" count={day.entries.length}>
              {day.entries.map((e) => (
                <Row key={e.id} left={e.name} sub={e.member_code ?? ''} right={<span className="text-gym-muted capitalize">{e.approval_status ?? ''}</span>} />
              ))}
            </Section>

            <Section title="Amount received" count={day.receipts.length} extra={day.receipts.length ? `${rupees(t.received)} · Cash ${rupees(t.cash)} · UPI ${rupees(t.upi)}` : undefined}>
              {day.receipts.map((r) => (
                <Row
                  key={r.id}
                  left={r.member}
                  sub={`${r.receipt_no} · ${time(r.at)}${r.received_by ? ` · by ${r.received_by}` : ''}`}
                  right={<span className="text-emerald-400">{rupees(r.amount)} <span className="text-gym-muted uppercase text-[10px]">{r.mode}</span></span>}
                />
              ))}
            </Section>

            <Section title="Supplements" count={day.supplements.length} extra={day.supplements.length ? rupees(t.supplementsValue) : undefined}>
              {day.supplements.map((s) => (
                <Row key={s.id} left={s.member} sub={[s.supplement, s.brand, s.quantity].filter(Boolean).join(' · ')} right={s.price != null ? rupees(s.price) : '—'} />
              ))}
            </Section>

            <Section title="Attendance" count={t.visits}>
              {day.visits.map((v) => (
                <Row key={v.id} left={v.member} sub={v.member_code ?? ''} right={<span className="text-gym-muted">{time(v.at)} · {v.method}</span>} />
              ))}
            </Section>
          </Card>
        </div>
      </div>
    </>
  );
};

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <Card hoverEffect={false} className="p-4 flex flex-col gap-1" aria-label={label}>
    <span className="flex items-center gap-2 text-xs text-gym-muted uppercase font-heading">{icon}{label}</span>
    <span className="text-lg sm:text-xl text-white font-heading break-words">{value}</span>
  </Card>
);

const Section: React.FC<{ title: string; count: number; extra?: string; children: React.ReactNode }> = ({ title, count, extra, children }) => (
  <section aria-label={title} className="flex flex-col gap-2">
    <div className="flex items-baseline justify-between gap-2 flex-wrap border-b border-gym-border pb-1">
      <h3 className="font-heading text-gym-primary text-sm uppercase tracking-wide">{title} ({count})</h3>
      {extra && <span className="text-xs text-white">{extra}</span>}
    </div>
    {count === 0 ? <p className="text-xs text-gym-muted">Nothing on this day.</p> : <ul className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">{children}</ul>}
  </section>
);

const Row: React.FC<{ left: string; sub?: string; right: React.ReactNode }> = ({ left, sub, right }) => (
  <li className="flex items-center justify-between gap-3 text-sm">
    <span className="min-w-0">
      <span className="block text-white truncate">{left}</span>
      {sub && <span className="block text-[11px] text-gym-muted truncate">{sub}</span>}
    </span>
    <span className="shrink-0 text-right text-sm">{right}</span>
  </li>
);
