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

class Query implements PromiseLike<{ data: any; error: any }> {
  private filters: ((row: Row) => boolean)[] = [];
  private op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private payload: any;
  private orderBy: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;
  private mode: 'many' | 'single' | 'maybeSingle' = 'many';
  private returnRows = false;

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
  upsert(rows: Row | Row[]) {
    this.op = 'upsert';
    this.payload = Array.isArray(rows) ? rows : [rows];
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
        const key = 'key' in r ? 'key' : 'id';
        const i = rows.findIndex((x) => x[key] === r[key]);
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
    signOut: vi.fn(async () => {
      emit('SIGNED_OUT', null);
      return { error: null };
    }),
  };

  supabaseMock.from = vi.fn((name: string) => new Query(name));

  supabaseMock.rpc = vi.fn(async (fn: string) => {
    if (fn === 'get_my_trainer') {
      const me = table('profiles').find((p) => p.id === state.session?.user.id);
      const trainer = me?.assigned_trainer_id ? table('profiles').find((p) => p.id === me.assigned_trainer_id) : null;
      return { data: trainer ? [{ id: trainer.id, full_name: trainer.full_name, email: trainer.email, phone: trainer.phone ?? null, avatar_url: trainer.avatar_url ?? null }] : [], error: null };
    }
    return { data: null, error: { message: `Unknown function ${fn}` } };
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
    })),
  };
}
