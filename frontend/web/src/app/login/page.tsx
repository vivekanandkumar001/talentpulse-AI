'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { apiFetch, apiJson, persistSession, clearSession } from '@/lib/api';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
  Mail,
  Lock,
  AlertCircle,
  Info,
  Building2,
  UserPlus } from 'lucide-react';
import { LoginValidationSchema, LoginFormData } from '@/lib/validations/login';
import { Navbar } from '@/components/Navbar';
import { AuthCard, buttonClass, inputClass } from '@/components/ui';

interface FormLabelProps {
  label: string;
  required?: boolean;
  icon?: React.ReactNode;
  htmlFor?: string;
}

export const FormLabel = ({ label, required = true, icon, htmlFor }: FormLabelProps) => (
  <label
    htmlFor={htmlFor}
    className="inline-flex items-center gap-1.5 text-sm font-medium text-ink mb-1.5"
  >
    {icon && <span className="text-accent-cyan shrink-0">{icon}</span>}
    <span>{label}</span>
    {required && (
      <span className="text-accent-rose font-bold" aria-hidden="true">
        *
      </span>
    )}
  </label>
);

const TRUST_BADGES = [
  {
    icon: ShieldCheck,
    color: 'text-accent-cyan',
    title: 'Server-Enforced RBAC',
    desc: 'Role-based access control is enforced on the server, not just the browser.',
  },
  {
    icon: Lock,
    color: 'text-accent-indigo',
    title: 'Encrypted Sessions',
    desc: 'Passwords hashed with bcrypt and sessions secured with HttpOnly cookies.',
  },
  {
    icon: Building2,
    color: 'text-accent-emerald',
    title: 'Org-Scoped Data',
    desc: 'Organization-scoped data isolation for recruiter and admin workflows.',
  },
];

function normalizeRole(rawRole: unknown): 'candidate' | 'recruiter' | 'super_admin' {
  const role = String(rawRole || '').trim().toLowerCase();
  if (role === 'super_admin') return 'super_admin';
  if (role === 'admin' || role === 'hr' || role === 'recruiter') return 'recruiter';
  return 'candidate';
}

function isSafeNext(path: string | null, role: 'candidate' | 'recruiter' | 'super_admin'): boolean {
  if (!path || typeof path !== 'string') return false;
  const p = path.trim();
  if (!p.startsWith('/') || p.startsWith('//')) return false;
  // Prevent protocol-relative / absolute URLs or path traversal.
  if (/^[a-z]+:/i.test(p) || p.includes('..') || p.includes('\\')) return false;
  if (role === 'candidate') return p.startsWith('/candidate');
  if (role === 'recruiter') return p.startsWith('/recruiter');
  return p.startsWith('/super-admin') || p.startsWith('/admin');
}

