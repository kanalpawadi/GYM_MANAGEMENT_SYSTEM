import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, UserPlus, QrCode, DollarSign, BarChart3, Sliders, LogOut, ShieldCheck, ChevronLeft, PenSquare, KeyRound, Inbox, Dumbbell, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { ChangePasswordModal } from '../../components/account/ChangePasswordModal';
import { ProfilePhotoPicker } from '../../components/account/ProfilePhotoPicker';
import { NotificationBell } from '../../components/account/NotificationBell';
import { ROLE_LABELS, canEditContent, isAdminRole } from '../../config/roles';
import { BrandLogo } from '../../components/ui/BrandLogo';

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  // Start with the icon-only sidebar on phones and tablets so the page has room.
  const [collapsed, setCollapsed] = useState(() => typeof window !== 'undefined' && window.innerWidth < 1024);
  const [showPassword, setShowPassword] = useState(false);

  const navItems = [
    { name: 'Overview', path: '/admin/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { name: 'Members', path: '/admin/members', icon: <Users className="w-5 h-5" /> },
    { name: 'Plan Requests', path: '/admin/requests', icon: <Inbox className="w-5 h-5" /> },
    { name: 'Attendance Scanner', path: '/admin/attendance', icon: <QrCode className="w-5 h-5" /> },
    { name: 'Leads & Visits', path: '/admin/leads', icon: <UserPlus className="w-5 h-5" /> },
    { name: 'Financials', path: '/admin/financials', icon: <DollarSign className="w-5 h-5" /> },
    { name: 'Reports', path: '/admin/reports', icon: <BarChart3 className="w-5 h-5" /> },
    { name: 'Trainer Panel', path: '/trainer/dashboard', icon: <Dumbbell className="w-5 h-5" /> },
    { name: 'Gym Settings', path: '/admin/settings', icon: <Sliders className="w-5 h-5" /> },
    ...(isAdminRole(profile?.role)
      ? [{ name: 'Users & Roles', path: '/admin/users', icon: <ShieldCheck className="w-5 h-5" /> }]
      : []),
    ...(canEditContent(profile?.role)
      ? [{ name: 'Website Editor', path: '/admin/content', icon: <PenSquare className="w-5 h-5" /> }]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gym-bg flex">
      {/* Collapsible Sidebar */}
      <aside
        className={`${
          collapsed ? 'w-20' : 'w-64'
        } bg-gym-surface border-r border-gym-border flex flex-col justify-between transition-all duration-300 sticky top-0 h-screen z-30`}
      >
        <div>
          {/* Logo Brand */}
          <div className={`p-4 border-b border-gym-border flex items-center ${collapsed ? 'flex-col gap-2' : 'justify-between'}`}>
            <Link to="/" className="flex items-center gap-2 overflow-hidden">
              <BrandLogo className="w-10 h-10" />
              {!collapsed && (
                <div className="flex flex-col">
                  <span className="text-xl font-heading text-white tracking-wider">
                    RV-<span className="text-gym-primary">ADMIN</span>
                  </span>
                  <span className="text-[10px] text-gym-primary font-heading uppercase">{profile ? ROLE_LABELS[profile.role] : ''} TERMINAL</span>
                </div>
              )}
            </Link>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 text-gym-muted hover:text-white rounded-lg hover:bg-gym-surfaceHover"
            >
              <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-heading text-sm uppercase tracking-wide transition-all ${
                    isActive
                      ? 'bg-gold-gradient text-black font-bold shadow-yellow-glow'
                      : 'text-gym-muted hover:text-white hover:bg-gym-surfaceHover'
                  }`}
                  title={item.name}
                >
                  <span className="shrink-0">{item.icon}</span>
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User info & Signout */}
        <div className="p-4 border-t border-gym-border flex flex-col gap-3">
          {!collapsed && (
            <div className="flex items-center gap-2.5">
              <ProfilePhotoPicker size="md" showError={false} />
              <div className="truncate">
                <h4 className="text-sm font-heading text-white truncate">{profile?.full_name || 'Admin Staff'}</h4>
                <span className="text-[10px] text-gym-muted uppercase">{profile?.email}</span>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPassword(true)}
            className="w-full justify-start"
            leftIcon={<KeyRound className="w-4 h-4" />}
          >
            {!collapsed && 'Change Password'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-gym-danger hover:bg-gym-danger/10"
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            {!collapsed && 'Exit Terminal'}
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-gym-surface/80 backdrop-blur-md border-b border-gym-border py-4 px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-20">
          <div className="hidden sm:flex items-center gap-2 text-xs font-heading text-gym-muted uppercase">
            <span>ADMINISTRATIVE SYSTEM</span>
            <span>/</span>
            <span className="text-gym-primary font-bold">{location.pathname.replace('/admin/', '').split('/')[0].toUpperCase()}</span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">
            <NotificationBell />
            <Link to="/" title="Open the public website">
              <Button variant="ghost" size="sm" leftIcon={<Globe className="w-4 h-4" />}>Website</Button>
            </Link>
            <Link to="/admin/attendance">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                Scanner
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
