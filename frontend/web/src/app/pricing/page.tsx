'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Check,
  CreditCard,
  ShieldCheck,
  Sparkles,
  Zap,
  Users,
  Building2,
  Lock } from 'lucide-react';

interface PlanCard {
  name: string;
  badge: string;
  price: string;
  priceNum: number;
  credits: string;
  period: string;
  description: string;
  popular: boolean;
  buttonText: string;
  buttonHref: string;
  features: string[];
  notIncluded?: string[];
}

const DEFAULT_CANDIDATE_PLANS: PlanCard[] = [
  {
    name: 'Free Starter',
    badge: 'INSTANT TRIAL',
    price: '₹0',
    priceNum: 0,
    credits: '1 Mock Trial',
    period: 'Free registration trial',
    description: 'Ideal for trying out the AI interviewer with full video, audio and code execution.',
    popular: false,
    buttonText: 'Start Free Mock',
    buttonHref: '/register',
    features: [
      '1 Full AI Technical Mock Interview',
      'Live Spoken Dialogue & Adaptive Follow-ups',
      'Browser Code Execution (Python, C++, JS)',
      'Instant Scorecard & Competency Report',
      'No Credit Card Required',
    ],
    notIncluded: [
      'Resume Defense Round',
      'Company Specific Question Banks',
    ],
  },
  {
    name: 'Warm-up Pack',
    badge: 'FOR QUICK PRACTICE',
    price: '₹49',
    priceNum: 49,
    credits: '50 Credits',
    period: 'one-time pack',
    description: 'Quick pre-interview brush-up right before your actual technical round.',
    popular: false,
    buttonText: 'Buy Pack (₹49)',
    buttonHref: '/candidate/wallet',
    features: [
      '50 AI Credits (100 mins practice)',
      '3 Full In-Depth DSA or Behavioral Rounds',
      'Turn-by-Turn Audio Transcripts',
      'Code Efficiency & Complexity Analysis',
      'Actionable Improvement Guidance',
    ],
    notIncluded: [
      'Company Specific Question Banks',
    ],
  },
  {
    name: 'Placement Ready',
    badge: 'CAMPUS FAVORITE',
    price: '₹99',
    priceNum: 99,
    credits: '100 Credits',
    period: 'one-time pack (Save 30%)',
    description: 'Most chosen by engineering students preparing for placements and product companies.',
    popular: true,
    buttonText: 'Get 100 Credits (₹99)',
    buttonHref: '/candidate/wallet',
    features: [
      '100 AI Credits (200 mins practice)',
      '6-7 Full Technical & Architecture Rounds',
      'Resume Defense & Target JD Parsing',
      'Company-Specific Question Sets (Google, TCS, Amazon)',
      'Detailed Turn-by-Turn Telemetry & Audio Replays',
    ],
    notIncluded: [],
  },
  {
    name: 'Pro Mastery',
    badge: 'BEST VALUE',
    price: '₹199',
    priceNum: 199,
    credits: '200 Credits',
    period: 'one-time pack',
    description: 'Comprehensive preparation for high-stakes FAANG, startup, and campus hiring.',
    popular: false,
    buttonText: 'Get 200 Credits (₹199)',
    buttonHref: '/candidate/wallet',
    features: [
      '200 AI Credits (400 mins practice)',
      '13+ Full Technical, DSA & HR Mock Rounds',
      'Full Multi-Modal Proctoring Simulation',
      'Priority AI Voice & Video Response Latency',
      'Lifetime Scorecard Dossier History',
    ],
    notIncluded: [],
  },
];

