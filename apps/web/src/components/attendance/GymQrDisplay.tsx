import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize2, Minimize2, QrCode, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { AttendanceRow, getGymQrToken, gymQrLink } from '../../services/gym';

interface GymQrDisplayProps {
  /** Today's check-ins, newest first; shown under the QR so the trainer sees who scanned. */
  today: AttendanceRow[];
  /** Reloads today's check-ins (called every few seconds while the QR is shown). */
  onRefreshToday: () => void;
}

/**
 * Trainer / front desk shows this QR; members scan it with their phone to check themselves in.
 * It changes every 30 seconds, so a photo of it stops working within a minute.
 */
export const GymQrDisplay: React.FC<GymQrDisplayProps> = ({ today, onRefreshToday }) => {
  const [showing, setShowing] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [token, setToken] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [error, setError] = useState('');
  const timer = useRef<number>();
  const refreshTodayRef = useRef(onRefreshToday);
  refreshTodayRef.current = onRefreshToday;

  const refresh = useCallback(async () => {
    window.clearTimeout(timer.current);
    try {
      const t = await getGymQrToken();
      setToken(t.token);
      setSecondsLeft(t.seconds_left);
      setError('');
      // Fetch the next code just after this one's 30-second window ends.
      timer.current = window.setTimeout(refresh, (t.seconds_left + 1) * 1000);
    } catch (err: any) {
      setError(err.message || 'Could not load the check-in QR');
      timer.current = window.setTimeout(refresh, 10000);
    }
  }, []);

  useEffect(() => {
    if (!showing) return undefined;
    void refresh();
    const tick = window.setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    const poll = window.setInterval(() => refreshTodayRef.current(), 5000);
    // Keep the screen on while the QR is shown (where the browser allows it).
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as any).wakeLock?.request?.('screen').then((l: any) => (lock = l)).catch(() => undefined);
    return () => {
      window.clearTimeout(timer.current);
      window.clearInterval(tick);
      window.clearInterval(poll);
      lock?.release().catch(() => undefined);
    };
  }, [showing, refresh]);

  // Full screen: Esc closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!fullScreen) return undefined;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setFullScreen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullScreen]);

  if (!showing) {
    return (
      <Button variant="primary" onClick={() => setShowing(true)} leftIcon={<QrCode className="w-4 h-4" />}>
        Show check-in QR
      </Button>
    );
  }

  const latest = today.slice(0, fullScreen ? 6 : 3);
  const body = (
    <div className="flex flex-col items-center gap-3 w-full">
      {token ? (
        <div className="bg-white p-3 rounded-2xl">
          <QRCodeSVG
            value={gymQrLink(token)}
            size={fullScreen ? 320 : 240}
            marginSize={2}
            level="M"
            data-testid="gym-qr"
            className="w-full h-auto max-w-[80vw] max-h-[60vh]"
          />
        </div>
      ) : (
        <div className="w-60 h-60 rounded-2xl bg-gym-card animate-pulse" aria-label="Loading QR" />
      )}
      <p className="text-sm text-white font-heading text-center">Members: open RV Fitness → Attendance → Scan gym QR</p>
      <p className="text-xs text-gym-muted" aria-live="polite">New code in {secondsLeft}s</p>
      {error && <p role="alert" className="text-sm text-gym-danger">{error}</p>}
      {latest.length > 0 && (
        <ul className="w-full max-w-sm text-sm divide-y divide-gym-border" aria-label="Latest check-ins">
          {latest.map((a) => (
            <li key={a.id} className="py-1.5 flex justify-between gap-2">
              <span className="text-white truncate">{a.member?.full_name ?? 'Member'}</span>
              <span className="text-xs text-gym-muted shrink-0">
                {new Date(a.check_in).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (fullScreen) {
    // Rendered at page level: a parent card with a blur effect would otherwise trap the
    // "fixed" layer inside the card, so it never covered the screen and couldn't be closed.
    return createPortal(
      <div role="dialog" aria-modal="true" aria-label="Check-in QR" className="fixed inset-0 z-[90] bg-gym-bg overflow-y-auto">
        <button
          type="button"
          onClick={() => setFullScreen(false)}
          aria-label="Close full screen"
          className="fixed top-3 right-3 z-[91] w-11 h-11 rounded-full bg-gym-surface border border-gym-border text-white flex items-center justify-center hover:border-gym-primary"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="min-h-full p-4 pt-16 flex flex-col items-center justify-center gap-4">
          <h2 className="font-heading text-2xl text-white uppercase tracking-wide text-center">
            Scan to <span className="text-gym-primary">check in</span>
          </h2>
          {body}
          <Button variant="outline" onClick={() => setFullScreen(false)} leftIcon={<Minimize2 className="w-4 h-4" />}>Exit full screen</Button>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {body}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button variant="outline" size="sm" onClick={() => setFullScreen(true)} leftIcon={<Maximize2 className="w-4 h-4" />}>Full screen</Button>
        <Button variant="outline" size="sm" onClick={() => setShowing(false)} leftIcon={<X className="w-4 h-4" />}>Hide QR</Button>
      </div>
    </div>
  );
};
