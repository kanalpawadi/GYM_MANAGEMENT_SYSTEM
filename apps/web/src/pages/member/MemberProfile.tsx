import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Card } from '../../components/ui/Card';
import { ProfilePhotoPicker } from '../../components/account/ProfilePhotoPicker';
import { ProfileDetailsForm } from '../../components/account/ProfileDetailsForm';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../config/roles';

export const MemberProfile: React.FC = () => {
  const { profile, refreshProfile } = useAuth();

  return (
    <>
      <Helmet>
        <title>My Profile | RV Fitness</title>
      </Helmet>

      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ACCOUNT SETTINGS</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
            MY <span className="text-gym-primary">PROFILE</span>
          </h1>
        </div>

        <Card hoverEffect={false} className="flex flex-col sm:flex-row items-center gap-6">
          <ProfilePhotoPicker size="xl" />
          <div className="text-center sm:text-left min-w-0">
            <h3 className="text-2xl font-heading text-white break-words">{profile?.full_name}</h3>
            <p className="text-xs text-gym-muted break-all">{profile?.email}</p>
            <p className="text-xs text-gym-primary font-heading mt-1">
              {profile ? ROLE_LABELS[profile.role] : ''}
              {profile?.member_code ? ` · ${profile.member_code}` : ''}
              {profile?.role === 'member' ? ` · ${profile.membership_tier === 'premium' ? 'Premium' : 'Normal'} member` : ''}
            </p>
            <p className="text-xs text-gym-muted mt-1">Tap the camera to add or change your photo. You can crop it before saving.</p>
          </div>
        </Card>

        {profile && <ProfileDetailsForm target={profile} onSaved={refreshProfile} showHealth={false} />}
      </div>
    </>
  );
};