const DEFAULT_RECRUITER_PLANS: PlanCard[] = [
  {
    name: 'Recruiter Trial',
    badge: 'FREE TRIAL',
    price: '₹0',
    priceNum: 0,
    credits: '10 Credits',
    period: 'free trial on signup',
    description: '10 welcome credits, granted one-time on signup to test AI technical screening.',
    popular: false,
    buttonText: 'Start Recruiter Trial',
    buttonHref: '/register',
    features: [
      '10 Welcome Credits (20 mins, one-time on signup)',
      '1 Full AI Screening Interview',
      'Automated Candidate Dossiers & PDF Reports',
      'Standard Role Rubric Templates',
      '1 Team Member Seat',
    ],
    notIncluded: ['Custom ATS Sync'],
  },
  {
    name: 'Starter Pack',
    badge: 'FOR STARTUPS',
    price: '₹499',
    priceNum: 499,
    credits: '500 Credits',
    period: 'one-time pack',
    description: 'Screen candidates automatically with AI technical lead interviews.',
    popular: false,
    buttonText: 'Buy Pack (₹499)',
    buttonHref: '/recruiter/billing',
    features: [
      '500 Screening Credits (1,000 mins)',
      'Up to 30-35 Candidate Interview Sessions',
      'Automated Candidate Dossiers & PDF Reports',
      'Standard Role Rubric Templates',
      '3 Team Member Seats',
    ],
    notIncluded: ['Custom ATS Sync'],
  },
  {
    name: 'Growth Scale',
    badge: 'BEST FOR SCALING',
    price: '₹999',
    priceNum: 999,
    credits: '1,000 Credits',
    period: 'one-time pack',
    description: 'For fast-growing hiring teams scaling their technical screening funnel.',
    popular: true,
    buttonText: 'Buy Pack (₹999)',
    buttonHref: '/recruiter/billing',
    features: [
      '1,000 Screening Credits (2,000 mins)',
      '65-70 Candidate Interview Sessions',
      'Custom Role Rubric Templates & Weights',
      'Full Video Proctoring Telemetry',
      'Bulk CSV Candidate Scheduling',
    ],
    notIncluded: [],
  },
  {
    name: 'Enterprise Scale',
    badge: 'HIGH VOLUME',
    price: '₹1,999',
    priceNum: 1999,
    credits: '2,500 Credits',
    period: 'one-time pack',
    description: 'High-volume hiring campaigns with custom ATS synchronization and compliance.',
    popular: false,
    buttonText: 'Buy Pack (₹1,999)',
    buttonHref: '/recruiter/billing',
    features: [
      '2,500 Screening Credits (5,000 mins)',
      '160+ Candidate Screenings',
      'Dedicated AI Persona & Organization Branding',
      'Priority Compute & Zero-Queue Capacity',
      'Full Audit Trail & Compliance Export',
    ],
    notIncluded: [],
  },
];

