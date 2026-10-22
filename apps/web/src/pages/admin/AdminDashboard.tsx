import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Clock, IndianRupee, QrCode, Inbox } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { formatINR } from '../../config/site';
import { listMembers } from '../../services/gym';
import {
  AttendanceRow,
  Membership,
  Payment,
  PlanRequest,
  listAttendance,
  listMemberships,
  listPayments,
  listPlanRequests,
  localDay,
} from '../../services/gym';
import type { UserProfile } from '../../types';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

export const AdminDashboard: React.FC = () => {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    Promise.all([listMembers(), listMemberships(), listPayments(), listAttendance({ since: midnight.toISOString() }), listPlanRequests({ status: 'pending' })])
      .then(([m, ms, p, a, r]) => {
        setMembers(m);
        setMemberships(ms);
        setPayments(p);
        setAttendance(a);
        setRequests(r);
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const today = localDay();
  const month = today.slice(0, 7);
  const in7 = localDay(new Date(Date.now() + 7 * 86400000));

  const stats = useMemo(() => {
    const active = memberships.filter((m) => m.status === 'active' && m.start_date <= today && m.end_date >= today);
    const activeIds = new Set(active.map((m) => m.member_id));
    const expiring = active.filter((m) => m.end_date <= in7).sort((a, b) => a.end_date.localeCompare(b.end_date));
    const paid = payments.filter((p) => p.status === 'paid');
    const revenueThisMonth = paid.filter((p) => localDay(p.paid_at || p.created_at).startsWith(month)).reduce((s, p) => s + Number(p.total_amount), 0);
    const chart = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const key = localDay(d).slice(0, 7);
      return {
        month: d.toLocaleDateString('en-IN', { month: 'short' }),
        revenue: paid.filter((p) => localDay(p.paid_at || p.created_at).startsWith(key)).reduce((s, p) => s + Number(p.total_amount), 0),
      };
    });
    return {
      activeMembers: activeIds.size,
      newJoins: members.filter((m) => localDay(m.created_at).startsWith(month)).length,
      expiring,
      revenueThisMonth,
      chart,
      duePayments: payments.filter((p) => p.status === 'pending').length,
    };
  }, [members, memberships, payments, today, month, in7]);

  const nameOf = (id: string) => members.find((m) => m.id === id);

  const kpis = [
    { label: 'Active members', value: stats.activeMembers, hint: `${members.length} registered`, icon: Users },
    { label: 'New this month', value: stats.newJoins, hint: 'Sign-ups', icon: UserPlus },
    { label: 'Expiring in 7 days', value: stats.expiring.length, hint: 'Remind them to renew', icon: Clock },
    { label: 'Revenue this month', value: formatINR(stats.revenueThisMonth), hint: `${stats.duePayments} payment(s) due`, icon: IndianRupee },
    { label: "Today's check-ins", value: attendance.length, hint: 'QR, selfie or desk', icon: QrCode },
    { label: 'Pending requests', value: requests.length, hint: 'Plan renewals / changes', icon: Inbox },
  ];

  return (
    <>
      <Helmet>
        <title>Admin Overview | RV Fitness</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">EXECUTIVE OVERVIEW</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
              GYM <span className="text-gym-primary">OVERVIEW</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/admin/requests">
              <Button variant="outline" size="sm" leftIcon={<Inbox className="w-4 h-4" />}>Requests ({requests.length})</Button>
            </Link>
            <Link to="/admin/attendance">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>Scan Attendance</Button>
            </Link>
          </div>
        </div>

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {kpis.map(({ label, value, hint, icon: Icon }) => (
            <Card key={label} hoverEffect={false} aria-label={label}>
              <div className="flex justify-between items-start gap-3">
                <div>
                  <span className="text-xs font-heading text-gym-muted uppercase">{label}</span>
                  <p className="text-3xl font-heading text-white mt-1">{loading ? '—' : value}</p>
                  <p className="text-xs text-gym-muted mt-1">{hint}</p>
                </div>
                <Icon className="w-7 h-7 text-gym-primary shrink-0" />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <Card hoverEffect={false} className="lg:col-span-8">
            <h3 className="text-lg font-heading text-white mb-4">Revenue (last 6 months)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272A" vertical={false} />
                  <XAxis dataKey="month" stroke="#A1A1AA" fontSize={12} tickLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => formatINR(v)}
                    contentStyle={{ backgroundColor: '#18181B', borderColor: '#D4AF37', borderRadius: '8px' }}
                    itemStyle={{ color: '#D4AF37' }}
                  />
                  <Bar dataKey="revenue" fill="#D4AF37" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card hoverEffect={false} className="lg:col-span-4 flex flex-col gap-3" aria-label="Expiring memberships">
            <h3 className="text-lg font-heading text-white">Expiring soon</h3>
            {stats.expiring.length === 0 ? (
              <p className="text-sm text-gym-muted">{loading ? 'Loading...' : 'No memberships expire in the next 7 days.'}</p>
            ) : (
              <ul className="divide-y divide-gym-border">
                {stats.expiring.slice(0, 8).map((m) => {
                  const who = nameOf(m.member_id);
                  return (
                    <li key={m.id} className="py-2 flex justify-between gap-2 text-sm">
                      <Link to={`/admin/members/${m.member_id}`} className="text-white hover:text-gym-primary truncate">
                        {who?.full_name || 'Member'}
                      </Link>
                      <span className="text-amber-400 shrink-0">{fmt(m.end_date)}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};
