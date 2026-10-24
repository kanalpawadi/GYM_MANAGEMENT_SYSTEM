import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { usePlans } from '../../content/ContentContext';
import { useGymSettings } from '../../content/useGymSettings';
import { formatINR } from '../../config/site';
import { AssignPlanInput, Membership, applyDiscount, assignMembership, localDay } from '../../services/gym';

type PlanCode = AssignPlanInput['planCode'];

interface Props {
  isOpen: boolean;
  member: { id: string; full_name: string };
  current: Membership | null;
  /** Gym Owner / Super Admin: custom plans and custom amounts. */
  canSetPrice: boolean;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('en-CA');
};

/** Trainers and staff give a member a plan; the owner can also set a custom plan or amount. */
export const ChangePlanModal: React.FC<Props> = ({ isOpen, member, current, canSetPrice, onClose, onSaved }) => {
  const plans = usePlans();
  const { settings } = useGymSettings();
  const today = localDay();
  const currentRunning = current && current.status === 'active' && current.end_date >= today ? current : null;

  const [code, setCode] = useState<PlanCode>('monthly');
  const [start, setStart] = useState(today);
  const [price, setPrice] = useState('');
  const [title, setTitle] = useState('');
  const [length, setLength] = useState('1');
  const [unit, setUnit] = useState<'months' | 'days'>('months');
  const [payment, setPayment] = useState<'cash' | 'upi' | 'due'>('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const standard = plans.find((p) => p.id === code);
  const standardPrice = standard ? applyDiscount(standard.price, settings.discount) : 0;

  // Fresh form each time it opens.
  useEffect(() => {
    if (!isOpen) return;
    setCode('monthly');
    setStart(today);
    setTitle('');
    setLength('1');
    setUnit('months');
    setPayment('cash');
    setNote('');
    setError('');
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPrice(code === 'custom' ? '' : String(standardPrice));
  }, [code, standardPrice]);

  const replaces = !!currentRunning && start <= currentRunning.end_date;

  const save = async () => {
    setError('');
    const amount = price.trim() === '' ? null : Number(price);
    if (code === 'custom' && (amount == null || Number.isNaN(amount) || amount < 0)) return setError('Enter the amount for the custom plan.');
    if (code === 'custom' && !(Number(length) > 0)) return setError('Enter how long the custom plan lasts.');
    setBusy(true);
    try {
      const r = await assignMembership(member.id, {
        planCode: code,
        start,
        payment,
        price: code === 'custom' || (canSetPrice && amount !== standardPrice) ? amount : null,
        title: code === 'custom' ? title.trim() || 'Custom plan' : null,
        months: code === 'custom' && unit === 'months' ? Number(length) : null,
        days: code === 'custom' && unit === 'days' ? Number(length) : null,
        note: note.trim() || null,
      });
      onSaved(
        `${member.full_name}: ${r.title} plan, ${fmt(r.start_date)} – ${fmt(r.end_date)}, ${formatINR(Number(r.price))} ${
          payment === 'due' ? '(payment due)' : `paid by ${payment.toUpperCase()}`
        }.`,
      );
    } catch (err: any) {
      setError(err.message || 'Could not change the plan');
    } finally {
      setBusy(false);
    }
  };

  const choices: { code: PlanCode; label: string; sub: string }[] = [
    ...plans.map((p) => ({ code: p.id as PlanCode, label: p.title, sub: formatINR(applyDiscount(p.price, settings.discount)) })),
    ...(canSetPrice ? [{ code: 'custom' as PlanCode, label: 'Custom plan', sub: 'Your own name, length and amount' }] : []),
  ];

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={`Change plan · ${member.full_name}`}>
      <div className="flex flex-col gap-4 text-sm">
        {currentRunning && (
          <p className="text-xs text-gym-muted">
            Current plan: <span className="text-white">{currentRunning.plan_title}</span> until {fmt(currentRunning.end_date)}.
          </p>
        )}

        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plan">
          {choices.map((c) => (
            <label
              key={c.code}
              className={`flex flex-col gap-0.5 p-3 rounded-xl border cursor-pointer ${c.code === code ? 'border-gym-primary bg-gym-primary/10' : 'border-gym-border hover:border-gym-primary/50'}`}
            >
              <span className="flex items-center gap-2">
                <input type="radio" name="plan" checked={c.code === code} onChange={() => setCode(c.code)} className="accent-gym-primary" aria-label={c.label} />
                <span className="font-heading text-white">{c.label}</span>
              </span>
              <span className="text-[11px] text-gym-muted pl-5">{c.sub}</span>
            </label>
          ))}
        </div>

        {code === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Plan name" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Student monthly" maxLength={60} />
            <div className="flex gap-2 items-end">
              <Input label="Lasts" type="number" min="1" inputMode="numeric" value={length} onChange={(e) => setLength(e.target.value)} />
              <select
                aria-label="Length unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value as 'months' | 'days')}
                className="min-h-[44px] bg-black text-white border border-gym-border rounded-xl px-3 text-sm focus:outline-none focus:border-gym-primary"
              >
                <option value="months">months</option>
                <option value="days">days</option>
              </select>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input label="Starts on" type="date" value={start} min={addDays(today, -31)} onChange={(e) => setStart(e.target.value)} />
          <Input
            label="Amount (₹)"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            readOnly={!canSetPrice}
            helperText={canSetPrice ? (code === 'custom' ? 'Set by the owner' : 'Change it for a custom amount') : 'Standard price (only the owner can change it)'}
          />
        </div>

        {replaces && (
          <p className="text-xs text-amber-400">
            This starts before the current plan ends, so the current {currentRunning!.plan_title} plan will end on {fmt(addDays(start, -1))}.
          </p>
        )}

        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-sm font-medium text-gym-muted mb-1">Payment</legend>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ['cash', 'Paid cash'],
                ['upi', 'Paid UPI'],
                ['due', 'Payment due'],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className={`text-center p-2.5 rounded-xl border cursor-pointer text-xs font-heading ${payment === value ? 'border-gym-primary bg-gym-primary/10 text-gym-primary' : 'border-gym-border text-white'}`}>
                <input type="radio" name="payment" value={value} checked={payment === value} onChange={() => setPayment(value)} className="sr-only" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>

        <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="e.g. Diwali offer, college ID shown" />

        {error && <p role="alert" className="text-gym-danger">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} isLoading={busy}>
            Save plan
          </Button>
        </div>
      </div>
    </Modal>
  );
};
