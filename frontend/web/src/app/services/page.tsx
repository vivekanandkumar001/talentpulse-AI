'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Video,
  Code2,
  ShieldCheck,
  FileText,
  Sliders,
  Sparkles,
  CheckCircle2,
  PlayCircle,
  Rocket,
  Gauge,
  Languages,
  Timer,
  Layers,
  Lock,
  MonitorCheck,
  Eye,
  FileCheck2,
  Share2,
  Wand2,
  Webhook,
  ArrowRight,
} from 'lucide-react';

type MetricTile = { label: string; value: string; emphasis?: boolean };
type Service = {
  id: string;
  icon: React.ElementType;
  badge: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  linkText: string;
  linkHref: string;
  externalNote?: string;
  metrics: MetricTile[];
};

const SERVICES: Service[] = [
  {
    id: 'interviewer',
    icon: Video,
    badge: 'FLAGSHIP AI SERVICE',
    title: 'Two-Way Autonomous Video & Voice Interviewer',
    tagline: 'A human-grade interviewer — available 24/7, at any scale.',
    description:
      'A natural candidate ↔ AI interviewer conversation with sub-300ms vocal response latency, adaptive follow-ups based on actual answers, resume/JD context ingestion, and empathetic conversational flow — all through a single web link, no install.',
    features: [
      'Dynamic question branching driven by the candidate’s actual answers',
      'Ingests CV, Job Description and Role Level in seconds — no question banks to maintain',
      'Automatic transcription with speaker diarization and audio replays',
      '25+ international languages with accent-robust speech recognition',
    ],
    linkText: 'Test the Live AI Interviewer',
    linkHref: '/portfolio#showcase',
    metrics: [
      { label: 'Response latency', value: '< 280ms', emphasis: true },
      { label: 'Languages', value: '25+' },
      { label: 'Setup', value: '< 5 min' },
    ],
  },
  {
    id: 'coding',
    icon: Code2,
    badge: 'TECHNICAL RUNTIME',
    title: 'Interactive Live Coding & System Architecture Sandbox',
    tagline: 'Real code. Real tests. Real signal.',
    description:
      'Evaluate genuine problem solving in a real-time IDE environment with multi-language execution, unit-test validation with edge cases, Big-O efficiency analysis, and an interactive distributed-systems whiteboard for architecture rounds.',
    features: [
      'Native execution for Python, TypeScript, Java, Go, C++ and Rust',
      'Unit-test suites with edge-case validation and Big-O analysis',
      'Drag-and-drop Architecture Whiteboard with APIs, queues and databases',
      'Keystroke replay to observe debugging and refactoring habits',
    ],
    linkText: 'Explore Coding Drills',
    linkHref: '/candidate/practice',
    externalNote: 'Requires candidate sign-in',
    metrics: [
      { label: 'Runtimes', value: '6 languages', emphasis: true },
      { label: 'Edge-case tests', value: 'Automated' },
      { label: 'Keystroke replay', value: 'Yes' },
    ],
  },
  {
    id: 'proctoring',
    icon: ShieldCheck,
    badge: 'SECURITY & INTEGRITY',
    title: 'Real-Time AI Proctoring & Anti-Cheat Intelligence',
    tagline: 'Integrity without surveillance creep.',
    description:
      'Absolute confidence in interview integrity with client-side vision telemetry, multi-face presence tracking, tab-focus departure telemetry and copy-paste detection — privacy-first and fully GDPR/DPDP compliant.',
    features: [
      'Client-side MediaPipe face mesh — absence and multi-face presence detection',
      'Tab-switch frequency and window-blur timestamps captured in the report',
      'Speech-activity telemetry without background audio surveillance',
      'No biometric storage — signals are processed on-device and discarded',
    ],
    linkText: 'Review Security Controls',
    linkHref: '/about#integrity',
    metrics: [
      { label: 'Signal channels', value: '14 in parallel', emphasis: true },
      { label: 'Camera pairing', value: 'Web + Phone' },
      { label: 'Data retention', value: 'None (on-device)' },
    ],
  },
  {
    id: 'dossiers',
    icon: FileText,
    badge: 'AUDIT-READY REPORTING',
    title: 'Candidate Dossiers & Structured Scorecards',
    tagline: 'Evidence, not impressions.',
    description:
      'Transform subjective interview impressions into quantifiable, defensible assessment dossiers — rubric-linked scores with direct quote evidence from the candidate’s own words and code.',
    features: [
      'Instant scoring across Technical Depth, System Architecture and Problem Solving',
      'Quote-backed justification for every rating — zero black-box bias',
      'One-click PDF export for hiring committees and executive summaries',
      'Role-based recruiter permissions with shareable, time-boxed links',
    ],
    linkText: 'View Recruiter Dossiers',
    linkHref: '/recruiter/dossiers',
    externalNote: 'Requires recruiter sign-in',
    metrics: [
      { label: 'Read time', value: '< 2 min', emphasis: true },
      { label: 'Format', value: 'PDF · Web' },
      { label: 'Evidence', value: 'Quote-linked' },
    ],
  },
  {
    id: 'rubrics',
    icon: Sliders,
    badge: 'ENTERPRISE CUSTOMIZATION',
    title: 'Custom Evaluation Rubrics & Weight Calibration',
    tagline: 'Your bar for each level — encoded in the AI.',
    description:
      'Align AI assessments directly with your company’s engineering levels. Fine-tune competency weights, mandatory prerequisites and pass/fail thresholds from a single super-admin panel — with a full audit log.',
    features: [
      'Role-specific templates: Junior → Mid → Senior → Staff → Manager',
      'Custom scoring curves matched to your internal engineering ladder',
      'Automated ATS webhooks triggered on calibrated score thresholds',
      'Audit log for every rubric change — by hiring managers, immutable',
    ],
    linkText: 'Configure Rubrics',
    linkHref: '/recruiter/rubrics',
    externalNote: 'Requires recruiter sign-in',
    metrics: [
      { label: 'Level templates', value: '6 tracks', emphasis: true },
      { label: 'ATS webhooks', value: 'Greenhouse · Lever · Workday' },
      { label: 'Audit log', value: 'Immutable' },
    ],
  },
];

