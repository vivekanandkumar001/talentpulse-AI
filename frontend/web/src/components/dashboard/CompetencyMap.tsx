'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Lightbulb, Loader2, Play } from 'lucide-react';
import { fetchCandidateInterviews, fetchSessionScorecard } from '@/lib/api';

interface AggregatedCompetency {
  name: string;
  score: number;
  sessions: number;
}

const BAR_COLORS = ['bg-cyan-400', 'bg-emerald-400', 'bg-indigo-400', 'bg-sky-400', 'bg-amber-400'];

/**
 * Flat competency map — thin single-pixel bars, no boxes, no shadows.
 * Reads Scorecard.competencies from completed sessions and averages them.
 */
export const CompetencyMap: React.FC = () => {
  const [competencies, setCompetencies] = useState<AggregatedCompetency[] | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

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
      const completed = sessionList.filter((session: any) => session.status === 'completed' || session.completedAt);
      setSessionCount(completed.length);

      if (completed.length === 0) {
        setCompetencies([]);
        return;
      }

      const scorecards = await Promise.all(completed.slice(0, 5).map((s: any) => fetchSessionScorecard(s.id)));
      if (cancelled) return;

      const totals = new Map<string, { sum: number; count: number }>();
      for (const card of scorecards) {
        if (!card) continue;
        for (const comp of card.competencies) {
          if (typeof comp.score !== 'number') continue;
          const key = comp.competency.trim();
          if (!key) continue;
          const entry = totals.get(key) ?? { sum: 0, count: 0 };
          entry.sum += comp.score;
          entry.count += 1;
          totals.set(key, entry);
        }
      }

      const aggregated = [...totals.entries()]
        .map(([name, { sum, count }]) => ({
          name,
          score: Math.round((sum / count) * 10) / 10,
          sessions: count,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setCompetencies(aggregated);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const top = useMemo(() => competencies?.[0], [competencies]);
  const hasData = (competencies?.length ?? 0) > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="kicker">Competency map</h2>
        <span className="text-[11px] text-ink-faint font-mono">
          {sessionCount > 0 ? `${sessionCount} scored session${sessionCount === 1 ? '' : 's'}` : 'No scored sessions'}
        </span>
      </div>

      {competencies === null ? (
        <div className="flex items-center gap-2 py-6 text-xs text-ink-muted border-t border-line">
          <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
          Loading competency scores…
        </div>
      ) : !hasData ? (
        <div className="border-t border-line pt-5">
          <p className="text-xs text-ink-muted leading-relaxed">
            Scores appear once you complete an interview. They are averaged across every scored session.
          </p>
          <Link
            href="/candidate/practice"
            className="mt-3 inline-flex items-center gap-2 btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Start your first practice interview
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {competencies.map((item, idx) => (
            <li key={item.name} className="py-3">
              <div className="flex items-center justify-between text-xs gap-3 mb-1.5">
                <span className="font-semibold text-ink truncate">{item.name}</span>
                <span className="font-mono font-bold text-ink shrink-0 tabular-nums">{item.score}<span className="text-ink-faint">/100</span></span>
              </div>
              <div className="w-full h-[3px] bg-surface-3 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]} transition-all duration-700`}
                  style={{ width: `${Math.max(0, Math.min(100, item.score))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {top && (
        <p className="mt-4 flex items-start gap-2 text-[11px] text-ink-muted leading-normal border-t border-line pt-3">
          <Lightbulb className="w-3.5 h-3.5 text-accent-amber shrink-0 mt-0.5" />
          <span>
            <span className="font-semibold text-ink">Strongest:</span> {top.name} — {top.score}/100 across {top.sessions} scored session{top.sessions === 1 ? '' : 's'}.
          </span>
        </p>
      )}
    </div>
  );
};
