import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate } from 'react-router-dom';
import { AlertTriangle, Clock, Globe, LogOut, RefreshCw } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { ProfileDetailsForm } from '../../components/account/ProfileDetailsForm';
import { homePathForRole, useAuth } from '../../context/AuthContext';
import { needsRegistration } from '../../config/roles';
import { submitRegistration } from '../../services/gym';

const CHECK_EVERY_MS = 30_000;

/** First sign-in: the member fills their details, then waits until the gym owner approves them. */
export const Registration: React.FC = () => {
  const { profile, refreshProfile, logout } = useAuth();
  const [editing, setEditing] = useState(false);
  const [checking, setChecking] = useState(false);
  const status = profile?.approval_status;

  // While waiting, look for the owner's decision now and then.
  useEffect(() => {
    if (status !== 'pending') return;
    const timer = window.setInterval(() => void refreshProfile(), CHECK_EVERY_MS);
    return () => window.clearInterval(timer);
  }, [status, refreshProfile]);

  if (!profile) return null;
  if (!needsRegistration(profile)) return <Navigate to={homePathForRole(profile.role)} replace />;

  const checkNow = async () => {
    setChecking(true);
    try {
      await refreshProfile();
    } finally {
      setChecking(false);
    }
  };

  const showForm = status === 'incomplete' || status === 'rejected' || editing;

  return (
    <>
      <Helmet>
        <title>Member Registration | RV Fitness</title>
      </Helmet>

      <div className="min-h-screen bg-gym-bg">
        <header className="border-b border-gym-border bg-gym-surface">
          <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5 min-w-0">
              <BrandLogo className="w-10 h-10" />
              <span className="hidden sm:inline text-lg font-heading font-bold text-white truncate">
                RV <span className="text-gym-primary">FITNESS</span>
              </span>
            </Link>
            <div className="flex items-center gap-1 whitespace-nowrap">
              <Link to="/">
                <Button variant="ghost" size="sm" leftIcon={<Globe className="w-4 h-4" />}>Website</Button>
              </Link>
              <Button variant="ghost" size="sm" className="text-gym-danger" onClick={logout} leftIcon={<LogOut className="w-4 h-4" />}>
                Sign Out
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 flex flex-col gap-6">
          {showForm ? (
            <>
              <div>
                <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">WELCOME, {profile.full_name}</span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
                  MEMBER <span className="text-gym-primary">REGISTRATION</span>
                </h1>
                <p className="text-sm text-gym-muted mt-1">
                  Fill in your details. The gym owner will check them and approve your account, then your dashboard opens.
                </p>
              </div>

              {status === 'rejected' && !editing && (
                <div role="alert" className="bg-gym-danger/10 border border-gym-danger text-gym-danger p-4 rounded-xl text-sm flex gap-2">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-heading">The gym asked you to check your details.</p>
                    {profile.approval_note && <p className="mt-1">“{profile.approval_note}”</p>}
                    <p className="mt-1">Please correct them and send again.</p>
                  </div>
                </div>
              )}

              <ProfileDetailsForm
                target={profile}
                registration
                submitLabel={status === 'pending' ? 'Update & Send Again' : 'Submit for Approval'}
                onSubmit={async (patch) => {
                  await submitRegistration({
                    full_name: patch.full_name ?? '',
                    phone: patch.phone ?? '',
                    dob: patch.dob ?? '',
                    blood_group: patch.blood_group,
                    height_cm: patch.height_cm,
                    weight_kg: patch.weight_kg,
                    medicines: patch.medicines,
                    health_notes: patch.health_notes,
                  });
                }}
                onSaved={async () => {
                  setEditing(false);
                  await refreshProfile();
                }}
              />
            </>
          ) : (
            <Card hoverEffect={false} className="flex flex-col items-center text-center gap-4 py-10">
              <div className="w-16 h-16 rounded-full bg-gym-primary/15 text-gym-primary flex items-center justify-center">
                <Clock className="w-8 h-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-heading text-white uppercase">
                WAITING FOR <span className="text-gym-primary">APPROVAL</span>
              </h1>
              <p className="text-sm text-gym-muted max-w-md">
                Thanks, {profile.full_name}! Your registration has been sent to the gym owner. You'll get access to your dashboard as soon as
                they approve it. This page checks automatically.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button variant="primary" size="sm" isLoading={checking} onClick={checkNow} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Check Status
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  Edit My Details
                </Button>
              </div>
            </Card>
          )}
        </main>
      </div>
    </>
  );
};
