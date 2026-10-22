import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, CreditCard, Store, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { usePlans } from '../../content/ContentContext';
import { useGymSettings } from '../../content/useGymSettings';
import { formatINR } from '../../config/site';
import { Membership, PlanRequest, applyDiscount, cancelPlanRequest, currentMembership, listMemberships, listPlanRequests, requestPlan } from '../../services/gym';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLE: Record<PlanRequest['status'], string> = {
  pending: 'text-amber-400 border-amber-400/40 bg-amber-400/10',
  approved: 'text-gym-success border-gym-success/40 bg-gym-success/10',
  rejected: 'text-gym-danger border-gym-danger/40 bg-gym-danger/10',
  cancelled: 'text-gym-muted border-gym-border',
};

/** Members ask to renew or change their plan; the gym owner approves before it starts. */
export const MembershipCheckout: React.FC = () => {
  const { profile } = useAuth();
  const plans = usePlans();
  const { settings } = useGymSettings();
  const [selected, setSelected] = useState('six-month');
  const [payment, setPayment] = useState<'desk' | 'online'>('desk');
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = async () => {
    if (!profile) return;
    const [reqs, memberships] = await Promise.all([listPlanRequests({ memberId: profile.id }), listMemberships(profile.id)]);
    setRequests(reqs);
    setMembership(currentMembership(memberships));
  };

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const pending = requests.find((r) => r.status === 'pending');
  const plan = plans.find((p) => p.id === selected) ?? plans[0];
  const price = applyDiscount(plan.price, settings.discount);
  const changing = !!membership && membership.plan_code !== plan.id;

  const submit = async () => {
    setError('');
    setNotice('');
    setSubmitting(true);
    try {
      await requestPlan(plan.id, payment, changing ? 'change' : 'renew');
      setNotice('Request sent. The gym will review it and you will get a notification.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not send the request');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = async (id: string) => {
    try {
      await cancelPlanRequest(id);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not cancel');
    }
  };

  return (
    <>
      <Helmet>
        <title>Renew or Change Plan | RV Fitness</title>
      </Helmet>

      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">MEMBERSHIP</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
            RENEW OR <span className="text-gym-primary">CHANGE PLAN</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">
            Pick a plan and send a request. Your plan starts only after the gym owner approves it.
            {membership && ` Current plan: ${membership.plan_title} (till ${fmt(membership.end_date)}).`}
          </p>
        </div>

        {settings.discount.enabled && (
          <div className="bg-gym-primary/10 border border-gym-primary/40 text-gym-primary rounded-xl p-3 text-sm font-heading">
            {settings.discount.label}: {settings.discount.percent}% off all plans right now.
          </div>
        )}
        {notice && (
          <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        {pending ? (
          <Card hoverEffect={false} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" aria-label="Pending request">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-amber-400 shrink-0" />
              <div>
                <h3 className="font-heading text-white">Waiting for approval: {pending.plan_title}</h3>
                <p className="text-xs text-gym-muted">
                  {formatINR(pending.price)} · pay {pending.payment_preference === 'online' ? 'online' : 'at the desk'} · sent {fmt(pending.created_at)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => cancel(pending.id)}>Cancel request</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-7 flex flex-col gap-3" role="radiogroup" aria-label="Choose a plan">
              {plans.map((p) => {
                const discounted = applyDiscount(p.price, settings.discount);
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={selected === p.id}
                    onClick={() => setSelected(p.id)}
                    className={`text-left p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      selected === p.id ? 'border-gym-primary bg-gym-primary/10' : 'border-gym-border bg-gym-surface/70 hover:border-gym-primary/50'
                    }`}
                  >
                    <div>
                      <h3 className="font-heading text-white">{p.title}</h3>
                      <p className="text-xs text-gym-muted">{p.months} month{p.months > 1 ? 's' : ''} · {p.badge}</p>
                    </div>
                    <div className="text-right">
                      {discounted !== p.price && <p className="text-xs text-gym-muted line-through">{formatINR(p.price)}</p>}
                      <p className="text-xl font-heading text-gym-primary">{formatINR(discounted)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <Card hoverEffect={false} className="lg:col-span-5 flex flex-col gap-4">
              <h3 className="text-xl font-heading text-white">Summary</h3>
              <div className="flex justify-between text-sm">
                <span className="text-gym-muted">{plan.title} plan</span>
                <span className="text-white">{formatINR(plan.price)}</span>
              </div>
              {price !== plan.price && (
                <div className="flex justify-between text-sm">
                  <span className="text-gym-muted">Discount</span>
                  <span className="text-gym-success">−{formatINR(plan.price - price)}</span>
                </div>
              )}
              <div className="flex justify-between font-heading text-lg border-t border-gym-border pt-3">
                <span className="text-white">Total</span>
                <span className="text-gym-primary">{formatINR(price)}</span>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-sm text-gym-muted mb-1">How will you pay after approval?</legend>
                {[
                  { value: 'desk' as const, label: 'Pay at the gym desk', hint: 'Cash or UPI at reception', icon: Store },
                  { value: 'online' as const, label: 'Pay online', hint: 'Card / UPI / net banking', icon: CreditCard },
                ].map(({ value, label, hint, icon: Icon }) => (
                  <label key={value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer ${payment === value ? 'border-gym-primary bg-gym-primary/10' : 'border-gym-border'}`}>
                    <input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} className="accent-gym-primary" />
                    <Icon className="w-4 h-4 text-gym-primary" />
                    <span>
                      <span className="block text-sm text-white">{label}</span>
                      <span className="block text-xs text-gym-muted">{hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              <Button variant="primary" isLoading={submitting} onClick={submit}>
                Send {changing ? 'Plan Change' : 'Renewal'} Request
              </Button>
              <p className="text-[11px] text-gym-muted">The final price is confirmed by the gym when it approves your request.</p>
            </Card>
          </div>
        )}

        {requests.length > 0 && (
          <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Request history">
            <h3 className="font-heading text-white">Your requests</h3>
            <ul className="divide-y divide-gym-border">
              {requests.map((r) => (
                <li key={r.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-white">
                      {r.plan_title} · {formatINR(r.price)} · {r.request_type === 'change' ? 'Plan change' : 'Renewal'}
                    </p>
                    <p className="text-xs text-gym-muted">
                      Sent {fmt(r.created_at)}
                      {r.note ? ` · Note: ${r.note}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.status === 'approved' && r.payment_id && (
                      <Link to={`/invoice/${r.payment_id}`} className="text-xs text-gym-primary hover:underline">Invoice</Link>
                    )}
                    <span className={`text-xs font-heading px-2.5 py-1 rounded-full border capitalize flex items-center gap-1 ${STATUS_STYLE[r.status]}`}>
                      {r.status === 'rejected' && <XCircle className="w-3 h-3" />}
                      {r.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
};
