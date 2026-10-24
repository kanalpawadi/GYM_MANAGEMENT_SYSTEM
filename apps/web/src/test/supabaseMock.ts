// In-memory stand-in for the Supabase client (auth, tables, storage).
// Usage in a test file:
//   vi.mock('../../lib/supabase', async () => ({ supabase: (await import('../../test/supabaseMock')).supabaseMock }));
//   beforeEach(() => resetSupabaseMock());
import { vi } from 'vitest';
import type { UserProfile } from '../types';

type Listener = (event: string, session: FakeSession | null) => void;
type Row = Record<string, any>;
interface FakeSession {
  access_token: string;
  user: { id: string; email: string };
}

const state = {
  session: null as FakeSession | null,
  listeners: [] as Listener[],
  users: {} as Record<string, { password: string; profile: UserProfile }>,
  tables: {} as Record<string, Row[]>,
  failures: {} as Record<string, string>,
  uploads: [] as { bucket: string; path: string; file: unknown }[],
  removed: [] as { bucket: string; path: string }[],
};

const makeSession = (profile: UserProfile): FakeSession => ({
  access_token: `token-${profile.id}`,
  user: { id: profile.id, email: profile.email },
});

function emit(event: string, session: FakeSession | null) {
  state.session = session;
  state.listeners.forEach((listener) => listener(event, session));
}

export const supabaseMock: any = { auth: {} };

