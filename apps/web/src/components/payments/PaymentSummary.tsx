import React from 'react';
import { Link } from 'react-router-dom';
import { ReceiptText } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatINR } from '../../config/site';
import { Payment, Receipt, paymentTotals } from '../../services/gym';

/** Total billed, total paid and remaining for one member. */
export const PaymentTotals: React.FC<{ payments: Payment[] }> = ({ payments }) => {
  const t = paymentTotals(payments);
  const boxes: [string, number, string][] = [
    ['Total billed', t.billed, 'text-white'],
    ['Total paid', t.paid, 'text-gym-success'],
    ['Remaining', t.remaining, t.remaining > 0 ? 'text-amber-400' : 'text-gym-muted'],
  ];
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="Payment totals">
      {boxes.map(([label, value, color]) => (
        <Card key={label} hoverEffect={false} className="p-3 sm:p-4 flex flex-col gap-1">
          <span className="text-[10px] sm:text-xs text-gym-muted uppercase font-heading">{label}</span>
          <span className={`text-base sm:text-2xl font-heading ${color}`}>{formatINR(value)}</span>
        </Card>
      ))}
    </div>
  );
};

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

/** Every amount received, newest first, each with its printable receipt. */
export const ReceiptList: React.FC<{ receipts: Receipt[] }> = ({ receipts }) => (
  <Card hoverEffect={false} className="flex flex-col gap-2" aria-label="Money received">
    <h3 className="font-heading text-white">Money received</h3>
    {receipts.length === 0 ? (
      <p className="text-sm text-gym-muted">No money received yet.</p>
    ) : (
      <ul className="divide-y divide-gym-border">
        {receipts.map((r) => (
          <li key={r.id} className={`py-2.5 flex items-start justify-between gap-3 ${r.voided_at ? 'opacity-60' : ''}`}>
            <div className="min-w-0">
              <p className={`text-white font-heading ${r.voided_at ? 'line-through' : ''}`}>
                {formatINR(Number(r.amount))} <span className="text-xs text-gym-muted font-body">· {r.payment_mode.toUpperCase()}</span>
              </p>
              <p className="text-xs text-gym-muted">
                {when(r.received_at)} · {r.payment?.plan_title ?? 'Payment'}
                {r.payment?.status === 'failed' ? ' · bill cancelled' : ''}
                {r.staff?.full_name ? ` · by ${r.staff.full_name}` : ''}
              </p>
              {r.note && <p className="text-xs text-gray-300 break-words">Note: {r.note}</p>}
              {r.voided_at && <p className="text-xs text-gym-danger break-words">Deleted{r.void_reason ? `: ${r.void_reason}` : ''}</p>}
            </div>
            <Link to={`/receipt/${r.id}`} className="inline-flex items-center gap-1 text-xs text-gym-primary hover:underline shrink-0" aria-label={`Receipt ${r.receipt_no}`}>
              <ReceiptText className="w-4 h-4" /> {r.receipt_no}
            </Link>
          </li>
        ))}
      </ul>
    )}
  </Card>
);

/** "₹500 left" text for a bill that is partly paid. */
export const leftOn = (p: Pick<Payment, 'status' | 'total_amount' | 'amount_paid'>) =>
  p.status === 'paid' ? 0 : Math.max(Number(p.total_amount) - Number(p.amount_paid ?? 0), 0);
