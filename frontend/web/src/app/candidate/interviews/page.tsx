'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  fetchCandidateInterviews,
  fetchCandidateInvitations,
  isValidSessionId,
  type InterviewSession,
  type InterviewInvitation
} from '@/lib/api';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import {
  Video,
  Calendar,
  Clock,
  Sparkles,
  AlertCircle,
  Play,
  FileText,
  Award,
  RefreshCw,
  Building2
} from 'lucide-react';

/** The real role/company denormalised onto the session wins; an invitation is only a fallback. */
function resolveRole(session: InterviewSession, invite?: { job: string | null; org: string | null }) {
  return session.roleTitle || session.job_title || invite?.job || 'Technical Interview Session';
}

function resolveCompany(session: InterviewSession, invite?: { job: string | null; org: string | null }) {
  return session.companyName || session.company_name || invite?.org || null;
}

function RecommendationBadge({ recommendation }: { recommendation: string | null }) {
  if (!recommendation) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-inset border border-line text-ink-muted flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" /> NOT AVAILABLE
      </span>
    );
  }

  const styles: Record<string, string> = {
    STRONG_HIRE: 'bg-emerald-500/15 border-emerald-500/30 text-accent-emerald',
    HIRE: 'bg-cyan-500/15 border-cyan-500/30 text-accent-cyan',
    LEAN_HIRE: 'bg-amber-500/15 border-amber-500/30 text-accent-amber',
    NO_HIRE: 'bg-rose-500/15 border-rose-500/30 text-accent-rose',
    REJECT: 'bg-rose-500/15 border-rose-500/30 text-accent-rose'
  };
  const Icon = recommendation === 'STRONG_HIRE' || recommendation === 'HIRE' ? Sparkles : AlertCircle;

  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1 ${styles[recommendation] || 'bg-inset border border-line text-ink-muted'}`}
    >
      <Icon className="w-3.5 h-3.5" /> {recommendation.replace(/_/g, ' ')}
    </span>
  );
}

export default function CandidateInterviewsPage() {
  const [sessions, setSessions] = useState<InterviewSession[] | null>(null);
  const [invitations, setInvitations] = useState<InterviewInvitation[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInterviews() {
      setLoading(true);
      const [sessionRows, invitationRows] = await Promise.all([
        fetchCandidateInterviews(),
        fetchCandidateInvitations()
      ]);
      setSessions(sessionRows);
      setInvitations(invitationRows);
      setLoading(false);
    }
    fetchInterviews();
  }, []);

  // Session ids that belong to a pending invitation, so the candidate can act on them.
  const pendingInviteSessionIds = new Set(
    (invitations ?? [])
      .filter((invite) => invite.status === 'pending')
      .map((invite) => invite.session_id)
  );

  const jobTitleBySession = new Map(
    (invitations ?? [])
      .filter((invite) => invite.session)
      .map((invite) => [invite.session_id, { job: invite.job_title, org: invite.org_name }])
  );

  const isSessionUpcoming = (s: InterviewSession) => {
    const st = String(s.status || '')?.toLowerCase();
    if (st === 'completed' || st === 'abandoned') return false;
    const now = Date.now();
    const sched = s.scheduled_at ? new Date(s.scheduled_at).getTime() : 0;
    const durMs = (s.duration_minutes || 30) * 60 * 1000;
    if (st === 'in_progress') {
      const started = s.started_at ? new Date(s.started_at).getTime() : sched;
      return started > 0 ? now <= started + durMs + 30 * 60 * 1000 : false;
    }
    if (st === 'scheduled') {
      return sched > 0 ? now <= sched + durMs : false;
    }
    return false;
  };

  const upcoming = (sessions ?? []).filter(isSessionUpcoming);
  // Only genuinely finished interviews belong in the history. Sessions the candidate
  // never completed (status 'abandoned') have no scorecard/report, so they are not
  // listed as completed results.
  const completed = (sessions ?? []).filter(
    (s) => String(s.status || '').toLowerCase() === 'completed'
  );

  const scoredSessions = completed.filter(
    (s) => typeof s.total_score === 'number'
  );
  const highestScore = scoredSessions.length
    ? Math.max(...scoredSessions.map((s) => s.total_score as number))
    : null;
  const recommendations = completed
    .map((s) => s.final_recommendation)
    .filter((value): value is string => Boolean(value));
  const recommendationTally = recommendations.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  const latestRecommendation = recommendations[0] ?? null;

  return (
    <div className="min-h-screen bg-canvas text-ink flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      <DashboardHeader />

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* HERO HEADER */}
        <section className="rounded-2xl bg-gradient-to-r from-accent-cyan/5 via-surface to-accent-indigo/5 border border-line p-6 sm:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-accent-cyan flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5 text-accent-cyan" />
                  My AI Interview Sessions
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
                Technical Interview Sessions & AI Reports
              </h1>
              <p className="text-ink-muted text-xs sm:text-sm">
                View upcoming AI screening invites, enter pre-flight interview lobbies, and review past performance dossiers.
              </p>
            </div>

            <Link
              href="/candidate/practice"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/20"
            >
              <Sparkles className="w-4 h-4" />
              <span>Start Practice Interview</span>
            </Link>
          </div>
        </section>

        {/* METRICS STATS — flat strip (hairline-separated), no boxed tiles */}
        <section className="rounded-2xl border border-line bg-line grid grid-cols-2 sm:grid-cols-4 gap-px overflow-hidden">
          <div className="p-5 space-y-1 bg-surface">
            <span className="text-xs text-ink-muted">Upcoming Live Interviews</span>
            <div className="text-2xl font-bold text-accent-cyan font-mono">
              {loading ? '--' : upcoming.length}
            </div>
          </div>
          <div className="p-5 space-y-1 bg-surface">
            <span className="text-xs text-ink-muted">Completed Sessions</span>
            <div className="text-2xl font-bold text-ink font-mono">
              {loading ? '--' : completed.length}
            </div>
          </div>
          <div className="p-5 space-y-1 bg-surface">
            <span className="text-xs text-ink-muted">Highest Score Achieved</span>
            <div className="text-2xl font-bold text-accent-emerald font-mono">
              {loading ? '--' : highestScore === null ? 'N/A' : `${Math.round(highestScore)}%`}
            </div>
            {!loading && highestScore === null && (
              <span className="text-[11px] text-ink-muted font-mono">No scored sessions yet</span>
            )}
          </div>
          <div className="p-5 space-y-1 bg-surface">
            <span className="text-xs text-ink-muted">Latest Hiring Recommendation</span>
            <div className="text-lg font-bold text-accent-indigo leading-8">
              {loading
                ? '--'
                : latestRecommendation
                  ? latestRecommendation.replace(/_/g, ' ')
                  : 'Not available yet'}
            </div>
            {!loading && Object.keys(recommendationTally).length > 0 && (
              <span className="text-[11px] text-ink-muted font-mono">
                {Object.entries(recommendationTally)
                  .map(([key, count]) => `${key.replace(/_/g, ' ')?.toLowerCase()}: ${count}`)
                  .join(' • ')}
              </span>
            )}
          </div>
        </section>

        {/* UPCOMING INTERVIEWS SECTION */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Calendar className="w-5 h-5 text-accent-cyan" />
              <span>Upcoming Scheduled AI Interviews</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-16 text-center space-y-3 rounded-2xl bg-surface border border-line">
              <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin mx-auto" />
                <p className="text-ink-muted text-sm">Fetching your interview sessions…</p>
              </div>
          ) : upcoming.length === 0 ? (
            <div className="p-12 text-center space-y-3 rounded-2xl bg-surface border border-line">
              <Calendar className="w-8 h-8 text-ink-faint mx-auto" />
              <p className="text-ink font-semibold text-sm">No upcoming interviews</p>
              <p className="text-ink-muted text-xs max-w-md mx-auto">
                When a recruiter schedules a technical screening for you, the session and its
                pre-flight lobby link will appear here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {upcoming.map((session, idx) => {
                const context = jobTitleBySession.get(session.id);
                const roleTitle = resolveRole(session, context);
                const companyName = resolveCompany(session, context);
                const isPendingInvite = pendingInviteSessionIds.has(session.id);
                const validId = isValidSessionId(session.id);
                return (
                  <div
                    key={validId ? session.id : `upcoming-session-${idx}`}
                    className="rounded-2xl bg-gradient-to-r from-accent-cyan/5 via-surface to-accent-indigo/5 border border-line p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-cyan-500/40 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-accent-cyan shrink-0">
                        <Video className="w-6 h-6" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h3 className="text-base font-bold text-ink">
                            {roleTitle}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-cyan-500/10 text-accent-cyan border border-cyan-500/30">
                            {(session.status || 'scheduled').replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {isPendingInvite && (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-amber-500/10 text-accent-amber border border-amber-500/30">
                              INVITATION PENDING
                            </span>
                          )}
                        </div>

                        {companyName && (
                          <p className="text-xs text-ink-muted flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-ink-muted" />
                            <span>{companyName}</span>
                          </p>
                        )}

                        <p className="text-xs text-ink-muted font-mono flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-accent-cyan" />
                          <span>
                            {new Date(session.scheduled_at).toLocaleString()} ({session.duration_minutes || 45} min)
                          </span>
                        </p>
                      </div>
                    </div>

                    {validId ? (
                      <Link
                        href={`/candidate/interview/${session.id}/lobby`}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Enter Pre-flight Lobby</span>
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-muted font-mono bg-surface/50 px-4 py-2 rounded-xl border border-line">
                        No Session ID
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* COMPLETED INTERVIEWS & REPORTS */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-indigo" />
              <span>Completed Interview History & Reports</span>
            </h2>
          </div>

          <div className="rounded-2xl bg-surface border border-line overflow-hidden">
            {loading ? (
              <div className="p-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-accent-cyan animate-spin mx-auto" />
                <p className="text-ink-muted text-sm">Fetching your interview sessions…</p>
              </div>
            ) : completed.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Award className="w-8 h-8 text-ink-faint mx-auto" />
                <p className="text-ink font-semibold text-sm">No completed interviews yet</p>
                <p className="text-ink-muted text-xs max-w-md mx-auto">
                  Scores, recommendations and AI reports are generated once an interview session
                  is completed and evaluated.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left border-collapse">
                  <thead>
                    <tr className="bg-inset/80 border-b border-line text-[11px] font-mono text-ink-muted uppercase tracking-wider">
                      <th className="py-4 px-6">Role & Company</th>
                      <th className="py-4 px-4">Score</th>
                      <th className="py-4 px-4">Recommendation</th>
                      <th className="py-4 px-4">Date</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-xs">
                    {completed.map((session) => {
                      const context = jobTitleBySession.get(session.id);
                      const roleTitle = resolveRole(session, context);
                      const companyName = resolveCompany(session, context);
                      const hasScore = typeof session.total_score === 'number';
                      const reportHref = session.reportUrl;
                      return (
                        <tr key={session.id} className="hover:bg-surface-2 transition-colors">
                          <td className="py-4 px-6">
                            <p className="font-bold text-ink">{roleTitle}</p>
                            <p className="text-[11px] text-ink-muted">
                              {companyName || '—'}
                            </p>
                          </td>

                          <td className="py-4 px-4">
                            <div className="w-10 h-10 rounded-full border-2 border-cyan-500/40 bg-inset flex items-center justify-center font-mono font-bold text-xs text-accent-cyan">
                              {hasScore ? `${Math.round(session.total_score as number)}%` : '--'}
                            </div>
                          </td>

                          <td className="py-4 px-4">
                            <RecommendationBadge recommendation={session.final_recommendation} />
                          </td>

                          <td className="py-4 px-4">
                            <span className="text-ink font-medium">
                              {new Date(session.ended_at || session.scheduled_at).toLocaleDateString()}
                            </span>
                            <p className="text-[11px] text-ink-muted font-mono">
                              {session.status.replace(/_/g, ' ').toUpperCase()}
                            </p>
                          </td>

                          <td className="py-4 px-6 text-right">
                            {reportHref ? (
                              <Link
                                href={reportHref}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-accent-cyan border border-cyan-500/30 text-xs font-medium transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5" />
                                <span>View Full Report</span>
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-inset border border-line text-ink-muted text-xs font-medium">
                                <FileText className="w-3.5 h-3.5" />
                                <span>No report</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
