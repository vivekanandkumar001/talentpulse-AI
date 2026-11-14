'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Menu,
  X,
  LogOut,
  ChevronDown,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { BrandLogo } from '@/components/common/BrandLogo';
import ThemeToggle from '@/components/ThemeToggle';

export interface AppHeaderNavLink {
  name: string;
  href: string;
  icon?: LucideIcon;
}

export interface AppHeaderProps {
  /** Link target of the brand logo. */
  brandHref: string;
  /** Optional badge rendered next to the brand wordmark (e.g. "Enterprise"). */
  brandBadge?: string;
  /** Navigation links rendered in the desktop nav and the mobile drawer. */
  navLinks: AppHeaderNavLink[];
  /** Optional wallet credit indicator pill */
  walletBadge?: {
    credits: number;
    inr: number;
    href: string;
  };
  /** Indicator rendered inside the notification bell (count badge, status dot, ...). */
  notificationIndicator?: React.ReactNode;
  /** Heading shown in the notifications dropdown. */
  notificationTitle: string;
  /** Extra classes for the notifications dropdown header row (preserves exact padding). */
  notificationHeaderClassName: string;
  /** Extra classes for the notifications dropdown body wrapper (preserves exact sizing). */
  notificationBodyClassName: string;
  /** Content of the notifications dropdown body. */
  notificationBody?: React.ReactNode;
  /** Called with the new open state whenever the notifications dropdown toggles. */
  onNotificationsOpenChange?: (open: boolean) => void;
  /** Link target of the profile pill / drawer profile card. */
  profileHref: string;
  /** Tooltip shown on the desktop profile pill. */
  profileTitle: string;
  /** Background classes for the avatar circles (desktop pill and drawer card). */
  profileAvatarClassName: string;
  /** Initials rendered inside the avatar circles. */
  profileInitials: React.ReactNode;
  /** Display name shown on the desktop pill and the drawer card. */
  profileName: React.ReactNode;
  /** Subtitle shown on the desktop profile pill. */
  profileSubtitle: React.ReactNode;
  /** Extra classes inside the desktop subtitle span (e.g. "truncate"/"font-mono"). */
  profileSubtitleClassName: string;
  /** Subtitle content shown in the drawer profile card. */
  drawerProfileSubtitle: React.ReactNode;
  /** Extra classes inside the drawer subtitle paragraph (e.g. "text-xs truncate"). */
  drawerProfileSubtitleClassName: string;
  /** Label of the logout buttons (desktop title/aria-label and drawer text). */
  logoutLabel: string;
  /** Logout action shared by the desktop and drawer logout buttons. */
  onLogout: () => void | Promise<void>;
  /** Optional extra drawer content rendered after the nav links; receives a close callback. */
  drawerExtra?: (closeMobileMenu: () => void) => React.ReactNode;
}

const isNavItemActive = (pathname: string, href: string) => {
  if (pathname === href) return true;
  if (href === '/candidate/dashboard' || href === '/recruiter/dashboard') return false;
  return pathname.startsWith(href);
};

