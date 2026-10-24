import React, { useState } from 'react';
import { CreditCard, Lock, Store } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { usePlans } from '../../content/ContentContext';
import { useGymSettings } from '../../content/useGymSettings';
import { formatINR } from '../../config/site';
import { applyDiscount, requestPlan } from '../../services/gym';

/** Online card/UPI payment needs the gym's Razorpay account; until then the button explains it. */
export const PayOnlineButton: React.FC<{ amount?: number; className?: string }> = ({ amount, className = '' }) => (
  <span className={`inline-flex flex-col items-end gap-0.5 ${className}`}>
    <button
      type="button"
      disabled
      title="Online payment is coming soon. Please pay at the front desk for now."
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gym-border text-gym-muted text-xs font-heading cursor-not-allowed"
    >
      <Lock className="w-3.5 h-3.5" /> Pay {amount != null ? formatINR(amount) : ''} online
    </button>
    <span className="text-[10px] text-gym-muted">Coming soon · pay at the desk</span>
  </span>
);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (message: string) => void;
  /** Current plan code: picking another plan is sent as a plan change. */
  currentPlanCode?: string | null;
}

/** Member creates a bill for a plan; the gym approves it, then it is paid at the desk (or online once Razorpay is connected). */
export const GeneratePaymentModal: React.FC<Props> = ({ isOpen, onClose, onGenerated, currentPlanCode }) => {
  const plans = usePlans();
  const { settings } = useGymSettings();
  const [selected, setSelected] = useState(plans[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const plan = plans.find((p) => p.id === selected) ?? plans[0];
  const price = plan ? applyDiscount(plan.price, settings.discount) : 0;

  const generate = async () => {
    if (!plan) return;
    setBusy(true);
    setError('');
    try {
      const changing = !!currentPlanCode && currentPlanCode !== plan.id;
      await requestPlan(plan.id, 'desk', changing ? 'change' : 'renew');
      onGenerated(`Payment of ${formatINR(price)} generated for the ${plan.title} plan. The gym will approve it, then you can pay at the desk.`);
    } catch (err: any) {
      setError(err.message || 'Could not generate the payment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title="Generate payment">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gym-muted">Choose a plan. A bill is created and sent to the gym for approval.</p>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Plan">
          {plans.map((p) => {
            const amount = applyDiscount(p.price, settings.discount);
            return (
              <label
                key={p.id}
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer ${
                  p.id === plan?.id ? 'border-gym-primary bg-gym-primary/10' : 'border-gym-border hover:border-gym-primary/50'
                }`}
              >
                <span className="flex items-center gap-3">
                  <input type="radio" name="plan" value={p.id} checked={p.id === plan?.id} onChange={() => setSelected(p.id)} className="accent-gym-primary" aria-label={p.title} />
                  <span className="font-heading text-white">{p.title}</span>
                </span>
                <span className="text-right">
                  <span className="font-heading text-gym-primary">{formatINR(amount)}</span>
                  {amount !== p.price && <span className="block text-[11px] text-gym-muted line-through">{formatINR(p.price)}</span>}
                </span>
              </label>
            );
          })}
        </div>

        <div className="rounded-xl border border-gym-border p-3 text-xs text-gym-muted flex flex-col gap-1.5">
          <span className="flex items-center gap-2 text-white">
            <Store className="w-4 h-4 text-gym-primary" /> Pay at the front desk (cash or UPI) after approval.
          </span>
          <span className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Online card / UPI payment: coming soon.
          </span>
        </div>

        {error && <p role="alert" className="text-sm text-gym-danger">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={generate} isLoading={busy} disabled={!plan}>
            Generate {plan ? formatINR(price) : ''} payment
          </Button>
        </div>
      </div>
    </Modal>
  );
};