function roleHome(role: 'candidate' | 'recruiter' | 'super_admin'): string {
  if (role === 'super_admin') return '/super-admin';
  if (role === 'recruiter') return '/recruiter/dashboard';
  return '/candidate/dashboard';
}

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginErrorMsg, setLoginErrorMsg] = useState<string>('');
  const [networkError, setNetworkError] = useState<string>('');
  const [redirectNotice, setRedirectNotice] = useState<string | null>(null);
  const [nextPath, setNextPath] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Purge any accidental credential query parameters from URL search bar immediately
    const urlParams = new URLSearchParams(window.location.search);
    if (
      urlParams.has('password') ||
      urlParams.has('email') ||
      urlParams.has('pass') ||
      urlParams.has('pwd')
    ) {
      urlParams.delete('password');
      urlParams.delete('email');
      urlParams.delete('pass');
      urlParams.delete('pwd');
      const cleanSearch = urlParams.toString();
      const cleanUrl = window.location.pathname + (cleanSearch ? `?${cleanSearch}` : '');
      window.history.replaceState(null, '', cleanUrl);
    }

    // Check URL params for redirect and errors
    const nextParam =
      urlParams.get('next') ||
      urlParams.get('redirect') ||
      urlParams.get('returnUrl') ||
      urlParams.get('return_url');
    const errorParam = urlParams.get('error');

    if (errorParam === 'unauthorized_admin') {
      setLoginErrorMsg('Access restricted: You do not have super admin permissions to view this section.');
    } else if (errorParam === 'session_expired') {
      setLoginErrorMsg('Your session has expired. Please sign in again.');
    } else if (errorParam) {
      setLoginErrorMsg(errorParam.replace(/_/g, ' '));
    }

    if (nextParam || urlParams.has('logout')) {
      clearSession();
      if (nextParam) {
        setNextPath(nextParam);
        if (!errorParam) {
          if (nextParam.includes('/candidate/interview/')) {
            setRedirectNotice('Please sign in to access your interview session.');
          } else {
            setRedirectNotice('Please sign in to continue.');
          }
        }
      }
    } else {
      // Option 1: If the user has a VALID session, redirect directly to dashboard.
      // Verify server-side (cookie may be gone even if localStorage lingers) — never trust localStorage alone.
      void (async () => {
        try {
          const me = await apiJson<{ role?: string } | null>('/api/auth/me', {}, { skipCache: true });
          const role = normalizeRole(me?.role || '');
          if (me && me.role) {
            router.replace(roleHome(role));
            return;
          }
          clearSession();
        } catch {
          clearSession();
        }
      })();
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitted },
  } = useForm<LoginFormData>({
    resolver: zodResolver(LoginValidationSchema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setLoginErrorMsg('');
    setNetworkError('');
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email.trim().toLowerCase(),
          password: data.password,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      const result: any = contentType.includes('application/json')
        ? await res.json()
        : null;

      if (!res.ok) {
        if (res.status === 403 && result?.isUnverified && result?.redirectUrl) {
          if (typeof window !== 'undefined') {
            window.location.assign(result.redirectUrl);
          } else {
            router.push(result.redirectUrl);
          }
          return;
        }

        if (res.status === 503) {
          setNetworkError(result?.error || 'Database service is temporarily unavailable. Please make sure MongoDB is running.');
        } else if (res.status === 0 || res.status >= 500) {
          setNetworkError('We could not reach the authentication service. Please check your connection and try again.');
        }

        const errorDetail =
          (typeof result?.error === 'string' && result.error) ||
          (typeof result?.message === 'string' && result.message) ||
          (typeof result?.detail === 'string' && result.detail) ||
          (res.status === 401
            ? 'Invalid email or password. Please check your credentials.'
            : res.status === 503
              ? (result?.error || 'Database service is temporarily unavailable.')
              : res.status === 502 || res.status === 504
                ? 'Cannot reach the backend server. Please verify backend is running.'
                : `Sign in failed (${res.status}). Please try again.`);
        throw new Error(typeof errorDetail === 'string' ? errorDetail : 'Login failed. Please check credentials.');
      }

      persistSession(result?.token || result?.access_token, undefined, result?.user || {});

      const normalizedRole = normalizeRole(result?.user?.role || '');
      let destination = roleHome(normalizedRole);
      if (typeof result?.redirectUrl === 'string' && result.redirectUrl.trim()) {
        const requested = result.redirectUrl.trim();
        if (isSafeNext(requested, normalizedRole)) {
          destination = requested;
        }
      }

      if (typeof window !== 'undefined') {
        if (isSafeNext(nextPath, normalizedRole)) {
          destination = nextPath as string;
        }
        window.location.assign(destination);
      } else {
        router.push(destination);
      }
    } catch (err: unknown) {
      const message = (err as Error)?.message || 'Login failed. Please try again.';
      if (!networkError) {
        setLoginErrorMsg(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-dvh bg-canvas text-ink font-sans flex flex-col relative overflow-y-auto overflow-x-hidden">
      {/* Ambient radial background glows */}
      <div className="absolute top-0 left-0 w-full h-full ambient-glow-cyan pointer-events-none z-0" />
      <div className="absolute bottom-0 right-0 w-full h-full ambient-glow-indigo pointer-events-none z-0" />

      <div className="relative z-10 flex flex-col h-full">
        <Navbar />

        <main className="flex-1 min-h-0 overflow-y-auto">
          <div className="min-h-full w-full max-w-7xl mx-auto px-6 py-10 flex items-center justify-center">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-center">

            {/* SECTION A: SIGN-IN FORM */}
            <motion.div
              initial={{ opacity: 1, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full order-1 lg:order-2 lg:col-span-5"
            >
              {/* Premium auth card (shared component) */}
              <AuthCard className="max-w-md mx-auto" innerClassName="flex flex-col gap-6">
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/30">
                      <ShieldCheck className="h-5 w-5 text-white" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[11px] font-mono font-bold uppercase tracking-wider text-accent-cyan">
                        Secure Access
                      </span>
                      <h2 className="text-2xl font-bold text-ink tracking-tight leading-tight">Welcome back</h2>
                    </div>
                  </div>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Sign in to continue to your Progeni Atlas workspace.
                  </p>
                </div>

                {redirectNotice && !loginErrorMsg && !networkError && (
                  <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan text-xs font-medium flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-accent-cyan shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{redirectNotice}</span>
                  </div>
                )}

                {loginErrorMsg && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-accent-amber text-xs font-medium flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{loginErrorMsg}</span>
                  </div>
                )}

                {networkError && (
                  <div
                    role="alert"
                    className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-accent-rose text-xs font-medium flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-accent-rose shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{networkError}</span>
                  </div>
                )}

                <form
                  action="#"
                  method="POST"
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div>
                    <FormLabel htmlFor="login-email" label="Email address" required />
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3.5 top-1/2 w-4 h-4 -translate-y-1/2 text-ink-faint"
                        aria-hidden="true"
                      />
                      <input
                        {...register('email')}
                        id="login-email"
                        type="email"
                        inputMode="email"
                        autoComplete="username"
                        placeholder="Please enter your email address"
                        aria-invalid={isSubmitted && !!errors.email}
                        aria-describedby={isSubmitted && errors.email ? 'email-error' : undefined}
                        className={`${inputClass(Boolean(isSubmitted && errors.email))} pl-11`}
                      />
                    </div>
                    {isSubmitted && errors.email && (
                      <p id="email-error" className="text-xs text-accent-rose mt-1.5 block">
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <FormLabel htmlFor="login-password" label="Password" required />
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3.5 top-1/2 z-10 w-4 h-4 -translate-y-1/2 text-ink-faint"
                        aria-hidden="true"
                      />
                      <input
                        {...register('password')}
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Please enter your password"
                        aria-invalid={isSubmitted && !!errors.password}
                        aria-describedby={isSubmitted && errors.password ? 'password-error' : undefined}
                        className={`${inputClass(Boolean(isSubmitted && errors.password))} pl-11 pr-12`}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowPassword((prev) => !prev);
                        }}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        aria-pressed={showPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink focus:outline-none cursor-pointer"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 pointer-events-none" aria-hidden="true" />
                        ) : (
                          <Eye className="w-4 h-4 pointer-events-none" aria-hidden="true" />
                        )}
                      </button>
                    </div>
                    {isSubmitted && errors.password && (
                      <p id="password-error" className="text-xs text-accent-rose mt-1.5 block">
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-end pt-1">
                    <Link
                      href="/forgot-password"
                      className="text-xs text-accent-cyan transition-colors font-medium cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    aria-busy={isSubmitting}
                    className={
                      isSubmitting
                        ? buttonClass('secondary', 'lg', 'pill', 'w-full cursor-wait opacity-70')
                        : buttonClass('primary', 'lg', 'pill', 'w-full')
                    }
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                        <span>Authenticating...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in securely</span>
                        </>
                    )}
                  </button>
                </form>

                {/* Secondary action: create account */}
                <div className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <span className="w-full border-t border-line" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-surface px-3 text-[11px] font-mono font-bold uppercase tracking-wider text-ink-muted">
                        New here?
                      </span>
                    </div>
                  </div>

                  <Link
                    href="/register"
                    className={buttonClass('secondary', 'md', 'pill', 'w-full')}
                  >
                    <UserPlus className="w-4 h-4 text-accent-cyan" aria-hidden="true" />
                    <span>Create an account</span>
                  </Link>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-[11px] text-ink-muted">
                    <ShieldCheck className="h-3.5 w-3.5 text-accent-emerald" aria-hidden="true" />
                    <span>256-bit TLS encrypted session</span>
                  </div>
                </div>
              </AuthCard>
            </motion.div>

            {/* SECTION B: BORDERLESS HERO + PRODUCT VISUAL */}
            <motion.div
              initial={{ opacity: 1, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="hidden lg:block relative w-full order-2 lg:order-1 lg:col-span-7"
            >
              {/* soft gradient wash tying the hero to the background */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-x-10 -inset-y-8 -z-10 bg-[radial-gradient(60%_50%_at_20%_0%,rgba(6,182,212,0.14),transparent_70%),radial-gradient(50%_45%_at_90%_80%,rgba(99,102,241,0.12),transparent_70%)]"
              />

              <div className="space-y-8">
                {/* Headline block — freed from any box */}
                <div>
                  <span className="text-xs font-mono font-bold text-accent-cyan uppercase tracking-[0.22em] block">
                    Secure Workspace Access
                  </span>
                  <h1 className="mt-4 text-4xl sm:text-5xl xl:text-[3.4rem] font-black tracking-tight leading-[1.06] text-ink">
                    Better interviews.{' '}
                    <span className="block bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 bg-clip-text text-transparent">
                      Smarter decisions.
                    </span>
                  </h1>
                  <p className="mt-5 text-base text-ink-muted leading-relaxed max-w-xl">
                    Progeni Atlas helps teams run structured, AI-assisted interviews, evaluate candidate
                    capability, and make confident hiring decisions across every stage.
                  </p>
                </div>

                {/* Borderless player with ambient glow + organic live overlays */}
                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute -inset-6 rounded-[36px] bg-gradient-to-r from-cyan-500/25 via-indigo-500/10 to-cyan-500/25 blur-3xl"
                  />
                  <div className="relative overflow-hidden rounded-2xl ring-1 ring-cyan-400/25 shadow-2xl shadow-cyan-500/20">
                    <Image
                      src="/interview-demo.jpg"
                      alt="A candidate taking a Progeni Atlas two-way technical video interview"
                      width={1024}
                      height={682}
                      priority
                      className="h-[clamp(230px,36vh,400px)] w-full object-cover"
                    />

                    {/* live status tag, overlay-native */}
                    <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-md ring-1 ring-white/15">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Interview in progress
                    </div>

                    {/* bottom caption bar, part of the player chrome */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/75 via-black/30 to-transparent px-4 pb-3.5 pt-12 text-[11px] font-medium text-white/90">
                      <span>Live AI Technical Interview</span>
                      <span className="hidden sm:inline text-white/70">Candidate &middot; Round 2</span>
                    </div>
                  </div>
                </div>

                {/* Value props as crisp, scannable badges */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {TRUST_BADGES.map((badge) => (
                    <span
                      key={badge.title}
                      title={badge.desc}
                      className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3.5 py-2 text-xs font-semibold text-ink shadow-sm backdrop-blur-sm transition-colors hover:border-cyan-400/40"
                    >
                      <badge.icon className={`h-4 w-4 ${badge.color}`} aria-hidden="true" />
                      {badge.title}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
