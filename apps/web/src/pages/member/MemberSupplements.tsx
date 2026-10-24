import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../context/AuthContext';
import { SupplementLog } from '../../components/supplements/SupplementLog';

export const MemberSupplements: React.FC = () => {
  const { profile } = useAuth();
  return (
    <>
      <Helmet>
        <title>Supplements | RV Fitness</title>
      </Helmet>
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">NUTRITION</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
            MY <span className="text-gym-primary">SUPPLEMENTS</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">Note what you take and what you buy. Your trainer can see this. Download a statement any time.</p>
        </div>
        {profile && <SupplementLog memberId={profile.id} memberName={profile.full_name} />}
      </div>
    </>
  );
};
