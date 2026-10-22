import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { NoticeBoard } from '../../components/notices/NoticeBoard';

/** Gym notice board page used in the member portal, trainer panel and admin. */
export const NoticesPage: React.FC<{ backTo?: string; backLabel?: string }> = ({ backTo, backLabel = 'Back' }) => (
  <>
    <Helmet>
      <title>Notice Board | RV Fitness</title>
    </Helmet>
    <div className="max-w-3xl mx-auto w-full flex flex-col gap-6">
      {backTo && (
        <Link to={backTo} className="text-sm text-gym-muted hover:text-white inline-flex items-center gap-1 w-fit">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
      )}
      <div>
        <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ANNOUNCEMENTS</span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
          NOTICE <span className="text-gym-primary">BOARD</span>
        </h1>
      </div>
      <NoticeBoard />
    </div>
  </>
);
