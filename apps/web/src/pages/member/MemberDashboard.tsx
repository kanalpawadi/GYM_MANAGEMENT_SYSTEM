import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Flame, Award, Activity, QrCode, CreditCard, Utensils, Receipt, CalendarCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { MyTrainerCard } from '../../components/account/MyTrainerCard';
import { NoticeBoard } from '../../components/notices/NoticeBoard';
import { TodayPlanPopup } from '../../components/engagement/TodayPlanPopup';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRow, Membership, attendanceStreak, currentMembership, daysLeft, listAttendance, listMemberships, localDay } from '../../services/gym';
import { ProgressEntry, listProgress } from '../../services/portal';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const QUICK_LINKS = [
  { to: '/portal/digital-card', label: 'Show QR Pass', hint: 'Check in at reception', icon: QrCode },
  { to: '/portal/plans', label: 'My Diet & Workout', hint: "Today's plan from your trainer", icon: Utensils },
  { to: '/portal/checkout', label: 'Renew / Change Plan', hint: 'Send a request to the gym', icon: CreditCard },
  { to: '/portal/payments', label: 'Invoices', hint: 'View and download receipts', icon: Receipt },
  { to: '/portal/attendance', label: 'Attendance', hint: 'Your check-in history', icon: CalendarCheck },
  { to: '/portal/progress', label: 'Body Metrics', hint: 'Log weight and photos', icon: Activity },
];

export const MemberDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [latest, setLatest] = useState<ProgressEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    const monthAgo = new Date(Date.now() - 60 * 86400000).toISOString();
    Promise.all([listMemberships(profile.id), listAttendance({ memberId: profile.id, since: monthAgo }), listProgress(profile.id)])
      .then(([memberships, att, progress]) => {
        setMembership(currentMembership(memberships));
        setAttendance(att);
        setLatest(progress.find((p) => p.weight_kg != null) ?? null);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile]);

  const left = daysLeft(membership);
  const thisMonth = localDay().slice(0, 7);
  const monthVisits = attendance.filter((a) => localDay(a.check_in).startsWith(thisMonth)).length;

  return (
    <>
      <Helmet>
        <title>Member Dashboard | RV Fitness</title>
      </Helmet>

      <TodayPlanPopup />

      <div className="flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">WELCOME BACK</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1 break-words">
            {profile?.full_name?.split(' ')[0] || 'Member'} <span className="text-gym-primary">DASHBOARD</span>
          </h1>
        </div>

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <NoticeBoard compact allHref="/portal/notices" />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card hoverEffect={false} aria-label="Membership">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">Membership</span>
                {loading ? (
                  <p className="text-sm text-gym-muted mt-2">Loading...</p>
                ) : membership ? (
                  <>
                    <h3 className="text-2xl font-heading text-gym-primary uppercase mt-1">{membership.plan_title || 'Membership'}</h3>
                    <p className={`text-xs font-medium mt-1 ${left != null && left >= 0 ? 'text-gym-success' : 'text-gym-danger'}`}>
                      {left != null && left >= 0 ? `Valid till ${fmt(membership.end_date)} (${left} days left)` : `Expired on ${fmt(membership.end_date)}`}
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-heading text-white uppercase mt-1">No active plan</h3>
                    <Link to="/portal/checkout" className="text-xs text-gym-primary hover:underline">Request a plan →</Link>
                  </>
                )}
              </div>
              <Award className="w-8 h-8 text-gym-primary shrink-0" />
            </div>
          </Card>

          <Card hoverEffect={false} aria-label="Attendance streak">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">Attendance streak</span>
                <h3 className="text-2xl font-heading text-white uppercase mt-1">{loading ? '—' : `${attendanceStreak(attendance)} days`}</h3>
                <p className="text-xs text-gym-muted mt-1">{monthVisits} visits this month</p>
              </div>
              <Flame className="w-8 h-8 text-gym-primary shrink-0" />
            </div>
          </Card>

          <Card hoverEffect={false} aria-label="Body weight">
            <div className="flex justify-between items-start gap-3">
              <div>
                <span className="text-xs font-heading text-gym-muted uppercase">Latest weight</span>
                <h3 className="text-2xl font-heading text-white uppercase mt-1">
                  {latest?.weight_kg != null ? `${latest.weight_kg} kg` : profile?.weight_kg != null ? `${profile.weight_kg} kg` : '—'}
                </h3>
                <p className="text-xs text-gym-muted mt-1">{latest ? `Logged ${fmt(latest.date)}` : 'Log it under Body Metrics'}</p>
              </div>
              <Activity className="w-8 h-8 text-gym-primary shrink-0" />
            </div>
          </Card>
        </div>

        <MyTrainerCard />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_LINKS.map(({ to, label, hint, icon: Icon }) => (
            <Link key={to} to={to}>
              <Card className="flex items-center gap-4 h-full">
                <div className="w-11 h-11 rounded-xl bg-gym-primary/10 text-gym-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-heading text-white">{label}</h3>
                  <p className="text-xs text-gym-muted">{hint}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
};
