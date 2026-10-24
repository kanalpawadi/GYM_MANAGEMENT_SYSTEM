import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatINR } from '../../config/site';
import { Payment, recordPayment } from '../../services/gym';
import { leftOn } from './PaymentSummary';

interface Props {
  isOpen: boolean;
  member: { id: string; full_name: string };
  payments: Payment[];
  onClose: () => void;
  onSaved: (message: string, receiptId: string) => void;
}

const OTHER = 'other';

/** Front desk records money received: towards a due bill (part or full) or as a separate payment. */
export const RecordPaymentModal: React.FC<Props> = ({ isOpen, member, payments, onClose, onSaved }) => {
  const dueBills = payments.filter((p) => p.status === 'pending' && leftOn(p) > 0);
  const [billId, setBillId] = useState<string>(OTHER);
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState<'cash' | 'upi'>('cash');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const bill = dueBills.find((p) => p.id === billId) ?? null;
  const left = bill ? leftOn(bill) : null;

  useEffect(() => {
    if (!isOpen) return;
    const first = dueBills[0];
    setBillId(first ? first.id : OTHER);
    setAmount(first ? String(leftOn(first)) : '');
    setMode('cash');
    setTitle('');
    setNote('');
    setError('');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickBill = (id: string) => {
    setBillId(id);
    const b = dueBills.find((p) => p.id === id);
    setAmount(b ? String(leftOn(b)) : '');
  };

  const save = async () => {
    setError('');
    const value = Number(amount);
    if (!(value > 0)) return setError('Enter the amount received.');
    if (left != null && value > left) return setError(`Only ${formatINR(left)} is left on this bill. Record the extra as a separate payment.`);
    setBusy(true);
    try {
      const r = await recordPayment({
        paymentId: bill?.id ?? null,
        memberId: member.id,
        amount: value,
        mode,
        note: note.trim() || null,
        title: bill ? null : title.trim() || 'Other payment',
      });
      const rest = Number(r.remaining);
      onSaved(
        `${formatINR(value)} received from ${member.full_name} (${mode.toUpperCase()}). Receipt ${r.receipt_no}.${bill ? (rest > 0 ? ` ${formatINR(rest)} still due on this bill.` : ' Bill fully paid.') : ''}`,
        r.receipt_id,
      );
    } catch (err: any) {
      setError(err.message || 'Could not record the payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={`Record payment · ${member.full_name}`}>
      <div className="flex flex-col gap-4 text-sm">
        <label className="flex flex-col gap-1.5 font-medium text-gym-muted">
          Money is for
          <select
            value={billId}
            onChange={(e) => pickBill(e.target.value)}
            className="w-full min-h-[44px] bg-black text-white border border-gym-border rounded-xl px-3 text-sm focus:outline-none focus:border-gym-primary"
          >
            {dueBills.map((p) => (
              <option key={p.id} value={p.id}>
                {p.plan_title || 'Membership'} bill · {formatINR(leftOn(p))} left of {formatINR(Number(p.total_amount))}
              </option>
            ))}
            <option value={OTHER}>Something else (e.g. personal training, locker)</option>
          </select>
        </label>

        {!bill && <Input label="What for" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Personal training, Locker" maxLength={60} />}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Amount received (₹)"
            type="number"
            min="1"
            step="1"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            helperText={left != null ? `Up to ${formatINR(left)}. Less than that is a part payment.` : undefined}
          />
          <fieldset className="flex flex-col gap-1.5">
            <legend className="text-sm font-medium text-gym-muted mb-1">Paid by</legend>
            <div className="grid grid-cols-2 gap-2">
              {(['cash', 'upi'] as const).map((m) => (
                <label
                  key={m}
                  className={`text-center min-h-[44px] flex items-center justify-center rounded-xl border cursor-pointer text-xs font-heading ${mode === m ? 'border-gym-primary bg-gym-primary/10 text-gym-primary' : 'border-gym-border text-white'}`}
                >
                  <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
                  {m === 'cash' ? 'Cash' : 'UPI'}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="e.g. Paid by brother, UPI ref 4521" />

        {error && <p role="alert" className="text-gym-danger">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} isLoading={busy}>
            Save & make receipt
          </Button>
        </div>
      </div>
    </Modal>
  );
};
