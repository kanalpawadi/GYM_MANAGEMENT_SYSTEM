import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { Clock, FileText, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../config/site';
import { Membership, Payment, PlanRequest, Receipt, cancelPlanRequest, currentMembership, listMemberships, listPayments, listPlanRequests, listReceipts } from '../../services/gym';
import { PaymentTotals, ReceiptList, leftOn } from '../../components/payments/PaymentSummary';
import { Button } from '../../components/ui/Button';
import { GeneratePaymentModal, PayOnlineButton } from '../../components/payments/GeneratePayment';
import { useCardTable } from '../../utils/useCardTable';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const PaymentHistory: React.FC = () => {
  const paymentsTable = useCardTable();
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requests, setRequests] = useState<PlanRequest[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [generating, setGenerating] = useState(false);

  const load = async () => {
    if (!profile) return;
    const [pays, reqs, memberships, rc] = await Promise.all([
      listPayments(profile.id),
      listPlanRequests({ memberId: profile.id, status: 'pending' }).catch(() => [] as PlanRequest[]),
      listMemberships(profile.id).catch(() => [] as Membership[]),
      listReceipts(profile.id).catch(() => [] as Receipt[]),
    ]);
    setPayments(pays);
    setReceipts(rc);
    setRequests(reqs);
    setMembership(currentMembership(memberships));
  };

  useEffect(() => {
    if (!profile) return;
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const cancel = async (id: string) => {
    setError('');
    try {
      await cancelPlanRequest(id);
      setNotice('Generated payment cancelled.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not cancel');
    }
  };

  return (
    <>
      <Helmet>
        <title>Payments & Invoices | RV Fitness</title>
      </Helmet>

      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">TRANSACTION RECORDS</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
            PAYMENTS & <span className="text-gym-primary">INVOICES</span>
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 -mt-2">
          <p className="text-xs text-gym-muted">Generate a payment for your next plan. Online card / UPI payment is coming soon; pay at the front desk for now.</p>
          <Button variant="primary" size="sm" onClick={() => setGenerating(true)} disabled={requests.length > 0} leftIcon={<Plus className="w-4 h-4" />} className="shrink-0">
            Generate payment
          </Button>
        </div>

        {notice && <div role="status" className="bg-gym-success/15 border border-gym-success/60 text-gym-success p-3 rounded-xl text-sm">{notice}</div>}

        {payments.length > 0 && <PaymentTotals payments={payments} />}

        {requests.length > 0 && (
          <Card hoverEffect={false} className="flex flex-col gap-3" aria-label="Generated payments">
            <h3 className="font-heading text-white">Generated payments</h3>
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-400/40 bg-amber-400/5 rounded-xl p-3">
                <div>
                  <p className="font-heading text-white">
                    {r.plan_title} · <span className="text-gym-primary">{formatINR(Number(r.price))}</span>
                  </p>
                  <p className="text-xs text-amber-400 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Waiting for gym approval · generated {fmt(r.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:justify-end">
                  <PayOnlineButton amount={Number(r.price)} />
                  <Button variant="ghost" size="sm" onClick={() => cancel(r.id)} className="text-gym-danger">
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <Card hoverEffect={false} className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table ref={paymentsTable} className="table-cards w-full text-left text-sm">
              <thead className="bg-gym-surfaceHover font-heading text-gym-primary">
                <tr>
                  <th className="p-4">Invoice</th>
                  <th className="p-4">Plan</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Invoice</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {loading && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gym-muted">Loading...</td>
                  </tr>
                )}
                {!loading && payments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-gym-muted">
                      No payments yet. Once the gym approves your plan, your invoice appears here.
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="p-4 font-heading text-white">{p.gst_invoice_no || '—'}</td>
                    <td className="p-4">{p.plan_title || 'Membership'}</td>
                    <td className="p-4 text-gym-muted">{fmt(p.paid_at || p.created_at)}</td>
                    <td className="p-4 font-heading text-gym-primary">{formatINR(Number(p.total_amount))}</td>
                    <td className="p-4">
                      {p.status === 'paid' ? (
                        <span className="text-xs font-heading text-gym-success">Paid · {p.payment_mode.toUpperCase()}</span>
                      ) : p.status === 'failed' ? (
                        <span className="flex flex-col">
                          <span className="text-xs font-heading text-gym-muted line-through">Cancelled</span>
                          {p.cancel_reason && <span className="text-[11px] text-gym-muted">Reason: {p.cancel_reason}</span>}
                        </span>
                      ) : Number(p.amount_paid ?? 0) > 0 ? (
                        <span className="text-xs font-heading text-amber-400">Part paid · {formatINR(leftOn(p))} left</span>
                      ) : (
                        <span className="text-xs font-heading text-amber-400">Payment due · pay at the desk</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {p.status === 'paid' ? (
                        <Link to={`/invoice/${p.id}`} className="inline-flex items-center gap-1 text-gym-primary hover:underline text-xs font-heading">
                          <FileText className="w-4 h-4" /> View / PDF
                        </Link>
                      ) : p.status === 'failed' ? (
                        <span className="text-xs text-gym-muted">—</span>
                      ) : (
                        <PayOnlineButton amount={Number(p.total_amount)} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
      <div className="max-w-5xl mx-auto mt-6">{receipts.length > 0 && <ReceiptList receipts={receipts} />}</div>
      <GeneratePaymentModal
        isOpen={generating}
        currentPlanCode={membership?.plan_code ?? null}
        onClose={() => setGenerating(false)}
        onGenerated={(message) => {
          setGenerating(false);
          setNotice(message);
          load().catch((err: Error) => setError(err.message));
        }}
      />
    </>
  );
};
