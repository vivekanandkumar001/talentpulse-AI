'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  BrainCircuit,
  Code2,
  ShieldCheck,
  FileText,
  Video,
  Sparkles,
  Building2,
  CheckCircle2,
  Mic2,
  BarChart3,
  PlayCircle,
  Terminal,
  Cpu,
  Flame,
  Check } from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FaqSection } from '@/components/FaqSection';
import { apiJson } from '@/lib/api';

const featureCards = [
  { icon: Video, title: 'Two-Way AI Video Interviews', text: 'A natural candidate ↔ AI interviewer conversation with live voice, video and adaptive follow-up questions.' },
  { icon: BrainCircuit, title: 'Resume + JD + Role Intelligence', text: 'The interview context is built from the candidate resume, job description, target role and skills.' },
  { icon: Code2, title: 'Live Coding & System Design', text: 'Assess coding, architecture and technical reasoning inside a focused interview workspace.' },
  { icon: ShieldCheck, title: 'AI Proctoring', text: 'Monitor interview integrity signals such as focus changes and unauthorized actions.' },
  { icon: BarChart3, title: 'Evidence-Based Scorecards', text: 'Turn answers, coding performance and competency signals into a structured assessment.' },
];

const technicalInterviewTracks = [
  {
    title: 'Distributed Systems & Backend Architecture',
    category: 'Backend Track',
    level: 'Advanced',
    levelColor: 'text-accent-rose bg-accent-rose/10 border-accent-rose/30',
    desc: 'Deep dives on distributed concurrency, cache invalidation, locking semantics & high-throughput pipelines.',
  },
  {
    title: 'Frontend Architecture & Modern Web Systems',
    category: 'Frontend Track',
    level: 'Core',
    levelColor: 'text-accent-blue bg-accent-blue/10 border-accent-blue/30',
    desc: 'Tests real DOM performance, state reactivity, micro-frontends, rendering pipelines and accessibility standards.',
  },
  {
    title: 'Algorithms, Data Structures & Complexity',
    category: 'Computer Science Track',
    level: 'Advanced',
    levelColor: 'text-accent-rose bg-accent-rose/10 border-accent-rose/30',
    desc: 'Probes dynamic programming, graph invariants, transformer latency, memory bounds, and algorithmic optimization.',
  },
  {
    title: 'Engineering Leadership & Architectural Tradeoffs',
    category: 'System & Leadership',
    level: 'Staff / Lead',
    levelColor: 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/30',
    desc: 'Evaluates architecture trade-offs, cross-functional engineering leadership, fault tolerance, and incident resolution.',
  },
];

const benefits = [
  ['AI-Driven Technical Assessment', 'Evaluate demonstrated skills, not just resume keywords.', BrainCircuit],
  ['Consistent Candidate Evaluation', 'Use structured criteria across interviews and roles.', CheckCircle2],
  ['Real-Time Interviewing', 'Let the AI interviewer listen, ask and adapt naturally.', Mic2],
  ['Secure AI Proctoring', 'Protect interview integrity throughout the session.', ShieldCheck],
  ['Automated Scorecards', 'Generate competency breakdowns and evidence for review.', FileText],
  ['Enterprise Governance', 'Centralize organizations, users, interviews and audit visibility.', Building2],
];

