import React, { useEffect, useState } from 'react';
import { CheckCircle2, HeartPulse, Pill, Ruler, User } from 'lucide-react';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { ProfilePatch, ageFromDob, updateProfile } from '../../services/gym';
import type { UserProfile } from '../../types';

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const PHONE = /^[6-9]\d{9}$/;
const textarea =
  'w-full bg-black text-white placeholder-gym-muted/70 border border-gym-border rounded-xl p-3 text-sm font-body focus:outline-none focus:border-gym-primary';

interface Props {
  target: UserProfile;
  onSaved?: () => void | Promise<void>;
}

/** Personal and health details. Used by members (own profile) and by staff/trainers (role chain). */
export const ProfileDetailsForm: React.FC<Props> = ({ target, onSaved }) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [medicines, setMedicines] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setFullName(target.full_name ?? '');
    setPhone(target.phone ?? '');
    setDob(target.dob ?? '');
    setBloodGroup(target.blood_group ?? '');
    setHeight(target.height_cm != null ? String(target.height_cm) : '');
    setWeight(target.weight_kg != null ? String(target.weight_kg) : '');
    setMedicines(target.medicines ?? '');
    setHealthNotes(target.health_notes ?? '');
  }, [target.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const age = ageFromDob(dob);
  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved('');
    if (!fullName.trim()) return setError('Please enter the full name.');
    if (phone && !PHONE.test(phone.trim())) return setError('Enter a valid 10-digit Indian mobile number.');
    if (dob && (age == null || age < 5)) return setError('Please check the date of birth.');
    const h = num(height);
    const w = num(weight);
    if (h != null && (h < 50 || h > 250)) return setError('Height should be between 50 and 250 cm.');
    if (w != null && (w < 20 || w > 300)) return setError('Weight should be between 20 and 300 kg.');
    const patch: ProfilePatch = {
      full_name: fullName.trim(),
      phone: phone.trim() || undefined,
      dob: dob || null,
      blood_group: bloodGroup || null,
      height_cm: h,
      weight_kg: w,
      medicines: medicines.trim() || null,
      health_notes: healthNotes.trim() || null,
    };
    setSaving(true);
    try {
      await updateProfile(target.id, patch);
      await onSaved?.();
      setSaved('Details saved.');
      setTimeout(() => setSaved(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6" aria-label="Profile details">
      {saved && (
        <div role="status" className="bg-gym-success/20 border border-gym-success text-gym-success p-3 rounded-xl flex items-center gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4" /> {saved}
        </div>
      )}
      {error && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{error}</div>}

      <Card hoverEffect={false} className="space-y-4">
        <h3 className="text-lg font-heading text-white flex items-center gap-2">
          <User className="w-5 h-5 text-gym-primary" /> Personal details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          <Input label="Contact Number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit mobile" />
          <Input label="Date of Birth" type="date" value={dob} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDob(e.target.value)} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gym-muted">Age</span>
            <span className="min-h-[44px] flex items-center px-4 rounded-xl border border-gym-border bg-black/40 text-white text-sm" aria-label="Age">
              {age != null ? `${age} years` : 'Add date of birth'}
            </span>
          </div>
        </div>
      </Card>

      <Card hoverEffect={false} className="space-y-4">
        <h3 className="text-lg font-heading text-white flex items-center gap-2">
          <Ruler className="w-5 h-5 text-gym-primary" /> Body & blood group
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Blood Group"
            value={bloodGroup}
            onChange={(e) => setBloodGroup(e.target.value)}
            options={[{ label: 'Select', value: '' }, ...BLOOD_GROUPS.map((b) => ({ label: b, value: b }))]}
          />
          <Input label="Height (cm)" type="number" step="0.1" value={height} onChange={(e) => setHeight(e.target.value)} />
          <Input label="Weight (kg)" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </div>
      </Card>

      <Card hoverEffect={false} className="space-y-4">
        <h3 className="text-lg font-heading text-white flex items-center gap-2">
          <Pill className="w-5 h-5 text-gym-primary" /> Medicines & health
        </h3>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gym-muted">
          Medicines currently taking
          <textarea rows={2} value={medicines} onChange={(e) => setMedicines(e.target.value)} placeholder="e.g. Thyroxine 50mcg daily, or 'None'" className={textarea} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-gym-muted">
          <span className="flex items-center gap-1.5">
            <HeartPulse className="w-4 h-4 text-gym-primary" /> Injuries / health notes for the trainer
          </span>
          <textarea rows={3} value={healthNotes} onChange={(e) => setHealthNotes(e.target.value)} placeholder="Injuries, surgeries, conditions..." className={textarea} />
        </label>
      </Card>

      <Button type="submit" variant="primary" isLoading={saving}>Save Details</Button>
    </form>
  );
};
