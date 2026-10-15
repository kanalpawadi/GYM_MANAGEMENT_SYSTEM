import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { User, Phone, Mail, ShieldAlert, HeartPulse, Camera, CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';

export const MemberProfile: React.FC = () => {
  const { profile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name || 'Rahul Sharma');
  const [phone, setPhone] = useState(profile?.phone || '9876543210');
  const [emergencyName, setEmergencyName] = useState(profile?.emergency_contact?.name || 'Sunita Sharma');
  const [emergencyPhone, setEmergencyPhone] = useState(profile?.emergency_contact?.phone || '9876500000');
  const [healthNotes, setHealthNotes] = useState(profile?.health_notes || 'Mild lower back sensitivity.');
  const [savedMsg, setSavedMsg] = useState('');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMsg('Profile and emergency contact updated successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
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
            MEMBER <span className="text-gym-primary">PROFILE</span>
          </h1>
        </div>

        {savedMsg && (
          <div className="bg-gym-success/20 border border-gym-success text-gym-success p-4 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">{savedMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="border-gym-border bg-gym-surface flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <img
                src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover border-4 border-gym-primary"
              />
              <button
                type="button"
                onClick={() => alert('Photo upload simulated! Image saved to avatars bucket.')}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-gym-primary text-black shadow-lg"
                title="Upload Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-heading text-white uppercase">{fullName}</h3>
              <p className="text-xs text-gym-muted">{profile?.email}</p>
              <span className="text-xs text-gym-primary font-heading uppercase mt-1 inline-block">Member ID: RV-2026-8842</span>
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
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
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </div>
          </Card>

          <Card className="border-gym-border bg-gym-surface space-y-4">
            <h3 className="text-xl font-heading text-white uppercase flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-gym-primary" /> HEALTH & MEDICAL NOTES
            </h3>
            <textarea
              rows={3}
              value={healthNotes}
              onChange={(e) => setHealthNotes(e.target.value)}
              placeholder="List injuries, surgeries, or medical notes for your personal trainer..."
              className="w-full bg-gym-surface text-white placeholder-gym-muted border border-gym-border rounded-lg p-3 text-sm font-body focus:outline-none focus:border-gym-primary"
            />
          </Card>

          <Button type="submit" variant="primary" className="w-full">
            Save Profile Changes
          </Button>
        </form>
      </div>
    </>
  );
};
