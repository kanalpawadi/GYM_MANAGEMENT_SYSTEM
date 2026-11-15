import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, Lock, X } from 'lucide-react';
import { useOptionalAuth } from '../../context/AuthContext';
import { PORTAL_ROLES, needsRegistration } from '../../config/roles';
import { HealthAssistant } from './HealthAssistant';

/**
 * Health assistant button for the public website. Anyone can open it, but only
 * approved members and staff can chat (the API enforces the same rule, since
 * every answer costs API credits). Everyone else is asked to sign in or join.
 * One-to-one messages stay in the member portal.
 */
export const PublicHealthAssistant: React.FC = () => {
  const auth = useOptionalAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const profile = auth?.profile ?? null;
  const canChat = !!profile && PORTAL_ROLES.includes(profile.role) && !needsRegistration(profile);

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Health assistant"
          className="fixed z-50 bottom-[11rem] right-4 left-4 sm:left-auto sm:w-[390px] h-[min(520px,calc(100vh-13rem))] bg-gym-surface border border-gym-primary/40 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gym-border">
            <Bot className="w-4 h-4 text-gym-primary" />
            <span className="flex-1 text-sm font-heading text-white">Health Assistant</span>
            <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-gym-muted hover:text-white" aria-label="Close health assistant">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0">
            {canChat ? <HealthAssistant /> : <MembersOnly auth={auth} from={location} />}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close health assistant' : 'Open health assistant'}
        aria-expanded={open}
        className="w-12 h-12 rounded-full bg-gold-gradient text-black flex items-center justify-center shadow-yellow-glow hover:scale-110 transition-all duration-200"
      >
        {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
      </button>
    </>
  );
};

const MembersOnly: React.FC<{ auth: ReturnType<typeof useOptionalAuth>; from: ReturnType<typeof useLocation> }> = ({ auth, from }) => {
  const profile = auth?.profile ?? null;

  let message = 'The health assistant is for RV Fitness members. Sign in to ask about workouts, diet, water, sleep or recovery.';
  let action = (
    <div className="flex flex-wrap justify-center gap-2">
      <Link to="/login" state={{ from }} className="px-4 py-2 rounded-xl bg-gold-gradient text-black text-sm font-heading">
        Sign in
      </Link>
      <Link to="/plans" className="px-4 py-2 rounded-xl border border-gym-primary/50 text-gym-primary text-sm font-heading">
        Become a member
      </Link>
    </div>
  );

  if (auth?.loading) {
    message = 'Checking your account…';
    action = <></>;
  } else if (profile && needsRegistration(profile)) {
    message = 'The health assistant opens once the gym approves your registration.';
    action = (
      <Link to="/register" className="px-4 py-2 rounded-xl bg-gold-gradient text-black text-sm font-heading">
        Check my registration
      </Link>
    );
  } else if (profile) {
    message = 'The health assistant is only for RV Fitness members. Join a plan to start using it.';
    action = (
      <Link to="/plans" className="px-4 py-2 rounded-xl bg-gold-gradient text-black text-sm font-heading">
        View membership plans
      </Link>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="w-12 h-12 rounded-full bg-gym-primary/15 text-gym-primary flex items-center justify-center">
        <Lock className="w-5 h-5" />
      </span>
      <p className="text-sm text-gym-muted">{message}</p>
      {action}
    </div>
  );
};
