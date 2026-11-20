// Security PIN for money figures in the admin area.
// Staff set a 4-6 digit PIN once; after that, revenue, payments and other money figures
// show as "₹ ••••" until the PIN is entered. It stays unlocked for 15 minutes in this tab,
// until "Lock" is pressed, or until sign-out.
// Outside <FinancePinProvider> (trainer panel, member portal) money shows as before.
import React, { createContext, useCallback, useContext, useEffect, useId, useState } from 'react';
import { Lock, LockOpen, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import {
  LOCK_MINUTES,
  PIN_UNLOCK_MINUTES,
  PinSetupError,
  UNLOCK_STORAGE_KEY,
  clearFinanceUnlock,
  financePinStatus,
  formatCountdown,
  isValidPin,
  setFinancePin,
  verifyFinancePin,
} from '../../services/security';

export const HIDDEN_MONEY = '₹ ••••';

export type PinStatus = 'checking' | 'unset' | 'locked' | 'unlocked' | 'error';

interface FinancePinValue {
  status: PinStatus;
  unlocked: boolean;
  /** Seconds until a PIN locked by 3 wrong tries can be tried again. */
  lockedSeconds: number;
  /** Why the PIN can't be used (e.g. the database update is missing). */
  setupError: string;
  createPin: (pin: string) => Promise<string | null>;
  unlock: (pin: string) => Promise<string | null>;
  changePin: (current: string, next: string) => Promise<string | null>;
  lock: () => void;
}

const ALWAYS_OPEN: FinancePinValue = {
  status: 'unlocked',
  unlocked: true,
  lockedSeconds: 0,
  setupError: '',
  createPin: async () => null,
  unlock: async () => null,
  changePin: async () => null,
  lock: () => undefined,
};

const FinancePinContext = createContext<FinancePinValue | null>(null);

function readUnlock(userId: string): number {
  try {
    const saved = JSON.parse(sessionStorage.getItem(UNLOCK_STORAGE_KEY) || 'null');
    return saved?.user === userId && Number(saved.until) > Date.now() ? Number(saved.until) : 0;
  } catch {
    return 0;
  }
}

function saveUnlock(userId: string, until: number) {
  try {
    sessionStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify({ user: userId, until }));
  } catch {
    // storage unavailable: the unlock lasts until this page is reloaded
  }
}

const wrongPinMessage = (attemptsLeft: number, lockedSeconds: number) =>
  lockedSeconds > 0
    ? `Too many wrong PINs. Money information is locked for ${formatCountdown(lockedSeconds)}.`
    : `Wrong PIN. ${attemptsLeft} attempt${attemptsLeft === 1 ? '' : 's'} left before the PIN is locked for ${LOCK_MINUTES} minutes.`;

