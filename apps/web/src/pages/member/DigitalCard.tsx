import React, { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { QRCodeSVG } from 'qrcode.react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/account/Avatar';
import { useAuth } from '../../context/AuthContext';
import { Membership, currentMembership, daysLeft, getMyQrToken, listMemberships } from '../../services/gym';

const REFRESH_SECONDS = 25;
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/** Member's entry pass. The QR changes every 30 seconds so a screenshot can't be reused. */
export const DigitalCard: React.FC = () => {
  const { profile } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [membership, setMembership] = useState<Membership | null>(null);
  const [seconds, setSeconds] = useState(REFRESH_SECONDS);

  const refresh = useCallback(() => {
    getMyQrToken()
      .then((t) => {
        setToken(t);
        setError('');
        setSeconds(REFRESH_SECONDS);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!profile) return;
    refresh();
    listMemberships(profile.id).then((rows) => setMembership(currentMembership(rows))).catch(() => undefined);
  }, [profile, refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          refresh();
          return REFRESH_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const left = daysLeft(membership);
  const active = membership && left != null && left >= 0;

  return (
    <>
      <Helmet>
        <title>Digital Membership Pass | RV Fitness</title>
      </Helmet>

      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="text-center">
          <span className="text-xs font-heading text-gym-primary uppercase tracking-widest">CONTACTLESS ENTRY</span>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading text-white uppercase tracking-wide mt-1">
            DIGITAL <span className="text-gym-primary">MEMBERSHIP CARD</span>
          </h1>
          <p className="text-xs text-gym-muted mt-1">Show this QR to a trainer or the front desk to mark your attendance.</p>
        </div>

        <Card hoverEffect={false} className="border-gym-primary/50 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-heading text-white">
              RV <span className="text-gym-primary">FITNESS</span> PASS
            </span>
            <span className={`text-xs font-heading px-2.5 py-1 rounded-full border ${active ? 'text-gym-success border-gym-success/40 bg-gym-success/10' : 'text-gym-danger border-gym-danger/40 bg-gym-danger/10'}`}>
              {active ? 'ACTIVE' : 'NO ACTIVE PLAN'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="bg-white p-3 rounded-2xl shrink-0" aria-label="Your QR pass">
              {token ? (
                <QRCodeSVG value={token} size={176} level="M" />
              ) : (
                <div className="w-[176px] h-[176px] flex items-center justify-center text-xs text-gray-500 text-center px-3">{error || 'Loading...'}</div>
              )}
              <p className="text-[11px] text-gray-600 text-center mt-2 flex items-center justify-center gap-1">
                <RefreshCw className="w-3 h-3" /> New code in {seconds}s
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full min-w-0">
              <div className="flex items-center gap-3">
                <Avatar src={profile?.avatar_url} name={profile?.full_name} size="lg" zoomable />
                <div className="min-w-0">
                  <p className="text-lg font-heading text-white break-words">{profile?.full_name}</p>
                  <p className="text-sm text-gym-primary font-heading">{profile?.member_code || '—'}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-gym-muted uppercase">Plan</dt>
                  <dd className="text-white">{membership?.plan_title || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gym-muted uppercase">Valid till</dt>
                  <dd className={active ? 'text-gym-success' : 'text-gym-danger'}>{membership ? fmt(membership.end_date) : '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gym-muted uppercase">Blood group</dt>
                  <dd className="text-white">{profile?.blood_group || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gym-muted uppercase">Member type</dt>
                  <dd className="text-white capitalize">{profile?.membership_tier || 'normal'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="text-xs text-gym-muted flex items-center gap-1.5 border-t border-gym-border pt-3">
            <ShieldCheck className="w-4 h-4 text-gym-primary" /> Secure pass: the code changes every 30 seconds, so screenshots stop working.
          </p>
        </Card>
      </div>
    </>
  );
};
