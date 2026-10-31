import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Camera, CameraOff, CheckCircle2, ImageUp, Search, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/account/Avatar';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRow, ScanResult, checkInByQr, listAttendance, listMembers, staffCheckIn } from '../../services/gym';
import type { UserProfile } from '../../types';

const READER_ID = 'rv-qr-reader';
const PHOTO_READER_ID = 'rv-qr-photo-reader';

/** Scan box: 70% of the camera view (a fixed size breaks on small or not-yet-sized views). */
export const qrBox = (width: number, height: number) => {
  const side = Math.max(120, Math.floor(Math.min(width, height) * 0.7));
  return { width: side, height: side };
};

const CAMERA_KEY = 'rv_scanner_camera';

/**
 * Picks the phone's main back camera. Samsung and other phones list several back lenses
 * (ultra-wide, telephoto, macro); the ultra-wide can't focus close enough to read a QR.
 */
export function pickBackCamera(cameras: { id: string; label: string }[]): string | null {
  if (!cameras.length) return null;
  const back = cameras.filter((c) => /back|rear|environment|facing back/i.test(c.label));
  const plain = back.filter((c) => !/ultra|wide|tele|depth|macro|zoom/i.test(c.label));
  // Samsung names them "camera2 0, facing back", "camera2 2, facing back"...: the lowest number is the main lens.
  const lens = (label: string) => Number(/camera\d*\s+(\d+)/i.exec(label)?.[1] ?? /(\d+)/.exec(label)?.[1] ?? 99);
  const byIndex = (list: typeof cameras) => [...list].sort((a, b) => lens(a.label) - lens(b.label));
  return (byIndex(plain)[0] ?? byIndex(back)[0] ?? cameras[cameras.length - 1]).id;
}

/** Plain-language reason why the camera could not start. */
export function cameraErrorMessage(err: unknown): string {
  const text = `${(err as { name?: string })?.name ?? ''} ${(err as { message?: string })?.message ?? err ?? ''}`;
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return 'The camera only works on a secure (https://) website. Open the live site, or use the name search below.';
  }
  if (/NotAllowed|Permission|denied/i.test(text)) {
    return 'Camera permission was blocked. Allow the camera for this site in the browser settings (lock icon in the address bar), then press Start camera again.';
  }
  if (/NotFound|no camera|Requested device not found|OverconstrainedError/i.test(text)) {
    return 'No camera was found on this device. Use "Scan from photo" or the name search below.';
  }
  if (/NotReadable|in use|Could not start video source/i.test(text)) {
    return 'The camera is being used by another app. Close it and press Start camera again.';
  }
  return 'Could not open the camera. Use "Scan from photo" or the name search below.';
}

