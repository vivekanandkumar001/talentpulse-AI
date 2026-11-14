'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import {
  Video,
  Play,
  CheckCircle2,
  Cpu,
  TrendingUp,
  Award,
  Users,
  Compass,
  Sparkles,
  ShieldCheck,
  Star,
  Clock,
  Terminal,
  Database,
  Layers,
  Code2 } from 'lucide-react';

export default function PortfolioPage() {
  const [activeTab, setActiveTab] = useState<'interview' | 'code' | 'dossier'>('interview');

  const engineeringTracks = [
    {
      domain: 'Backend & Systems',
      level: 'Senior & Staff Level',
      headline: 'Distributed Systems, Concurrency & High-Throughput APIs',
      focus: 'High Scale & Low Latency',
      topics: [
        { label: 'Cache Stampede', value: 'Redis / Lease' },
        { label: 'Consistency', value: 'Raft / Paxos' },
        { label: 'Throughput', value: 'gRPC / Kafka' },
      ],
      description:
        'Tests candidate depth on data consistency, partitioning strategies, rate-limiting algorithms, and fault-tolerant failovers.',
      trackCode: 'BACKEND_SYS_L5',
    },
    {
      domain: 'Algorithms & Data Structures',
      level: 'Mid to Senior SWE',
      headline: 'Optimal Time-Complexity, Graph Traversals & Monotonic Queues',
      focus: 'Algorithmic Rigor',
      topics: [
        { label: 'Sliding Windows', value: 'O(N) Amortized' },
        { label: 'Graph BFS/DFS', value: 'Topological Sort' },
        { label: 'Dynamic Prog', value: 'State Transitions' },
      ],
      description:
        'Live in-browser compilation with automated unit tests across hidden edge cases, memory bounds, and computational complexity.',
      trackCode: 'ALGO_DSA_L4',
    },
    {
      domain: 'Full-Stack Web Architecture',
      level: 'Frontend & Full-Stack',
      headline: 'Modern React/Next.js, State Machines & Secure Auth Flows',
      focus: 'Production Readiness',
      topics: [
        { label: 'Rendering', value: 'SSR / Hydration' },
        { label: 'State Flow', value: 'Optimistic UI' },
        { label: 'Security', value: 'JWT / CSRF Guard' },
      ],
      description:
        'Evaluates component lifecycle ergonomics, web performance metrics (LCP/INP), API error handling, and robust typing.',
      trackCode: 'FULLSTACK_L4',
    },
  ];

  return (
    <main className="min-h-screen bg-canvas text-ink flex flex-col selection:bg-cyan-500/20">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-line bg-gradient-to-b from-surface via-surface to-surface-deep py-20 lg:py-28">
        <div className="absolute inset-0 bg-grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute top-10 right-1/4 w-[500px] h-[350px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 text-accent-blue text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Interactive Platform Showcase
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-ink tracking-tight leading-[1.1]">
            Next-Gen Architecture.{' '}
            <span className="text-accent-blue">
              Zero Friction.
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-lg text-ink-muted leading-relaxed">
            Explore the live Progeni Atlas interview suite: real-time conversational AI, integrated multi-language Monaco coding workspace, and comprehensive rubric reporting.
          </p>

          <div className="pt-4 flex flex-wrap justify-center gap-4">
            <Link
              href="/candidate/practice"
              prefetch={false}
              className="inline-flex items-center gap-2 rounded-xl bg-accent-blue hover:bg-accent-blue-hover px-6 py-3.5 text-sm font-bold text-on-brand shadow-lg shadow-blue-500/20 transition-all"
            >
              Launch Practice Drills </Link>
            <Link
              href="#tracks"
              className="inline-flex items-center gap-2 rounded-xl border border-line-strong bg-surface px-6 py-3.5 text-sm font-semibold text-ink hover:bg-surface-2 transition-all"
            >
              Explore Engineering Tracks
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Platform Tour (#showcase & #demo) */}
      <section id="showcase" className="py-20 border-b border-line bg-surface scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
            <span className="text-xs font-bold text-accent-cyan uppercase tracking-wider block">
              INTERACTIVE PREVIEW
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
              Experience the Progeni Atlas Suite
            </h2>
            <p className="text-sm text-ink-muted">
              Select a module below to inspect the live interview components in action.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="flex justify-center gap-2 sm:gap-3 mb-10 flex-wrap">
            <button
              type="button"
              onClick={() => setActiveTab('interview')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'interview'
                  ? 'bg-accent-blue text-on-brand shadow-md'
                  : 'bg-surface-2 text-ink-muted hover:bg-surface-3'
              }`}
            >
              <Video className="w-4 h-4" />
              1. Two-Way AI Video Interviewer
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'code'
                  ? 'bg-accent-blue text-on-brand shadow-md'
                  : 'bg-surface-2 text-ink-muted hover:bg-surface-3'
              }`}
            >
              <Terminal className="w-4 h-4" />
              2. Live Code Execution &amp; Whiteboard
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dossier')}
              className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'dossier'
                  ? 'bg-accent-blue text-on-brand shadow-md'
                  : 'bg-surface-2 text-ink-muted hover:bg-surface-3'
              }`}
            >
              <Award className="w-4 h-4" />
              3. Objective Rubric &amp; Feedback Report
            </button>
          </div>

          {/* Interactive Mockup Container */}
          <div id="demo" className="rounded-xl border border-line bg-surface-deep shadow-2xl p-6 sm:p-10 scroll-mt-24">
            {activeTab === 'interview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-5">
                  <span className="text-[11px] font-bold text-accent-cyan uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                    Live Video Session Mode
                  </span>
                  <h3 className="text-2xl font-black text-ink">
                    Adaptive AI Persona with Voice Activity Detection
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    The AI interviewer listens to candidate verbal explanations, evaluates conceptual clarity, and dynamically probes follow-up tradeoffs.
                  </p>
                  <div className="p-4 rounded-2xl bg-surface space-y-2">
                    <p className="text-xs font-mono text-accent-cyan font-bold">Sample Interviewer Question:</p>
                    <p className="text-sm text-ink italic">
                      &quot;You mentioned using Redis for cache invalidation. How would you handle cache stampede if 50,000 requests hit simultaneously on an expired key?&quot;
                    </p>
                  </div>
                  <Link
                    href="/candidate/practice"
                    prefetch={false}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-blue text-on-brand font-bold text-xs shadow-md hover:bg-accent-blue-hover transition-all"
                  >
                    Try This Drill Live </Link>
                </div>

                <div className="rounded-2xl border border-line-strong bg-inset p-4 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between text-xs pb-3 border-b border-line">
                    <span className="flex items-center gap-2 text-accent-emerald font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Session Active
                    </span>
                    <span className="font-mono text-ink-muted">Question 3 of 7</span>
                  </div>
                  <div className="h-56 sm:h-64 rounded-xl bg-inverse-surface-2 relative overflow-hidden flex flex-col items-center justify-center text-white space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/avatars/interviewer_female.jpg"
                      alt="Sarah Chen — AI Interviewer"
                      className="absolute inset-0 h-full w-full object-cover object-center brightness-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-inverse-canvas/95 via-inverse-canvas/25 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 rounded-lg bg-inverse-canvas/85 px-2.5 py-1 backdrop-blur-md border border-cyan-500/30">
                        <div className="w-6 h-6 rounded-full border border-cyan-400/60 bg-cyan-500/20 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.35)]">
                          <Sparkles className="w-3.5 h-3.5 text-accent-cyan animate-pulse" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white leading-tight">Sarah Chen</p>
                          <p className="text-[9px] font-mono text-inverse-cyan uppercase tracking-wider">AI Interviewer Speaking</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[10px] text-inverse-emerald font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'code' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-5">
                  <span className="text-[11px] font-bold text-accent-indigo uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    Live Coding Runtime
                  </span>
                  <h3 className="text-2xl font-black text-ink">
                    Integrated Monaco Editor with Instant Test Runner
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Write real production code in Python, C++, TypeScript, or Java with syntax validation, runtime execution, and automated test-case evaluation.
                  </p>
                  <ul className="space-y-2 text-xs text-ink-muted">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Multiple supported languages with instant sandbox spin-up
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Automated edge-case unit test execution
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-accent-emerald" /> Full revision timeline recorded for objective evaluation
                    </li>
                  </ul>
                </div>

                <div className="rounded-2xl border border-line-strong bg-canvas p-4 font-mono text-xs text-ink shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-line text-[11px]">
                    <span className="text-accent-cyan font-bold">solution.py</span>
                    <span className="text-accent-emerald">All Tests Passed (4/4)</span>
                  </div>
                  <pre className="py-4 text-[12px] leading-relaxed text-ink-muted overflow-x-auto">
{`def find_median_sorted_arrays(nums1, nums2):
    # Binary search partitioning O(log(min(m, n)))
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    low, high = 0, m
    ...
    return median # Verified 0.04ms runtime`}
                  </pre>
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-accent-emerald text-[11px]">
                    ✓ Passed: Test cases (Empty, Even-Length, Duplicates, Negative Values)
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dossier' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center animate-fadeIn">
                <div className="space-y-5">
                  <span className="text-[11px] font-bold text-accent-blue uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                    Sample Feedback Report
                  </span>
                  <h3 className="text-2xl font-black text-ink">
                    Evidence Behind Every Assessment
                  </h3>
                  <p className="text-sm text-ink-muted leading-relaxed">
                    Both candidates and hiring teams receive a granular breakdown across Technical Depth, Code Quality, System Architecture, and Communication.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Link
                      href="/pricing"
                      className="px-5 py-2.5 rounded-xl bg-accent-blue text-on-brand font-bold text-xs hover:brightness-110"
                    >
                      View Preparation Packs
                    </Link>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-line">
                    <div>
                      <h4 className="text-sm font-bold text-ink">Technical Interview Feedback (Sample)</h4>
                      <p className="text-xs text-ink-muted">Overall Assessment: 94 / 100 • Strong Engineering Mastery</p>
                    </div>
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-accent-emerald text-xs font-bold border border-emerald-500/30">
                      Sample Rubric
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-ink-muted">Technical Depth &amp; Scaling</span>
                        <span className="font-bold text-ink">95%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full w-[95%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-ink-muted">Code Cleanliness &amp; Tests</span>
                        <span className="font-bold text-ink">92%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full w-[92%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-1">
                        <span className="text-ink-muted">Communication &amp; Architecture</span>
                        <span className="font-bold text-emerald-500">90%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full w-[90%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Engineering Tracks Section (#tracks) */}
      <section id="tracks" className="py-20 border-b border-line bg-surface-deep scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold text-accent-blue uppercase tracking-wider block">
              PRACTICE SYLLABUS &amp; TRACKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-ink tracking-tight">
              Curated Technical Interview Tracks
            </h2>
            <p className="text-sm sm:text-base text-ink-muted">
              Practice real-world interview drills aligned with modern engineering requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {engineeringTracks.map((tr, idx) => (
              <div
                key={idx}
                className="p-8 rounded-xl border border-line bg-surface shadow-xs hover:shadow-xl transition-all flex flex-col justify-between space-y-6"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-accent-blue font-mono">
                      {tr.domain}
                    </span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500/10 text-accent-blue border border-blue-500/20">
                      {tr.focus}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-ink leading-snug">
                    {tr.headline}
                  </h3>

                  <p className="text-xs sm:text-sm text-ink-muted font-medium">
                    {tr.description}
                  </p>

                  <div className="grid grid-cols-3 gap-2 py-4 border-y border-line text-center">
                    {tr.topics.map((t, i) => (
                      <div key={i}>
                        <p className="text-xs font-black text-ink">{t.value}</p>
                        <p className="text-[10px] text-ink-muted">{t.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-line">
                  <span className="text-[11px] font-mono text-ink-muted">{tr.trackCode}</span>
                  <Link
                    href="/candidate/practice"
                    prefetch={false}
                    className="text-xs font-bold text-accent-blue hover:underline inline-flex items-center gap-1"
                  >
                    Start Drill </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}