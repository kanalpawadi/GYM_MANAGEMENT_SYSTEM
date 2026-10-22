import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Camera, CameraOff, CheckCircle2, Search, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Avatar } from '../../components/account/Avatar';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRow, ScanResult, checkInByQr, listAttendance, listMembers, staffCheckIn } from '../../services/gym';
import type { UserProfile } from '../../types';

const READER_ID = 'rv-qr-reader';

/** Trainers and front desk scan a member's QR pass (or search by name) to mark attendance. */
export const AttendanceScanner: React.FC = () => {
  const { profile } = useAuth();
  const [scanning, setScanning] = useState(false);
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

  const startCamera = async () => {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode(READER_ID);
      scannerRef.current = scanner;
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, (text: string) => handleToken(text), () => undefined);
      setScanning(true);
    } catch {
      setError('Could not open the camera. Allow camera access, or use the name search below.');
      setScanning(false);
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
            <div id={READER_ID} className={`w-full rounded-xl overflow-hidden bg-black ${scanning ? 'min-h-[260px]' : 'hidden'}`} />
            {scanning ? (
              <Button variant="outline" onClick={stopCamera} leftIcon={<CameraOff className="w-4 h-4" />}>Stop camera</Button>
            ) : (
              <Button variant="primary" onClick={startCamera} leftIcon={<Camera className="w-4 h-4" />}>Start camera</Button>
            )}

            {result && (
              <div
                role="status"
                className={`rounded-xl p-4 flex items-center gap-3 border ${result.status === 'active' ? 'bg-gym-success/15 border-gym-success/50' : 'bg-gym-danger/10 border-gym-danger/50'}`}
              >
                <Avatar src={result.avatar_url} name={result.full_name} size="lg" />
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
                    <Avatar src={m.avatar_url} name={m.full_name} size="sm" />
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
