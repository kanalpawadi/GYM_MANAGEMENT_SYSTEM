import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Camera, CheckCircle2, Flame, MapPin, QrCode } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useGymSettings } from '../../content/useGymSettings';
import { AttendanceRow, attendanceStreak, currentPosition, listAttendance, localDay, selfieCheckIn } from '../../services/gym';
import { compressImage } from '../../utils/image';
import { AttendanceCalendar } from '../../components/attendance/AttendanceCalendar';

const METHOD_LABEL: Record<string, string> = { qr: 'QR scan', selfie: 'Selfie', manual: 'Front desk' };

export const MemberAttendance: React.FC = () => {
  const { profile } = useAuth();
  const { settings } = useGymSettings();
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!profile) return;
    // Full history, so any month on the calendar shows its visits.
    setRows(await listAttendance({ memberId: profile.id }));
  };

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => new Set(rows.map((r) => localDay(r.check_in))), [rows]);
  const todayKey = localDay();
  const checkedInToday = days.has(todayKey);
  const thisMonth = todayKey.slice(0, 7);
  const monthCount = rows.filter((r) => localDay(r.check_in).startsWith(thisMonth)).length;

  const handleSelfie = async (file?: File) => {
    if (!file || !profile) return;
    setError('');
    setNotice('');
    setBusy(true);
    try {
      const coords = await currentPosition();
      const photo = await compressImage(file, 960, 0.8);
      const result = await selfieCheckIn(profile.id, photo, coords);
      setNotice(result.already_checked_in ? 'You were already checked in today.' : `Checked in! You are ${result.distance_m} m from the gym.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not check in');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <Helmet>
        <title>Attendance | RV Fitness</title>
      </Helmet>

      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">WORKOUT CONSISTENCY</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
            ATTENDANCE <span className="text-gym-primary">LOG</span>
          </h1>
        </div>

        <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Check in">
          <h3 className="font-heading text-white">Check in today</h3>
          {checkedInToday ? (
            <p className="text-sm text-gym-success flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> You are checked in for today. Have a great workout!
            </p>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to="/portal/digital-card" className="flex-1">
                <Button variant="outline" className="w-full" leftIcon={<QrCode className="w-4 h-4" />}>Show QR to a trainer</Button>
              </Link>
              {settings.geofence.enabled && (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    aria-label="Take check-in selfie"
                    onChange={(e) => handleSelfie(e.target.files?.[0])}
                  />
                  <Button variant="primary" className="flex-1" isLoading={busy} onClick={() => fileRef.current?.click()} leftIcon={<Camera className="w-4 h-4" />}>
                    Selfie check-in
                  </Button>
                </>
              )}
            </div>
          )}
          {settings.geofence.enabled && !checkedInToday && (
            <p className="text-xs text-gym-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-gym-primary" /> No trainer free? Take a selfie inside the gym. Your location is checked to confirm you are at RV Fitness.
            </p>
          )}
          {notice && <p role="status" className="text-sm text-gym-success">{notice}</p>}
          {error && <p role="alert" className="text-sm text-gym-danger">{error}</p>}
        </Card>

        <div className="grid grid-cols-2 gap-4">
          <Card hoverEffect={false}>
            <span className="text-xs text-gym-muted uppercase font-heading">Current streak</span>
            <p className="text-2xl font-heading text-white flex items-center gap-2">
              <Flame className="w-6 h-6 text-gym-primary" /> {loading ? '—' : `${attendanceStreak(rows)} days`}
            </p>
          </Card>
          <Card hoverEffect={false}>
            <span className="text-xs text-gym-muted uppercase font-heading">Visits this month</span>
            <p className="text-2xl font-heading text-white">{loading ? '—' : monthCount}</p>
          </Card>
        </div>

        <AttendanceCalendar days={days} />

        <Card hoverEffect={false} className="flex flex-col gap-2">
          <h3 className="font-heading text-white">Recent check-ins</h3>
          {rows.length === 0 ? (
            <p className="text-sm text-gym-muted">{loading ? 'Loading...' : 'No check-ins yet.'}</p>
          ) : (
            <ul className="divide-y divide-gym-border text-sm">
              {rows.slice(0, 10).map((r) => (
                <li key={r.id} className="py-2 flex justify-between gap-2">
                  <span className="text-white">{new Date(r.check_in).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  <span className="text-gym-muted">{METHOD_LABEL[r.method] ?? r.method}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
};
