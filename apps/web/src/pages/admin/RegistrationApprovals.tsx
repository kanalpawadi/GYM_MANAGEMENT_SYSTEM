import React, { useEffect, useState } from 'react';
import { CheckCircle2, UserCheck, XCircle } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Avatar } from '../../components/account/Avatar';
import { phoneDisplay } from '../../config/site';
import { ageFromDob, decideRegistration, listPendingRegistrations } from '../../services/gym';
import type { UserProfile } from '../../types';

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

/** Owner / Super Admin approve new members before they can open their dashboard. */
export const RegistrationApprovals: React.FC<{ onCountChange?: (n: number) => void }> = ({ onCountChange }) => {
  const [pending, setPending] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = () =>
    listPendingRegistrations().then((rows) => {
      setPending(rows);
      onCountChange?.(rows.length);
    });

  useEffect(() => {
    load()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const decide = async (m: UserProfile, approve: boolean) => {
    const note = notes[m.id]?.trim();
    if (!approve && !note) {
      setError(`Please write a note telling ${m.full_name} what to fix.`);
      return;
    }
    setBusy(m.id);
    setError('');
    try {
      await decideRegistration(m.id, approve, note || undefined);
      setNotice(approve ? `${m.full_name} is approved and can now use their dashboard.` : `${m.full_name} was asked to fix their details.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update the registration');
    } finally {
      setBusy('');
    }
  };

  return (
    <section className="flex flex-col gap-4" aria-label="New member registrations">
      <h2 className="text-xl font-heading text-white flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-gym-primary" /> New member registrations
        <span className="text-xs bg-gym-primary/20 text-gym-primary border border-gym-primary/40 rounded px-2 py-0.5">{pending.length}</span>
      </h2>

      {notice && (
        <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl text-sm flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {notice}
        </div>
      )}
      {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}
      {loading && <p className="text-sm text-gym-muted">Loading registrations...</p>}
      {!loading && pending.length === 0 && !error && (
        <Card hoverEffect={false}>
          <p className="text-sm text-gym-muted">No new members waiting for approval.</p>
        </Card>
      )}

      {pending.map((m) => {
        const age = ageFromDob(m.dob);
        const facts: [string, React.ReactNode][] = [
          ['Mobile', m.phone ? phoneDisplay(m.phone) : '—'],
          ['Email', m.email],
          ['Date of birth', m.dob ? `${fmt(m.dob)}${age != null ? ` (${age} yrs)` : ''}` : '—'],
          ['Blood group', m.blood_group || '—'],
          ['Height / Weight', `${m.height_cm ?? '—'} cm / ${m.weight_kg ?? '—'} kg`],
          ['Medicines', m.medicines || '—'],
          ['Health notes', m.health_notes || '—'],
        ];
        return (
          <Card key={m.id} hoverEffect={false} className="flex flex-col gap-4" aria-label={`Registration from ${m.full_name}`}>
            <div className="flex items-center gap-3 min-w-0">
              <Avatar src={m.avatar_url} name={m.full_name} size="md" zoomable />
              <div className="min-w-0">
                <p className="font-heading text-white break-words">{m.full_name}</p>
                <p className="text-xs text-gym-muted">
                  {m.member_code} · registered {fmt(m.registration_submitted_at)}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {facts.map(([label, value]) => (
                <div key={label} className="flex gap-2 min-w-0">
                  <dt className="text-gym-muted shrink-0">{label}:</dt>
                  <dd className="text-white break-words min-w-0">{value}</dd>
                </div>
              ))}
            </dl>
            <input
              aria-label={`Note for ${m.full_name}`}
              placeholder="Note to the member (needed when asking for changes)"
              value={notes[m.id] ?? ''}
              onChange={(e) => setNotes((n) => ({ ...n, [m.id]: e.target.value }))}
              className="w-full bg-black text-white border border-gym-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-gym-primary"
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" size="sm" isLoading={busy === m.id} onClick={() => decide(m, true)} leftIcon={<CheckCircle2 className="w-4 h-4" />}>
                Approve Member
              </Button>
              <Button variant="ghost" size="sm" className="text-gym-danger" isLoading={busy === m.id} onClick={() => decide(m, false)} leftIcon={<XCircle className="w-4 h-4" />}>
                Ask to Fix Details
              </Button>
            </div>
          </Card>
        );
      })}
    </section>
  );
};
