'use client';

import React from 'react';
import { Award, Sparkles, MessageSquare } from 'lucide-react';

interface ExecutiveScorecardBannerProps {
  overallScore: number | null;
  hiringRecommendation: string | null;
  executiveSummary: string | null;
  hasScorecard: boolean;
}

/**
 * Renders only fields that exist on the `Scorecard` row. Percentile rank and
 * the proctoring integrity seal (gaze %, tab switches, multi-voice) are not
 * readable by the candidate through any endpoint, so they are not shown.
 */
export const ExecutiveScorecardBanner: React.FC<ExecutiveScorecardBannerProps> = ({
  overallScore,
  hiringRecommendation,
  executiveSummary,
  hasScorecard
}) => {
  return (
    <div className="bg-surface border border-line rounded-2xl p-6 md:p-8 backdrop-blur-md shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      {/* COLUMN 1: OVERALL COMPETENCY GAUGE (COL SPAN 4) */}
      <div className="lg:col-span-4 flex flex-col items-center lg:items-start text-center lg:text-left space-y-3 border-b lg:border-b-0 lg:border-r border-line pb-6 lg:pb-0 lg:pr-6 relative z-10">
        <p className="text-caption font-mono uppercase text-ink-muted text-xs">
          Overall Competency Rating
        </p>

        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400 font-mono tracking-tight">
            {typeof overallScore === 'number' ? overallScore : '--'}
          </span>
          <span className="text-lg font-mono text-ink-muted font-normal">/ 100</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-start">
          {hiringRecommendation ? (
            <span className="bg-emerald-500/10 text-accent-emerald border border-emerald-500/30 px-3 py-1 rounded-full text-caption uppercase font-semibold text-xs inline-flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-accent-emerald" />
              <span>{hiringRecommendation.replace(/_/g, ' ')}</span>
            </span>
          ) : (
            <span className="bg-surface-2 text-ink-muted border border-line px-3 py-1 rounded-full text-caption uppercase font-semibold text-xs">
              No recommendation yet
            </span>
          )}
          {typeof overallScore === 'number' && (
            <span className="text-xs font-mono text-accent-cyan bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
              Score of record
            </span>
          )}
        </div>
      </div>

      {/* COLUMN 2: EXECUTIVE AI SUMMARY (COL SPAN 5) */}
      <div className="lg:col-span-5 space-y-2 relative z-10 border-b lg:border-b-0 lg:border-r border-line pb-6 lg:pb-0 lg:pr-6">
        <div className="flex items-center gap-2 text-accent-cyan">
          <Sparkles className="w-4 h-4 text-accent-cyan" />
          <h3 className="text-body font-semibold text-ink text-sm">Evaluator Synthesis</h3>
        </div>
        {executiveSummary ? (
          <p className="text-xs text-ink leading-relaxed font-normal">{executiveSummary}</p>
        ) : (
          <p className="text-xs text-ink-muted leading-relaxed font-normal">
            {hasScorecard
              ? 'The evaluator did not write a summary for this session.'
              : 'No scorecard has been generated for this session yet.'}
          </p>
        )}
      </div>

      {/* COLUMN 3: SCORECARD PROVENANCE (COL SPAN 3) */}
      <div className="lg:col-span-3 space-y-3 relative z-10">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-accent-cyan" />
          <span className="text-sm font-bold text-ink">How this was produced</span>
        </div>

        <ul className="space-y-1.5 text-[11px] font-mono text-ink-muted">
          <li className="flex items-start gap-1.5">
            <span className="text-accent-cyan shrink-0">→</span>
            <span>Generated from your recorded transcript and per-turn evaluations.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-accent-cyan shrink-0">→</span>
            <span>Competency names and scores are produced by the evaluation model.</span>
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-accent-cyan shrink-0">→</span>
            <span>No percentile rank or proctoring metrics are shown because they are not available to you.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
