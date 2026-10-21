import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { User, ShieldAlert, HeartPulse, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ProfilePhotoPicker } from '../../components/account/ProfilePhotoPicker';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../config/roles';
import { updateMyProfile } from '../../services/portal';

export const MemberProfile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [healthNotes, setHealthNotes] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Fill the form from the saved profile (once it has loaded).
  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setEmergencyName(profile.emergency_contact?.name ?? '');
    setEmergencyPhone(profile.emergency_contact?.phone ?? '');
    setEmergencyRelation(profile.emergency_contact?.relation ?? '');
    setHealthNotes(profile.health_notes ?? '');
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavedMsg('');
    setErrorMsg('');
    if (phone && !/^[6-9]\d{9}$/.test(phone.trim())) return setErrorMsg('Enter a valid 10-digit Indian mobile number.');
    if (emergencyPhone && !/^[6-9]\d{9}$/.test(emergencyPhone.trim())) return setErrorMsg('Enter a valid 10-digit emergency contact number.');
    setSaving(true);
    try {
      await updateMyProfile(profile.id, {
        full_name: fullName.trim(),
        phone: phone.trim() || undefined,
        emergency_contact: { name: emergencyName.trim(), phone: emergencyPhone.trim(), relation: emergencyRelation.trim() },
        health_notes: healthNotes.trim(),
      });
      await refreshProfile();
      setSavedMsg('Profile and emergency contact saved.');
      setTimeout(() => setSavedMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save your profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>My Profile & Health Notes | RV Fitness</title>
      </Helmet>

      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ACCOUNT SETTINGS</span>
          <h1 className="text-4xl font-heading text-white uppercase tracking-wide mt-1">
            MY <span className="text-gym-primary">PROFILE</span>
          </h1>
        </div>

        {savedMsg && (
          <div className="bg-gym-success/20 border border-gym-success text-gym-success p-4 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{savedMsg}</span>
          </div>
        )}

        {errorMsg && <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-3 rounded-xl text-sm">{errorMsg}</div>}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-gym-border bg-gym-surface flex flex-col sm:flex-row items-center gap-6">
            <ProfilePhotoPicker size="xl" />
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-heading text-white uppercase">{fullName}</h3>
              <p className="text-xs text-gym-muted">{profile?.email}</p>
              <span className="text-xs text-gym-primary font-heading uppercase mt-1 inline-block">{profile ? ROLE_LABELS[profile.role] : ''}</span>
              <p className="text-xs text-gym-muted mt-1">Tap the camera to add or change your photo. Your trainer sees this photo.</p>
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface space-y-4">
            <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
              <User className="w-5 h-5 text-gym-primary" /> PERSONAL DETAILS
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Mobile Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface space-y-4">
            <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gym-primary" /> EMERGENCY CONTACT
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Person Name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
              <Input
                label="Contact Phone Number"
                type="tel"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
              <Input
                label="Relation"
                placeholder="e.g. Mother, Spouse"
                value={emergencyRelation}
                onChange={(e) => setEmergencyRelation(e.target.value)}
              />
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface space-y-4">
            <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-gym-primary" /> HEALTH & MEDICAL NOTES
            </h3>
            <textarea
              aria-label="Health and medical notes"
              rows={3}
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder="List injuries, surgeries, or medical notes for your personal trainer..."
              className="w-full bg-gym-surface text-white placeholder-gym-muted border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary"
            />
          </Card>

          <Button type="submit" variant="primary" className="w-full" isLoading={saving}>
            Save Profile Changes
          </Button>
        </form>
      </div>
    </>
  );
};
