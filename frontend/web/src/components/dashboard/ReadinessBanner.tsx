'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { TrendingUp, Play, Award, Zap, Loader2, CheckCircle2, X, Lock } from 'lucide-react';
import { fetchCandidateDashboard, fetchCandidateProfile, type CandidateDashboard, type CandidateProfile } from '@/lib/api';
import { LOADING_RESUME_STATUS } from '@/constants/ui_strings';

/**
 * The readiness score, percentile rank and "N screenings today" figures this
 * banner used to show are not stored anywhere in the database, so they cannot
 * be shown honestly. What is real is the candidate profile and the
 * `/api/candidate/dashboard` summary (resume status, skill count, upcoming and
 * recent interviews), so the banner reports only those.
 */
export const ReadinessBanner: React.FC = () => {
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
      if (params.get('interview_completed') === 'true') {
        setJustCompleted(true);
      }
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
  const resumeLabel =
    dashboard === null && profile === null
      ? 'Resume status unavailable'
      : !hasResume
        ? 'No resume on file'
        : (dashboard?.resume_status === 'PARSED' || dashboard?.resume_status === 'Synchronized' || profile?.resume)
          ? 'Verified resume ready'
          : `Resume ${(dashboard?.resume_status || 'active').toString().toLowerCase()}`;

  const upcomingCount = dashboard?.upcoming_interviews?.length ?? 0;
  const interviewLine =
    dashboard == null
      ? 'We could not load your interview schedule.'
      : upcomingCount === 0
        ? 'You have no interviews scheduled.'
        : `You have ${upcomingCount} upcoming interview${upcomingCount === 1 ? '' : 's'} scheduled.`;

  return (
    <div className="w-full space-y-4">
      {justCompleted && (
        <div className="w-full p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs font-mono text-accent-emerald  flex items-center justify-between gap-3 shadow-xl backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <p className="font-bold text-sm text-accent-emerald  font-sans">
                Interview Completed Successfully
              </p>
              <p className="text-accent-emerald  mt-0.5">
                Your interview responses, code workspace, and proctoring telemetry have been submitted to the recruitment team for evaluation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setJustCompleted(false)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 text-accent-emerald  hover:text-ink cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 1, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full p-6 md:p-8 rounded-2xl bg-gradient-to-r from-surface via-surface to-surface-deep border border-line shadow-2xl backdrop-blur-md relative overflow-hidden flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
      >
      {/* Background Subtle Accent Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left Content */}
      <div className="space-y-3 max-w-2xl z-10">
        <span className="text-xs font-mono font-semibold text-accent-cyan uppercase tracking-wider block">
          {profile?.academic_year
            ? `ACADEMIC YEAR ${profile.academic_year} • PLACEMENT PREPARATION`
            : 'PLACEMENT PREPARATION'}
        </span>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-tight">
          {firstName ? `Welcome back, ${firstName}!` : 'Welcome to Progeni Atlas'}
        </h1>

        <p className="text-sm text-ink leading-relaxed">
          {interviewLine}{' '}
          {dashboard != null &&
            (upcomingCount === 0
              ? 'Complete a practice interview to build your readiness profile — we will score it on delivery, depth and clarity.'
              : 'Your readiness score is calculated once you complete a scored interview.')}
        </p>

        <div className="pt-1 flex items-center space-x-3 text-xs text-ink-muted font-mono">
          <span className="flex items-center text-accent-emerald">
            <Award className="w-4 h-4 mr-1 text-accent-emerald" />
            {loading ? LOADING_RESUME_STATUS : resumeLabel}
          </span>
          <span>•</span>
          <span className="flex items-center text-accent-indigo">
            <Zap className="w-4 h-4 mr-1 text-accent-indigo" />
            {dashboard === null ? 'Skills unavailable' : `${dashboard.skill_count} skill${dashboard.skill_count === 1 ? '' : 's'} on file`}
          </span>
        </div>
      </div>

      {/* Right Readiness Score Card & CTA */}
      <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-4 bg-inset/80 p-4 rounded-xl z-10 shrink-0">
        {/* Score Ring / Display */}
        <div className="flex items-center space-x-4">
          <div className="relative w-16 h-16 rounded-full bg-surface-2 p-0.5 flex items-center justify-center border border-line">
            <div className="w-full h-full bg-inset rounded-full flex flex-col items-center justify-center">
              <Lock className="w-5 h-5 text-ink-faint" />
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-ink">Interview Readiness Score</span>
            <span className="text-xs text-ink-muted flex items-center mt-1 max-w-[11rem] leading-snug">
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <TrendingUp className="w-3.5 h-3.5 mr-1 shrink-0" />
              )}
              Locked — unlocks after your first scored interview
            </span>
          </div>
        </div>

        {/* CTA Button & Free Demo Status */}
        <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
          {dashboard?.demo_allowance && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-[11px] font-mono font-medium text-accent-cyan">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              {dashboard.demo_allowance.freeDemosRemaining > 0 ? (
                <span>
                  {dashboard.demo_allowance.freeDemosRemaining} of {dashboard.demo_allowance.freeDemosTotal} Free Demos Available (10m limit)
                </span>
              ) : (
                <span className="text-accent-amber">
                  Free Demos Used ({dashboard.demo_allowance.freeDemosTotal}/{dashboard.demo_allowance.freeDemosTotal}) • Paid Access Active
                </span>
              )}
            </div>
          )}

          <Link
            href="/candidate/practice"
            className="w-full sm:w-auto px-5 py-3 rounded-full text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>
              {dashboard?.demo_allowance && dashboard.demo_allowance.freeDemosRemaining > 0
                ? `Start Free Demo Interview (${dashboard.demo_allowance.freeDemosRemaining} Left) `
                : 'Start Practice Interview '}
            </span>
          </Link>
        </div>
      </div>
    </motion.div>
    </div>
  );
};