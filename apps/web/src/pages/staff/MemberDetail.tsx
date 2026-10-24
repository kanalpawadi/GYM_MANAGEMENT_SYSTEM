import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Crown, Dumbbell, FileText, MessageCircle, IndianRupee, Pencil, QrCode, Trash2, Utensils } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Avatar } from '../../components/account/Avatar';
import { ProfileDetailsForm } from '../../components/account/ProfileDetailsForm';
import { ProgressTimeline } from '../../components/progress/ProgressTimeline';
import { PlanEditorModal, PlanTarget } from '../../components/plans/PlanEditorModal';
import { DeleteMemberModal } from '../../components/account/DeleteMemberModal';
import { SupplementLog } from '../../components/supplements/SupplementLog';
import { ChangePlanModal } from '../../components/plans/ChangePlanModal';
import { RecordPaymentModal } from '../../components/payments/RecordPaymentModal';
import { PaymentTotals, ReceiptList, leftOn } from '../../components/payments/PaymentSummary';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, canManageData, isOwnerLevel, isStaffRole, roleRank } from '../../config/roles';
import { formatINR, phoneDisplay } from '../../config/site';
import { DietPlan, ProgressEntry, WorkoutPlan, assignTrainer, getPersonalPlans, listProgress, listUsers } from '../../services/portal';
import {
  AttendanceRow,
  Membership,
  Payment,
  ageFromDob,
  currentMembership,
  daysLeft,
  getProfile,
  listAttendance,
  listMemberships,
  listPayments,
  listReceipts,
  Receipt,
  markPaymentPaid,
  staffCheckIn,
  updateProfile,
} from '../../services/gym';
import type { UserProfile } from '../../types';
import { useCardTable } from '../../utils/useCardTable';

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
type Tab = 'overview' | 'profile' | 'plans' | 'supplements' | 'progress' | 'payments' | 'attendance';
const TABS: [Tab, string][] = [
  ['overview', 'Overview'],
  ['profile', 'Profile'],
  ['plans', 'Diet & Workout'],
  ['supplements', 'Supplements'],
  ['progress', 'Progress'],
  ['payments', 'Payments'],
  ['attendance', 'Attendance'],
];

