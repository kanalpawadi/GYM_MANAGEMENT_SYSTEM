import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  QrCode,
  DollarSign,
  BarChart3,
  Sliders,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  PenSquare,
  KeyRound,
  Inbox,
  Dumbbell,
  Globe,
  MessageCircle,
  Megaphone,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ChangePasswordModal } from '../../components/account/ChangePasswordModal';
import { ProfilePhotoPicker } from '../../components/account/ProfilePhotoPicker';
import { NotificationBell } from '../../components/account/NotificationBell';
import { ROLE_LABELS, canEditContent, isAdminRole } from '../../config/roles';
import { BrandLogo } from '../../components/ui/BrandLogo';
import { useUnreadMessages } from '../../components/chat/useUnreadMessages';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Tablets start with the icon-only sidebar; phones use the slide-in menu instead.
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const unread = useUnreadMessages();

  // Close the phone menu after navigating.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const navItems = [
    {
      name: 'Overview',
      path: '/admin/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      name: 'Members',
      path: '/admin/members',
      icon: <Users className="w-5 h-5" />,
    },
    {
      name: 'Approvals',
      path: '/admin/requests',
      icon: <Inbox className="w-5 h-5" />,
    },
    {
      name: unread ? `Messages (${unread})` : 'Messages',
      path: '/admin/messages',
      icon: <MessageCircle className="w-5 h-5" />,
    },
    {
      name: 'Notice Board',
      path: '/admin/notices',
      icon: <Megaphone className="w-5 h-5" />,
    },
    {
      name: 'Attendance Scanner',
      path: '/admin/attendance',
      icon: <QrCode className="w-5 h-5" />,
    },
    {
      name: 'Leads & Visits',
      path: '/admin/leads',
      icon: <UserPlus className="w-5 h-5" />,
    },
    {
      name: 'Financials',
      path: '/admin/financials',
      icon: <DollarSign className="w-5 h-5" />,
    },
    {
      name: 'Reports',
      path: '/admin/reports',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      name: 'Trainer Panel',
      path: '/trainer/dashboard',
      icon: <Dumbbell className="w-5 h-5" />,
    },
    {
      name: 'Gym Settings',
      path: '/admin/settings',
      icon: <Sliders className="w-5 h-5" />,
    },
    ...(isAdminRole(profile?.role)
      ? [
          {
            name: 'Users & Roles',
            path: '/admin/users',
            icon: <ShieldCheck className="w-5 h-5" />,
          },
        ]
      : []),
    ...(canEditContent(profile?.role)
      ? [
          {
            name: 'Website Editor',
            path: '/admin/content',
            icon: <PenSquare className="w-5 h-5" />,
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const current = navItems.find((i) => location.pathname === i.path || location.pathname.startsWith(i.path + '/'));

  // Shared by the desktop sidebar and the phone menu.
  const navList = (compact: boolean) => (
    <nav className="p-3 space-y-1">
      {navItems.map((item) => {
        const isActive = item === current;
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-heading text-sm uppercase tracking-wide transition-all ${
              isActive ? 'bg-gold-gradient text-black font-bold shadow-yellow-glow' : 'text-gym-muted hover:text-white hover:bg-gym-surfaceHover'
            }`}
            title={item.name}
          >
            <span className="shrink-0">{item.icon}</span>
            {!compact && <span className="truncate">{item.name}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const accountBox = (compact: boolean) => (
    <div className="p-4 border-t border-gym-border flex flex-col gap-3">
      {!compact && (
        <div className="flex items-center gap-2.5">
          <ProfilePhotoPicker size="md" showError={false} />
          <div className="truncate">
            <h4 className="text-sm font-heading text-white truncate">{profile?.full_name || 'Admin Staff'}</h4>
            <span className="text-[10px] text-gym-muted uppercase">{profile?.email}</span>
          </div>
        </div>
      )}
      <Button variant="ghost" size="sm" onClick={() => setShowPassword(true)} className="w-full justify-start" leftIcon={<KeyRound className="w-4 h-4" />}>
        {!compact && 'Change Password'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleLogout}
        className="w-full justify-start text-gym-danger hover:bg-gym-danger/10"
        leftIcon={<LogOut className="w-4 h-4" />}
      >
        {!compact && 'Exit Terminal'}
      </Button>
    </div>
  );

  const brand = (showText: boolean) => (
    <Link to="/" className="flex items-center gap-2 overflow-hidden min-w-0">
      <BrandLogo className="w-10 h-10" />
      {showText && (
        <div className="flex flex-col min-w-0">
          <span className="text-xl font-heading text-white tracking-wider">
            RV-<span className="text-gym-primary">ADMIN</span>
          </span>
          <span className="text-[10px] text-gym-primary font-heading uppercase truncate">{profile ? ROLE_LABELS[profile.role] : ''} TERMINAL</span>
        </div>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-gym-bg flex">
      {/* Desktop / tablet sidebar */}
      <aside
        className={`${collapsed ? 'w-20' : 'w-64'} hidden md:flex bg-gym-surface border-r border-gym-border flex-col justify-between transition-all duration-300 sticky top-0 h-screen z-30 overflow-y-auto`}
      >
        <div>
          <div className={`p-4 border-b border-gym-border flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            {brand(!collapsed)}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 text-gym-muted hover:text-white rounded-lg hover:bg-gym-surfaceHover"
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>
          {navList(collapsed)}
        </div>
        {accountBox(collapsed)}
      </aside>

      {/* Phone slide-in menu */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-black/70" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative w-[82%] max-w-xs h-full bg-gym-surface border-r border-gym-border flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="p-4 border-b border-gym-border flex items-center justify-between gap-2">
                {brand(true)}
                <button onClick={() => setMenuOpen(false)} className="p-2 text-gym-muted hover:text-white rounded-lg" aria-label="Close menu">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {navList(false)}
            </div>
            {accountBox(false)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-gym-surface/80 backdrop-blur-md border-b border-gym-border py-3 md:py-4 px-3 sm:px-6 flex items-center justify-between gap-2 sticky top-0 z-20">
          <div className="flex md:hidden items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              className="p-2 -ml-1 text-white rounded-lg hover:bg-gym-surfaceHover"
              aria-label="Open menu"
              aria-expanded={menuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
            <BrandLogo className="w-8 h-8" />
            <span className="font-heading text-white text-sm uppercase truncate">{current?.name ?? 'Admin'}</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs font-heading text-gym-muted uppercase">
            <span>ADMINISTRATIVE SYSTEM</span>
            <span>/</span>
            <span className="text-gym-primary font-bold">{location.pathname.replace('/admin/', '').split('/')[0].toUpperCase()}</span>
          </div>

          <div className="flex items-center justify-end gap-1 sm:gap-2 ml-auto shrink-0">
            <NotificationBell />
            <Link to="/" title="Open the public website" aria-label="Open the public website">
              <Button variant="ghost" size="sm" leftIcon={<Globe className="w-4 h-4" />}>
                <span className="hidden sm:inline">Website</span>
              </Button>
            </Link>
            <Link to="/admin/attendance" aria-label="Scanner">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                <span className="hidden sm:inline">Scanner</span>
              </Button>
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-8 flex-1 min-w-0">{children}</main>
        <ChangePasswordModal isOpen={showPassword} onClose={() => setShowPassword(false)} />
      </div>
    </div>
  );
};