/** Trainers and front desk scan a member's QR pass (or search by name) to mark attendance. */
export const AttendanceScanner: React.FC = () => {
  const { profile } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [today, setToday] = useState<AttendanceRow[]>([]);
  const [notice, setNotice] = useState('');
  const scannerRef = useRef<any>(null);
  const busyRef = useRef(false);

  const loadToday = () => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    return listAttendance({ since: midnight.toISOString() }).then(setToday).catch(() => undefined);
  };

  useEffect(() => {
    listMembers().then(setMembers).catch(() => undefined);
    loadToday();
    return () => {
      scannerRef.current?.stop?.().catch(() => undefined);
    };
  }, []);

  const handleToken = async (token: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setError('');
    try {
      const r = await checkInByQr(token);
      setResult(r);
      await loadToday();
    } catch (err: any) {
      setResult(null);
      setError(err.message || 'Could not read this pass');
    } finally {
      // Small pause so one QR isn't scanned many times in a row.
      setTimeout(() => (busyRef.current = false), 2500);
    }
  };

  const startCamera = async (wanted?: string) => {
    setError('');
    setResult(null);
    // Show the camera box first: the scanner measures it when it starts, and a hidden
    // (0 px wide) box gives it nothing to read, so QR codes are never detected.
    setStarting(true);
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');
      // Listing cameras asks for permission once; then we can choose the main back lens.
      const list = await Html5Qrcode.getCameras().catch(() => [] as { id: string; label: string }[]);
      setCameras(list);
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(CAMERA_KEY);
      } catch {
        // storage unavailable
      }
      const chosen = wanted ?? (saved && list.some((c) => c.id === saved) ? saved : pickBackCamera(list));
      setCameraId(chosen);

      const scanner = new Html5Qrcode(READER_ID, {
        verbose: false,
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        // Uses Android's built-in QR reader when available: much better on Samsung phones.
        useBarCodeDetectorIfSupported: true,
      });
      scannerRef.current = scanner;
      const sharp = { width: { ideal: 1280 }, height: { ideal: 720 }, advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] };
      await scanner.start(
        chosen ?? { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: qrBox,
          videoConstraints: chosen ? { deviceId: { exact: chosen }, ...sharp } : { facingMode: 'environment', ...sharp },
        },
        (text: string) => void handleToken(text),
        () => undefined,
      );
      setScanning(true);
    } catch (err) {
      scannerRef.current = null;
      setError(cameraErrorMessage(err));
      setScanning(false);
    } finally {
      setStarting(false);
    }
  };

  // Fallback when the live camera doesn't work: take or pick a photo of the member's QR.
  const scanPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setResult(null);
    if (scanning) await stopCamera();
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const reader = new Html5Qrcode(PHOTO_READER_ID, false);
      const text = await reader.scanFile(file, false);
      reader.clear();
      busyRef.current = false;
      await handleToken(text);
    } catch {
      setError('No QR code found in that photo. Hold the phone closer so the QR fills the picture, and try again.');
    }
  };

  const stopCamera = async () => {
    await scannerRef.current?.stop?.().catch(() => undefined);
    scannerRef.current = null;
    setScanning(false);
  };

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length < 2) return [];
    return members
      .filter((m) => m.full_name.toLowerCase().includes(term) || (m.phone ?? '').includes(term) || (m.member_code ?? '').toLowerCase().includes(term))
      .slice(0, 8);
  }, [members, search]);

  const checkedIn = new Set(today.map((a) => a.member_id));

  const manualCheckIn = async (m: UserProfile) => {
    if (!profile) return;
    setError('');
    setNotice('');
    try {
      const r = await staffCheckIn(m.id, profile.id);
      setNotice(r.already ? `${m.full_name} was already checked in today.` : `${m.full_name} checked in.`);
      await loadToday();
    } catch (err: any) {
      setError(err.message || 'Could not check in');
    }
  };

  return (
    <>
      <Helmet>
        <title>Attendance Scanner | RV Fitness</title>
      </Helmet>

      <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">FRONT DESK</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            ATTENDANCE <span className="text-gym-primary">SCANNER</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="QR scanner">
            <h3 className="font-heading text-white">Scan member's QR pass</h3>
            <div
              id={READER_ID}
              data-testid="qr-camera"
              className={`w-full max-w-sm mx-auto rounded-xl overflow-hidden bg-black ${scanning || starting ? 'block min-h-[260px]' : 'hidden'}`}
            />
            <div id={PHOTO_READER_ID} className="hidden" />
            {scanning && cameras.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-gym-muted">
                Camera (try another if the QR isn't read)
                <select
                  aria-label="Camera"
                  value={cameraId ?? ''}
                  onChange={async (e) => {
                    const id = e.target.value;
                    try {
                      localStorage.setItem(CAMERA_KEY, id);
                    } catch {
                      // storage unavailable
                    }
                    await stopCamera();
                    await startCamera(id);
                  }}
                  className="min-h-[40px] bg-black text-white border border-gym-border rounded-xl px-3 text-sm focus:outline-none focus:border-gym-primary"
                >
                  {cameras.map((c, i) => (
                    <option key={c.id} value={c.id}>
                      {c.label || `Camera ${i + 1}`}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {scanning ? (
              <Button variant="outline" onClick={stopCamera} leftIcon={<CameraOff className="w-4 h-4" />}>Stop camera</Button>
            ) : (
              <Button variant="primary" onClick={() => startCamera()} isLoading={starting} leftIcon={<Camera className="w-4 h-4" />}>Start camera</Button>
            )}
            <label className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gym-border text-sm font-heading text-white hover:border-gym-primary cursor-pointer">
              <ImageUp className="w-4 h-4 text-gym-primary" /> Scan from photo
              <input type="file" accept="image/*" className="sr-only" onChange={scanPhoto} aria-label="Scan QR from photo" />
            </label>
            {scanning && <p className="text-xs text-gym-muted text-center">Hold the member's QR inside the box, about 15–25 cm away. Ask them to turn their screen brightness up.</p>}

            {result && (
              <div
                role="status"
                className={`rounded-xl p-4 flex items-center gap-3 border ${result.status === 'active' ? 'bg-gym-success/15 border-gym-success/50' : 'bg-gym-danger/10 border-gym-danger/50'}`}
              >
                <Avatar src={result.avatar_url} name={result.full_name} size="lg" zoomable />
                <div>
                  <p className="font-heading text-white">{result.full_name}</p>
                  <p className="text-xs text-gym-muted">{result.member_code}</p>
                  <p className={`text-sm font-heading flex items-center gap-1 ${result.status === 'active' ? 'text-gym-success' : 'text-gym-danger'}`}>
                    {result.status === 'active' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {result.status === 'active' ? 'Active membership' : 'No active membership'}
                    {result.already_checked_in ? ' · already checked in today' : ' · checked in'}
                  </p>
                </div>
              </div>
            )}
          </Card>

          <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Manual check-in">
            <h3 className="font-heading text-white">No QR? Find the member</h3>
            <Input aria-label="Find member" placeholder="Name, phone or member ID" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-4 h-4 text-gym-primary" />} />
            <ul className="divide-y divide-gym-border">
              {matches.map((m) => (
                <li key={m.id} className="py-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar src={m.avatar_url} name={m.full_name} size="sm" zoomable />
                    <div className="min-w-0">
                      <p className="text-sm text-white truncate">{m.full_name}</p>
                      <p className="text-xs text-gym-muted">{m.member_code} {m.phone ? `· ${m.phone}` : ''}</p>
                    </div>
                  </div>
                  {checkedIn.has(m.id) ? (
                    <span className="text-xs text-gym-success font-heading">Checked in</span>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => manualCheckIn(m)} aria-label={`Check in ${m.full_name}`}>Check in</Button>
                  )}
                </li>
              ))}
            </ul>
            {search.trim().length >= 2 && matches.length === 0 && <p className="text-sm text-gym-muted">No member found.</p>}
          </Card>
        </div>

        {notice && <p role="status" className="text-sm text-gym-success">{notice}</p>}
        {error && <p role="alert" className="text-sm text-gym-danger">{error}</p>}

        <Card hoverEffect={false} className="flex flex-col gap-2" aria-label="Today's check-ins">
          <h3 className="font-heading text-white">Today's check-ins ({today.length})</h3>
          {today.length === 0 ? (
            <p className="text-sm text-gym-muted">Nobody has checked in yet today.</p>
          ) : (
            <ul className="divide-y divide-gym-border text-sm">
              {today.map((a) => (
                <li key={a.id} className="py-2 flex justify-between gap-2">
                  <span className="text-white">{a.member?.full_name ?? 'Member'} <span className="text-xs text-gym-muted">{a.member?.member_code}</span></span>
                  <span className="text-gym-muted text-xs">
                    {new Date(a.check_in).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })} · {a.method === 'qr' ? 'QR' : a.method === 'selfie' ? 'Selfie' : 'Desk'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
};
