// Gym operations stored in Supabase: memberships, plan requests, payments/invoices,
// attendance, gym settings, notifications, water tracking, leads and reports.
// Every call is checked by row level security (migration 07).
import { supabase } from '../lib/supabase';
import { friendlyError, validateImage } from './portal';
import type { UserProfile } from '../types';

function unwrap<T>({ data, error }: { data: T; error: { message: string } | null }): T {
  if (error) throw new Error(friendlyError(error.message));
  return data;
}

/** Local calendar date (YYYY-MM-DD) of a timestamp, e.g. an attendance check-in. */
export const localDay = (d: string | Date = new Date()) => new Date(d).toLocaleDateString('en-CA');
const today = () => localDay();

// ---- Settings ------------------------------------------------------------------

export interface DiscountSetting {
  enabled: boolean;
  percent: number;
  label: string;
}
export interface GeofenceSetting {
  enabled: boolean;
  lat: number | null;
  lng: number | null;
  radius_m: number;
}
export interface GymSettings {
  discount: DiscountSetting;
  geofence: GeofenceSetting;
  content_approval: { required: boolean };
}

export const DEFAULT_SETTINGS: GymSettings = {
  discount: { enabled: false, percent: 10, label: 'Special offer' },
  geofence: { enabled: false, lat: null, lng: null, radius_m: 100 },
  content_approval: { required: false },
};

export async function getSettings(): Promise<GymSettings> {
  const rows = unwrap(await supabase.from('settings').select('key, value')) as { key: string; value: any }[] | null;
  const merged: any = { ...DEFAULT_SETTINGS };
  for (const row of rows ?? []) {
    if (row.key in merged) merged[row.key] = { ...merged[row.key], ...row.value };
  }
  return merged as GymSettings;
}