const ECOSYSTEM = ['Greenhouse', 'Lever', 'Workday', 'Ashby', 'BambooHR', 'Slack'];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* =========================================================
          1. HERO
          ========================================================= */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-20 lg:py-24">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div aria-hidden className="absolute top-10 left-1/2 -translate-x-1/2 h-[280px] w-[640px] rounded-full bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent-blue/30 bg-accent-blue/5 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-accent-blue">
            <Sparkles className="h-3.5 w-3.5" />
            AI-Powered Hiring Suite
          </span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] text-ink">
            End-to-End Solutions for{' '}
            <span className="bg-gradient-to-r from-accent-blue via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
              Modern Technical Assessment
            </span>
          </h1>

          <p className="mx-auto max-w-3xl text-base sm:text-lg text-ink-muted leading-relaxed">
            Autonomous video interviews, a real-time coding sandbox, on-device anti-cheat telemetry,
            evidence-backed dossiers and calibrated rubrics — one modular platform instead of five disconnected tools.
          </p>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 transition-all"
            >
              View Pricing &amp; Plans <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/portfolio#showcase"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 py-3.5 text-sm font-semibold text-ink hover:bg-surface-2 hover:border-cyan-400/50 transition-all"
            >
              <PlayCircle className="h-4 w-4 text-accent-cyan" /> View Live Showcase
            </Link>
          </div>

          {/* Quick-jump nav pills */}
          <div className="pt-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
            <span className="text-ink-faint uppercase tracking-wider self-center mr-1">Jump to:</span>
            {SERVICES.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-ink-muted hover:text-accent-blue hover:border-accent-blue/40 transition-all"
              >
                {s.badge}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          2. SERVICE DEEP-DIVES
          ========================================================= */}
      <section className="py-16 lg:py-20 bg-surface-deep">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          {SERVICES.map((service, index) => {
            const Icon = service.icon;
            const reversed = index % 2 === 1;
            return (
              <article
                key={service.id}
                id={service.id}
                className="scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center rounded-2xl border border-line bg-surface p-6 sm:p-8 lg:p-10 shadow-[0_1px_2px_rgba(15,23,42,0.05)] hover:shadow-[0_14px_36px_-14px_rgba(15,23,42,0.18)] transition-shadow"
              >
                {/* ---- Content column ---- */}
                <div className={`lg:col-span-7 space-y-5 ${reversed ? 'lg:order-2' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-blue/10 border border-accent-blue/30 text-accent-blue">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-cyan rounded-full border border-accent-cyan/30 bg-accent-cyan/5 px-2.5 py-1">
                      {service.badge}
                    </span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight leading-tight">
                    {service.title}
                  </h2>
                  <p className="text-sm sm:text-base font-semibold text-accent-blue">{service.tagline}</p>
                  <p className="text-sm text-ink-muted leading-relaxed">{service.description}</p>

                  <ul className="space-y-2.5 pt-1">
                    {service.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-ink-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-emerald" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-2 flex flex-wrap items-center gap-4">
                    <Link
                      href={service.linkHref}
                      className="inline-flex items-center gap-2 text-sm font-bold text-accent-blue hover:underline underline-offset-4"
                    >
                      {service.linkText}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    {service.externalNote && (
                      <span className="text-[10px] font-mono uppercase tracking-wider text-ink-faint">
                        {service.externalNote}
                      </span>
                    )}
                  </div>
                </div>

                {/* ---- Metric panel column ---- */}
                <div className={`lg:col-span-5 ${reversed ? 'lg:order-1' : ''}`}>
                  <div className="rounded-2xl border border-line bg-surface-deep p-5 sm:p-6 shadow-inner space-y-3">
                    <div className="flex items-center justify-between border-b border-line pb-3">
                      <span className="font-mono text-[11px] font-bold text-accent-cyan">MODULE // {service.id.toUpperCase()}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-accent-emerald">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Production
                      </span>
                    </div>

                    <div className="font-mono text-xs">
                      {service.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="flex items-center justify-between gap-4 border-b border-line/60 px-2 py-3 last:border-b-0"
                        >
                          <span className="text-ink-muted">{m.label}</span>
                          <span className={m.emphasis ? 'text-accent-cyan font-bold' : 'text-ink font-semibold'}>
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>

                    <Link
                      href="/register"
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-3 text-xs font-bold text-on-brand hover:bg-accent-blue-hover transition-all"
                    >
                      <Rocket className="h-4 w-4" />
                      Launch Interactive Trial
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* =========================================================
          3. ECOSYSTEM / ATS INTEGRATIONS
          ========================================================= */}
      <section className="border-t border-line bg-surface px-5 py-16 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl text-center space-y-6">
          <span className="kicker">Ecosystem Integrations</span>
          <h2 className="text-2xl sm:text-3xl font-black text-ink tracking-tight">
            Plugs into your existing hiring stack
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-ink-muted">
            Sync interview invitations, scorecards and final verdicts back into your applicant tracking system via
            one-click webhooks — and trigger downstream actions on score-threshold breaches.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {ECOSYSTEM.map((ats) => (
              <span
                key={ats}
                className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface-deep px-5 py-2.5 text-xs font-bold text-ink shadow-xs"
              >
                <Webhook className="h-4 w-4 text-accent-cyan" />
                {ats}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          4. FINAL CTA
          ========================================================= */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-r from-inverse-surface via-inverse-canvas to-inverse-surface px-5 py-16 text-center text-white sm:px-8 lg:px-10">
        <div className="sakshaat-grid" />
        <div aria-hidden className="absolute inset-0 bg-radial from-cyan-500/15 via-transparent to-transparent anim-drift-a pointer-events-none" />
        <div className="relative mx-auto max-w-2xl space-y-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-accent-cyan">Progeni Atlas</span>
          <h2 className="text-3xl font-black sm:text-4xl">Run every technical interview from one link</h2>
          <p className="mx-auto max-w-md text-sm leading-6 text-inverse-ink-muted">
            Create your workspace in under a minute and send your first interview invite today.
          </p>
          <div className="pt-2 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className="sheen-sweeper rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              href="/contact"
              className="rounded-xl border border-inverse-line-strong bg-inverse-surface-2/80 px-7 py-3 text-sm font-semibold text-inverse-ink hover:bg-inverse-surface-2 transition"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
