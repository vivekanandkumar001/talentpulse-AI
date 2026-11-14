'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, Brain, Calendar, Clock, Loader2 } from 'lucide-react';
import {
  fetchCandidateDashboard,
  fetchCandidateInvitations,
  fetchCandidateAptitudeHistory,
  type InterviewSession,
  type InterviewInvitation,
  type AptitudeAttemptHistory,
} from '@/lib/api';

function isUpcoming(s: InterviewSession): boolean {
  const status = String(s.status || '').toLowerCase();
  if (status === 'completed' || status === 'cancelled' || status === 'no_show') return false;
  return true;
}

/**
 * Two equal-weight lanes side by side: AI Interview on the left, Aptitude on
 * the right. Same width, same density, same visual priority — the candidate
 * picks what needs work. Divided by a hairline, no cards.
 */
export const QuickStartColumns: React.FC = () => {
  const [interviewLoading, setInterviewLoading] = useState(true);
  const [aptitudeLoading, setAptitudeLoading] = useState(true);
  const [nextInterview, setNextInterview] = useState<InterviewSession | null>(null);
  const [invitation, setInvitation] = useState<InterviewInvitation | undefined>(undefined);
  const [aptAttempts, setAptAttempts] = useState<AptitudeAttemptHistory[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [dashboard, invitations] = await Promise.all([fetchCandidateDashboard(), fetchCandidateInvitations()]);
        if (cancelled) return;
        const upcoming = (dashboard?.upcoming_interviews ?? []).filter(isUpcoming);
        const chosen = upcoming[0] ?? null;
        setNextInterview(chosen);
        setInvitation(chosen ? invitations?.find((inv) => inv.session_id === chosen.id) : undefined);
      } finally {
        if (!cancelled) setInterviewLoading(false);
      }
    })();
    (async () => {
      try {
        const data = await fetchCandidateAptitudeHistory();
        if (cancelled) return;
        setAptAttempts(Array.isArray(data) ? data.filter((a) => a.status === 'completed') : []);
      } finally {
        if (!cancelled) setAptitudeLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const interviewMeta = nextInterview?.scheduled_at
    ? [new Date(nextInterview.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
        (nextInterview.scheduled_at.includes('T') ? ` · ${new Date(nextInterview.scheduled_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}` : ''),
        nextInterview.duration_minutes ? `${nextInterview.duration_minutes} min` : null,
      ].filter(Boolean).join(' · ')
    : null;

  const interviewTitle = invitation?.job_title || nextInterview?.session_type || 'AI Technical Interview';
  const aptBest = aptAttempts.reduce<number | null>((acc, a) => (acc === null || a.score > acc ? a.score : acc), null);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* ---- AI Interview lane ---- */}
      <div className="card-panel-hover p-5 flex flex-col gap-3 min-h-[148px]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
            <Video className="w-4 h-4 text-accent-cyan" />
            AI Interview
          </h3>
          <Link href="/candidate/interviews" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink-muted hover:text-accent-cyan transition-colors">
            All sessions
          </Link>
        </div>

        {interviewLoading ? (
          <div className="flex items-center gap-2 text-xs text-ink-muted py-4">
            <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
            Loading your interview schedule…
          </div>
        ) : nextInterview ? (
          <div className="space-y-2">
            <p className="text-base font-bold text-ink leading-snug">{interviewTitle}</p>
            <p className="text-xs text-ink-muted flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{interviewMeta}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Scheduled</span>
            </p>
            <Link
              href={`/candidate/interview/${nextInterview.id}/lobby`}
              className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
            >
              Enter interview lobby
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted leading-relaxed">
              No sessions scheduled yet. Recruiters send invites here — or run a practice loop now.
            </p>
            <Link
              href="/candidate/practice"
              className="inline-flex items-center gap-1.5 text-xs font-bold btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
            >
              Practice the interview loop
            </Link>
          </div>
        )}
      </div>

      {/* ---- Aptitude lane ---- */}
      <div className="card-panel-hover p-5 flex flex-col gap-3 min-h-[148px]">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-faint">
            <Brain className="w-4 h-4 text-accent-violet" />
            Aptitude
          </h3>
          <Link href="/candidate/aptitude" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink-muted hover:text-accent-violet transition-colors">
            Aptitude arena
          </Link>
        </div>

        {aptitudeLoading ? (
          <div className="flex items-center gap-2 text-xs text-ink-muted py-4">
            <Loader2 className="w-4 h-4 animate-spin text-accent-violet" />
            Loading your attempts…
          </div>
        ) : aptAttempts.length > 0 ? (
          <div className="space-y-2">
            <p className="text-base font-bold text-ink leading-snug">
              {aptAttempts.length} attempt{aptAttempts.length === 1 ? '' : 's'} · best {aptBest}%
            </p>
            <p className="text-xs text-ink-muted font-mono">AMCAT-style · 5 pillars · section-wise percentiles</p>
            <Link
              href="/candidate/aptitude"
              className="inline-flex items-center gap-1.5 mt-1 text-xs font-bold btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
            >
              Keep climbing — retake
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted leading-relaxed">
              No attempts yet. Recruiters shortlist on sectional percentiles — take a 15-minute baseline.
            </p>
            <Link
              href="/candidate/aptitude"
              className="inline-flex items-center gap-1.5 text-xs font-bold btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
            >
              Take your aptitude baseline
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
