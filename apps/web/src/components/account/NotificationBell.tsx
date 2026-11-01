import React, { useEffect, useRef, useState } from 'react';
import { Bell, ChevronRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppNotification, listNotifications, markNotificationsRead } from '../../services/gym';

/** The page a notification is about, in the panel the bell is shown in (member portal, trainer panel or admin). */
export function notificationLink(type: string, pathname: string): string {
  if (pathname.startsWith('/portal')) {
    const member: Record<string, string> = {
      plan_request: '/portal/checkout',
      renewal: '/portal/checkout',
      renewal_reminder: '/portal/checkout',
      payment: '/portal/payments',
      notice: '/portal/notices',
      registration: '/portal/dashboard',
      freeze: '/portal/dashboard',
    };
    return member[type] ?? '/portal/dashboard';
  }
  if (pathname.startsWith('/trainer')) {
    return type === 'notice' ? '/trainer/notices' : '/trainer/dashboard';
  }
  const admin: Record<string, string> = {
    plan_request: '/admin/requests',
    registration: '/admin/requests',
    renewal: '/admin/requests',
    payment: '/admin/financials',
    notice: '/admin/notices',
    content: '/admin/content',
  };
  return admin[type] ?? '/admin/dashboard';
}

const timeAgo = (iso: string) => {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

/** In-app notifications (plan approvals, requests, website-change approvals). */
export const NotificationBell: React.FC = () => {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const load = () => listNotifications().then(setItems).catch(() => undefined);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const unread = items.filter((n) => !n.is_read);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread.length) {
      markNotificationsRead(unread.map((n) => n.id)).catch(() => undefined);
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative p-2 rounded-xl text-gym-muted hover:text-white hover:bg-gym-surfaceHover"
        aria-label={unread.length ? `Notifications (${unread.length} new)` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-gym-danger text-white text-[10px] font-bold flex items-center justify-center">
            {unread.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[min(320px,calc(100vw-2rem))] bg-gym-surface border border-gym-border rounded-2xl shadow-2xl z-50 overflow-hidden" role="dialog" aria-label="Notifications">
          <p className="px-4 py-3 border-b border-gym-border font-heading text-white text-sm">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gym-muted text-center">No notifications yet.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gym-border">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      navigate(notificationLink(n.type, pathname));
                    }}
                    className="w-full text-left px-4 py-3 flex items-center gap-2 hover:bg-gym-surfaceHover"
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-white">{n.title}</span>
                      <span className="block text-xs text-gym-muted">{n.message}</span>
                      <span className="block text-[10px] text-gym-muted mt-1">{timeAgo(n.created_at)}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-gym-muted shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};
