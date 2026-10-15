import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, QrCode, CreditCard, Receipt, CalendarCheck, BookOpen, Activity, User, LogOut, Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';

export const MemberPortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { name: 'Dashboard', path: '/portal/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Digital QR Card', path: '/portal/digital-card', icon: <QrCode className="w-4 h-4" /> },
    { name: 'Renew Plan', path: '/portal/checkout', icon: <CreditCard className="w-4 h-4" /> },
    { name: 'Payments & Invoices', path: '/portal/payments', icon: <Receipt className="w-4 h-4" /> },
    { name: 'Attendance Streak', path: '/portal/attendance', icon: <CalendarCheck className="w-4 h-4" /> },
    { name: 'Book Classes', path: '/portal/classes', icon: <BookOpen className="w-4 h-4" /> },
    { name: 'Body Metrics', path: '/portal/progress', icon: <Activity className="w-4 h-4" /> },
    { name: 'My Profile', path: '/portal/profile', icon: <User className="w-4 h-4" /> },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gym-bg flex flex-col">
      {/* Top Portal Bar */}
      <div className="bg-gym-surface border-b border-gym-border py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={profile?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
              alt={profile?.full_name}
              className="w-12 h-12 rounded-full object-cover border-2 border-gym-primary"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-heading text-white uppercase">{profile?.full_name || 'Member'}</h2>
                <span className="bg-gym-primary/20 text-gym-primary text-xs font-heading px-2 py-0.5 rounded border border-gym-primary/40 uppercase font-bold">
                  ACTIVE MEMBER
                </span>
              </div>
              <p className="text-xs text-gym-muted">ID: <strong className="text-white">RV-2026-8842</strong> | Phone: {profile?.phone || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/portal/digital-card">
              <Button variant="primary" size="sm" leftIcon={<QrCode className="w-4 h-4" />}>
                Show QR Pass
              </Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} leftIcon={<LogOut className="w-4 h-4 text-gym-danger" />}>
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Sub Navigation Bar */}
      <div className="bg-gym-surface/80 border-b border-gym-border overflow-x-auto no-scrollbar">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`py-3 px-4 text-sm font-heading tracking-wide uppercase whitespace-nowrap border-b-2 flex items-center gap-2 transition-colors ${
                  isActive
                    ? 'border-gym-primary text-gym-primary font-bold bg-gym-primary/10'
                    : 'border-transparent text-gym-muted hover:text-white hover:bg-gym-surfaceHover'
                }`}
              >
                {item.icon}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Portal Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
        {children}
      </div>
    </div>
  );
};
