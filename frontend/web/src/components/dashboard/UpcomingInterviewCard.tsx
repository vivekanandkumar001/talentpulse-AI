'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Video, Clock, CheckCircle2, ShieldCheck, AlertCircle, CalendarClock, Loader2 } from 'lucide-react';
import { fetchCandidateDashboard, fetchCandidateInvitations, isValidSessionId, type InterviewInvitation, type InterviewSession } from '@/lib/api';

interface UpcomingInterviewCardProps {
  sessionId?: string;
}

/** `session_type` values stored by the backend, mapped to display text. */
const SESSION_TYPE_LABEL: Record<string, string> = {
  technical: 'Technical Screening',
  behavioral: 'Behavioral Screening',
  hr: 'HR Screening',
  full_stack: 'Full-Stack Screening',
  system_design: 'System Design Screening',
  mock: 'Mock Interview'
};

function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Scheduled';
  return date.toLocaleString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });
}

function isUpcoming(session: InterviewSession): boolean {
  const status = (session.status || '')?.toString().toLowerCase();
  if (status !== 'scheduled' && status !== 'in_progress') return false;

  const now = Date.now();
  const durMs = (session.duration_minutes || 30) * 60 * 1000;

  if (status === 'in_progress') {
    const started = session.started_at
      ? new Date(session.started_at).getTime()
      : session.scheduled_at
        ? new Date(session.scheduled_at).getTime()
        : null;
    // An active session is live only if started within duration + 30m grace window
    if (started && !Number.isNaN(started)) {
      return now <= started + durMs + 30 * 60 * 1000;
    }
    return false;
  }

  if (status === 'scheduled') {
    if (!session.scheduled_at) return false;
    const sched = new Date(session.scheduled_at).getTime();
    if (Number.isNaN(sched)) return false;
    // Session is upcoming if scheduled time + duration has not completely elapsed
    return now <= sched + durMs;
  }

  return false;
}

function findInvitation(invitations: InterviewInvitation[], sessionId: string): InterviewInvitation | undefined {
  return invitations.find((inv) => inv.session_id === sessionId);
}

