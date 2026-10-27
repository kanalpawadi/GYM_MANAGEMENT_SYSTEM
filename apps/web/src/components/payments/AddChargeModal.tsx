import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { formatINR } from '../../config/site';
import { addCharge } from '../../services/gym';

interface Props {
  isOpen: boolean;
  member: { id: string; full_name: string };
  onClose: () => void;
  onSaved: (message: string) => void;
}

/** Staff add any amount the member must pay later (shows as a due bill). */
export const AddChargeModal: React.FC<Props> = ({ isOpen, member, onClose, onSaved }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setTitle('');
    setAmount('');
    setNote('');
    setError('');
  }, [isOpen]);

  const save = async () => {
    setError('');
    const value = Number(amount);
    if (!title.trim()) return setError('Say what the amount is for.');
    if (!(value > 0)) return setError('Enter the amount due.');
    setBusy(true);
    try {
      await addCharge(member.id, value, title, note.trim() || null);
      onSaved(`${formatINR(value)} added as due for ${member.full_name} (${title.trim()}).`);
    } catch (err: any) {
      setError(err.message || 'Could not add the amount');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => undefined : onClose} title={`Add amount due · ${member.full_name}`}>
      <div className="flex flex-col gap-4 text-sm">
        <p className="text-gym-muted">The member pays it later. Take the money with Record payment received; part payments are fine.</p>
        <Input label="What for" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Locker (Nov), Personal training" maxLength={120} />
        <Input label="Amount due (₹)" type="number" min="1" step="1" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder="Optional" />
        {error && <p role="alert" className="text-gym-danger">{error}</p>}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={save} isLoading={busy}>
            Add amount due
          </Button>
        </div>
      </div>
    </Modal>
  );
};
