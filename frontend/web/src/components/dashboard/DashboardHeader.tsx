'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  UserRound,
  Home,
  Video,
  Award,
  Medal,
  CheckCircle2,
  ScrollText,
  Gauge,
} from 'lucide-react';
import { AppHeader } from '@/components/dashboard/AppHeader';
import {
  fetchCandidateNotifications,
  markCandidateNotificationsAsRead,
  fetchCandidateProfile,
  logout,
  initialsOf,
  apiJson,
  type CandidateNotification,
  type CandidateProfile,
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

function getCandidateNotificationVisuals(type: string) {
  const t = (type || '').toUpperCase();
  if (t.includes('COMPLETE') || t.includes('PASS') || t.includes('SCORE') || t.includes('REPORT')) {
    return { icon: CheckCircle2, badge: 'border-emerald-500/30 bg-emerald-500/10 text-accent-emerald' };
  }
  if (t.includes('INTERVIEW') || t.includes('INVITE') || t.includes('SESSION')) {
    return { icon: Video, badge: 'border-cyan-500/30 bg-cyan-500/10 text-accent-cyan' };
  }
  if (t.includes('SKILL') || t.includes('BADGE')) {
    return { icon: Award, badge: 'border-amber-500/30 bg-amber-500/10 text-accent-amber' };
  }
  return { icon: Sparkles, badge: 'border-blue-500/30 bg-blue-500/10 text-accent-blue' };
}

export const DashboardHeader: React.FC = () => {
  const router = useRouter();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [notifications, setNotifications] = useState<CandidateNotification[] | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const loadHeaderData = useCallback(() => {
    void (async () => {
      try {
        const [record, items, walletRes] = await Promise.all([
          fetchCandidateProfile(),
          fetchCandidateNotifications(),
          apiJson<{ success?: boolean; wallet?: { availableCredits?: number } }>('/api/billing/wallet').catch(() => null),
        ]);
        setProfile(record);
        if (items) {
          const seen = new Set<string>();
          const deduped = items.filter((n) => {
            const sessId = (n.payload as any)?.session_id || '';
            const key = `${n.notification_type}-${sessId}-${n.title}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setNotifications(deduped);
        }
        if (walletRes?.success && walletRes.wallet) {
          setWalletBalance(Math.max(0, Number(walletRes.wallet.availableCredits ?? 0)));
        }
      } catch { }
    })();
  }, []);

  // Mark notifications as read when dropdown opens and persist to backend
  useEffect(() => {
    if (!notificationsOpen) return;
    setNotifications((prev) => {
      if (!prev || !prev.some((n) => !n.is_read)) return prev;
      const unreadIds = prev.filter((n) => !n.is_read).map((n) => String(n.id));
      if (unreadIds.length > 0) {
        void markCandidateNotificationsAsRead(unreadIds);
      }
      return prev.map((notif) => ({ ...notif, is_read: true }));
    });
  }, [notificationsOpen]);

  useEffect(() => {
    loadHeaderData();
    const interval = setInterval(() => {
      loadHeaderData();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadHeaderData]);

  const handleMarkAllCandidateRead = async () => {
    if (!notifications) return;
    const unread = notifications.filter((n) => !n.is_read).map((n) => String(n.id));
    if (unread.length > 0) {
      await markCandidateNotificationsAsRead(unread);
      setNotifications((prev) => (prev ? prev.map((n) => ({ ...n, is_read: true })) : []));
    }
  };

  const handleCandidateNotificationClick = (item: CandidateNotification) => {
    setNotificationsOpen(false);
    const actionUrl = (item.payload as any)?.action_url;
    const sessId = (item.payload as any)?.session_id;
    if (actionUrl) {
      router.push(actionUrl);
    } else if (sessId) {
      router.push(`/candidate/interview/${sessId}/report`);
    } else {
      router.push('/candidate/interviews');
    }
  };

  const unreadCount = (notifications ?? []).filter((item) => !item.is_read).length;
  const displayName = profile?.full_name?.trim() || 'Candidate';
  const subtitle = [profile?.course, profile?.academic_year].filter(Boolean).join(' • ') || 'Profile incomplete';

  const navLinks = [
    { name: 'Home', href: '/candidate/dashboard', icon: Home },
    { name: 'Practice', href: '/candidate/practice', icon: Sparkles },
    { name: 'Aptitude', href: '/candidate/aptitude', icon: Gauge },
    { name: 'My Interviews', href: '/candidate/interviews', icon: Video },
    { name: 'Reports', href: '/candidate/reports', icon: ScrollText },
    { name: 'Skills', href: '/candidate/skills', icon: Medal },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const safeCredits = Math.max(0, walletBalance ?? 0);

  return (
    <AppHeader
      brandHref="/candidate/dashboard"
      navLinks={navLinks}
      walletBadge={
        walletBalance !== null ? {
          credits: safeCredits,
          inr: safeCredits,
          href: '/candidate/wallet',
        } : undefined
      }
      onNotificationsOpenChange={setNotificationsOpen}
      notificationIndicator={
        unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold tabular-nums text-white ring-2 ring-surface">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )
      }
      notificationTitle="Notifications"
      notificationHeaderClassName="pb-2.5"
      notificationBodyClassName="max-h-80 overflow-y-auto"
      notificationBody={
        <>
          {unreadCount > 0 && (
            <div className="flex justify-end pb-1">
              <button
                type="button"
                onClick={handleMarkAllCandidateRead}
                className="text-[11px] font-semibold text-accent-blue hover:underline cursor-pointer"
              >
                Mark all as read
              </button>
            </div>
          )}

          {notifications === null ? (
            <div className="rounded-xl border border-line bg-surface-2 p-3 text-xs text-ink-muted">
              Notifications could not be loaded.
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-line bg-surface-2 p-4 text-center text-xs text-ink-muted">
              You have no new notifications.
            </div>
          ) : (
            notifications.map((item) => {
              const visuals = getCandidateNotificationVisuals(item.notification_type);
              const Icon = visuals.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => handleCandidateNotificationClick(item)}
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
                    {item.body && <p className="mt-0.5 text-xs text-ink-muted line-clamp-2">{item.body}</p>}
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
      profileHref="/candidate/profile"
      profileTitle="Candidate Profile"
      profileAvatarClassName="bg-gradient-to-tr from-blue-600 to-cyan-500"
      profileInitials={
        profile?.full_name?.trim()
          ? initialsOf(profile.full_name)
          : <UserRound className="h-4 w-4" aria-hidden="true" />
      }
      profileName={displayName}
      profileSubtitle={subtitle}
      profileSubtitleClassName="truncate"
      drawerProfileSubtitle={subtitle}
      drawerProfileSubtitleClassName="text-xs truncate"
      logoutLabel="Log Out"
      onLogout={handleLogout}
      drawerExtra={(closeMobileMenu) => (
        <Link
          href="/candidate/practice"
          onClick={closeMobileMenu}
          className="flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-ink hover:bg-surface-2 rounded-xl"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#f04124]" />
            <span>Practice Drill Lab</span>
          </div>
          <span className="bg-[#f04124] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            1 ACTIVE
          </span>
        </Link>
      )}
    />
  );
};