export function makeProfile(role: UserProfile['role'], overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: `${role}-uid`,
    full_name: `Test ${role}`,
    email: `${role}@example.com`,
    role,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Direct access to a fake table, e.g. table('diet_plans'). */
export function table(name: string): Row[] {
  return (state.tables[name] ??= []);
}

export function seed(name: string, rows: Row[]) {
  table(name).push(...rows.map((r) => ({ ...r })));
}

/** Makes the next write (insert/update/upsert/delete) to `name` fail with `message`. */
export function failNextWrite(name: string, message: string) {
  state.failures[name] = message;
}

export const uploads = () => state.uploads;
export const removedFiles = () => state.removed;

/** Makes the next upload to a storage bucket fail with `message`. */
export function failNextUpload(bucket: string, message: string) {
  state.failures[`storage:${bucket}`] = message;
}

/** Makes the next call to database function `fn` fail with `message`. */
export function failNextRpc(fn: string, message: string) {
  state.failures[`rpc:${fn}`] = message;
}

/** Registers an account that can sign in with email/password. */
export function addUser(profile: UserProfile, password = 'correct-horse') {
  state.users[profile.email] = { password, profile };
  const rows = table('profiles');
  const existing = rows.findIndex((r) => r.id === profile.id);
  if (existing >= 0) rows[existing] = { ...profile };
  else rows.push({ ...profile });
}

/** Starts the test with this user already signed in (as if restored from storage). */
export function signInAs(profile: UserProfile) {
  addUser(profile);
  state.session = makeSession(profile);
}

/** Simulates a valid auth session whose user has no row in public.profiles. */
export function signInWithoutProfile(id = 'orphan-uid') {
  state.session = { access_token: 'orphan', user: { id, email: 'orphan@example.com' } };
}

let idCounter = 0;

const PLAN_CATALOG: Record<string, { title: string; months: number; price: number }> = {
  monthly: { title: 'Monthly', months: 1, price: 1500 },
  'six-month': { title: 'Six Month', months: 6, price: 7500 },
  yearly: { title: 'Yearly', months: 12, price: 12000 },
};

class Query implements PromiseLike<{ data: any; error: any }> {
  private filters: ((row: Row) => boolean)[] = [];
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any;
  private orderBy: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private returnRows = false;
  private conflict: string[] | null = null;

  constructor(private name: string) {}

  select() {
    if (this.op !== 'select') this.returnRows = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = 'insert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  update(patch: Row) {
    this.op = 'update';
    this.payload = patch;
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string } = {}) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.conflict = opts.onConflict ? opts.onConflict.split(',').map((c) => c.trim()) : null;
    return this;
  }
  gte(column: string, value: any) {
    this.filters.push((r) => r[column] >= value);
    return this;
  }
  lte(column: string, value: any) {
    this.filters.push((r) => r[column] <= value);
    return this;
  }
  delete() {
    this.op = 'delete';
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((r) => r[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((r) => r[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((r) => values.includes(r[column]));
    return this;
  }
  is(column: string, value: unknown) {
    this.filters.push((r) => (r[column] ?? null) === value);
    return this;
  }
  order(column: string, { ascending = true } = {}) {
    this.orderBy = { column, ascending };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.mode = 'single';
    return this;
  }
  maybeSingle() {
    this.mode = 'maybeSingle';
    return this;
  }

  private run(): { data: any; error: any } {
    const rows = table(this.name);
    const matches = (r: Row) => this.filters.every((f) => f(r));

    if (this.op !== 'select' && state.failures[this.name]) {
      const message = state.failures[this.name];
      delete state.failures[this.name];
      return { data: null, error: { message } };
    }

    let result: Row[];
    if (this.op === 'insert') {
      result = this.payload.map((r: Row) => ({ id: `${this.name}-${++idCounter}`, created_at: new Date(Date.now() + idCounter).toISOString(), ...r }));
      rows.push(...result);
    } else if (this.op === 'upsert') {
      result = this.payload.map((r: Row) => {
        const keys = this.conflict ?? ['key' in r ? 'key' : 'id'];
        const i = rows.findIndex((x) => keys.every((k) => x[k] === r[k]));
        if (i >= 0) rows[i] = { ...rows[i], ...r };
        else rows.push({ ...r });
        return i >= 0 ? rows[i] : r;
      });
    } else if (this.op === 'update') {
      result = rows.filter(matches);
      result.forEach((r) => Object.assign(r, this.payload));
    } else if (this.op === 'delete') {
      result = rows.filter(matches);
      state.tables[this.name] = rows.filter((r) => !matches(r));
    } else {
      result = rows.filter(matches);
    }

    result = result.map((r) => ({ ...r }));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result.sort((a, b) => (a[column] > b[column] ? 1 : a[column] < b[column] ? -1 : 0) * (ascending ? 1 : -1));
    }
    if (this.max != null) result = result.slice(0, this.max);

    if (this.op !== 'select' && !this.returnRows && this.mode === 'many') return { data: null, error: null };
    if (this.mode === 'single') {
      return result.length === 1 ? { data: result[0], error: null } : { data: null, error: { message: 'Row not found' } };
    }
    if (this.mode === 'maybeSingle') return { data: result[0] ?? null, error: null };
    return { data: result, error: null };
  }

  then<TResult1 = { data: any; error: any }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve().then(() => this.run()).then(onfulfilled, onrejected);
  }
}

export function resetSupabaseMock() {
  state.session = null;
  state.listeners = [];
  state.users = {};
  state.tables = {};
  state.failures = {};
  state.uploads = [];
  state.removed = [];

  // Fresh vi.fn()s per test so implementations survive vi.restoreAllMocks() in setup.ts.
  supabaseMock.auth = {
    getSession: vi.fn(async () => ({ data: { session: state.session }, error: null })),
    onAuthStateChange: vi.fn((listener: Listener) => {
      state.listeners.push(listener);
      return {
        data: { subscription: { unsubscribe: () => (state.listeners = state.listeners.filter((l) => l !== listener)) } },
      };
    }),
    signInWithPassword: vi.fn(async ({ email, password }: { email: string; password: string }) => {
      const account = state.users[email];
      if (!account || account.password !== password) {
        return { data: { session: null, user: null }, error: { message: 'Invalid login credentials' } };
      }
      const session = makeSession(account.profile);
      emit('SIGNED_IN', session);
      return { data: { session, user: session.user }, error: null };
    }),
    signUp: vi.fn(async () => ({ data: { session: null, user: { id: 'new-uid' } }, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    updateUser: vi.fn(async () => ({ data: { user: state.session?.user ?? null }, error: null })),
    signInWithOAuth: vi.fn(async () => ({ data: { url: 'https://accounts.google.test' }, error: null })),
    signOut: vi.fn(async () => {
      emit('SIGNED_OUT', null);
      return { error: null };
    }),
  };

  supabaseMock.from = vi.fn((name: string) => new Query(name));

  // Simplified stand-ins for the database functions in migration 07.
  supabaseMock.rpc = vi.fn(async (fn: string, args: Record<string, any> = {}) => {
    const uid = state.session?.user.id;
    const ok = (data: unknown) => ({ data, error: null });
    const fail = (message: string) => ({ data: null, error: { message } });
    const forced = state.failures[`rpc:${fn}`];
    if (forced) {
      delete state.failures[`rpc:${fn}`];
      return fail(forced);
    }
    if (fn === 'ensure_my_profile') {
      if (!uid) return fail('Please sign in first');
      const email = state.session!.user.email;
      if (!table('profiles').some((p) => p.id === uid)) {
        if (table('profiles').some((p) => p.email === email)) return fail(`Another RV Fitness account already uses ${email}.`);
        table('profiles').push({ id: uid, full_name: email.split('@')[0], email, role: 'member', approval_status: 'incomplete', created_at: new Date().toISOString() });
      }
      return ok(uid);
    }
    if (fn === 'record_payment') {
      const me = table('profiles').find((p) => p.id === uid);
      if (!['receptionist', 'manager', 'owner', 'super_admin'].includes(me?.role)) return fail('Only gym staff can record payments');
      const receiptNo = `RCPT-2026-${String(++idCounter).padStart(5, '0')}`;
      let bill: Row;
      let amount: number;
      if (args.p_payment) {
        bill = table('payments').find((p) => p.id === args.p_payment)!;
        if (!bill) return fail('Bill not found');
        if (bill.status === 'paid') return fail('This bill is already fully paid');
        const left = bill.total_amount - (bill.amount_paid ?? 0);
        amount = args.p_amount ?? left;
        if (amount > left) return fail(`Only ₹${left} is left on this bill. Record the extra as a separate payment.`);
        bill.amount_paid = (bill.amount_paid ?? 0) + amount;
        if (bill.amount_paid >= bill.total_amount) Object.assign(bill, { status: 'paid', payment_mode: args.p_mode });
      } else {
        amount = args.p_amount;
        bill = { id: `pay-${++idCounter}`, member_id: args.p_member, plan_title: args.p_title || 'Other payment', amount, total_amount: amount, amount_paid: amount, status: 'paid', payment_mode: args.p_mode, notes: args.p_note, created_at: new Date().toISOString() };
        table('payments').push(bill);
      }
      const receipt = { id: `rc-${idCounter}`, receipt_no: receiptNo, payment_id: bill.id, member_id: bill.member_id, amount, payment_mode: args.p_mode, note: args.p_note ?? null, received_by: uid, received_at: new Date().toISOString() };
      table('payment_receipts').push(receipt);
      return ok({ receipt_id: receipt.id, receipt_no: receiptNo, payment_id: bill.id, amount, remaining: bill.total_amount - bill.amount_paid, status: bill.status });
    }
    if (fn === 'assign_membership') {
      const rank: Record<string, number> = { super_admin: 6, owner: 5, manager: 4, receptionist: 3, trainer: 2, member: 1 };
      const me = table('profiles').find((p) => p.id === uid);
      const myRank = rank[me?.role] ?? 0;
      if (myRank < 2) return fail('Only trainers and gym staff can change a plan');
      const custom = args.p_plan_code === 'custom';
      const plan = PLAN_CATALOG[args.p_plan_code];
      if (!custom && !plan) return fail('Unknown plan');
      if (custom && myRank < 5) return fail('Only the gym owner can create a custom plan');
      if (!custom && args.p_price != null && args.p_price !== plan.price && myRank < 5) return fail('Only the gym owner can set a custom amount');
      const title = custom ? args.p_title || 'Custom plan' : plan.title;
      const price = args.p_price ?? plan.price;
      const start = new Date(`${args.p_start}T00:00:00`);
      const end = new Date(start);
      if (custom && args.p_days) end.setDate(end.getDate() + args.p_days - 1);
      else {
        end.setMonth(end.getMonth() + (custom ? args.p_months : plan.months));
        end.setDate(end.getDate() - 1);
      }
      const endIso = end.toLocaleDateString('en-CA');
      const ms = { id: `ms-${++idCounter}`, member_id: args.p_member, plan_code: args.p_plan_code, plan_title: title, price, start_date: args.p_start, end_date: endIso, status: 'active', created_at: new Date().toISOString() };
      table('memberships').push(ms);
      table('payments').push({
        id: `pay-${++idCounter}`, member_id: args.p_member, membership_id: ms.id, plan_title: title, amount: price, total_amount: price,
        status: args.p_payment === 'due' ? 'pending' : 'paid', payment_mode: args.p_payment === 'upi' ? 'upi' : 'cash', notes: args.p_note, created_at: new Date().toISOString(),
      });
      return ok({ title, price, start_date: args.p_start, end_date: endIso });
    }
    if (fn === 'delete_member') {
      const me = table('profiles').find((p) => p.id === uid);
      if (!['owner', 'super_admin'].includes(me?.role)) return fail('Only the gym owner or Super Admin can delete members');
      if (args.p_member === uid) return fail('You cannot delete your own account');
      const m = table('profiles').find((p) => p.id === args.p_member);
      if (!m) return fail('Member not found');
      if (m.role !== 'member') return fail("Only members can be deleted. Change this person's role to Member first.");
      const label = `Deleted member${m.member_code ? ` · ${m.member_code}` : ''}`;
      let kept = 0;
      for (const p of table('payments').filter((x) => x.member_id === m.id)) {
        Object.assign(p, { member_id: null, member: null, deleted_member_label: label });
        kept++;
      }
      for (const [name, rows] of Object.entries(state.tables)) {
        if (name === 'payments') continue;
        state.tables[name] = rows.filter((r) => r.id !== m.id && r.member_id !== m.id && r.sender_id !== m.id && r.recipient_id !== m.id && r.user_id !== m.id);
      }
      return ok({ deleted: m.id, name: m.full_name, payments_kept: kept });
    }
    if (fn === 'submit_registration') {
      const me = table('profiles').find((p) => p.id === uid);
      if (!me) return fail('Account not found');
      if (me.role !== 'member' || me.approval_status === 'approved') return fail('Your registration is already approved');
      if (!/^[6-9]\d{9}$/.test(args.p_phone ?? '')) return fail('Enter a valid 10-digit mobile number');
      Object.assign(me, {
        full_name: args.p_full_name, phone: args.p_phone, dob: args.p_dob, blood_group: args.p_blood_group, height_cm: args.p_height_cm,
        weight_kg: args.p_weight_kg, medicines: args.p_medicines, health_notes: args.p_health_notes,
        approval_status: 'pending', approval_note: null, registration_submitted_at: new Date().toISOString(),
      });
      return ok({ ...me });
    }
    if (fn === 'decide_registration') {
      const me = table('profiles').find((p) => p.id === uid);
      if (!['owner', 'super_admin'].includes(me?.role)) return fail('Only the gym owner can approve new members');
      const m = table('profiles').find((p) => p.id === args.p_member);
      if (!m || m.approval_status !== 'pending') return fail('This registration is no longer waiting for approval');
      Object.assign(m, { approval_status: args.p_approve ? 'approved' : 'rejected', approval_note: args.p_note ?? null });
      return ok({ ...m });
    }
    // Chat (migration 10): members talk to trainers/staff, never to other members.
    const between = (a: string, b: string) => (m: Row) => (m.sender_id === a && m.recipient_id === b) || (m.sender_id === b && m.recipient_id === a);
    if (fn === 'chat_contacts') {
      const me = table('profiles').find((p) => p.id === uid);
      if (!me) return ok([]);
      const rows = table('profiles')
        .filter((p) => p.id !== uid && p.role !== 'visitor' && !(me.role === 'member' && p.role === 'member'))
        .filter((p) => me.role !== 'member' || p.id === me.assigned_trainer_id || ['receptionist', 'manager', 'owner'].includes(p.role) || table('messages').some(between(uid!, p.id)))
        .map((p) => {
          const thread = table('messages').filter(between(uid!, p.id)).sort((x, y) => x.created_at.localeCompare(y.created_at));
          const last = thread[thread.length - 1];
          return {
            id: p.id, full_name: p.full_name, role: p.role, avatar_url: p.avatar_url ?? null, member_code: p.member_code ?? null,
            last_body: last?.body ?? null, last_at: last?.created_at ?? null, last_from_me: last ? last.sender_id === uid : null,
            unread: thread.filter((m) => m.sender_id === p.id && !m.read_at).length,
          };
        })
        .sort((x, y) => (y.last_at ?? '').localeCompare(x.last_at ?? '') || x.full_name.localeCompare(y.full_name));
      return ok(rows);
    }
    if (fn === 'chat_thread') {
      return ok(table('messages').filter(between(uid!, args.p_other)).sort((x, y) => x.created_at.localeCompare(y.created_at)).map((m) => ({ ...m })));
    }
    if (fn === 'mark_chat_read') {
      const unread = table('messages').filter((m) => m.sender_id === args.p_other && m.recipient_id === uid && !m.read_at);
      unread.forEach((m) => (m.read_at = new Date().toISOString()));
      return ok(unread.length);
    }
    if (fn === 'my_unread_messages') return ok(table('messages').filter((m) => m.recipient_id === uid && !m.read_at).length);
    if (fn === 'get_my_trainer') {
      const me = table('profiles').find((p) => p.id === uid);
      const trainer = me?.assigned_trainer_id ? table('profiles').find((p) => p.id === me.assigned_trainer_id) : null;
      return ok(trainer ? [{ id: trainer.id, full_name: trainer.full_name, email: trainer.email, phone: trainer.phone ?? null, avatar_url: trainer.avatar_url ?? null }] : []);
    }
    if (fn === 'request_plan') {
      const plan = PLAN_CATALOG[args.p_plan_code];
      if (!plan) return fail('Unknown plan');
      if (table('plan_requests').some((r) => r.member_id === uid && r.status === 'pending')) {
        return fail('You already have a pending request. Please wait for the gym to respond.');
      }
      const d = table('settings').find((r) => r.key === 'discount')?.value;
      const price = d?.enabled ? Math.round((plan.price * (100 - d.percent)) / 100) : plan.price;
      const row = {
        id: `req-${++idCounter}`, member_id: uid, plan_code: args.p_plan_code, plan_title: plan.title, months: plan.months,
        base_price: plan.price, price, request_type: args.p_type === 'change' ? 'change' : 'renew',
        payment_preference: args.p_payment === 'online' ? 'online' : 'desk', status: 'pending', note: null,
        decided_at: null, payment_id: null, created_at: new Date().toISOString(),
      };
      table('plan_requests').push(row);
      return ok(row);
    }
    if (fn === 'decide_plan_request') {
      const req = table('plan_requests').find((r) => r.id === args.p_request);
      if (!req || req.status !== 'pending') return fail('This request is no longer pending');
      req.status = args.p_approve ? 'approved' : 'rejected';
      req.note = args.p_note;
      req.decided_at = new Date().toISOString();
      if (args.p_approve) {
        const m = { id: `mem-${++idCounter}`, member_id: req.member_id, plan_code: req.plan_code, plan_title: req.plan_title, price: req.price,
          start_date: new Date().toLocaleDateString('en-CA'), end_date: new Date(Date.now() + req.months * 30 * 86400000).toLocaleDateString('en-CA'),
          status: 'active', created_at: new Date().toISOString() };
        table('memberships').push(m);
        const paid = !!args.p_mark_paid;
        const pay = { id: `pay-${++idCounter}`, member_id: req.member_id, membership_id: m.id, plan_code: req.plan_code, plan_title: req.plan_title,
          amount: req.price, tax_amount: 0, total_amount: req.price, discount_amount: req.base_price - req.price,
          payment_mode: paid ? args.p_mode : 'online', status: paid ? 'paid' : 'pending',
          gst_invoice_no: paid ? `RVF-2026-${String(idCounter).padStart(5, '0')}` : null, paid_at: paid ? new Date().toISOString() : null,
          notes: args.p_note ?? null, created_at: new Date().toISOString() };
        table('payments').push(pay);
        req.payment_id = pay.id;
      }
      return ok(req);
    }
    if (fn === 'my_qr_token') return uid ? ok(`RVF1.${uid}.1.sig`) : fail('Please sign in first');
    if (fn === 'check_in_by_qr') {
      const parts = String(args.p_token).split('.');
      if (parts[0] !== 'RVF1' || parts[3] !== 'sig') return fail('This pass has expired. Ask the member to refresh their QR card.');
      const member = table('profiles').find((p) => p.id === parts[1]);
      if (!member) return fail('Member not found');
      const today = new Date().toLocaleDateString('en-CA');
      const already = table('attendance').some((a) => a.member_id === member.id && new Date(a.check_in).toLocaleDateString('en-CA') === today);
      if (!already) table('attendance').push({ id: `att-${++idCounter}`, member_id: member.id, check_in: new Date().toISOString(), method: 'qr', verified_by: uid });
      const active = table('memberships').some((m) => m.member_id === member.id && m.status === 'active');
      return ok({ member_id: member.id, full_name: member.full_name, member_code: member.member_code ?? null, avatar_url: member.avatar_url ?? null,
        status: active ? 'active' : 'inactive', already_checked_in: already });
    }
    if (fn === 'self_check_in') {
      const g = table('settings').find((r) => r.key === 'geofence')?.value;
      if (!g?.enabled) return fail('Selfie check-in is turned off. Please ask a trainer to scan your QR pass.');
      table('attendance').push({ id: `att-${++idCounter}`, member_id: uid, check_in: new Date().toISOString(), method: 'selfie', selfie_path: args.p_selfie_path, distance_m: 12 });
      return ok({ already_checked_in: false, distance_m: 12 });
    }
    if (fn === 'decide_content_draft') {
      const d = table('site_content_drafts').find((r) => r.id === args.p_draft);
      if (!d) return fail('This change is no longer pending');
      d.status = args.p_approve ? 'approved' : 'rejected';
      if (args.p_approve) {
        const rows = table('site_content');
        const i = rows.findIndex((r) => r.key === d.key);
        if (i >= 0) rows[i] = { ...rows[i], value: d.value };
        else rows.push({ key: d.key, value: d.value });
      }
      return ok(null);
    }
    return fail(`Unknown function ${fn}`);
  });

  supabaseMock.storage = {
    from: vi.fn((bucket: string) => ({
      upload: vi.fn(async (path: string, file: unknown) => {
        if (state.failures[`storage:${bucket}`]) {
          const message = state.failures[`storage:${bucket}`];
          delete state.failures[`storage:${bucket}`];
          return { data: null, error: { message } };
        }
        state.uploads.push({ bucket, path, file });
        return { data: { path }, error: null };
      }),
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${bucket}/${path}` } }),
      createSignedUrls: vi.fn(async (paths: string[]) => ({
        data: paths.map((path) => ({ path, signedUrl: `https://signed.test/${bucket}/${path}?token=t`, error: null })),
        error: null,
      })),
      remove: vi.fn(async (paths: string[]) => {
        state.removed.push(...paths.map((path) => ({ bucket, path })));
        return { data: paths, error: null };
      }),
      // Files uploaded to `folder/` in this bucket and not removed since.
      list: vi.fn(async (folder: string) => {
        const gone = new Set(state.removed.filter((r) => r.bucket === bucket).map((r) => r.path));
        const names = state.uploads
          .filter((u) => u.bucket === bucket && u.path.startsWith(`${folder}/`) && !gone.has(u.path))
          .map((u) => ({ name: u.path.slice(folder.length + 1) }));
        return { data: names, error: null };
      }),
    })),
  };
}
