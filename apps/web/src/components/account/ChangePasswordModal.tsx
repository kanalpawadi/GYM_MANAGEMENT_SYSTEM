import React, { useState } from 'react';
import { Lock, CheckCircle2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';

// Shared by the member portal, trainer panel and admin panel.
export const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const close = () => {
    setPassword('');
    setConfirm('');
    setError('');
    setDone(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) return setError(result.error);
    setDone(true);
  };

  return (
    <Modal isOpen={isOpen} onClose={close} title="CHANGE PASSWORD">
      {done ? (
        <div className="bg-gym-success/20 border border-gym-success/40 text-gym-success p-6 rounded-xl text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 mx-auto" />
          <h4 className="font-heading text-xl uppercase">PASSWORD UPDATED</h4>
          <Button variant="outline" size="sm" onClick={close}>Close</Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="New Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-gym-primary" />}
            helperText="At least 8 characters"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            leftIcon={<Lock className="w-4 h-4 text-gym-primary" />}
            required
          />
          {error && <span className="text-xs text-gym-danger font-medium">{error}</span>}
          <Button type="submit" variant="primary" isLoading={submitting}>Update Password</Button>
        </form>
      )}
    </Modal>
  );
};
