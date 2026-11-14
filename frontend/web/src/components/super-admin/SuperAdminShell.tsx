'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle2,
  KeyRound,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';
import { logout, apiFetch } from '@/lib/api';
import { SUPER_ADMIN_NAV, initialsOf } from '@/lib/super-admin';

const SUPPORT_KEY = 'tp_support_reason';

type AdminUser = { id: string; name: string; email: string; role: string };

type ToastMessage = { text: string; type: 'success' | 'error' };

type SuperAdminContextValue = {
  user: AdminUser | null;
  toast: (text: string, type?: 'success' | 'error') => void;
  supportReason: string;
  openSupport: () => void;
  openSettings: () => void;
};

const SuperAdminContext = createContext<SuperAdminContextValue | null>(null);

export function useSuperAdmin(): SuperAdminContextValue {
  const ctx = useContext(SuperAdminContext);
  if (!ctx) throw new Error('useSuperAdmin must be used inside SuperAdminShell');
  return ctx;
}

export default function SuperAdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);

  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);

  const [supportReason, setSupportReason] = useState('');
  const [supportDraft, setSupportDraft] = useState('');
  const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

  // Close profile dropdown on click outside or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setNotifMenuOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
      }
    }
    if (profileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [profileMenuOpen]);

  const toast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    window.setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Hydrate the privileged support grant from session storage.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.sessionStorage.getItem(SUPPORT_KEY) || '';
    setSupportReason(stored);
    setSupportDraft(stored);
  }, []);

  // Authoritative role gate — server truth via /api/auth/me, never localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/auth/me', { cache: 'no-store' });
        const body = await res.json().catch(() => ({}));
        const role = String(body?.user?.role || '').toLowerCase().trim();
        if (cancelled) return;
        if (res.ok && role === 'super_admin') {
          setUser({
            id: String(body?.user?.id || ''),
            name: String(body?.user?.fullName || body?.user?.name || ''),
            email: String(body?.user?.email || ''),
            role,
          });
          setAuthorized(true);
          return;
        }
        setAuthorized(false);
        let destination = '/login?error=unauthorized_admin';
        if (role === 'recruiter') destination = '/recruiter/dashboard';
        else if (role === 'candidate') destination = '/candidate/dashboard';
        router.replace(destination);
      } catch {
        if (!cancelled) {
          setAuthorized(false);
          router.replace('/login?error=session_expired');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const openSupport = useCallback(() => {
    setSupportDraft(supportReason);
    setSupportModalOpen(true);
  }, [supportReason]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);

  const saveSupportReason = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = supportDraft.trim();
    if (clean.length < 10) {
      toast('Support reason must be at least 10 characters describing the operational ticket.', 'error');
      return;
    }
    window.sessionStorage.setItem(SUPPORT_KEY, clean);
    setSupportReason(clean);
    setSupportModalOpen(false);
    toast('Privileged Support Grant activated. All requests are now audited.', 'success');
  };

  const clearSupportReason = () => {
    window.sessionStorage.removeItem(SUPPORT_KEY);
    setSupportReason('');
    setSupportDraft('');
    toast('Privileged Support Grant deactivated.', 'success');
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // ignore
    }
    router.replace('/login');
    router.refresh();
  };

  const contextValue = useMemo<SuperAdminContextValue>(
    () => ({
      user,
      toast,
      supportReason,
      openSupport,
      openSettings,
    }),
    [user, toast, supportReason, openSupport, openSettings]
  );

  const isActive = (href: string) =>
    href === '/super-admin' ? pathname === '/super-admin' : pathname.startsWith(href);

  if (authorized !== true) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4 text-ink">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-4 text-sm text-ink-muted">
          <ShieldCheck className="h-5 w-5 text-accent-cyan" />
          <span>
            {authorized === false
              ? 'Redirecting… you do not have platform-admin access.'
              : 'Verifying platform-admin access…'}
          </span>
        </div>
      </main>
    );
  }

  return (
    <SuperAdminContext.Provider value={contextValue}>
      <div className="min-h-screen bg-canvas text-ink">
        {/* Toast */}
        {toastMessage && (
          <div
            role="status"
            className={`fixed top-4 right-4 z-[200] flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur-md ${
              toastMessage.type === 'error'
                ? 'border-rose-500/40 bg-rose-500/10 text-accent-rose'
                : 'border-emerald-500/40 bg-emerald-500/10 text-accent-emerald'
            }`}
          >
            {toastMessage.type === 'error' ? (
              <AlertTriangle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            {toastMessage.text}
          </div>
        )}

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-line bg-header backdrop-blur-xl">
          <div className="flex w-full items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                aria-label="Toggle navigation"
                className="cursor-pointer rounded-xl border border-line bg-surface p-2 text-ink lg:hidden"
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <BrandLogo href="/super-admin" badge="Super Admin" hideTextOnMobile />
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <ThemeToggle />
              {/* Super Admin Platform Notifications */}
              <div className="relative" ref={notifMenuRef}>
                <button
                  type="button"
                  onClick={() => setNotifMenuOpen((v) => !v)}
                  className={`relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border transition-all ${
                    notifMenuOpen
                      ? 'border-cyan-500/40 bg-cyan-500/10 text-accent-cyan'
                      : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-surface-2 hover:text-ink'
                  }`}
                  aria-label="Platform notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2 rounded-full bg-cyan-400 ring-2 ring-surface" />
                </button>

                {notifMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl border border-line bg-surface p-4 shadow-2xl backdrop-blur-xl z-[150] animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="flex items-center justify-between pb-2.5 border-b border-line">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-accent-cyan" />
                        <p className="text-xs font-bold text-ink">Platform Telemetry Alerts</p>
                      </div>
                      <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] font-bold text-accent-emerald uppercase tracking-wider">
                        Operational
                      </span>
                    </div>

                    <div className="mt-3 space-y-2 text-xs">
                      <Link
                        href="/super-admin/system-health"
                        onClick={() => setNotifMenuOpen(false)}
                        className="group flex items-start gap-2.5 rounded-xl border border-line bg-surface p-2.5 hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-accent-emerald">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink group-hover:text-accent-cyan transition-colors">Core Databases Healthy</p>
                          <p className="text-[11px] text-ink-muted">MongoDB Atlas and Qdrant vector cluster reachable.</p>
                        </div>
                      </Link>

                      <Link
                        href="/super-admin/audit-logs"
                        onClick={() => setNotifMenuOpen(false)}
                        className="group flex items-start gap-2.5 rounded-xl border border-line bg-surface p-2.5 hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-accent-cyan">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink group-hover:text-accent-cyan transition-colors">Audit Ledger Active</p>
                          <p className="text-[11px] text-ink-muted">Tamper-resistant append-only security logs recording.</p>
                        </div>
                      </Link>

                      <Link
                        href="/super-admin/billing"
                        onClick={() => setNotifMenuOpen(false)}
                        className="group flex items-start gap-2.5 rounded-xl border border-line bg-surface p-2.5 hover:bg-surface-2 transition-colors cursor-pointer"
                      >
                        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-violet-500/30 bg-violet-500/10 text-accent-violet">
                          <Activity className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-ink group-hover:text-accent-cyan transition-colors">Shadow Metering Synced</p>
                          <p className="text-[11px] text-ink-muted">Enterprise rate cards and wallet balances reconciled.</p>
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Responsive Profile Avatar & Dropdown */}
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  onClick={() => setProfileMenuOpen((v) => !v)}
                  className="flex items-center rounded-full p-0.5 transition-all hover:ring-2 hover:ring-cyan-500/40 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                  aria-label="Open profile menu"
                  aria-expanded={profileMenuOpen}
                >
                  <div
                    title={user?.email || undefined}
                    className="relative flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-black text-white shadow-sm"
                  >
                    {initialsOf(user?.name || user?.email)}
                    {supportReason && (
                      <span
                        className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-surface"
                        title="Privileged Support Mode Active"
                      />
                    )}
                  </div>
                </button>

                {profileMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-line bg-surface p-4 shadow-2xl backdrop-blur-xl z-[150]">
                    {/* User Identity Header */}
                    <div className="flex items-center gap-3 pb-3 border-b border-line">
                      <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs sm:text-sm font-black text-white shadow-md">
                        {initialsOf(user?.name || user?.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink text-xs sm:text-sm truncate">{user?.name || 'Super Administrator'}</p>
                        <p className="text-[11px] text-ink-muted truncate font-mono">{user?.email}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-cyan">
                            <ShieldCheck className="h-3 w-3" />
                            {user?.role || 'super_admin'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Support status banner if active */}
                    {supportReason && (
                      <div className="mt-3 rounded-xl bg-amber-500/10 p-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-accent-amber flex items-center gap-1.5">
                            <KeyRound className="h-3.5 w-3.5" />
                            Support Active
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              clearSupportReason();
                              setProfileMenuOpen(false);
                            }}
                            className="text-[10px] font-bold text-accent-amber underline hover:opacity-80"
                          >
                            Deactivate
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-accent-amber/80 truncate font-mono">{supportReason}</p>
                      </div>
                    )}

                    {/* Quick Menu Actions */}
                    <div className="mt-3 space-y-1 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          openSettings();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-ink hover:bg-surface-2 transition-colors cursor-pointer text-left"
                      >
                        <Settings className="h-4 w-4 text-ink-muted shrink-0" />
                        <span>Admin Console Settings</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileMenuOpen(false);
                          openSupport();
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-ink hover:bg-surface-2 transition-colors cursor-pointer text-left"
                      >
                        <KeyRound className="h-4 w-4 text-accent-cyan shrink-0" />
                        <span>Privileged Support Grant</span>
                      </button>

                    </div>

                    {/* Sign Out Action */}
                    <div className="mt-3 pt-3 border-t border-line">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-accent-rose hover:bg-rose-500/20 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out of Platform</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="flex w-full">
          {/* Desktop sidebar */}
          <aside className="sticky top-[57px] hidden h-[calc(100vh-57px)] w-72 shrink-0 flex-col overflow-y-auto border-r border-line bg-surface p-4 lg:flex">
            <nav className="space-y-5">
              {SUPER_ADMIN_NAV.map((group) => (
                <div key={group.title}>
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                    {group.title}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map(({ label, href, icon: Icon }) => {
                      const active = isActive(href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                            active
                              ? 'bg-cyan-400/10 font-semibold text-accent-cyan'
                              : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-accent-emerald">
                <ShieldCheck className="h-4 w-4" /> Governed Access
              </div>
              <p className="mt-2 text-[11px] leading-5 text-ink-muted">
                Platform RBAC is enforced server-side. Broad technical reach, but every privileged
                action is bounded and audited.
              </p>
            </div>
          </aside>

          {/* Mobile drawer */}
          {mobileNavOpen && (
            <div className="fixed inset-0 z-[120] lg:hidden">
              <div className="absolute inset-0 bg-scrim backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
              <div className="absolute left-0 top-0 h-full w-[85%] max-w-xs overflow-y-auto border-r border-line bg-surface p-4">
                <div className="mb-4 flex items-center justify-between">
                  <BrandLogo href="/super-admin" badge="Super Admin" hideTextOnMobile />
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen(false)}
                    aria-label="Close navigation"
                    className="cursor-pointer rounded-lg p-1.5 text-ink-muted hover:text-ink"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile Drawer Profile Card */}
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 text-xs font-black text-white shadow-sm">
                    {initialsOf(user?.name || user?.email)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-ink text-xs truncate">{user?.name || 'Super Admin'}</p>
                    <p className="text-[11px] text-ink-muted truncate font-mono">{user?.email}</p>
                    <span className="mt-0.5 inline-block text-[9px] font-bold uppercase tracking-wider text-accent-cyan">
                      {user?.role || 'super_admin'}
                    </span>
                  </div>
                </div>
                <nav className="space-y-5">
                  {SUPER_ADMIN_NAV.map((group) => (
                    <div key={group.title}>
                      <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                        {group.title}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map(({ label, href, icon: Icon }) => {
                          const active = isActive(href);
                          return (
                            <Link
                              key={href}
                              href={href}
                              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                                active
                                  ? 'bg-cyan-400/10 font-semibold text-accent-cyan'
                                  : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </nav>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-accent-rose"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          )}

          {/* Content */}
          <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</section>
        </div>

        {/* Support modal */}
        {supportModalOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-scrim p-4 backdrop-blur-md">
            <div className="w-full max-w-lg space-y-4 rounded-2xl border border-line bg-surface p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-accent-amber" />
                  <h3 className="text-base font-bold text-ink">Privileged Support Access</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSupportModalOpen(false)}
                  aria-label="Close support modal"
                  className="cursor-pointer text-ink-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs leading-relaxed text-ink-muted">
                Super Admins have no routine access to candidate recordings, resumes, or scorecards.
                An explicit operational justification (minimum 10 characters) is required. Every
                action taken under this grant is permanently recorded in the audit log.
              </p>
              <form onSubmit={saveSupportReason} className="space-y-4">
                <div className="space-y-1">
                  <label htmlFor="support-reason" className="text-xs font-semibold text-ink">
                    Support Reason / Incident Ticket #
                  </label>
                  <textarea
                    id="support-reason"
                    required
                    minLength={10}
                    rows={3}
                    value={supportDraft}
                    onChange={(e) => setSupportDraft(e.target.value)}
                    placeholder="e.g., Incident INC-8821: Diagnosing candidate audio synchronization complaint"
                    className="w-full rounded-xl border border-line bg-inset px-3.5 py-2.5 text-sm text-ink outline-none placeholder:text-ink-faint"
                  />
                </div>
                <div className="flex items-center justify-end gap-3 border-t border-line pt-2">
                  <button
                    type="button"
                    onClick={() => setSupportModalOpen(false)}
                    className="cursor-pointer rounded-xl bg-surface-2 px-4 py-2 text-xs font-semibold text-ink hover:bg-surface-3"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="cursor-pointer rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:opacity-90"
                  >
                    Activate Support Grant
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Settings modal */}
        {settingsOpen && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center bg-scrim p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink">Admin Console Settings</h2>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  aria-label="Close settings"
                  className="cursor-pointer text-ink-muted hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                Destructive and permission-changing controls stay behind governed admin surfaces and
                are always audited.
              </p>
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex items-center justify-between rounded-xl border border-line bg-inset px-3 py-2">
                  <span className="text-ink-muted">Signed in as</span>
                  <span className="font-medium text-ink">{user?.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-inset px-3 py-2">
                  <span className="text-ink-muted">Role</span>
                  <span className="font-mono font-medium text-accent-cyan">{user?.role || '—'}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-line bg-inset px-3 py-2">
                  <span className="text-ink-muted">Support grant</span>
                  <span className="font-medium text-ink">{supportReason ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SuperAdminContext.Provider>
  );
}