import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card';
import { AttendanceRow, Membership, Payment, listAttendance, listMembers, listMemberships, listPayments, localDay, payerName } from '../../services/gym';
import { ExportMenu } from '../../components/ui/ExportMenu';
import type { UserProfile } from '../../types';

/** Plan popularity and CSV / PDF / HTML exports from real gym data. */
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

  const paymentsSpec = () => ({
    title: 'Payments & invoices',
    filename: `rv-fitness-payments-${today}`,
    rows: payments.map((p) => ({
      invoice: p.gst_invoice_no ?? '',
      member: payerName(p),
      member_id: p.member?.member_code ?? '',
      plan: p.plan_title ?? '',
      amount: p.total_amount,
      discount: p.discount_amount,
      mode: p.payment_mode,
      status: p.status,
      date: localDay(p.paid_at || p.created_at),
    })),
  });
  const attendanceSpec = () => ({
    title: 'Attendance (last 90 days)',
    filename: `rv-fitness-attendance-${today}`,
    rows: attendance.map((a) => ({
      date: localDay(a.check_in),
      time: new Date(a.check_in).toLocaleTimeString('en-IN'),
      member: a.member?.full_name ?? '',
      member_id: a.member?.member_code ?? '',
      method: a.method,
    })),
  });

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
            <h3 className="font-heading text-white">Download reports</h3>
            <p className="text-xs text-gym-muted">CSV for Excel / Google Sheets, PDF to print or share, HTML as a web page.</p>
            <ExportMenu variant="primary" getSpec={paymentsSpec} disabled={!payments.length} label={`Payments & invoices (${payments.length})`} />
            <ExportMenu getSpec={attendanceSpec} disabled={!attendance.length} label={`Attendance, last 90 days (${attendance.length})`} />
          </Card>
        </div>
      </div>
    </>
  );
};
