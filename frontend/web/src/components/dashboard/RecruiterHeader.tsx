'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileCheck,
  LayoutDashboard,
  ShieldCheck,
  Users,
  Video,
  Workflow,
} from 'lucide-react';
import { AppHeader } from '@/components/dashboard/AppHeader';
import {
  fetchRecruiterNotifications,
  logout,
  markRecruiterNotificationsAsRead,
  type RecruiterNotification,
} from '@/lib/api';

function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

function getNotificationVisuals(type: string) {
  const t = (type || '').toUpperCase();
  if (t.includes('COMPLETE') || t.includes('PASS') || t.includes('EVAL')) {
    return {
      icon: CheckCircle2,
      badge: 'border-emerald-500/30 bg-emerald-500/10 text-accent-emerald',
    };
  }
  if (t.includes('FLAG') || t.includes('ALERT') || t.includes('VIOLATION')) {
    return {
      icon: AlertTriangle,
      badge: 'border-rose-500/30 bg-rose-500/10 text-accent-rose',
    };
  }
  if (t.includes('INTERVIEW') || t.includes('SESSION')) {
    return {
      icon: Video,
      badge: 'border-cyan-500/30 bg-cyan-500/10 text-accent-cyan',
    };
  }
  if (t.includes('BILLING') || t.includes('WALLET') || t.includes('CREDIT')) {
    return {
      icon: CreditCard,
      badge: 'border-violet-500/30 bg-violet-500/10 text-accent-violet',
    };
  }
  return {
    icon: ShieldCheck,
    badge: 'border-blue-500/30 bg-blue-500/10 text-accent-blue',
  };
}

export const RecruiterHeader: React.FC = () => {
  const router = useRouter();
  const [userName, setUserName] = useState('Recruiter');
  const [userInitials, setUserInitials] = useState('RC');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<RecruiterNotification[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user details — prefer cached profile; otherwise resolve from the
  // server (never fall back to another person's name).
  useEffect(() => {
    let cancelled = false;
    const applyName = (raw: any) => {
      const u = raw || {};
      let name = String(u.fullName || u.name || u.full_name || '').trim();
      if (!name && u.email) {
        const prefix = String(u.email).split('@')[0].replace(/\d+/g, '').replace(/[._]/g, ' ').replace(/[-_]/g, ' ').trim();
        name = prefix.replace(/\b\w/g, (c: string) => c.toUpperCase());
      }
      name = name || 'Recruiter';
      if (cancelled) return;
      setUserName(name);
      const initials =
        name
          .split(' ')
          .filter(Boolean)
          .map((n: string) => n[0])
          .join('')
          .slice(0, 2)
          .toUpperCase() || 'RC';
      setUserInitials(initials);
    };
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem('tp_user') : null;
      if (raw) {
        applyName(JSON.parse(raw));
        return () => { cancelled = true; };
      }
    } catch { }
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
        if (!res.ok) return;
        const body = await res.json().catch(() => null);
        applyName(body?.user ?? body);
      } catch { }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch real notifications from backend
  const loadNotifications = useCallback(async () => {
    try {
      const data = await fetchRecruiterNotifications();
      setNotifications(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
    // 30-second live polling for new interview evaluations
    const interval = setInterval(() => {
      void loadNotifications();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  // Mark unread notifications as read when popover opens
  useEffect(() => {
    if (!notificationsOpen) return;
    const unread = notifications.filter((n) => !n.is_read);
    if (unread.length === 0) return;

    const timer = setTimeout(() => {
      const ids = unread.map((n) => n.id);
      void markRecruiterNotificationsAsRead(ids);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }, 1200);

    return () => clearTimeout(timer);
  }, [notificationsOpen, notifications]);

  const handleMarkAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length > 0) {
      await markRecruiterNotificationsAsRead(unreadIds);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  const handleItemClick = (item: RecruiterNotification) => {
    setNotificationsOpen(false);
    const actionUrl = item.payload?.action_url;
    if (actionUrl) {
      router.push(actionUrl);
    } else if (item.payload?.session_id) {
      router.push(`/recruiter/interview/${item.payload.session_id}/recording`);
    } else {
      router.push('/recruiter/dossiers');
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const navLinks = [
    { name: 'Dashboard', href: '/recruiter/dashboard', icon: LayoutDashboard },
    { name: 'Candidate Dossiers', href: '/recruiter/dossiers', icon: Users },
    { name: 'Evaluation Rubrics', href: '/recruiter/rubrics', icon: FileCheck },
    { name: 'ATS Integrations', href: '/recruiter/integrations', icon: Workflow },
    { name: 'Billing & Wallet', href: '/recruiter/billing', icon: CreditCard },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    window.location.href = '/login';
  };

  return (
    <AppHeader
      brandHref="/recruiter/dashboard"
      brandBadge="Enterprise"
      navLinks={navLinks}
      onNotificationsOpenChange={setNotificationsOpen}
      notificationIndicator={
        unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null
      }
      notificationTitle="Recruiter Notifications"
      notificationHeaderClassName="pb-2.5"
      notificationBodyClassName="max-h-84 overflow-y-auto space-y-1.5"
      notificationBody={
        <>
          {unreadCount > 0 && (
            <div className="flex justify-end pb-1">
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-accent-blue hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-6 text-center text-xs text-ink-muted">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface-2 p-4 text-center text-xs text-ink-muted">
              You have no new notifications.
            </div>
          ) : (
            notifications.map((item) => {
              const visuals = getNotificationVisuals(item.notification_type);
              const Icon = visuals.icon;

              return (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`group relative flex items-start gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                    item.is_read
                      ? 'border-line bg-surface hover:bg-surface-2'
                      : 'border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${visuals.badge}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-xs font-semibold text-ink group-hover:text-accent-blue transition-colors">
                        {item.title}
                      </p>
                      {!item.is_read && (
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />
                      )}
                    </div>

                    {item.body && (
                      <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{item.body}</p>
                    )}

                    <p className="mt-1 text-[10px] text-ink-faint">
                      {formatRelativeTime(item.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </>
      }
      profileHref="/recruiter/profile"
      profileTitle="Manage Organization Profile"
      profileAvatarClassName="bg-gradient-to-tr from-blue-600 to-cyan-500"
      profileInitials={userInitials}
      profileName={userName}
      profileSubtitle="Workspace"
      profileSubtitleClassName="font-mono"
      drawerProfileSubtitle="Enterprise Workspace"
      drawerProfileSubtitleClassName="font-mono text-xs"
      logoutLabel="Sign Out"
      onLogout={handleLogout}
    />
  );
};