export const UpcomingInterviewCard: React.FC<UpcomingInterviewCardProps> = ({ sessionId }) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [invitation, setInvitation] = useState<InterviewInvitation | undefined>(undefined);
  const [resumeStatus, setResumeStatus] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const [dashboard, invitations] = await Promise.all([
        fetchCandidateDashboard(),
        fetchCandidateInvitations()
      ]);
      if (cancelled) return;

      setResumeStatus(dashboard ? dashboard.resume_status : undefined);

      const allUpcoming = (dashboard?.upcoming_interviews ?? []).filter(isUpcoming);
      const chosen =
        (sessionId ? allUpcoming.find((s) => s.id === sessionId) : undefined) ??
        allUpcoming[0] ??
        null;

      if (chosen) {
        setSession(chosen);
        setInvitation(findInvitation(invitations ?? [], chosen.id));
      } else {
        setSession(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-surface border border-line flex items-center gap-2 text-sm text-ink-muted"
      >
        <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
        Loading your next session…
      </motion.div>
    );
  }

  if (!session) {
    return (
      <motion.div
        initial={{ opacity: 1, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="p-6 rounded-2xl bg-surface border border-line backdrop-blur-md flex flex-col justify-between space-y-6"
      >
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-accent-cyan">
            <Video className="w-5 h-5" />
          </div>
          <span className="text-xs font-mono font-bold text-accent-cyan uppercase tracking-wider">
            UPCOMING AI VIDEO SESSION
          </span>
        </div>

        <div className="space-y-1">
          <h2 className="text-xl font-bold text-ink tracking-tight">Nothing scheduled</h2>
          <p className="text-sm font-medium text-ink-muted">
            You have no upcoming interview sessions. Sessions appear here once a recruiter invites you.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-inset/80">
          <div>
            <span className="text-[11px] font-mono text-ink-muted block">Resume</span>
            <span className="text-xs font-semibold text-ink mt-0.5 block">
              {resumeStatus === 'PARSED' ? 'Parsed & ready' : 'Not uploaded'}
            </span>
          </div>
          <div className="sm:col-span-2 flex items-end">
            <Link
              href="/candidate/profile"
              className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all flex items-center justify-center cursor-pointer"
            >
              Complete your profile
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  const isLive = session.status === 'in_progress';
  const jobLabel = invitation?.job_title || SESSION_TYPE_LABEL[session.session_type] || 'Interview session';
  const orgLabel = invitation?.org_name;

  return (
    <motion.div
      initial={{ opacity: 1, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className={`p-6 rounded-2xl bg-surface border shadow-xl backdrop-blur-md relative overflow-hidden flex flex-col justify-between space-y-6 ${
        isLive ? 'border-amber-500/40' : 'border-cyan-500/40'
      }`}
    >
      {/* Top Header Tag */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-lg ${isLive ? 'bg-amber-500/10 text-accent-amber' : 'bg-cyan-500/10 text-accent-cyan'}`}>
            <Video className="w-5 h-5" />
          </div>
          <span className={`text-xs font-mono font-bold uppercase tracking-wider ${isLive ? 'text-accent-amber' : 'text-accent-cyan'}`}>
            {isLive ? 'LIVE AI VIDEO SESSION' : 'UPCOMING AI VIDEO SESSION'}
          </span>
        </div>

        <span
          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-mono font-semibold ${
            isLive
              ? 'bg-amber-500/10 border-amber-500/20 text-accent-amber'
              : 'bg-emerald-500/10 border-emerald-500/20 text-accent-emerald'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full mr-2 ${
              isLive ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-pulse'
            }`}
          />
          {isLive ? 'Live in Progress' : formatWhen(session.scheduled_at)}
        </span>
      </div>

      {/* Title & Organization */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-ink tracking-tight">{jobLabel}</h2>
        <p className="text-sm font-medium text-ink-muted">
          {orgLabel || 'Organisation not specified'}
          {invitation?.status ? ` • Invitation ${invitation.status?.toString().toLowerCase()}` : ''}
        </p>
      </div>

      {/* 3-Column Mini Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-inset/80">
        <div>
          <span className="text-[11px] font-mono text-ink-muted block">Duration</span>
          <span className="text-xs font-semibold text-ink mt-0.5 block flex items-center">
            <Clock className="w-3.5 h-3.5 text-accent-cyan mr-1" />
            {session.duration_minutes} Minutes
          </span>
        </div>

        <div>
          <span className="text-[11px] font-mono text-ink-muted block">Status</span>
          <span className="text-xs font-semibold text-ink mt-0.5 block truncate capitalize">
            {session.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-mono text-ink-muted block">Scheduled</span>
          <span className="text-xs font-semibold text-accent-cyan mt-0.5 block truncate flex items-center">
            <CalendarClock className="w-3.5 h-3.5 mr-1" />
            {formatWhen(session.scheduled_at)}
          </span>
        </div>
      </div>

      {/* System Pre-Flight Checklist — only checks backed by real data */}
      <div className="space-y-2">
        <span className="text-xs font-mono text-ink-muted block">Join Requirements</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
          <div
            className={`flex items-center space-x-1.5 ${resumeStatus === 'PARSED' ? 'text-accent-emerald' : 'text-accent-amber'}`}
          >
            {resumeStatus === 'PARSED' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-accent-emerald shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-accent-amber shrink-0" />
            )}
            <span>{resumeStatus === 'PARSED' ? 'Resume parsed' : 'Resume required to join'}</span>
          </div>
          <div className="flex items-center space-x-1.5 text-ink-muted">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Run your device check in the lobby</span>
          </div>
        </div>
      </div>

      {/* Action CTA */}
      {session && isValidSessionId(session.id) ? (
        <Link
          href={`/candidate/interview/${session.id}/lobby`}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer hover:scale-[1.01] ${
            isLive
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 shadow-amber-500/20'
              : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 shadow-cyan-500/20'
          }`}
        >
          <span>{isLive ? 'Resume Video Interview ' : 'Enter Video Interview Room '}</span>
        </Link>
      ) : (
        <div className="w-full py-3.5 px-6 rounded-xl font-medium text-xs text-ink-muted bg-surface/50 border border-line text-center">
          No scheduled interview session available
        </div>
      )}
    </motion.div>
  );
};