const pricing = [
  {
    name: 'Free Starter',
    price: '₹0',
    credits: '10 Credits',
    note: 'Free full technical screening round (20 mins)',
    items: [
      '1 Full AI Technical Mock Round (20 mins)',
      'Live Coding & Spoken Voice Analysis',
      'Instant Scorecard & Feedback',
      'No Credit Card Required',
    ],
    popular: false,
    cta: 'Start Free Trial',
    href: '/register',
    periodLabel: '',
  },
  {
    name: 'Warm-up Pack',
    price: '₹49',
    credits: '50 Credits',
    note: 'Quick practice before real interview',
    items: [
      '50 AI Credits (100 mins practice)',
      '3 Full DSA or Behavioral Rounds',
      'Turn-by-Turn Audio & Transcripts',
      'Target Role & Topic Tailoring',
    ],
    popular: false,
    cta: 'Get 50 Credits',
    href: '/candidate/wallet',
    periodLabel: 'one-time',
  },
  {
    name: 'Placement Ready',
    price: '₹99',
    credits: '100 Credits',
    note: 'Most chosen for campus & job prep',
    items: [
      '100 AI Credits (200 mins practice)',
      '6-7 Full Technical & Design Rounds',
      'Resume Defense + Custom JD Parsing',
      'Company Benchmark Scoring (TCS, Google)',
    ],
    popular: true,
    cta: 'Get 100 Credits (Save 30%)',
    href: '/candidate/wallet',
    periodLabel: 'one-time',
  },
  {
    name: 'Pro Mastery',
    price: '₹199',
    credits: '200 Credits',
    note: 'Best value for placements',
    items: [
      '200 AI Credits (400 mins practice)',
      '13+ Full Technical, DSA & HR Rounds',
      'Company-Specific Question Sets',
      'Priority AI Speech & Audio Latency',
    ],
    popular: false,
    cta: 'Get 200 Credits',
    href: '/candidate/wallet',
    periodLabel: 'one-time',
  },
];

