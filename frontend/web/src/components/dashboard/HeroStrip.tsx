'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, Zap, Lock, CheckCircle2, X, Play, Loader2, Flame } from 'lucide-react';
import { fetchCandidateDashboard, fetchCandidateProfile, type CandidateDashboard, type CandidateProfile } from '@/lib/api';
import { LOADING_RESUME_STATUS } from '@/constants/ui_strings';

const MILESTONES = [
  { key: 'resume', label: 'Resume' },
  { key: 'skills', label: 'Skills' },
  { key: 'baseline', label: 'Baseline' },
  { key: 'demo', label: 'Demo interview' },
  { key: 'scored', label: 'Scored interview' },
];

/**
 * Flat hero strip. No border, no card — dense type, inline meta,
 * placement-prep milestone track.
 */
export const HeroStrip: React.FC = () => {
  const [dashboard, setDashboard] = useState<CandidateDashboard | null>(null);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [summary, record] = await Promise.all([fetchCandidateDashboard(), fetchCandidateProfile()]);
      if (cancelled) return;
      setDashboard(summary);
      setProfile(record);
      setLoading(false);
    })();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('interview_completed') === 'true') setJustCompleted(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const firstName =
    profile?.full_name?.trim().split(/\s+/)[0] ||
    profile?.fullName?.trim().split(/\s+/)[0] ||
    (dashboard?.candidate?.name && dashboard.candidate.name !== 'Candidate'
      ? dashboard.candidate.name.trim().split(/\s+/)[0]
      : undefined);

  const hasResume = Boolean(dashboard?.has_resume || profile?.resume);
  const skillCount = dashboard?.skill_count ?? 0;
  const demos = dashboard?.demo_allowance;
  const demosLeft = demos?.freeDemosRemaining ?? 0;
  const demoTotal = demos?.freeDemosTotal ?? 0;

  // Honest, derivable completeness score from real signals
  const completeness = useMemo(() => {
    let score = 0;
    if (hasResume) score += 25;
    if (skillCount > 0) score += 15;
    if (skillCount >= 3) score += 10;
    if (profile?.course || profile?.academic_year || profile?.headline) score += 10;
    return Math.min(100, score);
  }, [hasResume, skillCount, profile]);

  const now = new Date();
  const weekNo = Math.ceil(((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000 + now.getDay() + 1) / 7);

  const resumeLabel =
    dashboard === null && profile === null
      ? 'Resume status unavailable'
      : !hasResume
        ? 'No resume on file'
        : dashboard?.resume_status === 'PARSED' || profile?.resume
          ? 'Resume verified'
          : 'Resume on file';

  return (
    <div className="space-y-5">
      {justCompleted && (
        <div className="flex items-center justify-between gap-3 border-l-2 border-emerald-500 pl-3 py-1 text-xs text-accent-emerald">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Interview submitted — the recruiter team will review your recording and scorecard.
          </span>
          <button
            type="button"
            onClick={() => setJustCompleted(false)}
            className="p-1 rounded hover:bg-accent-emerald/20 cursor-pointer transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="min-w-0">
          <p className="text-[11px] font-mono font-semibold text-ink-faint uppercase tracking-[0.18em] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-accent-cyan" />
            Week {weekNo} · Placement Prep
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-extrabold text-ink tracking-tight leading-[1.05]">
            {firstName ? `Back at it, ${firstName}` : 'Welcome to Progeni Atlas'}
          </h1>
          <p className="mt-2 text-sm text-ink-muted max-w-lg leading-relaxed">
            Two tracks, one goal. Close the gap one interview at a time — and make every score count.
          </p>

          {/* Prep milestone track — flat stepper */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px]">
            {MILESTONES.map((m, i) => {
              const done = (m.key === 'resume' && hasResume) || (m.key === 'skills' && skillCount > 0);
              return (
                <React.Fragment key={m.key}>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold border transition-colors ${
                      done ? 'bg-emerald-500/10 text-accent-emerald border-emerald-500/30' : 'bg-surface text-ink-muted border-line-strong'
                    }`}
                  >
                    {done && <CheckCircle2 className="w-3 h-3" />}
                    {m.label}
                  </span>
                  {i < MILESTONES.length - 1 && <span className="text-ink-faint">/</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
          {demoTotal > 0 && (
            <span className="text-[11px] font-mono text-accent-cyan flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" />
              {demosLeft} of {demoTotal} free demos left
            </span>
          )}
          <Link
            href="/candidate/practice"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-xs font-bold text-on-brand btn-primary-gradient transition-all cursor-pointer whitespace-nowrap shadow-[0_10px_28px_-10px_var(--brand-glow)]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {demosLeft > 0 ? `Start free demo interview` : 'Start practice interview'}
          </Link>
          <div className="flex items-center gap-3 text-[11px] text-ink-faint">
            <span className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-accent-emerald" />
              {loading ? LOADING_RESUME_STATUS : resumeLabel}
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-accent-indigo" />
              {dashboard === null ? '…' : `${skillCount} skills`}
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Readiness locked
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
