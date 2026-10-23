import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../config/site';
import { Payment, listPayments } from '../../services/gym';
import { useCardTable } from '../../utils/useCardTable';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const PaymentHistory: React.FC = () => {
  const paymentsTable = useCardTable();
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!profile) return;
    listPayments(profile.id)
      .then(setPayments)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [profile]);

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
                      ) : (
                        <span className="text-xs font-heading text-amber-400">Payment due · pay at the desk</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {p.status === 'paid' ? (
                        <Link to={`/invoice/${p.id}`} className="inline-flex items-center gap-1 text-gym-primary hover:underline text-xs font-heading">
                          <FileText className="w-4 h-4" /> View / PDF
                        </Link>
                      ) : (
                        <span className="text-xs text-gym-muted">After payment</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
};
