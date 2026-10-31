import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  QrCode,
  CreditCard,
  Receipt,
  CalendarCheck,
  Activity,
  User,
  LogOut,
  Utensils,
  KeyRound,
  Globe,
  Megaphone,
  MoreHorizontal,
  X,
  ShieldCheck,
  Pill,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ChangePasswordModal } from '../../components/account/ChangePasswordModal';
import { Avatar } from '../../components/account/Avatar';
import { NotificationBell } from '../../components/account/NotificationBell';
import { ROLE_LABELS, roleRank } from '../../config/roles';
import { MemberChatWidget } from '../../components/chat/MemberChatWidget';
import { MembershipCheck, checkMyMembership } from '../../services/gym';

const navItems = [
  { name: 'Dashboard', short: 'Home', path: '/portal/dashboard', icon: LayoutDashboard },
  { name: 'My Diet & Workout', short: 'Plans', path: '/portal/plans', icon: Utensils },
  { name: 'Supplements', short: 'Supplements', path: '/portal/supplements', icon: Pill },
  { name: 'Notices', short: 'Notices', path: '/portal/notices', icon: Megaphone },
  { name: 'Digital QR Card', short: 'QR Pass', path: '/portal/digital-card', icon: QrCode },
  { name: 'Renew / Change Plan', short: 'Renew', path: '/portal/checkout', icon: CreditCard },
  { name: 'Payments & Invoices', short: 'Payments', path: '/portal/payments', icon: Receipt },
  { name: 'Attendance', short: 'Attendance', path: '/portal/attendance', icon: CalendarCheck },
  { name: 'Body Metrics', short: 'Body', path: '/portal/progress', icon: Activity },
  { name: 'My Profile', short: 'Profile', path: '/portal/profile', icon: User },
];

// Phone bottom bar: the four most used pages; everything else is under "More".
const BOTTOM_PATHS = ['/portal/dashboard', '/portal/plans', '/portal/digital-card', '/portal/attendance'];

