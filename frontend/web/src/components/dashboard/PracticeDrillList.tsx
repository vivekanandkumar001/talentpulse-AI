'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Loader2, AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import type { PracticeDrillItem } from '@/types/practice';

interface DrillsResponse {
  success?: boolean;
  drills?: PracticeDrillItem[];
  error?: string;
}

/**
 * Flat drill rows — hairline dividers, no boxes. AI-recommended first.
 */
export const PracticeDrillList: React.FC = () => {
  const router = useRouter();
  const [drills, setDrills] = useState<PracticeDrillItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await apiFetch('/api/v1/practice/drills');
        const data = (await res.json().catch(() => null)) as DrillsResponse | null;
        if (cancelled) return;
        if (!res.ok) {
          setError(data?.error || `Could not load drills (HTTP ${res.status}).`);
          setDrills([]);
          return;
        }
        setDrills(data?.drills ?? []);
      } catch {
        if (!cancelled) {
          setError('Could not reach the drills service.');
          setDrills([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const featured = (drills ?? [])
    .slice()
    .sort((a, b) => Number(Boolean(b.recommendedReason)) - Number(Boolean(a.recommendedReason)))
    .slice(0, 4);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="kicker">Targeted drills</h2>
        <button
          type="button"
          onClick={() => router.push('/candidate/practice')}
          className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-ink-muted hover:text-accent-cyan transition-colors cursor-pointer"
        >
          All drills
        </button>
      </div>

      {drills === null ? (
        <div className="flex items-center gap-2 py-6 text-xs text-ink-muted border-t border-line">
          <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
          Loading drills…
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 py-5 text-xs text-ink-muted border-t border-line">
          <AlertTriangle className="w-4 h-4 text-accent-amber shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : featured.length === 0 ? (
        <div className="border-t border-line pt-5">
          <p className="text-xs text-ink-muted leading-relaxed">No drills available right now.</p>
          <button
            type="button"
            onClick={() => router.push('/candidate/practice')}
            className="mt-3 inline-flex items-center gap-2 btn-primary-gradient text-on-brand text-xs font-bold px-4 py-2 rounded-lg transition-all cursor-pointer"
          >
            Browse available drills
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {featured.map((drill, idx) => (
            <li
              key={`${drill.id}-${idx}`}
              className="py-3 flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-mono text-ink-faint uppercase tracking-wide">
                  {drill.estimatedMinutes} min · {drill.difficulty}
                  {drill.recommendedReason && <span className="text-accent-indigo"> · Recommended</span>}
                </p>
                <p className="mt-1 text-xs font-semibold text-ink group-hover:text-accent-cyan transition-colors truncate">
                  {drill.title}
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push(`/candidate/practice?drill=${encodeURIComponent(drill.id)}`)}
                className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-muted hover:text-accent-cyan border border-transparent hover:border-line px-3 py-1.5 rounded-md transition-all cursor-pointer"
                aria-label={`Practice ${drill.title}`}
              >
                <Play className="w-3.5 h-3.5" />
                Practice
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
