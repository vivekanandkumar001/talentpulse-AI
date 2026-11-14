'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface PricingPlan {
  id?: string;
  name: string;
  price: string;
  credits: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  popular: boolean;
}

const DEFAULT_CANDIDATE_PLANS: PricingPlan[] = [
  {
    name: 'Free Starter',
    price: '₹0',
    credits: '10 Credits',
    period: 'on signup',
    description: 'Experience the AI mock interview with full voice, video & code execution.',
    features: [
      '1 Full AI Technical Mock Round (20 mins free)',
      'Live Spoken Dialogue & Real-Time Voice',
      'Instant Performance Scorecard',
      'No Credit Card Required',
    ],
    cta: 'Start Free Mock',
    href: '/register',
    popular: false,
  },
  {
    name: 'Warm-up Pack',
    price: '₹49',
    credits: '50 Credits',
    period: 'one-time pack',
    description: 'Quick pre-interview brush-up right before your actual technical round.',
    features: [
      '50 AI Credits (100 mins practice)',
      '3 Full In-Depth DSA or Behavioral Rounds',
      'Turn-by-Turn Audio Transcripts',
      'Actionable Improvement Guidance',
    ],
    cta: 'Buy Pack (₹49)',
    href: '/candidate/wallet',
    popular: false,
  },
  {
    name: 'Placement Ready',
    price: '₹99',
    credits: '100 Credits',
    period: 'one-time pack (Save 30%)',
    description: 'Most chosen by engineering students preparing for placements & tech roles.',
    features: [
      '100 AI Credits (200 mins practice)',
      '6-7 Full Technical & Design Rounds',
      'Resume Defense & Target JD Parsing',
      'Company Benchmarks (TCS, Google, Amazon)',
    ],
    cta: 'Get 100 Credits (₹99)',
    href: '/candidate/wallet',
    popular: true,
  },
  {
    name: 'Pro Mastery',
    price: '₹199',
    credits: '200 Credits',
    period: 'one-time pack (Best Value)',
    description: 'Complete end-to-end placement & FAANG interview preparation.',
    features: [
      '200 AI Credits (400 mins practice)',
      '13+ Full Technical, DSA & HR Mock Rounds',
      'Company-Specific Question Banks',
      'Priority AI Voice & Video Latency',
    ],
    cta: 'Get 200 Credits (₹199)',
    href: '/candidate/wallet',
    popular: false,
  },
];

export const PricingSection: React.FC = () => {
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_CANDIDATE_PLANS);

  useEffect(() => {
    let isMounted = true;
    async function fetchDynamicPackages() {
      try {
        const res = await fetch('/api/packages');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.success && Array.isArray(data.packages) && data.packages.length > 0) {
          // Filter candidate/individual plans set by Admin in Super Admin panel
          const candidatePkgs = data.packages.filter(
            (p: any) => p.target_audience === 'individual' || p.target_audience === 'both'
          );

          if (candidatePkgs.length > 0 && isMounted) {
            const mapped: PricingPlan[] = candidatePkgs.map((pkg: any) => {
              const priceNum = Number(pkg.price ?? pkg.monthlyPrice ?? 0);
              const priceFormatted = priceNum === 0 ? '₹0' : `₹${priceNum.toLocaleString('en-IN')}`;
              const periodFormatted =
                priceNum === 0
                  ? 'on signup'
                  : pkg.billing_period === 'monthly'
                  ? 'month'
                  : pkg.billing_period === 'yearly'
                  ? 'year'
                  : 'one-time pack';

              const creditsDisplay = pkg.credits
                ? `${pkg.credits} Credits`
                : `${pkg.included_interviews || 1} Mock Round${(pkg.included_interviews || 1) > 1 ? 's' : ''}`;

              const defaultFeatures = [
                `${pkg.included_interviews || 1} Full AI Technical Mock Round${(pkg.included_interviews || 1) > 1 ? 's' : ''}`,
                'Live Spoken Dialogue & Adaptive Voice',
                'Browser Code Execution & Turn-by-Turn Telemetry',
                'Instant Performance Scorecard & Dossier',
              ];

              const features = Array.isArray(pkg.features) && pkg.features.length > 0
                ? pkg.features
                : defaultFeatures;

              const isPopular = Boolean(
                pkg.popular ||
                String(pkg.name || '').toLowerCase().includes('popular') ||
                String(pkg.name || '').toLowerCase().includes('placement')
              );

              return {
                id: pkg.id || pkg.package_id,
                name: pkg.name || 'Practice Plan',
                price: priceFormatted,
                credits: creditsDisplay,
                period: periodFormatted,
                description: pkg.description || 'AI mock interview preparation plan.',
                features,
                cta: priceNum === 0 ? 'Start Free Mock' : `Buy ${pkg.name} (${priceFormatted})`,
                href: priceNum === 0 ? '/register' : '/candidate/wallet',
                popular: isPopular,
              };
            });
            setPlans(mapped);
          }
        }
      } catch (err) {
        console.warn('[PricingSection] Using fallback pricing due to network error:', err);
      }
    }
    void fetchDynamicPackages();
    return () => {
      isMounted = false;
    };
  }, []);

  // Card count decides the grid so 1-2 packs don't stretch full-width and
  // 4 packs always sit in one clean row on desktop.
  const gridClassesFor = (count: number): string => {
    if (count <= 1) return 'grid-cols-1 max-w-md mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-3xl mx-auto';
    if (count === 3) return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4';
  };

  return (
    <section id="pricing" className="w-full py-16 px-6 bg-surface-deep relative z-10 scroll-mt-20 border-t border-line">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-sans font-bold text-accent-emerald uppercase tracking-wider block mb-2">
            POCKET-FRIENDLY PLANS
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Simple, Transparent Credit Packs
          </h2>
          <p className="text-sm text-ink-muted mt-2 max-w-xl mx-auto font-normal">
            No recurring monthly subscriptions. Choose flexible practice packs set dynamically by the platform.
          </p>
        </div>

        <div className={`grid gap-6 ${gridClassesFor(plans.length)}`}>
          {plans.map((plan, index) => (
            <motion.div
              key={plan.id || index}
              initial={{ opacity: 1, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`p-6 rounded-2xl bg-surface border ${
                plan.popular ? 'border-accent-cyan shadow-[0_0_30px_rgba(56,189,248,0.2)] relative ring-2 ring-cyan-400/30' : 'border-line'
              } flex flex-col justify-between`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#38bdf8] text-[10px] font-bold text-slate-950 uppercase tracking-wider">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-lg font-bold text-ink">{plan.name}</h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 border border-cyan-500/20">
                    {plan.credits}
                  </span>
                </div>
                <p className="text-xs text-ink-muted mb-4">{plan.description}</p>

                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-ink">{plan.price}</span>
                  <span className="text-xs text-ink-muted ml-1">/ {plan.period}</span>
                </div>

                <ul className="space-y-2.5 mb-6 pt-3 border-t border-line/60">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start space-x-2 text-xs text-ink-muted">
                      <Check className="w-4 h-4 text-accent-emerald shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={plan.href}
                className={`w-full py-2.5 rounded-xl text-center text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                  plan.popular
                    ? 'btn-primary-gradient text-on-brand shadow-md'
                    : 'border border-accent-blue text-accent-blue hover:bg-surface-2'
                }`}
              >
                <span>{plan.cta}</span>
                </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
