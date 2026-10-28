import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { formatINR } from '../../config/site';
import { Payment, cancelPayment } from '../../services/gym';

const REASONS = ['Same amount entered twice', 'Wrong member', 'Wrong amount', 'Entered by mistake'];
const textarea =
  'w-full bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-danger';

interface Props {
  payment: Payment | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

/** Owner / Super Admin delete a payment entry; the reason is saved with it. */
export const DeletePaymentModal: React.FC<Props> = ({ payment, onClose, onDeleted }) => {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setReason('');
    setError('');
  }, [payment?.id]);

  if (!payment) return null;
  const amount = formatINR(Number(payment.total_amount));

  const confirm = async () => {
    setError('');
    if (reason.trim().length < 3) return setError('Please write why this payment is being deleted.');
    setBusy(true);
    try {
      await cancelPayment(payment.id, reason);
      onDeleted(`${payment.plan_title || 'Payment'} of ${amount} deleted. Reason: ${reason.trim()}`);
    } catch (err: any) {
      setError(err.message || 'Could not delete this payment');
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => undefined : onClose} title="Delete payment entry">
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex gap-3 bg-gym-danger/10 border border-gym-danger/60 rounded-xl p-3 text-gym-danger">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>
            <strong>
              {payment.plan_title || 'Payment'} · {amount}
            </strong>
            {payment.gst_invoice_no ? ` (${payment.gst_invoice_no})` : ''} will be removed from the totals. Its receipts are marked void. The entry stays in the records as
            “Cancelled” with your reason.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Common reasons">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`text-xs px-2.5 py-1.5 rounded-full border ${reason === r ? 'border-gym-danger text-gym-danger' : 'border-gym-border text-gym-muted hover:text-white'}`}
            >
              {r}
            </button>
          ))}
        </div>
        <label className="flex flex-col gap-1.5 font-medium text-gym-muted">
          Reason for deleting (required)
          <textarea rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} className={textarea} placeholder="e.g. Same ₹2,500 cash payment was entered twice" />
        </label>
        {error && (
          <p role="alert" className="text-gym-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Keep it
          </Button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || reason.trim().length < 3}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-gym-danger text-white font-heading text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" /> {busy ? 'Deleting…' : 'Delete payment'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