export const AppHeader: React.FC<AppHeaderProps> = ({
  brandHref,
  brandBadge,
  navLinks,
  walletBadge,
  notificationIndicator,
  notificationTitle,
  notificationHeaderClassName,
  notificationBodyClassName,
  notificationBody,
  onNotificationsOpenChange,
  profileHref,
  profileTitle,
  profileAvatarClassName,
  profileInitials,
  profileName,
  profileSubtitle,
  profileSubtitleClassName,
  drawerProfileSubtitle,
  drawerProfileSubtitleClassName,
  logoutLabel,
  onLogout,
  drawerExtra,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const pathname = usePathname();

  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        onNotificationsOpenChange?.(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [onNotificationsOpenChange]);

  // Close popovers on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setNotificationsOpen(false);
    setProfileDropdownOpen(false);
  }, [pathname]);

  // Close popovers on Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setNotificationsOpen(false);
      setProfileDropdownOpen(false);
      setMobileMenuOpen(false);
      onNotificationsOpenChange?.(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onNotificationsOpenChange]);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const toggleNotifications = () => {
    const nextState = !notificationsOpen;
    setNotificationsOpen(nextState);
    if (nextState) setProfileDropdownOpen(false);
    onNotificationsOpenChange?.(nextState);
  };

  const toggleProfileDropdown = () => {
    const nextState = !profileDropdownOpen;
    setProfileDropdownOpen(nextState);
    if (nextState) {
      setNotificationsOpen(false);
      onNotificationsOpenChange?.(false);
    }
  };

  const safeInr = Math.max(0, walletBadge?.inr ?? 0);
  const safeCredits = Math.max(0, walletBadge?.credits ?? 0);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-line/80 bg-header backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:gap-4 lg:px-8 2xl:max-w-[1448px]">

        {/* ================= LEFT: LOGO + PRIMARY NAV ================= */}
        <BrandLogo href={brandHref} badge={brandBadge} hideTextOnMobile />

        <div className="mx-1 hidden h-6 w-px shrink-0 bg-line lg:block" aria-hidden="true" />

        {/* Segmented primary navigation — horizontally scrollable on smaller desktops */}
        <nav
          aria-label="Primary"
          className="hidden h-11 min-w-0 items-center gap-0.5 overflow-x-auto rounded-xl border border-line bg-surface-2/60 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:flex"
        >
          {navLinks.map((item) => {
            const isActive = isNavItemActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[13px] font-semibold transition-colors duration-150 xl:px-3 ${
                  isActive
                    ? 'border-line bg-surface text-ink shadow-xs'
                    : 'border-transparent text-ink-muted hover:bg-surface/70 hover:text-ink'
                }`}
              >
                {Icon && (
                  <Icon
                    aria-hidden="true"
                    className={`h-4 w-4 transition-colors ${isActive ? 'text-accent-cyan' : 'text-ink-faint'}`}
                  />
                )}
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* ================= RIGHT: THEME, WALLET, NOTIFICATIONS, PROFILE ================= */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">

          <ThemeToggle />

          {/* Live wallet pill (fintech standard) */}
          {walletBadge && (
            <Link
              href={walletBadge.href}
              aria-label={`Wallet balance ₹${safeInr.toFixed(2)}`}
              title="Available Interview Balance"
              className="hidden h-10 items-center gap-2 rounded-xl border border-accent-cyan/25 bg-accent-cyan/10 pl-2.5 pr-3 shadow-xs transition-colors hover:border-accent-cyan/40 hover:bg-accent-cyan/15 md:inline-flex"
            >
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" aria-hidden="true" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
              </span>
              <Wallet aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-cyan" />
              <span className="text-[13px] font-bold tabular-nums leading-none text-accent-cyan">
                ₹{safeInr.toFixed(2)}
              </span>
              <span className="hidden border-l border-accent-cyan/20 pl-2 text-[11px] font-semibold tabular-nums leading-none text-ink-muted xl:inline">
                {safeCredits} cr
              </span>
            </Link>
          )}

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              aria-label="View notifications"
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              onClick={toggleNotifications}
              className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border shadow-xs transition-colors ${
                notificationsOpen
                  ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
                  : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <Bell aria-hidden="true" className="h-[18px] w-[18px]" />
              {notificationIndicator}
            </button>

            {notificationsOpen && (
              <div
                role="dialog"
                aria-label={notificationTitle}
                className="absolute right-0 top-12 z-[60] w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-surface/95 p-3 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl animate-fadeIn dark:ring-white/5"
              >
                <div className={`flex items-center justify-between border-b border-line ${notificationHeaderClassName}`}>
                  <p className="text-sm font-bold text-ink">{notificationTitle}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNotificationsOpen(false);
                      onNotificationsOpenChange?.(false);
                    }}
                    className="cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-accent-cyan transition-colors hover:bg-surface-2"
                  >
                    Close
                  </button>
                </div>
                <div className={`mt-3 space-y-2 ${notificationBodyClassName}`}>
                  {notificationBody}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={toggleProfileDropdown}
              aria-label={profileTitle}
              aria-expanded={profileDropdownOpen}
              aria-haspopup="menu"
              title={profileTitle}
              className={`flex h-10 cursor-pointer items-center gap-2 rounded-2xl border py-1 pl-1 pr-1 shadow-xs transition-colors sm:pr-2 ${
                profileDropdownOpen
                  ? 'border-accent-cyan/40 bg-accent-cyan/10'
                  : 'border-line bg-surface hover:border-line-strong hover:bg-surface-2'
              }`}
            >
              <span
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${profileAvatarClassName} text-xs font-bold text-white shadow-xs ring-1 ring-white/20`}
              >
                {profileInitials}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-emerald-500"
                />
              </span>

              <span className="hidden max-w-[150px] flex-col items-start leading-tight md:flex">
                <span className="w-full truncate text-left text-[13px] font-semibold text-ink">
                  {profileName}
                </span>
                <span className={`w-full truncate text-left text-[10px] text-ink-muted ${profileSubtitleClassName}`}>
                  {profileSubtitle}
                </span>
              </span>

              <ChevronDown
                aria-hidden="true"
                className={`hidden h-4 w-4 shrink-0 text-ink-muted transition-transform duration-200 md:block ${
                  profileDropdownOpen ? 'rotate-180 text-accent-cyan' : ''
                }`}
              />
            </button>

            {profileDropdownOpen && (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-0 top-12 z-[60] w-72 overflow-hidden rounded-2xl border border-line bg-surface/95 shadow-2xl ring-1 ring-black/5 backdrop-blur-xl animate-fadeIn dark:ring-white/5"
              >
                {/* Identity card */}
                <div className="border-b border-line/70 bg-surface-2/50 p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${profileAvatarClassName} text-sm font-bold text-white shadow-xs ring-1 ring-white/20`}
                    >
                      {profileInitials}
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface-2 bg-emerald-500"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-ink">{profileName}</span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">{profileSubtitle}</span>
                    </span>
                  </div>
                  {walletBadge && (
                    <div className="mt-3 flex items-center justify-between rounded-xl border border-line/70 bg-surface px-3 py-2">
                      <span className="text-[11px] font-medium text-ink-muted">Wallet Balance</span>
                      <span className="font-mono text-[11px] font-bold tabular-nums text-accent-cyan">
                        ₹{safeInr.toFixed(2)} · {safeCredits} cr
                      </span>
                    </div>
                  )}
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  <Link
                    role="menuitem"
                    href={profileHref}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <User aria-hidden="true" className="h-4 w-4 text-ink-faint" />
                    <span>{profileTitle}</span>
                  </Link>

                  <Link
                    role="menuitem"
                    href={walletBadge?.href || (brandHref.startsWith('/recruiter') ? '/recruiter/billing' : '/candidate/wallet')}
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    <Wallet aria-hidden="true" className="h-4 w-4 text-ink-faint" />
                    <span>Credits &amp; Passbook</span>
                  </Link>
                </div>

                {/* Sign out */}
                <div className="border-t border-line/70 p-1.5">
                  <button
                    role="menuitem"
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      void onLogout();
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13px] font-semibold text-rose-600 transition-colors hover:bg-rose-500/10 dark:text-rose-400"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4 text-rose-500" />
                    <span>{logoutLabel}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:bg-surface-2 xl:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* ================= MOBILE DRAWER ================= */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="border-t border-line bg-header backdrop-blur-xl animate-fadeIn xl:hidden"
        >
          <div className="mx-auto max-h-[calc(100vh-4rem)] max-w-7xl space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {/* Profile card */}
            <Link
              href={profileHref}
              onClick={closeMobileMenu}
              className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 transition-colors hover:border-accent-cyan/40"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${profileAvatarClassName} text-sm font-bold text-white shadow-sm`}
                >
                  {profileInitials}
                  <span
                    aria-hidden="true"
                    className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500"
                  />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-ink transition-colors group-hover:text-accent-cyan">
                    {profileName}
                  </span>
                  <span className={`mt-0.5 block text-accent-cyan ${drawerProfileSubtitleClassName}`}>
                    {drawerProfileSubtitle}
                  </span>
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-ink-muted transition-colors group-hover:text-accent-cyan">
                Profile →
              </span>
            </Link>

            {/* Wallet summary (mobile) */}
            {walletBadge && (
              <Link
                href={walletBadge.href}
                onClick={closeMobileMenu}
                className="flex items-center justify-between gap-3 rounded-xl border border-accent-cyan/25 bg-accent-cyan/10 p-3 text-xs font-semibold text-ink"
              >
                <span className="flex items-center gap-2">
                  <Wallet aria-hidden="true" className="h-4 w-4 text-accent-cyan" />
                  <span>Wallet Balance</span>
                </span>
                <span className="font-mono font-bold tabular-nums text-accent-cyan">
                  ₹{safeInr.toFixed(2)} · {safeCredits} cr
                </span>
              </Link>
            )}

            {/* Navigation */}
            <nav aria-label="Mobile" className="space-y-1">
              <p className="px-3 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                Navigation
              </p>
              {navLinks.map((item) => {
                const isActive = isNavItemActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={closeMobileMenu}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex h-11 items-center justify-between gap-3 rounded-xl border px-2.5 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-accent-cyan/25 bg-accent-cyan/10 text-accent-cyan'
                        : 'border-transparent text-ink-2 hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          isActive ? 'bg-accent-cyan/15' : 'bg-surface-2'
                        }`}
                      >
                        {Icon && (
                          <Icon
                            aria-hidden="true"
                            className={`h-4 w-4 ${isActive ? 'text-accent-cyan' : 'text-ink-muted'}`}
                          />
                        )}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    {isActive && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-cyan" aria-hidden="true" />}
                  </Link>
                );
              })}

              {drawerExtra?.(closeMobileMenu)}
            </nav>

            {/* Sign out */}
            <div className="border-t border-line pt-3">
              <button
                type="button"
                onClick={onLogout}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-500/20 dark:text-rose-400"
              >
                <LogOut aria-hidden="true" className="h-4 w-4" />
                <span>{logoutLabel}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