export default function PricingPage() {
  const [audience, setAudience] = useState<'candidate' | 'recruiter'>('candidate');
  const [candidatePlans, setCandidatePlans] = useState<PlanCard[]>(DEFAULT_CANDIDATE_PLANS);
  const [recruiterPlans, setRecruiterPlans] = useState<PlanCard[]>(DEFAULT_RECRUITER_PLANS);

  useEffect(() => {
    let isMounted = true;
    async function loadPackages() {
      try {
        const res = await fetch('/api/packages');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.packages) && data.packages.length > 0) {
          const allPkgs = data.packages;

          // 1. Candidate plans from Super Admin
          const candPkgs = allPkgs.filter(
            (p: any) => p.target_audience === 'individual' || p.target_audience === 'both'
          );
          if (candPkgs.length > 0 && isMounted) {
            const mappedCand: PlanCard[] = candPkgs.map((pkg: any) => {
              const priceNum = Number(pkg.price ?? pkg.monthlyPrice ?? 0);
              const priceStr = priceNum === 0 ? '₹0' : `₹${priceNum.toLocaleString('en-IN')}`;
              const periodStr =
                priceNum === 0
                  ? 'Free trial'
                  : pkg.billing_period === 'monthly'
                  ? 'month'
                  : pkg.billing_period === 'yearly'
                  ? 'year'
                  : 'one-time pack';

              const creditsStr = pkg.credits
                ? `${pkg.credits} Credits`
                : `${pkg.included_interviews || 1} Mock Trial${(pkg.included_interviews || 1) > 1 ? 's' : ''}`;

              const defaultFeats = [
                `${pkg.included_interviews || 1} Full AI Technical Mock Round${(pkg.included_interviews || 1) > 1 ? 's' : ''}`,
                'Live Spoken Dialogue & Adaptive Follow-ups',
                'Browser Code Execution (Python, C++, JS)',
                'Instant Performance Scorecard & Dossier',
              ];

              const isPopular = Boolean(
                pkg.popular ||
                String(pkg.name || '').toLowerCase().includes('popular') ||
                String(pkg.name || '').toLowerCase().includes('placement')
              );

              return {
                name: pkg.name || 'Candidate Plan',
                badge: priceNum === 0 ? 'INSTANT TRIAL' : isPopular ? 'TOP PICK' : 'PRACTICE PACK',
                price: priceStr,
                priceNum,
                credits: creditsStr,
                period: periodStr,
                description: pkg.description || 'Targeted interview practice for engineering roles.',
                popular: isPopular,
                buttonText: priceNum === 0 ? 'Start Free Mock' : `Buy ${pkg.name} (${priceStr})`,
                buttonHref: priceNum === 0 ? '/register' : '/candidate/wallet',
                features: Array.isArray(pkg.features) && pkg.features.length > 0 ? pkg.features : defaultFeats,
                notIncluded: [],
              };
            });
            setCandidatePlans(mappedCand);
          }

          // 2. Recruiter plans from Super Admin
          const recPkgs = allPkgs.filter(
            (p: any) => p.target_audience === 'organization' || p.target_audience === 'both'
          );
          if (recPkgs.length > 0 && isMounted) {
            const mappedRec: PlanCard[] = recPkgs.map((pkg: any) => {
              const priceNum = Number(pkg.price ?? pkg.monthlyPrice ?? 0);
              const priceStr = `₹${priceNum.toLocaleString('en-IN')}`;
              const periodStr =
                pkg.billing_period === 'monthly'
                  ? 'month'
                  : pkg.billing_period === 'yearly'
                  ? 'year'
                  : '₹1.00 = 1 Credit';

              const creditsStr = pkg.credits
                ? `${pkg.credits.toLocaleString('en-IN')} Credits`
                : `${pkg.included_interviews || 20} Candidate Screenings`;

              const defaultFeats = [
                `${creditsStr} (~${Math.round((pkg.credits || 500) / 2)} mins)`,
                `Up to ${pkg.included_interviews || 20} Candidate Interview Sessions`,
                'Automated Candidate Dossiers & PDF Reports',
                'Custom Role Rubric Templates & Weights',
                `${pkg.included_recruiter_seats || 3} Team Member Seats`,
              ];

              const isPopular = Boolean(
                pkg.popular ||
                String(pkg.name || '').toLowerCase().includes('popular') ||
                String(pkg.name || '').toLowerCase().includes('growth')
              );

              return {
                name: pkg.name || 'Recruiter Pack',
                badge: isPopular ? 'GROWTH SCALE' : (pkg.tier === 'enterprise' ? 'ENTERPRISE' : 'FOR TEAMS'),
                price: priceStr,
                priceNum,
                credits: creditsStr,
                period: periodStr,
                description: pkg.description || 'Automated AI technical screening for hiring teams.',
                popular: isPopular,
                buttonText: `Choose Plan (${priceStr})`,
                buttonHref: '/recruiter/billing',
                features: Array.isArray(pkg.features) && pkg.features.length > 0 ? pkg.features : defaultFeats,
                notIncluded: [],
              };
            });
            setRecruiterPlans(mappedRec);
          }
        }
      } catch (err) {
        console.warn('[PricingPage] Fallback to default pricing due to fetch error:', err);
      }
    }
    void loadPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  const activePlans = audience === 'candidate' ? candidatePlans : recruiterPlans;

  // Cheapest paid candidate pack — keeps the tab label and hero copy in sync
  // with whatever prices are actually set in Super Admin (no hard-coded ₹49).
  const minCandidatePrice = Math.min(
    ...candidatePlans.map((p) => p.priceNum).filter((n) => n > 0)
  );
  const hasPaidCandidatePack = Number.isFinite(minCandidatePrice) && minCandidatePrice > 0;
  const candidateTabLabel = hasPaidCandidatePack
    ? `Candidate Practice Packs · from ₹${minCandidatePrice.toLocaleString('en-IN')}`
    : 'Candidate Practice Packs';

  // Card count decides the grid so 1-2 packs don't stretch full-width and
  // 4 packs always sit in one clean row on desktop.
  const gridClassesFor = (count: number): string => {
    if (count <= 1) return 'grid-cols-1 max-w-md mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* Pricing Header */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-16 lg:py-20">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[550px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 text-accent-emerald text-xs font-bold uppercase tracking-wider">
            <CreditCard className="w-3.5 h-3.5" />
            Transparent Pricing // No Subscriptions, Pay Only As You Practice
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-ink tracking-tight leading-[1.1]">
            Pocket-Friendly Practice Packs for{' '}
            <span className="bg-gradient-to-r from-accent-blue via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
              Every Candidate
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-ink-muted">
            Start completely free with 10 credits. When you&apos;re ready to level up, choose simple one-time credit packs{hasPaidCandidatePack ? ` starting at just ₹${minCandidatePrice.toLocaleString('en-IN')}` : ''}.
          </p>

          {/* Candidate vs Recruiter Tab Switcher */}
          <div className="pt-2 flex items-center justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-surface-2 border border-line shadow-xs">
              <button
                type="button"
                onClick={() => setAudience('candidate')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  audience === 'candidate'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Sparkles className="w-4 h-4 text-accent-cyan" />
                <span>{candidateTabLabel}</span>
              </button>
              <button
                type="button"
                onClick={() => setAudience('recruiter')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
                  audience === 'recruiter'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Building2 className="w-4 h-4 text-accent-indigo" />
                <span>Recruiter &amp; Team Packs</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Cards Grid */}
      <section className="py-16 bg-surface">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`grid gap-6 ${gridClassesFor(activePlans.length)}`}>
            {activePlans.map((plan, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl border ${
                  plan.popular
                    ? 'border-blue-600 bg-surface-deep shadow-2xl relative ring-2 ring-accent-blue/30'
                    : 'border-line bg-surface-deep shadow-sm'
                } flex flex-col justify-between space-y-6 transition hover:translate-y-[-4px] hover:shadow-lg`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    Most Popular Choice
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent-cyan">
                      {plan.badge}
                    </span>
                    <h3 className="text-xl font-bold text-ink mt-1">{plan.name}</h3>
                    <p className="text-xs text-ink-muted mt-2 min-h-[36px] leading-relaxed">{plan.description}</p>
                  </div>

                  <div className="pt-2 border-t border-line/60">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl sm:text-4xl font-black text-ink">{plan.price}</span>
                      <span className="text-xs font-medium text-ink-muted"> / {plan.period}</span>
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-accent-cyan text-xs font-mono font-bold">
                      <Zap className="w-3.5 h-3.5 fill-cyan-400 text-accent-cyan" />
                      <span>{plan.credits}</span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-line/60">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                      What&apos;s Included:
                    </p>
                    <ul className="space-y-2.5">
                      {plan.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-ink-muted">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-snug">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <Link
                  href={plan.buttonHref}
                  className={`w-full py-3 rounded-xl text-center text-xs sm:text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                    plan.popular
                      ? 'bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-cyan-500/20 hover:brightness-110'
                      : 'border border-accent-blue text-accent-blue hover:bg-surface-2'
                  }`}
                >
                  <span>{plan.buttonText}</span>
                  </Link>
              </div>
            ))}
          </div>

          {/* Guarantee / Free Trial Banner */}
          <div className="mt-14 p-6 sm:p-8 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/5 via-surface to-surface-deep shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-cyan">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <span>100% Student Friendly · No Hidden Charges</span>
              </div>
              <h3 className="text-xl font-bold text-ink">
                Start with 10 Free Credits upon Signup
              </h3>
              <p className="text-xs sm:text-sm text-ink-muted max-w-xl">
                Every new user gets 10 credits after OTP verification. Practice your first live AI interview without entering any payment card.
              </p>
            </div>
            <Link
              href="/register"
              className="px-6 py-3.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-md hover:bg-blue-700 transition shrink-0 whitespace-nowrap"
            >
              Claim 10 Free Credits 
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