export const FinancePinProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, session } = useAuth();
  const userId = profile?.id ?? '';
  // Dev-only demo roles have no database account, so there's no PIN to check.
  const demo = !!profile && !session;
  const [status, setStatus] = useState<PinStatus>('checking');
  const [until, setUntil] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [setupError, setSetupError] = useState('');
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!userId || demo) return;
    let active = true;
    const saved = readUnlock(userId);
    if (saved) {
      setUntil(saved);
      setStatus('unlocked');
      return;
    }
    setStatus('checking');
    financePinStatus()
      .then(({ hasPin, lockedSeconds }) => {
        if (!active) return;
        setLockedUntil(lockedSeconds > 0 ? Date.now() + lockedSeconds * 1000 : 0);
        setStatus(hasPin ? 'locked' : 'unset');
      })
      .catch((err: Error) => {
        if (!active) return;
        setSetupError(err instanceof PinSetupError ? err.message : err.message || 'Could not check your security PIN.');
        setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [userId, demo]);

  // Lock again when the 15 minutes run out; tick the countdown for a locked PIN.
  useEffect(() => {
    if (status !== 'unlocked' && !(lockedUntil > Date.now())) return;
    const timer = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (status === 'unlocked' && until && t >= until) {
        clearFinanceUnlock();
        setUntil(0);
        setStatus('locked');
      }
      if (lockedUntil && t >= lockedUntil) setLockedUntil(0);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status, until, lockedUntil]);

  const open = useCallback(() => {
    const t = Date.now() + PIN_UNLOCK_MINUTES * 60_000;
    saveUnlock(userId, t);
    setUntil(t);
    setLockedUntil(0);
    setStatus('unlocked');
  }, [userId]);

  const run = async (fn: () => Promise<{ ok: boolean; attemptsLeft: number; lockedSeconds: number }>) => {
    try {
      const result = await fn();
      if (result.ok) {
        open();
        return null;
      }
      if (result.lockedSeconds > 0) {
        setNow(Date.now());
        setLockedUntil(Date.now() + result.lockedSeconds * 1000);
      }
      return wrongPinMessage(result.attemptsLeft, result.lockedSeconds);
    } catch (err: any) {
      return err?.message || 'Could not check the PIN. Please try again.';
    }
  };

  const value: FinancePinValue = {
    status,
    unlocked: status === 'unlocked',
    lockedSeconds: Math.max(0, Math.ceil((lockedUntil - now) / 1000)),
    setupError,
    createPin: (pin) => run(() => setFinancePin(pin)),
    unlock: (pin) => run(() => verifyFinancePin(pin)),
    changePin: async (current, next) => {
      try {
        const result = await setFinancePin(next, current);
        return result.ok ? null : wrongPinMessage(result.attemptsLeft, result.lockedSeconds);
      } catch (err: any) {
        return err?.message || 'Could not change the PIN.';
      }
    },
    lock: () => {
      clearFinanceUnlock();
      setUntil(0);
      setStatus((s) => (s === 'unlocked' ? 'locked' : s));
    },
  };

  if (demo) return <FinancePinContext.Provider value={ALWAYS_OPEN}>{children}</FinancePinContext.Provider>;
  return <FinancePinContext.Provider value={value}>{children}</FinancePinContext.Provider>;
};

export const useFinancePin = () => useContext(FinancePinContext) ?? ALWAYS_OPEN;

/** Wrap any money text: shows it when unlocked, "₹ ••••" when locked. */
export function useMoney() {
  const { unlocked } = useFinancePin();
  return useCallback((text: string) => (unlocked ? text : HIDDEN_MONEY), [unlocked]);
}

/** The set-PIN / enter-PIN form. */
export const FinancePinForm: React.FC<{ onDone?: () => void }> = ({ onDone }) => {
  const { status, lockedSeconds, setupError, createPin, unlock } = useFinancePin();
  const id = useId();
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const creating = status === 'unset';
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  if (status === 'checking') return <p className="text-sm text-gym-muted">Checking your security PIN...</p>;
  if (status === 'error') return <p role="alert" className="text-sm text-gym-danger">{setupError}</p>;
  if (status === 'unlocked') return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidPin(pin)) return setError('The PIN must be 4 to 6 digits.');
    if (creating && pin !== confirm) return setError('The two PINs do not match.');
    setBusy(true);
    const problem = creating ? await createPin(pin) : await unlock(pin);
    setBusy(false);
    setPin('');
    setConfirm('');
    if (problem) setError(problem);
    else onDone?.();
  };

  const pinLocked = !creating && lockedSeconds > 0;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 w-full max-w-xs" aria-label={creating ? 'Set security PIN' : 'Unlock money information'}>
      <p className="text-sm text-gym-muted">
        {creating
          ? 'Set a 4-6 digit security PIN. You will need it to see revenue, payments and other money information.'
          : `Enter your security PIN to see money information. It stays visible for ${PIN_UNLOCK_MINUTES} minutes.`}
      </p>
      <Input
        id={`${id}-pin`}
        label={creating ? 'New security PIN' : 'Security PIN'}
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={6}
        value={pin}
        disabled={pinLocked}
        onChange={(e) => setPin(digits(e.target.value))}
      />
      {creating && (
        <Input
          id={`${id}-confirm`}
          label="Confirm security PIN"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          value={confirm}
          onChange={(e) => setConfirm(digits(e.target.value))}
        />
      )}
      {pinLocked ? (
        <p role="alert" className="text-xs text-gym-danger">
          Too many wrong PINs. Try again in {formatCountdown(lockedSeconds)}. The gym owner can reset your PIN.
        </p>
      ) : (
        error && <p role="alert" className="text-xs text-gym-danger">{error}</p>
      )}
      <Button type="submit" size="sm" isLoading={busy} disabled={pinLocked} leftIcon={<LockOpen className="w-4 h-4" />}>
        {creating ? 'Set PIN & show money' : 'Unlock'}
      </Button>
    </form>
  );
};