export const MemberPortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout, refreshProfile } = useAuth();
  const [planCheck, setPlanCheck] = useState<MembershipCheck | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => setMoreOpen(false), [location.pathname]);

  // Plan check on opening the portal: an ended plan sends the member back to the admission
  // form (approval again); 5 days or fewer left shows the renewal banner.
  useEffect(() => {
    if (profile?.role !== 'member') return;
    let alive = true;
    checkMyMembership().then((r) => {
      if (!alive || !r) return;
      if (r.expired) void refreshProfile();
      else setPlanCheck(r);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const rank = roleRank(profile?.role);
  const staffLink = rank >= 2 ? { to: rank >= 3 ? '/admin/dashboard' : '/trainer/dashboard', label: rank >= 3 ? 'Admin Panel' : 'Trainer Panel' } : null;
  const isActive = (path: string) => location.pathname === path;
  const bottomItems = navItems.filter((i) => BOTTOM_PATHS.includes(i.path));
  const moreItems = navItems.filter((i) => !BOTTOM_PATHS.includes(i.path));
  const moreActive = moreItems.some((i) => isActive(i.path));

  return (
    <div className="min-h-screen bg-gym-bg flex flex-col">
      {/* Top Portal Bar */}
      <div className="bg-gym-surface border-b border-gym-border py-3 md:py-4 px-4 sm:px-6 lg:px-8 sticky top-0 md:static z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {profile?.avatar_url ? (
              <Avatar src={profile.avatar_url} name={profile.full_name} size="md" zoomable />
            ) : (
              <Link to="/portal/profile" title="Add your photo" className="shrink-0">
                <Avatar name={profile?.full_name} size="md" />
              </Link>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <h2 className="text-base sm:text-xl font-heading text-white uppercase truncate max-w-[60vw] sm:max-w-none">{profile?.full_name || 'Member'}</h2>
                <span className="bg-gym-primary/20 text-gym-primary text-[10px] sm:text-xs font-heading px-2 py-0.5 rounded border border-gym-primary/40 uppercase font-bold">
                  {profile?.role === 'member' ? `${profile.membership_tier === 'premium' ? 'Premium' : 'Normal'} member` : profile ? ROLE_LABELS[profile.role] : ''}
                </span>
              </div>
              <p className="text-xs text-gym-muted truncate">
                ID: <strong className="text-white">{profile?.member_code || '—'}</strong>
                <span className="hidden sm:inline"> | Phone: {profile?.phone || '—'}</span>
              </p>
            </div>
          </div>

          {/* Phone: only the bell; the rest lives in "More". */}
          <div className="md:hidden shrink-0">
            <NotificationBell />
          </div>

          <div className="hidden md:flex flex-wrap items-center justify-end gap-2">
            <NotificationBell />
            <Link to="/" title="Open the public website">
              <Button variant="ghost" size="sm" leftIcon={<Globe className="w-4 h-4" />}>Website</Button>
            </Link>
            {staffLink && (
              <Link to={staffLink.to}>
                <Button variant="outline" size="sm">{staffLink.label}</Button>
              </Link>
            )}
            <Link to="/portal/digital-card">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                Show QR Pass
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setShowPassword(true)} leftIcon={<KeyRound className="w-4 h-4" />}>
              Change Password
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4 text-gym-danger" />}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar (tablet / desktop) */}
      <div className="hidden md:block bg-gym-surface/80 border-b border-gym-border overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive(item.path) ? 'page' : undefined}
              className={`py-3 px-4 text-sm font-heading tracking-wide uppercase whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
                isActive(item.path)
                  ? 'border-gym-primary text-gym-primary font-bold bg-gym-primary/10'
                  : 'border-transparent text-gym-muted hover:text-white hover:bg-gym-surfaceHover'
              }`}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recharge-style reminder when the plan ends within 5 days */}
      {planCheck && planCheck.days_left != null && planCheck.days_left <= 5 && (
        <div role="status" className="bg-amber-400/15 border-b border-amber-400/50 text-amber-300 text-sm px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <span>
              {planCheck.days_left === 0
                ? 'Your membership ends today.'
                : `Your membership ends in ${planCheck.days_left} day${planCheck.days_left === 1 ? '' : 's'}${planCheck.ends_on ? ` (${new Date(`${planCheck.ends_on}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})` : ''}.`}{' '}
              Renew now to keep training without a break.
            </span>
            <Link to="/portal/checkout" className="font-heading text-amber-200 underline underline-offset-2">
              Renew now
            </Link>
          </div>
        </div>
      )}

      {/* Main Portal Content Container (extra bottom space on phones for the tab bar) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 md:py-8 flex-1 w-full">{children}</div>

      {/* Phone bottom tab bar */}
      <nav
        aria-label="Portal menu"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-gym-surface/95 backdrop-blur border-t border-gym-border grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
      >
        {bottomItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive(item.path) ? 'page' : undefined}
            className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-heading ${isActive(item.path) ? 'text-gym-primary' : 'text-gym-muted'}`}
          >
            <item.icon className="w-5 h-5" />
            {item.short}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          className={`flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-heading ${moreActive || moreOpen ? 'text-gym-primary' : 'text-gym-muted'}`}
        >
          <MoreHorizontal className="w-5 h-5" />
          More
        </button>
      </nav>

      {/* Phone "More" sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true" aria-label="More options">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close" onClick={() => setMoreOpen(false)} />
          <div className="relative w-full bg-gym-surface border-t border-gym-primary/40 rounded-t-2xl p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="font-heading text-white uppercase">More</span>
              <button type="button" onClick={() => setMoreOpen(false)} className="p-2 text-gym-muted hover:text-white" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {moreItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-heading text-center ${
                    isActive(item.path) ? 'border-gym-primary text-gym-primary bg-gym-primary/10' : 'border-gym-border text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5 text-gym-primary" />
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-col divide-y divide-gym-border border-t border-gym-border">
              <Link to="/" className="flex items-center gap-3 py-3 text-sm text-white">
                <Globe className="w-4 h-4 text-gym-primary" /> Visit website
              </Link>
              {staffLink && (
                <Link to={staffLink.to} className="flex items-center gap-3 py-3 text-sm text-white">
                  <ShieldCheck className="w-4 h-4 text-gym-primary" /> {staffLink.label}
                </Link>
              )}
              <button type="button" onClick={() => setShowPassword(true)} className="flex items-center gap-3 py-3 text-sm text-white text-left">
                <KeyRound className="w-4 h-4 text-gym-primary" /> Change password
              </button>
              <button type="button" onClick={handleLogout} className="flex items-center gap-3 py-3 text-sm text-gym-danger text-left">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} />
      <MemberChatWidget />
    </div>
  );
};
