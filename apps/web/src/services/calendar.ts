// Admin calendar: everything that happened on each day of a month - new members,
// money received, supplements and attendance. Read-only; row level security decides
// what each staff member can see.
import { supabase } from '../lib/supabase';
import { friendlyError } from './portal';
import { localDay } from './gym';

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(friendlyError(error.message));
  return data;
}

export interface Person {
  full_name: string;
  member_code?: string | null;
}

export interface DayEntry {
  id: string;
  name: string;
  member_code: string | null;
  approval_status: string | null;
  at: string;
}
export interface DayReceipt {
  id: string;
  receipt_no: string;
  amount: number;
  mode: string;
  note: string | null;
  member: string;
  member_code: string | null;
  received_by: string;
  at: string;
}
export interface DaySupplement {
  id: string;
  supplement: string;
  brand: string | null;
  quantity: string | null;
  price: number | null;
  member: string;
  member_code: string | null;
}
export interface DayVisit {
  id: string;
  member: string;
  member_code: string | null;
  method: string;
  at: string;
}
export interface DayData {
  entries: DayEntry[];
  receipts: DayReceipt[];
  supplements: DaySupplement[];
  visits: DayVisit[];
}

export const emptyDay = (): DayData => ({ entries: [], receipts: [], supplements: [], visits: [] });

export const dayTotals = (d: DayData) => {
  const cash = d.receipts.filter((r) => r.mode === 'cash').reduce((s, r) => s + r.amount, 0);
  const received = d.receipts.reduce((s, r) => s + r.amount, 0);
  return {
    entries: d.entries.length,
    received,
    cash,
    upi: received - cash,
    supplements: d.supplements.length,
    supplementsValue: d.supplements.reduce((s, x) => s + (Number(x.price) || 0), 0),
    visits: new Set(d.visits.map((v) => v.member_code ?? v.member)).size,
  };
};

const pad = (n: number) => String(n).padStart(2, '0');

/** First and last moment (local time) of a month, plus its YYYY-MM-DD bounds. */
export function monthRange(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1, 0, 0, 0, -1);
  const last = new Date(year, month + 1, 0).getDate();
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    firstDay: `${year}-${pad(month + 1)}-01`,
    lastDay: `${year}-${pad(month + 1)}-${pad(last)}`,
  };
}

/** Loads one month and groups it by day (YYYY-MM-DD). `month` is 0-based. */
export async function loadMonth(year: number, month: number): Promise<Map<string, DayData>> {
  const r = monthRange(year, month);
  const [members, receipts, supplements, visits] = await Promise.all([
    supabase.from('profiles').select('id, full_name, member_code, approval_status, created_at').eq('role', 'member').gte('created_at', r.startIso).lte('created_at', r.endIso),
    supabase.from('payment_receipts').select('*').gte('received_at', r.startIso).lte('received_at', r.endIso),
    supabase.from('supplement_logs').select('*').gte('taken_on', r.firstDay).lte('taken_on', r.lastDay),
    supabase.from('attendance').select('id, member_id, check_in, method').gte('check_in', r.startIso).lte('check_in', r.endIso),
  ]);
  const memberRows = (unwrap(members) ?? []) as any[];
  const receiptRows = ((unwrap(receipts) ?? []) as any[]).filter((x) => !x.voided_at);
  const supplementRows = (unwrap(supplements) ?? []) as any[];
  const visitRows = (unwrap(visits) ?? []) as any[];

  // Names for everyone mentioned, in one query.
  const ids = new Set<string>();
  for (const x of receiptRows) [x.member_id, x.received_by].forEach((id) => id && ids.add(id));
  for (const x of supplementRows) x.member_id && ids.add(x.member_id);
  for (const x of visitRows) x.member_id && ids.add(x.member_id);
  const people = new Map<string, Person>();
  if (ids.size) {
    const rows = (unwrap(await supabase.from('profiles').select('id, full_name, member_code').in('id', [...ids])) ?? []) as any[];
    for (const p of rows) people.set(p.id, p);
  }
  const nameOf = (id?: string | null) => (id && people.get(id)?.full_name) || 'Unknown';
  const codeOf = (id?: string | null) => (id && people.get(id)?.member_code) || null;

  const days = new Map<string, DayData>();
  const day = (key: string) => {
    let d = days.get(key);
    if (!d) days.set(key, (d = emptyDay()));
    return d;
  };

  for (const m of memberRows)
    day(localDay(m.created_at)).entries.push({ id: m.id, name: m.full_name || 'New member', member_code: m.member_code ?? null, approval_status: m.approval_status ?? null, at: m.created_at });
  for (const x of receiptRows)
    day(localDay(x.received_at)).receipts.push({
      id: x.id,
      receipt_no: x.receipt_no,
      amount: Number(x.amount) || 0,
      mode: x.payment_mode,
      note: x.note ?? null,
      member: x.member_id ? nameOf(x.member_id) : 'Deleted member',
      member_code: codeOf(x.member_id),
      received_by: x.received_by ? nameOf(x.received_by) : '',
      at: x.received_at,
    });
  for (const x of supplementRows)
    day(String(x.taken_on).slice(0, 10)).supplements.push({
      id: x.id,
      supplement: x.supplement,
      brand: x.brand ?? null,
      quantity: x.quantity ?? null,
      price: x.price == null ? null : Number(x.price),
      member: nameOf(x.member_id),
      member_code: codeOf(x.member_id),
    });
  for (const x of visitRows)
    day(localDay(x.check_in)).visits.push({ id: x.id, member: nameOf(x.member_id), member_code: codeOf(x.member_id), method: x.method, at: x.check_in });

  for (const d of days.values()) {
    d.entries.sort((a, b) => a.at.localeCompare(b.at));
    d.receipts.sort((a, b) => a.at.localeCompare(b.at));
    d.visits.sort((a, b) => a.at.localeCompare(b.at));
  }
  return days;
}
