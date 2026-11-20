// Login lock (3 wrong passwords → 15 minutes) and the staff security PIN for money figures.
// The database functions live in supabase/migrations/21_login_attempts_and_finance_pin.sql.
import { supabase } from '../lib/supabase';

export const MAX_ATTEMPTS = 3;
export const LOCK_MINUTES = 15;
/** How long money stays visible after the PIN is entered. */
export const PIN_UNLOCK_MINUTES = 15;

export interface AttemptResult {
  attemptsLeft: number;
  lockedSeconds: number;
}

/** "14:05" from a number of seconds. */
export const formatCountdown = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const toAttempt = (data: any): AttemptResult => ({
  attemptsLeft: Number(data?.attempts_left ?? MAX_ATTEMPTS),
  lockedSeconds: Number(data?.locked_seconds ?? 0),
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------
// If these functions are missing (migration 21 not run yet) or fail, sign-in still works:
// Supabase's own rate limits apply, and nobody is locked out by a glitch.

export async function checkLoginAllowed(email: string): Promise<AttemptResult> {
  const { data, error } = await supabase.rpc('check_login_allowed', { p_email: email });
  if (error) return { attemptsLeft: MAX_ATTEMPTS, lockedSeconds: 0 };
  return toAttempt(data);
}

export async function recordLoginFailure(email: string): Promise<AttemptResult | null> {
  const { data, error } = await supabase.rpc('record_login_failure', { p_email: email });
  return error ? null : toAttempt(data);
}

export async function recordLoginSuccess(): Promise<void> {
  await supabase.rpc('record_login_success');
}

// ---------------------------------------------------------------------------
// Security PIN
// ---------------------------------------------------------------------------

export class PinSetupError extends Error {}

/** Where this tab remembers an unlocked PIN: {user, until}. */
export const UNLOCK_STORAGE_KEY = 'rv_finance_unlock';

/** Forgets any unlock in this tab (called on sign-out and on "Lock"). */
export function clearFinanceUnlock() {
  try {
    sessionStorage.removeItem(UNLOCK_STORAGE_KEY);
  } catch {
    // storage unavailable: nothing was saved
  }
}

const pinError = (message: string) =>
  /finance_pin|schema cache|does not exist/i.test(message)
    ? new PinSetupError('The security PIN needs the latest database update (migration 21). Please run it in Supabase.')
    : new Error(message);

export async function financePinStatus(): Promise<{ hasPin: boolean; lockedSeconds: number }> {
  const { data, error } = await supabase.rpc('finance_pin_status');
  if (error) throw pinError(error.message);
  return { hasPin: !!data?.has_pin, lockedSeconds: Number(data?.locked_seconds ?? 0) };
}

export async function verifyFinancePin(pin: string): Promise<AttemptResult & { ok: boolean }> {
  const { data, error } = await supabase.rpc('verify_finance_pin', { p_pin: pin });
  if (error) throw pinError(error.message);
  return { ok: !!data?.ok, ...toAttempt(data) };
}

/** First PIN (no current one), or a change (current PIN required). */
export async function setFinancePin(pin: string, current?: string): Promise<AttemptResult & { ok: boolean }> {
  const { data, error } = await supabase.rpc('set_finance_pin', { p_pin: pin, p_current: current ?? null });
  if (error) throw pinError(error.message);
  return { ok: !!data?.ok, ...toAttempt(data) };
}

export async function resetFinancePin(userId: string): Promise<void> {
  const { error } = await supabase.rpc('reset_finance_pin', { p_user: userId });
  if (error) throw pinError(error.message);
}

export const isValidPin = (pin: string) => /^\d{4,6}$/.test(pin);
