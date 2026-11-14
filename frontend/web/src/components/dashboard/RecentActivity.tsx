'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Video, Brain, Loader2 } from 'lucide-react';
import {
  fetchCandidateInterviews,
  fetchCandidateAptitudeHistory,
  type InterviewSession,
  type AptitudeAttemptHistory,
} from '@/lib/api';

interface ActivityItem {
  id: string;
  kind: 'interview' | 'aptitude';
  title: string;
  detail: string;
  date: string | null;
  badge: string | null;
  href: string;
}

function toIso(d: string | null | undefined): number {
  if (!d) return 0;
  const t = Date.parse(d);
  return Number.isNaN(t) ? 0 : t;
}

/**
 * Single reverse-chronological feed across interviews and aptitude attempts.
 * Plain rows with hairline dividers — nothing boxed.
 */
export const RecentActivity: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActivityItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sessions, attempts] = await Promise.all([
          fetchCandidateInterviews(),
          fetchCandidateAptitudeHistory(),
        ]);
        if (cancelled) return;
        const merged: ActivityItem[] = [];
        for (const s of sessions ?? []) {
          const status = String(s.status || '').toLowerCase();
          merged.push({
            id: `int-${s.id}`,
            kind: 'interview',
            title: status === 'completed' ? 'AI interview completed' : 'Interview session',
            detail: s.session_type || s.duration_minutes ? `${s.session_type || 'Technical'} · ${s.duration_minutes ?? '—'} min` : 'Technical screening',
            date: s.scheduled_at ?? null,
            badge: status === 'completed' && s.total_score != null ? `${s.total_score}%` : status === 'completed' ? 'Scored' : 'Scheduled',
            href: s.reportUrl ?? `/candidate/interviews`,
          });
        }
        for (const a of attempts ?? []) {
          merged.push({
            id: `apt-${a.sessionId}`,
            kind: 'aptitude',
            title: a.templateTitle || 'Aptitude assessment',
            detail: `AMCAT-style · ${a.speedIndex}`,
            date: a.startedAt ?? null,
            badge: `${a.score}%`,
            href: `/candidate/aptitude/test/${a.sessionId}/report`,
          });
        }
        merged.sort((a, b) => toIso(b.date) - toIso(a.date));
        setItems(merged.slice(0, 6));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="kicker">Recent activity</h2>
        <Link href="/candidate/reports" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink-muted hover:text-accent-cyan transition-colors">
          All reports
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-6 text-xs text-ink-muted">
          <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
          Loading your activity…
        </div>
      ) : items.length === 0 ? (
        <p className="py-6 text-xs text-ink-muted border-t border-line">
          Nothing yet — your first interview or aptitude attempt will show up here.
        </p>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {items.map((item) => {
            const Icon = item.kind === 'aptitude' ? Brain : Video;
            const iconClass = item.kind === 'aptitude' ? 'text-accent-violet' : 'text-accent-cyan';
            return (
              <li key={item.id}>
                <Link href={item.href} className="flex items-center gap-3 py-3 hover:bg-surface-2/50 transition-colors -mx-2 px-2 rounded-lg group">
                  <Icon className={`w-4 h-4 shrink-0 ${iconClass}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink truncate">{item.title}</p>
                    <p className="text-[11px] text-ink-muted mt-0.5 truncate">{item.detail}{item.date ? ` · ${new Date(item.date).toLocaleDateString()}` : ''}</p>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-mono font-bold text-ink-muted bg-surface-2 px-2 py-0.5 rounded shrink-0">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