/** Shows its children only when money is unlocked; otherwise the PIN form. */
export const FinanceGate: React.FC<{ children: React.ReactNode; title?: string; className?: string }> = ({ children, title, className }) => {
  const { unlocked, status } = useFinancePin();
  if (unlocked) return <>{children}</>;
  return (
    <Card hoverEffect={false} className={`flex flex-col items-center text-center gap-3 ${className ?? ''}`} aria-label="Money information locked">
      <Lock className="w-8 h-8 text-gym-primary" />
      <h3 className="font-heading text-white">
        {status === 'unset' ? 'Set your security PIN' : title ?? 'Money information is locked'}
      </h3>
      <FinancePinForm />
    </Card>
  );
};

/** Gym Settings card: set the PIN, or change it with the current one. */
export const SecurityPinSettings: React.FC = () => {
  const { status, setupError, changePin } = useFinancePin();
  const id = useId();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);
  const digits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setDone('');
    if (!isValidPin(next)) return setError('The new PIN must be 4 to 6 digits.');
    if (next !== confirm) return setError('The two new PINs do not match.');
    setBusy(true);
    const problem = await changePin(current, next);
    setBusy(false);
    setCurrent('');
    setNext('');
    setConfirm('');
    if (problem) setError(problem);
    else setDone('Your security PIN was changed.');
  };

  const pinField = (key: string, label: string, value: string, set: (v: string) => void) => (
    <Input
      id={`${id}-${key}`}
      label={label}
      type="password"
      inputMode="numeric"
      autoComplete="off"
      maxLength={6}
      value={value}
      onChange={(e) => set(digits(e.target.value))}
    />
  );

  return (
    <Card hoverEffect={false} className="space-y-4" aria-label="Security PIN">
      <div>
        <h3 className="text-lg font-heading text-white flex items-center gap-2">
          <Lock className="w-5 h-5 text-gym-primary" /> Security PIN for money information
        </h3>
        <p className="text-xs text-gym-muted">
          Revenue, payments and expenses stay hidden until you enter this PIN. After {PIN_UNLOCK_MINUTES} minutes, or when you press Lock, they hide again.
          Forgot it? Ask the gym owner to reset it on Users &amp; Roles.
        </p>
      </div>
      {status === 'error' ? (
        <p role="alert" className="text-sm text-gym-danger">{setupError}</p>
      ) : status === 'checking' ? (
        <p className="text-sm text-gym-muted">Checking...</p>
      ) : status === 'unset' ? (
        <FinancePinForm />
      ) : (
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end" aria-label="Change security PIN">
          {pinField('current', 'Current PIN', current, setCurrent)}
          {pinField('next', 'New PIN', next, setNext)}
          {pinField('confirm', 'Confirm new PIN', confirm, setConfirm)}
          <div className="sm:col-span-3 flex flex-col gap-2">
            {error && <p role="alert" className="text-xs text-gym-danger">{error}</p>}
            {done && <p role="status" className="text-xs text-gym-success">{done}</p>}
            <Button type="submit" variant="outline" size="sm" isLoading={busy} className="w-fit">
              Change PIN
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
};

/** Header button: "Lock" when money is visible, "Unlock" (opens the PIN form) when hidden. */
export const FinanceLockButton: React.FC = () => {
  const { unlocked, status, lock } = useFinancePin();
  const [open, setOpen] = useState(false);
  if (status === 'checking' || status === 'error') return null;
  if (unlocked) {
    return (
      <Button variant="ghost" size="sm" onClick={lock} title="Hide money information" aria-label="Lock money information" leftIcon={<Lock className="w-4 h-4" />}>
        <span className="hidden sm:inline">Lock</span>
      </Button>
    );
  }
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        title="Show money information"
        aria-label="Unlock money information"
        leftIcon={<ShieldCheck className="w-4 h-4" />}
      >
        <span className="hidden sm:inline">{status === 'unset' ? 'Set PIN' : 'Unlock'}</span>
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={status === 'unset' ? 'Set your security PIN' : 'Unlock money information'} maxWidth="sm">
        <div className="flex justify-center">
          <FinancePinForm onDone={() => setOpen(false)} />
        </div>
      </Modal>
    </>
  );
};