export async function saveSetting<K extends keyof GymSettings>(key: K, value: GymSettings[K]): Promise<void> {
  unwrap(await supabase.from('settings').upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' }));
}

/** Same rounding as public.discounted_price() in the database. */
export function applyDiscount(price: number, discount?: DiscountSetting | null): number {
  if (!discount?.enabled) return price;
  const pct = Math.min(Math.max(Math.round(discount.percent || 0), 0), 90);
  return Math.round((price * (100 - pct)) / 100);
}

// ---- Members ---------------------------------------------------------------------

const MEMBER_COLUMNS =
  'id, full_name, email, phone, role, avatar_url, assigned_trainer_id, dob, blood_group, height_cm, weight_kg, medicines, health_notes, membership_tier, member_code, created_at';

export async function getProfile(id: string): Promise<UserProfile | null> {
  return unwrap(await supabase.from('profiles').select(MEMBER_COLUMNS).eq('id', id).maybeSingle()) as UserProfile | null;
}

export async function listMembers(): Promise<UserProfile[]> {
  return (unwrap(await supabase.from('profiles').select(MEMBER_COLUMNS).eq('role', 'member').order('full_name', { ascending: true })) ??
    []) as UserProfile[];
}

export type ProfilePatch = Partial<
  Pick<UserProfile, 'full_name' | 'phone' | 'dob' | 'blood_group' | 'height_cm' | 'weight_kg' | 'medicines' | 'health_notes' | 'membership_tier' | 'avatar_url'>
>;

export async function updateProfile(id: string, patch: ProfilePatch): Promise<void> {
  const rows = unwrap(await supabase.from('profiles').update(patch).eq('id', id).select('id')) as { id: string }[] | null;
  if (!rows || rows.length === 0) throw new Error("You don't have permission to change this person's details.");
}

/** Age in whole years from a YYYY-MM-DD date of birth. */
export function ageFromDob(dob?: string | null, now = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

// ---- Memberships -------------------------------------------------------------------

export interface Membership {
  id: string;
  member_id: string;
  plan_code: string | null;
  plan_title: string | null;
  price: number | null;
  start_date: string;
  end_date: string;
  status: 'active' | 'expired' | 'frozen' | 'cancelled';
  created_at: string;
}

export async function listMemberships(memberId?: string): Promise<Membership[]> {
  let q = supabase.from('memberships').select('*');
  if (memberId) q = q.eq('member_id', memberId);
  return (unwrap(await q.order('end_date', { ascending: false })) ?? []) as Membership[];
}

/** The membership covering today, or the most recent one. */
export function currentMembership(rows: Membership[], on = today()): Membership | null {
  return (
    rows.find((m) => m.status === 'active' && m.start_date <= on && m.end_date >= on) ??
    rows.find((m) => m.status === 'active' && m.start_date > on) ??
    rows[0] ??
    null
  );
}

export function daysLeft(m: Membership | null, on = today()): number | null {
  if (!m) return null;
  return Math.round((new Date(m.end_date).getTime() - new Date(on).getTime()) / 86400000);
}

// ---- Plan requests -------------------------------------------------------------------

export interface PlanRequest {
  id: string;
  member_id: string;
  plan_code: string;
  plan_title: string;
  months: number;
  base_price: number;
  price: number;
  request_type: 'renew' | 'change';
  payment_preference: 'online' | 'desk';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string | null;
  decided_at: string | null;
  payment_id: string | null;
  created_at: string;
  member?: Pick<UserProfile, 'full_name' | 'phone' | 'member_code' | 'avatar_url'> | null;
}

export async function requestPlan(planCode: string, payment: 'online' | 'desk', type: 'renew' | 'change'): Promise<PlanRequest> {
  return unwrap(await supabase.rpc('request_plan', { p_plan_code: planCode, p_payment: payment, p_type: type })) as PlanRequest;
}

export async function listPlanRequests(opts: { memberId?: string; status?: PlanRequest['status'] } = {}): Promise<PlanRequest[]> {
  let q = supabase.from('plan_requests').select('*, member:profiles!plan_requests_member_id_fkey(full_name, phone, member_code, avatar_url)');
  if (opts.memberId) q = q.eq('member_id', opts.memberId);
  if (opts.status) q = q.eq('status', opts.status);
  return (unwrap(await q.order('created_at', { ascending: false })) ?? []) as PlanRequest[];
}

export async function cancelPlanRequest(id: string): Promise<void> {
  unwrap(await supabase.from('plan_requests').update({ status: 'cancelled' }).eq('id', id));
}

export async function decidePlanRequest(
  id: string,
  approve: boolean,
  opts: { markPaid?: boolean; mode?: 'cash' | 'upi' | 'online'; note?: string } = {},
): Promise<PlanRequest> {
  return unwrap(
    await supabase.rpc('decide_plan_request', {
      p_request: id,
      p_approve: approve,
      p_mark_paid: !!opts.markPaid,
      p_mode: opts.mode ?? 'cash',
      p_note: opts.note ?? null,
    }),
  ) as PlanRequest;
}

// ---- New member registration & approval -----------------------------------------------

export interface RegistrationDetails {
  full_name: string;
  phone: string;
  dob: string;
  blood_group?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  medicines?: string | null;
  health_notes?: string | null;
}

/** Member sends their registration form; it waits for the owner's approval. */
export async function submitRegistration(d: RegistrationDetails): Promise<UserProfile> {
  return unwrap(
    await supabase.rpc('submit_registration', {
      p_full_name: d.full_name,
      p_phone: d.phone,
      p_dob: d.dob,
      p_blood_group: d.blood_group ?? null,
      p_height_cm: d.height_cm ?? null,
      p_weight_kg: d.weight_kg ?? null,
      p_medicines: d.medicines ?? null,
      p_health_notes: d.health_notes ?? null,
    }),
  ) as UserProfile;
}

export async function listPendingRegistrations(): Promise<UserProfile[]> {
  return (unwrap(
    await supabase
      .from('profiles')
      .select(`${MEMBER_COLUMNS}, approval_status, registration_submitted_at`)
      .eq('role', 'member')
      .eq('approval_status', 'pending')
      .order('registration_submitted_at', { ascending: true }),
  ) ?? []) as UserProfile[];
}

export async function decideRegistration(memberId: string, approve: boolean, note?: string): Promise<UserProfile> {
  return unwrap(await supabase.rpc('decide_registration', { p_member: memberId, p_approve: approve, p_note: note ?? null })) as UserProfile;
}

// ---- Payments & invoices ---------------------------------------------------------------

export interface Payment {
  id: string;
  member_id: string;
  membership_id: string | null;
  plan_code: string | null;
  plan_title: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  discount_amount: number;
  payment_mode: 'online' | 'upi' | 'cash';
  status: 'pending' | 'paid' | 'failed';
  gst_invoice_no: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  member?: Pick<UserProfile, 'full_name' | 'phone' | 'email' | 'member_code'> | null;
  membership?: Pick<Membership, 'start_date' | 'end_date'> | null;
  /** Why the owner deleted this entry (migration 17). */
  cancel_reason?: string | null;
  /** Received so far on this bill (part payments, migration 14). */
  amount_paid?: number | null;
  /** Set when the member was deleted: the payment is kept for the accounts (migration 11). */
  deleted_member_label?: string | null;
  period_start?: string | null;
  period_end?: string | null;
}

/** Who paid: the member's name, or "Deleted member · RVF-0007" once they were deleted. */
export const payerName = (p: Pick<Payment, 'member' | 'deleted_member_label'>) => p.member?.full_name ?? p.deleted_member_label ?? 'Member';

// ---- Staff change a member's plan (migration 13) -------------------------------------------

export interface AssignPlanInput {
  /** A plan code from Subscription Plans, or 'custom'. */
  planCode: string;
  start: string;
  payment: 'cash' | 'upi' | 'due';
  /** Custom amount (Gym Owner / Super Admin only). */
  price?: number | null;
  title?: string | null;
  months?: number | null;
  days?: number | null;
  note?: string | null;
}

export async function assignMembership(memberId: string, input: AssignPlanInput): Promise<{ title: string; price: number; start_date: string; end_date: string }> {
  return unwrap(
    await supabase.rpc('assign_membership', {
      p_member: memberId,
      p_plan_code: input.planCode,
      p_start: input.start,
      p_payment: input.payment,
      p_price: input.price ?? null,
      p_title: input.title ?? null,
      p_months: input.months ?? null,
      p_days: input.days ?? null,
      p_note: input.note ?? null,
    }),
  ) as { title: string; price: number; start_date: string; end_date: string };
}

// ---- Deleting a member (Gym Owner / Super Admin) ------------------------------------------

const MEMBER_FILE_BUCKETS = ['avatars', 'progress-photos', 'attendance-selfies'];

/**
 * Permanently deletes a member: first their photos (profile, body progress, attendance
 * selfies), then their login and all their data. Payments are kept, anonymised.
 * Photos go first so nothing private is left behind if the second step fails.
 */
export async function deleteMember(memberId: string): Promise<{ name: string; payments_kept: number }> {
  for (const bucket of MEMBER_FILE_BUCKETS) {
    const store = supabase.storage.from(bucket);
    const { data: files, error: listError } = await store.list(memberId, { limit: 1000 });
    if (listError) throw new Error(`Could not read the member's photos: ${friendlyError(listError.message)}`);
    const paths = (files ?? []).filter((f: { name: string }) => f.name && f.name !== '.emptyFolderPlaceholder').map((f: { name: string }) => `${memberId}/${f.name}`);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await store.remove(paths.slice(i, i + 100));
      if (error) throw new Error(`Could not delete the member's photos: ${friendlyError(error.message)}`);
    }
  }
  return unwrap(await supabase.rpc('delete_member', { p_member: memberId })) as { name: string; payments_kept: number };
}

const PAYMENT_SELECT =
  '*, member:profiles!payments_member_id_fkey(full_name, phone, email, member_code), membership:memberships(start_date, end_date)';

export async function listPayments(memberId?: string): Promise<Payment[]> {
  let q = supabase.from('payments').select(PAYMENT_SELECT);
  if (memberId) q = q.eq('member_id', memberId);
  return (unwrap(await q.order('created_at', { ascending: false })) ?? []) as Payment[];
}

export async function getPayment(id: string): Promise<Payment | null> {
  return unwrap(await supabase.from('payments').select(PAYMENT_SELECT).eq('id', id).maybeSingle()) as Payment | null;
}

/** Marks the rest of a bill as received (creates a receipt). Falls back to a plain update before migration 14. */
export async function markPaymentPaid(id: string, mode: Payment['payment_mode']): Promise<void> {
  const { error } = await supabase.rpc('record_payment', { p_payment: id, p_amount: null, p_mode: mode === 'upi' ? 'upi' : 'cash', p_note: null });
  if (!error) return;
  if (!/record_payment|schema cache|does not exist/i.test(error.message)) throw new Error(friendlyError(error.message));
  unwrap(await supabase.from('payments').update({ status: 'paid', payment_mode: mode }).eq('id', id));
}

// ---- Money received & receipts (migration 14) --------------------------------------------

export interface Receipt {
  id: string;
  receipt_no: string;
  payment_id: string;
  member_id: string | null;
  amount: number;
  payment_mode: 'cash' | 'upi' | 'online';
  note: string | null;
  received_by: string | null;
  received_at: string;
  /** Set when the owner deleted the payment this receipt belongs to. */
  voided_at?: string | null;
  void_reason?: string | null;
  payment?: Pick<Payment, 'id' | 'plan_title' | 'total_amount' | 'amount_paid' | 'status' | 'gst_invoice_no' | 'deleted_member_label'> | null;
  member?: Pick<UserProfile, 'full_name' | 'member_code' | 'phone' | 'email'> | null;
  staff?: Pick<UserProfile, 'full_name'> | null;
}

const RECEIPT_SELECT =
  '*, payment:payments(id, plan_title, total_amount, amount_paid, status, gst_invoice_no, deleted_member_label), member:profiles!payment_receipts_member_id_fkey(full_name, member_code, phone, email), staff:profiles!payment_receipts_received_by_fkey(full_name)';

export async function listReceipts(memberId: string): Promise<Receipt[]> {
  return (unwrap(await supabase.from('payment_receipts').select(RECEIPT_SELECT).eq('member_id', memberId).order('received_at', { ascending: false })) ??
    []) as Receipt[];
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  return unwrap(await supabase.from('payment_receipts').select(RECEIPT_SELECT).eq('id', id).maybeSingle()) as Receipt | null;
}

export interface RecordPaymentInput {
  /** Due bill the money is for; leave empty for other money (e.g. personal training). */
  paymentId?: string | null;
  memberId: string;
  amount: number;
  mode: 'cash' | 'upi';
  note?: string | null;
  /** Title for other money, e.g. "Personal training". */
  title?: string | null;
}

export async function recordPayment(input: RecordPaymentInput): Promise<{ receipt_id: string; receipt_no: string; remaining: number; status: Payment['status'] }> {
  if (!(input.amount > 0)) throw new Error('Enter the amount received.');
  return unwrap(
    await supabase.rpc('record_payment', {
      p_payment: input.paymentId ?? null,
      p_amount: input.amount,
      p_mode: input.mode,
      p_note: input.note ?? null,
      p_member: input.paymentId ? null : input.memberId,
      p_title: input.paymentId ? null : input.title ?? null,
    }),
  ) as { receipt_id: string; receipt_no: string; remaining: number; status: Payment['status'] };
}

/** Owner / Super Admin delete a payment entry made by mistake; a reason is required (migration 17). */
export async function cancelPayment(paymentId: string, reason: string): Promise<{ receipts_voided: number }> {
  if (reason.trim().length < 3) throw new Error('Please write why this payment is being deleted.');
  return unwrap(await supabase.rpc('cancel_payment', { p_payment: paymentId, p_reason: reason.trim() })) as { receipts_voided: number };
}

/** Staff add any amount the member must pay later (migration 15). */
export async function addCharge(memberId: string, amount: number, title: string, note?: string | null): Promise<{ payment_id: string }> {
  if (!(amount > 0)) throw new Error('Enter the amount due.');
  if (!title.trim()) throw new Error('Say what the amount is for.');
  return unwrap(await supabase.rpc('add_charge', { p_member: memberId, p_amount: amount, p_title: title.trim(), p_note: note ?? null })) as { payment_id: string };
}

/** Staff add a visit on a past day (from 1 Jan 2023). */
export async function addAttendanceDay(memberId: string, day: string): Promise<{ already: boolean }> {
  return unwrap(await supabase.rpc('add_attendance_day', { p_member: memberId, p_day: day })) as { already: boolean };
}

export async function removeAttendance(id: string): Promise<void> {
  const rows = unwrap(await supabase.from('attendance').delete().eq('id', id).select('id')) as { id: string }[] | null;
  if (!rows || rows.length === 0) throw new Error("You can't remove this visit.");
}

/** Amount already received on a bill (works before migration 14 too). */
export const paidOn = (p: Pick<Payment, 'status' | 'total_amount' | 'amount_paid'>) =>
  p.status === 'paid' ? Number(p.total_amount) : Number(p.amount_paid ?? 0);

/** Billed, received and still due across a member's bills (failed bills ignored). */
export function paymentTotals(payments: Pick<Payment, 'status' | 'total_amount' | 'amount_paid'>[]) {
  const live = payments.filter((p) => p.status !== 'failed');
  const billed = live.reduce((s, p) => s + Number(p.total_amount), 0);
  const paid = live.reduce((s, p) => s + paidOn(p), 0);
  return { billed, paid, remaining: Math.max(billed - paid, 0) };
}

// ---- Attendance -----------------------------------------------------------------------

export interface AttendanceRow {
  id: string;
  member_id: string;
  check_in: string;
  method: string;
  verified_by: string | null;
  selfie_path: string | null;
  distance_m: number | null;
  member?: Pick<UserProfile, 'full_name' | 'member_code' | 'avatar_url'> | null;
}

export async function listAttendance(opts: { memberId?: string; since?: string } = {}): Promise<AttendanceRow[]> {
  let q = supabase.from('attendance').select('*, member:profiles!attendance_member_id_fkey(full_name, member_code, avatar_url)');
  if (opts.memberId) q = q.eq('member_id', opts.memberId);
  if (opts.since) q = q.gte('check_in', opts.since);
  return (unwrap(await q.order('check_in', { ascending: false })) ?? []) as AttendanceRow[];
}

/** Consecutive days (ending today or yesterday) with a check-in. */
export function attendanceStreak(rows: Pick<AttendanceRow, 'check_in'>[], now = new Date()): number {
  const days = new Set(rows.map((r) => localDay(r.check_in)));
  const d = new Date(now);
  if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
  let streak = 0;
  while (days.has(localDay(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export async function getMyQrToken(): Promise<string> {
  return unwrap(await supabase.rpc('my_qr_token')) as string;
}

export interface ScanResult {
  member_id: string;
  full_name: string;
  member_code: string | null;
  avatar_url: string | null;
  status: 'active' | 'inactive';
  already_checked_in: boolean;
}

export async function checkInByQr(token: string): Promise<ScanResult> {
  return unwrap(await supabase.rpc('check_in_by_qr', { p_token: token.trim() })) as ScanResult;
}

/** Staff marks attendance for a member found by name, phone or member code. */
export async function staffCheckIn(memberId: string, staffId: string): Promise<{ already: boolean }> {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const start = midnight.toISOString();
  const existing = unwrap(
    await supabase.from('attendance').select('id').eq('member_id', memberId).gte('check_in', start).limit(1),
  ) as { id: string }[] | null;
  if (existing && existing.length) return { already: true };
  unwrap(await supabase.from('attendance').insert({ member_id: memberId, method: 'manual', verified_by: staffId }));
  return { already: false };
}

export const SELFIE_BUCKET = 'attendance-selfies';

export async function selfieCheckIn(memberId: string, selfie: Blob, coords: { lat: number; lng: number }) {
  if (selfie instanceof File) validateImage(selfie, 3);
  const path = `${memberId}/${Date.now()}.jpg`;
  const { error } = await supabase.storage.from(SELFIE_BUCKET).upload(path, selfie, { contentType: 'image/jpeg', upsert: false });
  if (error) throw new Error(friendlyError(error.message));
  return unwrap(
    await supabase.rpc('self_check_in', { p_lat: coords.lat, p_lng: coords.lng, p_selfie_path: path }),
  ) as { already_checked_in: boolean; distance_m: number };
}

export function currentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('This device cannot share its location.'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('Please allow location access to check in from the gym.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

// ---- Notifications --------------------------------------------------------------------

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export async function listNotifications(): Promise<AppNotification[]> {
  return (unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(30)) ?? []) as AppNotification[];
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  unwrap(await supabase.from('notifications').update({ is_read: true }).in('id', ids));
}

// ---- Water tracking --------------------------------------------------------------------

export async function getWater(memberId: string, date = today()): Promise<number> {
  const row = unwrap(await supabase.from('water_logs').select('glasses').eq('member_id', memberId).eq('log_date', date).maybeSingle()) as {
    glasses: number;
  } | null;
  return row?.glasses ?? 0;
}

export async function setWater(memberId: string, glasses: number, date = today()): Promise<void> {
  unwrap(
    await supabase
      .from('water_logs')
      .upsert({ member_id: memberId, log_date: date, glasses: Math.max(0, Math.min(30, glasses)) }, { onConflict: 'member_id,log_date' }),
  );
}

// ---- Leads, visit bookings, expenses ---------------------------------------------------

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: 'new' | 'contacted' | 'trial' | 'converted' | 'lost';
  notes: string | null;
  created_at: string;
}
export interface TrialBooking {
  id: string;
  name: string;
  phone: string;
  preferred_date: string;
  preferred_slot: string;
  status: string | null;
  created_at: string;
}
export interface Expense {
  id: string;
  title: string;
  category: string;
  amount: number;
  payment_date: string;
  notes: string | null;
}

export async function listLeads(): Promise<Lead[]> {
  return (unwrap(await supabase.from('leads').select('*').order('created_at', { ascending: false })) ?? []) as Lead[];
}
export async function updateLeadStatus(id: string, status: Lead['status']): Promise<void> {
  unwrap(await supabase.from('leads').update({ status }).eq('id', id));
}
export async function listTrialBookings(): Promise<TrialBooking[]> {
  return (unwrap(await supabase.from('trial_bookings').select('*').order('preferred_date', { ascending: true })) ?? []) as TrialBooking[];
}
export async function updateTrialStatus(id: string, status: string): Promise<void> {
  unwrap(await supabase.from('trial_bookings').update({ status }).eq('id', id));
}
export async function listExpenses(): Promise<Expense[]> {
  return (unwrap(await supabase.from('expenses').select('*').order('payment_date', { ascending: false })) ?? []) as Expense[];
}
export async function addExpense(e: Omit<Expense, 'id'>, createdBy: string): Promise<void> {
  unwrap(await supabase.from('expenses').insert({ ...e, created_by: createdBy }));
}

// ---- Reports ---------------------------------------------------------------------------

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => esc(r[h])).join(','))].join('\n');
}

export function downloadFile(name: string, content: string, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
