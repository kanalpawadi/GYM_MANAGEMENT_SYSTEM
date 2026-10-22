import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Download } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { AttendanceRow, Membership, Payment, downloadFile, listAttendance, listMembers, listMemberships, listPayments, localDay, toCsv } from '../../services/gym';
import type { UserProfile } from '../../types';

/** Plan popularity and CSV exports from real gym data. */
export const AdminReports: React.FC = () => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    Promise.all([listMembers(), listMemberships(), listPayments(), listAttendance({ since })])
      .then(([m, ms, p, a]) => {
        setMembers(m);
        setMemberships(ms);
        setPayments(p);
        setAttendance(a);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const popularity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of memberships) counts.set(m.plan_title || 'Other', (counts.get(m.plan_title || 'Other') ?? 0) + 1);
    const total = memberships.length || 1;
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([title, n]) => ({ title, n, pct: Math.round((n / total) * 100) }));
  }, [memberships]);

  const premium = members.filter((m) => m.membership_tier === 'premium').length;
  const today = localDay();

  const exportPayments = () =>
    downloadFile(
      `rv-fitness-payments-${today}.csv`,
      toCsv(
        payments.map((p) => ({
          invoice: p.gst_invoice_no ?? '',
          member: p.member?.full_name ?? '',
          member_id: p.member?.member_code ?? '',
          plan: p.plan_title ?? '',
          amount: p.total_amount,
          discount: p.discount_amount,
          mode: p.payment_mode,
          status: p.status,
          date: localDay(p.paid_at || p.created_at),
        })),
      ),
    );
  const exportAttendance = () =>
    downloadFile(
      `rv-fitness-attendance-${today}.csv`,
      toCsv(
        attendance.map((a) => ({
          date: localDay(a.check_in),
          time: new Date(a.check_in).toLocaleTimeString('en-IN'),
          member: a.member?.full_name ?? '',
          member_id: a.member?.member_code ?? '',
          method: a.method,
        })),
      ),
    );

  return (
    <>
      <Helmet>
        <title>Reports | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ANALYTICS</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            GYM <span className="text-gym-primary">REPORTS</span>
          </h1>
        </div>

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card hoverEffect={false} className="flex flex-col gap-4" aria-label="Plan popularity">
            <h3 className="font-heading text-white">Plan popularity</h3>
            {popularity.length === 0 ? (
              <p className="text-sm text-gym-muted">{loading ? 'Loading...' : 'No memberships yet.'}</p>
            ) : (
              popularity.map((p) => (
                <div key={p.title}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white">{p.title}</span>
                    <span className="text-gym-muted">{p.n} ({p.pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-black overflow-hidden">
                    <div className="h-full bg-gold-gradient" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))
            )}
            <p className="text-xs text-gym-muted">{members.length} members · {premium} premium · {members.length - premium} normal</p>
          </Card>

          <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Exports">
            <h3 className="font-heading text-white">Download reports (CSV)</h3>
            <p className="text-xs text-gym-muted">Open in Excel or Google Sheets.</p>
            <Button variant="primary" onClick={exportPayments} disabled={!payments.length} leftIcon={<Download className="w-4 h-4" />}>Payments & invoices ({payments.length})</Button>
            <Button variant="outline" onClick={exportAttendance} disabled={!attendance.length} leftIcon={<Download className="w-4 h-4" />}>Attendance, last 90 days ({attendance.length})</Button>
          </Card>
        </div>
      </div>
    </>
  );
};
