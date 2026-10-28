import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { formatINR } from '../../config/site';
import { Expense, Payment, addExpense, listExpenses, listPayments, localDay, markPaymentPaid, payerName } from '../../services/gym';
import { useCardTable } from '../../utils/useCardTable';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

export const AdminFinancials: React.FC = () => {
  const paymentsTable = useCardTable();
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filter, setFilter] = useState<'all' | 'due' | 'paid'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showExpense, setShowExpense] = useState(false);
  const [exp, setExp] = useState({ title: '', category: 'Maintenance', amount: '', payment_date: localDay(), notes: '' });
  const [saving, setSaving] = useState(false);

  const load = () => Promise.all([listPayments(), listExpenses()]).then(([p, e]) => {
    setPayments(p);
    setExpenses(e);
  });

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const month = localDay().slice(0, 7);
  const totals = useMemo(() => {
    const paidThisMonth = payments.filter((p) => p.status === 'paid' && localDay(p.paid_at || p.created_at).startsWith(month));
    return {
      income: paidThisMonth.reduce((s, p) => s + Number(p.total_amount), 0),
      due: payments.filter((p) => p.status === 'pending').reduce((s, p) => s + Number(p.total_amount), 0),
      expenses: expenses.filter((e) => e.payment_date.startsWith(month)).reduce((s, e) => s + Number(e.amount), 0),
    };
  }, [payments, expenses, month]);

  const shown = payments.filter((p) => filter === 'all' || (filter === 'due' ? p.status === 'pending' : p.status === 'paid'));

  const markPaid = async (p: Payment, mode: Payment['payment_mode']) => {
    try {
      await markPaymentPaid(p.id, mode);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update payment');
    }
  };

  const saveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const amount = Number(exp.amount);
    if (!exp.title.trim() || !(amount > 0)) return setError('Enter a title and an amount.');
    setSaving(true);
    try {
      await addExpense({ title: exp.title.trim(), category: exp.category.trim() || 'Other', amount, payment_date: exp.payment_date, notes: exp.notes.trim() || null }, profile.id);
      setShowExpense(false);
      setExp({ title: '', category: 'Maintenance', amount: '', payment_date: localDay(), notes: '' });
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Financials | RV Fitness Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">BILLING & EXPENSES</span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl break-words font-heading text-white uppercase tracking-wide mt-1">
              FINANCIAL <span className="text-gym-primary">LEDGER</span>
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowExpense(true)} leftIcon={<Plus className="w-4 h-4" />}>Record Expense</Button>
          </div>
        </div>
        <p className="text-xs text-gym-muted -mt-3">Membership payments are created when you approve a plan request (Requests page).</p>

        {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            ['Income this month', totals.income, 'text-gym-success'],
            ['Payments due', totals.due, 'text-amber-400'],
            ['Expenses this month', totals.expenses, 'text-gym-danger'],
          ].map(([label, value, color]) => (
            <Card key={label as string} hoverEffect={false}>
              <span className="text-xs font-heading text-gym-muted uppercase">{label}</span>
              <p className={`text-2xl font-heading mt-1 ${color}`}>{loading ? '—' : formatINR(value as number)}</p>
            </Card>
          ))}
        </div>

        <Card hoverEffect={false} className="p-0 overflow-hidden" aria-label="Payments">
          <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gym-border">
            <h3 className="font-heading text-white">Membership payments</h3>
            <div className="flex rounded-xl border border-gym-border overflow-hidden w-fit">
              {(['all', 'due', 'paid'] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} aria-pressed={filter === f} className={`px-3 py-1.5 text-xs font-heading capitalize ${filter === f ? 'bg-gold-gradient text-black' : 'text-gym-muted'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table ref={paymentsTable} className="table-cards w-full text-left text-sm">
              <thead className="bg-gym-surfaceHover font-heading text-gym-primary">
                <tr>
                  <th className="p-3">Member</th>
                  <th className="p-3">Invoice</th>
                  <th className="p-3">Plan</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gym-border">
                {!loading && shown.length === 0 && (
                  <tr><td colSpan={6} className="p-5 text-center text-gym-muted">No payments.</td></tr>
                )}
                {shown.map((p) => (
                  <tr key={p.id}>
                    <td className="p-3">
                      {p.member_id ? (
                        <Link to={`/admin/members/${p.member_id}`} className="text-white hover:text-gym-primary">{payerName(p)}</Link>
                      ) : (
                        <span className="text-gym-muted italic">{payerName(p)}</span>
                      )}
                    </td>
                    <td className="p-3 text-gym-muted">{p.gst_invoice_no || '—'}</td>
                    <td className="p-3">{p.plan_title}</td>
                    <td className="p-3 text-gym-muted">{fmt(p.paid_at || p.created_at)}</td>
                    <td className="p-3 font-heading text-gym-primary">{formatINR(Number(p.total_amount))}</td>
                    <td className="p-3 text-right">
                      {p.status === 'paid' ? (
                        <Link to={`/invoice/${p.id}`} className="inline-flex items-center gap-1 text-xs text-gym-success hover:underline">
                          <FileText className="w-4 h-4" /> Paid · {p.payment_mode.toUpperCase()}
                        </Link>
                      ) : p.status === 'failed' ? (
                        <span className="text-xs text-gym-muted line-through">Cancelled</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="outline" size="sm" onClick={() => markPaid(p, 'cash')}>Paid Cash</Button>
                          <Button variant="outline" size="sm" onClick={() => markPaid(p, 'upi')}>Paid UPI</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card hoverEffect={false} className="flex flex-col gap-2" aria-label="Expenses">
          <h3 className="font-heading text-white">Expenses</h3>
          {expenses.length === 0 ? (
            <p className="text-sm text-gym-muted">{loading ? 'Loading...' : 'No expenses recorded.'}</p>
          ) : (
            <ul className="divide-y divide-gym-border text-sm">
              {expenses.map((e) => (
                <li key={e.id} className="py-2 flex justify-between gap-2">
                  <span>
                    <span className="text-white">{e.title}</span>
                    <span className="block text-xs text-gym-muted">{e.category} · {fmt(e.payment_date)}</span>
                  </span>
                  <span className="text-gym-danger font-heading">{formatINR(Number(e.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Modal isOpen={showExpense} onClose={() => setShowExpense(false)} title="RECORD EXPENSE">
          <form onSubmit={saveExpense} className="flex flex-col gap-3">
            <Input label="What was it for?" value={exp.title} onChange={(e) => setExp({ ...exp, title: e.target.value })} required />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Category" value={exp.category} onChange={(e) => setExp({ ...exp, category: e.target.value })} />
              <Input label="Amount (₹)" type="number" min="1" value={exp.amount} onChange={(e) => setExp({ ...exp, amount: e.target.value })} required />
            </div>
            <Input label="Date" type="date" value={exp.payment_date} onChange={(e) => setExp({ ...exp, payment_date: e.target.value })} />
            <Input label="Notes (optional)" value={exp.notes} onChange={(e) => setExp({ ...exp, notes: e.target.value })} />
            <Button type="submit" variant="primary" isLoading={saving}>Save Expense</Button>
          </form>
        </Modal>
      </div>
    </>
  );
};