/** A member's full dashboard for trainers and admins (role chain). */
export const MemberDetail: React.FC<{ backTo: string }> = ({ backTo }) => {
  const paymentsTable = useCardTable();
  const { memberId } = useParams<{ memberId: string }>();
  const { profile: me } = useAuth();
  const [member, setMember] = useState<UserProfile | null>(null);
  const [trainers, setTrainers] = useState<UserProfile[]>([]);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [recording, setRecording] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [progress, setProgress] = useState<ProgressEntry[]>([]);
  const [plans, setPlans] = useState<{ diet: DietPlan | null; workout: WorkoutPlan | null }>({ diet: null, workout: null });
  const [tab, setTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<PlanTarget>(null);
  const [deleting, setDeleting] = useState(false);
  const [changingPlan, setChangingPlan] = useState(false);
  const navigate = useNavigate();

  const staff = isStaffRole(me?.role);

  const load = useCallback(async () => {
    if (!memberId) return;
    const m = await getProfile(memberId);
    setMember(m);
    if (!m) return;
    const [ms, ps, att, prog, pl, rc] = await Promise.all([
      listMemberships(memberId),
      listPayments(memberId),
      listAttendance({ memberId }),
      listProgress(memberId),
      getPersonalPlans(memberId),
      // Receipts arrive with migration 14; older databases just show none.
      listReceipts(memberId).catch(() => [] as Receipt[]),
    ]);
    setMemberships(ms);
    setPayments(ps);
    setReceipts(rc);
    setAttendance(att);
    setProgress(prog);
    setPlans(pl);
  }, [memberId]);

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
    if (staff) listUsers().then((u) => setTrainers(u.filter((x) => x.role === 'trainer'))).catch(() => undefined);
  }, [load, staff]);

  const flash = (msg: string) => {
    setNotice(msg);
    setError('');
    setTimeout(() => setNotice(''), 4000);
  };
  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      await load();
      flash(msg);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    }
  };

  if (loading) return <p className="text-gym-muted p-6">Loading member...</p>;
  if (!member || !me || !canManageData(me, member)) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-gym-danger">{error || 'Member not found, or you do not have access to this person.'}</p>
        <Link to={backTo} className="text-gym-primary hover:underline text-sm">← Back</Link>
      </div>
    );
  }

  const membership = currentMembership(memberships);
  const left = daysLeft(membership);
  const age = ageFromDob(member.dob);

  return (
    <>
      <Helmet>
        <title>{member.full_name} | RV Fitness</title>
      </Helmet>

      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <Link to={backTo} className="text-sm text-gym-muted hover:text-white inline-flex items-center gap-1 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to members
        </Link>

        <Card hoverEffect={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Avatar src={member.avatar_url} name={member.full_name} size="xl" zoomable />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-heading text-white break-words flex items-center gap-2">
                {member.full_name}
                {member.membership_tier === 'premium' && <Crown className="w-5 h-5 text-gym-primary" aria-label="Premium member" />}
              </h1>
              <p className="text-sm text-gym-primary font-heading">
                {member.member_code || '—'} · {ROLE_LABELS[member.role]}
                {member.role === 'member' ? ` · ${member.membership_tier === 'premium' ? 'Premium' : 'Normal'}` : ''}
              </p>
              <p className="text-xs text-gym-muted break-all">
                {member.phone ? phoneDisplay(member.phone) : 'No phone'} · {member.email}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {member.id !== me.id && (
              <Link to={`${backTo.startsWith('/trainer') ? '/trainer' : '/admin'}/messages?with=${member.id}`}>
                <Button variant="outline" size="sm" leftIcon={<MessageCircle className="w-4 h-4" />}>Message</Button>
              </Link>
            )}
            {roleRank(me.role) >= 2 && member.role === 'member' && (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<QrCode className="w-4 h-4" />}
                onClick={() => run(async () => {
                  const r = await staffCheckIn(member.id, me.id);
                  if (r.already) throw new Error(`${member.full_name} is already checked in today.`);
                }, `${member.full_name} checked in.`)}
              >
                Mark Attendance
              </Button>
            )}
          </div>
        </Card>

        {notice && (
          <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl flex items-center gap-2 text-sm">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-gym-border" role="tablist">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-sm font-heading whitespace-nowrap border-b-2 ${tab === key ? 'border-gym-primary text-gym-primary' : 'border-transparent text-gym-muted hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card hoverEffect={false} className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-heading text-white">Membership</h3>
                {roleRank(me.role) >= 2 && member.role === 'member' && member.id !== me.id && (
                  <Button variant="outline" size="sm" onClick={() => setChangingPlan(true)} leftIcon={<Pencil className="w-4 h-4" />}>
                    Change plan
                  </Button>
                )}
              </div>
              {membership ? (
                <>
                  <p className="text-xl font-heading text-gym-primary">{membership.plan_title}</p>
                  <p className={`text-sm ${left != null && left >= 0 ? 'text-gym-success' : 'text-gym-danger'}`}>
                    {fmt(membership.start_date)} – {fmt(membership.end_date)} ({left != null && left >= 0 ? `${left} days left` : 'expired'})
                  </p>
                </>
              ) : (
                <p className="text-sm text-gym-muted">No membership yet.</p>
              )}
              <p className="text-xs text-gym-muted">{attendance.length} total check-ins · {progress.length} progress entries</p>
            </Card>

            <Card hoverEffect={false} className="flex flex-col gap-3">
              <h3 className="font-heading text-white">Health</h3>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-xs text-gym-muted">Age</dt><dd className="text-white">{age != null ? `${age} yrs` : '—'}</dd></div>
                <div><dt className="text-xs text-gym-muted">Blood group</dt><dd className="text-white">{member.blood_group || '—'}</dd></div>
                <div><dt className="text-xs text-gym-muted">Height</dt><dd className="text-white">{member.height_cm ? `${member.height_cm} cm` : '—'}</dd></div>
                <div><dt className="text-xs text-gym-muted">Weight</dt><dd className="text-white">{member.weight_kg ? `${member.weight_kg} kg` : '—'}</dd></div>
              </dl>
              <p className="text-sm"><span className="text-xs text-gym-muted block">Medicines</span><span className="text-white">{member.medicines || '—'}</span></p>
              <p className="text-sm"><span className="text-xs text-gym-muted block">Health notes</span><span className="text-white whitespace-pre-line">{member.health_notes || '—'}</span></p>
            </Card>

            {staff && member.role === 'member' && (
              <Card hoverEffect={false} className="flex flex-col gap-4 lg:col-span-2" aria-label="Gym settings for this member">
                <h3 className="font-heading text-white">Membership type & trainer</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Member type"
                    value={member.membership_tier ?? 'normal'}
                    onChange={(e) =>
                      run(() => updateProfile(member.id, { membership_tier: e.target.value as 'normal' | 'premium' }), `Member type changed to ${e.target.value}.`)
                    }
                    options={[
                      { label: 'Normal (common diet plan)', value: 'normal' },
                      { label: 'Premium (personal diet plan)', value: 'premium' },
                    ]}
                  />
                  <Select
                    label="Trainer"
                    value={member.assigned_trainer_id ?? ''}
                    onChange={(e) => run(() => assignTrainer(member.id, e.target.value || null), 'Trainer updated.')}
                    options={[{ label: 'No trainer', value: '' }, ...trainers.map((t) => ({ label: t.full_name, value: t.id }))]}
                  />
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === 'profile' && <ProfileDetailsForm target={member} onSaved={load} />}

        {tab === 'plans' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {(['diet', 'workout'] as const).map((kind) => {
              const plan = kind === 'diet' ? plans.diet : plans.workout;
              return (
                <Card key={kind} hoverEffect={false} className="flex flex-col gap-3">
                  <h3 className="font-heading text-white flex items-center gap-2">
                    {kind === 'diet' ? <Utensils className="w-5 h-5 text-gym-primary" /> : <Dumbbell className="w-5 h-5 text-gym-primary" />}
                    Personal {kind === 'diet' ? 'diet' : 'workout'} plan
                  </h3>
                  {plan ? (
                    <>
                      <p className="text-gym-primary font-heading">{plan.title}</p>
                      <ul className="text-sm text-gym-muted flex flex-col gap-1">
                        {kind === 'diet'
                          ? (plan as DietPlan).meals.map((m, i) => <li key={i}><span className="text-white">{m.name}{m.time ? ` (${m.time})` : ''}:</span> {m.items}</li>)
                          : (plan as WorkoutPlan).schedule.map((d, i) => <li key={i}><span className="text-white">{d.day}:</span> {d.exercises}</li>)}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-gym-muted">No personal plan. {member.membership_tier !== 'premium' ? 'This member sees the common plan.' : ''}</p>
                  )}
                  <Button variant="outline" size="sm" className="w-fit" onClick={() => setEditing({ kind, member })}>
                    {plan ? 'Edit plan' : 'Create plan'}
                  </Button>
                </Card>
              );
            })}
          </div>
        )}

        {tab === 'progress' && (
          <Card hoverEffect={false}>
            <ProgressTimeline entries={progress} memberName={member.full_name} />
          </Card>
        )}

        {tab === 'payments' && (
          <div className="flex flex-col gap-4">
          <PaymentTotals payments={payments} />
          {staff && member.role === 'member' && (
            <Button variant="primary" onClick={() => setRecording(true)} leftIcon={<IndianRupee className="w-4 h-4" />} className="sm:self-start">
              Record payment received
            </Button>
          )}
          <Card hoverEffect={false} className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table ref={paymentsTable} className="table-cards w-full text-left text-sm">
                <thead className="bg-gym-surfaceHover font-heading text-gym-primary">
                  <tr>
                    <th className="p-3">Invoice</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gym-border">
                  {payments.length === 0 && (
                    <tr><td colSpan={5} className="p-5 text-center text-gym-muted">No payments yet.</td></tr>
                  )}
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="p-3 text-white">{p.gst_invoice_no || '—'}</td>
                      <td className="p-3">{p.plan_title}</td>
                      <td className="p-3 text-gym-primary font-heading">{formatINR(Number(p.total_amount))}</td>
                      <td className="p-3">
                        {p.status === 'paid' ? (
                          `Paid · ${p.payment_mode.toUpperCase()}`
                        ) : Number(p.amount_paid ?? 0) > 0 ? (
                          <span className="text-amber-400">Part paid · {formatINR(leftOn(p))} left</span>
                        ) : (
                          <span className="text-amber-400">Due</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {p.status === 'paid' ? (
                          <Link to={`/invoice/${p.id}`} className="inline-flex items-center gap-1 text-gym-primary text-xs hover:underline"><FileText className="w-4 h-4" /> Invoice</Link>
                        ) : staff ? (
                          <div className="flex justify-end gap-1">
                            {(['cash', 'upi'] as const).map((mode) => (
                              <Button key={mode} variant="outline" size="sm" onClick={() => run(() => markPaymentPaid(p.id, mode), `Payment marked as paid (${mode.toUpperCase()}).`)}>
                                Paid {mode.toUpperCase()}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gym-muted">Awaiting payment</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          <ReceiptList receipts={receipts} />
          </div>
        )}

        <RecordPaymentModal
          isOpen={recording}
          member={member}
          payments={payments}
          onClose={() => setRecording(false)}
          onSaved={(message) => {
            setRecording(false);
            load().then(() => flash(message));
          }}
        />

        {tab === 'supplements' && <SupplementLog memberId={member.id} memberName={member.full_name} canEdit={canManageData(me, member)} />}

        {tab === 'attendance' && (
          <Card hoverEffect={false}>
            {attendance.length === 0 ? (
              <p className="text-sm text-gym-muted">No check-ins yet.</p>
            ) : (
              <ul className="divide-y divide-gym-border text-sm">
                {attendance.slice(0, 60).map((a) => (
                  <li key={a.id} className="py-2 flex justify-between gap-2">
                    <span className="text-white">{new Date(a.check_in).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    <span className="text-gym-muted capitalize">{a.method === 'qr' ? 'QR scan' : a.method}{a.distance_m != null ? ` · ${a.distance_m} m` : ''}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {isOwnerLevel(me.role) && member.role === 'member' && member.id !== me.id && (
          <Card hoverEffect={false} className="border-gym-danger/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3" aria-label="Danger zone">
            <div>
              <h3 className="font-heading text-gym-danger">Delete member</h3>
              <p className="text-xs text-gym-muted">Permanently removes this member, their login, photos and data. Payments are kept as “Deleted member”.</p>
            </div>
            <button
              type="button"
              onClick={() => setDeleting(true)}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-gym-danger text-gym-danger font-heading text-sm hover:bg-gym-danger/10 shrink-0"
            >
              <Trash2 className="w-4 h-4" /> Delete member
            </button>
          </Card>
        )}

        <ChangePlanModal
          isOpen={changingPlan}
          member={member}
          current={membership}
          canSetPrice={isOwnerLevel(me.role)}
          onClose={() => setChangingPlan(false)}
          onSaved={(message) => {
            setChangingPlan(false);
            load().then(() => flash(message));
          }}
        />

        <DeleteMemberModal
          member={deleting ? member : null}
          onClose={() => setDeleting(false)}
          onDeleted={(message) => navigate(backTo.startsWith('/admin') ? '/admin/members' : backTo, { replace: true, state: { notice: message } })}
        />

        <PlanEditorModal
          target={editing}
          author={me}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            load().then(() => flash(msg));
          }}
        />
      </div>
    </>
  );
};
