import React, { useEffect, useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { deleteMember } from '../../services/gym';
import type { UserProfile } from '../../types';

interface Props {
  member: Pick<UserProfile, 'id' | 'full_name' | 'member_code'> | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

/** Permanent delete with a typed-name confirmation, because it cannot be undone. */
export const DeleteMemberModal: React.FC<Props> = ({ member, onClose, onDeleted }) => {
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTyped('');
    setError('');
  }, [member?.id]);

  if (!member) return null;
  const matches = typed.trim().toLowerCase() === member.full_name.trim().toLowerCase();

  const confirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError('');
    try {
      const r = await deleteMember(member.id);
      onDeleted(
        `${member.full_name} was deleted.${r.payments_kept ? ` ${r.payments_kept} payment record${r.payments_kept === 1 ? ' was' : 's were'} kept for the accounts as "Deleted member".` : ''}`,
      );
    } catch (err: any) {
      setError(err.message || 'Could not delete this member');
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={busy ? () => undefined : onClose} title="Delete member permanently">
      <div className="flex flex-col gap-4 text-sm">
        <div className="flex gap-3 bg-gym-danger/10 border border-gym-danger/60 rounded-xl p-3 text-gym-danger">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <p>
            This deletes <strong>{member.full_name}</strong>
            {member.member_code ? ` (${member.member_code})` : ''} and cannot be undone.
          </p>
        </div>
        <div>
          <p className="text-white font-heading mb-1">Deleted for ever:</p>
          <ul className="list-disc pl-5 text-gym-muted space-y-0.5">
            <li>their login, profile and health details</li>
            <li>memberships, plan requests and attendance</li>
            <li>diet and workout plans, body metrics and water logs</li>
            <li>profile photo, progress photos and attendance selfies</li>
            <li>chats and notifications</li>
          </ul>
        </div>
        <p className="text-gym-muted">
          <span className="text-white font-heading">Kept:</span> payments and invoices, labelled “Deleted member”, so your accounts and GST records stay
          correct.
        </p>
        <label className="flex flex-col gap-1.5 font-medium text-gym-muted">
          Type <span className="text-white">{member.full_name}</span> to confirm
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            aria-label="Type the member's name to confirm"
            className="w-full min-h-[44px] bg-black text-white border border-gym-border rounded-xl px-4 text-sm focus:outline-none focus:border-gym-danger"
          />
        </label>
        {error && (
          <p role="alert" className="text-gym-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={confirm}
            disabled={!matches || busy}
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-gym-danger text-white font-heading text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" /> {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
