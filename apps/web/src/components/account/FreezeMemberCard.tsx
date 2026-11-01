import React, { useEffect, useState } from 'react';
import { Snowflake, Sun } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MemberFreeze, freezeMember, listFreezes, unfreezeMember } from '../../services/gym';
import type { UserProfile } from '../../types';

const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const textarea =
  'w-full bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

interface Props {
  member: UserProfile;
  /** Owner and Super Admin can freeze / unfreeze; other staff only see the status. */
  canFreeze: boolean;
  onChanged: (message: string) => void | Promise<void>;
  onError: (message: string) => void;
}

/** Freeze status of a member, with Freeze (reason required) / Unfreeze for the owner. */
export const FreezeMemberCard: React.FC<Props> = ({ member, canFreeze, onChanged, onError }) => {
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [history, setHistory] = useState<MemberFreeze[]>([]);
  const frozen = !!member.frozen_at;

  useEffect(() => {
    listFreezes(member.id).then(setHistory).catch(() => setHistory([]));
  }, [member.id, member.frozen_at]);

  if (!frozen && !canFreeze) return null;

  const doFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 3) return setFormError('Please write the reason for freezing.');
    setBusy(true);
    setFormError('');
    try {
      await freezeMember(member.id, reason);
      setAsking(false);
      setReason('');
      await onChanged(`${member.full_name}'s account is frozen. Their plan days are paused.`);
    } catch (err: any) {
      setFormError(err.message || 'Could not freeze');
    } finally {
      setBusy(false);
    }
  };

  const doUnfreeze = async () => {
    setBusy(true);
    try {
      const r = await unfreezeMember(member.id);
      await onChanged(
        `${member.full_name}'s account is active again.${r.days_added > 0 ? ` ${r.days_added} day${r.days_added === 1 ? '' : 's'} added to their plan.` : ''}`,
      );
    } catch (err: any) {
      onError(err.message || 'Could not unfreeze');
    } finally {
      setBusy(false);
    }
  };

  const past = history.filter((h) => h.unfrozen_at);

  return (
    <Card hoverEffect={false} className={`flex flex-col gap-3 ${frozen ? 'border-sky-400/50' : ''}`} aria-label="Freeze account">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`font-heading flex items-center gap-2 ${frozen ? 'text-sky-300' : 'text-white'}`}>
            <Snowflake className="w-4 h-4" /> {frozen ? `Account frozen since ${fmt(member.frozen_at!)}` : 'Freeze account'}
          </h3>
          {frozen ? (
            <p className="text-sm text-white break-words">
              <span className="text-gym-muted">Reason: </span>
              {member.frozen_reason}
            </p>
          ) : (
            <p className="text-xs text-gym-muted">
              Blocks the member's portal and check-in. Plan days are paused and added back when you unfreeze.
            </p>
          )}
        </div>
        {canFreeze &&
          (frozen ? (
            <Button variant="primary" size="sm" className="shrink-0" isLoading={busy} onClick={doUnfreeze} leftIcon={<Sun className="w-4 h-4" />}>
              Unfreeze
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="shrink-0" onClick={() => setAsking(true)} leftIcon={<Snowflake className="w-4 h-4" />}>
              Freeze account
            </Button>
          ))}
      </div>

      {past.length > 0 && (
        <details className="text-xs text-gym-muted">
          <summary className="cursor-pointer hover:text-white">Freeze history ({past.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {past.map((h) => (
              <li key={h.id}>
                {fmt(h.frozen_at)} – {fmt(h.unfrozen_at!)} · {h.reason}
                {h.days_added ? ` · ${h.days_added} days added` : ''}
              </li>
            ))}
          </ul>
        </details>
      )}

      <Modal isOpen={asking} onClose={() => setAsking(false)} title={`Freeze ${member.full_name}?`}>
        <form onSubmit={doFreeze} className="flex flex-col gap-4">
          <p className="text-sm text-gym-muted">
            They won't be able to use the portal or check in until you unfreeze. Their plan days are paused and added back on unfreeze.
          </p>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-gym-muted">
            Reason (the member sees this)
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Fees pending for 2 months, or medical leave"
              className={textarea}
              maxLength={500}
            />
          </label>
          {formError && <p role="alert" className="text-sm text-gym-danger">{formError}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setAsking(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={busy} leftIcon={<Snowflake className="w-4 h-4" />}>Freeze</Button>
          </div>
        </form>
      </Modal>
    </Card>
  );
};
