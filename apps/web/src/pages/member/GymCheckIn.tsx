import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { QrCamera } from '../../components/attendance/QrCamera';
import { useGymSettings } from '../../content/useGymSettings';
import { GymCheckInResult, checkInWithGymQr, currentPosition } from '../../services/gym';

/**
 * Member scans the QR on the trainer's screen to check in. Opening the QR's web address
 * with the phone's normal camera app lands here with the code, and checks in straight away.
 */
export const GymCheckIn: React.FC = () => {
  const { settings } = useGymSettings();
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState<GymCheckInResult | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stopSignal, setStopSignal] = useState(0);
  const linkToken = useRef(params.get('t'));

  const checkIn = async (text: string) => {
    setError('');
    setBusy(true);
    try {
      // With geofencing on, the gym also checks that the phone is inside the gym.
      const coords = settings.geofence.enabled ? await currentPosition() : undefined;
      const r = await checkInWithGymQr(text, coords).catch(async (err: Error) => {
        // Settings may not have loaded yet when the page opens from the QR link.
        if (coords || !/location/i.test(err.message)) throw err;
        return checkInWithGymQr(text, await currentPosition());
      });
      setResult(r);
      setStopSignal((n) => n + 1);
    } catch (err: any) {
      setResult(null);
      setError(err.message || 'Could not check in');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const token = linkToken.current;
    if (!token) return;
    linkToken.current = null;
    setParams({}, { replace: true });
    void checkIn(token);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Helmet>
        <title>Scan to Check In | RV Fitness</title>
      </Helmet>

      <div className="max-w-md mx-auto flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ATTENDANCE</span>
          <h1 className="text-2xl sm:text-3xl font-heading text-white uppercase tracking-wide mt-1">
            SCAN <span className="text-gym-primary">GYM QR</span>
          </h1>
          <p className="text-sm text-gym-muted mt-2">Point your phone at the QR on the trainer's screen.</p>
        </div>

        <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Scan gym QR">
          {busy && <p className="text-sm text-gym-muted" aria-live="polite">Checking you in...</p>}

          {result && (
            <div role="status" className="rounded-xl p-4 flex items-start gap-3 border bg-gym-success/15 border-gym-success/50">
              <CheckCircle2 className="w-6 h-6 text-gym-success shrink-0" />
              <div>
                <p className="font-heading text-white">
                  {result.already_checked_in ? 'You are already checked in today.' : 'Checked in! Have a great workout.'}
                </p>
                {result.staff_name && <p className="text-xs text-gym-muted">QR shown by {result.staff_name}</p>}
                {result.status !== 'active' && (
                  <p className="text-sm text-gym-danger flex items-center gap-1 mt-1">
                    <XCircle className="w-4 h-4" /> Your membership is not active. Please renew at the desk or in Plans.
                  </p>
                )}
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-gym-danger">{error}</p>}

          {!result && (
            <QrCamera
              idPrefix="rv-gym-qr"
              onToken={checkIn}
              onError={setError}
              onReset={() => setResult(null)}
              stopSignal={stopSignal}
              hint="Hold the trainer's QR inside the box."
            />
          )}

          <Link to="/portal/attendance" className="text-sm text-gym-muted hover:text-white text-center">← Back to attendance</Link>
        </Card>
      </div>
    </>
  );
};
