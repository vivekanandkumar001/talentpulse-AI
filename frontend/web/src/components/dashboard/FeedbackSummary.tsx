'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertTriangle, Loader2, Play } from 'lucide-react';
import { fetchCandidateInterviews, fetchSessionScorecard, type InterviewSession, type SessionScorecard } from '@/lib/api';

/**
 * Flat feedback summary — strengths and growth as plain divided rows.
 * No card, no shadow; reads the latest completed session's scorecard.
 */
export const FeedbackSummary: React.FC = () => {
  const [scorecard, setScorecard] = useState<SessionScorecard | null>(null);
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const sessions = await fetchCandidateInterviews();
      if (cancelled) return;

      const sessionList: any[] = Array.isArray(sessions)
        ? sessions
        : Array.isArray((sessions as any)?.completed)
          ? (sessions as any).completed
          : [];
      const latest = sessionList
        .filter((s: any) => s.status === 'completed' || s.completedAt)
        .sort(
          (a: any, b: any) =>
            new Date(b.scheduled_at || b.completedAt || 0).getTime() -
            new Date(a.scheduled_at || a.completedAt || 0).getTime()
        )[0];

      if (latest) {
        const card = await fetchSessionScorecard(latest.id);
        if (cancelled) return;
        setSession(latest);
        setScorecard(card);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const strengths = scorecard?.strengths ?? [];
  const concerns = scorecard?.concerns ?? [];
  const sessionDate = session ? new Date(session.scheduled_at).toLocaleDateString() : null;
  const isEmpty = !loading && strengths.length === 0 && concerns.length === 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="kicker">Latest feedback</h2>
        {session && (
          <Link
            href={`/candidate/interview/${session.id}/report`}
            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink-muted hover:text-accent-cyan transition-colors"
          >
            Full report
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-ink-muted border-t border-line">
          <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
          Loading your latest evaluation…
        </div>
      ) : (
        <div className="border-t border-line">
          <p className="pt-3 text-[11px] font-mono text-ink-faint">
            {sessionDate ? `From your interview on ${sessionDate}` : 'From your most recent interview'}
          </p>

          <div className="mt-3">
            <span className="text-[10px] font-mono font-semibold text-accent-emerald uppercase tracking-[0.16em]">Strengths</span>
            <ul className="mt-1.5 divide-y divide-line/60">
              {strengths.length === 0 ? (
                <li className="py-2 text-xs text-ink-muted">No strengths recorded yet.</li>
              ) : (
                strengths.slice(0, 4).map((item, idx) => (
                  <li key={idx} className="py-2 flex items-start gap-2 text-xs text-ink leading-normal">
                    <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="mt-3">
            <span className="text-[10px] font-mono font-semibold text-accent-amber uppercase tracking-[0.16em]">Growth areas</span>
            <ul className="mt-1.5 divide-y divide-line/60">
              {concerns.length === 0 ? (
                <li className="py-2 text-xs text-ink-muted">No growth areas recorded yet.</li>
              ) : (
                concerns.slice(0, 4).map((item, idx) => (
                  <li key={idx} className="py-2 flex items-start gap-2 text-xs text-ink leading-normal">
                    <AlertTriangle className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {isEmpty && (
        <Link
          href="/candidate/practice"
          className="mt-4 inline-flex items-center gap-2 btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          Complete a practice interview to generate feedback
        </Link>
      )}
    </div>
  );
};
