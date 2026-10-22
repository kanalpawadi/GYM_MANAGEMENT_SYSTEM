import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/account/Avatar';
import { formatINR, phoneDisplay } from '../../config/site';
import { PlanRequest, decidePlanRequest, listPlanRequests } from '../../services/gym';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Owner / staff approve plan renewals and changes that members request. */
export const AdminRequests: React.FC = () => {
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [view, setView] = useState<'pending' | 'done'>('pending');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () => listPlanRequests().then(setRequests);

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const decide = async (r: PlanRequest, approve: boolean, markPaid = false, mode: 'cash' | 'upi' = 'cash') => {
    setBusy(r.id);
    setError('');
    try {
      await decidePlanRequest(r.id, approve, { markPaid, mode, note: notes[r.id]?.trim() || undefined });
      setNotice(
        approve
          ? `${r.member?.full_name ?? 'Member'}'s ${r.plan_title} plan approved${markPaid ? ` and marked paid (${mode.toUpperCase()})` : ' — payment due'}.`
          : `Request from ${r.member?.full_name ?? 'member'} declined.`,
      );
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update the request');
    } finally {
      setBusy('');
    }
  };

  const shown = requests.filter((r) => (view === 'pending' ? r.status === 'pending' : r.status !== 'pending'));

  return (
    <>
      <Helmet>
        <title>Plan Requests | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">APPROVALS</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
            PLAN <span className="text-gym-primary">REQUESTS</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">Members request a renewal or a plan change. A plan starts only after you approve it.</p>
        </div>

        <div className="flex rounded-xl border border-gym-border overflow-hidden w-fit" role="tablist">
          {(
            [
              ['pending', `Pending (${requests.filter((r) => r.status === 'pending').length})`],
              ['done', 'History'],
            ] as const
          ).map(([key, label]) => (
            <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`px-4 py-2 text-xs font-heading ${view === key ? 'bg-gold-gradient text-black' : 'text-gym-muted hover:text-white'}`}>
              {label}
            </button>
          ))}
        </div>

        {notice && (
          <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {notice}
          </div>
        )}
        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        {loading && <p className="text-sm text-gym-muted">Loading requests...</p>}
        {!loading && shown.length === 0 && (
          <Card hoverEffect={false}>
            <p className="text-sm text-gym-muted">{view === 'pending' ? 'No pending requests.' : 'No past requests yet.'}</p>
          </Card>
        )}

        <div className="flex flex-col gap-4">
          {shown.map((r) => (
            <Card key={r.id} hoverEffect={false} className="flex flex-col gap-4" aria-label={`Request from ${r.member?.full_name ?? 'member'}`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={r.member?.avatar_url} name={r.member?.full_name} size="md" />
                  <div className="min-w-0">
                    <Link to={`/admin/members/${r.member_id}`} className="font-heading text-white hover:text-gym-primary">
                      {r.member?.full_name ?? 'Member'}
                    </Link>
                    <p className="text-xs text-gym-muted">
                      {r.member?.member_code} {r.member?.phone ? `· ${phoneDisplay(r.member.phone)}` : ''} · sent {fmt(r.created_at)}
                    </p>
                  </div>
                </div>
                <div className="md:text-right">
                  <p className="font-heading text-gym-primary text-lg">
                    {r.plan_title} · {formatINR(Number(r.price))}
                    {Number(r.base_price) !== Number(r.price) && <span className="text-xs text-gym-muted line-through ml-2">{formatINR(Number(r.base_price))}</span>}
                  </p>
                  <p className="text-xs text-gym-muted">
                    {r.request_type === 'change' ? 'Plan change' : 'Renewal'} · wants to pay {r.payment_preference === 'online' ? 'online' : 'at the desk'}
                  </p>
                </div>
              </div>

              {r.status === 'pending' ? (
                <>
                  <input
                    aria-label={`Note for ${r.member?.full_name ?? 'member'}`}
                    placeholder="Optional note to the member"
                    value={notes[r.id] ?? ''}
                    onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))}
                    className="w-full bg-black text-white border border-gym-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gym-primary"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" size="sm" isLoading={busy === r.id} onClick={() => decide(r, true, true, 'cash')}>Approve · Paid Cash</Button>
                    <Button variant="primary" size="sm" isLoading={busy === r.id} onClick={() => decide(r, true, true, 'upi')}>Approve · Paid UPI</Button>
                    <Button variant="outline" size="sm" isLoading={busy === r.id} onClick={() => decide(r, true, false)}>Approve · Payment Due</Button>
                    <Button variant="ghost" size="sm" className="text-gym-danger" isLoading={busy === r.id} onClick={() => decide(r, false)} leftIcon={<XCircle className="w-4 h-4" />}>
                      Decline
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gym-muted capitalize">
                  {r.status}
                  {r.decided_at ? ` on ${fmt(r.decided_at)}` : ''}
                  {r.note ? ` · ${r.note}` : ''}
                  {r.payment_id && (
                    <Link to={`/invoice/${r.payment_id}`} className="ml-2 text-gym-primary hover:underline normal-case">Invoice</Link>
                  )}
                </p>
              )}
            </Card>
          ))}
        </div>
      </div>
    </>
  );
};
