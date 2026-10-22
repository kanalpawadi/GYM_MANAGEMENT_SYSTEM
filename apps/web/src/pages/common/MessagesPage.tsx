import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { ChatPanel } from '../../components/chat/ChatPanel';

/** One-to-one chat page used in the member portal, trainer panel and admin. */
export const MessagesPage: React.FC<{ backTo?: string; backLabel?: string }> = ({ backTo, backLabel = 'Back' }) => (
  <>
    <Helmet>
      <title>Messages | RV Fitness</title>
    </Helmet>
    <div className="flex flex-col gap-4">
      {backTo && (
        <Link to={backTo} className="text-sm text-gym-muted hover:text-white inline-flex items-center gap-1 w-fit">
          <ArrowLeft className="w-4 h-4" /> {backLabel}
        </Link>
      )}
      <div>
        <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">ONE-TO-ONE CHAT</span>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
          MY <span className="text-gym-primary">MESSAGES</span>
        </h1>
      </div>
      <ChatPanel />
    </div>
  </>
);