export default function Home() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [activeCodeTab, setActiveCodeTab] = useState<'python' | 'cpp' | 'ts'>('python');
  const [timerSeconds, setTimerSeconds] = useState(462); // 07:42
  const [activePricing, setActivePricing] = useState(pricing);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await apiJson<{ role?: string; user?: { role?: string } } | null>('/api/auth/me', {}, { skipCache: true });
        const role = String(me?.user?.role || me?.role || '').toLowerCase().trim();
        if (!cancelled && me && role) {
          const target = role === 'super_admin'
            ? '/super-admin'
            : (role === 'recruiter' || role === 'admin' || role === 'hr' || role === 'employer')
              ? '/recruiter/dashboard'
              : '/candidate/dashboard';
          router.replace(target);
          return;
        }
      } catch {
        // Not authenticated — stay on the marketing page
      }
      if (!cancelled) setCheckingAuth(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Keep homepage pricing in sync with packages managed in Super Admin.
  // Falls back to the static `pricing` list above if the API is unreachable.
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch('/api/packages');
        if (!res.ok) return;
        const data = await res.json();
        if (!data?.success || !Array.isArray(data.packages) || data.packages.length === 0) return;

        const candidatePkgs = data.packages.filter(
          (p: any) => p.target_audience === 'individual' || p.target_audience === 'both'
        );
        if (candidatePkgs.length === 0) return;

        const mapped = candidatePkgs.map((pkg: any) => {
          const priceNum = Number(pkg.price ?? pkg.monthlyPrice ?? 0);
          const creditsNum = Number(pkg.credits) || 0;
          const rounds = Number(pkg.included_interviews) || 1;
          const nameLower = String(pkg.name || '').toLowerCase();
          const isPopular = Boolean(
            pkg.popular || nameLower.includes('popular') || nameLower.includes('placement')
          );

          return {
            name: pkg.name || 'Practice Plan',
            price: priceNum === 0 ? '₹0' : `₹${priceNum.toLocaleString('en-IN')}`,
            credits: creditsNum > 0
              ? `${creditsNum.toLocaleString('en-IN')} Credits`
              : `${rounds} Mock Round${rounds > 1 ? 's' : ''}`,
            note: pkg.description || (priceNum === 0 ? 'Free full technical screening round' : 'AI mock interview practice pack'),
            items: Array.isArray(pkg.features) && pkg.features.length > 0
              ? pkg.features
              : [
                  `${rounds} Full AI Technical Mock Round${rounds > 1 ? 's' : ''}`,
                  'Live Coding & Spoken Voice Analysis',
                  'Instant Scorecard & Feedback',
                ],
            popular: isPopular,
            cta: priceNum === 0
              ? 'Start Free Trial'
              : creditsNum > 0
                ? `Get ${creditsNum.toLocaleString('en-IN')} Credits`
                : `Buy Pack (₹${priceNum.toLocaleString('en-IN')})`,
            href: priceNum === 0 ? '/register' : '/candidate/wallet',
            periodLabel: priceNum === 0
              ? ''
              : pkg.billing_period === 'monthly'
                ? '/ month'
                : pkg.billing_period === 'yearly'
                  ? '/ year'
                  : 'one-time',
          };
        });

        if (isMounted) setActivePricing(mapped);
      } catch (err) {
        console.warn('[HomePage] Using fallback pricing due to fetch error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  // NOTE: Never gate the public marketing page on an async auth check.
  // Returning a spinner here during SSR/prerender serves an empty page to
  // search-engine crawlers (no h1, no copy, no internal links), which made the
  // homepage unindexable. Instead we always render the full page and only show
  // a small non-blocking "redirecting" pill while the session check runs.
  return (
    <main className="min-h-screen bg-canvas text-ink overflow-x-clip selection:bg-cyan-500/30 selection:text-accent-cyan">
      <Navbar />

      {checkingAuth && (
        <div
          className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-line bg-surface/90 px-4 py-2 text-[11px] font-medium text-ink-muted shadow-lg backdrop-blur-md"
          role="status"
          aria-live="polite"
        >
          <div className="h-3 w-3 animate-spin rounded-full border border-accent-cyan border-t-transparent" />
          Checking your session…
        </div>
      )}

      {/* =====================================================================
          HERO SECTION - SAKSHAAT-STYLE DYNAMIC AMBIENT MOTION
          ===================================================================== */}
      <section id="hero" className="relative border-b border-line overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Masked Geometric Grid */}
        <div className="sakshaat-grid" />

        {/* Floating Ambient Glow Orbs (Sakshaat lpDriftA & lpDriftB) */}
        <div className="absolute -left-20 -top-32 h-[680px] w-[680px] rounded-full bg-radial from-cyan-500/20 via-cyan-500/5 to-transparent blur-3xl pointer-events-none anim-drift-a" />
        <div className="absolute right-[-140px] top-10 h-[620px] w-[620px] rounded-full bg-radial from-indigo-500/20 via-purple-500/5 to-transparent blur-3xl pointer-events-none anim-drift-b" />
        <div className="absolute left-1/3 bottom-0 h-[480px] w-[480px] rounded-full bg-radial from-amber-500/10 via-cyan-500/5 to-transparent blur-3xl pointer-events-none anim-drift-a" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-10">
          
          {/* Left Column: Headline & Action */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {/* Live Kicker Pill with Radar Beacon Dot & Brand Aura */}
            <div className="relative inline-flex mb-6">
              <span className="absolute -inset-1 rounded-full bg-cyan-400/25 blur-md anim-aura pointer-events-none" />
              <div className="relative inline-flex items-center gap-2.5 rounded-full border border-cyan-400/40 bg-surface/90 px-3.5 py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.08em] sm:tracking-[0.18em] text-accent-cyan shadow-sm backdrop-blur-md whitespace-nowrap">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 shadow-[0_0_8px_#34d399]" />
                </span>
                Spoken Interviews · Live Coding · Instant Dossier
              </div>
            </div>

            {/* Title with Gradient Highlight */}
            <h1 className="max-w-2xl text-4xl font-black tracking-tight text-ink sm:text-5xl lg:text-6xl lg:leading-[1.06]">
              Face your AI interview
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-400 bg-clip-text text-transparent">
                before it&apos;s real.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-ink-muted sm:text-lg">
              Spoken mock interviews with an adaptive AI interviewer. Solve real coding problems on a live editor, defend your system architecture, and receive an audit-ready scorecard.
            </p>

            {/* CTAs with Sheen Sweeper Effect */}
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row items-stretch sm:items-center">
              <Link
                href="/register"
                className="sheen-sweeper group relative inline-flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 px-7 py-4 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:brightness-110 hover:shadow-cyan-500/35 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Start Free Interview</span>
                </Link>
              
              <a
                href="#live-demo"
                className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-line-strong bg-surface/80 px-6 py-4 text-sm font-semibold text-ink backdrop-blur-md transition-all duration-300 hover:border-cyan-400/50 hover:bg-surface-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlayCircle className="h-4 w-4 text-accent-cyan" />
                <span>Watch Interactive Demo</span>
              </a>
            </div>

            {/* Checked features list with micro-animations */}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2.5 text-xs text-ink-muted">
              {['Live DSA Coding', 'Spoken Voice Follow-ups', 'MediaPipe Proctoring', 'Server-Graded Rubrics'].map((item, idx) => (
                <span key={item} className="inline-flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-accent-cyan" />
                  {item}
                </span>
              ))}
            </div>

            {/* Trust badge with Sakshaat-style twinkling star sparks */}
            <div className="relative mt-8 max-w-sm">
              {/* Twinkling Star Sparks */}
              <svg className="trust-sparkle -top-3 -right-2 w-5 h-5 text-accent-cyan fill-cyan-400" viewBox="0 0 24 24">
                <path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" />
              </svg>
              <svg className="trust-sparkle top-7 -left-3 w-3.5 h-3.5 text-indigo-400 fill-indigo-400" style={{ animationDelay: '1.2s' }} viewBox="0 0 24 24">
                <path d="M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z" />
              </svg>

              {/* Rotating Conic Border Frame */}
              <div className="conic-border-box">
                <div className="sheen-sweeper relative z-10 flex items-center gap-3.5 rounded-[1.15rem] bg-surface/95 px-4 py-3 backdrop-blur-md">
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-indigo-600 text-white shadow-md shadow-cyan-500/20">
                    <span className="ping-ripple" />
                    <Check className="h-5 w-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-accent-cyan">Autonomous Technical Interviews</p>
                    <p className="text-xs font-semibold text-ink">
                      <strong className="font-extrabold text-sm text-cyan-500">Real-Time</strong> Voice, Live Code &amp; Proctoring
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Column: Interactive Live Video Call & Code Editor Mockup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}
            className="relative"
          >
            {/* Ambient Aura Background */}
            <div className="absolute -inset-4 rounded-xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/15 to-purple-500/20 blur-2xl pointer-events-none anim-aura" />

            {/* The Live Video Interview Room Window (Sakshaat Style) */}
            <div className="relative overflow-hidden rounded-2xl border border-cyan-400/40 bg-inverse-canvas text-white shadow-2xl shadow-cyan-500/15">
              
              {/* Window Titlebar / Live Status Bar */}
              <div className="flex items-center justify-between border-b border-inverse-line bg-inverse-surface-2/90 px-4 py-3 text-xs backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-rose-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-amber-500/80 inline-block" />
                    <span className="h-3 w-3 rounded-full bg-emerald-500/80 inline-block" />
                  </div>
                  <span className="font-mono text-inverse-ink-muted">|</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    <span className="font-semibold text-inverse-emerald">Live Call</span>
                    <span className="font-mono text-[11px] text-inverse-ink-muted">· {formatTimer(timerSeconds)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-cyan-400/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-inverse-cyan">
                    Live DSA & Concurrency Round
                  </span>
                  <span className="font-mono text-[11px] text-inverse-ink-muted">Python 3.12</span>
                </div>
              </div>

              {/* Dual Video Tiles: AI Interviewer & Candidate */}
              <div className="grid gap-3 p-3.5 sm:grid-cols-2 bg-inverse-canvas/70">
                
                {/* AI Interviewer Viewport */}
                <div className="relative overflow-hidden rounded-xl border border-cyan-400/60 bg-inverse-surface-2 shadow-lg ring-2 ring-cyan-400/30">
                  <div className="relative h-44 w-full overflow-hidden bg-inverse-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/avatars/interviewer_female.jpg"
                      alt="Sarah Chen"
                      className="h-full w-full object-cover object-center interviewer-sway brightness-105 contrast-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent opacity-80" />
                    
                    {/* Active Voice Equalizer Overlay (11 Equalizer Bars) */}
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg bg-inverse-canvas/85 px-2.5 py-1 backdrop-blur-md border border-inverse-line-strong/60">
                        <span className="text-[11px] font-bold text-white">Sarah Chen</span>
                        <span className="text-[9px] font-mono text-inverse-cyan font-semibold uppercase">Lead AI</span>
                      </div>

                      {/* Equalizer Waveform Bars */}
                      <div className="flex items-end gap-1 h-5 px-2 py-1 rounded-md bg-inverse-canvas/85 border border-cyan-500/30 backdrop-blur-md">
                        {[0.2, 0.5, 0.8, 0.4, 0.9, 0.3, 0.7, 1.0, 0.6, 0.4, 0.8].map((delay, i) => (
                          <div
                            key={i}
                            className="voice-bar bg-cyan-400"
                            style={{ animationDelay: `${delay}s`, animationDuration: `${0.8 + (i % 4) * 0.2}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Candidate Video Preview */}
                <div className="relative overflow-hidden rounded-xl border border-inverse-line bg-inverse-surface-2 shadow-md">
                  <div className="relative h-44 w-full overflow-hidden bg-inverse-surface-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/avatars/candidate_male.jpg"
                      alt="Arjun Mehta — Candidate"
                      className="h-full w-full object-cover object-center interviewer-sway brightness-105 contrast-[1.02]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-transparent opacity-90" />

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-lg bg-inverse-canvas/85 px-2.5 py-1 backdrop-blur-md border border-inverse-line">
                        <span className="text-[11px] font-bold text-white">Arjun Mehta</span>
                        <span className="text-[9px] font-mono text-inverse-ink-muted">(Live Stream)</span>
                      </div>

                      <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-inverse-emerald font-medium">
                        <Mic2 className="h-3 w-3" /> Audio Active
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Real-Time Live Code Editor Workspace */}
              <div className="border-t border-inverse-line bg-inverse-canvas p-3.5 font-mono text-xs">
                {/* Code Tabs */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-inverse-line/80">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5 text-inverse-cyan" />
                    <span className="text-[11px] font-bold text-inverse-ink-muted">Solution.py</span>
                  </div>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      onClick={() => setActiveCodeTab('python')}
                      className={`px-2 py-0.5 rounded transition ${activeCodeTab === 'python' ? 'bg-cyan-500/20 text-inverse-cyan border border-cyan-500/40' : 'text-inverse-ink-muted hover:text-white'}`}
                    >
                      Python
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('cpp')}
                      className={`px-2 py-0.5 rounded transition ${activeCodeTab === 'cpp' ? 'bg-cyan-500/20 text-inverse-cyan border border-cyan-500/40' : 'text-inverse-ink-muted hover:text-white'}`}
                    >
                      C++
                    </button>
                    <button
                      onClick={() => setActiveCodeTab('ts')}
                      className={`px-2 py-0.5 rounded transition ${activeCodeTab === 'ts' ? 'bg-cyan-500/20 text-inverse-cyan border border-cyan-500/40' : 'text-inverse-ink-muted hover:text-white'}`}
                    >
                      TypeScript
                    </button>
                  </div>
                </div>

                {/* Code Lines with Syntax Highlighting and Active Line Caret */}
                <div className="space-y-1 text-inverse-ink-muted leading-relaxed">
                  <div className="flex gap-3">
                    <span className="w-4 select-none text-inverse-ink-muted">1</span>
                    <div>
                      <span className="text-inverse-violet">class</span> <span className="text-yellow-300">Solution</span>:
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-4 select-none text-inverse-ink-muted">2</span>
                    <div className="pl-4">
                      <span className="text-inverse-violet">def</span> <span className="text-inverse-cyan">maxSlidingWindow</span>(self, nums: <span className="text-inverse-cyan">list[int]</span>, k: <span className="text-inverse-cyan">int</span>) -&gt; <span className="text-inverse-cyan">list[int]</span>:
                    </div>
                  </div>
                  <div className="flex gap-3 rounded bg-cyan-500/10 py-0.5 -mx-1 px-1 border-l-2 border-cyan-400">
                    <span className="w-4 select-none text-inverse-cyan font-bold">3</span>
                    <div className="pl-4">
                      dq = collections.<span className="text-inverse-cyan">deque</span>()  <span className="text-inverse-ink-faint"># monotonic queue</span><span className="typing-caret" />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-4 select-none text-inverse-ink-muted">4</span>
                    <div className="pl-4">
                      res = []
                    </div>
                  </div>
                </div>

                {/* Real-time Compiler & Execution Badge */}
                <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-500/25 bg-inverse-emerald/10 px-3 py-2 text-[11px] text-inverse-emerald">
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    Execution: 14ms · Memory: 28.2MB
                  </span>
                  <span className="font-mono font-bold text-inverse-emerald">12/12 Automated Tests Passed</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* =====================================================================
          TECHNICAL INTERVIEW TRACKS CAROUSEL
          Continuous marquee scrolling of specialized interview evaluation tracks
          ===================================================================== */}
      <section className="relative border-b border-line bg-surface py-14 overflow-hidden">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-accent-blue">
              <Sparkles className="h-3.5 w-3.5" /> Autonomous Interview Engine
            </div>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-ink">
              Curated Technical Tracks. Production Rigor.
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-ink-faint max-w-md">
            Each track evaluates deep architectural competency, clean code semantics, and real-world system resilience.
          </p>
        </div>

        {/* Horizontal Infinite Marquee Carousel */}
        <div className="relative w-full overflow-hidden mask-linear-gradient">
          <div className="marquee-track-h flex gap-5 py-2">
            {[...technicalInterviewTracks, ...technicalInterviewTracks].map((track, idx) => (
              <div
                key={idx}
                className="group flex w-[380px] shrink-0 flex-col justify-between rounded-xl border border-line bg-surface p-5 shadow-xs transition-all duration-200 hover:border-blue-400 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-accent-blue font-mono">
                      {track.category}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${track.levelColor}`}>
                      {track.level}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-ink mt-2 line-clamp-1">{track.title}</h3>
                  <p className="mt-1.5 text-xs text-ink-muted line-clamp-2 leading-relaxed">{track.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Adaptive Dynamic Questions</span>
                  <span className="font-medium text-accent-blue">Live Workspace</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          CAPABILITIES GRID
          ===================================================================== */}
      <section id="features" className="border-b border-line bg-canvas py-16 px-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-cyan">Platform Capabilities</span>
            <h2 className="mt-2 text-3xl font-black text-ink">Built for Enterprise Rigor</h2>
            <p className="mt-2 text-sm text-ink-muted">Everything needed to screen candidates with authentic technical depth.</p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {featureCards.map(({ icon: Icon, title, text }, idx) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="card-lift-hover rounded-2xl border border-line bg-surface p-5 shadow-sm"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-accent-cyan shadow-sm shadow-cyan-500/10">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-ink">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          HOW IT WORKS (STEP BY STEP)
          ===================================================================== */}
      <section id="how-it-works" className="relative border-b border-line px-5 py-20 sm:px-8 lg:px-10 bg-surface-deep">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-cyan">How It Works</span>
            <h2 className="mt-3 text-3xl font-black text-ink sm:text-4xl">From context to adaptive AI interview</h2>
            <p className="mt-4 text-sm leading-6 text-ink-muted">The interview is personalized before it starts and adapts while the candidate is speaking.</p>
          </div>

          <div className="mt-12 grid gap-4 lg:grid-cols-5">
            {[
              ['01', 'Resume', 'Candidate experience, skills and background parsed atomically.'],
              ['02', 'JD + Role', 'Hiring requirements and competency expectations.'],
              ['03', 'LLM Engine', 'Builds and adapts the real-time dialogue rubric.'],
              ['04', 'Candidate ↔ AI', 'Spoken voice, live code and multi-modal proctoring.'],
              ['05', 'Scorecard', 'Evidence-based audit dossier and technical grading.'],
            ].map(([number, title, text], idx) => (
              <motion.div
                key={number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="card-lift-hover relative rounded-2xl border border-line bg-surface p-5 shadow-sm"
              >
                <span className="text-xs font-mono font-bold text-accent-cyan">{number}</span>
                <h3 className="mt-3 text-base font-bold text-ink">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-ink-muted">{text}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-8 grid gap-4 rounded-2xl bg-cyan-400/5 p-6 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan">Adaptive Dialogue Example</p>
              <p className="mt-2 text-sm text-ink leading-relaxed">
                Candidate explains API scaling → AI evaluates foundational clarity → AI organically probes distributed cache eviction and failure scenarios.
              </p>
            </div>
            <div className="rounded-xl bg-surface p-4 font-mono text-xs text-ink shadow-inner">
              <span className="text-accent-cyan font-bold">AI:</span> &quot;How would you handle cache stampede if 10k workers query the same key?&quot;
              <br /><br />
              <span className="text-purple-500 font-bold">AI analysis:</span> Foundation verified → testing mutex locking &amp; probabilistic early expiration.
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          BENEFITS
          ===================================================================== */}
      <section id="benefits" className="border-b border-line px-5 py-20 sm:px-8 lg:px-10 bg-canvas">
        <div className="mx-auto max-w-7xl">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-emerald">Why Progeni Atlas</span>
            <h2 className="mt-3 text-3xl font-black text-ink sm:text-4xl">Designed for candidates, recruiters and enterprise teams</h2>
            <p className="mt-4 text-sm leading-6 text-ink-muted">One unified platform providing authentic role-specific mock practice and production enterprise screening.</p>
          </div>
          
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(([title, text, Icon], idx) => {
              const BenefitIcon = Icon as React.ElementType;
              return (
                <motion.div
                  key={title as string}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.08 }}
                  className="card-lift-hover rounded-2xl border border-line bg-surface p-5 shadow-sm"
                >
                  <BenefitIcon className="h-5 w-5 text-accent-cyan" />
                  <h3 className="mt-4 text-sm font-bold text-ink">{title as string}</h3>
                  <p className="mt-2 text-xs leading-5 text-ink-muted">{text as string}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <Link
              href="/candidate/dashboard"
              className="card-lift-hover group rounded-2xl border border-cyan-400/30 bg-gradient-to-br from-cyan-500/10 via-surface to-surface p-7 shadow-sm transition hover:border-cyan-400"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-cyan">For Candidates</span>
              <h3 className="mt-2 text-xl font-black text-ink">Practice. Prepare. Perform.</h3>
              <p className="mt-2 text-sm text-ink-muted">Practice interviews, full-length mock exams, live coding, and actionable turn-by-turn dossiers.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent-cyan">
                Candidate Portal </span>
            </Link>

            <Link
              href="/recruiter/dashboard"
              className="card-lift-hover group rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/10 via-surface to-surface p-7 shadow-sm transition hover:border-indigo-400"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-accent-indigo">For Recruiters &amp; Teams</span>
              <h3 className="mt-2 text-xl font-black text-ink">Interview at Scale.</h3>
              <p className="mt-2 text-sm text-ink-muted">Create job campaigns, bulk invite candidates, inspect proctoring trust scores and verified dossiers.</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-accent-indigo">
                Recruiter Portal </span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SCORECARD PREVIEW
          ===================================================================== */}
      <section id="scorecard" className="border-b border-line bg-surface-deep px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-violet">Audit-Ready Candidate Dossier</span>
            <h2 className="mt-3 text-3xl font-black text-ink sm:text-4xl">Evidence behind every assessment</h2>
            <p className="mt-4 text-sm leading-6 text-ink-muted">Review competency scores, verified transcripts and objective grading.</p>
          </div>

          <div className="mt-10 rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col justify-between gap-4 border-b border-line pb-6 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-xs text-accent-cyan font-bold">RUBRIC REPORT TEMPLATE (SAMPLE)</p>
                <h3 className="mt-1 text-xl font-black text-ink">Evidence-Linked Competency Breakdown</h3>
                <p className="text-xs text-ink-muted">Sample evaluation format generated after each completed technical interview session.</p>
              </div>
              <div className="rounded-xl border border-cyan-400/30 bg-cyan-500/5 px-4 py-2.5">
                <span className="text-sm font-black text-accent-cyan">Instant Feedback Format</span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
              <div className="rounded-xl bg-inset p-5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-accent-cyan">Sample Candidate Feedback Extract</p>
                <p className="mt-3 text-sm italic leading-6 text-ink">
                  &quot;Candidate articulated the difference between pessimistic and optimistic locking with distributed Redis leases; clearly accounted for clock skew via Redlock algorithm.&quot;
                </p>
                <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-accent-emerald">
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1">✓ Full Audio Turn Transcript</span>
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2.5 py-1">✓ Objective Rubric Grading</span>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  ['Technical Depth', '94%'],
                  ['System Design', '88%'],
                  ['Live Coding Execution', '92%'],
                  ['Communication & Articulation', '85%'],
                ].map(([name, score]) => (
                  <div key={name}>
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-ink">{name}</span>
                      <span className="font-bold text-accent-cyan">{score}</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-2 border border-line">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-1000"
                        style={{ width: score }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          PRICING
          ===================================================================== */}
      <section id="pricing" className="border-b border-line px-5 py-20 sm:px-8 lg:px-10 bg-canvas">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-emerald">Transparent Pricing</span>
            <h2 className="mt-3 text-3xl font-black text-ink sm:text-4xl">Simple, predictable plans</h2>
            <p className="mt-4 text-sm text-ink-muted">Choose the plan tailored to your interview volume.</p>
          </div>

          <div
            className={`mt-10 grid gap-5 ${
              activePricing.length <= 1
                ? 'max-w-md mx-auto'
                : activePricing.length === 2
                  ? 'sm:grid-cols-2 max-w-3xl mx-auto'
                  : activePricing.length === 3
                    ? 'sm:grid-cols-2 lg:grid-cols-3'
                    : 'md:grid-cols-2 lg:grid-cols-4'
            }`}
          >
            {activePricing.map((plan) => (
              <div
                key={plan.name}
                className={`card-lift-hover relative rounded-2xl border p-6 flex flex-col justify-between ${
                  plan.popular
                    ? 'border-cyan-400/70 bg-gradient-to-b from-cyan-500/5 to-surface shadow-xl shadow-cyan-500/10'
                    : 'border-line bg-surface'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-md">
                    Most Popular
                  </span>
                )}
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                      {plan.credits}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">{plan.note}</p>
                  <p className="mt-4 text-3xl font-black text-ink">
                    {plan.price}
                    {plan.price !== '₹0' && (
                      <span className="text-xs font-medium text-ink-muted"> one-time</span>
                    )}
                  </p>
                  <ul className="mt-6 space-y-3">
                    {plan.items.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-xs text-ink-muted">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-accent-emerald" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={plan.href}
                  className={`mt-8 block rounded-xl px-4 py-3 text-center text-xs font-bold transition-all duration-300 ${
                    plan.popular
                      ? 'sheen-sweeper bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md shadow-cyan-500/25 hover:brightness-110'
                      : 'border border-line bg-surface-2 text-ink hover:bg-surface-3 hover:border-cyan-500/40 hover:text-accent-cyan'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          FAQ — enterprise two-column with searchable categorized accordion
          ===================================================================== */}
      <FaqSection />

      {/* =====================================================================
          FINAL CTA
          ===================================================================== */}
      <section className="relative overflow-hidden border-b border-inverse-line bg-gradient-to-r from-inverse-surface via-inverse-canvas to-inverse-surface px-5 py-20 text-center text-white">
        <div className="sakshaat-grid" />
        <div className="absolute inset-0 bg-radial from-cyan-500/15 via-transparent to-transparent pointer-events-none anim-drift-a" />
        <div className="relative mx-auto max-w-3xl">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-cyan">Progeni Atlas</span>
          <h2 className="mt-3 text-3xl font-black sm:text-4xl">Ready to transform your technical interviews?</h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-inverse-ink-muted">
            Conduct intelligent two-way AI interviews, evaluate technical problem solving and generate structured candidate dossiers.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row">
            <Link
              href="/register"
              className="sheen-sweeper rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 transition hover:brightness-110"
            >
              Get Started Free 
            </Link>
            <a
              href="#hero"
              className="rounded-xl border border-inverse-line-strong bg-inverse-surface-2/80 px-7 py-3.5 text-sm font-semibold text-inverse-ink hover:bg-inverse-surface-2 transition"
            >
              Back to Top
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}