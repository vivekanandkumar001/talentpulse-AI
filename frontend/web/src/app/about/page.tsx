'use client';

import React from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  ShieldCheck,
  Award,
  Users,
  BrainCircuit,
  CheckCircle2,
  Sparkles,
  Lock,
  Globe2,
  Target,
  Clock,
  Compass,
  Cpu,
  Terminal,
  Activity,
  Layers } from 'lucide-react';

export default function AboutPage() {
  const engineeringPrinciples = [
    {
      title: 'Real-Time Audio Latency',
      role: 'Sub-500ms Turn Processing',
      description: 'Built on WebRTC and streaming speech recognition for natural, low-latency technical discussions without awkward conversational lag.',
      icon: Activity,
      gradient: 'from-blue-600 to-cyan-500',
    },
    {
      title: 'Sandboxed Code Runtimes',
      role: 'In-Browser Execution',
      description: 'Monaco-powered development environment supporting Python, C++, Java, and TypeScript with automated edge-case test validation.',
      icon: Terminal,
      gradient: 'from-indigo-600 to-violet-500',
    },
    {
      title: 'Objective Mathematical Rubrics',
      role: 'Unbiased Evaluation',
      description: 'Grading is anchored to demonstrable code execution, algorithmic complexity, and structured communication rubrics.',
      icon: BrainCircuit,
      gradient: 'from-cyan-600 to-teal-500',
    },
    {
      title: 'Privacy-First Architecture',
      role: 'Transient Processing',
      description: 'Session audio and code inputs are processed with standard SSL encryption, giving candidates full transparency over their feedback.',
      icon: Lock,
      gradient: 'from-slate-700 to-slate-900',
    },
  ];

  const platformSpecs = [
    { number: '< 500ms', label: 'Real-Time Voice Turn Latency' },
    { number: 'Monaco', label: 'Integrated Code Sandbox' },
    { number: '100%', label: 'Evidence-Linked Rubric Scoring' },
    { number: 'WebRTC', label: 'Zero Install In-Browser Experience' },
  ];

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-20 lg:py-28">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-20 -left-40 w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-accent-blue text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Engineering Mission
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink tracking-tight leading-[1.1]">
            We&apos;re Building the Future of{' '}
            <span className="text-accent-blue">
              Technical Interview Mastery
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-ink-muted leading-relaxed">
            Progeni Atlas was founded with a singular conviction: engineering ability should be practiced and evaluated on real problem solving, logical clarity, and systems reasoning—not high-stress trick questions or scheduling bottlenecks.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/candidate/practice"
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-blue hover:bg-accent-blue-hover px-6 py-3.5 text-sm font-bold text-on-brand shadow-lg shadow-blue-500/20 transition-all"
            >
              Start Free Practice </Link>
            <Link
              href="#principles"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 py-3.5 text-sm font-semibold text-ink hover:bg-surface-2 transition-all"
            >
              Platform Principles
            </Link>
          </div>
        </div>
      </section>

      {/* Platform Capabilities / Metrics */}
      <section className="border-b border-line bg-surface-deep py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {platformSpecs.map((item, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-accent-blue font-mono">
                  {item.number}
                </p>
                <p className="text-xs sm:text-sm text-ink-muted font-medium">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Philosophy Section (#mission) */}
      <section id="mission" className="py-20 border-b border-line bg-surface scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider block">
                MISSION &amp; PHILOSOPHY
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
                Eliminating Interview Anxiety, Elevating Engineering Depth
              </h2>
              <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                Traditional technical interviews often create high friction for candidates and engineers alike. Candidates face scheduling anxiety and inconsistent questioning, while engineers spend dozens of hours repeating identical preliminary screens.
              </p>
              <p className="text-sm sm:text-base text-ink-muted leading-relaxed">
                Progeni Atlas provides candidates with an autonomous, patient, two-way conversational partner that adapts questions in real time. Whether probing distributed systems tradeoffs or debugging live Python code, our platform listens, evaluates, and compiles detailed rubric reports you can learn from.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  'Objective Standards: Every candidate is evaluated on clear, transparent criteria.',
                  '24/7 Availability: Practice or take technical screens at whatever time works best for you.',
                  'Actionable Feedback: Review turn-by-turn transcripts and targeted recommendations to improve.',
                ].map((point, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-accent-emerald shrink-0 mt-0.5" />
                    <span className="text-sm text-ink-muted">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-xl border border-line bg-surface-deep p-6 sm:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-line">
                  <div className="w-12 h-12 rounded-2xl bg-accent-blue text-on-brand flex items-center justify-center font-bold text-lg shadow-md">
                    <BrainCircuit className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-ink">Adaptive Evaluation Engine</h3>
                    <p className="text-xs text-ink-muted">Context-aware question synthesis</p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-xl bg-surface">
                    <p className="font-bold text-accent-cyan uppercase text-[10px] tracking-wider mb-1">
                      Context Ingestion
                    </p>
                    <p className="text-ink">Resume + Target Role competencies extracted into structured evaluation rubrics.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface">
                    <p className="font-bold text-indigo-500 uppercase text-[10px] tracking-wider mb-1">
                      Two-Way Audio/Video Dialog
                    </p>
                    <p className="text-ink">Real-time candidate vocal answers trigger intelligent follow-ups on system trade-offs.</p>
                  </div>
                  <div className="p-4 rounded-xl bg-surface">
                    <p className="font-bold text-emerald-500 uppercase text-[10px] tracking-wider mb-1">
                      Evidence-Linked Feedback
                    </p>
                    <p className="text-ink">Granular scoring backed by automated unit test results and audio transcript evidence.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrity & Anti-Bias Section (#integrity) */}
      <section id="integrity" className="py-20 border-b border-line bg-surface-deep scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
            <span className="text-xs font-bold text-accent-blue uppercase tracking-wider block">
              TRUST &amp; EVALUATION INTEGRITY
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
              Anti-Bias Guardrails &amp; Fair Evaluation
            </h2>
            <p className="text-sm sm:text-base text-ink-muted">
              We anchor our evaluation models to demonstrated problem solving and code correctness, eliminating human bias.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-line shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-accent-blue flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink">Objective Rubric Evaluation</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Candidate scoring relies strictly on semantic code accuracy, logical problem solving, and architecture reasoning. Personal demographics are never evaluated.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-line shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-600 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink">Client-Side Proctoring</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Client-side MediaPipe vision monitors display focus and face detection locally during the session without storing unnecessary biometric profiles.
              </p>
            </div>

            <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-line shadow-xs space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <Globe2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-ink">Transparent Candidate Feedback</h3>
              <p className="text-sm text-ink-muted leading-relaxed">
                Candidates receive comprehensive feedback reports highlighting specific areas of strength and concrete code optimizations to accelerate career growth.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Principles Section (#principles & #team) */}
      <section id="principles" className="py-20 border-b border-line bg-surface scroll-mt-20">
        <div id="team" className="scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
              <span className="text-xs font-bold text-accent-blue uppercase tracking-wider block">
                ENGINEERING PILLARS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
                Designed for Engineering Excellence
              </h2>
              <p className="text-sm sm:text-base text-ink-muted">
                Our platform architecture combines real-time streaming AI, in-browser compilation, and mathematical grading rubrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {engineeringPrinciples.map((item, i) => {
                const IconComponent = item.icon;
                return (
                  <div key={i} className="p-6 rounded-2xl bg-surface-deep border border-line hover:border-accent-blue/40 transition-colors space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-accent-blue flex items-center justify-center shadow-xs">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-ink">{item.title}</h3>
                      <p className="text-xs font-semibold text-accent-blue mt-0.5">{item.role}</p>
                    </div>
                    <p className="text-xs text-ink-muted leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="py-16 bg-gradient-to-r from-[#072448] via-[#0c3666] to-[#185adb] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black">Ready to practice your technical interview?</h2>
          <p className="text-ink text-sm sm:text-base max-w-xl mx-auto">
            Take a simulated interview drill right now, test your live coding skills, and get instant detailed feedback.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link
              href="/candidate/practice"
              prefetch={false}
              className="px-6 py-3 rounded-full bg-surface text-accent-blue font-bold text-sm hover:bg-surface-2 transition-colors shadow-md"
            >
              Start Free Practice Interview
            </Link>
            <Link
              href="/pricing"
              className="px-6 py-3 rounded-full border border-white/40 text-white font-bold text-sm hover:bg-surface/10 transition-colors"
            >
              View Credit Packs (From ₹49)
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}